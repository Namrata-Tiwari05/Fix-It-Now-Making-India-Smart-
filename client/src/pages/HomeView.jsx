import React from 'react';
import {
  MapPin, Menu, Plus, ChevronRight, AlertCircle, CheckCircle2,
  Clock, ArrowUpRight, ShieldCheck, Sparkles
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { PriorityBadge } from '../components/PriorityBadge.jsx';

export const HomeView = ({ user, complaints = [], onOpenReport, onSelectComplaint, onOpenDrawer }) => {
  const isMergedActive = (c) => Boolean(c.duplicate_of || c.is_merged_duplicate) && (!c.master_summary || !['RESOLVED', 'CLOSED'].includes(c.master_summary.status));
  const activeComplaints = complaints.filter(c => (!['RESOLVED', 'CLOSED', 'REJECTED'].includes(c.status)) || isMergedActive(c));
  const resolvedComplaints = complaints.filter(c => (['RESOLVED'].includes(c.status)) || (c.status === 'CLOSED' && !isMergedActive(c)));

  // Determine personalized citizen name and saved jurisdiction
  const citizenName = user?.name && user.name !== 'Unregistered Citizen' ? user.name : 'Citizen';
  const locationBadgeText = user?.pincode && user?.district
    ? `${user.pincode} • ${user.district}`
    : user?.district
      ? `${user.district}${user.state ? ` • ${user.state}` : ''}`
      : user?.state || user?.pincode || 'Location Unset';

  return (
    <div style={{ padding: '1.25rem 1.25rem 6.5rem 1.25rem', maxWidth: '520px', margin: '0 auto' }}>

      {/* Top Mobile Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '0.75rem' }}>
        {/* Prominent Fix It Now Platform Branding with Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '11px',
              backgroundColor: 'var(--accent-lime, #D4FF00)',
              color: '#0B0F12',
              fontSize: '1.35rem',
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 14px var(--accent-lime-glow, rgba(212, 255, 0, 0.35))',
              flexShrink: 0
            }}
          >
            F
          </div>
          <div>
            <h1
              style={{
                fontSize: '1.35rem',
                fontWeight: 800,
                color: 'var(--text-primary, #F8FAFC)',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                margin: 0
              }}
            >
              Fix It Now
            </h1>
            <span
              style={{
                fontSize: '0.65rem',
                color: 'var(--text-muted, #64748B)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              Citizen Platform
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
          {/* Location Badge */}
          <div
            style={{
              backgroundColor: 'var(--badge-bg, rgba(255, 255, 255, 0.05))',
              border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
              borderRadius: '9999px',
              padding: '0.35rem 0.65rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.7rem',
              color: 'var(--accent-lime, #D4FF00)',
              fontWeight: 600,
              maxWidth: '145px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
            title={locationBadgeText}
          >
            <MapPin size={12} style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{locationBadgeText}</span>
          </div>

          {/* Right-Side Slide-Out Drawer Menu Button */}
          <button
            type="button"
            onClick={onOpenDrawer}
            aria-label="Open Navigation Menu"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              backgroundColor: 'var(--badge-bg, rgba(255, 255, 255, 0.05))',
              border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
              color: 'var(--text-primary, #F8FAFC)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Menu size={19} />
          </button>
        </div>
      </div>

      {/* Hero Report Card - Adaptive Clean Light & Dark Theme */}
      <div
        style={{
          borderRadius: '24px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid var(--hero-border, rgba(212, 255, 0, 0.25))',
          background: 'var(--hero-bg, linear-gradient(135deg, rgba(24, 32, 42, 0.95) 0%, rgba(18, 24, 31, 0.98) 100%))',
          boxShadow: 'var(--hero-shadow, 0 10px 30px -10px rgba(0, 0, 0, 0.5))'
        }}
      >
        {/* Ambient Glow */}
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '150px',
            height: '150px',
            borderRadius: '50%',
            backgroundColor: 'var(--hero-glow, rgba(212, 255, 0, 0.12))',
            filter: 'blur(45px)',
            pointerEvents: 'none'
          }}
        />

        <div style={{ position: 'relative', zIndex: 2 }}>
          {/* Personalized 'Welcome, {Citizen Name}' */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              backgroundColor: 'var(--hero-tag-bg, rgba(212, 255, 0, 0.12))',
              border: '1px solid var(--hero-tag-border, rgba(212, 255, 0, 0.25))',
              padding: '0.28rem 0.75rem',
              borderRadius: '9999px',
              marginBottom: '0.75rem'
            }}
          >
            <Sparkles size={13} color="var(--hero-tag-text, #D4FF00)" />
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--hero-tag-text, #D4FF00)',
                letterSpacing: '0.02em'
              }}
            >
              Welcome, {citizenName}
            </span>
          </div>

          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--hero-title-color, #F8FAFC)', lineHeight: 1.25, margin: 0 }}>
            Report a problem.<br />Track progress. Get it fixed.
          </h2>

          <p style={{ fontSize: '0.83rem', color: 'var(--hero-desc-color, #94A3B8)', marginTop: '0.55rem', lineHeight: 1.45, marginBottom: 0 }}>
            Describe what you noticed with Problem Location PIN. AI triages and routes immediately to your Municipal Corporation.
          </p>

          <div style={{ marginTop: '1.25rem' }}>
            <button
              type="button"
              onClick={onOpenReport}
              style={{
                background: 'var(--hero-btn-bg, #D4FF00)',
                color: 'var(--hero-btn-text, #0B0F12)',
                boxShadow: 'var(--hero-btn-shadow, 0 8px 24px rgba(212, 255, 0, 0.35))',
                border: 'none',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.85rem 1.4rem',
                borderRadius: '14px',
                fontSize: '0.92rem',
                width: '100%',
                transition: 'all 0.2s ease'
              }}
            >
              <Plus size={19} strokeWidth={2.8} />
              <span>Report Civic Issue Now</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Counters Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div
          style={{
            backgroundColor: 'var(--bg-card, #18202A)',
            borderRadius: '16px',
            padding: '1rem',
            border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))'
          }}
        >
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94A3B8)', textTransform: 'uppercase', fontWeight: 600 }}>
            Active Reports
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary, #F8FAFC)' }}>
              {activeComplaints.length}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--accent-lime, #D4FF00)', fontWeight: 600 }}>In Progress</span>
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-card, #18202A)',
            borderRadius: '16px',
            padding: '1rem',
            border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))'
          }}
        >
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94A3B8)', textTransform: 'uppercase', fontWeight: 600 }}>
            Resolved
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary, #F8FAFC)' }}>
              {resolvedComplaints.length}
            </span>
            <span style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 600 }}>Verified Fixes</span>
          </div>
        </div>
      </div>

      {/* Recent Reports Workspace */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary, #F8FAFC)' }}>
            Your Recent Reports
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748B)' }}>
            {complaints.length} Total
          </span>
        </div>

        {complaints.length === 0 ? (
          <div
            style={{
              backgroundColor: 'var(--bg-card, #18202A)',
              borderRadius: '16px',
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              border: '1px dashed var(--border-subtle, rgba(255, 255, 255, 0.1))'
            }}
          >
            <ShieldCheck size={36} color="var(--text-muted, #475569)" style={{ margin: '0 auto 0.75rem auto' }} />
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary, #F8FAFC)' }}>No active complaints</h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #94A3B8)', marginTop: '0.25rem' }}>
              Everything looks clear. Spot a pothole or waste dump? Tap the button below to report.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {complaints.slice(0, 4).map((c) => (
              <div
                key={c.id}
                onClick={() => onSelectComplaint(c.id)}
                style={{
                  backgroundColor: 'var(--bg-card, #18202A)',
                  borderRadius: '16px',
                  border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, border-color 0.15s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-lime, #D4FF00)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle, rgba(255, 255, 255, 0.08))';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Thumbnail */}
                <div
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--bg-secondary, #12181F)',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}
                >
                  {c.media && c.media.length > 0 ? (
                    <img src={c.media[0].storage_path} alt="thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted, #64748B)' }}>
                      <AlertCircle size={20} />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.35rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-lime, #D4FF00)', letterSpacing: '0.04em' }}>
                      {c.complaint_number}
                    </span>
                    <StatusBadge status={(c.is_merged_duplicate || c.duplicate_of) ? 'MERGED_DUPLICATE' : c.status} />
                  </div>

                  <h4
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: 'var(--text-primary, #F8FAFC)',
                      marginTop: '0.2rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {c.description}
                  </h4>

                  {(c.is_merged_duplicate || c.duplicate_of) && (
                    <div style={{ fontSize: '0.7rem', color: '#F59E0B', marginTop: '0.2rem', fontWeight: 600 }}>
                      🔗 Consolidated with Master #{c.master_summary?.complaint_number || 'Parent'} ({c.master_summary?.status || 'In Progress'})
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', fontSize: '0.72rem', color: 'var(--text-muted, #64748B)' }}>
                    <span>PIN: {c.pincode}</span>
                    <span>•</span>
                    <span>{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <ChevronRight size={18} color="var(--text-muted, #64748B)" />
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
