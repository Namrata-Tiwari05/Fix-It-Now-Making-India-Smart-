import React, { useState, useEffect } from 'react';
import {
  X, MapPin, Clock, ShieldAlert, Sparkles, CheckCircle2,
  AlertTriangle, Users, Building2, Calendar, FileText,
  Check, Edit3, Link2, ExternalLink, RefreshCw
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

                  {complaint.resolution.evidence && (
                    <div style={{ borderRadius: '12px', overflow: 'hidden', height: '180px', marginBottom: '0.85rem' }}>
                      <img src={complaint.resolution.evidence[0].url} alt="After" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}

                  {/* Verification Actions for Municipal Admin */}
                  {complaint.status === 'RESOLUTION_SUBMITTED' && (
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <span style={{ fontSize: '0.72rem', color: '#94A3B8', display: 'block', marginBottom: '0.4rem' }}>
                        Admin Quality Inspection
                      </span>
                      <div style={{ display: 'flex', gap: '0.6rem' }}>
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
                          <X size={16} /> Reject (Send Back to Officer)
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ backgroundColor: '#12181F', padding: '0.65rem', borderRadius: '10px' }}>
                    <span style={{ fontSize: '0.65rem', color: '#64748B', display: 'block' }}>PREDICTED CATEGORY</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#F8FAFC' }}>{complaint.category}</span>
                    <span style={{ fontSize: '0.68rem', color: '#D4FF00', display: 'block' }}>
                      {complaint.ai_analysis?.confidence ? `${Math.round(complaint.ai_analysis.confidence * 100)}% Confidence` : '94% Confidence'}
                    </span>
                  </div>

                  <div style={{ backgroundColor: '#12181F', padding: '0.65rem', borderRadius: '10px' }}>
                    <span style={{ fontSize: '0.65rem', color: '#64748B', display: 'block' }}>RECOMMENDED PRIORITY</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#F8FAFC' }}>{complaint.priority}</span>
                    <span style={{ fontSize: '0.68rem', color: '#60A5FA', display: 'block' }}>Signal Score: High</span>
                  </div>
                </div>

                <p style={{ fontSize: '0.75rem', color: '#94A3B8', lineHeight: 1.4 }}>
                  <strong style={{ color: '#F8FAFC' }}>AI Reasoning:</strong> {complaint.priority_reason || complaint.ai_analysis?.reasoning || 'Evaluated safety hazards and public traffic flow.'}
                </p>
              </div>

              {/* Duplicate Screening Candidates (PRD Section 6.2) */}
              <div style={{ backgroundColor: '#18202A', borderRadius: '18px', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                  <ShieldAlert size={16} color="#F59E0B" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC' }}>
                    Duplicate Candidates
                  </span>
                </div>

                {(!complaint.duplicate_candidates || complaint.duplicate_candidates.length === 0) ? (
                  <p style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    No duplicate reports detected within this ward/PIN radius.
                  </p>
                ) : (
                  complaint.duplicate_candidates.map((dup) => (
                    <div
                      key={dup.candidate_id}
                      style={{
                        backgroundColor: '#12181F',
                        borderRadius: '12px',
                        padding: '0.75rem',
                        border: '1px solid rgba(245, 158, 11, 0.3)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#F59E0B' }}>
                          Candidate {dup.candidate_id.slice(0, 8)}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#D4FF00', fontWeight: 700 }}>
                          {Math.round(dup.score * 100)}% Similarity
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.65rem' }}>
                        <button
                          type="button"
                          onClick={() => handleDuplicateDecision(dup.candidate_id, 'linked')}
                          className="btn-ghost"
                          style={{ flex: 1, padding: '0.4rem', fontSize: '0.72rem', borderRadius: '8px' }}
                        >
                          <Link2 size={13} /> Link as Duplicate
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateDecision(dup.candidate_id, 'kept_separate')}
                          style={{
                            flex: 1,
                            padding: '0.4rem',
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
                    </div>
                  ))
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
