import React, { useState, useEffect } from 'react';
import {
  ClipboardList, AlertTriangle, Clock, CheckCircle2,
  TrendingUp, Users, ArrowUpRight, ChevronRight, Eye
} from 'lucide-react';
import { adminApi } from '../../services/api.js';
import { KpiCard } from '../../components/KpiCard.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { PriorityBadge } from '../../components/PriorityBadge.jsx';

export const MunicipalOverview = ({ onSelectComplaint, currentRole }) => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activityTimeframe, setActivityTimeframe] = useState('7D');

  useEffect(() => {
    loadOverview();
  }, [currentRole]);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getMunicipalOverview(currentRole);
      if (res.success) {
        setOverview(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !overview) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8' }}>
        Loading municipal operations overview...
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto' }}>

      {/* Greeting Banner */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Municipal Operations • Gorakhpur Central</span>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#F8FAFC', marginTop: '0.15rem' }}>
            Good morning, Administrator
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['Today', '7D', '30D', '90D'].map((tf) => (
            <button
              key={tf}
              onClick={() => setActivityTimeframe(tf)}
              style={{
                backgroundColor: activityTimeframe === tf ? '#D4FF00' : '#18202A',
                color: activityTimeframe === tf ? '#0B0F12' : '#94A3B8',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '0.4rem 0.8rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Row of 5 Premium KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
        <KpiCard
          title="Total Complaints"
          value={overview.total}
          subtitle="All Time"
          icon={ClipboardList}
          color="#F8FAFC"
          trend="↑ 8% from last week"
        />
        <KpiCard
          title="New / Under Review"
          value={overview.newUnderReview}
          subtitle="Needs Triage"
          icon={Clock}
          color="#FBBF24"
          trend="Avg response: 1.4h"
        />
        <KpiCard
          title="In Progress"
          value={overview.inProgress}
          subtitle="Dispatched"
          icon={TrendingUp}
          color="#60A5FA"
          trend="Active field work"
        />
        <KpiCard
          title="SLA Risk / Overdue"
          value={overview.slaRisk}
          subtitle="Urgent Attention"
          icon={AlertTriangle}
          color="#EF4444"
          trend="Escalation trigger"
        />
        <KpiCard
          title="Resolved"
          value={overview.resolved}
          subtitle="Verified"
          icon={CheckCircle2}
          color="#34D399"
          trend="96.4% citizen rating"
        />
      </div>

      {/* Operational Analytics & Status Distribution Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.25rem', marginBottom: '1.75rem' }}>

        {/* Complaint Operations Trend Chart */}
        <div
          style={{
            backgroundColor: '#18202A',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '1.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F8FAFC' }}>
                Complaint Inflow & Resolution Velocity
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                Daily grievance registration volume vs dispatched closures
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#D4FF00', fontWeight: 600 }}>
              ● Inflow &nbsp; ○ Resolved
            </span>
          </div>

          {/* Clean Graphic Bar/Trend Visualization */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '180px', paddingTop: '1rem' }}>
            {[
              { day: 'Mon', in: 14, out: 12 },
              { day: 'Tue', in: 22, out: 18 },
              { day: 'Wed', in: 19, out: 15 },
              { day: 'Thu', in: 28, out: 24 },
              { day: 'Fri', in: 25, out: 21 },
              { day: 'Sat', in: 16, out: 19 },
              { day: 'Sun', in: 10, out: 11 }
            ].map((d, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '140px' }}>
                  <div
                    style={{
                      width: '18px',
                      height: `${d.in * 4.5}px`,
                      backgroundColor: '#D4FF00',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s ease'
                    }}
                    title={`Inflow: ${d.in}`}
                  />
                  <div
                    style={{
                      width: '18px',
                      height: `${d.out * 4.5}px`,
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s ease'
                    }}
                    title={`Resolved: ${d.out}`}
                  />
                </div>
                <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Status Breakdown & Priority Monitoring */}
        <div
          style={{
            backgroundColor: '#18202A',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '1.5rem'
          }}
        >
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '1rem' }}>
            Status Distribution & SLA State
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { label: 'Submitted / New', count: overview.statusCounts?.SUBMITTED || 1, color: '#F8FAFC' },
              { label: 'Assigned / Scheduled', count: overview.statusCounts?.ASSIGNED || 1, color: '#60A5FA' },
              { label: 'In Progress (On-Ground)', count: overview.statusCounts?.IN_PROGRESS || 1, color: '#C084FC' },
              { label: 'Resolution Ready for Verification', count: overview.statusCounts?.RESOLUTION_SUBMITTED || 1, color: '#D4FF00' },
              { label: 'Resolved & Verified', count: overview.statusCounts?.RESOLVED || 1, color: '#34D399' }
            ].map((s, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.25rem' }}>
                  <span style={{ color: '#CBD5E1' }}>{s.label}</span>
                  <span style={{ fontWeight: 700, color: s.color }}>{s.count}</span>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min((s.count / (overview.total || 1)) * 100, 100)}%`, height: '100%', backgroundColor: s.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Recent Complaints Workspace Table */}
      <div
        style={{
          backgroundColor: '#18202A',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '1.5rem',
          overflowX: 'auto'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#F8FAFC' }}>
              Recent Civic Complaints
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
              Municipal ticket triage workspace with live SLA countdowns
            </span>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#64748B', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <th style={{ padding: '0.85rem 1rem' }}>Complaint ID</th>
              <th style={{ padding: '0.85rem 1rem' }}>Issue & Category</th>
              <th style={{ padding: '0.85rem 1rem' }}>Problem Location</th>
              <th style={{ padding: '0.85rem 1rem' }}>Priority</th>
              <th style={{ padding: '0.85rem 1rem' }}>Status</th>
              <th style={{ padding: '0.85rem 1rem' }}>Assigned Officer</th>
              <th style={{ padding: '0.85rem 1rem' }}>SLA Due Date</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {(overview.recentComplaints || []).map((c) => (
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
                {/* ID */}
                <td style={{ padding: '1rem', fontWeight: 700, color: '#D4FF00', fontSize: '0.82rem' }}>
                  {c.complaint_number}
                </td>

                {/* Description & Category */}
                <td style={{ padding: '1rem', maxWidth: '280px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F8FAFC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.description}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '0.15rem' }}>
                    {c.category}
                  </div>
                </td>

                {/* Location PIN */}
                <td style={{ padding: '1rem', fontSize: '0.8rem', color: '#CBD5E1' }}>
                  <div>PIN: <strong style={{ color: '#D4FF00' }}>{c.pincode}</strong></div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{c.ward_name || c.address?.slice(0, 20)}</div>
                </td>

                {/* Priority */}
                <td style={{ padding: '1rem' }}>
                  <PriorityBadge priority={c.priority} />
                </td>

                {/* Status */}
                <td style={{ padding: '1rem' }}>
                  <StatusBadge status={c.status} />
                </td>

                {/* Officer */}
                <td style={{ padding: '1rem', fontSize: '0.8rem', color: '#CBD5E1' }}>
                  {c.assigned_officer_name || <span style={{ color: '#64748B' }}>Unassigned</span>}
                </td>

                {/* SLA */}
                <td style={{ padding: '1rem', fontSize: '0.75rem', color: c.sla_breached ? '#EF4444' : '#94A3B8' }}>
                  {c.due_at ? new Date(c.due_at).toLocaleDateString() : 'N/A'}
                </td>

                {/* Action */}
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectComplaint(c.id);
                    }}
                    className="btn-ghost"
                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', borderRadius: '8px' }}
                  >
                    View <ChevronRight size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};
