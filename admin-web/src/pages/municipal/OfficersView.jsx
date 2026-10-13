import React, { useState, useEffect } from 'react';
import { Users, Shield, Phone, CheckCircle2, Plus, X, RefreshCw, Mail, Lock, Building2 } from 'lucide-react';
import { adminApi } from '../../services/api.js';

export const OfficersView = () => {
  const [officers, setOfficers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [password, setPassword] = useState('FixItNow@2026!');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [offRes, deptRes] = await Promise.all([
        adminApi.getOfficers(),
        adminApi.getDepartments()
      ]);
      if (offRes.success) setOfficers(offRes.data);
      if (deptRes.success) {
        setDepartments(deptRes.data);
        if (deptRes.data.length > 0 && !departmentId) {
          setDepartmentId(deptRes.data[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOfficer = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !departmentId) {
      setError('Name, Email, and Department are required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await adminApi.createOfficer({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        department_id: departmentId,
        password: password.trim() || 'FixItNow@2026!'
      });

      if (res.success) {
        setShowModal(false);
        setName('');
        setEmail('');
        setPhone('');
        loadData();
      } else {
        setError(res.error?.message || 'Failed to create field officer.');
      }
    } catch (err) {
      setError(err.message || 'Error creating field officer.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#F8FAFC' }}>
            Field Officers Squad
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '0.2rem' }}>
            Real-time on-ground officer roster, departmental squad assignments, and live caseloads.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="btn-lime"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.1rem',
            borderRadius: '12px',
            fontSize: '0.85rem',
            fontWeight: 700
          }}
        >
          <Plus size={16} /> Recruit Field Officer
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
          Loading field officers roster...
        </div>
      ) : officers.length === 0 ? (
        <div style={{ backgroundColor: '#18202A', borderRadius: '18px', padding: '3rem', textAlign: 'center', color: '#64748B' }}>
          No field officers currently recruited for this municipality. Click "Recruit Field Officer" to add squad personnel.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
          {officers.map((o) => (
            <div
              key={o.id}
              style={{
                backgroundColor: '#18202A',
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '2px solid #D4FF00',
                  flexShrink: 0
                }}
              >
                <img
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150"
                  alt={o.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC' }}>{o.name}</h4>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '9999px',
                      backgroundColor: o.status === 'on_duty' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(212, 255, 0, 0.15)',
                      color: o.status === 'on_duty' ? '#34D399' : '#D4FF00'
                    }}
                  >
                    {o.status === 'on_duty' ? 'On Duty' : 'Active'}
                  </span>
                </div>

                <p style={{ fontSize: '0.78rem', color: '#D4FF00', marginTop: '0.2rem' }}>
                  {o.department_name || 'Roads & Infrastructure'}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem', fontSize: '0.72rem', color: '#94A3B8' }}>
                  <Phone size={12} />
                  <span>{o.phone || '+91-9415000000'}</span>
                </div>

                <div style={{ marginTop: '0.65rem', backgroundColor: '#12181F', borderRadius: '8px', padding: '0.4rem 0.65rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                  <span style={{ color: '#64748B' }}>Active Caseload</span>
                  <span style={{ color: '#F8FAFC', fontWeight: 700 }}>{o.active_workload || 0} tasks</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recruit Field Officer Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '500px',
              backgroundColor: '#18202A',
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '1.75rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={20} color="#D4FF00" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#F8FAFC' }}>
                  Recruit Field Officer
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {error && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', padding: '0.65rem', color: '#EF4444', fontSize: '0.78rem', marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreateOfficer}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#CBD5E1', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Officer Full Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Inspector Ramesh Kumar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: '#12181F',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      padding: '0.65rem 0.85rem',
                      color: '#F8FAFC',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                    autoFocus
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#CBD5E1', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Official Email Address *
                  </label>
                  <input
                    type="email"
                    placeholder="ramesh.roads@gorakhpurmc.gov.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: '#12181F',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      padding: '0.65rem 0.85rem',
                      color: '#F8FAFC',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#CBD5E1', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Contact Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+91-9415000099"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: '#12181F',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      padding: '0.65rem 0.85rem',
                      color: '#F8FAFC',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#CBD5E1', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Assigned Department *
                  </label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: '#12181F',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      padding: '0.65rem 0.85rem',
                      color: '#F8FAFC',
                      fontSize: '0.85rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#CBD5E1', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Initial Portal Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: '#12181F',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      padding: '0.65rem 0.85rem',
                      color: '#F8FAFC',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                  <p style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.25rem' }}>
                    Officer can log in with this password on the shared Staff Portal.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-ghost"
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '12px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !name.trim() || !email.trim()}
                  className="btn-lime"
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '12px',
                    fontWeight: 700,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.6 : 1
                  }}
                >
                  {submitting ? <RefreshCw size={16} className="animate-spin" /> : 'Create Officer Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
