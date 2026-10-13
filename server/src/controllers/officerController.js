import { db } from '../services/db/index.js';
import { slaService } from '../services/sla/slaService.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const officerController = {
  /**
   * List complaints assigned to logged-in officer
   */
  async getMyAssignments(req, res, next) {
    try {
      const officerProfileId = req.user.id;
      const officer = db.officers.find(o => o.profile_id === officerProfileId);

      // If simulated or not found directly, get assignments matching officer id or demo officer
      const officerId = officer ? officer.id : 'of111111-1111-1111-1111-111111111111';

      const complaints = db.complaints.filter(c =>
        c.assigned_officer_id === officerId ||
        ['of111111-1111-1111-1111-111111111111', 'of222222-2222-2222-2222-222222222222'].includes(c.assigned_officer_id)
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
   * Submit resolution with notes and evidence photos
   */
  async submitResolution(req, res, next) {
    try {
      const { id } = req.params;
      const { notes, evidence = [] } = req.body;

      if (!notes) {
        return errorResponse(res, 'Resolution notes describing the work done are required.', 'MISSING_NOTES', 400);
      }

      const complaint = db.getComplaintById(id);
      if (!complaint) return errorResponse(res, 'Complaint not found', 'NOT_FOUND', 404);

      const parsedEvidence = evidence.map(e => typeof e === 'string' ? { url: e, caption: 'Resolution proof' } : e);
      const resolutionData = {
        notes,
        submitted_at: new Date().toISOString(),
        officer_name: req.user.name,
        evidence: parsedEvidence
      };

      const updated = await db.updateComplaint(id, {
        status: 'RESOLUTION_SUBMITTED',
        resolution: resolutionData,
        resolution_evidence: parsedEvidence
      });

      db.addAuditLog({
        actor_id: req.user.id,
        actor_role: req.user.role,
        actor_name: req.user.name,
        entity: 'complaint',
        entity_id: id,
        action: 'RESOLUTION_SUBMITTED',
        old_value: { status: complaint.status },
        new_value: { status: 'RESOLUTION_SUBMITTED', resolution: resolutionData },
        reason: notes
      });

      // Notify Municipal Admin to verify
      if (complaint.municipality_id) {
        db.addNotification({
          user_id: null,
          role: 'municipal_admin',
          title: `Resolution Submitted: ${complaint.complaint_number}`,
          message: `${req.user.name} submitted resolution for ${complaint.complaint_number}. Verification required.`,
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
