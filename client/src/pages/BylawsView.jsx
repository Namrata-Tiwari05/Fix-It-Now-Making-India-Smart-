import React from 'react';
import {
  ArrowLeft,
  BookOpen,
  AlertTriangle,
  Trash2,
  Droplets,
  ShieldAlert,
  Building2,
  Sparkles,
  Info,
  Scale
} from 'lucide-react';

export const BylawsView = ({ onBack }) => {
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
              Civic Rules & Standards
            </span>
          </div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary, #F8FAFC)', margin: 0 }}>
            Municipal By-laws & Civic Guidelines
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #94A3B8)', marginTop: '0.2rem' }}>
            Community cleanliness standards, public sanitation, and civic regulations.
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

      {/* Mandatory Official Guidance Notice Banner */}
      <div
        style={{
          backgroundColor: 'rgba(245, 158, 11, 0.08)',
          borderRadius: '16px',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          padding: '1.1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '0.85rem',
          alignItems: 'flex-start'
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            color: '#F59E0B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: '0.1rem'
          }}
        >
          <Scale size={20} />
        </div>
        <div>
          <h2 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#F59E0B', margin: 0, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
            General Civic Guidance Notice
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #94A3B8)', marginTop: '0.35rem', lineHeight: 1.5 }}>
            The practices outlined below reflect standard municipal cleanliness, sanitation, and civic preservation guidelines. They are provided for community awareness and voluntary compliance. For legally binding statutory acts, official municipal by-laws, authorized penalty schedules, or local administrative gazettes, citizens should consult their respective <strong>Municipal Corporation (Nagar Nigam / Municipality / Cantonment Board)</strong> directly.
          </p>
        </div>
      </div>

      {/* 1. Solid Waste Management & Segregation */}
      <div style={{ marginBottom: '1.35rem' }}>
        <div
          style={{
            backgroundColor: 'var(--bg-card, #18202A)',
            borderRadius: '16px',
            border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
            padding: '1.15rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'var(--badge-bg, rgba(212, 255, 0, 0.12))',
                color: 'var(--accent-lime, #D4FF00)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Trash2 size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary, #F8FAFC)', margin: 0 }}>
                1. Solid Waste & Cleanliness
              </h3>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748B)' }}>
                Source segregation and disposal standards
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.78rem', color: 'var(--text-secondary, #94A3B8)', lineHeight: 1.5 }}>
            <p>
              • <strong>Source Segregation:</strong> Separate household waste into biodegradable wet waste (green bin) and recyclable dry waste (blue bin) prior to municipal collection.
            </p>
            <p>
              • <strong>No Open Littering:</strong> Discarding garbage on roadsides, footpaths, or vacant open plots is strictly restricted under standard civic cleanliness rules.
            </p>
            <p>
              • <strong>Construction & Demolition Debris:</strong> Building rubble, gravel, and bricks must not be dumped in public rights-of-way; contact authorized municipal disposal sites.
            </p>
            <p>
              • <strong>Prohibition of Open Burning:</strong> Burning leaves, dry waste, plastic packaging, or rubber materials in open air causes severe pollution and health hazards.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Public Sanitation & Hygiene */}
      <div style={{ marginBottom: '1.35rem' }}>
        <div
          style={{
            backgroundColor: 'var(--bg-card, #18202A)',
            borderRadius: '16px',
            border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
            padding: '1.15rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                color: '#38BDF8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary, #F8FAFC)', margin: 0 }}>
                2. Public Sanitation & Hygiene
              </h3>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748B)' }}>
                Community health and public area maintenance
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.78rem', color: 'var(--text-secondary, #94A3B8)', lineHeight: 1.5 }}>
            <p>
              • <strong>Frontage Cleanliness:</strong> Commercial establishments, eateries, and homeowners are encouraged to keep the perimeter directly adjoining their premises clean and free of litter.
            </p>
            <p>
              • <strong>Public Hygiene Facilities:</strong> Defecating or urinating in public spaces is hazardous to community health; utilize public sanitation facilities provided across commercial and transit centers.
            </p>
            <p>
              • <strong>Pet Waste Responsibilities:</strong> Pet handlers should prevent pets from soiling public walkways, parks, and playgrounds.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Stormwater Drainage & Sewage Systems */}
      <div style={{ marginBottom: '1.35rem' }}>
        <div
          style={{
            backgroundColor: 'var(--bg-card, #18202A)',
            borderRadius: '16px',
            border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
            padding: '1.15rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(99, 102, 241, 0.12)',
                color: '#818CF8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Droplets size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary, #F8FAFC)', margin: 0 }}>
                3. Drainage & Stormwater Protection
              </h3>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748B)' }}>
                Waterway clearance and flood prevention
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.78rem', color: 'var(--text-secondary, #94A3B8)', lineHeight: 1.5 }}>
            <p>
              • <strong>Protection of Storm Drains:</strong> Open roadside gutters and storm canals are engineered solely for rainwater runoff. Discarding plastic bottles, bags, or silt blocks stormwater flows.
            </p>
            <p>
              • <strong>Hazardous Liquid Discharge:</strong> Pouring used motor lubricants, industrial solvents, or corrosive chemical waste into open civic drains is strictly hazardous and contaminates local ground water.
            </p>
            <p>
              • <strong>Reporting Drain Blockages:</strong> If a major drainage culvert is obstructed ahead of heavy rains, report it promptly through Fix It Now to prevent neighborhood waterlogging.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Public Property & Right of Way */}
      <div style={{ marginBottom: '1.35rem' }}>
        <div
          style={{
            backgroundColor: 'var(--bg-card, #18202A)',
            borderRadius: '16px',
            border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
            padding: '1.15rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Building2 size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary, #F8FAFC)', margin: 0 }}>
                4. Public Property & Right of Way
              </h3>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748B)' }}>
                Footpath accessibility and public assets
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.78rem', color: 'var(--text-secondary, #94A3B8)', lineHeight: 1.5 }}>
            <p>
              • <strong>Pedestrian Walkways:</strong> Footpaths and sidewalk corridors must remain open and unobstructed for safe pedestrian transit. Unauthorized barricades or materials should be avoided.
            </p>
            <p>
              • <strong>Public Assets Preservation:</strong> Damaging public utility boxes, street signs, community benches, or public street lamps degrades community assets.
            </p>
            <p>
              • <strong>Road Cutting & Trenching:</strong> Excavating or trenching public roads or footpaths for private utility connections requires valid municipal permissions and restoration.
            </p>
          </div>
        </div>
      </div>

      {/* 5. Reporting Civic Violations Responsibly */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div
          style={{
            backgroundColor: 'var(--bg-card, #18202A)',
            borderRadius: '16px',
            border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
            padding: '1.15rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'var(--badge-bg, rgba(212, 255, 0, 0.12))',
                color: 'var(--accent-lime, #D4FF00)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ShieldAlert size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary, #F8FAFC)', margin: 0 }}>
                5. Reporting Civic Violations Responsibly
              </h3>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748B)' }}>
                Platform reporting etiquette and safety
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.78rem', color: 'var(--text-secondary, #94A3B8)', lineHeight: 1.5 }}>
            <p>
              • <strong>Constructive Reporting:</strong> Fix It Now is designed for reporting physical civic infrastructure defects (e.g. broken curbs, missing drain lids, overflowing bins) to municipal departments.
            </p>
            <p>
              • <strong>Do Not Confront:</strong> In cases of civic violations (such as illegal dumping), report the location safely through the platform rather than engaging in personal confrontation.
            </p>
            <p>
              • <strong>Official Regulations:</strong> For building bylaws, zoning laws, or statutory municipal certificates, visit your designated Municipal Corporation office.
            </p>
          </div>
        </div>
      </div>

      {/* Closing Note */}
      <div
        style={{
          padding: '0.9rem 1rem',
          borderRadius: '12px',
          backgroundColor: 'var(--bg-card, #18202A)',
          border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
          textAlign: 'center'
        }}
      >
        <p style={{ fontSize: '0.74rem', color: 'var(--text-muted, #64748B)', margin: 0 }}>
          Municipal Corporation Civic Standards • Clean City Initiative • Fix It Now
        </p>
      </div>
    </div>
  );
};
