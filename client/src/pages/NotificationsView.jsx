import React from 'react';
import { Bell, CheckCircle2, Clock, Wrench, ShieldAlert } from 'lucide-react';

export const NotificationsView = ({ notifications = [], onSelectComplaint }) => {
  return (
    <div style={{ padding: '1.25rem 1.25rem 6.5rem 1.25rem', maxWidth: '520px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F8FAFC' }}>
          Notifications
        </h1>
        <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '0.2rem' }}>
          Live updates regarding your filed civic grievances and field actions.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {notifications.length === 0 ? (
          <div style={{ backgroundColor: '#18202A', borderRadius: '16px', padding: '2.5rem 1.5rem', textAlign: 'center', border: '1px dashed rgba(255, 255, 255, 0.1)' }}>
            <Bell size={32} color="#64748B" style={{ margin: '0 auto 0.75rem auto' }} />
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#F8FAFC' }}>All caught up</h4>
            <p style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '0.25rem' }}>No new notifications at the moment.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => n.complaint_id && onSelectComplaint(n.complaint_id)}
              style={{
                backgroundColor: '#18202A',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '1rem',
                display: 'flex',
                gap: '0.85rem',
                alignItems: 'flex-start',
                cursor: n.complaint_id ? 'pointer' : 'default'
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(212, 255, 0, 0.12)',
                  color: '#D4FF00',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Bell size={18} />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#F8FAFC' }}>
                    {n.title}
                  </h4>
                  <span style={{ fontSize: '0.68rem', color: '#64748B' }}>
                    {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '0.2rem', lineHeight: 1.4 }}>
                  {n.message}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
