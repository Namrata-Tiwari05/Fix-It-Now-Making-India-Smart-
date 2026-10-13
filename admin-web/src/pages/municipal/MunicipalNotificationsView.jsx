import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, AlertTriangle, Clock, RefreshCw, CheckCircle2, Info, FileText, ArrowRight } from 'lucide-react';
import { adminApi } from '../../services/api.js';

export const MunicipalNotificationsView = ({ onSelectComplaint }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'UNREAD'
  const [actionLoading, setActionLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getNotifications();
      if (res.success && Array.isArray(res.data)) {
        setNotifications(res.data);
      } else {
        setNotifications([]);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    setActionLoading(true);
    try {
      await adminApi.markNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'UNREAD') return !n.is_read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getTypeIcon = (type) => {
    switch (type) {
      case 'ESCALATION':
      case 'SLA_BREACH':
        return <AlertTriangle size={18} color="#EF4444" />;
      case 'STATUS_CHANGE':
      case 'RESOLVED':
        return <CheckCircle2 size={18} color="#34D399" />;
      case 'NEW_COMPLAINT':
        return <FileText size={18} color="#D4FF00" />;
      default:
        return <Info size={18} color="#60A5FA" />;
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Bell size={24} color="#D4FF00" />
            Municipal Notifications & Alerts
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#94A3B8', marginTop: '0.3rem' }}>
            Real-time feed of civic filings, SLA milestone alerts, citizen feedback, and field team updates.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={fetchNotifications}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: '#18202A',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#CBD5E1',
              borderRadius: '8px',
              padding: '0.5rem 0.85rem',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={actionLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: 'rgba(212, 255, 0, 0.1)',
                border: '1px solid rgba(212, 255, 0, 0.3)',
                color: '#D4FF00',
                borderRadius: '8px',
                padding: '0.5rem 0.9rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <CheckCheck size={15} />
              Mark All as Read
            </button>
          )}
        </div>
      </div>

      {/* Tabs / Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
        <button
          onClick={() => setFilter('ALL')}
          style={{
            padding: '0.45rem 0.9rem',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            backgroundColor: filter === 'ALL' ? '#D4FF00' : 'transparent',
            color: filter === 'ALL' ? '#0B0F12' : '#94A3B8'
          }}
        >
          All Notifications ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('UNREAD')}
          style={{
            padding: '0.45rem 0.9rem',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            backgroundColor: filter === 'UNREAD' ? '#D4FF00' : 'transparent',
            color: filter === 'UNREAD' ? '#0B0F12' : '#94A3B8',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          Unread
          {unreadCount > 0 && (
            <span style={{
              backgroundColor: filter === 'UNREAD' ? '#0B0F12' : '#EF4444',
              color: filter === 'UNREAD' ? '#D4FF00' : '#FFFFFF',
              borderRadius: '10px',
              padding: '0.1rem 0.45rem',
              fontSize: '0.7rem',
              fontWeight: 800
            }}>
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notification List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#64748B' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem auto' }} />
          <div>Retrieving notifications...</div>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div style={{
          backgroundColor: '#18202A',
          border: '1px dashed rgba(255,255,255,0.12)',
          borderRadius: '16px',
          padding: '3.5rem 2rem',
          textAlign: 'center'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem auto'
          }}>
            <Bell size={22} color="#64748B" />
          </div>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.4rem' }}>
            {filter === 'UNREAD' ? 'No unread notifications' : 'No notifications received yet'}
          </h4>
          <p style={{ fontSize: '0.8rem', color: '#64748B', maxWidth: '420px', margin: '0 auto' }}>
            When citizens lodge grievances in your covered PIN codes or SLA milestones are breached, instant alerts will display here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredNotifications.map((n) => (
            <div
              key={n.id}
              style={{
                backgroundColor: n.is_read ? '#12181F' : '#18202A',
                border: n.is_read ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(212, 255, 0, 0.25)',
                borderRadius: '12px',
                padding: '1.1rem 1.25rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {getTypeIcon(n.type)}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#F8FAFC' }}>
                      {n.title}
                    </h4>
                    {!n.is_read && (
                      <span style={{
                        backgroundColor: '#D4FF00',
                        color: '#0B0F12',
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        textTransform: 'uppercase'
                      }}>
                        New
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: '#64748B' }}>
                    <Clock size={12} />
                    {n.created_at ? new Date(n.created_at).toLocaleString() : 'Just now'}
                  </div>
                </div>

                <p style={{ fontSize: '0.82rem', color: '#94A3B8', lineHeight: 1.4, margin: '0.2rem 0 0.5rem 0' }}>
                  {n.message}
                </p>

                {n.entity_id && (
                  <button
                    onClick={() => onSelectComplaint && onSelectComplaint(n.entity_id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      background: 'none',
                      border: 'none',
                      color: '#D4FF00',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    View Related Complaint <ArrowRight size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
