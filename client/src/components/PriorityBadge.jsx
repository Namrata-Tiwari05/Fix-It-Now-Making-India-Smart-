import React from 'react';

const PRIORITY_CONFIG = {
  CRITICAL: { label: 'Critical', bg: 'rgba(239, 68, 68, 0.2)', text: '#EF4444', border: 'rgba(239, 68, 68, 0.4)' },
  HIGH: { label: 'High', bg: 'rgba(245, 158, 11, 0.2)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.4)' },
  MEDIUM: { label: 'Medium', bg: 'rgba(59, 130, 246, 0.2)', text: '#60A5FA', border: 'rgba(59, 130, 246, 0.4)' },
  LOW: { label: 'Low', bg: 'rgba(148, 163, 184, 0.2)', text: '#94A3B8', border: 'rgba(148, 163, 184, 0.3)' }
};

export const PriorityBadge = ({ priority }) => {
  const conf = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.MEDIUM;

  return (
    <span
      style={{
        backgroundColor: conf.bg,
        color: conf.text,
        border: `1px solid ${conf.border}`,
        padding: '0.15rem 0.5rem',
        fontSize: '0.7rem',
        fontWeight: 700,
        borderRadius: '6px',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        display: 'inline-flex',
        alignItems: 'center'
      }}
    >
      {conf.label}
    </span>
  );
};
