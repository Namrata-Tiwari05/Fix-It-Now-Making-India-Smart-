import { v4 as uuidv4 } from 'uuid';
import { supabaseAdminClient } from '../../config/supabase.js';

// Comprehensive Supabase-backed civic database store
class DatabaseStore {
  constructor() {
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
   * Load real data from Supabase tables on startup
   */
  async init() {
    if (!supabaseAdminClient) {
      console.warn('[DatabaseStore] Supabase admin client not configured. Running in memory.');
      return;
    }

    try {
      console.log('[DatabaseStore] Synchronizing state with Supabase PostgreSQL...');

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

      this.municipalities = munis || [];
      this.municipality_pincodes = pins || [];
      this.wards = wards || [];
      this.departments = depts || [];
      this.officers = officers || [];
      this.profiles = profs || [];
      this.complaints = comps || [];
      this.complaint_media = media || [];
      this.ai_analyses = ai || [];
      this.complaint_duplicates = dups || [];
      this.assignments = assigns || [];
      this.resolutions = resols || [];
      this.audit_logs = logs || [];
      this.notifications = notifs || [];

      // Link media to complaints in memory
      for (const comp of this.complaints) {
        comp.media = this.complaint_media.filter(m => m.complaint_id === comp.id);
      }

      if (this.municipalities.length === 0) {
        this.seedInitialData();
      }

      this.counter = this.complaints.length;
      this.initialized = true;

      console.log(`[DatabaseStore] Synced: ${this.municipalities.length} Municipalities, ${this.municipality_pincodes.length} PINs, ${this.complaints.length} Complaints, ${this.profiles.length} Profiles.`);
    } catch (err) {
      console.error('[DatabaseStore] Initialization error from Supabase:', err.message);
      if (this.municipalities.length === 0) {
        this.seedInitialData();
      }
    }
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
      { id: roadsDeptId, municipality_id: gmcId, name: 'Roads & Infrastructure', code: 'ROADS-01', category_mappings: ['Roads & Footpaths', 'Street Lighting'], sla_hours_default: 48 },
      { id: waterDeptId, municipality_id: gmcId, name: 'Water Supply & Drainage', code: 'WATER-01', category_mappings: ['Drainage & Sewerage', 'Water Supply'], sla_hours_default: 24 },
      { id: swmDeptId, municipality_id: gmcId, name: 'Solid Waste Management', code: 'SWM-01', category_mappings: ['Garbage & Sanitation'], sla_hours_default: 12 }
    ];

    const masterAdminId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const municipalAdminId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const officerProfileId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

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
        is_active: true
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
        is_active: true
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
        is_active: true
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
        active_workload: 1
      }
    ];

    this.complaints = [
      {
        id: 'c1111111-1111-1111-1111-111111111111',
        complaint_number: 'FIX-2026-0001',
        citizen_id: null,
        citizen_name: 'Rajesh Kumar',
        citizen_phone: '+919876543210',
        municipality_id: gmcId,
        municipality_name: 'Gorakhpur Municipal Corporation',
        pincode: '273001',
        ward_id: ward1Id,
        ward_name: 'Ward 12 - Golghar Central',
        department_id: roadsDeptId,
        department_name: 'Roads & Infrastructure',
        assigned_officer_id: officerId,
        assigned_officer_name: 'Inspector Suresh Yadav',
        address: 'Golghar Main Market, near City Mall',
        landmark: 'Opposite City Mall',
        category: 'Roads & Footpaths',
        category_confirmed_by_admin: true,
        priority: 'HIGH',
        priority_reason: 'Major commercial market thoroughfare with deep pothole hazard.',
        status: 'IN_PROGRESS',
        description: 'Large crater near Golghar crossing causing heavy traffic congestion and motorcycle skid accidents.',
        is_routing_review: false,
        ai_status: 'COMPLETED',
        due_at: new Date(Date.now() + 36 * 3600000).toISOString(),
        sla_breached: false,
        reopen_count: 0,
        citizen_rating: null,
        citizen_feedback: null,
        citizen_confirmed: false,
        media: [
          {
            id: 'm-photo-1',
            complaint_id: 'c1111111-1111-1111-1111-111111111111',
            type: 'image',
            storage_path: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600',
            caption: 'Pothole on Golghar Main Rd'
          }
        ],
        created_at: new Date(Date.now() - 6 * 3600000).toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'c2222222-2222-2222-2222-222222222222',
        complaint_number: 'FIX-2026-0002',
        citizen_id: null,
        citizen_name: 'Anita Sharma',
        citizen_phone: '+919876543211',
        municipality_id: gmcId,
        municipality_name: 'Gorakhpur Municipal Corporation',
        pincode: '273002',
        ward_id: ward2Id,
        ward_name: 'Ward 15 - Civil Lines',
        department_id: waterDeptId,
        department_name: 'Water Supply & Drainage',
        assigned_officer_id: null,
        assigned_officer_name: null,
        address: 'Park Road, Civil Lines',
        landmark: 'Near Head Post Office',
        category: 'Drainage & Sewerage',
        category_confirmed_by_admin: false,
        priority: 'CRITICAL',
        priority_reason: 'Overflowing storm drain blocking access road and posing health hazard.',
        status: 'SUBMITTED',
        description: 'Severe sewage line blockage causing contaminated water to overflow onto Park Road.',
        is_routing_review: false,
        ai_status: 'COMPLETED',
        due_at: new Date(Date.now() + 20 * 3600000).toISOString(),
        sla_breached: false,
        reopen_count: 0,
        citizen_rating: null,
        citizen_feedback: null,
        citizen_confirmed: false,
        media: [],
        created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    this.counter = this.complaints.length;
    this.initialized = true;
    console.log('[DatabaseStore] Seed dataset ready: Gorakhpur, PINs, Staff, Officers & Complaints initialized.');
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

    // Verify if citizen_id actually exists in profiles to satisfy FK constraint
    let validCitizenId = data.citizen_id || null;
    if (validCitizenId) {
      const exists = this.profiles.some(p => p.id === validCitizenId);
      if (!exists) validCitizenId = null;
    }

    const complaint = {
      id: complaintId,
      complaint_number: complaintNumber,
      citizen_id: validCitizenId,
      citizen_name: data.citizen_name || 'Citizen',
      citizen_phone: data.citizen_phone || '',
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

    // 1. Insert complaint into Supabase
    if (supabaseAdminClient) {
      try {
        const { error } = await supabaseAdminClient.from('complaints').insert(complaint);
        if (error) console.error('[DatabaseStore] Error inserting complaint to Supabase:', error);
      } catch (e) {
        console.error('[DatabaseStore] Supabase insert exception for complaint:', e.message);
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
          supabaseAdminClient.from('complaint_media').insert(mediaObj).then(() => {}, (err) => {
            console.warn('[DatabaseStore] Media insert warning:', err);
          });
        }
      }
    }

    complaint.media = mediaItems;
    this.complaints.unshift(complaint);

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

    // Citizen Isolation
    if (filters.citizen_id) {
      result = result.filter(c => c.citizen_id === filters.citizen_id);
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

    if (supabaseAdminClient) {
      try {
        const payload = { ...updates, updated_at: updated.updated_at };
        delete payload.media;
        delete payload.sla_metrics;
        await supabaseAdminClient.from('complaints').update(payload).eq('id', updated.id);
      } catch (err) {
        console.error('[DatabaseStore] Supabase update complaint error:', err);
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

    if (supabaseAdminClient) {
      try {
        await supabaseAdminClient.from('audit_logs').insert(log);
      } catch (err) {
        console.warn('[DatabaseStore] Audit log insert warning:', err);
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

    // In DB, notifications user_id is NOT NULL REFERENCES profiles(id)
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

    if (supabaseAdminClient && validUserId) {
      try {
        await supabaseAdminClient.from('notifications').insert(item);
      } catch (err) {
        console.warn('[DatabaseStore] Notification insert warning:', err);
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

    // Status distribution
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

  // --- Municipal Operational Analytics (100% Real Calculated Metrics) ---
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

    // Resolved complaints
    const resolved = complaints.filter(c => ['RESOLVED', 'CLOSED'].includes(c.status));
    
    // Average resolution time (hours)
    let totalResHours = 0;
    for (const r of resolved) {
      const created = new Date(r.created_at).getTime();
      const updated = new Date(r.updated_at).getTime();
      totalResHours += Math.max(1, (updated - created) / 3600000);
    }
    const avgResolutionHours = resolved.length > 0 
      ? parseFloat((totalResHours / resolved.length).toFixed(1)) 
      : 0;

    // SLA Adherence
    const nonBreached = complaints.filter(c => !c.sla_breached).length;
    const slaAdherencePercent = parseFloat(((nonBreached / total) * 100).toFixed(1));

    // Citizen Ratings
    const rated = complaints.filter(c => c.citizen_rating && c.citizen_rating > 0);
    const sumRatings = rated.reduce((acc, curr) => acc + curr.citizen_rating, 0);
    const avgCitizenRating = rated.length > 0 ? parseFloat((sumRatings / rated.length).toFixed(1)) : 0;

    // Reopen Rate
    const reopened = complaints.filter(c => c.reopen_count > 0).length;
    const reopenRatePercent = parseFloat(((reopened / total) * 100).toFixed(1));

    // Category Breakdown
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

    // Department Benchmarks
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

    // Breakdown per municipality
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
    return this.profiles.find(p => p.id === id);
  }

  getProfileByEmail(email) {
    if (!email) return null;
    return this.profiles.find(p => p.email && p.email.toLowerCase() === email.toLowerCase());
  }

  getProfileByPhone(phone) {
    if (!phone) return null;
    const clean = String(phone).replace(/[^\d+]/g, '');
    return this.profiles.find(p => {
      if (!p.phone) return false;
      const pClean = String(p.phone).replace(/[^\d+]/g, '');
      return pClean === clean || pClean.endsWith(clean) || clean.endsWith(pClean);
    });
  }

  async createOrUpdateCitizenProfile({ phone, name, avatar_url, state, district, pincode, is_profile_completed, aadhaar_masked, aadhaar_hash }) {
    let profile = this.getProfileByPhone(phone);
    const completedFlag = is_profile_completed !== undefined
      ? Boolean(is_profile_completed)
      : Boolean(name && state && district && pincode);

    if (profile) {
      if (name) profile.name = name.trim();
      if (avatar_url) profile.avatar_url = avatar_url;
      if (state) profile.state = state;
      if (district) profile.district = district;
      if (pincode) profile.pincode = String(pincode).trim();
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
        phone,
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
        await supabaseAdminClient.from('profiles').upsert(payload);
      } catch (e) {
        console.warn('[DatabaseStore] Profile upsert warning:', e);
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

    if (supabaseAdminClient) {
      try {
        await supabaseAdminClient.from('profiles').upsert(profile);
      } catch (e) {
        console.warn('[DatabaseStore] Profile insert warning for admin:', e.message);
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

    const profile = {
      id: authId,
      email,
      role: 'field_officer',
      name,
      phone: phone || null,
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      municipality_id,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.profiles.push(profile);

    if (supabaseAdminClient) {
      try {
        await supabaseAdminClient.from('profiles').upsert(profile);
      } catch (e) {
        console.warn('[DatabaseStore] Officer profile warning:', e.message);
      }
    }

    const dept = this.departments.find(d => d.id === department_id);

    const officer = {
      id: uuidv4(),
      municipality_id,
      department_id,
      profile_id: authId,
      name,
      department_name: dept ? dept.name : 'Municipal Squad',
      phone: phone || null,
      status: 'active',
      active_workload: 0,
      created_at: new Date().toISOString()
    };
    this.officers.push(officer);

    if (supabaseAdminClient) {
      try {
        await supabaseAdminClient.from('officers').insert({
          id: officer.id,
          municipality_id: officer.municipality_id,
          department_id: officer.department_id,
          profile_id: officer.profile_id,
          name: officer.name,
          phone: officer.phone,
          status: officer.status,
          active_workload: 0
        });
      } catch (e) {
        console.warn('[DatabaseStore] Officer record insert warning:', e.message);
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

    if (supabaseAdminClient) {
      try {
        await supabaseAdminClient.from('departments').insert(dept);
      } catch (e) {
        console.warn('[DatabaseStore] Department insert warning:', e.message);
      }
    }

    return dept;
  }

  async updateSettings(municipalityId, settings) {
    const muni = this.municipalities.find(m => m.id === municipalityId);
    if (!muni) return null;

    if (settings.contact_email !== undefined) muni.contact_email = settings.contact_email;
    if (settings.contact_phone !== undefined) muni.contact_phone = settings.contact_phone;
    if (settings.sla_critical_hours || settings.sla_high_hours || settings.sla_medium_days || settings.sla_low_days) {
      muni.settings = {
        ...(muni.settings || {}),
        ...settings
      };
    }
    muni.updated_at = new Date().toISOString();

    if (supabaseAdminClient) {
      try {
        await supabaseAdminClient.from('municipalities').update({
          contact_email: muni.contact_email,
          contact_phone: muni.contact_phone,
          settings: muni.settings,
          updated_at: muni.updated_at
        }).eq('id', municipalityId);
      } catch (e) {
        console.warn('[DatabaseStore] Update settings warning:', e.message);
      }
    }

    return muni;
  }
}

export const db = new DatabaseStore();
