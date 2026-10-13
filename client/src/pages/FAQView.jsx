import React, { useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Search,
  MessageCircleQuestion,
  FileQuestion,
  CheckCircle2,
  Clock,
  ShieldCheck
} from 'lucide-react';

export const FAQView = ({ onBack }) => {
  const [openIndex, setOpenIndex] = useState(0); // first item expanded by default
  const [searchQuery, setSearchQuery] = useState('');

  const faqs = [
    {
      q: 'How do I report a civic problem in my neighborhood?',
      a: 'Tap the bright yellow floating "+" button located in the center of the bottom navigation bar or the "Report a Problem" card on the Home screen. Take or select a photo of the defect, choose the relevant civic category (e.g., Potholes, Garbage, Water Leakage, Streetlights), verify your location or landmark, and submit your report.'
    },
    {
      q: 'What information should I provide to ensure quick action?',
      a: 'To help municipal crews locate and resolve the issue quickly, provide: (1) A clear, focused photo taken during good lighting, (2) An accurate street address or recognizable landmark, and (3) A concise description explaining the issue and whether it creates a public safety risk (such as exposed wires or open manholes).'
    },
    {
      q: 'How do I track the progress of my reported issue?',
      a: 'Open the "Reports" tab from the bottom navigation bar. You will see a list of all complaints submitted under your account. Tap any complaint to view its full live timeline, assigned municipal department, dispatched field crew status, and inspection notes.'
    },
    {
      q: 'How do I understand status updates?',
      a: 'Every complaint moves through structured stages: "Submitted" means your ticket has been recorded with an 8-character ID; "In Review" means dispatchers and AI are evaluating the jurisdiction and department; "In Progress" means a field team has been assigned and dispatched; and "Resolved" means the on-site work is completed with verification.'
    },
    {
      q: 'What should I do if a reported issue remains unresolved?',
      a: 'Standard municipal response times typically range between 24 to 72 hours depending on severity. If a ticket exceeds this window, open the complaint details to inspect officer field notes. You can also quote your 8-character Ticket ID (e.g., #FIN-8921) when contacting your local municipal ward office for expedited escalation.'
    },
    {
      q: 'Is my personal information and phone number protected?',
      a: 'Yes. Fix It Now uses mobile OTP authentication strictly to verify real citizens and prevent duplicate spam. Your mobile number is never displayed publicly to other citizens or published on the public city map.'
    },
    {
      q: 'Can I report a civic issue outside my registered home district?',
      a: 'Yes! If you encounter a civic hazard or broken infrastructure anywhere within your city or state, you can submit a report. Make sure to confirm the accurate location or enter the landmark where the problem actually exists.'
    },
    {
      q: 'Is there any fee or charge for using Fix It Now?',
      a: 'No. Fix It Now is completely free of charge for all citizens. It is a civic service initiative aimed at enhancing municipal responsiveness and community wellbeing.'
    }
  ];

  const filteredFaqs = faqs.filter(
    item =>
      item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              Support Center
            </span>
          </div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary, #F8FAFC)', margin: 0 }}>
            Frequently Asked Questions
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #94A3B8)', marginTop: '0.2rem' }}>
            Quick, clear answers to common citizen questions.
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

      {/* Search Input Filter */}
      <div
        style={{
          backgroundColor: 'var(--bg-card, #18202A)',
          borderRadius: '14px',
          border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
          padding: '0.65rem 0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          marginBottom: '1.25rem'
        }}
      >
        <Search size={18} color="var(--text-muted, #64748B)" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search questions (e.g. tracking, photos, delays)..."
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-primary, #F8FAFC)',
            fontSize: '0.82rem',
            width: '100%',
            outline: 'none'
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted, #64748B)',
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Accordion FAQ List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filteredFaqs.length === 0 ? (
          <div
            style={{
              backgroundColor: 'var(--bg-card, #18202A)',
              borderRadius: '16px',
              border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
              padding: '2rem 1rem',
              textAlign: 'center',
              color: 'var(--text-secondary, #94A3B8)'
            }}
          >
            <HelpCircle size={32} style={{ margin: '0 auto 0.5rem auto', opacity: 0.5 }} />
            <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>No matching questions found</p>
            <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
              Try searching with different keywords like "status", "report", or "delay".
            </p>
          </div>
        ) : (
          filteredFaqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                style={{
                  backgroundColor: 'var(--bg-card, #18202A)',
                  borderRadius: '16px',
                  border: isOpen
                    ? '1px solid var(--accent-lime, #D4FF00)'
                    : '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease'
                }}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: 'none',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textAlign: 'left',
                    gap: '0.75rem',
                    cursor: 'pointer',
                    color: 'var(--text-primary, #F8FAFC)'
                  }}
                >
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, lineHeight: 1.4 }}>
                    {faq.q}
                  </span>
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: isOpen
                        ? 'var(--accent-lime, #D4FF00)'
                        : 'var(--badge-bg, rgba(255, 255, 255, 0.06))',
                      color: isOpen ? '#0B0F12' : 'var(--text-muted, #94A3B8)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>

                {isOpen && (
                  <div
                    style={{
                      padding: '0 1rem 1rem 1rem',
                      borderTop: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.05))',
                      marginTop: '0.2rem'
                    }}
                  >
                    <p
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary, #94A3B8)',
                        lineHeight: 1.55,
                        margin: '0.65rem 0 0 0'
                      }}
                    >
                      {faq.a}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Support Card */}
      <div
        style={{
          marginTop: '1.75rem',
          padding: '1.1rem',
          borderRadius: '16px',
          backgroundColor: 'var(--bg-card, #18202A)',
          border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
          textAlign: 'center'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', marginBottom: '0.35rem' }}>
          <ShieldCheck size={18} color="var(--accent-lime, #D4FF00)" />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #F8FAFC)' }}>
            Still have questions?
          </span>
        </div>
        <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary, #94A3B8)', lineHeight: 1.45 }}>
          You can reference your complaint ticket with your municipal ward officer or consult the Municipal By-laws guidelines for civic regulations.
        </p>
      </div>
    </div>
  );
};
