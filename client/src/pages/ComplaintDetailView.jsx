import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, MapPin, Clock, ShieldCheck, CheckCircle2,
  AlertTriangle, Star, RefreshCw, Send, ChevronRight
} from 'lucide-react';
import { api } from '../services/api.js';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { PriorityBadge } from '../components/PriorityBadge.jsx';
import { Timeline } from '../components/Timeline.jsx';

export const ComplaintDetailView = ({ complaintId, onBack }) => {
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  useEffect(() => {
    fetchComplaint();
  }, [complaintId]);

  const fetchComplaint = async () => {
    setLoading(true);
    try {
      const res = await api.getComplaint(complaintId);
      if (res.success) {
        setComplaint(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmResolution = async () => {
    try {
      const res = await api.verifyResolution(complaint.id, {
        action: 'CONFIRM',
        rating,
        feedback: feedback || 'Citizen verified and approved the completed work.'
      });
      if (res.success) {
        setActionSuccess('Resolution verified! Thank you for rating.');
        setShowRateModal(false);
        fetchComplaint();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReopen = async () => {
    if (!reopenReason.trim()) return;
    try {
      const res = await api.verifyResolution(complaint.id, {
        action: 'REOPEN',
        reopen_reason: reopenReason
      });
      if (res.success) {
        setActionSuccess('Complaint reopened. Dispatched back to municipal review.');
        setShowReopenModal(false);
        fetchComplaint();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#94A3B8' }}>
        <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 1rem auto' }} />
        <p>Loading complaint lifecycle & timeline...</p>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
        <p style={{ color: '#EF4444' }}>Complaint not found.</p>
        <button onClick={onBack} className="btn-ghost" style={{ marginTop: '1rem', padding: '0.6rem 1.2rem', borderRadius: '10px' }}>
          Go Back
        </button>
      </div>
    );
  }

  const isResolvedOrVerifying = ['RESOLUTION_SUBMITTED', 'VERIFICATION', 'RESOLVED'].includes(complaint.status);

  return (
    <div style={{ paddingBottom: '6rem' }}>
      {/* Top Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.25rem',
          backgroundColor: '#0E1318',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          position: 'sticky',
          top: 0,
          zIndex: 40
        }}
      >
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: '#F8FAFC', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={18} /> Back
        </button>

        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#D4FF00', letterSpacing: '0.05em' }}>
          {complaint.complaint_number}
        </span>
      </div>

      {actionSuccess && (
        <div style={{ backgroundColor: 'rgba(212, 255, 0, 0.15)', borderBottom: '1px solid #D4FF00', color: '#D4FF00', padding: '0.75rem 1.25rem', fontSize: '0.82rem', textAlign: 'center', fontWeight: 600 }}>
          {actionSuccess}
        </div>
      )}

      {/* Main Container */}
      <div style={{ padding: '1.25rem' }}>

        {/* Status Header Banner */}
        <div
          style={{
            backgroundColor: '#18202A',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '1.25rem',
            marginBottom: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <StatusBadge status={complaint.status} size="lg" />
            <PriorityBadge priority={complaint.priority} />
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F8FAFC', lineHeight: 1.3 }}>
            {complaint.category}
          </h2>

          <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginTop: '0.5rem', lineHeight: 1.5 }}>
            {complaint.description}
          </p>

          {/* Photo Preview if media exists */}
          {complaint.media && complaint.media.length > 0 && (
            <div style={{ marginTop: '0.85rem', borderRadius: '12px', overflow: 'hidden', height: '160px', width: '100%' }}>
              <img
                src={complaint.media[0].storage_path}
                alt="Citizen Evidence"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          )}
        </div>

        {/* Operational & Routing Info Card */}
        <div
          style={{
            backgroundColor: '#18202A',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '1rem',
            marginBottom: '1rem',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.85rem'
          }}
        >
          <div>
            <span style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase' }}>Problem Location PIN</span>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#D4FF00', marginTop: '0.15rem' }}>
              📍 {complaint.pincode}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase' }}>Jurisdiction</span>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#F8FAFC', marginTop: '0.15rem' }}>
              {complaint.municipality_name || 'Unassigned (Review Queue)'}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase' }}>Responsible Department</span>
            <div style={{ fontSize: '0.82rem', fontWeight: 500, color: '#F8FAFC', marginTop: '0.15rem' }}>
              {complaint.department_name || 'Pending Assignment'}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase' }}>Assigned Field Officer</span>
            <div style={{ fontSize: '0.82rem', fontWeight: 500, color: '#F8FAFC', marginTop: '0.15rem' }}>
              {complaint.assigned_officer_name || 'Not yet dispatched'}
            </div>
          </div>
        </div>

        {/* SLA Countdown Card */}
        {complaint.due_at && (
          <div
            style={{
              backgroundColor: 'rgba(212, 255, 0, 0.05)',
              border: '1px solid rgba(212, 255, 0, 0.2)',
              borderRadius: '14px',
              padding: '0.85rem 1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} color="#D4FF00" />
              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#D4FF00' }}>
                  {complaint.sla_metrics?.isBreached ? 'SLA Target Overdue' : 'SLA Target Active'}
                </span>
                <p style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
                  Due: {new Date(complaint.due_at).toLocaleDateString()} at {new Date(complaint.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: complaint.sla_metrics?.isBreached ? '#EF4444' : '#F8FAFC' }}>
              {complaint.sla_metrics?.status}
            </span>
          </div>
        )}

        {/* Resolution Evidence Component (Before & After Proof) */}
        {complaint.resolution && (
          <div
            style={{
              backgroundColor: '#18202A',
              borderRadius: '18px',
              border: '1px solid rgba(212, 255, 0, 0.3)',
              padding: '1.1rem',
              marginBottom: '1.25rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <ShieldCheck size={20} color="#D4FF00" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#D4FF00' }}>
                Resolution Proof & Field Evidence
              </h3>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#F8FAFC', marginBottom: '0.75rem', lineHeight: 1.4 }}>
              <strong style={{ color: '#94A3B8' }}>Officer Note:</strong> {complaint.resolution.notes}
            </p>

            {/* Proof Photos */}
            {complaint.resolution.evidence && complaint.resolution.evidence.length > 0 && (
              <div style={{ borderRadius: '12px', overflow: 'hidden', height: '170px', marginBottom: '0.75rem' }}>
                <img
                  src={complaint.resolution.evidence[0].url}
                  alt="Resolution proof"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            )}

            {/* Citizen Confirmation Actions */}
            {complaint.status !== 'RESOLVED' && complaint.status !== 'CLOSED' && (
              <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowRateModal(true)}
                  className="btn-lime"
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', fontSize: '0.85rem' }}
                >
                  <CheckCircle2 size={16} /> Confirm Resolution
                </button>
                <button
                  type="button"
                  onClick={() => setShowReopenModal(true)}
                  className="btn-ghost"
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', fontSize: '0.85rem', color: '#F87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                >
                  <AlertTriangle size={16} /> Reopen Issue
                </button>
              </div>
            )}

            {complaint.citizen_confirmed && (
              <div style={{ marginTop: '0.75rem', padding: '0.65rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34D399', fontSize: '0.78rem' }}>
                <CheckCircle2 size={16} />
                <span>You confirmed this resolution with a {complaint.citizen_rating || 5}-star rating.</span>
              </div>
            )}
          </div>
        )}

        {/* Visual Lifecycle Stepper Timeline */}
        <div
          style={{
            backgroundColor: '#18202A',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '1.25rem',
            marginBottom: '1rem'
          }}
        >
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '1.25rem' }}>
            Complaint Journey & Lifecycle
          </h3>

          <Timeline
            currentStatus={complaint.status}
            auditHistory={complaint.audit_history || []}
            createdAt={complaint.created_at}
            resolution={complaint.resolution}
          />
        </div>

      </div>

      {/* Confirmation & 5-Star Rating Modal */}
      {showRateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
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
              padding: '1.5rem',
              maxWidth: '400px',
              width: '100%',
              textAlign: 'center'
            }}
          >
            <CheckCircle2 size={36} color="#D4FF00" style={{ margin: '0 auto 0.75rem auto' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F8FAFC' }}>
              Confirm & Rate Resolution
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '0.25rem' }}>
              Was the civic issue resolved to your satisfaction?
            </p>

            {/* Stars */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', margin: '1.25rem 0' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem' }}
                >
                  <Star size={32} fill={star <= rating ? '#D4FF00' : 'none'} color={star <= rating ? '#D4FF00' : '#475569'} />
                </button>
              ))}
            </div>

            <textarea
              rows={2}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Optional feedback for the municipal corporation..."
              style={{
                width: '100%',
                backgroundColor: '#12181F',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                padding: '0.65rem',
                color: '#F8FAFC',
                fontSize: '0.82rem',
                outline: 'none',
                resize: 'none',
                marginBottom: '1rem'
              }}
            />

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setShowRateModal(false)} className="btn-ghost" style={{ flex: 1, padding: '0.75rem', borderRadius: '10px' }}>
                Cancel
              </button>
              <button onClick={handleConfirmResolution} className="btn-lime" style={{ flex: 1, padding: '0.75rem', borderRadius: '10px' }}>
                Confirm & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reopen Modal */}
      {showReopenModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
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
              border: '1px solid #EF4444',
              borderRadius: '20px',
              padding: '1.5rem',
              maxWidth: '400px',
              width: '100%'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#EF4444' }}>
              <AlertTriangle size={24} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC' }}>
                Reopen Complaint
              </h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginBottom: '1rem' }}>
              Please specify why the reported work is incomplete or unsatisfactory.
            </p>

            <textarea
              rows={3}
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="e.g. Crater was only partially filled and loose stones remain..."
              style={{
                width: '100%',
                backgroundColor: '#12181F',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '10px',
                padding: '0.75rem',
                color: '#F8FAFC',
                fontSize: '0.82rem',
                outline: 'none',
                resize: 'none',
                marginBottom: '1rem'
              }}
            />

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setShowReopenModal(false)} className="btn-ghost" style={{ flex: 1, padding: '0.75rem', borderRadius: '10px' }}>
                Cancel
              </button>
              <button
                disabled={!reopenReason.trim()}
                onClick={handleReopen}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '10px',
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  border: 'none',
                  cursor: reopenReason.trim() ? 'pointer' : 'not-allowed',
                  opacity: reopenReason.trim() ? 1 : 0.5
                }}
              >
                Submit Reopen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
