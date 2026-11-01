import React, { useState, useEffect } from 'react';
import {
  X, MapPin, Clock, ShieldAlert, Sparkles, CheckCircle2,
  AlertTriangle, Users, Building2, Calendar, FileText,
  Check, Edit3, Link2, ExternalLink, RefreshCw, GitMerge, Layers
} from 'lucide-react';
import { adminApi } from '../../services/api.js';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { PriorityBadge } from '../../components/PriorityBadge.jsx';

export const ComplaintDetailDrawer = ({
  complaintId,
  onClose,
  onUpdated,
  currentRole = 'municipal_admin'
}) => {
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);

  // Assignment states
  const [departments, setDepartments] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedOfficer, setSelectedOfficer] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // AI Override states
  const [showAiOverrideModal, setShowAiOverrideModal] = useState(false);
  const [overrideCategory, setOverrideCategory] = useState('');
  const [overridePriority, setOverridePriority] = useState('');
  const [overrideReason, setOverrideReason] = useState('');

  // Status transition states
  const [transitionStatus, setTransitionStatus] = useState('');
  const [transitionReason, setTransitionReason] = useState('');

  // Resolution verification states
  const [verificationNotes, setVerificationNotes] = useState('');

  useEffect(() => {
    if (complaintId) {
      loadDetails();
      loadResources();
    }
  }, [complaintId]);

  const loadDetails = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getComplaintDetails(complaintId, currentRole);
      if (res.success) {
        setComplaint(res.data);
        setSelectedDept(res.data.department_id || '');
        setSelectedOfficer(res.data.assigned_officer_id || '');
        setOverrideCategory(res.data.category);
        setOverridePriority(res.data.priority);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadResources = async () => {
    try {
      const [deptRes, offRes] = await Promise.all([
        adminApi.getDepartments(currentRole),
        adminApi.getOfficers(currentRole)
      ]);
      if (deptRes.success) setDepartments(deptRes.data);
      if (offRes.success) setOfficers(offRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  // 1. Assign Department & Officer
  const handleAssign = async () => {
    setIsAssigning(true);
    try {
      const res = await adminApi.assignComplaint(complaint.id, {
        department_id: selectedDept,
        officer_id: selectedOfficer,
        due_at: dueDate || undefined,
        notes: assignNotes || 'Assigned by Municipal Administrator'
      }, currentRole);

      if (res.success) {
        loadDetails();
        if (onUpdated) onUpdated();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAssigning(false);
    }
  };

  // 2. Submit AI Override with Mandatory Reason (PRD requirement)
  const handleAiOverride = async (action) => {
    if (!overrideReason.trim()) {
      alert('An administrative override reason is strictly required by civic audit policy.');
      return;
    }

    try {
      const res = await adminApi.overrideAI(complaint.id, {
        action,
        category: overrideCategory,
        priority: overridePriority,
        reason: overrideReason
      }, currentRole);

      if (res.success) {
        setShowAiOverrideModal(false);
        setOverrideReason('');
        loadDetails();
        if (onUpdated) onUpdated();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 3. Status Transition
  const handleStatusChange = async (nextStatus) => {
    try {
      const res = await adminApi.updateComplaintStatus(
        complaint.id,
        nextStatus,
        transitionReason || `Status transitioned to ${nextStatus}`,
        currentRole
      );
      if (res.success) {
        setTransitionReason('');
        loadDetails();
        if (onUpdated) onUpdated();
      }
    } catch (e) {
      alert(e.message || 'Status transition error');
    }
  };

  // 4. Duplicate Decision
  const handleDuplicateDecision = async (candidateId, decision) => {
    try {
      const res = await adminApi.linkDuplicate(complaint.id, {
        candidate_id: candidateId,
        decision,
        reason: decision === 'linked' ? 'Admin confirmed duplicate civic report' : 'Admin marked as separate incident'
      }, currentRole);
      if (res.success) {
        loadDetails();
        if (onUpdated) onUpdated();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 5. Verify Resolution
  const handleVerifyResolution = async (approved) => {
    try {
      const res = await adminApi.verifyResolution(
        complaint.id,
        approved,
        verificationNotes || (approved ? 'Resolution photos verified' : 'Requires further on-ground work'),
        currentRole
      );
      if (res.success) {
        loadDetails();
        if (onUpdated) onUpdated();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!complaintId) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 10, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 100,
        display: 'flex',
        justifyContent: 'flex-end'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '960px',
          height: '100vh',
          backgroundColor: '#0E1318',
          borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-15px 0 50px rgba(0,0,0,0.8)',
          animation: 'slideLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Drawer Topbar */}
        <div
          style={{
            padding: '1.25rem 2rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#12181F'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#D4FF00', letterSpacing: '0.04em' }}>
              {complaint?.complaint_number || 'Loading...'}
            </span>
            {complaint && <StatusBadge status={complaint.status} size="lg" />}
            {complaint && <PriorityBadge priority={complaint.priority} />}
          </div>

          <button
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#94A3B8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Body - 2 Column Layout */}
        {loading || !complaint ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
            <RefreshCw size={28} className="animate-spin" />
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.75rem 2rem', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.75rem' }}>

            {/* LEFT COLUMN: Citizen Complaint Data, Photos, Evidence, Timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {/* Citizen Original Report */}
              <div style={{ backgroundColor: '#18202A', borderRadius: '18px', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '1.25rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                  Citizen Grievance Description
                </span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC', marginTop: '0.25rem' }}>
                  {complaint.category}
                </h3>
                <p style={{ fontSize: '0.88rem', color: '#CBD5E1', marginTop: '0.5rem', lineHeight: 1.6 }}>
                  {complaint.description}
                </p>

                {/* Citizen Meta */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)', fontSize: '0.75rem', color: '#94A3B8' }}>
                  <span>Reported by: <strong style={{ color: '#F8FAFC' }}>{complaint.citizen_name || 'Citizen'}</strong></span>
                  <span>•</span>
                  <span>{new Date(complaint.created_at).toLocaleString()}</span>
                </div>

                {/* Uploaded Evidence Media */}
                {complaint.media && complaint.media.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block', marginBottom: '0.4rem' }}>
                      Citizen Uploaded Photos ({complaint.media.length})
                    </span>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      {complaint.media.map((m, idx) => (
                        <div key={idx} style={{ width: '130px', height: '90px', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
                          <img src={m.storage_path} alt="Proof" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Resolution Evidence (Before & After Proof from Field Officer) */}
              {complaint.resolution && (
                <div style={{ backgroundColor: '#18202A', borderRadius: '18px', border: '1px solid rgba(212, 255, 0, 0.3)', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <CheckCircle2 size={20} color="#D4FF00" />
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#D4FF00' }}>
                      Field Resolution Evidence
                    </h4>
                  </div>

                  <p style={{ fontSize: '0.85rem', color: '#F8FAFC', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                    <strong style={{ color: '#94A3B8' }}>Work Summary:</strong> {complaint.resolution.notes}
                  </p>

                  {/* Side-by-side Before & After Evidence Comparison */}
                  <div style={{ display: 'grid', gridTemplateColumns: (complaint.media && complaint.media.length > 0) ? '1fr 1fr' : '1fr', gap: '0.65rem', marginBottom: '0.75rem' }}>
                    {complaint.media && complaint.media.length > 0 && (
                      <div>
                        <span style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                          ORIGINAL CITIZEN DEFECT
                        </span>
                        <div style={{ borderRadius: '10px', overflow: 'hidden', height: '140px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                          <img src={complaint.media[0].storage_path || complaint.media[0].url} alt="Before" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      </div>
                    )}
                    {complaint.resolution.evidence && complaint.resolution.evidence.length > 0 && (
                      <div>
                        <span style={{ fontSize: '0.68rem', color: '#D4FF00', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                          FIELD OFFICER RESOLUTION
                        </span>
                        <div style={{ borderRadius: '10px', overflow: 'hidden', height: '140px', border: '1px solid rgba(212, 255, 0, 0.3)' }}>
                          <img src={complaint.resolution.evidence[0].url} alt="After" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Location Distance Verification Badge */}
                  <div style={{ marginBottom: '0.85rem' }}>
                    {(() => {
                      const locStatus = complaint.resolution?.ai_verification?.evidence?.location_status || 'UNVERIFIED';
                      const rawDist = complaint.resolution?.ai_verification?.evidence?.gps_distance_m;
                      const hasDist = rawDist !== null && rawDist !== undefined;
                      
                      // Distance mismatch MUST take precedence over stale or default exact match strings!
                      if (hasDist && rawDist > 100) {
                        return (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#F87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700 }}>
                            <AlertTriangle size={13} /> {Math.round(rawDist)}m from site • Location Mismatch
                          </span>
                        );
                      } else if (locStatus === 'LOCATION_MISMATCH') {
                        return (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#F87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700 }}>
                            <AlertTriangle size={13} /> Location Mismatch
                          </span>
                        );
                      } else if (locStatus === 'MATCHED_EXACT' || (hasDist && rawDist <= 45)) {
                        return (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: 'rgba(34, 197, 94, 0.12)', color: '#4ADE80', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700 }}>
                            <MapPin size={13} /> {hasDist ? `${Math.round(rawDist)}m from site • ` : ''}On-Site GPS Verified
                          </span>
                        );
                      } else if (locStatus === 'MATCHED_VICINITY' || (hasDist && rawDist <= 100)) {
                        return (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: 'rgba(34, 197, 94, 0.12)', color: '#4ADE80', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700 }}>
                            <MapPin size={13} /> {hasDist ? `${Math.round(rawDist)}m from site • ` : ''}Vicinity GPS Verified
                          </span>
                        );
                      } else if (locStatus === 'LOW_LOCATION_CONFIDENCE') {
                        return (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: 'rgba(234, 179, 8, 0.15)', color: '#FACC15', border: '1px solid rgba(234, 179, 8, 0.3)', padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700 }}>
                            <AlertTriangle size={13} /> Low Location Confidence
                          </span>
                        );
                      } else {
                        return (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: 'rgba(148, 163, 184, 0.15)', color: '#94A3B8', border: '1px solid rgba(148, 163, 184, 0.3)', padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700 }}>
                            <MapPin size={13} /> GPS: Unverified
                          </span>
                        );
                      }
                    })()}
                  </div>

                  {/* AI Before/After Repair Verification Advisory */}
                  {complaint.resolution.ai_verification && (
                    <div
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.35)',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        padding: '0.85rem',
                        marginBottom: '0.85rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          AI Resolution Audit (Advisory)
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {complaint.resolution.ai_verification.verification_score !== undefined && (
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#D4FF00', backgroundColor: 'rgba(212, 255, 0, 0.1)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                              {complaint.resolution.ai_verification.verification_score}/100 pts
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.6rem',
                              borderRadius: '6px',
                              backgroundColor:
                                (complaint.resolution.ai_verification.recommendation === 'STRONG_EVIDENCE' || complaint.resolution.ai_verification.decision === 'LIKELY_RESOLVED') ? 'rgba(16, 185, 129, 0.2)' :
                                (complaint.resolution.ai_verification.recommendation === 'REPAIR_MISMATCH' || complaint.resolution.ai_verification.decision === 'NOT_RESOLVED') ? 'rgba(239, 68, 68, 0.2)' :
                                (complaint.resolution.ai_verification.recommendation === 'PARTIAL_EVIDENCE' || complaint.resolution.ai_verification.decision === 'INCONCLUSIVE') ? 'rgba(245, 158, 11, 0.2)' :
                                'rgba(59, 130, 246, 0.2)',
                              color:
                                (complaint.resolution.ai_verification.recommendation === 'STRONG_EVIDENCE' || complaint.resolution.ai_verification.decision === 'LIKELY_RESOLVED') ? '#34D399' :
                                (complaint.resolution.ai_verification.recommendation === 'REPAIR_MISMATCH' || complaint.resolution.ai_verification.decision === 'NOT_RESOLVED') ? '#F87171' :
                                (complaint.resolution.ai_verification.recommendation === 'PARTIAL_EVIDENCE' || complaint.resolution.ai_verification.decision === 'INCONCLUSIVE') ? '#FBBF24' :
                                '#60A5FA',
                              border: '1px solid rgba(255, 255, 255, 0.15)'
                            }}
                          >
                            {(complaint.resolution.ai_verification.recommendation || complaint.resolution.ai_verification.decision || 'AUDITED').replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      {/* 5-Pillar Score Breakdown */}
                      {complaint.resolution.ai_verification.breakdown && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.6rem' }}>
                          <span style={{ fontSize: '0.66rem', backgroundColor: 'rgba(255, 255, 255, 0.06)', padding: '0.15rem 0.4rem', borderRadius: '4px', color: '#CBD5E1' }}>
                            Category: {complaint.resolution.ai_verification.breakdown.category_consistency}/25
                          </span>
                          <span style={{ fontSize: '0.66rem', backgroundColor: 'rgba(255, 255, 255, 0.06)', padding: '0.15rem 0.4rem', borderRadius: '4px', color: '#CBD5E1' }}>
                            Visual: {complaint.resolution.ai_verification.breakdown.visual_evidence}/30
                          </span>
                          <span style={{ fontSize: '0.66rem', backgroundColor: 'rgba(255, 255, 255, 0.06)', padding: '0.15rem 0.4rem', borderRadius: '4px', color: '#CBD5E1' }}>
                            Location: {complaint.resolution.ai_verification.breakdown.location_consistency}/20
                          </span>
                          <span style={{ fontSize: '0.66rem', backgroundColor: 'rgba(255, 255, 255, 0.06)', padding: '0.15rem 0.4rem', borderRadius: '4px', color: '#CBD5E1' }}>
                            Notes: {complaint.resolution.ai_verification.breakdown.description_consistency}/15
                          </span>
                          <span style={{ fontSize: '0.66rem', backgroundColor: 'rgba(255, 255, 255, 0.06)', padding: '0.15rem 0.4rem', borderRadius: '4px', color: '#CBD5E1' }}>
                            Quality: {complaint.resolution.ai_verification.breakdown.evidence_quality}/10
                          </span>
                        </div>
                      )}

                      {complaint.resolution.ai_verification.decision_reasons && (
                        <ul style={{ margin: '0 0 0.5rem 1rem', padding: 0, fontSize: '0.75rem', color: '#CBD5E1', lineHeight: 1.4 }}>
                          {complaint.resolution.ai_verification.decision_reasons.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      )}

                      <p style={{ margin: 0, fontSize: '0.68rem', color: '#64748B', fontStyle: 'italic' }}>
                        Notice: AI assessment is strictly advisory. Human municipal approval is mandatory for closure.
                      </p>
                    </div>
                  )}

                  {/* Verification Actions for Municipal Admin */}
                  {complaint.status === 'RESOLUTION_SUBMITTED' && (
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <span style={{ fontSize: '0.72rem', color: '#94A3B8', display: 'block', marginBottom: '0.4rem' }}>
                        Admin Quality Inspection
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => handleVerifyResolution(true)}
                            className="btn-lime"
                            style={{ flex: 1, padding: '0.65rem', borderRadius: '10px', fontSize: '0.82rem' }}
                          >
                            <Check size={16} /> Approve Resolution Proof
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVerifyResolution(false)}
                            className="btn-ghost"
                            style={{ flex: 1, padding: '0.65rem', borderRadius: '10px', fontSize: '0.82rem', color: '#F87171' }}
                          >
                            <X size={16} /> Reject (Send Back)
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleVerifyResolution(false, 'Formal re-inspection requested by municipal authority.')}
                          style={{
                            width: '100%',
                            padding: '0.55rem',
                            borderRadius: '10px',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            backgroundColor: 'rgba(245, 158, 11, 0.1)',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            color: '#FBBF24',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.4rem'
                          }}
                        >
                          <span>🔍</span> Request Re-Inspection on Ground
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Complete Auditable History */}
              <div style={{ backgroundColor: '#18202A', borderRadius: '18px', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '1.25rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '1rem' }}>
                  Auditable Change Log
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {(complaint.audit_history || []).map((log, idx) => (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: '#12181F',
                        borderRadius: '10px',
                        padding: '0.75rem',
                        border: '1px solid rgba(255, 255, 255, 0.06)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#D4FF00' }}>
                          {log.action}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '0.2rem' }}>
                        {log.reason || 'State transition logged.'}
                      </p>
                      <span style={{ fontSize: '0.68rem', color: '#64748B', display: 'block', marginTop: '0.2rem' }}>
                        Actor: {log.actor_name || 'System Engine'} ({log.actor_role})
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Jurisdiction, AI Insights & Overrides, Duplicate Candidates, Assignment */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {/* Authoritative Problem Location PIN Card */}
              <div style={{ backgroundColor: '#18202A', borderRadius: '18px', border: '1px solid rgba(212, 255, 0, 0.25)', padding: '1.25rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                  Authoritative Jurisdiction
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
                  <MapPin size={22} color="#D4FF00" />
                  <div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#D4FF00' }}>
                      PIN Code: {complaint.pincode}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#F8FAFC', fontWeight: 600 }}>
                      {complaint.municipality_name}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#94A3B8', lineHeight: 1.4 }}>
                  <div><strong>Address:</strong> {complaint.address || 'Central ward corridor'}</div>
                  {complaint.ward_name && <div><strong>Ward:</strong> {complaint.ward_name}</div>}
                  {complaint.lat && <div><strong>GPS:</strong> {complaint.lat.toFixed(4)}, {complaint.lng.toFixed(4)}</div>}
                </div>
              </div>

              {/* AI Insights Panel (PRD Section 7 & 18) */}
              <div style={{ backgroundColor: '#18202A', borderRadius: '18px', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Sparkles size={16} color="#D4FF00" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC' }}>
                      AI Recommendations
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAiOverrideModal(true)}
                    style={{
                      background: 'none',
                      border: '1px solid rgba(212, 255, 0, 0.3)',
                      color: '#D4FF00',
                      padding: '0.25rem 0.55rem',
                      borderRadius: '8px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <Edit3 size={13} /> Override AI
                  </button>
                </div>

                {/* Safety Override Alert Banner */}
                {(complaint.safety_override_triggered || complaint.ai_analysis?.safety_override) && (
                  <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid #EF4444', borderRadius: '10px', padding: '0.65rem 0.85rem', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <ShieldAlert size={18} color="#EF4444" style={{ flexShrink: 0 }} />
                    <div>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#FCA5A5', display: 'block' }}>
                        CRITICAL SAFETY OVERRIDE TRIGGERED
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#CBD5E1' }}>
                        {(complaint.safety_override_triggered || complaint.ai_analysis?.safety_override || '').replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                )}

                {/* Category & Priority Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                  <div style={{ backgroundColor: '#12181F', padding: '0.75rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <span style={{ fontSize: '0.65rem', color: '#64748B', display: 'block', fontWeight: 700, textTransform: 'uppercase' }}>PREDICTED CATEGORY</span>
                    <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#F8FAFC', display: 'block', margin: '0.15rem 0' }}>{complaint.category}</span>
                    <span style={{ fontSize: '0.7rem', color: '#D4FF00', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      ● {complaint.confidence ? `${Math.round(complaint.confidence * 100)}% Confidence` : (complaint.ai_analysis?.confidence ? `${Math.round(complaint.ai_analysis.confidence * 100)}% Confidence` : '94% Confidence')}
                    </span>
                  </div>

                  <div style={{ backgroundColor: '#12181F', padding: '0.75rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <span style={{ fontSize: '0.65rem', color: '#64748B', display: 'block', fontWeight: 700, textTransform: 'uppercase' }}>RECOMMENDED PRIORITY</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', margin: '0.15rem 0' }}>
                      <PriorityBadge priority={complaint.priority} />
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: (complaint.priority === 'CRITICAL' ? '#EF4444' : complaint.priority === 'HIGH' ? '#F59E0B' : complaint.priority === 'MEDIUM' ? '#60A5FA' : '#94A3B8') }}>
                        {complaint.risk_score || complaint.ai_analysis?.risk_score || 68} / 100 Pts
                      </span>
                    </div>
                    <span style={{ fontSize: '0.68rem', color: '#94A3B8', display: 'block' }}>
                      SLA: {complaint.recommended_sla_hours || (complaint.priority === 'CRITICAL' ? 24 : complaint.priority === 'HIGH' ? 48 : 168)}h Target
                    </span>
                  </div>
                </div>

                {/* Quantitative Risk Score Gauge Bar */}
                <div style={{ backgroundColor: '#12181F', borderRadius: '12px', padding: '0.75rem', marginBottom: '0.85rem', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#CBD5E1' }}>
                      Composite Urgency Risk Score
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: (complaint.priority === 'CRITICAL' ? '#EF4444' : complaint.priority === 'HIGH' ? '#F59E0B' : '#60A5FA') }}>
                      {complaint.risk_score || complaint.ai_analysis?.risk_score || 68} / 100
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(100, complaint.risk_score || complaint.ai_analysis?.risk_score || 68)}%`,
                        height: '100%',
                        backgroundColor: (complaint.priority === 'CRITICAL' ? '#EF4444' : complaint.priority === 'HIGH' ? '#F59E0B' : '#60A5FA'),
                        borderRadius: '9999px',
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>
                </div>

                {/* 6-Factor Multi-Factor Urgency Scoring Breakdown Grid (Total = 100) */}
                <div style={{ marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                    <span style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      6-Factor Urgency & Priority Breakdown (Max 100)
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#D4FF00', fontWeight: 800 }}>
                      Score: {complaint.risk_score || complaint.ai_analysis?.risk_score || 0} / 100
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.45rem' }}>
                    {/* Factor 1: Defect Hazard */}
                    <div style={{ backgroundColor: '#12181F', padding: '0.45rem 0.6rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.62rem', color: '#64748B' }}>1. Defect Hazard</span>
                        <span style={{ fontSize: '0.58rem', color: '#64748B' }}>/25</span>
                      </div>
                      <strong style={{ fontSize: '0.78rem', color: '#F8FAFC', display: 'block', margin: '0.1rem 0' }}>
                        {complaint.risk_factors?.defect_hazard ?? complaint.risk_factors?.base_defect_risk ?? complaint.ai_analysis?.risk_factors?.defect_hazard ?? complaint.ai_analysis?.risk_factors?.base_defect_risk ?? 14} pts
                      </strong>
                      <span style={{ fontSize: '0.58rem', color: '#94A3B8', display: 'block', lineHeight: 1.1 }}>Natural danger level</span>
                    </div>

                    {/* Factor 2: Severity */}
                    <div style={{ backgroundColor: '#12181F', padding: '0.45rem 0.6rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.62rem', color: '#64748B' }}>2. Severity</span>
                        <span style={{ fontSize: '0.58rem', color: '#64748B' }}>/25</span>
                      </div>
                      <strong style={{ fontSize: '0.78rem', color: '#F8FAFC', display: 'block', margin: '0.1rem 0' }}>
                        {complaint.risk_factors?.severity ?? complaint.risk_factors?.observed_severity ?? complaint.ai_analysis?.risk_factors?.severity ?? complaint.ai_analysis?.risk_factors?.observed_severity ?? 7} pts
                      </strong>
                      <span style={{ fontSize: '0.58rem', color: '#94A3B8', display: 'block', lineHeight: 1.1 }}>Physical condition</span>
                    </div>

                    {/* Factor 3: Location Context */}
                    <div style={{ backgroundColor: '#12181F', padding: '0.45rem 0.6rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.62rem', color: '#64748B' }}>3. Location Context</span>
                        <span style={{ fontSize: '0.58rem', color: '#64748B' }}>/20</span>
                      </div>
                      <strong style={{ fontSize: '0.78rem', color: '#F8FAFC', display: 'block', margin: '0.1rem 0' }}>
                        {complaint.risk_factors?.location_context ?? complaint.risk_factors?.location_vulnerability ?? complaint.ai_analysis?.risk_factors?.location_context ?? complaint.ai_analysis?.risk_factors?.location_vulnerability ?? 6} pts
                      </strong>
                      <span style={{ fontSize: '0.58rem', color: '#94A3B8', display: 'block', lineHeight: 1.1 }}>Zone sensitivity</span>
                    </div>

                    {/* Factor 4: Public Exposure */}
                    <div style={{ backgroundColor: '#12181F', padding: '0.45rem 0.6rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.62rem', color: '#64748B' }}>4. Public Exposure</span>
                        <span style={{ fontSize: '0.58rem', color: '#64748B' }}>/15</span>
                      </div>
                      <strong style={{ fontSize: '0.78rem', color: (complaint.risk_factors?.public_exposure ?? complaint.risk_factors?.community_amplification ?? 0) > 2 ? '#D4FF00' : '#F8FAFC', display: 'block', margin: '0.1rem 0' }}>
                        {complaint.risk_factors?.public_exposure ?? complaint.risk_factors?.community_amplification ?? complaint.ai_analysis?.risk_factors?.public_exposure ?? (complaint.merged_count > 1 ? (complaint.merged_count >= 4 ? 15 : complaint.merged_count >= 2 ? 10 : 6) : 2)} pts
                      </strong>
                      <span style={{ fontSize: '0.58rem', color: '#94A3B8', display: 'block', lineHeight: 1.1 }}>Affected citizens count</span>
                    </div>

                    {/* Factor 5: Collateral Risk */}
                    <div style={{ backgroundColor: '#12181F', padding: '0.45rem 0.6rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.62rem', color: '#64748B' }}>5. Collateral Risk</span>
                        <span style={{ fontSize: '0.58rem', color: '#64748B' }}>/10</span>
                      </div>
                      <strong style={{ fontSize: '0.78rem', color: (complaint.risk_factors?.collateral_risk ?? complaint.risk_factors?.collateral_hazard ?? 0) > 0 ? '#F59E0B' : '#F8FAFC', display: 'block', margin: '0.1rem 0' }}>
                        {complaint.risk_factors?.collateral_risk ?? complaint.risk_factors?.collateral_hazard ?? complaint.ai_analysis?.risk_factors?.collateral_risk ?? 0} pts
                      </strong>
                      <span style={{ fontSize: '0.58rem', color: '#94A3B8', display: 'block', lineHeight: 1.1 }}>Injury/electrocution/flood</span>
                    </div>

                    {/* Factor 6: Evidence Confidence */}
                    <div style={{ backgroundColor: '#12181F', padding: '0.45rem 0.6rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.62rem', color: '#64748B' }}>6. Evidence Conf</span>
                        <span style={{ fontSize: '0.58rem', color: '#64748B' }}>/5</span>
                      </div>
                      <strong style={{ fontSize: '0.78rem', color: '#D4FF00', display: 'block', margin: '0.1rem 0' }}>
                        {complaint.risk_factors?.evidence_confidence ?? complaint.risk_factors?.corroboration_score ?? complaint.ai_analysis?.risk_factors?.evidence_confidence ?? 4} pts
                      </strong>
                      <span style={{ fontSize: '0.58rem', color: '#94A3B8', display: 'block', lineHeight: 1.1 }}>Photo & text alignment</span>
                    </div>
                  </div>
                </div>

                {/* AI Reasoning & Trace */}
                <div style={{ backgroundColor: '#12181F', borderRadius: '10px', padding: '0.65rem 0.85rem', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>
                    AI Decision Trace & Urgency Rationale
                  </span>
                  <p style={{ fontSize: '0.74rem', color: '#CBD5E1', lineHeight: 1.45, margin: 0 }}>
                    {complaint.priority_reason || complaint.ai_analysis?.reasoning || 'Evaluated safety hazards, physical defect scale, and public exposure.'}
                  </p>
                </div>

                {((complaint.ai_detections && complaint.ai_detections.length > 0) || (complaint.ai_analysis?.detections && complaint.ai_analysis.detections.length > 0)) && (
                  <div style={{ marginTop: '0.65rem', paddingTop: '0.65rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <span style={{ fontSize: '0.68rem', color: '#D4FF00', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.35rem' }}>
                      YOLOv8 Visual Detections
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {(complaint.ai_detections || complaint.ai_analysis?.detections).map((d, i) => (
                        <span
                          key={i}
                          style={{
                            backgroundColor: 'rgba(212, 255, 0, 0.1)',
                            border: '1px solid rgba(212, 255, 0, 0.25)',
                            borderRadius: '6px',
                            padding: '0.2rem 0.5rem',
                            fontSize: '0.72rem',
                            color: '#F8FAFC',
                            fontWeight: 600
                          }}
                        >
                          <strong style={{ color: '#D4FF00' }}>{d.class_name.replace('_', ' ')}</strong> ({Math.round(d.confidence * 100)}%)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Multi-Signal Duplicate Screening & Merge Engine (PRD Section 6.2) */}
              <div style={{ backgroundColor: '#18202A', borderRadius: '18px', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <GitMerge size={17} color="#D4FF00" />
                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#F8FAFC' }}>
                      Duplicate & Cluster Management
                    </span>
                  </div>
                  {complaint.duplicate_of ? (
                    <span style={{ fontSize: '0.68rem', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#F87171', padding: '0.2rem 0.55rem', borderRadius: '6px', fontWeight: 700 }}>
                      MERGED DUPLICATE
                    </span>
                  ) : complaint.merged_complaints && complaint.merged_complaints.length > 0 ? (
                    <span style={{ fontSize: '0.68rem', backgroundColor: 'rgba(212, 255, 0, 0.15)', color: '#D4FF00', padding: '0.2rem 0.55rem', borderRadius: '6px', fontWeight: 700 }}>
                      MASTER CLUSTER ({complaint.merged_complaints.length + 1} REPORTS)
                    </span>
                  ) : null}
                </div>

                {/* Case 1: Ticket is currently merged into a Parent Master Ticket */}
                {complaint.duplicate_of && (
                  <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: '14px', padding: '0.95rem', marginBottom: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#FCA5A5' }}>
                        🔗 Merged into Master Ticket: {complaint.linked_master_complaint?.complaint_number || 'Parent Report'}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#D4FF00', fontWeight: 600 }}>
                        Status: {complaint.linked_master_complaint?.status || 'Active'}
                      </span>
                    </div>
                    {complaint.linked_master_complaint?.description && (
                      <p style={{ fontSize: '0.74rem', color: '#CBD5E1', margin: '0.25rem 0 0.6rem 0', fontStyle: 'italic', lineHeight: 1.4 }}>
                        "{complaint.linked_master_complaint.description}"
                      </p>
                    )}
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginBottom: '0.65rem' }}>
                      Field operations are consolidated under master ticket to avoid redundant crew dispatches.
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDuplicateDecision(complaint.duplicate_of, 'unlinked')}
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: '#F8FAFC',
                        borderRadius: '8px',
                        padding: '0.45rem 0.75rem',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        width: '100%'
                      }}
                    >
                      Unmerge & Restore Independent Ticket
                    </button>
                  </div>
                )}

                {/* Case 2: This is a Master Ticket with attached child complaints */}
                {!complaint.duplicate_of && complaint.merged_complaints && complaint.merged_complaints.length > 0 && (
                  <div style={{ backgroundColor: 'rgba(212, 255, 0, 0.06)', border: '1px solid rgba(212, 255, 0, 0.25)', borderRadius: '14px', padding: '0.95rem', marginBottom: '0.85rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#D4FF00', marginBottom: '0.5rem' }}>
                      👥 Consolidated Reports Attached ({complaint.merged_complaints.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {complaint.merged_complaints.map((child) => (
                        <div key={child.id} style={{ backgroundColor: '#12181F', borderRadius: '10px', padding: '0.65rem', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#F8FAFC' }}>
                              {child.complaint_number} • Reported by {child.citizen_name || 'Citizen'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDuplicateDecision(child.id, 'unlinked')}
                              style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                            >
                              Detach / Unmerge
                            </button>
                          </div>
                          {child.description && (
                            <p style={{ fontSize: '0.72rem', color: '#94A3B8', margin: '0.25rem 0 0 0', lineHeight: 1.3 }}>
                              "{child.description}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Candidate Screening List */}
                {(!complaint.duplicate_candidates || complaint.duplicate_candidates.length === 0) ? (
                  <p style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    No duplicate reports detected within this ward/PIN radius.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {complaint.duplicate_candidates.map((dup) => {
                      const isLinkedToThis = (complaint.duplicate_of === dup.candidate_id || complaint.merged_into === dup.candidate_id);
                      const simPercent = Math.round((dup.similarity_score || dup.score || 0.5) * 100);
                      const isHighConf = simPercent >= 70;

                      return (
                        <div
                          key={dup.candidate_id}
                          style={{
                            backgroundColor: '#12181F',
                            borderRadius: '14px',
                            padding: '0.85rem',
                            border: isLinkedToThis ? '1px solid #EF4444' : (isHighConf ? '1px solid rgba(212, 255, 0, 0.4)' : '1px solid rgba(245, 158, 11, 0.3)')
                          }}
                        >
                          {/* Header */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#D4FF00' }}>
                              {dup.complaint_number || ('Ticket #' + dup.candidate_id.slice(0, 8))}
                            </span>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                color: isHighConf ? '#D4FF00' : '#F59E0B',
                                fontWeight: 800,
                                backgroundColor: isHighConf ? 'rgba(212, 255, 0, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '6px'
                              }}
                            >
                              {simPercent}% Match • {isHighConf ? 'Strong Duplicate' : 'Potential Match'}
                            </span>
                          </div>

                          {/* Multi-Signal Verification Chips */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.68rem', backgroundColor: 'rgba(34, 197, 94, 0.12)', color: '#4ADE80', border: '1px solid rgba(34, 197, 94, 0.25)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                                📍 GPS Verified: {dup.breakdown?.distance_label || 'Co-located Site'}
                              </span>
                            {dup.breakdown?.time_delta_label && (
                              <span style={{ fontSize: '0.68rem', backgroundColor: 'rgba(255, 255, 255, 0.06)', color: '#CBD5E1', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                                ⏱ {dup.breakdown.time_delta_label}
                              </span>
                            )}
                            <span style={{ fontSize: '0.68rem', backgroundColor: 'rgba(255, 255, 255, 0.06)', color: '#38BDF8', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                              📂 {dup.category || 'Civic Issue'}
                            </span>
                            {dup.breakdown?.text_label && (
                              <span style={{ fontSize: '0.68rem', backgroundColor: 'rgba(255, 255, 255, 0.06)', color: '#A78BFA', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                                📝 {dup.breakdown.text_label}
                              </span>
                            )}
                          </div>

                          {/* Description Snippet */}
                          {dup.description && (
                            <p style={{ fontSize: '0.74rem', color: '#CBD5E1', margin: '0.25rem 0 0.5rem 0', lineHeight: 1.4, fontStyle: 'italic' }}>
                              "{dup.description.length > 110 ? dup.description.slice(0, 110) + '...' : dup.description}"
                            </p>
                          )}

                          {/* Match Reasons */}
                          {dup.reasons && dup.reasons.length > 0 && (
                            <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.25)', borderRadius: '8px', padding: '0.45rem 0.65rem', marginBottom: '0.6rem' }}>
                              <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.68rem', color: '#94A3B8', lineHeight: 1.4 }}>
                                {dup.reasons.slice(0, 2).map((r, i) => (
                                  <li key={i}>{r}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Action Controls */}
                          {isLinkedToThis ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '0.45rem 0.75rem', borderRadius: '8px' }}>
                              <span style={{ fontSize: '0.74rem', color: '#FCA5A5', fontWeight: 700 }}>✓ Currently Merged to This Ticket</span>
                              <button
                                type="button"
                                onClick={() => handleDuplicateDecision(dup.candidate_id, 'unlinked')}
                                style={{ background: 'none', border: 'none', color: '#F87171', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                              >
                                Unmerge
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                              <button
                                type="button"
                                disabled={complaint.status === 'CLOSED'}
                                onClick={() => handleDuplicateDecision(dup.candidate_id, 'merged')}
                                className="btn-lime"
                                style={{
                                  flex: 1.4,
                                  padding: '0.45rem 0.65rem',
                                  fontSize: '0.74rem',
                                  borderRadius: '8px',
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.35rem',
                                  opacity: complaint.status === 'CLOSED' ? 0.5 : 1
                                }}
                              >
                                <GitMerge size={14} /> Merge Duplicates
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDuplicateDecision(dup.candidate_id, 'kept_separate')}
                                style={{
                                  flex: 1,
                                  padding: '0.45rem',
                                  fontSize: '0.72rem',
                                  borderRadius: '8px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                  color: '#F8FAFC',
                                  border: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                Keep Separate
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Assignment Panel */}
              <div style={{ backgroundColor: '#18202A', borderRadius: '18px', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                  <Users size={16} color="#D4FF00" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC' }}>
                    Dispatch & Work Assignment
                  </span>
                </div>

                {complaint.status === 'CLOSED' ? (
                  <div style={{ backgroundColor: 'rgba(148, 163, 184, 0.08)', border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: 0, fontWeight: 600 }}>
                      Complaint Closed
                    </p>
                    <p style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '0.35rem', lineHeight: 1.4 }}>
                      {complaint.duplicate_of
                        ? `This complaint is closed as a duplicate. On-ground field operations are assigned under master ticket ${complaint.linked_master_complaint?.complaint_number || ''}.`
                        : 'This complaint has been closed. Reopen or unlink ticket to dispatch a field officer.'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: '0.75rem' }}>
                      <label style={{ fontSize: '0.72rem', color: '#64748B', display: 'block', marginBottom: '0.25rem' }}>
                        Responsible Department
                      </label>
                      <select
                        value={selectedDept}
                        onChange={(e) => setSelectedDept(e.target.value)}
                        style={{
                          width: '100%',
                          backgroundColor: '#12181F',
                          color: '#F8FAFC',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: '8px',
                          padding: '0.5rem',
                          fontSize: '0.8rem',
                          outline: 'none'
                        }}
                      >
                        <option value="">-- Select Department --</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ marginBottom: '0.75rem' }}>
                      <label style={{ fontSize: '0.72rem', color: '#64748B', display: 'block', marginBottom: '0.25rem' }}>
                        Assign Field Officer
                      </label>
                      <select
                        value={selectedOfficer}
                        onChange={(e) => setSelectedOfficer(e.target.value)}
                        style={{
                          width: '100%',
                          backgroundColor: '#12181F',
                          color: '#F8FAFC',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: '8px',
                          padding: '0.5rem',
                          fontSize: '0.8rem',
                          outline: 'none'
                        }}
                      >
                        <option value="">-- Select Field Officer --</option>
                        {officers.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name} • Caseload: {o.active_workload || 0} tasks
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      disabled={isAssigning || !selectedDept}
                      onClick={handleAssign}
                      className="btn-lime"
                      style={{
                        width: '100%',
                        padding: '0.65rem',
                        borderRadius: '10px',
                        fontSize: '0.82rem',
                        opacity: selectedDept ? 1 : 0.5
                      }}
                    >
                      {isAssigning ? 'Updating Assignment...' : 'Save & Dispatch Officer'}
                    </button>
                  </>
                )}
              </div>

            </div>
          </div>
        )}
      </div>

      {/* AI Override Modal */}
      {showAiOverrideModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(10px)',
            zIndex: 120,
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
              maxWidth: '460px',
              width: '100%'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
              <Sparkles size={20} color="#D4FF00" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC' }}>
                Administrative AI Override
              </h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginBottom: '1rem' }}>
              All administrative overrides write immutable entries to the civic audit log.
            </p>

            <div style={{ marginBottom: '0.85rem' }}>
              <label style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', marginBottom: '0.25rem' }}>
                Category
              </label>
              <input
                type="text"
                value={overrideCategory}
                onChange={(e) => setOverrideCategory(e.target.value)}
                style={{ width: '100%', backgroundColor: '#12181F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.5rem', color: '#FFF', fontSize: '0.82rem' }}
              />
            </div>

            <div style={{ marginBottom: '0.85rem' }}>
              <label style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', marginBottom: '0.25rem' }}>
                Priority
              </label>
              <select
                value={overridePriority}
                onChange={(e) => setOverridePriority(e.target.value)}
                style={{ width: '100%', backgroundColor: '#12181F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.5rem', color: '#FFF', fontSize: '0.82rem' }}
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.75rem', color: '#D4FF00', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                Mandatory Reason for Override *
              </label>
              <textarea
                rows={2}
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="e.g. Field inspection revealed acute danger to pedestrians..."
                style={{ width: '100%', backgroundColor: '#12181F', border: '1px solid rgba(212,255,0,0.3)', borderRadius: '8px', padding: '0.5rem', color: '#FFF', fontSize: '0.82rem', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setShowAiOverrideModal(false)} className="btn-ghost" style={{ flex: 1, padding: '0.65rem', borderRadius: '10px' }}>
                Cancel
              </button>
              <button onClick={() => handleAiOverride('OVERRIDE')} className="btn-lime" style={{ flex: 1, padding: '0.65rem', borderRadius: '10px' }}>
                Save Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
