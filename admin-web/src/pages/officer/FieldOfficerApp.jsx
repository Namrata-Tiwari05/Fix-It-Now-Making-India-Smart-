import React, { useState, useEffect } from 'react';
import {
  ClipboardList, MapPin, Clock, Camera, CheckCircle2,
  AlertTriangle, Upload, LogOut, RefreshCw, ChevronRight,
  Phone, Check, X, ShieldAlert, ArrowLeft
} from 'lucide-react';
import { adminApi } from '../../services/api.js';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { PriorityBadge } from '../../components/PriorityBadge.jsx';
import { OperationsMapView } from '../municipal/OperationsMapView.jsx';

export const FieldOfficerApp = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks', 'map', 'profile'
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionEvidenceUrl, setResolutionEvidenceUrl] = useState('https://images.unsplash.com/photo-1590402494682-cd3fb53b1f70?w=600');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getOfficerAssignments();
      if (res.success) setTasks(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleStartWork = async (taskId) => {
    try {
      const res = await adminApi.updateOfficerStatus(taskId, 'IN_PROGRESS', 'Officer arrived on ground and commenced work.');
      if (res.success) {
        loadTasks();
        if (selectedTask) {
          setSelectedTask(prev => ({ ...prev, status: 'IN_PROGRESS' }));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmitResolution = async () => {
    if (!resolutionNotes.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await adminApi.submitOfficerResolution(
        selectedTask.id,
        resolutionNotes.trim(),
        [resolutionEvidenceUrl]
      );
      if (res.success) {
        setShowResolutionModal(false);
        setResolutionNotes('');
        setSelectedTask(null);
        loadTasks();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // KPIs
  const assignedCount = tasks.filter(t => t.status === 'ASSIGNED').length;
  const inProgressCount = tasks.filter(t => t.status === 'IN_PROGRESS').length;
  const resolutionSubmittedCount = tasks.filter(t => t.status === 'RESOLUTION_SUBMITTED').length;
  const completedCount = tasks.filter(t => ['VERIFICATION', 'RESOLVED', 'CLOSED'].includes(t.status)).length;
  const overdueCount = tasks.filter(t => t.sla_breached).length;

  const filteredTasks = tasks.filter(t => {
    if (filterStatus === 'ASSIGNED') return t.status === 'ASSIGNED';
    if (filterStatus === 'IN_PROGRESS') return t.status === 'IN_PROGRESS';
    if (filterStatus === 'COMPLETED') return ['RESOLUTION_SUBMITTED', 'VERIFICATION', 'RESOLVED', 'CLOSED'].includes(t.status);
    return true;
  });

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0B0F12',
        color: '#F8FAFC',
        maxWidth: '560px',
        margin: '0 auto',
        position: 'relative',
        paddingBottom: '5.5rem'
      }}
    >
      {/* Mobile App Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          backgroundColor: 'rgba(11, 15, 18, 0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: '#D4FF00',
              color: '#0B0F12',
              fontWeight: 900,
              fontSize: '1.2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            F
          </div>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#F8FAFC' }}>
              {user?.name || 'Field Officer'}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#D4FF00', fontWeight: 600 }}>
              {user?.municipality_name || 'Gorakhpur Municipal Squad'} • On Duty
            </div>
          </div>
        </div>

        <button
          onClick={onLogout}
          title="Sign Out"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#EF4444',
            borderRadius: '10px',
            padding: '0.5rem',
            cursor: 'pointer'
          }}
        >
          <LogOut size={16} />
        </button>
      </header>

      {/* Detail Overlay View if a Task is Clicked */}
      {selectedTask ? (
        <div style={{ padding: '1.25rem' }}>
          <button
            onClick={() => setSelectedTask(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'none',
              border: 'none',
              color: '#D4FF00',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
          >
            <ArrowLeft size={16} /> Back to Assigned Work
          </button>

          <div
            style={{
              backgroundColor: '#18202A',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '1.25rem',
              marginBottom: '1.25rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#D4FF00' }}>
                {selectedTask.complaint_number}
              </span>
              <StatusBadge status={selectedTask.status} />
            </div>

            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '0.5rem' }}>
              {selectedTask.category}
            </h2>

            <p style={{ fontSize: '0.85rem', color: '#CBD5E1', lineHeight: 1.5, marginBottom: '1rem' }}>
              {selectedTask.description}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: '#12181F', borderRadius: '12px', padding: '0.85rem', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={14} color="#D4FF00" />
                <span style={{ color: '#F8FAFC', fontWeight: 600 }}>Problem PIN: {selectedTask.pincode}</span>
                <span style={{ color: '#94A3B8' }}>• {selectedTask.ward_name || 'Central Ward'}</span>
              </div>
              <div style={{ color: '#94A3B8', paddingLeft: '1.4rem' }}>
                {selectedTask.address} {selectedTask.landmark && `(Near ${selectedTask.landmark})`}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                <Clock size={14} color="#F59E0B" />
                <span style={{ color: '#F59E0B', fontWeight: 600 }}>SLA Target:</span>
                <span style={{ color: '#CBD5E1' }}>{new Date(selectedTask.due_at).toLocaleString()}</span>
              </div>
            </div>

            {/* Action Bar */}
            <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {selectedTask.status === 'ASSIGNED' && (
                <button
                  onClick={() => handleStartWork(selectedTask.id)}
                  className="btn-lime"
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    borderRadius: '12px',
                    fontSize: '0.9rem',
                    fontWeight: 700
                  }}
                >
                  Commence Work (Mark In Progress)
                </button>
              )}

              {selectedTask.status === 'IN_PROGRESS' && (
                <button
                  onClick={() => setShowResolutionModal(true)}
                  className="btn-lime"
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    borderRadius: '12px',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Camera size={18} /> Upload Proof & Submit Resolution
                </button>
              )}

              {selectedTask.status === 'RESOLUTION_SUBMITTED' && (
                <div style={{ backgroundColor: 'rgba(212, 255, 0, 0.1)', borderRadius: '12px', padding: '0.85rem', textAlign: 'center', color: '#D4FF00', fontSize: '0.82rem', fontWeight: 600 }}>
                  ✓ Resolution Submitted — Awaiting Municipal Admin Verification
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Main View */
        <div style={{ padding: '1.25rem' }}>
          {activeTab === 'tasks' && (
            <>
              {/* Today's Work Summary Cards */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#F8FAFC' }}>
                    Today's Work Orders
                  </h3>
                  <button onClick={loadTasks} style={{ background: 'none', border: 'none', color: '#D4FF00', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <RefreshCw size={13} /> Refresh
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                  <div
                    onClick={() => setFilterStatus('ALL')}
                    style={{
                      backgroundColor: filterStatus === 'ALL' ? 'rgba(212, 255, 0, 0.15)' : '#18202A',
                      border: filterStatus === 'ALL' ? '1px solid #D4FF00' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '14px',
                      padding: '0.65rem 0.5rem',
                      textAlign: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F8FAFC', display: 'block' }}>{tasks.length}</span>
                    <span style={{ fontSize: '0.65rem', color: '#94A3B8', textTransform: 'uppercase' }}>All</span>
                  </div>

                  <div
                    onClick={() => setFilterStatus('ASSIGNED')}
                    style={{
                      backgroundColor: filterStatus === 'ASSIGNED' ? 'rgba(56, 189, 248, 0.15)' : '#18202A',
                      border: filterStatus === 'ASSIGNED' ? '1px solid #38BDF8' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '14px',
                      padding: '0.65rem 0.5rem',
                      textAlign: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38BDF8', display: 'block' }}>{assignedCount}</span>
                    <span style={{ fontSize: '0.65rem', color: '#94A3B8', textTransform: 'uppercase' }}>Assigned</span>
                  </div>

                  <div
                    onClick={() => setFilterStatus('IN_PROGRESS')}
                    style={{
                      backgroundColor: filterStatus === 'IN_PROGRESS' ? 'rgba(212, 255, 0, 0.15)' : '#18202A',
                      border: filterStatus === 'IN_PROGRESS' ? '1px solid #D4FF00' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '14px',
                      padding: '0.65rem 0.5rem',
                      textAlign: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#D4FF00', display: 'block' }}>{inProgressCount}</span>
                    <span style={{ fontSize: '0.65rem', color: '#94A3B8', textTransform: 'uppercase' }}>Active</span>
                  </div>

                  <div
                    onClick={() => setFilterStatus('COMPLETED')}
                    style={{
                      backgroundColor: filterStatus === 'COMPLETED' ? 'rgba(52, 211, 153, 0.15)' : '#18202A',
                      border: filterStatus === 'COMPLETED' ? '1px solid #34D399' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '14px',
                      padding: '0.65rem 0.5rem',
                      textAlign: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34D399', display: 'block' }}>{completedCount}</span>
                    <span style={{ fontSize: '0.65rem', color: '#94A3B8', textTransform: 'uppercase' }}>Done</span>
                  </div>
                </div>
              </div>

              {/* Task Cards List */}
              {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
                  Loading assigned work orders...
                </div>
              ) : filteredTasks.length === 0 ? (
                <div style={{ backgroundColor: '#18202A', borderRadius: '18px', padding: '2.5rem', textAlign: 'center', color: '#64748B' }}>
                  No tasks matching the selected filter.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {filteredTasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTask(t)}
                      style={{
                        backgroundColor: '#18202A',
                        borderRadius: '18px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        padding: '1.1rem',
                        cursor: 'pointer',
                        transition: 'transform 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#D4FF00' }}>
                          {t.complaint_number}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <PriorityBadge priority={t.priority} />
                          <StatusBadge status={t.status} />
                        </div>
                      </div>

                      <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.35rem' }}>
                        {t.category}
                      </h4>

                      <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginBottom: '0.75rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {t.description}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748B', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.65rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <MapPin size={13} color="#D4FF00" />
                          <span style={{ color: '#CBD5E1' }}>PIN {t.pincode} • {t.ward_name || 'Central'}</span>
                        </div>
                        <span style={{ color: '#D4FF00', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                          View Details <ChevronRight size={14} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'map' && (
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '1rem' }}>
                Field Route Map
              </h3>
              <OperationsMapView onSelectComplaint={(id) => {
                const found = tasks.find(t => t.id === id);
                if (found) setSelectedTask(found);
              }} />
            </div>
          )}

          {activeTab === 'profile' && (
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '1rem' }}>
                Officer Credentials
              </h3>
              <div style={{ backgroundColor: '#18202A', borderRadius: '18px', padding: '1.25rem', border: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '1rem' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#F8FAFC' }}>{user?.name}</div>
                <div style={{ fontSize: '0.82rem', color: '#D4FF00', marginTop: '0.2rem' }}>Role: Field Officer</div>
                <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '0.2rem' }}>Email: {user?.email}</div>
                <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '0.2rem' }}>Jurisdiction: {user?.municipality_name || 'Gorakhpur'}</div>
              </div>

              <button
                onClick={onLogout}
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#EF4444',
                  borderRadius: '12px',
                  padding: '0.85rem',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer'
                }}
              >
                <LogOut size={16} /> Log Out from Officer Account
              </button>
            </div>
          )}
        </div>
      )}

      {/* Resolution Submission Modal */}
      {showResolutionModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '560px',
              backgroundColor: '#18202A',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '1.5rem',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#F8FAFC' }}>
                  Submit Resolution Evidence
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#D4FF00' }}>
                  {selectedTask?.complaint_number}
                </span>
              </div>
              <button onClick={() => setShowResolutionModal(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#CBD5E1', fontWeight: 600, marginBottom: '0.4rem' }}>
                Completion Notes & Field Actions *
              </label>
              <textarea
                rows={3}
                placeholder="Describe specific engineering repairs or actions completed on ground..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#12181F',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  padding: '0.75rem',
                  color: '#F8FAFC',
                  fontSize: '0.85rem',
                  outline: 'none',
                  resize: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#CBD5E1', fontWeight: 600, marginBottom: '0.4rem' }}>
                Resolution Proof Photo URL
              </label>
              <input
                type="text"
                value={resolutionEvidenceUrl}
                onChange={(e) => setResolutionEvidenceUrl(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#12181F',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  padding: '0.75rem',
                  color: '#CBD5E1',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
              <div style={{ marginTop: '0.75rem', borderRadius: '12px', overflow: 'hidden', height: '140px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <img
                  src={resolutionEvidenceUrl}
                  alt="Resolution Evidence Preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            </div>

            <button
              onClick={handleSubmitResolution}
              disabled={isSubmitting || !resolutionNotes.trim()}
              className="btn-lime"
              style={{
                width: '100%',
                padding: '0.85rem',
                borderRadius: '12px',
                fontSize: '0.95rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                cursor: isSubmitting || !resolutionNotes.trim() ? 'not-allowed' : 'pointer',
                opacity: isSubmitting || !resolutionNotes.trim() ? 0.6 : 1
              }}
            >
              {isSubmitting ? <RefreshCw size={18} className="animate-spin" /> : <>Submit for Municipal Verification <CheckCircle2 size={18} /></>}
            </button>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      {!selectedTask && (
        <nav
          style={{
            position: 'fixed',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: '560px',
            backgroundColor: 'rgba(18, 24, 31, 0.95)',
            backdropFilter: 'blur(16px)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-around',
            padding: '0.65rem 0',
            zIndex: 40
          }}
        >
          <button
            onClick={() => setActiveTab('tasks')}
            style={{
              background: 'none',
              border: 'none',
              color: activeTab === 'tasks' ? '#D4FF00' : '#64748B',
              fontSize: '0.75rem',
              fontWeight: activeTab === 'tasks' ? 800 : 500,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.25rem',
              cursor: 'pointer'
            }}
          >
            <ClipboardList size={18} />
            <span>My Tasks</span>
          </button>

          <button
            onClick={() => setActiveTab('map')}
            style={{
              background: 'none',
              border: 'none',
              color: activeTab === 'map' ? '#D4FF00' : '#64748B',
              fontSize: '0.75rem',
              fontWeight: activeTab === 'map' ? 800 : 500,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.25rem',
              cursor: 'pointer'
            }}
          >
            <MapPin size={18} />
            <span>Field Map</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            style={{
              background: 'none',
              border: 'none',
              color: activeTab === 'profile' ? '#D4FF00' : '#64748B',
              fontSize: '0.75rem',
              fontWeight: activeTab === 'profile' ? 800 : 500,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.25rem',
              cursor: 'pointer'
            }}
          >
            <ShieldAlert size={18} />
            <span>Profile</span>
          </button>
        </nav>
      )}
    </div>
  );
};
