import React from 'react';

export const KpiCard = ({ title, value, subtitle, icon: Icon, color = '#D4FF00', trend }) => {
  return (
    <div
      style={{
        backgroundColor: '#18202A',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {title}
        </span>
        {Icon && (
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Icon size={18} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.65rem' }}>
        <span style={{ fontSize: '2rem', fontWeight: 800, color: '#F8FAFC', lineHeight: 1.1 }}>
          {value}
        </span>
        {subtitle && (
          <span style={{ fontSize: '0.75rem', color: color, fontWeight: 600 }}>
            {subtitle}
          </span>
        )}
      </div>

      {trend && (
        <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', color: '#64748B' }}>
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
};
