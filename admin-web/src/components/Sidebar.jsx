import React from 'react';
import {
  LayoutDashboard, ClipboardList, MapPin, Building2, Users,
  ClockAlert, BarChart3, Bell, Settings, Shield, UserCheck, ChevronDown, LogOut
} from 'lucide-react';

export const Sidebar = ({
  activeSection,
  onSelectSection,
  currentRole,
  onSwitchRole,
  municipalityName = 'Gorakhpur Municipal Corporation'
}) => {
  // Navigation items for Municipal Admin
  const municipalNav = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'complaints', label: 'Complaints', icon: ClipboardList },
    { id: 'map', label: 'Operations Map', icon: MapPin },
    { id: 'departments', label: 'Departments', icon: Building2 },
    { id: 'officers', label: 'Field Officers', icon: Users },
    { id: 'sla', label: 'SLA & Escalations', icon: ClockAlert },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  // Navigation items for Master Government Admin
  const masterNav = [
    { id: 'master_overview', label: 'Global Overview', icon: LayoutDashboard },
    { id: 'master_municipalities', label: 'Municipalities', icon: Building2 },
    { id: 'master_pincodes', label: 'PIN Coverage', icon: MapPin },
    { id: 'master_routing', label: 'Routing Queue', icon: ClockAlert },
    { id: 'master_governance', label: 'AI Governance', icon: Shield },
    { id: 'master_audit', label: 'Audit Trail', icon: ClipboardList }
  ];

  // Navigation for Field Officer
  const officerNav = [
    { id: 'officer_tasks', label: 'My Assigned Work', icon: ClipboardList },
    { id: 'officer_map', label: 'Field Route Map', icon: MapPin }
  ];

  const currentNav = currentRole === 'master_admin'
    ? masterNav
    : currentRole === 'field_officer'
    ? officerNav
    : municipalNav;

  return (
    <aside
      style={{
        width: '260px',
        backgroundColor: '#0E1318',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 40
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: '1.25rem 1.25rem 1rem 1.25rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#D4FF00',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0B0F12',
              fontWeight: 900,
              fontSize: '1.1rem'
            }}
          >
            F
          </div>
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em' }}>
              FixItNow
            </div>
            <div style={{ fontSize: '0.68rem', color: '#D4FF00', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Civic Command Center
            </div>
          </div>
        </div>

        {/* Municipality Identity Pill */}
        <div
          style={{
            marginTop: '0.85rem',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '0.45rem 0.65rem'
          }}
        >
          <span style={{ fontSize: '0.65rem', color: '#64748B', display: 'block', textTransform: 'uppercase' }}>
            {currentRole === 'master_admin' ? 'National Authority' : 'Assigned Jurisdiction'}
          </span>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#F8FAFC', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentRole === 'master_admin' ? 'State & Central Command' : municipalityName}
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav style={{ flex: 1, padding: '1rem 0.75rem', overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {currentNav.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectSection(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: isActive ? 'rgba(212, 255, 0, 0.12)' : 'transparent',
                  color: isActive ? '#D4FF00' : '#94A3B8',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  borderLeft: isActive ? '3px solid #D4FF00' : '3px solid transparent'
                }}
                onMouseOver={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                }}
                onMouseOut={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Icon size={18} color={isActive ? '#D4FF00' : '#64748B'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Admin Bottom Profile Area with Logout */}
      <div
        style={{
          padding: '1rem 1.25rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: '#0A0E11',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1, minWidth: 0 }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '2px solid #D4FF00',
              flexShrink: 0
            }}
          >
            <img
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
              alt="Admin Avatar"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#F8FAFC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentRole === 'master_admin' ? 'National Admin' : 'Rajesh Verma'}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#D4FF00', textTransform: 'uppercase', fontWeight: 600 }}>
              {currentRole.replace('_', ' ')}
            </div>
          </div>
        </div>

        {onSwitchRole && (
          <button
            onClick={onSwitchRole}
            title="Log Out from Session"
            style={{
              background: 'none',
              border: 'none',
              color: '#EF4444',
              cursor: 'pointer',
              padding: '0.35rem',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </aside>
  );
};
