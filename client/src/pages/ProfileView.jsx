import React from 'react';
import {
  MapPin,
  HelpCircle,
  FileQuestion,
  BookOpen,
  LogOut,
  CheckCircle2,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { api } from '../services/api.js';

export const ProfileView = ({ user, onLogout, onBack, onNavigate }) => {
  const profile = user || api.getUser() || {
    name: 'Verified Citizen',
    phone: '+919876543210',
    state: 'Uttar Pradesh',
    district: 'Lucknow',
    pincode: '226001',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
  };

  const jurisdictionText = [profile.pincode, profile.district, profile.state].filter(Boolean).join(' • ') || 'Location Pending';

  return (
    <div style={{ padding: '1.25rem 1.25rem 6.5rem 1.25rem', maxWidth: '520px', margin: '0 auto' }}>
      {/* Top Header with Back Button in the top-right area */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.25rem'
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary, #F8FAFC)', margin: 0 }}>
            Citizen Profile
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #94A3B8)', marginTop: '0.2rem' }}>
            Manage your verified civic credentials and participation.
          </p>
        </div>

        {/* Top-Right Back Button */}
        <button
          onClick={onBack}
          aria-label="Back to previous screen"
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-card, #18202A)',
            border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
            color: 'var(--text-primary, #F8FAFC)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.15s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--badge-bg, rgba(255, 255, 255, 0.08))';
            e.currentTarget.style.borderColor = 'var(--accent-lime, #D4FF00)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-card, #18202A)';
            e.currentTarget.style.borderColor = 'var(--border-subtle, rgba(255, 255, 255, 0.1))';
          }}
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      {/* User Card: Profile picture, name, and phone (Verified Citizen Reporter tag removed completely; name and phone vertically centered with avatar) */}
      <div
        style={{
          backgroundColor: 'var(--bg-card, #18202A)',
          borderRadius: '20px',
          border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1.1rem',
          marginBottom: '1.25rem'
        }}
      >
        <div
          style={{
            width: '62px',
            height: '62px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '2px solid var(--accent-lime, #D4FF00)',
            flexShrink: 0
          }}
        >
          <img
            src={profile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
            alt="Citizen Avatar"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <h3
              style={{
                fontSize: '1.15rem',
                fontWeight: 700,
                color: 'var(--text-primary, #F8FAFC)',
                margin: 0,
                lineHeight: 1.3
              }}
            >
              {profile.name}
            </h3>
            <CheckCircle2 size={17} color="var(--accent-lime, #D4FF00)" />
          </div>
          <p
            style={{
              fontSize: '0.82rem',
              color: 'var(--text-secondary, #94A3B8)',
              marginTop: '0.2rem',
              marginBottom: 0
            }}
          >
            {profile.phone}
          </p>
        </div>
      </div>

      {/* Verified Civic Jurisdiction Tile */}
      <div
        style={{
          backgroundColor: 'var(--bg-card, #18202A)',
          borderRadius: '16px',
          border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: 'var(--badge-bg, rgba(212, 255, 0, 0.12))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-lime, #D4FF00)',
              flexShrink: 0
            }}
          >
            <MapPin size={18} />
          </div>
          <div>
            <span
              style={{
                fontSize: '0.68rem',
                color: 'var(--text-muted, #64748B)',
                display: 'block',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}
            >
              Civic Jurisdiction
            </span>
            <span
              style={{
                fontSize: '0.88rem',
                fontWeight: 700,
                color: 'var(--text-primary, #F8FAFC)'
              }}
            >
              {jurisdictionText}
            </span>
          </div>
        </div>
        <span
          style={{
            fontSize: '0.7rem',
            color: 'var(--accent-lime, #D4FF00)',
            fontWeight: 600,
            backgroundColor: 'var(--badge-bg, rgba(212, 255, 0, 0.1))',
            padding: '0.25rem 0.6rem',
            borderRadius: '9999px',
            flexShrink: 0
          }}
        >
          Registered
        </span>
      </div>

      {/* Functional Help, FAQ, and Municipal By-laws Section */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h4
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--text-muted, #64748B)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.65rem',
            paddingLeft: '0.25rem'
          }}
        >
          Support & Civic Guidelines
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {/* 1. Help & User Guide */}
          <button
            onClick={() => onNavigate && onNavigate('help')}
            style={{
              width: '100%',
              backgroundColor: 'var(--bg-card, #18202A)',
              borderRadius: '16px',
              border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
              padding: '0.95rem 1.15rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.18s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-card-hover, #202B37)';
              e.currentTarget.style.borderColor = 'var(--border-medium, rgba(255, 255, 255, 0.14))';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-card, #18202A)';
              e.currentTarget.style.borderColor = 'var(--border-subtle, rgba(255, 255, 255, 0.08))';
              e.currentTarget.style.transform = 'none';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--badge-bg, rgba(212, 255, 0, 0.12))',
                  color: 'var(--accent-lime, #D4FF00)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <HelpCircle size={20} />
              </div>
              <div>
                <span
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    color: 'var(--text-primary, #F8FAFC)',
                    display: 'block'
                  }}
                >
                  Help & User Guide
                </span>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary, #94A3B8)' }}>
                  How to report issues, upload photos & track statuses
                </span>
              </div>
            </div>
            <ChevronRight size={18} color="var(--text-muted, #64748B)" />
          </button>

          {/* 2. Frequently Asked Questions (FAQ) */}
          <button
            onClick={() => onNavigate && onNavigate('faq')}
            style={{
              width: '100%',
              backgroundColor: 'var(--bg-card, #18202A)',
              borderRadius: '16px',
              border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
              padding: '0.95rem 1.15rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.18s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-card-hover, #202B37)';
              e.currentTarget.style.borderColor = 'var(--border-medium, rgba(255, 255, 255, 0.14))';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-card, #18202A)';
              e.currentTarget.style.borderColor = 'var(--border-subtle, rgba(255, 255, 255, 0.08))';
              e.currentTarget.style.transform = 'none';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(56, 189, 248, 0.12)',
                  color: '#38BDF8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <FileQuestion size={20} />
              </div>
              <div>
                <span
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    color: 'var(--text-primary, #F8FAFC)',
                    display: 'block'
                  }}
                >
                  Frequently Asked Questions (FAQ)
                </span>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary, #94A3B8)' }}>
                  Common queries on reports, privacy, and SLA delays
                </span>
              </div>
            </div>
            <ChevronRight size={18} color="var(--text-muted, #64748B)" />
          </button>

          {/* 3. Municipal By-laws & Civic Guidelines */}
          <button
            onClick={() => onNavigate && onNavigate('bylaws')}
            style={{
              width: '100%',
              backgroundColor: 'var(--bg-card, #18202A)',
              borderRadius: '16px',
              border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
              padding: '0.95rem 1.15rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.18s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-card-hover, #202B37)';
              e.currentTarget.style.borderColor = 'var(--border-medium, rgba(255, 255, 255, 0.14))';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-card, #18202A)';
              e.currentTarget.style.borderColor = 'var(--border-subtle, rgba(255, 255, 255, 0.08))';
              e.currentTarget.style.transform = 'none';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(245, 158, 11, 0.12)',
                  color: '#F59E0B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <BookOpen size={20} />
              </div>
              <div>
                <span
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    color: 'var(--text-primary, #F8FAFC)',
                    display: 'block'
                  }}
                >
                  Municipal By-laws & Civic Guidelines
                </span>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary, #94A3B8)' }}>
                  Cleanliness standards, waste disposal & public rules
                </span>
              </div>
            </div>
            <ChevronRight size={18} color="var(--text-muted, #64748B)" />
          </button>
        </div>
      </div>

      {/* Working Logout Action */}
      <button
        onClick={onLogout}
        style={{
          width: '100%',
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '14px',
          padding: '0.9rem',
          color: '#EF4444',
          fontSize: '0.88rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.14)';
          e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
          e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
        }}
      >
        <LogOut size={16} />
        Sign Out from Citizen Session
      </button>
    </div>
  );
};
