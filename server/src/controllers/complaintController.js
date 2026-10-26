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
      const { description, pincode, lat, lng, media } = req.body;

      if (!description) {
        return errorResponse(res, 'Description is required for AI analysis.', 'INVALID_INPUT', 400);
      }

      // 1. PIN routing lookup
      const pinResolution = pincodeRoutingService.resolveMunicipality(pincode);

      // 2. AI Triage analysis
      const aiAnalysis = await aiOrchestrator.analyzeComplaint({ description, pincode, lat, lng, media });

      return successResponse(res, {
        pin_resolution: pinResolution,
        ai_recommendation: aiAnalysis
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
        priority, // citizen confirmed or AI recommended
        media = []
      } = req.body;

      if (!description || !pincode) {
        return errorResponse(res, 'Description and Problem Location PIN Code are required.', 'MISSING_FIELDS', 400);
      }

      // Server-side authoritative PIN lookup (never trust client municipality)
      const routing = pincodeRoutingService.resolveMunicipality(pincode);

      // AI Analysis
      const aiResult = await aiOrchestrator.analyzeComplaint({ description, pincode, lat, lng, media });

      const finalCategory = category || aiResult.category || 'Roads & Potholes';
      const finalPriority = priority || aiResult.priority || 'MEDIUM';
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
        description,
        is_routing_review: routing.is_routing_review,
        ai_status: aiResult.ai_status,
        due_at: dueDate,
        media: media.map(m => typeof m === 'string' ? { storage_path: m, type: 'image' } : m)
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
        reasoning: aiResult.priority_reason,
        model_version: aiResult.model_version,
        created_at: new Date().toISOString()
      };
      db.ai_analyses.push(aiRecord);
      if (supabaseAdminClient) {
        supabaseAdminClient.from('ai_analyses').insert(aiRecord).then(() => {}, (err) => {
          console.warn('[ComplaintController] Error saving AI analysis to Supabase:', err);
        });
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
        // Allow public tracking summary or restrict
      }

      const auditHistory = db.getAuditLogs(complaint.id);
      const aiAnalysis = db.ai_analyses.find(a => a.complaint_id === complaint.id);
      const duplicates = db.complaint_duplicates.filter(d => d.complaint_id === complaint.id);
      const slaMetrics = slaService.getSlaMetrics(complaint);

      return successResponse(res, {
        ...complaint,
        sla_metrics: slaMetrics,
        ai_analysis: aiAnalysis || null,
        duplicate_candidates: duplicates,
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
      const enriched = list.map(c => ({
        ...c,
        sla_metrics: slaService.getSlaMetrics(c)
      }));
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

      // 2. High-availability local persistent URL fallback
      if (!storageUrl) {
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
