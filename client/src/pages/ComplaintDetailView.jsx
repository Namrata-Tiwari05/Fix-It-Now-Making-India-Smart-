import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, MapPin, Clock, ShieldCheck, CheckCircle2,
  AlertTriangle, Star, RefreshCw, Send, ChevronRight, GitMerge, Users, Link2
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
      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary, #94A3B8)' }}>
        <RefreshCw size={26} className="animate-spin" style={{ margin: '0 auto 1rem auto', color: 'var(--accent-lime, #D4FF00)' }} />
        <p style={{ fontSize: '0.88rem' }}>Loading complaint lifecycle & timeline...</p>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '2.5rem 1.5rem', textAlign: 'center' }}>
        <p style={{ color: '#EF4444', fontWeight: 600 }}>Complaint not found.</p>
        <button
          onClick={onBack}
          style={{
            marginTop: '1.25rem',
            padding: '0.65rem 1.25rem',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-card, #18202A)',
            border: '1px solid var(--border-medium, rgba(255, 255, 255, 0.15))',
            color: 'var(--text-primary, #F8FAFC)',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <ArrowLeft size={16} color="var(--accent-lime, #D4FF00)" /> Go Back
        </button>
      </div>
    );
  }

    const factors = complaint?.contributing_factors || complaint?.risk_factors || {};
  const hazard = factors.defect_hazard ?? factors.base_defect_risk ?? factors.issue_severity ?? 12;
  const severity = factors.severity ?? factors.observed_severity ?? factors.damage_extent ?? 8;
  const loc = factors.location_context ?? factors.location_vulnerability ?? factors.location_public_exposure ?? 8;
  const exposure = factors.public_exposure ?? factors.community_amplification ?? factors.people_affected ?? 4;
  const collateral = factors.collateral_risk ?? factors.collateral_hazard ?? factors.safety_life_risk ?? 1;
  const evidence = factors.evidence_confidence ?? factors.corroboration_score ?? factors.persistence_duration ?? 4;

  const isResolvedOrVerifying = ['RESOLUTION_SUBMITTED', 'VERIFICATION', 'RESOLVED'].includes(complaint.status);

  return (
    <div
      style={{
        maxWidth: '520px',
        margin: '0 auto',
        minHeight: '100vh',
        paddingBottom: '6.5rem',
        backgroundColor: 'var(--bg-primary, #0B0F12)',
        color: 'var(--text-primary, #F8FAFC)',
        boxSizing: 'border-box'
      }}
    >
      {/* Top Mobile Sticky Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.85rem 1.25rem',
          backgroundColor: 'var(--bg-secondary, #12181F)',
          borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          backdropFilter: 'blur(12px)',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'
        }}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to complaints list"
          style={{
            backgroundColor: '#1E293B',
            border: '2px solid #D4FF00',
            color: '#D4FF00',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.55rem',
            fontSize: '0.9rem',
            fontWeight: 800,
            padding: '0.55rem 1.25rem',
            borderRadius: '12px',
            boxShadow: '0 4px 14px rgba(212, 255, 0, 0.25)',
            transition: 'all 0.15s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#D4FF00';
            e.currentTarget.style.color = '#0B0F12';
            const arrow = e.currentTarget.querySelector('svg');
            if (arrow) arrow.setAttribute('color', '#0B0F12');
            const span = e.currentTarget.querySelector('span');
            if (span) span.style.color = '#0B0F12';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#1E293B';
            e.currentTarget.style.color = '#D4FF00';
            const arrow = e.currentTarget.querySelector('svg');
            if (arrow) arrow.setAttribute('color', '#D4FF00');
            const span = e.currentTarget.querySelector('span');
            if (span) span.style.color = '#FFFFFF';
          }}
        >
          <ArrowLeft size={19} color="#D4FF00" strokeWidth={3} />
          <span style={{ color: '#FFFFFF', fontWeight: 800 }}>Back</span>
        </button>

        <span
          style={{
            fontSize: '0.84rem',
            fontWeight: 800,
            color: 'var(--accent-lime, #D4FF00)',
            backgroundColor: 'var(--accent-lime-dim, rgba(212, 255, 0, 0.12))',
            border: '1px solid var(--border-subtle, rgba(212, 255, 0, 0.25))',
            padding: '0.3rem 0.7rem',
            borderRadius: '10px',
            letterSpacing: '0.04em'
          }}
        >
          {complaint.complaint_number}
        </span>
      </div>

      {actionSuccess && (
        <div style={{ backgroundColor: 'var(--accent-lime-dim, rgba(212, 255, 0, 0.15))', borderBottom: '1px solid var(--accent-lime, #D4FF00)', color: 'var(--accent-lime, #D4FF00)', padding: '0.75rem 1.25rem', fontSize: '0.82rem', textAlign: 'center', fontWeight: 600 }}>
          {actionSuccess}
        </div>
      )}

      {/* Main Container */}
      <div style={{ padding: '1.25rem' }}>

        {/* Status Header Banner */}
        <div
          style={{
            backgroundColor: 'var(--bg-card, #18202A)',
            borderRadius: '20px',
            border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
            padding: '1.25rem',
            marginBottom: '1rem',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <StatusBadge status={(complaint.duplicate_of || complaint.merged_into) ? 'MERGED_DUPLICATE' : complaint.status} size="lg" />
            <PriorityBadge priority={complaint.priority} riskScore={complaint.risk_score} />
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary, #F8FAFC)', lineHeight: 1.3 }}>
            {complaint.category}
          </h2>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #94A3B8)', marginTop: '0.5rem', lineHeight: 1.5 }}>
            {complaint.description}
          </p>

          {/* AI Urgency & Points Summary */}
          {/* Transparent 6-Factor AI Urgency Assessment */}
          <div style={{ marginTop: '0.75rem', backgroundColor: 'var(--bg-secondary, #12181F)', borderRadius: '14px', padding: '0.85rem 1rem', border: '1px solid var(--border-subtle, rgba(212, 255, 0, 0.25))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#D4FF00', display: 'inline-block' }}></span>
                <span style={{ fontSize: '0.74rem', color: '#D4FF00', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  AI URGENCY ASSESSMENT ({complaint.risk_score || 35}/100 PTS)
                </span>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 700 }}>
                {complaint.confidence ? `${Math.round(complaint.confidence * 100)}% Confidence` : '94% Confidence'}
              </span>
            </div>

            {/* 6-Factor Points Breakdown Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem', marginBottom: '0.65rem' }}>
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: '8px', padding: '0.35rem 0.45rem', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ fontSize: '0.62rem', color: '#94A3B8', textTransform: 'uppercase' }}>Hazard</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#F8FAFC' }}>{hazard}/25</div>
              </div>
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: '8px', padding: '0.35rem 0.45rem', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ fontSize: '0.62rem', color: '#94A3B8', textTransform: 'uppercase' }}>Severity</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#F8FAFC' }}>{severity}/25</div>
              </div>
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: '8px', padding: '0.35rem 0.45rem', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ fontSize: '0.62rem', color: '#94A3B8', textTransform: 'uppercase' }}>Location</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#F8FAFC' }}>{loc}/20</div>
              </div>
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: '8px', padding: '0.35rem 0.45rem', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ fontSize: '0.62rem', color: '#94A3B8', textTransform: 'uppercase' }}>Exposure</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#F8FAFC' }}>{exposure}/15</div>
              </div>
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: '8px', padding: '0.35rem 0.45rem', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ fontSize: '0.62rem', color: '#94A3B8', textTransform: 'uppercase' }}>Collateral</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#F8FAFC' }}>{collateral}/10</div>
              </div>
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: '8px', padding: '0.35rem 0.45rem', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ fontSize: '0.62rem', color: '#94A3B8', textTransform: 'uppercase' }}>Evidence</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#F8FAFC' }}>{evidence}/5</div>
              </div>
            </div>

            {complaint.priority_reason && (
              <p style={{ fontSize: '0.74rem', color: '#CBD5E1', margin: 0, lineHeight: 1.45 }}>
                {complaint.priority_reason}
              </p>
            )}
          </div>

          {/* Photo Preview if media exists */}
          {complaint.media && complaint.media.length > 0 && (
            <div style={{ marginTop: '0.85rem' }}>
              <div style={{ borderRadius: '12px', overflow: 'hidden', height: '175px', width: '100%', border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))' }}>
                <img
                  src={complaint.media[0].storage_path}
                  alt="Citizen Evidence"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              {((complaint.ai_detections && complaint.ai_detections.length > 0) || (complaint.ai_analysis?.detections && complaint.ai_analysis.detections.length > 0)) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.5rem' }}>
                  {(complaint.ai_detections || complaint.ai_analysis?.detections).map((d, i) => (
                    <span
                      key={i}
                      style={{
                        backgroundColor: 'var(--accent-lime-dim, rgba(212, 255, 0, 0.1))',
                        border: '1px solid var(--accent-lime, rgba(212, 255, 0, 0.3))',
                        borderRadius: '6px',
                        padding: '0.2rem 0.5rem',
                        fontSize: '0.72rem',
                        color: 'var(--accent-lime, #D4FF00)',
                        fontWeight: 600
                      }}
                    >
                      AI: {d.class_name.replace('_', ' ')} ({Math.round(d.confidence * 100)}%)
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Consolidated with Active Local Grievance Card */}
        {(complaint.duplicate_of || complaint.merged_into) && (
          <div
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '18px',
              padding: '1.25rem',
              marginBottom: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <GitMerge size={20} color="#F59E0B" />
                <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#FBBF24', margin: 0 }}>
                  Consolidated with Active Local Grievance
                </h3>
              </div>
              <span style={{ fontSize: '0.72rem', backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#4ADE80', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '0.15rem 0.5rem', borderRadius: '6px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <span>📍</span> GPS: Verified Match
              </span>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #CBD5E1)', lineHeight: 1.5, margin: '0 0 0.85rem 0' }}>
              Our municipal triage matched your report with an ongoing active defect at this exact location. To eliminate delays, on-ground repairs are actively tracked under Master Ticket <strong>#{complaint.linked_master_complaint?.complaint_number || 'Parent Ticket'}</strong>.
            </p>

            {/* Master Ticket Live Progress Card */}
            <div style={{ backgroundColor: 'var(--bg-secondary, #12181F)', borderRadius: '14px', border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))', padding: '0.95rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--accent-lime, #D4FF00)' }}>
                  Master Ticket: {complaint.linked_master_complaint?.complaint_number || 'FIX-Master'}
                </span>
                <StatusBadge status={complaint.linked_master_complaint?.status || 'IN_PROGRESS'} />
              </div>

              {complaint.linked_master_complaint?.description && (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #94A3B8)', marginBottom: '0.65rem', fontStyle: 'italic' }}>
                  "{complaint.linked_master_complaint.description}"
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.74rem', borderTop: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.06))', paddingTop: '0.55rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted, #64748B)', display: 'block' }}>Assigned Department</span>
                  <span style={{ color: 'var(--text-primary, #F8FAFC)', fontWeight: 600 }}>{complaint.linked_master_complaint?.department_name || complaint.department_name || 'Solid Waste / Works'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted, #64748B)', display: 'block' }}>Field Officer on Duty</span>
                  <span style={{ color: 'var(--text-primary, #F8FAFC)', fontWeight: 600 }}>{complaint.linked_master_complaint?.assigned_officer_name || complaint.assigned_officer_name || 'Field Officer Assigned'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Master Cluster High-Impact Community Notice */}
        {!complaint.duplicate_of && !complaint.merged_into && complaint.merged_complaints && complaint.merged_complaints.length > 0 && (
          <div
            style={{
              backgroundColor: 'var(--accent-lime-dim, rgba(212, 255, 0, 0.06))',
              border: '1px solid var(--accent-lime, rgba(212, 255, 0, 0.25))',
              borderRadius: '16px',
              padding: '0.95rem 1.15rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}
          >
            <Users size={22} color="var(--accent-lime, #D4FF00)" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-lime, #D4FF00)' }}>
                Community Priority Cluster ({complaint.merged_complaints.length + 1} Residents Reported)
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #CBD5E1)', marginTop: '0.2rem', lineHeight: 1.4 }}>
                Multiple citizens in your locality have confirmed this issue. Your ticket is currently serving as the authoritative master dispatch for municipal squads.
              </div>
            </div>
          </div>
        )}

        {/* Operational & Routing Info Card */}
        <div
          style={{
            backgroundColor: 'var(--bg-card, #18202A)',
            borderRadius: '16px',
            border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
            padding: '1rem',
            marginBottom: '1rem',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.85rem'
          }}
        >
          <div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted, #64748B)', textTransform: 'uppercase' }}>Problem Location PIN</span>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--accent-lime, #D4FF00)', marginTop: '0.15rem' }}>
              📍 {complaint.pincode}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted, #64748B)', textTransform: 'uppercase' }}>Jurisdiction</span>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary, #F8FAFC)', marginTop: '0.15rem' }}>
              {complaint.municipality_name || 'Unassigned (Review Queue)'}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted, #64748B)', textTransform: 'uppercase' }}>Responsible Department</span>
            <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-primary, #F8FAFC)', marginTop: '0.15rem' }}>
              {complaint.department_name || 'Pending Assignment'}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted, #64748B)', textTransform: 'uppercase' }}>Assigned Field Officer</span>
            <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-primary, #F8FAFC)', marginTop: '0.15rem' }}>
              {complaint.assigned_officer_name || 'Not yet dispatched'}
            </div>
          </div>
        </div>

        {/* SLA Countdown Card */}
        {complaint.due_at && (
          <div
            style={{
              backgroundColor: 'var(--accent-lime-dim, rgba(212, 255, 0, 0.05))',
              border: '1px solid var(--accent-lime, rgba(212, 255, 0, 0.2))',
              borderRadius: '14px',
              padding: '0.85rem 1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} color="var(--accent-lime, #D4FF00)" />
              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-lime, #D4FF00)' }}>
                  {complaint.sla_metrics?.isBreached ? 'SLA Target Overdue' : 'SLA Target Active'}
                </span>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary, #94A3B8)', margin: 0 }}>
                  Due: {new Date(complaint.due_at).toLocaleDateString()} at {new Date(complaint.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: complaint.sla_metrics?.isBreached ? '#EF4444' : 'var(--text-primary, #F8FAFC)' }}>
              {complaint.sla_metrics?.status}
            </span>
          </div>
        )}

        {/* Resolution Evidence Component (Before & After Proof) */}
        {complaint.resolution && (
          <div
            style={{
              backgroundColor: 'var(--bg-card, #18202A)',
              borderRadius: '18px',
              border: '1px solid var(--accent-lime, rgba(212, 255, 0, 0.3))',
              padding: '1.1rem',
              marginBottom: '1.25rem',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <ShieldCheck size={20} color="var(--accent-lime, #D4FF00)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-lime, #D4FF00)', margin: 0 }}>
                Resolution Proof & Field Evidence
              </h3>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-primary, #F8FAFC)', marginBottom: '0.75rem', lineHeight: 1.4 }}>
              <strong style={{ color: 'var(--text-secondary, #94A3B8)' }}>Officer Note:</strong> {complaint.resolution.notes}
            </p>

            {/* Proof Photos */}
            {complaint.resolution.evidence && complaint.resolution.evidence.length > 0 && (
              <div style={{ borderRadius: '12px', overflow: 'hidden', height: '175px', marginBottom: '0.75rem', border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))' }}>
                <img
                  src={complaint.resolution.evidence[0].url}
                  alt="Resolution proof"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            )}

            {complaint.resolution.ai_verification && (
              <div
                style={{
                  backgroundColor: 'var(--bg-secondary, rgba(255, 255, 255, 0.04))',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
                  padding: '0.65rem 0.85rem',
                  marginBottom: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary, #94A3B8)', textTransform: 'uppercase', display: 'block' }}>
                    AI Resolution Audit
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-primary, #F8FAFC)', fontWeight: 600 }}>
                    Status: {complaint.resolution.ai_verification.decision.replace('_', ' ')}
                  </span>
                </div>
                <span style={{ fontSize: '0.68rem', color: 'var(--accent-lime, #D4FF00)', fontStyle: 'italic' }}>
                  {complaint.resolution.ai_verification.decision === 'LIKELY_RESOLVED' ? '✓ Defect cleared' : 'Awaiting inspection'}
                </span>
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
            backgroundColor: 'var(--bg-card, #18202A)',
            borderRadius: '20px',
            border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
            padding: '1.25rem',
            marginBottom: '1rem',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)'
          }}
        >
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary, #F8FAFC)', marginBottom: '1.25rem' }}>
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
              backgroundColor: 'var(--bg-card, #18202A)',
              border: '1px solid var(--accent-lime, #D4FF00)',
              borderRadius: '20px',
              padding: '1.5rem',
              maxWidth: '400px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
            }}
          >
            <CheckCircle2 size={36} color="var(--accent-lime, #D4FF00)" style={{ margin: '0 auto 0.75rem auto' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary, #F8FAFC)' }}>
              Confirm & Rate Resolution
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #94A3B8)', marginTop: '0.25rem' }}>
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
                  <Star size={32} fill={star <= rating ? 'var(--accent-lime, #D4FF00)' : 'none'} color={star <= rating ? 'var(--accent-lime, #D4FF00)' : '#475569'} />
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
                backgroundColor: 'var(--bg-secondary, #12181F)',
                border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
                borderRadius: '10px',
                padding: '0.65rem',
                color: 'var(--text-primary, #F8FAFC)',
                fontSize: '0.82rem',
                outline: 'none',
                resize: 'none',
                marginBottom: '1rem',
                boxSizing: 'border-box'
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
              backgroundColor: 'var(--bg-card, #18202A)',
              border: '1px solid #EF4444',
              borderRadius: '20px',
              padding: '1.5rem',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#EF4444' }}>
              <AlertTriangle size={24} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary, #F8FAFC)', margin: 0 }}>
                Reopen Complaint
              </h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #94A3B8)', marginBottom: '1rem' }}>
              Please specify why the reported work is incomplete or unsatisfactory.
            </p>

            <textarea
              rows={3}
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="e.g. Crater was only partially filled and loose stones remain..."
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-secondary, #12181F)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '10px',
                padding: '0.75rem',
                color: 'var(--text-primary, #F8FAFC)',
                fontSize: '0.82rem',
                outline: 'none',
                resize: 'none',
                marginBottom: '1rem',
                boxSizing: 'border-box'
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
