import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { supabaseAdminClient } from '../../config/supabase.js';
import { normalizePhone, isSamePhone } from '../../utils/phone.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_FILE = path.resolve(__dirname, '../../../data/store.json');

// Comprehensive Persistent Civic Database Store with Local File Persistence and Supabase Sync
class DatabaseStore {
  constructor() {
    this.storageFilePath = STORAGE_FILE;
    this.municipalities = [];
    this.municipality_pincodes = [];
    this.wards = [];
    this.departments = [];
    this.officers = [];
    this.profiles = [];
    this.complaints = [];
    this.complaint_media = [];
    this.ai_analyses = [];
    this.complaint_duplicates = [];
    this.assignments = [];
    this.resolutions = [];
    this.audit_logs = [];
    this.notifications = [];
    this.counter = 0;
    this.initialized = false;
  }

  /**
   * Serialize store data to JSON object
   */
  toJSON() {
    return {
      counter: this.counter,
      municipalities: this.municipalities,
      municipality_pincodes: this.municipality_pincodes,
      wards: this.wards,
      departments: this.departments,
      officers: this.officers,
      profiles: this.profiles,
      complaints: this.complaints,
      complaint_media: this.complaint_media,
      ai_analyses: this.ai_analyses,
      complaint_duplicates: this.complaint_duplicates,
      assignments: this.assignments,
      resolutions: this.resolutions,
      audit_logs: this.audit_logs,
      notifications: this.notifications
    };
  }

  /**
   * Populate state from JSON data
   */
  loadFromJSON(data) {
    if (!data) return;
    this.counter = data.counter || 0;
    this.municipalities = data.municipalities || [];
    this.municipality_pincodes = data.municipality_pincodes || [];
    this.wards = data.wards || [];
    this.departments = data.departments || [];
    this.officers = data.officers || [];
    this.profiles = data.profiles || [];

    // Filter out dummy seed complaints so dashboard only contains real user reports
    const dummyIds = new Set(['c1111111-1111-1111-1111-111111111111', 'c2222222-2222-2222-2222-222222222222']);
    this.complaints = (data.complaints || []).filter(c => !dummyIds.has(c.id));
    this.complaint_media = (data.complaint_media || []).filter(m => !dummyIds.has(m.complaint_id));
    this.ai_analyses = (data.ai_analyses || []).filter(a => !dummyIds.has(a.complaint_id));
    this.complaint_duplicates = data.complaint_duplicates || [];
    this.assignments = (data.assignments || []).filter(asg => !dummyIds.has(asg.complaint_id));
    this.resolutions = data.resolutions || [];
    this.audit_logs = data.audit_logs || [];
    this.notifications = data.notifications || [];

    // Link media to complaints in memory
    for (const comp of this.complaints) {
      comp.media = this.complaint_media.filter(m => m.complaint_id === comp.id);
    }
  }

  /**
   * Safe persistent file write to disk
   */
  persist() {
    try {
      const dataDir = path.dirname(this.storageFilePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(this.storageFilePath, JSON.stringify(this.toJSON(), null, 2), 'utf-8');
    } catch (err) {
      console.error('[DatabaseStore] Persistence error writing to disk:', err.message);
    }
  }

  /**
   * Load real data from local persistent store and attempt Supabase sync with timeout
   */
  async init() {
    const dataDir = path.dirname(this.storageFilePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    let hasLocalData = false;
    if (fs.existsSync(this.storageFilePath)) {
      try {
        const raw = fs.readFileSync(this.storageFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.municipalities) && parsed.municipalities.length > 0) {
          this.loadFromJSON(parsed);
          hasLocalData = true;
          this.persist();
          console.log(`[DatabaseStore] Loaded local persistent store: ${this.profiles.length} Profiles, ${this.complaints.length} Complaints.`);
        }
      } catch (e) {
        console.warn('[DatabaseStore] Failed reading local store:', e.message);
      }
    }

    if (!hasLocalData) {
      this.seedInitialData();
      this.persist();
    }

    // Optional remote Supabase sync with a strict 3-second timeout
    if (supabaseAdminClient) {
      try {
        const syncPromise = (async () => {
          const [
            { data: munis },
            { data: pins },
            { data: wards },
            { data: depts },
            { data: officers },
            { data: profs },
            { data: comps },
            { data: media },
            { data: ai },
            { data: dups },
            { data: assigns },
            { data: resols },
            { data: logs },
            { data: notifs }
          ] = await Promise.all([
            supabaseAdminClient.from('municipalities').select('*'),
            supabaseAdminClient.from('municipality_pincodes').select('*'),
            supabaseAdminClient.from('wards').select('*'),
            supabaseAdminClient.from('departments').select('*'),
            supabaseAdminClient.from('officers').select('*'),
            supabaseAdminClient.from('profiles').select('*'),
            supabaseAdminClient.from('complaints').select('*').order('created_at', { ascending: false }),
            supabaseAdminClient.from('complaint_media').select('*'),
            supabaseAdminClient.from('ai_analyses').select('*'),
            supabaseAdminClient.from('complaint_duplicates').select('*'),
            supabaseAdminClient.from('assignments').select('*'),
            supabaseAdminClient.from('resolutions').select('*'),
            supabaseAdminClient.from('audit_logs').select('*').order('timestamp', { ascending: false }),
            supabaseAdminClient.from('notifications').select('*').order('created_at', { ascending: false })
          ]);

          if (munis && munis.length > 0) {
            this.municipalities = munis;
            if (pins?.length) {
              const pinMap = new Map(this.municipality_pincodes.map(p => [p.pincode, p]));
              for (const p of pins) {
                if (!pinMap.has(p.pincode)) {
                  pinMap.set(p.pincode, p);
                }
              }
              this.municipality_pincodes = Array.from(pinMap.values());
            }
            if (wards?.length) this.wards = wards;
            if (depts?.length) this.departments = depts;
            if (officers?.length) this.officers = officers;
            if (profs?.length) this.profiles = profs;
            if (comps?.length) this.complaints = comps;
            if (media?.length) this.complaint_media = media;
            if (ai?.length) this.ai_analyses = ai;
            if (dups?.length) this.complaint_duplicates = dups;
            if (assigns?.length) this.assignments = assigns;
            if (resols?.length) this.resolutions = resols;
            if (logs?.length) this.audit_logs = logs;
            if (notifs?.length) this.notifications = notifs;

            for (const comp of this.complaints) {
              comp.media = this.complaint_media.filter(m => m.complaint_id === comp.id);
            }
            this.counter = this.complaints.length;
            this.persist();
            console.log(`[DatabaseStore] Synced state with Supabase PostgreSQL: ${this.complaints.length} Complaints.`);
          }
        })();

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Supabase sync timeout after 3000ms')), 3000)
        );

        await Promise.race([syncPromise, timeoutPromise]);
      } catch (err) {
        console.warn('[DatabaseStore] Supabase remote sync skipped (using robust local persistent store):', err.message);
      }
    }

    this.initialized = true;
  }

  seedInitialData() {
    console.log('[DatabaseStore] Populating authoritative built-in seed dataset...');

    const gmcId = 'm1111111-1111-1111-1111-111111111111';
    const lmcId = 'm2222222-2222-2222-2222-222222222222';
    const vmcId = 'm3333333-3333-3333-3333-333333333333';

    this.municipalities = [
      {
        id: gmcId,
        name: 'Gorakhpur Municipal Corporation',
        code: 'GMC-UP',
        state: 'Uttar Pradesh',
        district: 'Gorakhpur',
        status: 'active',
        contact_email: 'admin.gmc@gorakhpurmc.gov.in',
        contact_phone: '+91-551-2333444',
        settings: { sla_critical_hours: 24, sla_high_hours: 48, sla_medium_days: 7, sla_low_days: 14 },
        created_at: new Date().toISOString()
      },
      {
        id: lmcId,
        name: 'Lucknow Municipal Corporation',
        code: 'LMC-UP',
        state: 'Uttar Pradesh',
        district: 'Lucknow',
        status: 'active',
        contact_email: 'admin.lmc@lucknowmc.gov.in',
        contact_phone: '+91-522-2200111',
        settings: { sla_critical_hours: 24, sla_high_hours: 48, sla_medium_days: 7, sla_low_days: 14 },
        created_at: new Date().toISOString()
      },
      {
        id: vmcId,
        name: 'Varanasi Municipal Corporation',
        code: 'VMC-UP',
        state: 'Uttar Pradesh',
        district: 'Varanasi',
        status: 'active',
        contact_email: 'admin.vmc@varanasimc.gov.in',
        contact_phone: '+91-542-2221111',
        settings: { sla_critical_hours: 24, sla_high_hours: 48, sla_medium_days: 7, sla_low_days: 14 },
        created_at: new Date().toISOString()
      }
    ];

    const ward1Id = 'w1111111-1111-1111-1111-111111111111';
    const ward2Id = 'w2222222-2222-2222-2222-222222222222';

    this.wards = [
      { id: ward1Id, municipality_id: gmcId, name: 'Ward 12 - Golghar Central', code: 'W-12', zone: 'Zone 1 - Central' },
      { id: ward2Id, municipality_id: gmcId, name: 'Ward 15 - Civil Lines', code: 'W-15', zone: 'Zone 1 - Central' }
    ];

    this.municipality_pincodes = [
      { id: 'p1111111-1111-1111-1111-111111111111', municipality_id: gmcId, pincode: '273001', ward_id: ward1Id, locality_name: 'Golghar, Gorakhpur', active: true },
      { id: 'p2222222-2222-2222-2222-222222222222', municipality_id: gmcId, pincode: '273002', ward_id: ward2Id, locality_name: 'Civil Lines, Gorakhpur', active: true },
      { id: 'p3333333-3333-3333-3333-333333333333', municipality_id: gmcId, pincode: '273013', ward_id: ward2Id, locality_name: 'BRD Medical, Gorakhpur', active: true },
      { id: 'p4444444-4444-4444-4444-444444444444', municipality_id: lmcId, pincode: '226001', ward_id: null, locality_name: 'Hazratganj, Lucknow', active: true },
      { id: 'p5555555-5555-5555-5555-555555555555', municipality_id: vmcId, pincode: '221001', ward_id: null, locality_name: 'Cantonment, Varanasi', active: true }
    ];

    const roadsDeptId = 'd1111111-1111-1111-1111-111111111111';
    const waterDeptId = 'd2222222-2222-2222-2222-222222222222';
    const swmDeptId = 'd3333333-3333-3333-3333-333333333333';

    this.departments = [
      { id: roadsDeptId, municipality_id: gmcId, name: 'Roads & Infrastructure', code: 'ROADS-01', category_mappings: ['Roads & Footpaths', 'Street Lighting', 'Roads & Potholes'], sla_hours_default: 48 },
      { id: waterDeptId, municipality_id: gmcId, name: 'Water Supply & Drainage', code: 'WATER-01', category_mappings: ['Drainage & Sewerage', 'Water Supply', 'Water & Sewage'], sla_hours_default: 24 },
      { id: swmDeptId, municipality_id: gmcId, name: 'Solid Waste Management', code: 'SWM-01', category_mappings: ['Garbage & Sanitation', 'Garbage Dump'], sla_hours_default: 12 }
    ];

    const masterAdminId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const municipalAdminId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const officerProfileId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    const citizen1Id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
    const citizen2Id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

    this.profiles = [
      {
        id: masterAdminId,
        email: 'masteradmin@fixitnow.gov',
        role: 'master_admin',
        name: 'National Command Admin',
        phone: '+919811000001',
        state: 'Uttar Pradesh',
        district: 'Lucknow',
        pincode: '226001',
        is_profile_completed: true,
        municipality_id: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: municipalAdminId,
        email: 'admin.gmc@gorakhpurmc.gov.in',
        role: 'municipal_admin',
        name: 'GMC Municipal Commissioner',
        phone: '+919811000002',
        state: 'Uttar Pradesh',
        district: 'Gorakhpur',
        pincode: '273001',
        is_profile_completed: true,
        municipality_id: gmcId,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: officerProfileId,
        email: 'officer.roads@gorakhpurmc.gov.in',
        role: 'field_officer',
        name: 'Inspector Suresh Yadav',
        phone: '+919811000003',
        state: 'Uttar Pradesh',
        district: 'Gorakhpur',
        pincode: '273001',
        is_profile_completed: true,
        municipality_id: gmcId,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: citizen1Id,
        email: 'rajesh.kumar@fixitnow.in',
        role: 'citizen',
        name: 'Rajesh Kumar',
        phone: '+919876543210',
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        state: 'Uttar Pradesh',
        district: 'Gorakhpur',
        pincode: '273001',
        is_profile_completed: true,
        municipality_id: null,
        is_active: true,
        created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 10 * 86400000).toISOString()
      },
      {
        id: citizen2Id,
        email: 'anita.sharma@fixitnow.in',
        role: 'citizen',
        name: 'Anita Sharma',
        phone: '+919876543211',
        avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        state: 'Uttar Pradesh',
        district: 'Gorakhpur',
        pincode: '273002',
        is_profile_completed: true,
        municipality_id: null,
        is_active: true,
        created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 5 * 86400000).toISOString()
      }
    ];

    const officerId = '4d98a7c1-fd90-4184-b9de-8cd021e1fb76';
    this.officers = [
      {
        id: officerId,
        municipality_id: gmcId,
        department_id: roadsDeptId,
        profile_id: officerProfileId,
        name: 'Inspector Suresh Yadav',
        department_name: 'Roads & Infrastructure',
        phone: '+919811000003',
        status: 'active',
        active_workload: 1,
        created_at: new Date().toISOString()
      }
    ];

    // Real system complaints only: start empty until user reports are submitted
    this.complaints = [];
    this.complaint_media = [];
    this.counter = 0;
    this.initialized = true;
    console.log('[DatabaseStore] Seed dataset ready: Gorakhpur, PINs, Staff & Officers initialized (zero dummy complaints).');
  }

  // --- Authoritative Jurisdiction & PIN Methods ---
  findMunicipalityByPincode(pincode) {
    const cleanPin = String(pincode || '').trim();
    if (!cleanPin) return null;

    const mapping = this.municipality_pincodes.find(p => p.pincode === cleanPin && (p.active === true || p.active === undefined));
    if (!mapping) return null;

    const municipality = this.municipalities.find(m => m.id === mapping.municipality_id && (m.status === 'active' || m.status === undefined));
    if (!municipality) return null;

    const ward = mapping.ward_id ? this.wards.find(w => w.id === mapping.ward_id) : null;

    return {
      municipality_id: municipality.id,
      municipality_name: municipality.name,
      municipality_code: municipality.code,
      state: municipality.state,
      district: municipality.district,
      ward_id: ward ? ward.id : null,
      ward_name: ward ? ward.name : null,
      locality_name: mapping.locality_name || null
    };
  }

  // --- Complaints Lifecycle Methods ---
  generateComplaintNumber() {
    this.counter += 1;
    const padded = String(this.counter).padStart(4, '0');
    return `FIX-2026-${padded}`;
  }

  async createComplaint(data) {
    const complaintId = uuidv4();
    const complaintNumber = this.generateComplaintNumber();
    const canonicalPhone = normalizePhone(data.citizen_phone);

    // Verify or find citizen_id in profiles
    let validCitizenId = data.citizen_id || null;
    if (validCitizenId) {
      const exists = this.profiles.some(p => p.id === validCitizenId);
      if (!exists) {
        const prof = this.getProfileByPhone(canonicalPhone);
        validCitizenId = prof ? prof.id : null;
      }
    } else if (canonicalPhone) {
      const prof = this.getProfileByPhone(canonicalPhone);
      validCitizenId = prof ? prof.id : null;
    }

    // If citizen profile doesn't exist yet, automatically create one so ID is never lost
    if (!validCitizenId && canonicalPhone) {
      const newProf = await this.createOrUpdateCitizenProfile({
        phone: canonicalPhone,
        name: data.citizen_name || 'Citizen',
        is_profile_completed: false
      });
      validCitizenId = newProf.id;
    }

    const complaint = {
      id: complaintId,
      complaint_number: complaintNumber,
      citizen_id: validCitizenId,
      citizen_name: data.citizen_name || 'Citizen',
      citizen_phone: canonicalPhone || data.citizen_phone || '',
      municipality_id: data.municipality_id || null,
      municipality_name: data.municipality_name || (data.is_routing_review ? 'Unassigned (Routing Review)' : null),
      pincode: String(data.pincode).trim(),
      ward_id: data.ward_id || null,
      ward_name: data.ward_name || null,
      department_id: data.department_id || null,
      department_name: data.department_name || null,
      assigned_officer_id: data.assigned_officer_id || null,
      assigned_officer_name: data.assigned_officer_name || null,
      address: data.address || '',
      landmark: data.landmark || '',
      lat: data.lat !== undefined ? data.lat : null,
      lng: data.lng !== undefined ? data.lng : null,
      category: data.category || 'General Civic Issue',
      category_confirmed_by_admin: Boolean(data.category_confirmed_by_admin),
      priority: data.priority || 'MEDIUM',
      priority_reason: data.priority_reason || 'Standard report triage.',
      status: data.status || 'SUBMITTED',
      description: data.description || '',
      is_routing_review: Boolean(data.is_routing_review),
      ai_status: data.ai_status || 'COMPLETED',
      due_at: data.due_at || new Date(Date.now() + 48 * 3600000).toISOString(),
      sla_breached: false,
      reopen_count: 0,
      citizen_rating: null,
      citizen_feedback: null,
      citizen_confirmed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // 1. Insert complaint into Supabase (best effort)
    if (supabaseAdminClient) {
      try {
        const { error } = await supabaseAdminClient.from('complaints').insert(complaint);
        if (error) console.warn('[DatabaseStore] Error inserting complaint to Supabase:', error.message);
      } catch (e) {
        // Ignored
      }
    }

    // 2. Handle Media
    const mediaItems = [];
    if (Array.isArray(data.media) && data.media.length > 0) {
      for (const m of data.media) {
        const storagePath = typeof m === 'string' ? m : m.storage_path;
        if (!storagePath) continue;

        const mediaObj = {
          id: uuidv4(),
          complaint_id: complaintId,
          type: m.type || 'image',
          storage_path: storagePath,
          caption: m.caption || null,
          is_resolution_proof: Boolean(m.is_resolution_proof),
          created_at: new Date().toISOString()
        };
        mediaItems.push(mediaObj);
        this.complaint_media.push(mediaObj);

        if (supabaseAdminClient) {
          supabaseAdminClient.from('complaint_media').insert(mediaObj).then(() => {}, () => {});
        }
      }
    }

    complaint.media = mediaItems;
    this.complaints.unshift(complaint);

    // Save to persistent file
    this.persist();

    return complaint;
  }

  getComplaintById(id) {
    return this.complaints.find(c => c.id === id || c.complaint_number === id);
  }

  listComplaints(filters = {}) {
    let result = [...this.complaints];

    // Municipality Data Isolation
    if (filters.municipality_id) {
      result = result.filter(c => c.municipality_id === filters.municipality_id);
    }

    // Citizen Isolation: match strictly by citizen_id OR by verified phone number
    if (filters.citizen_id || filters.citizen_phone) {
      const filterPhone = filters.citizen_phone ? normalizePhone(filters.citizen_phone) : null;
      result = result.filter(c => {
        const idMatch = Boolean(filters.citizen_id && c.citizen_id && c.citizen_id === filters.citizen_id);
        const phoneMatch = Boolean(filterPhone && c.citizen_phone && isSamePhone(c.citizen_phone, filterPhone));
        return idMatch || phoneMatch;
      });
    }

    // Routing Review Queue
    if (filters.routing_review !== undefined) {
      result = result.filter(c => Boolean(c.is_routing_review) === Boolean(filters.routing_review));
    }

    // Status Filter
    if (filters.status && filters.status !== 'ALL') {
      if (filters.status === 'SLA_RISK') {
        const now = Date.now();
        result = result.filter(c => {
          if (['RESOLVED', 'CLOSED', 'REJECTED'].includes(c.status)) return false;
          const dueTime = new Date(c.due_at).getTime();
          return dueTime - now < 24 * 3600000 || c.sla_breached;
        });
      } else if (filters.status === 'NEEDS_REVIEW') {
        result = result.filter(c => c.status === 'SUBMITTED' || c.status === 'UNDER_REVIEW');
      } else {
        result = result.filter(c => c.status === filters.status);
      }
    }

    // Category Filter
    if (filters.category && filters.category !== 'ALL') {
      result = result.filter(c => c.category && c.category.toLowerCase().includes(filters.category.toLowerCase()));
    }

    // Priority Filter
    if (filters.priority && filters.priority !== 'ALL') {
      result = result.filter(c => c.priority === filters.priority);
    }

    // Ward Filter
    if (filters.ward_id && filters.ward_id !== 'ALL') {
      result = result.filter(c => c.ward_id === filters.ward_id);
    }

    // Search Query
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(c =>
        (c.complaint_number && c.complaint_number.toLowerCase().includes(q)) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        (c.category && c.category.toLowerCase().includes(q)) ||
        (c.pincode && c.pincode.includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q))
      );
    }

    // Sort by created_at DESC
    result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return result;
  }

  async updateComplaint(id, updates) {
    const idx = this.complaints.findIndex(c => c.id === id || c.complaint_number === id);
    if (idx === -1) return null;

    const updated = {
      ...this.complaints[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    this.complaints[idx] = updated;

    this.persist();

    if (supabaseAdminClient) {
      try {
        const payload = { ...updates, updated_at: updated.updated_at };
        delete payload.media;
        delete payload.sla_metrics;
        supabaseAdminClient.from('complaints').update(payload).eq('id', updated.id).then(() => {}, () => {});
      } catch (err) {
        // Ignored
      }
    }

    return updated;
  }

  // --- Audit Logging ---
  async addAuditLog(entry) {
    let validActorId = entry.actor_id || null;
    if (validActorId) {
      const exists = this.profiles.some(p => p.id === validActorId);
      if (!exists) validActorId = null;
    }

    const log = {
      id: uuidv4(),
      actor_id: validActorId,
      actor_role: entry.actor_role || 'master_admin',
      actor_name: entry.actor_name || 'System',
      entity: entry.entity || 'complaint',
      entity_id: String(entry.entity_id || ''),
      action: entry.action,
      old_value: entry.old_value ? JSON.stringify(entry.old_value) : null,
      new_value: entry.new_value ? JSON.stringify(entry.new_value) : null,
      reason: entry.reason || null,
      timestamp: new Date().toISOString()
    };

    this.audit_logs.unshift(log);
    this.persist();

    if (supabaseAdminClient) {
      try {
        supabaseAdminClient.from('audit_logs').insert(log).then(() => {}, () => {});
      } catch (err) {
        // Ignored
      }
    }

    return log;
  }

  getAuditLogs(entityId = null) {
    if (entityId) {
      return this.audit_logs.filter(l => l.entity_id === entityId);
    }
    return this.audit_logs;
  }

  // --- Notifications ---
  async addNotification(notif) {
    let validUserId = notif.user_id || null;
    if (validUserId) {
      const exists = this.profiles.some(p => p.id === validUserId);
      if (!exists) validUserId = null;
    }

    if (!validUserId) {
      const adminProf = this.profiles.find(p => p.role === 'master_admin' || p.role === 'municipal_admin');
      if (adminProf) validUserId = adminProf.id;
    }

    const item = {
      id: uuidv4(),
      user_id: validUserId,
      role: notif.role || 'citizen',
      title: notif.title,
      message: notif.message,
      type: notif.type || 'INFO',
      complaint_id: notif.complaint_id || null,
      is_read: false,
      created_at: new Date().toISOString()
    };

    this.notifications.unshift(item);
    this.persist();

    if (supabaseAdminClient && validUserId) {
      try {
        supabaseAdminClient.from('notifications').insert(item).then(() => {}, () => {});
      } catch (err) {
        // Ignored
      }
    }

    return item;
  }

  getNotifications(userId = null, role = null) {
    let list = [...this.notifications];
    if (userId) list = list.filter(n => n.user_id === userId);
    if (role) list = list.filter(n => n.role === role);
    return list;
  }

  // --- Municipal Overview Stats ---
  getMunicipalOverview(municipalityId) {
    const complaints = this.complaints.filter(c => c.municipality_id === municipalityId);
    const now = Date.now();

    const total = complaints.length;
    const newUnderReview = complaints.filter(c => ['SUBMITTED', 'UNDER_REVIEW'].includes(c.status)).length;
    const inProgress = complaints.filter(c => ['ASSIGNED', 'IN_PROGRESS', 'RESOLUTION_SUBMITTED', 'VERIFICATION'].includes(c.status)).length;
    const resolved = complaints.filter(c => ['RESOLVED', 'CLOSED'].includes(c.status)).length;
    const slaRisk = complaints.filter(c => {
      if (['RESOLVED', 'CLOSED', 'REJECTED'].includes(c.status)) return false;
      const dueTime = new Date(c.due_at).getTime();
      return dueTime - now < 24 * 3600000 || c.sla_breached;
    }).length;

    const statusCounts = {};
    const categoriesCount = {};
    for (const c of complaints) {
      statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
      categoriesCount[c.category] = (categoriesCount[c.category] || 0) + 1;
    }

    return {
      total,
      newUnderReview,
      inProgress,
      slaRisk,
      resolved,
      statusCounts,
      categoriesCount,
      recentComplaints: complaints.slice(0, 8)
    };
  }

  // --- Municipal Operational Analytics ---
  getMunicipalAnalytics(municipalityId) {
    const complaints = this.complaints.filter(c => c.municipality_id === municipalityId);
    const total = complaints.length;

    if (total === 0) {
      return {
        totalComplaints: 0,
        avgResolutionHours: 0,
        slaAdherencePercent: 100,
        avgCitizenRating: 0,
        reopenRatePercent: 0,
        categoryBreakdown: [],
        departmentSlaBenchmarks: []
      };
    }

    const resolved = complaints.filter(c => ['RESOLVED', 'CLOSED'].includes(c.status));
    
    let totalResHours = 0;
    for (const r of resolved) {
      const created = new Date(r.created_at).getTime();
      const updated = new Date(r.updated_at).getTime();
      totalResHours += Math.max(1, (updated - created) / 3600000);
    }
    const avgResolutionHours = resolved.length > 0 
      ? parseFloat((totalResHours / resolved.length).toFixed(1)) 
      : 0;

    const nonBreached = complaints.filter(c => !c.sla_breached).length;
    const slaAdherencePercent = parseFloat(((nonBreached / total) * 100).toFixed(1));

    const rated = complaints.filter(c => c.citizen_rating && c.citizen_rating > 0);
    const sumRatings = rated.reduce((acc, curr) => acc + curr.citizen_rating, 0);
    const avgCitizenRating = rated.length > 0 ? parseFloat((sumRatings / rated.length).toFixed(1)) : 0;

    const reopened = complaints.filter(c => c.reopen_count > 0).length;
    const reopenRatePercent = parseFloat(((reopened / total) * 100).toFixed(1));

    const catMap = {};
    for (const c of complaints) {
      const cat = c.category || 'General';
      catMap[cat] = (catMap[cat] || 0) + 1;
    }
    const categoryBreakdown = Object.entries(catMap).map(([cat, count]) => ({
      category: cat,
      count,
      percentage: parseFloat(((count / total) * 100).toFixed(1))
    })).sort((a, b) => b.count - a.count);

    const muniDepts = this.departments.filter(d => d.municipality_id === municipalityId);
    const departmentSlaBenchmarks = muniDepts.map(d => {
      const dComps = complaints.filter(c => c.department_id === d.id);
      const dTotal = dComps.length;
      const dCompliant = dComps.filter(c => !c.sla_breached).length;
      const adherence = dTotal > 0 ? parseFloat(((dCompliant / dTotal) * 100).toFixed(1)) : 100;
      return {
        department_id: d.id,
        department_name: d.name,
        code: d.code,
        total_assigned: dTotal,
        adherence_percent: adherence,
        sla_hours_default: d.sla_hours_default || 48
      };
    });

    return {
      totalComplaints: total,
      resolvedCount: resolved.length,
      avgResolutionHours,
      slaAdherencePercent,
      avgCitizenRating,
      reopenRatePercent,
      categoryBreakdown,
      departmentSlaBenchmarks
    };
  }

  // --- Master Admin Overview Stats ---
  getMasterOverview() {
    const totalComplaints = this.complaints.length;
    const unmappedRoutingQueue = this.complaints.filter(c => c.is_routing_review).length;
    const activeMunicipalities = this.municipalities.filter(m => m.status === 'active' || m.status === undefined).length;
    const totalPincodes = this.municipality_pincodes.filter(p => p.active === true || p.active === undefined).length;

    const breakdown = this.municipalities.map(m => {
      const mc = this.complaints.filter(c => c.municipality_id === m.id);
      const pinCount = this.municipality_pincodes.filter(p => p.municipality_id === m.id && (p.active === true || p.active === undefined)).length;
      return {
        id: m.id,
        name: m.name,
        code: m.code,
        state: m.state,
        district: m.district,
        total_pincodes: pinCount,
        total: mc.length,
        resolved: mc.filter(c => ['RESOLVED', 'CLOSED'].includes(c.status)).length,
        inProgress: mc.filter(c => ['ASSIGNED', 'IN_PROGRESS', 'RESOLUTION_SUBMITTED', 'VERIFICATION'].includes(c.status)).length,
        slaRisk: mc.filter(c => c.sla_breached).length
      };
    });

    return {
      totalComplaints,
      unmappedRoutingQueue,
      activeMunicipalities,
      totalPincodes,
      breakdown,
      unmappedComplaints: this.complaints.filter(c => c.is_routing_review)
    };
  }

  // --- Profile & Authentication Methods ---
  getProfileById(id) {
    if (!id) return null;
    return this.profiles.find(p => p.id === id);
  }

  getProfileByEmail(email) {
    if (!email) return null;
    return this.profiles.find(p => p.email && p.email.toLowerCase() === email.toLowerCase());
  }

  getProfileByPhone(phone) {
    if (!phone) return null;
    const canonical = normalizePhone(phone);
    if (!canonical) return null;
    return this.profiles.find(p => {
      if (!p.phone) return false;
      return isSamePhone(p.phone, canonical);
    });
  }

  async createOrUpdateCitizenProfile({ phone, name, avatar_url, state, district, pincode, is_profile_completed, aadhaar_masked, aadhaar_hash }) {
    const canonicalPhone = normalizePhone(phone);
    let profile = this.getProfileByPhone(canonicalPhone);
    const completedFlag = is_profile_completed !== undefined
      ? Boolean(is_profile_completed)
      : Boolean(name && name !== 'Citizen' && state && district && pincode);

    if (profile) {
      if (name && name.trim()) profile.name = name.trim();
      if (avatar_url) profile.avatar_url = avatar_url;
      if (state) profile.state = state;
      if (district) profile.district = district;
      if (pincode) profile.pincode = String(pincode).trim();
      if (canonicalPhone) profile.phone = canonicalPhone;
      profile.is_profile_completed = completedFlag;
      if (aadhaar_masked) profile.aadhaar_masked = aadhaar_masked;
      if (aadhaar_hash) profile.aadhaar_hash = aadhaar_hash;
      profile.updated_at = new Date().toISOString();
    } else {
      profile = {
        id: uuidv4(),
        email: `citizen.${Date.now()}@fixitnow.in`,
        role: 'citizen',
        name: (name || 'Citizen').trim(),
        phone: canonicalPhone,
        avatar_url: avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        state: state || null,
        district: district || null,
        pincode: pincode ? String(pincode).trim() : null,
        is_profile_completed: completedFlag,
        aadhaar_masked: aadhaar_masked || null,
        aadhaar_hash: aadhaar_hash || null,
        municipality_id: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.profiles.push(profile);
    }

    // Link any existing complaints reported with this phone to this profile
    if (canonicalPhone) {
      for (const comp of this.complaints) {
        if (comp.citizen_phone && isSamePhone(comp.citizen_phone, canonicalPhone)) {
          if (!comp.citizen_id || comp.citizen_id !== profile.id) {
            comp.citizen_id = profile.id;
            if (profile.name && profile.name !== 'Citizen' && profile.name !== 'Unregistered Citizen') {
              comp.citizen_name = profile.name;
            }
          }
        }
      }
    }

    this.persist();

    if (supabaseAdminClient) {
      try {
        const payload = {
          id: profile.id,
          email: profile.email,
          role: profile.role,
          name: profile.name,
          phone: profile.phone,
          avatar_url: profile.avatar_url,
          state: profile.state,
          district: profile.district,
          pincode: profile.pincode,
          is_profile_completed: profile.is_profile_completed,
          is_active: true
        };
        supabaseAdminClient.from('profiles').upsert(payload).then(() => {}, () => {});
      } catch (e) {
        // Ignored
      }
    }

    return profile;
  }

  async createMunicipalAdminUser({ name, email, password, municipality_id }) {
    let authId = uuidv4();
    if (supabaseAdminClient) {
      try {
        const { data, error } = await supabaseAdminClient.auth.admin.createUser({
          email,
          password: password || 'FixItNow@2026!',
          email_confirm: true,
          user_metadata: { role: 'municipal_admin', name, municipality_id }
        });
        if (!error && data?.user) {
          authId = data.user.id;
        }
      } catch (e) {
        console.warn('[DatabaseStore] Supabase Admin Auth Create Warning:', e.message);
      }
    }

    const profile = {
      id: authId,
      email,
      role: 'municipal_admin',
      name: name || 'Municipal Administrator',
      phone: null,
      aadhaar_masked: null,
      avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      municipality_id,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.profiles.push(profile);
    this.persist();

    if (supabaseAdminClient) {
      try {
        supabaseAdminClient.from('profiles').upsert(profile).then(() => {}, () => {});
      } catch (e) {
        // Ignored
      }
    }

    return profile;
  }

  async createFieldOfficerUser({ name, email, phone, department_id, municipality_id, password }) {
    let authId = uuidv4();
    if (supabaseAdminClient) {
      try {
        const { data, error } = await supabaseAdminClient.auth.admin.createUser({
          email,
          password: password || 'FixItNow@2026!',
          email_confirm: true,
          user_metadata: { role: 'field_officer', name, municipality_id, department_id }
        });
        if (!error && data?.user) {
          authId = data.user.id;
        }
      } catch (e) {
        console.warn('[DatabaseStore] Supabase Officer Auth Create Warning:', e.message);
      }
    }

    const canonicalPhone = phone ? normalizePhone(phone) : null;
    const profile = {
      id: authId,
      email,
      role: 'field_officer',
      name,
      phone: canonicalPhone,
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      municipality_id,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.profiles.push(profile);

    const dept = this.departments.find(d => d.id === department_id);

    const officer = {
      id: uuidv4(),
      municipality_id,
      department_id,
      profile_id: authId,
      name,
      department_name: dept ? dept.name : 'Municipal Squad',
      phone: canonicalPhone,
      status: 'active',
      active_workload: 0,
      created_at: new Date().toISOString()
    };
    this.officers.push(officer);
    this.persist();

    if (supabaseAdminClient) {
      try {
        supabaseAdminClient.from('profiles').upsert(profile).then(() => {}, () => {});
        supabaseAdminClient.from('officers').insert({
          id: officer.id,
          municipality_id: officer.municipality_id,
          department_id: officer.department_id,
          profile_id: officer.profile_id,
          name: officer.name,
          phone: officer.phone,
          status: officer.status,
          active_workload: 0
        }).then(() => {}, () => {});
      } catch (e) {
        // Ignored
      }
    }

    return { profile, officer };
  }

  async createDepartment(data) {
    const dept = {
      id: uuidv4(),
      municipality_id: data.municipality_id,
      name: data.name,
      code: (data.code || data.name.substring(0, 5)).toUpperCase(),
      category_mappings: data.category_mappings || [],
      sla_hours_default: parseInt(data.sla_hours_default, 10) || 48,
      created_at: new Date().toISOString()
    };

    this.departments.push(dept);
    this.persist();

    if (supabaseAdminClient) {
      try {
        supabaseAdminClient.from('departments').insert(dept).then(() => {}, () => {});
      } catch (e) {
        // Ignored
      }
    }

    return dept;
  }

  async addMunicipalPincode(municipalityId, pincode, localityName = null, wardId = null) {
    const cleanPin = String(pincode || '').replace(/\D/g, '').slice(0, 6);
    if (!cleanPin || cleanPin.length !== 6) {
      throw new Error('Valid 6-digit PIN code is required');
    }

    const muni = this.municipalities.find(m => m.id === municipalityId);
    if (!muni) throw new Error('Municipality not found');

    let existing = this.municipality_pincodes.find(p => p.pincode === cleanPin);
    if (existing) {
      existing.municipality_id = municipalityId;
      existing.active = true;
      if (wardId) existing.ward_id = wardId;
      if (localityName) existing.locality_name = localityName;
    } else {
      existing = {
        id: uuidv4(),
        municipality_id: municipalityId,
        pincode: cleanPin,
        ward_id: wardId || null,
        locality_name: localityName || `${muni.name} Jurisdiction`,
        active: true,
        created_at: new Date().toISOString()
      };
      this.municipality_pincodes.push(existing);
    }

    this.persist();

    if (supabaseAdminClient) {
      try {
        await supabaseAdminClient.from('municipality_pincodes').upsert(existing);
      } catch (e) {
        // Ignored
      }
    }

    return existing;
  }

  async removeMunicipalPincode(municipalityId, pincode) {
    const cleanPin = String(pincode || '').replace(/\D/g, '').slice(0, 6);
    const index = this.municipality_pincodes.findIndex(p => p.municipality_id === municipalityId && p.pincode === cleanPin);
    if (index !== -1) {
      const removed = this.municipality_pincodes.splice(index, 1)[0];
      this.persist();

      if (supabaseAdminClient) {
        try {
          await supabaseAdminClient.from('municipality_pincodes').delete().eq('id', removed.id);
        } catch (e) {}
      }
      return true;
    }
    return false;
  }

  async updateSettings(municipalityId, settings) {
    const muni = this.municipalities.find(m => m.id === municipalityId);
    if (!muni) return null;

    if (settings.contact_email !== undefined) muni.contact_email = settings.contact_email;
    if (settings.contact_phone !== undefined) muni.contact_phone = settings.contact_phone;
    if (settings.sla_critical_hours || settings.sla_high_hours || settings.sla_medium_days || settings.sla_low_days || settings.default_sla_hours || settings.emergency_helpline) {
      muni.settings = {
        ...(muni.settings || {}),
        ...settings
      };
    }

    if (Array.isArray(settings.pincodes)) {
      for (const pin of settings.pincodes) {
        const cleanPin = String(typeof pin === 'string' ? pin : pin.pincode || '').replace(/\D/g, '').slice(0, 6);
        if (cleanPin.length === 6) {
          const exists = this.municipality_pincodes.find(p => p.pincode === cleanPin);
          if (exists) {
            exists.municipality_id = municipalityId;
            exists.active = true;
          } else {
            this.municipality_pincodes.push({
              id: uuidv4(),
              municipality_id: municipalityId,
              pincode: cleanPin,
              ward_id: null,
              locality_name: `${muni.name} Jurisdiction`,
              active: true,
              created_at: new Date().toISOString()
            });
          }
        }
      }
    }

    muni.updated_at = new Date().toISOString();
    this.persist();

    if (supabaseAdminClient) {
      try {
        supabaseAdminClient.from('municipalities').update({
          contact_email: muni.contact_email,
          contact_phone: muni.contact_phone,
          settings: muni.settings,
          updated_at: muni.updated_at
        }).eq('id', municipalityId).then(() => {}, () => {});
      } catch (e) {
        // Ignored
      }
    }

    return muni;
  }
}

export const db = new DatabaseStore();
