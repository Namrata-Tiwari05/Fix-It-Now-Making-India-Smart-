import React from 'react';
import {
  ArrowLeft,
  Camera,
  MapPin,
  Send,
  ClipboardList,
  CheckCircle2,
  Clock,
  Wrench,
  AlertTriangle,
  HelpCircle,
  FileText,
  Info,
  PhoneCall
} from 'lucide-react';

export const HelpView = ({ onBack }) => {
  return (
    <div style={{ padding: '1.25rem 1.25rem 6.5rem 1.25rem', maxWidth: '520px', margin: '0 auto' }}>
      {/* Top Header with Back Button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.25rem'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: 'var(--accent-lime, #D4FF00)',
                backgroundColor: 'var(--badge-bg, rgba(212, 255, 0, 0.12))',
                padding: '0.2rem 0.55rem',
                borderRadius: '9999px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}
            >
              Citizen Guide
            </span>
          </div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary, #F8FAFC)', margin: 0 }}>
            Help & User Guide
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #94A3B8)', marginTop: '0.2rem' }}>
            Step-by-step guidance on reporting issues and tracking civic resolutions.
          </p>
        </div>

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

      {/* Quick Overview Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-card, #18202A)',
          borderRadius: '18px',
          border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
          padding: '1.15rem',
          marginBottom: '1.25rem',
          display: 'flex',
          gap: '0.85rem'
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            backgroundColor: 'var(--badge-bg, rgba(212, 255, 0, 0.12))',
            color: 'var(--accent-lime, #D4FF00)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <HelpCircle size={22} />
        </div>
        <div>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary, #F8FAFC)', margin: 0 }}>
            What is Fix It Now?
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #94A3B8)', marginTop: '0.35rem', lineHeight: 1.5 }}>
            Fix It Now is your direct civic line to municipal authorities. You can report civic problems—such as potholes, overflowing waste, or streetlight failures—and track actual field officer resolutions in real time.
          </p>
        </div>
      </div>

      {/* Step-by-Step Reporting Guide */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary, #F8FAFC)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <FileText size={18} color="var(--accent-lime, #D4FF00)" />
          How to Report a Civic Problem
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Step 1 */}
          <div
            style={{
              backgroundColor: 'var(--bg-card, #18202A)',
              borderRadius: '14px',
              border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
              padding: '1rem',
              display: 'flex',
              gap: '0.85rem',
              alignItems: 'flex-start'
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-lime, #D4FF00)',
                color: '#0B0F12',
                fontWeight: 800,
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              1
            </div>
            <div>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary, #F8FAFC)', margin: 0 }}>
                Tap the '+' or 'Report an Issue' Button
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #94A3B8)', marginTop: '0.25rem', lineHeight: 1.45 }}>
                From the Home screen, tap the prominent yellow floating '+' button in the bottom navigation bar or the "Report a Problem" card to launch the report modal.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div
            style={{
              backgroundColor: 'var(--bg-card, #18202A)',
              borderRadius: '14px',
              border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
              padding: '1rem',
              display: 'flex',
              gap: '0.85rem',
              alignItems: 'flex-start'
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-lime, #D4FF00)',
                color: '#0B0F12',
                fontWeight: 800,
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              2
            </div>
            <div>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary, #F8FAFC)', margin: 0 }}>
                Upload or Capture a Clear Photograph
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #94A3B8)', marginTop: '0.25rem', lineHeight: 1.45 }}>
                Attach a photo demonstrating the issue clearly. Images are automatically analyzed to detect category, assess severity, and provide visual evidence to field officers.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div
            style={{
              backgroundColor: 'var(--bg-card, #18202A)',
              borderRadius: '14px',
              border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
              padding: '1rem',
              display: 'flex',
              gap: '0.85rem',
              alignItems: 'flex-start'
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-lime, #D4FF00)',
                color: '#0B0F12',
                fontWeight: 800,
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              3
            </div>
            <div>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary, #F8FAFC)', margin: 0 }}>
                Select Department Category & Location
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #94A3B8)', marginTop: '0.25rem', lineHeight: 1.45 }}>
                Confirm the civic category (e.g., Roads & Potholes, Waste & Sanitation, Water Leak, Streetlights) and verify your location coordinates or nearby street landmark.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div
            style={{
              backgroundColor: 'var(--bg-card, #18202A)',
              borderRadius: '14px',
              border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
              padding: '1rem',
              display: 'flex',
              gap: '0.85rem',
              alignItems: 'flex-start'
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-lime, #D4FF00)',
                color: '#0B0F12',
                fontWeight: 800,
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              4
            </div>
            <div>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary, #F8FAFC)', margin: 0 }}>
                Submit & Receive Instant Ticket ID
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #94A3B8)', marginTop: '0.25rem', lineHeight: 1.45 }}>
                Hit submit to register your ticket with an 8-character reference ID. Your complaint is immediately placed in the municipal dispatch queue.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Photo Guidelines */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary, #F8FAFC)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <Camera size={18} color="var(--accent-lime, #D4FF00)" />
          Best Practices for Uploading Photographs
        </h3>

        <div
          style={{
            backgroundColor: 'var(--bg-card, #18202A)',
            borderRadius: '16px',
            border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
            padding: '1.15rem'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
              <CheckCircle2 size={16} color="var(--accent-lime, #D4FF00)" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
              <div>
                <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary, #F8FAFC)' }}>Daylight & Sharp Focus:</strong>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary, #94A3B8)', marginTop: '0.1rem' }}>
                  Capture photos in good lighting without motion blur to ensure automated AI classification works accurately.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
              <CheckCircle2 size={16} color="var(--accent-lime, #D4FF00)" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
              <div>
                <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary, #F8FAFC)' }}>Include Surrounding Context:</strong>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary, #94A3B8)', marginTop: '0.1rem' }}>
                  Step back slightly to include visible reference points (e.g., street corner, building facade, milestone) so field officers can locate the exact spot quickly.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
              <CheckCircle2 size={16} color="var(--accent-lime, #D4FF00)" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
              <div>
                <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary, #F8FAFC)' }}>Only Civic Defects:</strong>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary, #94A3B8)', marginTop: '0.1rem' }}>
                  Avoid uploading images of faces, private interiors, or vehicle license plates. Focus strictly on the civic infrastructure defect.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Understanding Complaint Statuses */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary, #F8FAFC)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <Clock size={18} color="var(--accent-lime, #D4FF00)" />
          Understanding Complaint Statuses
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {/* Submitted */}
          <div
            style={{
              backgroundColor: 'var(--bg-card, #18202A)',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38BDF8', backgroundColor: 'rgba(56, 189, 248, 0.12)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                  Submitted
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary, #F8FAFC)' }}>
                  Registered in System
                </span>
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary, #94A3B8)', marginTop: '0.25rem' }}>
                Your complaint has been successfully recorded and assigned an official Ticket ID.
              </p>
            </div>
          </div>

          {/* In Review */}
          <div
            style={{
              backgroundColor: 'var(--bg-card, #18202A)',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.12)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                  In Review
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary, #F8FAFC)' }}>
                  Triaged by Dispatch
                </span>
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary, #94A3B8)', marginTop: '0.25rem' }}>
                Municipal administrators and AI analysis verify severity and determine the responsible department.
              </p>
            </div>
          </div>

          {/* In Progress */}
          <div
            style={{
              backgroundColor: 'var(--bg-card, #18202A)',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#818CF8', backgroundColor: 'rgba(129, 140, 248, 0.12)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                  In Progress
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary, #F8FAFC)' }}>
                  Crew Dispatched
                </span>
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary, #94A3B8)', marginTop: '0.25rem' }}>
                A field officer or repair crew has been dispatched to the site with a work order.
              </p>
            </div>
          </div>

          {/* Resolved */}
          <div
            style={{
              backgroundColor: 'var(--bg-card, #18202A)',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.12)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                  Resolved
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary, #F8FAFC)' }}>
                  Repair Completed
                </span>
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary, #94A3B8)', marginTop: '0.25rem' }}>
                The civic defect has been resolved on site and documented with resolution verification.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tracking Complaints */}
      <div
        style={{
          backgroundColor: 'var(--bg-card, #18202A)',
          borderRadius: '16px',
          border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
          padding: '1.15rem',
          marginBottom: '1.25rem',
          display: 'flex',
          gap: '0.85rem',
          alignItems: 'center'
        }}
      >
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
          <ClipboardList size={20} />
        </div>
        <div>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary, #F8FAFC)', margin: 0 }}>
            Live Progress Tracking
          </h4>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #94A3B8)', marginTop: '0.2rem', lineHeight: 1.4 }}>
            Navigate to the <strong>Reports</strong> tab from the bottom navigation anytime to inspect real-time progress, officer notes, and completion photos.
          </p>
        </div>
      </div>

      {/* Emergency Helpline Note */}
      <div
        style={{
          padding: '0.85rem 1rem',
          borderRadius: '12px',
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem'
        }}
      >
        <AlertTriangle size={18} color="#EF4444" style={{ flexShrink: 0 }} />
        <p style={{ fontSize: '0.74rem', color: '#EF4444', lineHeight: 1.4, margin: 0 }}>
          <strong>For Life-Threatening Emergencies:</strong> For active electrical fires, deep open sinkholes, or gas leaks, immediately dial National Emergency <strong>112</strong> or your local Fire/Police department.
        </p>
      </div>
    </div>
  );
};
