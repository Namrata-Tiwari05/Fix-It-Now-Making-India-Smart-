import React from 'react';

const STATUS_CONFIG = {
  SUBMITTED: { label: 'Submitted', bg: 'rgba(255, 255, 255, 0.08)', text: '#F8FAFC', border: 'rgba(255, 255, 255, 0.15)' },
  UNDER_REVIEW: { label: 'Under Review', bg: 'rgba(245, 158, 11, 0.15)', text: '#FBBF24', border: 'rgba(245, 158, 11, 0.3)' },
  ASSIGNED: { label: 'Assigned', bg: 'rgba(59, 130, 246, 0.15)', text: '#60A5FA', border: 'rgba(59, 130, 246, 0.3)' },
  IN_PROGRESS: { label: 'In Progress', bg: 'rgba(168, 85, 247, 0.15)', text: '#C084FC', border: 'rgba(168, 85, 247, 0.3)' },
  ON_HOLD: { label: 'On Hold', bg: 'rgba(239, 68, 68, 0.15)', text: '#F87171', border: 'rgba(239, 68, 68, 0.3)' },
  RESOLUTION_SUBMITTED: { label: 'Resolution Ready', bg: 'rgba(212, 255, 0, 0.15)', text: '#D4FF00', border: 'rgba(212, 255, 0, 0.3)' },
  VERIFICATION: { label: 'Verification', bg: 'rgba(212, 255, 0, 0.2)', text: '#D4FF00', border: 'rgba(212, 255, 0, 0.4)' },
  RESOLVED: { label: 'Resolved', bg: 'rgba(16, 185, 129, 0.15)', text: '#34D399', border: 'rgba(16, 185, 129, 0.3)' },
  CLOSED: { label: 'Closed', bg: 'rgba(100, 116, 139, 0.2)', text: '#94A3B8', border: 'rgba(100, 116, 139, 0.3)' },
  REOPENED: { label: 'Reopened', bg: 'rgba(239, 68, 68, 0.2)', text: '#FCA5A5', border: 'rgba(239, 68, 68, 0.4)' },
  REJECTED: { label: 'Rejected', bg: 'rgba(239, 68, 68, 0.15)', text: '#F87171', border: 'rgba(239, 68, 68, 0.3)' }
};

export const StatusBadge = ({ status, size = 'sm' }) => {
  const conf = STATUS_CONFIG[status] || STATUS_CONFIG.SUBMITTED;
  const isLg = size === 'lg';

  return (
    <span
      style={{
        backgroundColor: conf.bg,
        color: conf.text,
        border: `1px solid ${conf.border}`,
        padding: isLg ? '0.35rem 0.85rem' : '0.2rem 0.55rem',
        fontSize: isLg ? '0.85rem' : '0.72rem',
        fontWeight: 600,
        borderRadius: '9999px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        whiteSpace: 'nowrap'
      }}
    >
      <span
        style={{
          width: isLg ? '7px' : '5px',
          height: isLg ? '7px' : '5px',
          borderRadius: '50%',
          backgroundColor: conf.text
        }}
      />
      {conf.label}
    </span>
  );
};
