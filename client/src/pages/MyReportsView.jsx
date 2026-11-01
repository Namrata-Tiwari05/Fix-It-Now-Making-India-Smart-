import React, { useState } from 'react';
import { Search, Filter, AlertCircle, ChevronRight, MapPin, Calendar } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { PriorityBadge } from '../components/PriorityBadge.jsx';

export const MyReportsView = ({ complaints = [], onSelectComplaint, onOpenReport }) => {
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = complaints.filter(c => {
    // Filter tab
    const isMergedActive = Boolean(c.duplicate_of || c.is_merged_duplicate) && (!c.master_summary || !['RESOLVED', 'CLOSED'].includes(c.master_summary.status));
    if (activeFilter === 'ACTIVE') {
      if (['RESOLVED', 'CLOSED', 'REJECTED'].includes(c.status) && !isMergedActive) return false;
    } else if (activeFilter === 'RESOLVED') {
      if (!['RESOLVED'].includes(c.status) && (c.status !== 'CLOSED' || isMergedActive)) return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.complaint_number.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.pincode.includes(q)
      );
    }
    return true;
  });

  return (
    <div style={{ padding: '1.25rem 1.25rem 6.5rem 1.25rem', maxWidth: '520px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F8FAFC' }}>
          My Grievances
        </h1>
        <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '0.2rem' }}>
          Track timeline and resolution updates for your filed civic issues.
        </p>
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative', marginBottom: '1rem' }}>
        <Search size={17} color="#64748B" style={{ position: 'absolute', left: '12px', top: '12px' }} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by ID, keyword, or PIN..."
          style={{
            width: '100%',
            backgroundColor: '#18202A',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '0.65rem 1rem 0.65rem 2.4rem',
            color: '#F8FAFC',
            fontSize: '0.85rem',
            outline: 'none'
          }}
        />
      </div>

      {/* Segmented Filter Bar */}
      <div
        style={{
          display: 'flex',
          backgroundColor: '#12181F',
          padding: '0.25rem',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: '1.25rem'
        }}
      >
        {['ALL', 'ACTIVE', 'RESOLVED'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: '9px',
              fontSize: '0.78rem',
              fontWeight: activeFilter === tab ? 700 : 500,
              backgroundColor: activeFilter === tab ? '#D4FF00' : 'transparent',
              color: activeFilter === tab ? '#0B0F12' : '#94A3B8',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {tab === 'ALL' ? 'All Reports' : tab === 'ACTIVE' ? 'Active Work' : 'Resolved'}
          </button>
        ))}
      </div>

      {/* Complaint List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {filtered.length === 0 ? (
          <div
            style={{
              backgroundColor: '#18202A',
              borderRadius: '16px',
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              border: '1px dashed rgba(255, 255, 255, 0.1)'
            }}
          >
            <AlertCircle size={32} color="#64748B" style={{ margin: '0 auto 0.75rem auto' }} />
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#F8FAFC' }}>No grievances found</h4>
            <p style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '0.25rem' }}>
              No complaints match the current filter or search criteria.
            </p>
          </div>
        ) : (
          filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => onSelectComplaint(c.id)}
              style={{
                backgroundColor: '#18202A',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '1rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = 'rgba(212, 255, 0, 0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#D4FF00', letterSpacing: '0.04em' }}>
                  {c.complaint_number}
                </span>
                <StatusBadge status={(c.is_merged_duplicate || c.duplicate_of) ? 'MERGED_DUPLICATE' : c.status} />
              </div>

              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#F8FAFC', lineHeight: 1.3 }}>
                {c.category}
              </h3>

              <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '0.35rem', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {c.description}
              </p>

              {(c.is_merged_duplicate || c.duplicate_of) && (
                <div style={{ marginTop: '0.45rem', fontSize: '0.72rem', color: '#F59E0B', fontWeight: 600 }}>
                  🔗 Consolidated with Master #{c.master_summary?.complaint_number || 'Parent Ticket'} ({c.master_summary?.status || 'In Progress'})
                </div>
              )}

              <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.06)', margin: '0.75rem 0' }} />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748B' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <MapPin size={13} color="#D4FF00" />
                  <span>PIN: {c.pincode} • {c.municipality_name?.slice(0, 24)}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <PriorityBadge priority={c.priority} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};
