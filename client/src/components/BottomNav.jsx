import React from 'react';
import { Home, ClipboardList, Plus, MapPin, Bell, User } from 'lucide-react';

export const BottomNav = ({ activeTab, onSelectTab, onOpenReport, unreadCount = 0 }) => {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'var(--nav-bg, rgba(11, 15, 18, 0.92))',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
        zIndex: 50,
        padding: '0.5rem 1rem env(safe-area-inset-bottom, 0.5rem) 1rem'
      }}
    >
      <div
        style={{
          maxWidth: '500px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative'
        }}
      >
        {/* Home */}
        <button
          onClick={() => onSelectTab('home')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.25rem',
            cursor: 'pointer',
            color: activeTab === 'home' ? 'var(--accent-lime, #D4FF00)' : 'var(--text-muted, #64748B)',
            transition: 'color 0.2s ease',
            padding: '0.35rem 0.5rem'
          }}
        >
          <Home size={20} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
          <span style={{ fontSize: '0.68rem', fontWeight: activeTab === 'home' ? 700 : 500 }}>Home</span>
        </button>

        {/* My Reports */}
        <button
          onClick={() => onSelectTab('reports')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.25rem',
            cursor: 'pointer',
            color: activeTab === 'reports' ? 'var(--accent-lime, #D4FF00)' : 'var(--text-muted, #64748B)',
            transition: 'color 0.2s ease',
            padding: '0.35rem 0.5rem'
          }}
        >
          <ClipboardList size={20} strokeWidth={activeTab === 'reports' ? 2.5 : 2} />
          <span style={{ fontSize: '0.68rem', fontWeight: activeTab === 'reports' ? 700 : 500 }}>Reports</span>
        </button>

        {/* Central Floating Lime Report Issue Button */}
        <div style={{ position: 'relative', top: '-14px' }}>
          <button
            onClick={onOpenReport}
            className="glow-pulse"
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              backgroundColor: 'var(--hero-btn-bg, #D4FF00)',
              color: 'var(--hero-btn-text, #0B0F12)',
              border: '4px solid var(--bg-primary, #0B0F12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: 'var(--hero-btn-shadow, 0 8px 24px rgba(212, 255, 0, 0.4))',
              transition: 'transform 0.15s ease'
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            aria-label="Report New Civic Problem"
          >
            <Plus size={28} strokeWidth={3} />
          </button>
        </div>

        {/* Civic Map */}
        <button
          onClick={() => onSelectTab('map')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.25rem',
            cursor: 'pointer',
            color: activeTab === 'map' ? 'var(--accent-lime, #D4FF00)' : 'var(--text-muted, #64748B)',
            transition: 'color 0.2s ease',
            padding: '0.35rem 0.5rem'
          }}
        >
          <MapPin size={20} strokeWidth={activeTab === 'map' ? 2.5 : 2} />
          <span style={{ fontSize: '0.68rem', fontWeight: activeTab === 'map' ? 700 : 500 }}>City Map</span>
        </button>

        {/* Notifications / Alerts */}
        <button
          onClick={() => onSelectTab('notifications')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.25rem',
            cursor: 'pointer',
            color: activeTab === 'notifications' ? 'var(--accent-lime, #D4FF00)' : 'var(--text-muted, #64748B)',
            transition: 'color 0.2s ease',
            padding: '0.35rem 0.5rem',
            position: 'relative'
          }}
        >
          <div style={{ position: 'relative' }}>
            <Bell size={20} strokeWidth={activeTab === 'notifications' ? 2.5 : 2} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-3px',
                  right: '-5px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-lime, #D4FF00)',
                  boxShadow: '0 0 8px var(--accent-lime, #D4FF00)'
                }}
              />
            )}
          </div>
          <span style={{ fontSize: '0.68rem', fontWeight: activeTab === 'notifications' ? 700 : 500 }}>Alerts</span>
        </button>
      </div>
    </nav>
  );
};
