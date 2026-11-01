import React from 'react';
import { Search, Bell, ExternalLink, Shield } from 'lucide-react';

export const Topbar = ({ title, subtitle, unreadCount = 0, onSearch, searchQuery = '' }) => {
  return (
    <header
      style={{
        height: '70px',
        backgroundColor: 'rgba(14, 19, 24, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem'
      }}
    >
      {/* Title & Subtitle */}
      <div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F8FAFC', lineHeight: 1.2 }}>
          {title}
        </h1>
        {subtitle && (
          <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
            {subtitle}
          </span>
        )}
      </div>

      {/* Utilities */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Search input if supported */}
        {onSearch && (
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={15} color="#64748B" style={{ position: 'absolute', left: '10px', top: '9px' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search complaints, PIN, officer..."
              style={{
                width: '100%',
                backgroundColor: '#18202A',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '0.45rem 0.75rem 0.45rem 2rem',
                fontSize: '0.8rem',
                color: '#F8FAFC',
                outline: 'none'
              }}
            />
          </div>
        )}

        {/* Citizen App Launcher */}
        <a
          href={import.meta.env.VITE_CITIZEN_APP_URL || "http://localhost:5173"}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            backgroundColor: 'rgba(212, 255, 0, 0.1)',
            border: '1px solid rgba(212, 255, 0, 0.3)',
            borderRadius: '8px',
            padding: '0.45rem 0.75rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: '#D4FF00',
            textDecoration: 'none'
          }}
        >
          <span>Citizen App (Mobile)</span>
          <ExternalLink size={13} />
        </a>

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#18202A',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <Bell size={17} />
          </button>
          {unreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: '#D4FF00',
                color: '#0B0F12',
                fontSize: '0.65rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {unreadCount}
            </span>
          )}
        </div>
      </div>
    </header>
  );
};
