import React, { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, ChevronRight, Download, RotateCcw } from 'lucide-react';
import { adminApi } from '../../services/api.js';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { PriorityBadge } from '../../components/PriorityBadge.jsx';

export const MunicipalComplaints = ({ onSelectComplaint, currentRole }) => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusTab, setStatusTab] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const STATUS_TABS = [
    { id: 'ALL', label: 'All Tickets' },
    { id: 'SUBMITTED', label: 'New Inflow' },
    { id: 'NEEDS_REVIEW', label: 'Needs Review' },
    { id: 'IN_PROGRESS', label: 'In Progress' },
    { id: 'SLA_RISK', label: 'SLA Risk / Overdue' },
    { id: 'RESOLVED', label: 'Resolved & Closed' }
  ];

  const CATEGORIES = [
    'ALL',
    'Roads & Potholes',
    'Solid Waste & Sanitation',
    'Street Lighting',
    'Drainage & Sewerage',
    'Water Supply',
    'Public Health & Vector Control'
  ];

  useEffect(() => {
    fetchComplaints();
  }, [statusTab, categoryFilter, priorityFilter, searchQuery, currentRole]);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getMunicipalComplaints({
        status: statusTab,
        category: categoryFilter,
        priority: priorityFilter,
        search: searchQuery
      }, currentRole);

      if (res.success) {
        setComplaints(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStatusTab('ALL');
    setCategoryFilter('ALL');
    setPriorityFilter('ALL');
    setSearchQuery('');
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto' }}>

      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#F8FAFC' }}>
            Complaint Management
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '0.2rem' }}>
            Triaging, field officer assignments, and SLA compliance monitoring.
          </p>
        </div>

        <button
          onClick={() => {
            const csv = complaints.map(c => `${c.complaint_number},${c.pincode},${c.category},${c.status},${c.priority}`).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `complaints-export-${Date.now()}.csv`;
            a.click();
          }}
          className="btn-ghost"
          style={{ padding: '0.5rem 1rem', borderRadius: '10px', fontSize: '0.82rem' }}
        >
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* Segmented Status Tabs */}
      <div
        style={{
          display: 'flex',
          backgroundColor: '#12181F',
          padding: '0.35rem',
          borderRadius: '14px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: '1.25rem',
          overflowX: 'auto'
        }}
      >
        {STATUS_TABS.map((tab) => {
          const isActive = statusTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setStatusTab(tab.id)}
              style={{
                flex: 1,
                padding: '0.65rem 1rem',
                borderRadius: '10px',
                fontSize: '0.82rem',
                fontWeight: isActive ? 700 : 500,
                backgroundColor: isActive ? '#D4FF00' : 'transparent',
                color: isActive ? '#0B0F12' : '#94A3B8',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Control Bar: Search + Filters + Reset */}
      <div
        style={{
          backgroundColor: '#18202A',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap'
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={16} color="#64748B" style={{ position: 'absolute', left: '12px', top: '10px' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID, keyword, citizen, or PIN..."
            style={{
              width: '100%',
              backgroundColor: '#12181F',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              padding: '0.5rem 1rem 0.5rem 2.2rem',
              color: '#F8FAFC',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          />
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{
            backgroundColor: '#12181F',
            color: '#F8FAFC',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            padding: '0.5rem 0.85rem',
            fontSize: '0.82rem',
            outline: 'none'
          }}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c === 'ALL' ? 'All Categories' : c}</option>
          ))}
        </select>

        {/* Priority Filter */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          style={{
            backgroundColor: '#12181F',
            color: '#F8FAFC',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            padding: '0.5rem 0.85rem',
            fontSize: '0.82rem',
            outline: 'none'
          }}
        >
          <option value="ALL">All Priorities</option>
          <option value="CRITICAL">CRITICAL</option>
          <option value="HIGH">HIGH</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="LOW">LOW</option>
        </select>

        {/* Reset */}
        <button
          onClick={handleReset}
          className="btn-ghost"
          style={{ padding: '0.5rem 0.85rem', borderRadius: '10px', fontSize: '0.82rem' }}
        >
          <RotateCcw size={14} /> Reset Filters
        </button>
      </div>

      {/* Data Table */}
      <div
        style={{
          backgroundColor: '#18202A',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'hidden'
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#141B23', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#64748B', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <th style={{ padding: '1rem' }}>Complaint ID</th>
              <th style={{ padding: '1rem' }}>Grievance Description</th>
              <th style={{ padding: '1rem' }}>Category</th>
              <th style={{ padding: '1rem' }}>Problem PIN</th>
              <th style={{ padding: '1rem' }}>Priority</th>
              <th style={{ padding: '1rem' }}>Status</th>
              <th style={{ padding: '1rem' }}>Assigned Officer</th>
              <th style={{ padding: '1rem' }}>SLA Target</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8' }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem auto' }} />
                  Loading complaints...
                </td>
              </tr>
            ) : complaints.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                  No complaints match the current filter selection.
                </td>
              </tr>
            ) : (
              complaints.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => onSelectComplaint(c.id)}
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '1rem', fontWeight: 800, color: '#D4FF00', fontSize: '0.82rem' }}>
                    {c.complaint_number}
                  </td>

                  <td style={{ padding: '1rem', maxWidth: '300px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F8FAFC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.description}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.2rem' }}>
                      Reported by {c.citizen_name || 'Citizen'} • {new Date(c.created_at).toLocaleDateString()}
                    </div>
                  </td>

                  <td style={{ padding: '1rem', fontSize: '0.82rem', color: '#CBD5E1' }}>
                    {c.category}
                  </td>

                  <td style={{ padding: '1rem', fontSize: '0.82rem', color: '#D4FF00', fontWeight: 600 }}>
                    {c.pincode}
                  </td>

                  <td style={{ padding: '1rem' }}>
                    <PriorityBadge priority={c.priority} riskScore={c.risk_score} />
                  </td>

                  <td style={{ padding: '1rem' }}>
                    <StatusBadge status={c.status} />
                  </td>

                  <td style={{ padding: '1rem', fontSize: '0.8rem', color: '#CBD5E1' }}>
                    {c.assigned_officer_name || <span style={{ color: '#64748B' }}>Unassigned</span>}
                  </td>

                  <td style={{ padding: '1rem', fontSize: '0.75rem', color: c.sla_breached ? '#EF4444' : '#94A3B8' }}>
                    {c.due_at ? new Date(c.due_at).toLocaleDateString() : 'N/A'}
                  </td>

                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectComplaint(c.id);
                      }}
                      className="btn-ghost"
                      style={{ padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.75rem' }}
                    >
                      Manage <ChevronRight size={13} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
