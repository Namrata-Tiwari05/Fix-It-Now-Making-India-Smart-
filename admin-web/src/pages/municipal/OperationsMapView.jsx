import React, { useState, useEffect } from 'react';
import { MapPin, Filter, Layers, ChevronRight } from 'lucide-react';
import { adminApi } from '../../services/api.js';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { PriorityBadge } from '../../components/PriorityBadge.jsx';

export const OperationsMapView = ({ onSelectComplaint, currentRole }) => {
  const [complaints, setComplaints] = useState([]);
  const [selectedPin, setSelectedPin] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  useEffect(() => {
    loadComplaints();
  }, [currentRole]);

  const loadComplaints = async () => {
    try {
      const res = await adminApi.getMunicipalComplaints({}, currentRole);
      if (res.success) {
        setComplaints(res.data);
        if (res.data.length > 0) setSelectedPin(res.data[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = categoryFilter === 'ALL'
    ? complaints
    : complaints.filter(c => c.category === categoryFilter);

  return (
    <div style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#F8FAFC' }}>
            Operations & Ward Hotspot Map
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '0.2rem' }}>
            Visual geospatial clusters and field distribution across municipal wards.
          </p>
        </div>

        {/* Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{
            backgroundColor: '#18202A',
            color: '#F8FAFC',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            padding: '0.5rem 0.85rem',
            fontSize: '0.82rem',
            outline: 'none'
          }}
        >
          <option value="ALL">All Categories</option>
          <option value="Roads & Potholes">Roads & Potholes</option>
          <option value="Solid Waste & Sanitation">Solid Waste & Sanitation</option>
          <option value="Street Lighting">Street Lighting</option>
          <option value="Drainage & Sewerage">Drainage & Sewerage</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', height: '640px' }}>

        {/* Dark Map Canvas */}
        <div
          style={{
            backgroundColor: '#12181F',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            position: 'relative',
            overflow: 'hidden',
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: '28px 28px'
          }}
        >
          <div style={{ position: 'absolute', top: '15px', left: '15px', zIndex: 10, backgroundColor: 'rgba(11, 15, 18, 0.85)', backdropFilter: 'blur(10px)', padding: '0.45rem 0.85rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '0.75rem', color: '#D4FF00', fontWeight: 700 }}>
            📍 Gorakhpur Municipal Corporation (PIN 273001, 273002, 273010)
          </div>

          {/* Markers */}
          {filtered.map((c, idx) => {
            const topPercent = 20 + (idx * 17) % 65;
            const leftPercent = 18 + (idx * 22) % 68;
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
                    width: isSelected ? '40px' : '32px',
                    height: isSelected ? '40px' : '32px',
                    borderRadius: '50%',
                    backgroundColor: isSelected ? '#D4FF00' : '#18202A',
                    border: isSelected ? '3px solid #0B0F12' : '2px solid #D4FF00',
                    color: isSelected ? '#0B0F12' : '#D4FF00',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isSelected ? '0 0 24px rgba(212, 255, 0, 0.7)' : '0 2px 10px rgba(0,0,0,0.6)'
                  }}
                >
                  <MapPin size={isSelected ? 22 : 17} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Complaint Detail Panel */}
        <div
          style={{
            backgroundColor: '#18202A',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          {selectedPin ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#D4FF00', letterSpacing: '0.04em' }}>
                  {selectedPin.complaint_number}
                </span>
                <StatusBadge status={selectedPin.status} />
              </div>

              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.5rem' }}>
                {selectedPin.category}
              </h3>

              <p style={{ fontSize: '0.85rem', color: '#CBD5E1', lineHeight: 1.5, marginBottom: '1rem' }}>
                {selectedPin.description}
              </p>

              <div style={{ backgroundColor: '#12181F', borderRadius: '12px', padding: '0.85rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Problem Location PIN</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#D4FF00' }}>
                  📍 {selectedPin.pincode}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#F8FAFC', marginTop: '0.2rem' }}>
                  {selectedPin.address || 'Central Road Zone'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <PriorityBadge priority={selectedPin.priority} />
                <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                  Officer: {selectedPin.assigned_officer_name || 'Unassigned'}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ color: '#64748B', textAlign: 'center', padding: '2rem 0' }}>
              Select a pin marker on the map to inspect details.
            </div>
          )}

          {selectedPin && (
            <button
              onClick={() => onSelectComplaint(selectedPin.id)}
              className="btn-lime"
              style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', fontSize: '0.88rem' }}
            >
              Open Full Ticket Workspace <ChevronRight size={16} />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
