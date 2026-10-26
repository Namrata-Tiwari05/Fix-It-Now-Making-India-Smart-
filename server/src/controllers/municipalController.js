import { db } from '../services/db/index.js';
import { complaintLifecycleService } from '../services/complaints/complaintLifecycle.js';
import { slaService } from '../services/sla/slaService.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const municipalController = {
  /**
   * Get municipality-isolated overview KPIs & analytics
   */
  async getOverview(req, res, next) {
    try {
      let municipalityId = req.user.municipality_id;
      if (req.user.role === 'master_admin' && req.query.municipality_id) {
        municipalityId = req.query.municipality_id;
      }
      if (!municipalityId && db.municipalities.length > 0) {
        municipalityId = db.municipalities[0].id;
      }

      if (!municipalityId) {
        return successResponse(res, {
          municipality: null,
          total: 0,
          newUnderReview: 0,
          inProgress: 0,
          slaRisk: 0,
          resolved: 0,
          statusCounts: {},
          categoriesCount: {},
          recentComplaints: []
        });
      }

      const overview = db.getMunicipalOverview(municipalityId);
      const municipality = db.municipalities.find(m => m.id === municipalityId);

      return successResponse(res, {
        municipality: municipality ? { id: municipality.id, name: municipality.name, code: municipality.code } : null,
        ...overview
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * List municipality complaints with rich multi-segmented filters
   */
  async listComplaints(req, res, next) {
    try {
      let municipalityId = req.user.municipality_id;
      if (req.user.role === 'master_admin' && req.query.municipality_id) {
        municipalityId = req.query.municipality_id;
      }
      if (!municipalityId && db.municipalities.length > 0) {
        municipalityId = db.municipalities[0].id;
      }

      if (!municipalityId) {
        return successResponse(res, []);
      }

      const { status, category, priority, ward_id, search } = req.query;

      const list = db.listComplaints({
        municipality_id: municipalityId,
        status,
        category,
        priority,
        ward_id,
        search
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
   * Assign department, field officer, and deadline to a complaint
   */
  async assign(req, res, next) {
    try {
      const { id } = req.params;
      const { department_id, officer_id, due_at, notes } = req.body;

      const complaint = db.getComplaintById(id);
      if (!complaint) return errorResponse(res, 'Complaint not found', 'NOT_FOUND', 404);

      const dept = db.departments.find(d => d.id === department_id);
      const officer = db.officers.find(o => o.id === officer_id);

      const updates = {
        department_id: department_id || complaint.department_id,
        department_name: dept ? dept.name : complaint.department_name,
        assigned_officer_id: officer_id || complaint.assigned_officer_id,
        assigned_officer_name: officer ? officer.name : complaint.assigned_officer_name,
        due_at: due_at || complaint.due_at,
        status: complaint.status === 'SUBMITTED' || complaint.status === 'UNDER_REVIEW' ? 'ASSIGNED' : complaint.status
      };

      const updated = await db.updateComplaint(id, updates);

      // Add assignment record
      db.assignments.push({
        id: `asg-${Date.now()}`,
        complaint_id: id,
        department_id: updates.department_id,
        officer_id: updates.assigned_officer_id,
        assigned_by: req.user.id,
        assigned_at: new Date().toISOString(),
        due_at: updates.due_at,
        notes: notes || 'Assigned by Municipal Administrator'
      });

      // Update officer workload
      if (officer) {
        officer.active_workload = (officer.active_workload || 0) + 1;
      }

      // Audit Log
      db.addAuditLog({
        actor_id: req.user.id,
        actor_role: req.user.role,
        actor_name: req.user.name,
        entity: 'complaint',
        entity_id: id,
        action: 'ASSIGNED',
        old_value: { status: complaint.status, officer: complaint.assigned_officer_name },
        new_value: { status: updates.status, officer: updates.assigned_officer_name, department: updates.department_name },
        reason: notes || 'Officer assigned'
      });

      return successResponse(res, updated, 'Assignment successful');
    } catch (err) {
      next(err);
    }
  },

  /**
   * Update complaint status with lifecycle transition validation
   */
  async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;

      if (!status) return errorResponse(res, 'Next status is required', 'MISSING_STATUS', 400);

      const updated = complaintLifecycleService.transitionStatus({
        complaintId: id,
        nextStatus: status,
        actor: req.user,
        reason: reason || 'Status updated by Municipal Admin'
      });

      return successResponse(res, updated, `Status updated to ${status}`);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Accept, reject, or modify AI category/priority with mandatory reason
   */
  async overrideAI(req, res, next) {
    try {
      const { id } = req.params;
      const { action, category, priority, reason } = req.body;

      if (!reason) {
        return errorResponse(res, 'An administrative override reason is strictly required.', 'MISSING_REASON', 400);
      }

      const complaint = db.getComplaintById(id);
      if (!complaint) return errorResponse(res, 'Complaint not found', 'NOT_FOUND', 404);

      const updates = {};
      if (action === 'ACCEPT') {
        updates.category_confirmed_by_admin = true;
      } else if (action === 'OVERRIDE' || action === 'EDIT') {
        if (category) updates.category = category;
        if (priority) {
          updates.priority = priority;
          updates.due_at = slaService.calculateDueDate(priority);
        }
        updates.category_confirmed_by_admin = true;
      }

      const updated = db.updateComplaint(id, updates);

      // Log AI override in audit log (PRD Section 8 requirement)
      db.addAuditLog({
        actor_id: req.user.id,
        actor_role: req.user.role,
        actor_name: req.user.name,
        entity: 'complaint',
        entity_id: id,
        action: `AI_OVERRIDE_${action}`,
        old_value: { category: complaint.category, priority: complaint.priority },
        new_value: { category: updated.category, priority: updated.priority },
        reason
      });

      return successResponse(res, updated, 'AI recommendation reviewed and updated');
    } catch (err) {
      next(err);
    }
  },

  /**
   * Link complaint as duplicate or keep separate
   */
  async linkDuplicate(req, res, next) {
    try {
      const { id } = req.params;
      const { candidate_id, decision, reason } = req.body; // decision: 'linked' or 'kept_separate'

      const record = db.complaint_duplicates.find(d => d.complaint_id === id && d.candidate_id === candidate_id);
      if (record) {
        record.decision = decision;
        record.decision_by = req.user.id;
        record.decision_reason = reason;
      }

      if (decision === 'linked') {
        db.updateComplaint(id, {
          status: 'CLOSED',
          duplicate_of: candidate_id
        });
      }

      db.addAuditLog({
        actor_id: req.user.id,
        actor_role: req.user.role,
        actor_name: req.user.name,
        entity: 'complaint',
        entity_id: id,
        action: `DUPLICATE_${decision.toUpperCase()}`,
        old_value: null,
        new_value: { candidate_id, decision },
        reason: reason || `Duplicate decision: ${decision}`
      });

      return successResponse(res, { decision, candidate_id }, `Duplicate marked as ${decision}`);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Verify resolution submitted by field officer
   */
  async verifyResolution(req, res, next) {
    try {
      const { id } = req.params;
      const { approved, notes } = req.body;

      const complaint = db.getComplaintById(id);
      if (!complaint) return errorResponse(res, 'Complaint not found', 'NOT_FOUND', 404);

      if (approved) {
        const updated = await db.updateComplaint(id, {
          status: 'VERIFICATION',
          resolution_verified_by_admin: true
        });

        db.addAuditLog({
          actor_id: req.user.id,
          actor_role: req.user.role,
          actor_name: req.user.name,
          entity: 'complaint',
          entity_id: id,
          action: 'RESOLUTION_VERIFIED',
          old_value: { status: complaint.status },
          new_value: { status: 'VERIFICATION' },
          reason: notes || 'Resolution evidence verified by admin. Awaiting citizen confirmation.'
        });

        // Notify Citizen
        db.addNotification({
          user_id: complaint.citizen_id,
          role: 'citizen',
          title: 'Resolution Ready for Verification',
          message: `Field work on ${complaint.complaint_number} is completed. Please review proof and confirm.`,
          type: 'RESOLUTION',
          complaint_id: complaint.id
        });

        return successResponse(res, updated, 'Resolution verified and routed for citizen verification');
      } else {
        // Reject resolution, send back to IN_PROGRESS
        const updated = await db.updateComplaint(id, {
          status: 'IN_PROGRESS'
        });

        db.addAuditLog({
          actor_id: req.user.id,
          actor_role: req.user.role,
          actor_name: req.user.name,
          entity: 'complaint',
          entity_id: id,
          action: 'RESOLUTION_REJECTED',
          old_value: { status: complaint.status },
          new_value: { status: 'IN_PROGRESS' },
          reason: notes || 'Evidence unsatisfactory, re-dispatched to field officer.'
        });

        return successResponse(res, updated, 'Resolution sent back to field officer');
      }
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get municipality departments
   */
  async getDepartments(req, res, next) {
    try {
      let municipalityId = req.user.municipality_id;
      if (req.user.role === 'master_admin' && req.query.municipality_id) {
        municipalityId = req.query.municipality_id;
      }
      if (!municipalityId && db.municipalities.length > 0) {
        municipalityId = db.municipalities[0].id;
      }
      const depts = municipalityId ? db.departments.filter(d => d.municipality_id === municipalityId) : [];
      return successResponse(res, depts);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get municipality field officers
   */
  async getOfficers(req, res, next) {
    try {
      let municipalityId = req.user.municipality_id;
      if (req.user.role === 'master_admin' && req.query.municipality_id) {
        municipalityId = req.query.municipality_id;
      }
      if (!municipalityId && db.municipalities.length > 0) {
        municipalityId = db.municipalities[0].id;
      }
      const officers = municipalityId ? db.officers.filter(o => o.municipality_id === municipalityId) : [];
      return successResponse(res, officers);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Create a new Municipal Department
   */
  async createDepartment(req, res, next) {
    try {
      const municipalityId = req.user.municipality_id;
      const { name, code, category_mappings, sla_hours_default } = req.body;
      if (!name) return errorResponse(res, 'Department name is required', 'MISSING_FIELDS', 400);

      const dept = await db.createDepartment({
        municipality_id: municipalityId,
        name,
        code,
        category_mappings: category_mappings || [],
        sla_hours_default: sla_hours_default || 48
      });

      db.addAuditLog({
        actor_id: req.user.id,
        actor_role: req.user.role,
        actor_name: req.user.name,
        entity: 'department',
        entity_id: dept.id,
        action: 'DEPARTMENT_CREATED',
        old_value: null,
        new_value: dept,
        reason: 'Municipal Admin created department'
      });

      return successResponse(res, dept, 'Department created successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Create a new Field Officer (Auth User + Profile + Officers Record)
   */
  async createOfficer(req, res, next) {
    try {
      const municipalityId = req.user.municipality_id;
      const { name, email, phone, department_id, password } = req.body;
      if (!name || !email || !department_id) {
        return errorResponse(res, 'Name, email, and department are required', 'MISSING_FIELDS', 400);
      }

      const result = await db.createFieldOfficerUser({
        name,
        email,
        phone,
        department_id,
        municipality_id: municipalityId,
        password: password || 'FixItNow@2026!'
      });

      db.addAuditLog({
        actor_id: req.user.id,
        actor_role: req.user.role,
        actor_name: req.user.name,
        entity: 'officer',
        entity_id: result.officer.id,
        action: 'OFFICER_CREATED',
        old_value: null,
        new_value: { name, email, phone, department_id },
        reason: 'Municipal Admin recruited Field Officer'
      });

      return successResponse(res, result, 'Field Officer created successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Real Municipal Analytics computed from actual complaints
   */
  async getAnalytics(req, res, next) {
    try {
      let municipalityId = req.user.municipality_id;
      if (req.user.role === 'master_admin' && req.query.municipality_id) {
        municipalityId = req.query.municipality_id;
      }
      if (!municipalityId && db.municipalities.length > 0) {
        municipalityId = db.municipalities[0].id;
      }

      if (!municipalityId) {
        return successResponse(res, {
          totalComplaints: 0,
          avgResolutionHours: 0,
          slaAdherencePercent: 100,
          avgCitizenRating: 0,
          reopenRatePercent: 0,
          categoryBreakdown: [],
          departmentSlaBenchmarks: []
        });
      }

      const analytics = db.getMunicipalAnalytics(municipalityId);
      return successResponse(res, analytics);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get Municipality Settings
   */
  async getSettings(req, res, next) {
    try {
      let municipalityId = req.user.municipality_id;
      if (req.user.role === 'master_admin' && req.query.municipality_id) {
        municipalityId = req.query.municipality_id;
      }
      if (!municipalityId && db.municipalities.length > 0) {
        municipalityId = db.municipalities[0].id;
      }

      const muni = db.municipalities.find(m => m.id === municipalityId);
      if (!muni) return errorResponse(res, 'Municipality not found', 'NOT_FOUND', 404);

      const pins = db.municipality_pincodes
        .filter(p => p.municipality_id === municipalityId && (p.active === true || p.active === undefined))
        .map(p => p.pincode);

      return successResponse(res, {
        ...muni,
        pincodes: pins
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Update Municipality Settings
   */
  async updateSettings(req, res, next) {
    try {
      let municipalityId = req.user.municipality_id;
      if (req.user.role === 'master_admin' && req.body.municipality_id) {
        municipalityId = req.body.municipality_id;
      }
      if (!municipalityId && db.municipalities.length > 0) {
        municipalityId = db.municipalities[0].id;
      }

      const updated = await db.updateSettings(municipalityId, req.body);
      return successResponse(res, updated, 'Settings updated successfully');
    } catch (err) {
      next(err);
    }
  },

  /**
   * Add a new jurisdictional PIN code to this municipality
   */
  async addPincode(req, res, next) {
    try {
      let municipalityId = req.user.municipality_id;
      if (req.user.role === 'master_admin' && req.body.municipality_id) {
        municipalityId = req.body.municipality_id;
      }
      if (!municipalityId && db.municipalities.length > 0) {
        municipalityId = db.municipalities[0].id;
      }

      const { pincode, locality_name, ward_id } = req.body;
      const cleanPin = String(pincode || '').replace(/\D/g, '').slice(0, 6);
      if (!cleanPin || cleanPin.length !== 6) {
        return errorResponse(res, 'Valid 6-digit PIN code is required', 'INVALID_PINCODE', 400);
      }

      const entry = await db.addMunicipalPincode(municipalityId, cleanPin, locality_name, ward_id);

      db.addAuditLog({
        actor_id: req.user.id,
        actor_role: req.user.role,
        actor_name: req.user.name,
        entity: 'municipality_pincodes',
        entity_id: entry.id,
        action: 'PINCODE_ADDED',
        old_value: null,
        new_value: entry,
        reason: 'Municipal admin mapped new jurisdictional PIN code'
      });

      return successResponse(res, entry, 'PIN code added successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Remove a jurisdictional PIN code from this municipality
   */
  async removePincode(req, res, next) {
    try {
      let municipalityId = req.user.municipality_id;
      if (req.user.role === 'master_admin' && req.query.municipality_id) {
        municipalityId = req.query.municipality_id;
      }
      if (!municipalityId && db.municipalities.length > 0) {
        municipalityId = db.municipalities[0].id;
      }

      const { pincode } = req.params;
      const cleanPin = String(pincode || '').replace(/\D/g, '').slice(0, 6);
      if (!cleanPin || cleanPin.length !== 6) {
        return errorResponse(res, 'Valid 6-digit PIN code is required', 'INVALID_PINCODE', 400);
      }

      const removed = await db.removeMunicipalPincode(municipalityId, cleanPin);
      if (!removed) {
        return errorResponse(res, 'PIN code not found in this municipality', 'NOT_FOUND', 404);
      }

      db.addAuditLog({
        actor_id: req.user.id,
        actor_role: req.user.role,
        actor_name: req.user.name,
        entity: 'municipality_pincodes',
        entity_id: municipalityId,
        action: 'PINCODE_REMOVED',
        old_value: { pincode: cleanPin },
        new_value: null,
        reason: 'Municipal admin removed jurisdictional PIN code'
      });

      return successResponse(res, { removed: true, pincode: cleanPin }, 'PIN code removed successfully');
    } catch (err) {
      next(err);
    }
  }
};
