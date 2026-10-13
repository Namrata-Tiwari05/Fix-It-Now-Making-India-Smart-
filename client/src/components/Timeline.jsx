import React from 'react';
import { CheckCircle2, Clock, ShieldCheck, ArrowRight, UserCheck, Wrench, AlertTriangle } from 'lucide-react';

const LIFECYCLE_STEPS = [
  { key: 'SUBMITTED', title: 'Submitted', desc: 'Complaint logged with Problem PIN.' },
  { key: 'UNDER_REVIEW', title: 'Under Review', desc: 'Jurisdiction & AI triage verified by municipal team.' },
  { key: 'ASSIGNED', title: 'Assigned', desc: 'Dispatched to responsible department and field officer.' },
  { key: 'IN_PROGRESS', title: 'In Progress', desc: 'On-ground repair work started.' },
  { key: 'RESOLUTION_SUBMITTED', title: 'Resolution Ready', desc: 'Field officer uploaded resolution evidence.' },
  { key: 'VERIFICATION', title: 'Verification', desc: 'Municipal administrator inspected resolution proof.' },
  { key: 'RESOLVED', title: 'Resolved', desc: 'Citizen confirmed resolution & satisfaction rating.' }
];

export const Timeline = ({ currentStatus, auditHistory = [], createdAt, resolution }) => {
  const currentIndex = LIFECYCLE_STEPS.findIndex(s => s.key === currentStatus);
  const activeIndex = currentIndex !== -1 ? currentIndex : (currentStatus === 'CLOSED' ? 6 : 0);

  return (
    <div style={{ position: 'relative', paddingLeft: '2rem' }}>
      {/* Vertical line connecting steps */}
      <div
        style={{
          position: 'absolute',
          left: '11px',
          top: '12px',
          bottom: '24px',
          width: '2px',
          background: 'linear-gradient(to bottom, #D4FF00 0%, rgba(212, 255, 0, 0.4) 50%, rgba(255, 255, 255, 0.1) 100%)'
        }}
      />

      {LIFECYCLE_STEPS.map((step, idx) => {
        const isCompleted = idx < activeIndex || currentStatus === 'RESOLVED' || currentStatus === 'CLOSED';
        const isCurrent = idx === activeIndex && currentStatus !== 'RESOLVED' && currentStatus !== 'CLOSED';
        const isFuture = idx > activeIndex;

        // Check if there is audit entry for this step
        const auditEntry = auditHistory.find(h =>
          h.action.includes(step.key) ||
          (h.new_value && h.new_value.status === step.key)
        );

        return (
          <div key={step.key} style={{ marginBottom: '1.75rem', position: 'relative' }}>
            {/* Step Icon / Dot */}
            <div
              style={{
                position: 'absolute',
                left: '-2rem',
                top: '2px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isCompleted
                  ? '#D4FF00'
                  : isCurrent
                  ? '#12181F'
                  : '#18202A',
                border: isCompleted
                  ? 'none'
                  : isCurrent
                  ? '2px solid #D4FF00'
                  : '1px solid rgba(255, 255, 255, 0.15)',
                color: isCompleted ? '#0B0F12' : isCurrent ? '#D4FF00' : '#64748B',
                boxShadow: isCurrent ? '0 0 14px rgba(212, 255, 0, 0.4)' : 'none',
                zIndex: 2
              }}
            >
              {isCompleted ? (
                <CheckCircle2 size={15} strokeWidth={3} />
              ) : isCurrent ? (
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#D4FF00' }} />
              ) : (
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#475569' }} />
              )}
            </div>

            {/* Step Content */}
            <div style={{ paddingLeft: '0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <h4
                  style={{
                    fontSize: '0.92rem',
                    fontWeight: isCurrent ? 700 : 600,
                    color: isCompleted ? '#F8FAFC' : isCurrent ? '#D4FF00' : '#64748B'
                  }}
                >
                  {step.title}
                </h4>
                {auditEntry && (
                  <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                    {new Date(auditEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>

              <p style={{ fontSize: '0.78rem', color: isFuture ? '#475569' : '#94A3B8', marginTop: '0.2rem' }}>
                {auditEntry?.reason || step.desc}
              </p>

              {auditEntry?.actor_name && (
                <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span>Updated by {auditEntry.actor_name}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
