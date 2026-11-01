import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../services/db/index.js';
import { supabaseAdminClient } from '../config/supabase.js';
import { pincodeRoutingService } from '../services/routing/pincodeRouting.js';
import { aiOrchestrator } from '../services/ai/aiOrchestrator.js';
import { slaService } from '../services/sla/slaService.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { normalizePhone } from '../utils/phone.js';

export const complaintController = {
  /**
   * Pre-analyze complaint draft before final submission (conversational UI step)
   */
  async preAnalyze(req, res, next) {
    try {
      const { description, pincode, lat, lng, media = [] } = req.body;

      if (!description) {
        return errorResponse(res, 'Description is required for AI analysis.', 'INVALID_INPUT', 400);
      }

      // 1. PIN routing lookup
      const pinResolution = pincodeRoutingService.resolveMunicipality(pincode);

      // 2. Cross-modal validation (Module 1)
      const validation = await aiOrchestrator.validateCitizenSubmission({ description, pincode, lat, lng, media });

      // 3. AI Triage analysis (reuse validation if already completed by FastAPI ML to avoid duplicate heavy YOLO inference)
      let aiAnalysis;
      if (validation.source === 'fastapi_ml_validator') {
        aiAnalysis = {
          category: validation.category,
          primary_category: validation.category,
          confidence: validation.categoryConfidence,
          priority: validation.priority,
          risk_score: validation.riskScore,
          priority_confidence: validation.priorityConfidence,
          priority_reason: validation.priorityReason,
          safety_override_triggered: validation.safetyOverrideTriggered,
          model_identifier: validation.modelIdentifier,
          validation_status: validation.validationStatus,
          is_valid: validation.isValid,
          validation_reason: validation.reason,
          detections: validation.detections,
          annotated_image: validation.annotatedImage,
          is_flagged: validation.isFlagged,
          flag_reason: validation.flagReason,
          source: 'fastapi_ml_validator'
        };
      } else {
        aiAnalysis = await aiOrchestrator.analyzeComplaint({ description, pincode, lat, lng, media });
      }

      const hasMedia = media && Array.isArray(media) && media.length > 0;
      const isInvalidDesc = validation.validationStatus === 'INVALID_DESCRIPTION';
      const isBlocked = isInvalidDesc || (hasMedia && !validation.isValid);
      const isMismatch = isBlocked && (validation.validationStatus === 'DETECTED_BUT_MISMATCHED' || validation.validationStatus === 'IMAGE_DESCRIPTION_MISMATCH' || validation.validationStatus === 'MISMATCH');
      const isNonCivic = isBlocked && (validation.validationStatus === 'INVALID_IMAGE' || validation.validationStatus === 'NON_CIVIC_IMAGE');
      const isUncertain = isBlocked && (validation.validationStatus === 'NO_RELIABLE_DETECTION' || validation.validationStatus === 'INSUFFICIENT_EVIDENCE');

      // Extract detected visual defect and category from YOLO
      const visualDetections = aiAnalysis.detections || [];
      const hasDetections = visualDetections.length > 0;
      const topVisualDefect = hasDetections ? visualDetections[0].class_name : null;
      const topVisualCategory = hasDetections ? visualDetections[0].category : null;

      let displayCategory = aiAnalysis.category;
      let displayPriority = aiAnalysis.priority;
      let displayRiskScore = aiAnalysis.risk_score;

      if (isInvalidDesc || isNonCivic) {
        displayCategory = 'Other / Non-Civic Issue';
        displayPriority = 'LOW';
        displayRiskScore = 0;
      } else if (isMismatch) {
        // When mismatch occurs, display the detected visual category from the photo so user clearly sees what YOLO detected!
        displayCategory = topVisualCategory || aiAnalysis.category;
        displayPriority = aiAnalysis.priority || 'MEDIUM';
        displayRiskScore = aiAnalysis.risk_score || 45;
      } else if (isUncertain) {
        // Genuine outdoor scene without high-confidence automated box; keep text-inferred civic category
        displayCategory = (validation.category && validation.category !== 'Other / Non-Civic Issue') ? validation.category : (aiAnalysis.category || 'Roads & Potholes');
        displayPriority = aiAnalysis.priority || 'MEDIUM';
        displayRiskScore = aiAnalysis.risk_score || 35;
      }

      const isLowConfVisual = hasDetections && visualDetections[0].confidence < 0.45;
      const isUnverified = !validation.isValid || isMismatch || isNonCivic || Boolean(aiAnalysis.is_flagged) || Boolean(validation.isFlagged) || (validation.validationStatus === 'NEEDS_MANUAL_REVIEW') || isLowConfVisual;

      return successResponse(res, {
        pin_resolution: pinResolution,
        ai_recommendation: {
          ...aiAnalysis,
          category: displayCategory,
          priority: displayPriority,
          risk_score: displayRiskScore,
          confidence: isNonCivic ? 0.10 : (isMismatch ? 0.35 : Math.min(0.88, aiAnalysis.confidence)),
          visual_confidence: hasDetections ? visualDetections[0].confidence : null,
          text_confidence: validation.textConfidence || null,
          is_flagged: isUnverified,
          flag_reason: (!validation.isValid || isMismatch) ? validation.reason : (isLowConfVisual ? `Low confidence detection (${Math.round(visualDetections[0].confidence * 100)}%). Requires manual engineer inspection.` : aiAnalysis.flag_reason),
          is_valid: validation.isValid,
          validation_status: validation.validationStatus || aiAnalysis.validation_status,
          case_id: validation.caseId,
          mismatch_reason: validation.reason,
          mismatch_reasons: validation.mismatchReasons,
          detections: isNonCivic ? [] : visualDetections,
          annotated_image: isNonCivic ? null : (aiAnalysis.annotated_image || null),
          visual_defect: topVisualDefect,
          visual_category: topVisualCategory,
          text_category: validation.textClassification?.municipal_department || null,
          hybrid_match: {
            status: validation.validationStatus || (validation.isValid 
              ? (hasDetections ? (isLowConfVisual ? 'NEEDS_MANUAL_REVIEW' : 'DETECTED_AND_MATCHED') : 'NO_RELIABLE_DETECTION')
              : (isMismatch ? 'DETECTED_BUT_MISMATCHED' : 'INVALID_IMAGE')),
            validation_status: validation.validationStatus || aiAnalysis.validation_status,
            is_valid: validation.isValid,
            reason: validation.reason,
            reasons: validation.mismatchReasons
          }
        }
      }, 'Draft analysis complete');
    } catch (err) {
      next(err);
    }
  },

  /**
   * Authoritative complaint creation
   */
  async create(req, res, next) {
    try {
      const {
        description,
        pincode,
        address,
        landmark,
        lat,
        lng,
        category, // citizen confirmed category
        priority, // ignored: citizen cannot override AI priority
        media = []
      } = req.body;

      if (!description || !pincode) {
        return errorResponse(res, 'Description and Problem Location PIN Code are required.', 'MISSING_FIELDS', 400);
      }

      // 1. Module 1: Strict Image-Description & Civic Intent Validation Enforcement (Backend cannot be bypassed)
      const validation = await aiOrchestrator.validateCitizenSubmission({ description, pincode, lat, lng, media });
      if (!validation.isValid) {
        if (['INVALID_DESCRIPTION', 'INVALID_IMAGE', 'DETECTED_BUT_MISMATCHED', 'IMAGE_DESCRIPTION_MISMATCH'].includes(validation.validationStatus)) {
          return errorResponse(
            res,
            validation.reason || 'The complaint description or uploaded evidence is invalid.',
            validation.validationStatus,
            400,
            {
              validation_status: validation.validationStatus,
              mismatch_reason: validation.reason,
              mismatch_reasons: validation.mismatchReasons
            }
          );
        }
      }

      // Server-side authoritative PIN lookup (never trust client municipality)
      const routing = pincodeRoutingService.resolveMunicipality(pincode);

      // AI Analysis (reuse validation if already completed by FastAPI ML to prevent duplicate inference)
      let aiResult;
      if (validation && validation.source === 'fastapi_ml_validator') {
        aiResult = {
          category: validation.category,
          primary_category: validation.category,
          confidence: validation.categoryConfidence,
          priority: validation.priority,
          risk_score: validation.riskScore,
          priority_confidence: validation.priorityConfidence,
          priority_reason: validation.priorityReason,
          safety_override_triggered: validation.safetyOverrideTriggered,
          model_identifier: validation.modelIdentifier,
          detections: validation.detections,
          annotated_image: validation.annotatedImage,
          validation_status: validation.validationStatus
        };
      } else {
        aiResult = await aiOrchestrator.analyzeComplaint({ description, pincode, lat, lng, media });
      }

      // Module 3: Priority is generated authoritatively by the backend. Citizen cannot change priority!
      const finalCategory = category || aiResult.category || 'Roads & Potholes';
      const finalPriority = aiResult.priority || 'MEDIUM';
      const dueDate = slaService.calculateDueDate(finalPriority);

      const userPhone = normalizePhone(req.user.phone || req.body.citizen_phone);

      const complaintData = {
        citizen_id: req.user.id,
        citizen_name: req.user.name,
        citizen_phone: userPhone,
        municipality_id: routing.municipality_id,
        municipality_name: routing.municipality_name,
        pincode: routing.pincode || pincode,
        ward_id: routing.ward_id,
        ward_name: routing.ward_name,
        address,
        landmark,
        lat,
        lng,
        category: finalCategory,
        priority: finalPriority,
        priority_reason: aiResult.priority_reason,
        risk_score: aiResult.risk_score || 50,
        risk_factors: aiResult.risk_factors || {},
        contributing_factors: aiResult.contributing_factors || {},
        safety_override_triggered: aiResult.safety_override_triggered || null,
        safety_override_status: aiResult.safety_override_status || (aiResult.safety_override_triggered ? 'Applied' : 'None'),
        validation_status: aiResult.validation_status || 'MATCHED',
        description,
        is_routing_review: routing.is_routing_review,
        ai_status: aiResult.ai_status,
        due_at: dueDate,
        media: media.map(m => typeof m === 'string' ? { storage_path: m, type: 'image' } : m),
        ai_detections: aiResult.detections || []
      };

      const complaint = await db.createComplaint(complaintData);

      // Store AI analysis record
      const aiRecord = {
        id: uuidv4(),
        complaint_id: complaint.id,
        category: aiResult.category,
        confidence: aiResult.confidence,
        duplicate_score: aiResult.duplicate_candidates?.[0]?.similarity_score || 0.1,
        priority: aiResult.priority,
        extracted_data: aiResult.extracted_data,
        detections: aiResult.detections || [],
        reasoning: aiResult.priority_reason,
        model_version: aiResult.model_version,
        created_at: new Date().toISOString()
      };
      db.ai_analyses.push(aiRecord);
      if (supabaseAdminClient) {
        try { await supabaseAdminClient.from('ai_analyses').insert(aiRecord); } catch(err) { console.warn('[ComplaintController] Error saving AI analysis to Supabase:', err); }
      }

      // Store duplicate candidates if any
      if (aiResult.duplicate_candidates?.length > 0) {
        for (const cand of aiResult.duplicate_candidates) {
          db.complaint_duplicates.push({
            id: `${complaint.id}-${cand.candidate_id}`,
            complaint_id: complaint.id,
            candidate_id: cand.candidate_id,
            score: cand.similarity_score,
            decision: 'pending'
          });
        }
      }

      // Initial Audit Log
      await db.addAuditLog({
        actor_id: req.user.id,
        actor_role: req.user.role,
        actor_name: req.user.name,
        entity: 'complaint',
        entity_id: complaint.id,
        action: 'SUBMITTED',
        old_value: null,
        new_value: { status: 'SUBMITTED', category: finalCategory, priority: finalPriority, pincode: complaint.pincode, municipality: complaint.municipality_name },
        reason: 'Citizen grievance submitted.'
      });

      // Notification to Citizen
      await db.addNotification({
        user_id: req.user.id,
        role: 'citizen',
        title: 'Complaint Registered',
        message: `Your grievance ${complaint.complaint_number} has been logged. ${routing.is_routing_review ? 'Routing review pending.' : `Assigned to ${routing.municipality_name}.`}`,
        type: 'STATUS_CHANGE',
        complaint_id: complaint.id
      });

      // Notification to Municipal Admin if mapped
      if (routing.municipality_id) {
        const muniAdmin = db.profiles.find(p => p.role === 'municipal_admin' && p.municipality_id === routing.municipality_id);
        if (muniAdmin) {
          await db.addNotification({
            user_id: muniAdmin.id,
            role: 'municipal_admin',
            title: 'New Complaint Received',
            message: `New ${finalPriority} complaint ${complaint.complaint_number} registered for PIN ${complaint.pincode}.`,
            type: 'NEW_COMPLAINT',
            complaint_id: complaint.id
          });
        }
      }

      return successResponse(res, {
        complaint,
        routing_info: routing,
        ai_analysis: aiResult
      }, 'Complaint registered successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get single complaint by ID or Complaint Number
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const complaint = db.getComplaintById(id);

      if (!complaint) {
        return errorResponse(res, 'Complaint not found', 'NOT_FOUND', 404);
      }

      // Role check: Municipal Admin can only see their own municipality's complaints
      if (req.user.role === 'municipal_admin' && complaint.municipality_id !== req.user.municipality_id) {
        return errorResponse(res, 'Access denied to complaints of other municipalities', 'FORBIDDEN', 403);
      }

      // Citizen can only see their own complaints
      if (req.user.role === 'citizen' && complaint.citizen_id !== req.user.id) {
        return errorResponse(res, "Access denied: You are not authorized to view another citizen's grievance details.", 'FORBIDDEN', 403);
      }

      const auditHistory = db.getAuditLogs(complaint.id);
      const aiAnalysis = db.ai_analyses.find(a => a.complaint_id === complaint.id);
      // Only consider duplicates that have not been explicitly dismissed or unlinked
      const duplicates = (db.complaint_duplicates || []).filter(d =>
        d.complaint_id === complaint.id &&
        !['unlinked', 'kept_separate', 'rejected'].includes(d.decision)
      );
      const slaMetrics = slaService.getSlaMetrics(complaint);

      // Compute dynamic candidates passing all strict domain & content gates
      const dynamicCandidates = aiOrchestrator.findLocalDuplicateCandidates({
        description: complaint.description,
        pincode: complaint.pincode,
        lat: complaint.lat,
        lng: complaint.lng,
        category: complaint.category,
        created_at: complaint.created_at
      });

      // Enrich duplicate candidates; drop any that fail category or defect content gates unless already linked
      const enrichedDuplicates = [];

      for (const d of duplicates) {
        const candidate = db.getComplaintById(d.candidate_id);
        const isLinked = (complaint.duplicate_of === d.candidate_id || complaint.merged_into === d.candidate_id);
        const dynamicMatch = dynamicCandidates.find(dc => dc.candidate_id === d.candidate_id);

        // If not actively linked and not matching dynamic multi-factor gates, skip legacy candidate
        if (!isLinked && !dynamicMatch) {
          continue;
        }

        enrichedDuplicates.push({
          ...d,
          complaint_number: candidate?.complaint_number || ('Ticket #' + d.candidate_id.slice(0, 8)),
          category: candidate?.category || 'Civic Issue',
          description: candidate?.description || '',
          status: candidate?.status || 'UNKNOWN',
          address: candidate?.address || candidate?.landmark || 'Same Vicinity',
          created_at: candidate?.created_at || null,
          is_currently_linked: isLinked,
          similarity_score: dynamicMatch?.similarity_score || d.score || 0.85,
          decision: dynamicMatch?.decision || d.decision || 'DUPLICATE',
          reasons: dynamicMatch?.reasons || [
            'Proximity within the same neighborhood.',
            'Related civic defect category.'
          ],
          breakdown: dynamicMatch?.breakdown || {
            distance_meters: null,
            distance_label: 'Same Vicinity',
            time_delta_hours: null,
            time_delta_label: 'Recent Incident',
            category_match: candidate?.category === complaint.category,
            category_label: candidate?.category === complaint.category ? `Matching Category (${complaint.category})` : 'Related Category',
            text_similarity_percent: Math.round((d.score || 0.8) * 100),
            text_label: 'Lexical / Context Match'
          }
        });
      }

      // Add high-confidence dynamic candidates if not already present or dismissed
      for (const live of dynamicCandidates) {
        const isDismissed = (db.complaint_duplicates || []).some(cd =>
          cd.complaint_id === complaint.id &&
          cd.candidate_id === live.candidate_id &&
          ['unlinked', 'kept_separate', 'rejected'].includes(cd.decision)
        );

        if (
          live.candidate_id !== complaint.id &&
          !isDismissed &&
          !enrichedDuplicates.some(e => e.candidate_id === live.candidate_id)
        ) {
          enrichedDuplicates.push({
            id: `${complaint.id}-${live.candidate_id}`,
            complaint_id: complaint.id,
            candidate_id: live.candidate_id,
            complaint_number: live.complaint_number,
            category: live.category,
            description: live.description,
            address: live.address,
            status: live.status,
            created_at: live.created_at,
            is_currently_linked: (complaint.duplicate_of === live.candidate_id || complaint.merged_into === live.candidate_id),
            similarity_score: live.similarity_score,
            decision: live.decision,
            reasons: live.reasons,
            breakdown: live.breakdown
          });
        }
      }

      let linkedMasterComplaint = null;
      const masterId = complaint.duplicate_of || complaint.merged_into;
      if (masterId) {
        const master = db.getComplaintById(masterId);
        if (master) {
          linkedMasterComplaint = {
            id: master.id,
            complaint_number: master.complaint_number,
            category: master.category,
            description: master.description,
            status: master.status,
            department_name: master.department_name,
            assigned_officer_name: master.assigned_officer_name,
            due_at: master.due_at,
            sla_metrics: slaService.getSlaMetrics(master),
            resolution: master.resolution || null,
            resolution_evidence: master.resolution_evidence || [],
            media: master.media || [],
            created_at: master.created_at,
            address: master.address || master.landmark
          };
        }
      }

      const resolvedRiskScore = complaint.risk_score || aiAnalysis?.risk_score || (complaint.priority === 'CRITICAL' ? 88 : complaint.priority === 'HIGH' ? 68 : complaint.priority === 'MEDIUM' ? 45 : 25);
      const resolvedConfidence = complaint.confidence || aiAnalysis?.confidence || 0.94;
      const resolvedFactors = complaint.risk_factors || aiAnalysis?.risk_factors || null;
      const resolvedOverride = complaint.safety_override_triggered || aiAnalysis?.safety_override || null;
      const resolvedSlaHours = complaint.recommended_sla_hours || aiAnalysis?.recommended_sla_hours || 48;

      return successResponse(res, {
        ...complaint,
        risk_score: resolvedRiskScore,
        confidence: resolvedConfidence,
        risk_factors: resolvedFactors,
        safety_override_triggered: resolvedOverride,
        recommended_sla_hours: resolvedSlaHours,
        sla_metrics: slaMetrics,
        ai_analysis: aiAnalysis ? {
          ...aiAnalysis,
          risk_score: resolvedRiskScore,
          confidence: resolvedConfidence,
          risk_factors: resolvedFactors,
          safety_override: resolvedOverride
        } : null,
        duplicate_candidates: enrichedDuplicates,
        linked_master_complaint: linkedMasterComplaint,
        merged_complaints: complaint.merged_complaints || [],
        merged_count: complaint.merged_count || 1,
        audit_history: auditHistory
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get complaints for authenticated citizen
   */
  async getMyReports(req, res, next) {
    try {
      const userPhone = normalizePhone(req.user.phone);
      const list = db.listComplaints({
        citizen_id: req.user.id,
        citizen_phone: userPhone
      });
      const enriched = list.map(c => {
        let masterSummary = null;
        const masterId = c.duplicate_of || c.merged_into;
        if (masterId) {
          const master = db.getComplaintById(masterId);
          if (master) {
            masterSummary = {
              complaint_number: master.complaint_number,
              status: master.status,
              assigned_officer_name: master.assigned_officer_name
            };
          }
        }
        return {
          ...c,
          sla_metrics: slaService.getSlaMetrics(c),
          master_summary: masterSummary,
          is_merged_duplicate: Boolean(masterId)
        };
      });
      return successResponse(res, enriched);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Citizen verifies resolution, leaves 1-5 rating & review, or reopens ticket
   */
  async verify(req, res, next) {
    try {
      const { id } = req.params;
      const { action, rating, feedback, reopen_reason } = req.body;
      const complaint = db.getComplaintById(id);

      if (!complaint) {
        return errorResponse(res, 'Complaint not found', 'NOT_FOUND', 404);
      }

      if (action === 'CONFIRM') {
        const updated = await db.updateComplaint(id, {
          status: 'RESOLVED',
          citizen_confirmed: true,
          citizen_rating: rating || 5,
          citizen_feedback: feedback || 'Resolution confirmed by citizen.'
        });

        db.addAuditLog({
          actor_id: req.user.id,
          actor_role: 'citizen',
          actor_name: req.user.name,
          entity: 'complaint',
          entity_id: complaint.id,
          action: 'CITIZEN_CONFIRMED',
          old_value: { status: complaint.status },
          new_value: { status: 'RESOLVED', rating },
          reason: feedback || 'Citizen confirmed resolution.'
        });

        return successResponse(res, updated, 'Resolution verified and closed');
      } else if (action === 'REOPEN') {
        if (!reopen_reason) {
          return errorResponse(res, 'Reopen reason is required', 'MISSING_REASON', 400);
        }

        const updated = await db.updateComplaint(id, {
          status: 'REOPENED',
          citizen_confirmed: false,
          reopen_count: (complaint.reopen_count || 0) + 1,
          reopen_reason
        });

        db.addAuditLog({
          actor_id: req.user.id,
          actor_role: 'citizen',
          actor_name: req.user.name,
          entity: 'complaint',
          entity_id: complaint.id,
          action: 'REOPENED',
          old_value: { status: complaint.status },
          new_value: { status: 'REOPENED', reopen_reason },
          reason: reopen_reason
        });

        return successResponse(res, updated, 'Complaint reopened');
      }

      return errorResponse(res, "Invalid action. Must be 'CONFIRM' or 'REOPEN'.", 'INVALID_ACTION', 400);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Upload complaint evidence image
   */
  async uploadMedia(req, res, next) {
    try {
      if (!req.file) {
        return errorResponse(res, 'Please provide an image file.', 'MISSING_FILE', 400);
      }
      let storageUrl = null;

      // 1. Supabase Storage if bucket is reachable
      if (supabaseAdminClient) {
        try {
          const fileExt = path.extname(req.file.originalname) || '.jpg';
          const storagePath = `complaints/evidence-${Date.now()}-${uuidv4().slice(0, 8)}${fileExt}`;
          const fileBuffer = fs.readFileSync(req.file.path);

          const { data, error } = await supabaseAdminClient.storage
            .from('complaints')
            .upload(storagePath, fileBuffer, {
              contentType: req.file.mimetype,
              upsert: true
            });

          if (!error && data?.path) {
            const { data: publicUrlData } = supabaseAdminClient.storage
              .from('complaints')
              .getPublicUrl(data.path);
            storageUrl = publicUrlData?.publicUrl;
          }
        } catch (supabaseErr) {
          console.warn('[Complaint Media Upload] Supabase Storage upload skipped/failed:', supabaseErr.message);
        }
      }

      // 2. High-availability local persistent URL fallback (strictly for offline local development)
      if (!storageUrl) {
        if (process.env.NODE_ENV === 'production') {
          return errorResponse(res, 'Failed to store image in cloud storage. Please ensure Supabase Storage is reachable.', 'STORAGE_ERROR', 500);
        }
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        storageUrl = `${baseUrl}/uploads/complaints/${req.file.filename}`;
      }

      return successResponse(res, {
        mediaUrl: storageUrl,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size
      }, 'Evidence image stored successfully');
    } catch (err) {
      next(err);
    }
  }
};
