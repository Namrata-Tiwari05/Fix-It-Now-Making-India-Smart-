import { v4 as uuidv4 } from 'uuid';
import { db } from '../services/db/index.js';
import { supabaseAdminClient } from '../config/supabase.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const masterController = {
  /**
   * Global overview metrics for Master Government Admin
   */
  async getOverview(req, res, next) {
    try {
      const overview = db.getMasterOverview();
      return successResponse(res, overview);
    } catch (err) {
      next(err);
    }
  },

  /**
   * List all Municipal Corporations
   */
  async listMunicipalities(req, res, next) {
    try {
      const list = db.municipalities.map(m => {
        const pinCount = db.municipality_pincodes.filter(p => p.municipality_id === m.id && p.active).length;
        const complaintCount = db.complaints.filter(c => c.municipality_id === m.id).length;
        return {
          ...m,
          total_pincodes: pinCount,
          total_complaints: complaintCount
        };
      });
      return successResponse(res, list);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Create a new Municipal Corporation
   */
  async createMunicipality(req, res, next) {
    try {
      const {
        name, code, state, district, contact_email, contact_phone, pincodes = [],
        admin_name, admin_email, admin_password
      } = req.body;

      const effectiveDistrict = district || name.replace(/Municipal Corporation|Nagar Nigam|Municipality/gi, '').trim() || state;
      if (!name || !code || !state) {
        return errorResponse(res, 'Name, code, and state are required.', 'MISSING_FIELDS', 400);
      }

      const existing = db.municipalities.find(m => m.code.toLowerCase() === code.toLowerCase());
      if (existing) {
        return errorResponse(res, `Municipality with code ${code} already exists.`, 'DUPLICATE_CODE', 409);
      }

      const newMuni = {
        id: uuidv4(),
        name,
        code: code.toUpperCase(),
        state,
        district: effectiveDistrict,
        status: 'active',
        contact_email: contact_email || admin_email || '',
        contact_phone: contact_phone || '',
        settings: { sla_critical_hours: 24, sla_high_hours: 48, sla_medium_days: 7, sla_low_days: 14 },
        created_at: new Date().toISOString()
      };

      if (supabaseAdminClient) {
        try {
          await supabaseAdminClient.from('municipalities').insert(newMuni);
        } catch (mErr) {
          console.error('[MasterController] Error inserting municipality to Supabase:', mErr);
        }
      }
      db.municipalities.push(newMuni);

      // Register PIN coverage if provided (supports comma-separated string or array)
      let pinList = [];
      if (typeof pincodes === 'string') {
        pinList = pincodes.split(',').map(p => p.trim()).filter(Boolean);
      } else if (Array.isArray(pincodes)) {
        pinList = pincodes.map(p => typeof p === 'string' ? p.trim() : (p.pincode ? String(p.pincode).trim() : '')).filter(Boolean);
      }

      if (pinList.length > 0) {
        for (const pin of pinList) {
          if (pin) {
            const pinEntry = {
              id: uuidv4(),
              municipality_id: newMuni.id,
              pincode: pin,
              ward_id: null,
              locality_name: `${name} Jurisdiction`,
              active: true,
              created_at: new Date().toISOString()
            };
            db.municipality_pincodes.push(pinEntry);

            if (supabaseAdminClient) {
              try {
                await supabaseAdminClient.from('municipality_pincodes').insert(pinEntry);
              } catch (pinErr) {
                console.warn('[MasterController] Error inserting PIN to Supabase:', pinErr);
              }
            }
          }
        }
      }

      // Provision Municipal Admin user if email provided
      let createdAdmin = null;
      if (admin_email) {
        createdAdmin = await db.createMunicipalAdminUser({
          name: admin_name || `${name} Commissioner`,
          email: admin_email,
          password: admin_password || 'FixItNow@2026!',
          municipality_id: newMuni.id
        });
      }

      db.addAuditLog({
        actor_id: req.user.id,
        actor_role: req.user.role,
        actor_name: req.user.name,
        entity: 'municipality',
        entity_id: newMuni.id,
        action: 'MUNICIPALITY_CREATED',
        old_value: null,
        new_value: { ...newMuni, admin: createdAdmin ? createdAdmin.email : null },
        reason: 'Master Government Admin created Municipal Corporation'
      });

      return successResponse(res, {
        municipality: newMuni,
        admin: createdAdmin
      }, 'Municipal Corporation and Admin account created successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Update Municipal Corporation
   */
  async updateMunicipality(req, res, next) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const idx = db.municipalities.findIndex(m => m.id === id);
      if (idx === -1) return errorResponse(res, 'Municipality not found', 'NOT_FOUND', 404);

      const old = { ...db.municipalities[idx] };
      db.municipalities[idx] = {
        ...db.municipalities[idx],
        ...updates,
        updated_at: new Date().toISOString()
      };

      db.addAuditLog({
        actor_id: req.user.id,
        actor_role: req.user.role,
        actor_name: req.user.name,
        entity: 'municipality',
        entity_id: id,
        action: 'MUNICIPALITY_UPDATED',
        old_value: old,
        new_value: db.municipalities[idx],
        reason: updates.reason || 'Master Admin updated municipality details'
      });

      return successResponse(res, db.municipalities[idx], 'Municipality updated');
    } catch (err) {
      next(err);
    }
  },

  /**
   * List PIN codes with municipal mappings
   */
  async listPincodes(req, res, next) {
    try {
      const { municipality_id } = req.query;
      let list = db.municipality_pincodes;
      if (municipality_id) {
        list = list.filter(p => p.municipality_id === municipality_id);
      }

      const enriched = list.map(p => {
        const m = db.municipalities.find(m => m.id === p.municipality_id);
        const w = p.ward_id ? db.wards.find(w => w.id === p.ward_id) : null;
        return {
          ...p,
          municipality_name: m ? m.name : 'Unknown',
          ward_name: w ? w.name : 'Unassigned Ward'
        };
      });

      return successResponse(res, enriched);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Add PIN code coverage to a municipality
   */
  async addPincodes(req, res, next) {
    try {
      const { id } = req.params; // municipality_id
      const { pincodes } = req.body; // array of { pincode, ward_id, locality_name }

      if (!Array.isArray(pincodes) || pincodes.length === 0) {
        return errorResponse(res, 'Pincodes array is required', 'MISSING_FIELDS', 400);
      }

      const municipality = db.municipalities.find(m => m.id === id);
      if (!municipality) return errorResponse(res, 'Municipality not found', 'NOT_FOUND', 404);

      const added = [];
      for (const item of pincodes) {
        const pin = String(typeof item === 'string' ? item : item.pincode).trim();
        if (!pin) continue;

        // Check if exists
        const existing = db.municipality_pincodes.find(p => p.pincode === pin);
        if (existing) {
          existing.municipality_id = id;
          existing.active = true;
          if (item.ward_id) existing.ward_id = item.ward_id;
          if (item.locality_name) existing.locality_name = item.locality_name;
          added.push(existing);
          if (supabaseAdminClient) {
            supabaseAdminClient.from('municipality_pincodes').update({
              municipality_id: id,
              active: true,
              ward_id: existing.ward_id,
              locality_name: existing.locality_name
            }).eq('id', existing.id).then(() => {}, () => {});
          }
        } else {
          const entry = {
            id: uuidv4(),
            municipality_id: id,
            pincode: pin,
            ward_id: item.ward_id || null,
            locality_name: item.locality_name || null,
            active: true,
            created_at: new Date().toISOString()
          };
          db.municipality_pincodes.push(entry);
          added.push(entry);
          if (supabaseAdminClient) {
            supabaseAdminClient.from('municipality_pincodes').insert(entry).then(() => {}, () => {});
          }
        }
      }

      await db.addAuditLog({
        actor_id: req.user.id,
        actor_role: req.user.role,
        actor_name: req.user.name,
        entity: 'municipality_pincodes',
        entity_id: id,
        action: 'PINCODES_CONFIGURED',
        old_value: null,
        new_value: { count: added.length, pincodes: added.map(a => a.pincode) },
        reason: 'Master Admin configured PIN code coverage'
      });

      return successResponse(res, added, `Configured ${added.length} PIN codes`);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Routing-review queue: complaints with unmapped/invalid PINs
   */
  async getRoutingQueue(req, res, next) {
    try {
      const queue = db.complaints.filter(c => c.is_routing_review);
      return successResponse(res, queue);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Manually route an unmapped complaint to a municipality and ward
   */
  async assignMunicipalityToUnmapped(req, res, next) {
    try {
      const { id } = req.params;
      const { municipality_id, ward_id, reason } = req.body;

      const complaint = db.getComplaintById(id);
      if (!complaint) return errorResponse(res, 'Complaint not found', 'NOT_FOUND', 404);

      const municipality = db.municipalities.find(m => m.id === municipality_id);
      if (!municipality) return errorResponse(res, 'Target Municipality not found', 'NOT_FOUND', 404);

      const ward = ward_id ? db.wards.find(w => w.id === ward_id) : null;

      const updated = await db.updateComplaint(id, {
        municipality_id: municipality.id,
        municipality_name: municipality.name,
        ward_id: ward ? ward.id : null,
        ward_name: ward ? ward.name : null,
        is_routing_review: false
      });

      db.addAuditLog({
        actor_id: req.user.id,
        actor_role: req.user.role,
        actor_name: req.user.name,
        entity: 'complaint',
        entity_id: id,
        action: 'MANUAL_ROUTING_ASSIGNMENT',
        old_value: { is_routing_review: true, municipality_id: null },
        new_value: { is_routing_review: false, municipality_id: municipality.id, municipality_name: municipality.name },
        reason: reason || 'Master Admin manually resolved jurisdiction for unmapped PIN'
      });

      return successResponse(res, updated, 'Complaint successfully assigned to municipality');
    } catch (err) {
      next(err);
    }
  },

  /**
   * Audit log viewer
   */
  async getAuditLogs(req, res, next) {
    try {
      const { entity_id } = req.query;
      const logs = db.getAuditLogs(entity_id);
      return successResponse(res, logs);
    } catch (err) {
      next(err);
    }
  },

  /**
   * AI Governance inspection & override statistics
   */
  async getAiGovernance(req, res, next) {
    try {
      const totalAnalyses = db.ai_analyses.length;
      const overrides = db.audit_logs.filter(l => l.action.startsWith('AI_OVERRIDE_')).length;
      const overrideRate = totalAnalyses > 0 ? parseFloat(((overrides / totalAnalyses) * 100).toFixed(1)) : 0;

      return successResponse(res, {
        model_version: 'v1.0-civic-triage',
        total_analyses: totalAnalyses,
        human_overrides: overrides,
        override_rate_percent: overrideRate,
        confidence_threshold: 0.75,
        duplicate_threshold: 0.80,
        recent_overrides: db.audit_logs.filter(l => l.action.startsWith('AI_OVERRIDE_')).slice(0, 10)
      });
    } catch (err) {
      next(err);
    }
  }
};
