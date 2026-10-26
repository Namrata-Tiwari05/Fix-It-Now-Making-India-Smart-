const API_BASE = 'http://localhost:5000/api';

export const api = {
  // Session storage keys
  TOKEN_KEY: 'fixitnow_citizen_token',
  USER_KEY: 'fixitnow_citizen_user',

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

  normalizePhone(rawPhone) {
    if (!rawPhone) return '';
    const digits = String(rawPhone).replace(/\D/g, '');
    if (digits.length >= 10) {
      return `+91${digits.slice(-10)}`;
    }
    return digits ? `+91${digits}` : '';
  },

  // --- Citizen Phone OTP Authentication ---
  async sendCitizenOtp(phone) {
    const cleanPhone = this.normalizePhone(phone);
    const res = await fetch(`${API_BASE}/auth/citizen/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: cleanPhone })
    });
    return res.json();
  },

  async verifyCitizenOtp(phone, otp) {
    const cleanPhone = this.normalizePhone(phone);
    const res = await fetch(`${API_BASE}/auth/citizen/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: cleanPhone, otp })
    });
    return res.json();
  },

  async uploadAvatar(file) {
    const formData = new FormData();
    formData.append('avatar', file);
    const token = this.getToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/auth/citizen/upload-avatar`, {
      method: 'POST',
      headers,
      body: formData
    });
    return res.json();
  },

  async onboardCitizen({ phone, name, avatarUrl, state, district, pincode }) {
    const token = this.getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const cleanPhone = this.normalizePhone(phone);

    const res = await fetch(`${API_BASE}/auth/citizen/onboard`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ phone: cleanPhone, name, avatarUrl, state, district, pincode })
    });
    return res.json();
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: this.getHeaders()
    });
    if (res.status === 401) {
      this.clearSession();
    }
    return res.json();
  },

  // --- Health check ---
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },

  // --- Authoritative Problem Location PIN lookup ---
  async resolvePincode(pincode) {
    const res = await fetch(`${API_BASE}/municipalities/by-pincode/${pincode}`, {
      headers: this.getHeaders()
    });
    return res.json();
  },

  // --- Upload complaint camera evidence ---
  async uploadComplaintMedia(fileOrBlob) {
    const formData = new FormData();
    const filename = fileOrBlob.name || `evidence-${Date.now()}.jpg`;
    formData.append('media', fileOrBlob, filename);
    const token = this.getToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/complaints/upload-media`, {
      method: 'POST',
      headers,
      body: formData
    });
    return res.json();
  },

  // --- Real Reverse Geocoding from GPS Coordinates ---
  async reverseGeocode(lat, lng) {
    try {
      const res = await fetch(`${API_BASE}/location/reverse-geocode?lat=${lat}&lng=${lng}`, {
        headers: this.getHeaders()
      });
      const json = await res.json();
      if (json.success && json.data) {
        return json;
      }
    } catch (e) {
      console.warn('Backend reverse geocode failed, attempting direct fallback:', e);
    }

    // Direct browser fallback to BigDataCloud
    try {
      const bdcRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
      if (bdcRes.ok) {
        const bdc = await bdcRes.json();
        return {
          success: true,
          data: {
            pincode: bdc.postcode ? bdc.postcode.replace(/\D/g, '').slice(0, 6) : '',
            state: bdc.principalSubdivision || '',
            district: bdc.localityInfo?.administrative?.[2]?.name || bdc.city || bdc.locality || '',
            address: [bdc.locality, bdc.city].filter(Boolean).join(', '),
            landmark: '',
            lat,
            lng
          }
        };
      }
    } catch (e2) {
      console.warn('Direct reverse geocode fallback failed:', e2);
    }

    return { success: false, message: 'Reverse geocode failed' };
  },

  // --- Pre-analyze complaint draft (Conversational AI Triage) ---
  async preAnalyzeComplaint(data) {
    const res = await fetch(`${API_BASE}/complaints/pre-analyze`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // --- Create complaint ---
  async createComplaint(data) {
    const res = await fetch(`${API_BASE}/complaints`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // --- Get citizen's own complaints ---
  async getMyComplaints() {
    const res = await fetch(`${API_BASE}/complaints/citizen/my-reports`, {
      headers: this.getHeaders()
    });
    return res.json();
  },

  // --- Get single complaint details ---
  async getComplaint(id) {
    const res = await fetch(`${API_BASE}/complaints/${id}`, {
      headers: this.getHeaders()
    });
    return res.json();
  },

  // --- Citizen verify resolution (Confirm & Rate, or Reopen) ---
  async verifyResolution(id, { action, rating, feedback, reopen_reason }) {
    const res = await fetch(`${API_BASE}/complaints/${id}/verify`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ action, rating, feedback, reopen_reason })
    });
    return res.json();
  },

  // --- Get notifications ---
  async getNotifications() {
    const res = await fetch(`${API_BASE}/notifications`, {
      headers: this.getHeaders()
    });
    return res.json();
  }
};
