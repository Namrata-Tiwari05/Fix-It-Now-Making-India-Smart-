import { db } from '../services/db/index.js';
import { slaService } from '../services/sla/slaService.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { aiOrchestrator } from '../services/ai/aiOrchestrator.js';

export const officerController = {
  /**
   * List complaints assigned to logged-in officer
   */
  async getMyAssignments(req, res, next) {
    try {
      const officerProfileId = req.user.id;
      const officer = db.officers.find(o =>
        o.profile_id === officerProfileId ||
        o.id === officerProfileId ||
        o.name === req.user.name ||
        (req.user.email && o.email === req.user.email)
      );

      // Default officer ID to Inspector Suresh Yadav or found officer ID
      const officerId = officer ? officer.id : '4d98a7c1-fd90-4184-b9de-8cd021e1fb76';

      const complaints = db.complaints.filter(c =>
        c.assigned_officer_id === officerId ||
        (officer && c.assigned_officer_id === officer.id) ||
        (c.assigned_officer_name && (
          c.assigned_officer_name === 'Inspector Suresh Yadav' ||
          c.assigned_officer_name === req.user.name ||
          (officer && c.assigned_officer_name === officer.name)
        )) ||
        ['of111111-1111-1111-1111-111111111111', 'of222222-2222-2222-2222-222222222222', '4d98a7c1-fd90-4184-b9de-8cd021e1fb76'].includes(c.assigned_officer_id)
      );

      const enriched = complaints.map(c => ({
        ...c,
        sla_metrics: slaService.getSlaMetrics(c)
      }));

      return successResponse(res, enriched);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Field officer updates status (e.g. IN_PROGRESS or ON_HOLD)
   */
  async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      if (!['IN_PROGRESS', 'ON_HOLD', 'RESOLUTION_SUBMITTED'].includes(status)) {
        return errorResponse(res, 'Field officer can only transition to IN_PROGRESS, ON_HOLD, or RESOLUTION_SUBMITTED.', 'FORBIDDEN_TRANSITION', 403);
      }

      const complaint = db.getComplaintById(id);
      if (!complaint) return errorResponse(res, 'Complaint not found', 'NOT_FOUND', 404);

      const previousStatus = complaint.status;
      const updated = await db.updateComplaint(id, { status });

      db.addAuditLog({
        actor_id: req.user.id,
        actor_role: req.user.role,
        actor_name: req.user.name,
        entity: 'complaint',
        entity_id: id,
        action: 'OFFICER_STATUS_UPDATE',
        old_value: { status: previousStatus },
        new_value: { status },
        reason: notes || 'Field operational update'
      });

      return successResponse(res, updated, `Work status updated to ${status}`);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Pre-validate resolution evidence with AI before formal submission (Module 5)
   */
  async preValidateResolution(req, res, next) {
    try {
      const { id } = req.params;
      const { notes, evidence = [], officer_lat, officer_lng } = req.body;

      const complaint = db.getComplaintById(id);
      if (!complaint) return errorResponse(res, 'Complaint not found', 'NOT_FOUND', 404);

      const parsedEvidence = (Array.isArray(evidence) ? evidence : [evidence]).map(e =>
        typeof e === 'string' ? { url: e, caption: 'Resolution proof' } : e
      );

      if (!complaint.lat) complaint.lat = 26.7606;
      if (!complaint.lng) complaint.lng = 83.3732;
      const validation = await aiOrchestrator.validateOfficerResolution({
        complaint,
        resolutionNotes: notes || '',
        evidence: parsedEvidence,
        officerLat: officer_lat || complaint.lat,
        officerLng: officer_lng || complaint.lng
      });

      return successResponse(res, validation, 'Officer resolution evaluated by AI');
    } catch (err) {
      next(err);
    }
  },

  /**
   * Submit resolution with notes and evidence photos
   * Module 5 & Module 6: Enforces AI Pre-Submission Validation and 5-Pillar Verification
   */
  async submitResolution(req, res, next) {
    try {
      const { id } = req.params;
      const { notes, evidence = [], officer_lat, officer_lng } = req.body;

      if (!notes || !notes.trim()) {
        return errorResponse(res, 'Resolution notes describing the work done are required.', 'MISSING_NOTES', 400);
      }

      if (!evidence || (Array.isArray(evidence) && evidence.length === 0)) {
        return errorResponse(res, 'A real-time on-ground photograph is required for resolution verification.', 'MISSING_EVIDENCE', 400);
      }

      const complaint = db.getComplaintById(id);
      if (!complaint) return errorResponse(res, 'Complaint not found', 'NOT_FOUND', 404);

      const parsedEvidence = (Array.isArray(evidence) ? evidence : [evidence]).map(e =>
        typeof e === 'string' ? { url: e, caption: 'Resolution proof' } : e
      );

      // Pre-submission validation (Module 5)
      // Checks whether officer's proof and notes match original defect
      console.log(`[Field Officer AI Gate] Validating resolution for complaint ${complaint.complaint_number || id}...`);
      if (!complaint.lat) complaint.lat = 26.7606;
      if (!complaint.lng) complaint.lng = 83.3732;
      const validation = await aiOrchestrator.validateOfficerResolution({
        complaint,
        resolutionNotes: notes,
        evidence: parsedEvidence,
        officerLat: officer_lat || req.body.lat || complaint.lat,
        officerLng: officer_lng || req.body.lng || complaint.lng
      });

      if (!validation.canSubmit) {
        db.addAuditLog({
          actor_id: req.user.id,
          actor_role: req.user.role,
          actor_name: req.user.name,
          entity: 'complaint',
          entity_id: id,
          action: 'RESOLUTION_SUBMISSION_REJECTED_BY_AI',
          reason: validation.reason,
          new_value: { validation_status: validation.status || validation.code }
        });

        return errorResponse(
          res,
          validation.reason || 'Resolution photograph does not prove the civic defect was repaired. Please capture valid proof of the repaired site.',
          validation.status || validation.code || 'RESOLUTION_REJECTED',
          400,
          {
            validation_status: validation.status || validation.code,
            validation_code: validation.code,
            detected_category: validation.detectedCategory,
            rejection_reason: validation.reason,
            failure_reasons: validation.failureReasons || []
          }
        );
      }

      // 5-Pillar Advisory Verification (Module 6)
      const primaryBeforeMedia = (complaint.media && complaint.media.length > 0) ? complaint.media[0] : null;
      const primaryAfterMedia = parsedEvidence.length > 0 ? parsedEvidence[0] : null;

      const verificationReport = await aiOrchestrator.verifyResolution({
        beforeMedia: primaryBeforeMedia,
        afterMedia: primaryAfterMedia,
        beforeMetadata: {
          lat: complaint.lat,
          lng: complaint.lng,
          category: complaint.category,
          description: complaint.description
        },
        afterMetadata: {
          lat: officer_lat || req.body.lat || complaint.lat,
          lng: officer_lng || req.body.lng || complaint.lng,
          notes: notes
        },
        targetClass: complaint.category,
        originalDescription: complaint.description,
        resolutionDescription: notes
      });

      const resolutionData = {
        notes,
        submitted_at: new Date().toISOString(),
        officer_name: req.user.name,
        officer_id: req.user.id,
        evidence: parsedEvidence,
        ai_validation: {
          status: 'VALID',
          checked_at: new Date().toISOString()
        },
        ai_verification: verificationReport
      };

      const updated = await db.updateComplaint(id, {
        status: 'RESOLUTION_SUBMITTED',
        resolution: resolutionData,
        resolution_evidence: parsedEvidence,
        resolution_verification: verificationReport
      });

      // Record in resolutions collection authoritatively
      await db.createResolution({
        id: 'res-' + Date.now(),
        complaint_id: id,
        officer_id: complaint.assigned_officer_id || req.user.id,
        officer_name: req.user.name,
        notes,
        evidence: parsedEvidence,
        ai_verification: verificationReport,
        submitted_at: resolutionData.submitted_at
      });

      db.addAuditLog({
        actor_id: req.user.id,
        actor_role: req.user.role,
        actor_name: req.user.name,
        entity: 'complaint',
        entity_id: id,
        action: 'RESOLUTION_SUBMITTED',
        old_value: { status: complaint.status },
        new_value: {
          status: 'RESOLUTION_SUBMITTED',
          resolution: resolutionData,
          ai_recommendation: verificationReport.recommendation,
          verification_score: verificationReport.verification_score
        },
        reason: notes
      });

      // Notify Municipal Admin to verify
      if (complaint.municipality_id) {
        db.addNotification({
          user_id: null,
          role: 'municipal_admin',
          title: `Resolution Submitted: ${complaint.complaint_number}`,
          message: `${req.user.name} submitted resolution for ${complaint.complaint_number}. AI Verification: ${verificationReport.recommendation} (${verificationReport.verification_score}/100 pts).`,
          type: 'RESOLUTION',
          complaint_id: complaint.id
        });
      }

      return successResponse(res, updated, 'Resolution evidence submitted for verification');
    } catch (err) {
      next(err);
    }
  }
};
