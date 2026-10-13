import React, { useState } from 'react';
import { MapPin, Navigation, Layers, ShieldCheck, ChevronRight } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge.jsx';

export const CityMapView = ({ user, complaints = [], onSelectComplaint }) => {
  const [selectedPin, setSelectedPin] = useState(complaints[0] || null);

  const jurisdictionLabel = user?.district
    ? `${user.district} (${user.pincode || 'Jurisdiction'})`
    : 'Active Civic Jurisdiction';

  return (
    <div style={{ padding: '1.25rem 1.25rem 6.5rem 1.25rem', maxWidth: '520px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F8FAFC' }}>
          Civic Problem Map
        </h1>
        <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '0.2rem' }}>
          Geographic clusters and active reports across municipal wards.
        </p>
      </div>

      {/* Interactive Dark Map Canvas Simulator */}
      <div
        style={{
          height: '340px',
          borderRadius: '24px',
          backgroundColor: '#12181F',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: '1rem',
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      >
        {/* Map Grid Elements */}
        <div style={{ position: 'absolute', top: '15px', left: '15px', zIndex: 10, backgroundColor: 'rgba(11, 15, 18, 0.85)', backdropFilter: 'blur(10px)', padding: '0.4rem 0.75rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '0.75rem', color: '#D4FF00', fontWeight: 600 }}>
          📍 {jurisdictionLabel}
        </div>

        {/* Clustered Complaint Markers */}
        {complaints.map((c, idx) => {
          // Calculate arbitrary spread on dark map canvas
          const topPercent = 25 + (idx * 16) % 60;
          const leftPercent = 20 + (idx * 23) % 65;
          const isSelected = selectedPin?.id === c.id;

          return (
            <div
              key={c.id}
              onClick={() => setSelectedPin(c)}
              style={{
                position: 'absolute',
                top: `${topPercent}%`,
                left: `${leftPercent}%`,
                transform: 'translate(-50%, -50%)',
                cursor: 'pointer',
                zIndex: isSelected ? 30 : 15,
                transition: 'transform 0.2s ease'
              }}
            >
              <div
                style={{
                  width: isSelected ? '38px' : '30px',
                  height: isSelected ? '38px' : '30px',
                  borderRadius: '50%',
                  backgroundColor: isSelected ? '#D4FF00' : '#18202A',
                  border: isSelected ? '3px solid #0B0F12' : '2px solid #D4FF00',
                  color: isSelected ? '#0B0F12' : '#D4FF00',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isSelected ? '0 0 20px rgba(212, 255, 0, 0.6)' : '0 2px 8px rgba(0,0,0,0.5)'
                }}
              >
                <MapPin size={isSelected ? 20 : 16} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Problem Bottom Sheet Preview */}
      {selectedPin && (
        <div
          onClick={() => onSelectComplaint(selectedPin.id)}
          style={{
            backgroundColor: '#18202A',
            border: '1px solid rgba(212, 255, 0, 0.3)',
            borderRadius: '20px',
            padding: '1.1rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#D4FF00', letterSpacing: '0.04em' }}>
              {selectedPin.complaint_number}
            </span>
            <StatusBadge status={selectedPin.status} />
          </div>

          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC' }}>
            {selectedPin.category}
          </h3>

          <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '0.25rem', lineHeight: 1.4 }}>
            {selectedPin.description.slice(0, 85)}...
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <span style={{ fontSize: '0.72rem', color: '#D4FF00', fontWeight: 600 }}>
              📍 PIN: {selectedPin.pincode} • {selectedPin.address || 'Central Zone'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#F8FAFC', fontSize: '0.75rem', fontWeight: 600 }}>
              <span>Track Details</span>
              <ChevronRight size={15} color="#D4FF00" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
