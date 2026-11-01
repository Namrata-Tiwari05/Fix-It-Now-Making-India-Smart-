import React from 'react';
import { User, Sun, Moon, LogOut, X, ChevronRight, Shield } from 'lucide-react';

export const NavigationDrawer = ({
  isOpen,
  onClose,
  user,
  onNavigateProfile,
  theme,
  onToggleTheme,
  onRequestLogout
}) => {
  if (!isOpen) return null;

  const citizenName = user?.name && user.name !== 'Unregistered Citizen' ? user.name : 'Citizen';
  const isDark = theme === 'dark';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90 }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          transition: 'opacity 0.25s ease'
        }}
        aria-hidden="true"
      />

      {/* Slide-out Drawer */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '54%',
          minWidth: '240px',
          maxWidth: '310px',
          backgroundColor: 'var(--drawer-bg, #12181F)',
          color: 'var(--text-primary, #F8FAFC)',
          borderLeft: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.45)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          zIndex: 100,
          padding: '1.25rem 1rem',
          boxSizing: 'border-box',
          animation: 'drawerSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}
      >
        {/* Top Header */}
        <div>
          {/* Close & Title Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.25rem',
              borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
              paddingBottom: '0.85rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--accent-lime, #D4FF00)',
                  color: '#0B0F12',
                  fontSize: '1rem',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                F
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--text-primary, #F8FAFC)' }}>
                Fix It Now
              </span>
            </div>

            <button
              onClick={onClose}
              aria-label="Close menu"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted, #94A3B8)',
                cursor: 'pointer',
                padding: '0.3rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={19} />
            </button>
          </div>

          {/* Compact Citizen Identity Snippet */}
          <div
            onClick={onNavigateProfile}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: '0.65rem 0.75rem',
              backgroundColor: 'var(--badge-bg, rgba(255, 255, 255, 0.05))',
              borderRadius: '14px',
              border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
              marginBottom: '1.5rem',
              cursor: 'pointer'
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '2px solid var(--accent-lime, #D4FF00)',
                flexShrink: 0
              }}
            >
              <img
                src={user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                alt="Avatar"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: 'var(--text-primary, #F8FAFC)'
                }}
              >
                {citizenName}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #94A3B8)' }}>
                {user?.phone ? user.phone : 'Verified Citizen'}
              </div>
            </div>
          </div>

          {/* Primary Navigation Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {/* 1. My Profile */}
            <button
              onClick={onNavigateProfile}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.8rem 0.85rem',
                backgroundColor: 'transparent',
                border: '1px solid transparent',
                borderRadius: '12px',
                color: 'var(--text-primary, #F8FAFC)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--badge-bg, rgba(255, 255, 255, 0.06))';
                e.currentTarget.style.borderColor = 'var(--border-subtle, rgba(255, 255, 255, 0.08))';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '9px',
                    backgroundColor: 'rgba(212, 255, 0, 0.12)',
                    color: 'var(--accent-lime, #D4FF00)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <User size={16} />
                </div>
                <span>My Profile</span>
              </div>
              <ChevronRight size={16} color="var(--text-muted, #64748B)" />
            </button>

            {/* 2. Theme Toggle */}
            <button
              onClick={onToggleTheme}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.8rem 0.85rem',
                backgroundColor: 'transparent',
                border: '1px solid transparent',
                borderRadius: '12px',
                color: 'var(--text-primary, #F8FAFC)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--badge-bg, rgba(255, 255, 255, 0.06))';
                e.currentTarget.style.borderColor = 'var(--border-subtle, rgba(255, 255, 255, 0.08))';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '9px',
                    backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: isDark ? '#818CF8' : '#D97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {isDark ? <Moon size={16} /> : <Sun size={16} />}
                </div>
                <span>Theme</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  backgroundColor: 'var(--badge-bg, rgba(255, 255, 255, 0.08))',
                  border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
                  borderRadius: '9999px',
                  padding: '0.2rem 0.5rem',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: isDark ? 'var(--accent-lime, #D4FF00)' : '#D97706'
                }}
              >
                {isDark ? 'Dark' : 'Light'}
              </div>
            </button>

            {/* 3. Logout */}
            <button
              onClick={onRequestLogout}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.8rem 0.85rem',
                backgroundColor: 'transparent',
                border: '1px solid transparent',
                borderRadius: '12px',
                color: '#EF4444',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '9px',
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    color: '#EF4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <LogOut size={16} />
                </div>
                <span>Logout</span>
              </div>
              <ChevronRight size={16} color="rgba(239, 68, 68, 0.6)" />
            </button>
          </div>
        </div>

        {/* Bottom Drawer Footer */}
        <div
          style={{
            borderTop: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
            paddingTop: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.68rem',
            color: 'var(--text-muted, #64748B)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Shield size={12} />
            <span>Civic Platform</span>
          </div>
          <span>v1.0.0</span>
        </div>
      </aside>
    </div>
  );
};
