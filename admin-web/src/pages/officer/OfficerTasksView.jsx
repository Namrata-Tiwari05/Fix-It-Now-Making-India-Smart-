import React, { useState, useEffect } from 'react';
import {
  Wrench, CheckCircle2, Clock, MapPin, Camera, AlertTriangle,
  Upload, ChevronRight, Check, X, RefreshCw
} from 'lucide-react';
import { adminApi } from '../../services/api.js';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { PriorityBadge } from '../../components/PriorityBadge.jsx';

export const OfficerTasksView = ({ onSelectComplaint }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionEvidenceUrl, setResolutionEvidenceUrl] = useState('https://images.unsplash.com/photo-1590402494682-cd3fb53b1f70?w=600');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getOfficerAssignments('field_officer');
      if (res.success) setTasks(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleStartWork = async (id) => {
    try {
      const res = await adminApi.updateOfficerStatus(id, 'IN_PROGRESS', 'Officer arrived on ground and commenced work.', 'field_officer');
      if (res.success) loadTasks();
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
        resolutionNotes,
        [resolutionEvidenceUrl],
        'field_officer'
      );
      if (res.success) {
        setShowResolutionModal(false);
        setResolutionNotes('');
        loadTasks();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: '#D4FF00', fontWeight: 700, textTransform: 'uppercase' }}>
            Field Operations
          </span>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#F8FAFC', marginTop: '0.2rem' }}>
            Inspector Suresh Yadav's Work Queue
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
            On-ground tasks assigned to Roads & Infrastructure squad.
          </p>
        </div>

        <button onClick={loadTasks} className="btn-ghost" style={{ padding: '0.5rem 0.85rem', borderRadius: '10px', fontSize: '0.78rem' }}>
          <RefreshCw size={14} /> Refresh Tasks
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8' }}>
          Loading assigned work orders...
        </div>
      ) : tasks.length === 0 ? (
        <div style={{ backgroundColor: '#18202A', borderRadius: '16px', padding: '3rem', textAlign: 'center', color: '#64748B' }}>
          No active work orders currently assigned to you.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {tasks.map((task) => (
            <div
              key={task.id}
              style={{
                backgroundColor: '#18202A',
                borderRadius: '18px',
                border: task.status === 'IN_PROGRESS' ? '1px solid #D4FF00' : '1px solid rgba(255, 255, 255, 0.08)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#D4FF00', letterSpacing: '0.04em' }}>
                    {task.complaint_number}
                  </span>
                  <PriorityBadge priority={task.priority} />
                </div>
                <StatusBadge status={task.status} />
              </div>

              {/* Category & Description */}
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC' }}>
                  {task.category}
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#CBD5E1', marginTop: '0.35rem', lineHeight: 1.5 }}>
                  {task.description}
                </p>
              </div>

              {/* Location & PIN */}
              <div style={{ backgroundColor: '#12181F', borderRadius: '12px', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#D4FF00', fontWeight: 600 }}>
                  <MapPin size={15} />
                  <span>Problem PIN: {task.pincode} • {task.address || 'Central Ward'}</span>
                </div>
                <span style={{ color: '#94A3B8' }}>
                  Due: {task.due_at ? new Date(task.due_at).toLocaleDateString() : 'Immediate'}
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.25rem' }}>
                {task.status !== 'IN_PROGRESS' && task.status !== 'RESOLUTION_SUBMITTED' && task.status !== 'RESOLVED' && (
                  <button
                    type="button"
                    onClick={() => handleStartWork(task.id)}
                    className="btn-lime"
                    style={{ flex: 1, padding: '0.65rem', borderRadius: '10px', fontSize: '0.82rem' }}
                  >
                    <Wrench size={15} /> Mark Work In Progress
                  </button>
                )}

                {task.status === 'IN_PROGRESS' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTask(task);
                      setShowResolutionModal(true);
                    }}
                    className="btn-lime glow-pulse"
                    style={{ flex: 1, padding: '0.65rem', borderRadius: '10px', fontSize: '0.82rem' }}
                  >
                    <Camera size={15} /> Upload Resolution Evidence
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onSelectComplaint(task.id)}
                  className="btn-ghost"
                  style={{ padding: '0.65rem 1rem', borderRadius: '10px', fontSize: '0.82rem' }}
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolution Submission Modal */}
      {showResolutionModal && selectedTask && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(10px)',
            zIndex: 110,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            style={{
              backgroundColor: '#18202A',
              border: '1px solid #D4FF00',
              borderRadius: '20px',
              padding: '1.75rem',
              maxWidth: '480px',
              width: '100%'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <CheckCircle2 size={24} color="#D4FF00" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F8FAFC' }}>
                Submit Resolution Evidence
              </h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginBottom: '1rem' }}>
              Ticket: <strong style={{ color: '#D4FF00' }}>{selectedTask.complaint_number}</strong> • {selectedTask.category}
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', marginBottom: '0.35rem' }}>
                Work Execution Notes *
              </label>
              <textarea
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Describe work completed, machinery used, materials deployed..."
                style={{
                  width: '100%',
                  backgroundColor: '#12181F',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  padding: '0.75rem',
                  color: '#F8FAFC',
                  fontSize: '0.82rem',
                  outline: 'none',
                  resize: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', marginBottom: '0.35rem' }}>
                Evidence Proof Photo
              </label>
              <div style={{ borderRadius: '12px', overflow: 'hidden', height: '140px', border: '1px solid rgba(212, 255, 0, 0.3)', marginBottom: '0.5rem' }}>
                <img src={resolutionEvidenceUrl} alt="Proof" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                Simulated on-site high-resolution field camera capture.
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button onClick={() => setShowResolutionModal(false)} className="btn-ghost" style={{ flex: 1, padding: '0.75rem', borderRadius: '10px' }}>
                Cancel
              </button>
              <button
                disabled={isSubmitting || !resolutionNotes.trim()}
                onClick={handleSubmitResolution}
                className="btn-lime"
                style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', opacity: resolutionNotes.trim() ? 1 : 0.5 }}
              >
                {isSubmitting ? 'Uploading Proof...' : 'Submit Resolution'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
