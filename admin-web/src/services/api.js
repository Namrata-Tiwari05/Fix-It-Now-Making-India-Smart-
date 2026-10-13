const API_BASE = 'http://localhost:5000/api';

export const adminApi = {
  TOKEN_KEY: 'fixitnow_staff_token',
  USER_KEY: 'fixitnow_staff_user',

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  getUser() {
    try {
      const raw = localStorage.getItem(this.USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  setSession(token, user) {
    if (token) localStorage.setItem(this.TOKEN_KEY, token);
    if (user) localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  },

  getHeaders() {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },

  // --- Shared Staff Login (Master Admin, Municipal Admin, Field Officer) ---
  async staffLogin(email, password) {
    const res = await fetch(`${API_BASE}/auth/staff/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return res.json();
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: this.getHeaders()
    });
    return res.json();
  },

  // --- Municipal Overview KPIs & Analytics ---
  async getMunicipalOverview(municipalityId = null) {
    const isUuid = municipalityId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(municipalityId);
    const url = isUuid
      ? `${API_BASE}/municipal/overview?municipality_id=${municipalityId}`
      : `${API_BASE}/municipal/overview`;
    const res = await fetch(url, { headers: this.getHeaders() });
    return res.json();
  },

  // --- Municipal Complaints Queue with filters ---
  async getMunicipalComplaints(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== 'ALL') params.append('status', filters.status);
    if (filters.category && filters.category !== 'ALL') params.append('category', filters.category);
    if (filters.priority && filters.priority !== 'ALL') params.append('priority', filters.priority);
    if (filters.ward_id && filters.ward_id !== 'ALL') params.append('ward_id', filters.ward_id);
    if (filters.search) params.append('search', filters.search);

    const res = await fetch(`${API_BASE}/municipal/complaints?${params.toString()}`, {
      headers: this.getHeaders()
    });
    return res.json();
  },

  // --- Get Complaint Details ---
  async getComplaintDetails(id) {
    const res = await fetch(`${API_BASE}/complaints/${id}`, {
      headers: this.getHeaders()
    });
    return res.json();
  },

  // --- Assign department and officer ---
  async assignComplaint(id, data) {
    const res = await fetch(`${API_BASE}/municipal/complaints/${id}/assign`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // --- Update complaint status ---
  async updateComplaintStatus(id, status, reason) {
    const res = await fetch(`${API_BASE}/municipal/complaints/${id}/status`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ status, reason })
    });
    return res.json();
  },

  // --- Administrative AI Override with reason ---
  async overrideAI(id, data) {
    const res = await fetch(`${API_BASE}/municipal/complaints/${id}/ai-override`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // --- Duplicate decision (link or separate) ---
  async linkDuplicate(id, data) {
    const res = await fetch(`${API_BASE}/municipal/complaints/${id}/link-duplicate`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // --- Admin verifies resolution submitted by officer ---
  async verifyResolution(id, approved, notes) {
    const res = await fetch(`${API_BASE}/municipal/complaints/${id}/verify-resolution`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ approved, notes })
    });
    return res.json();
  },

  // --- Departments ---
  async getDepartments() {
    const res = await fetch(`${API_BASE}/municipal/departments`, {
      headers: this.getHeaders()
    });
    return res.json();
  },

  async createDepartment(data) {
    const res = await fetch(`${API_BASE}/municipal/departments`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // --- Officers ---
  async getOfficers() {
    const res = await fetch(`${API_BASE}/municipal/officers`, {
      headers: this.getHeaders()
    });
    return res.json();
  },

  async createOfficer(data) {
    const res = await fetch(`${API_BASE}/municipal/officers`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // --- Field Officer APIs ---
  async getOfficerAssignments() {
    const res = await fetch(`${API_BASE}/officer/assignments`, {
      headers: this.getHeaders()
    });
    return res.json();
  },

  async updateOfficerStatus(id, status, notes) {
    const res = await fetch(`${API_BASE}/officer/complaints/${id}/status`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ status, notes })
    });
    return res.json();
  },

  async submitOfficerResolution(id, notes, evidence = []) {
    const res = await fetch(`${API_BASE}/officer/complaints/${id}/resolution`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ notes, evidence })
    });
    return res.json();
  },

  // --- Master Admin APIs ---
  async getMasterOverview() {
    const res = await fetch(`${API_BASE}/master/overview`, {
      headers: this.getHeaders()
    });
    return res.json();
  },

  async getMasterMunicipalities() {
    const res = await fetch(`${API_BASE}/master/municipalities`, {
      headers: this.getHeaders()
    });
    return res.json();
  },

  async createMunicipality(data) {
    const res = await fetch(`${API_BASE}/master/municipalities`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async getMasterPincodes(municipalityId = null) {
    const url = municipalityId ? `${API_BASE}/master/pincodes?municipality_id=${municipalityId}` : `${API_BASE}/master/pincodes`;
    const res = await fetch(url, { headers: this.getHeaders() });
    return res.json();
  },

  async addPincodes(municipalityId, pincodes) {
    const res = await fetch(`${API_BASE}/master/municipalities/${municipalityId}/pincodes`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ pincodes })
    });
    return res.json();
  },

  async getRoutingQueue() {
    const res = await fetch(`${API_BASE}/master/routing-queue`, {
      headers: this.getHeaders()
    });
    return res.json();
  },

  async assignMunicipalityToUnmapped(id, data) {
    const res = await fetch(`${API_BASE}/master/routing-queue/${id}/assign-municipality`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async getAuditLogs(entityId = null) {
    const url = entityId ? `${API_BASE}/master/audit-logs?entity_id=${entityId}` : `${API_BASE}/master/audit-logs`;
    const res = await fetch(url, { headers: this.getHeaders() });
    return res.json();
  },

  async getAiGovernance() {
    const res = await fetch(`${API_BASE}/master/ai-governance`, {
      headers: this.getHeaders()
    });
    return res.json();
  },

  async getNotifications() {
    const res = await fetch(`${API_BASE}/notifications`, {
      headers: this.getHeaders()
    });
    return res.json();
  },

  async markNotificationsRead() {
    const res = await fetch(`${API_BASE}/notifications/mark-read`, {
      method: 'POST',
      headers: this.getHeaders()
    });
    return res.json();
  },

  async getMunicipalAnalytics() {
    const res = await fetch(`${API_BASE}/municipal/analytics`, {
      headers: this.getHeaders()
    });
    return res.json();
  },

  async getMunicipalSettings() {
    const res = await fetch(`${API_BASE}/municipal/settings`, {
      headers: this.getHeaders()
    });
    return res.json();
  },

  async updateMunicipalSettings(settings) {
    const res = await fetch(`${API_BASE}/municipal/settings`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(settings)
    });
    return res.json();
  }
};
