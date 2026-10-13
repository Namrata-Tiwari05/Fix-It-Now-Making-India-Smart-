import React, { useState, useEffect } from 'react';
import { Building2, Users, CheckCircle2, Clock, Plus, X, RefreshCw } from 'lucide-react';
import { adminApi } from '../../services/api.js';

export const DepartmentsView = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [categoriesInput, setCategoriesInput] = useState('');
  const [slaHours, setSlaHours] = useState('48');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDepts();
  }, []);

  const loadDepts = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getDepartments();
      if (res.success) setDepartments(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setError('Department name and code are required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const mappings = categoriesInput
        .split(',')
        .map(c => c.trim())
        .filter(Boolean);

      const res = await adminApi.createDepartment({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        category_mappings: mappings.length > 0 ? mappings : ['General Civic Service'],
        sla_hours_default: parseInt(slaHours, 10) || 48
      });

      if (res.success) {
        setShowModal(false);
        setName('');
        setCode('');
        setCategoriesInput('');
        setSlaHours('48');
        loadDepts();
      } else {
        setError(res.error?.message || 'Failed to create department.');
      }
    } catch (err) {
      setError(err.message || 'Error creating department.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#F8FAFC' }}>
            Municipal Departments
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '0.2rem' }}>
            Configured departments, category mappings, and SLA benchmarks for your Municipal Corporation.
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
          <Plus size={16} /> Add Department
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
          Loading municipal departments...
        </div>
      ) : departments.length === 0 ? (
        <div style={{ backgroundColor: '#18202A', borderRadius: '18px', padding: '3rem', textAlign: 'center', color: '#64748B' }}>
          No departments configured yet. Click "Add Department" to establish divisions.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
          {departments.map((d) => (
            <div
              key={d.id}
              style={{
                backgroundColor: '#18202A',
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#D4FF00', letterSpacing: '0.04em' }}>
                    CODE: {d.code}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Clock size={13} color="#D4FF00" />
                    SLA: {d.sla_hours_default || 48}h
                  </span>
                </div>

                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.5rem' }}>
                  {d.name}
                </h3>

                <div style={{ marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748B', display: 'block', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                    Handled Categories
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {(d.category_mappings || []).map((cat, idx) => (
                      <span
                        key={idx}
                        style={{
                          backgroundColor: '#12181F',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '6px',
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.72rem',
                          color: '#CBD5E1'
                        }}
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ paddingTop: '0.85rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94A3B8' }}>
                <span>Status: <strong style={{ color: '#34D399' }}>Operational</strong></span>
                <span>Assigned Squad Active</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Department Modal */}
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
              maxWidth: '480px',
              backgroundColor: '#18202A',
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '1.75rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={20} color="#D4FF00" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#F8FAFC' }}>
                  Add Municipal Department
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

            <form onSubmit={handleCreateDepartment}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#CBD5E1', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Department Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Health & Vector Control"
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
                    Department Code *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HEALTH"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
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
                    Mapped Grievance Categories (Comma Separated)
                  </label>
                  <input
                    type="text"
                    placeholder="Stagnant Water, Mosquito Breeding, Fogging"
                    value={categoriesInput}
                    onChange={(e) => setCategoriesInput(e.target.value)}
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
                    Default Resolution SLA (Hours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="336"
                    value={slaHours}
                    onChange={(e) => setSlaHours(e.target.value)}
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
                  disabled={submitting || !name.trim() || !code.trim()}
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
                  {submitting ? <RefreshCw size={16} className="animate-spin" /> : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
