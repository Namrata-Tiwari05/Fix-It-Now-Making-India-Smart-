import React, { useState, useEffect } from 'react';
import { ClockAlert, AlertTriangle, ShieldAlert, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { adminApi } from '../../services/api.js';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { PriorityBadge } from '../../components/PriorityBadge.jsx';

export const SlaEscalationsView = ({ onSelectComplaint, currentRole }) => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSlaCases();
  }, [currentRole]);

  const loadSlaCases = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getMunicipalComplaints({ status: 'SLA_RISK' }, currentRole);
      if (res.success) {
        setComplaints(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#F8FAFC' }}>
          SLA Compliance & Escalations
        </h2>
        <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '0.2rem' }}>
          Monitor high-risk complaints approaching or exceeding official resolution timeframes.
        </p>
      </div>

      {/* Warning Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '16px', padding: '1.25rem' }}>
          <span style={{ fontSize: '0.72rem', color: '#EF4444', fontWeight: 700, textTransform: 'uppercase' }}>Breached Targets</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#F8FAFC', marginTop: '0.25rem' }}>
            {complaints.filter(c => c.sla_breached).length} Cases
          </div>
          <p style={{ fontSize: '0.75rem', color: '#EF4444', marginTop: '0.25rem' }}>Automated alert sent to department heads</p>
        </div>

        <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '16px', padding: '1.25rem' }}>
          <span style={{ fontSize: '0.72rem', color: '#F59E0B', fontWeight: 700, textTransform: 'uppercase' }}>At Risk (&lt; 24h Remaining)</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#F8FAFC', marginTop: '0.25rem' }}>
            {complaints.filter(c => !c.sla_breached).length} Cases
          </div>
          <p style={{ fontSize: '0.75rem', color: '#F59E0B', marginTop: '0.25rem' }}>Approaching target turnaround</p>
        </div>

        <div style={{ backgroundColor: '#18202A', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '1.25rem' }}>
          <span style={{ fontSize: '0.72rem', color: '#D4FF00', fontWeight: 700, textTransform: 'uppercase' }}>Overall Compliance</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#D4FF00', marginTop: '0.25rem' }}>
            91.8%
          </div>
          <p style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.25rem' }}>Within statutory citizen charter</p>
        </div>
      </div>

      {/* Case Table */}
      <div style={{ backgroundColor: '#18202A', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#141B23', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#64748B', fontSize: '0.72rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '1rem' }}>Complaint ID</th>
              <th style={{ padding: '1rem' }}>Issue</th>
              <th style={{ padding: '1rem' }}>Problem Location</th>
              <th style={{ padding: '1rem' }}>Priority</th>
              <th style={{ padding: '1rem' }}>Status</th>
              <th style={{ padding: '1rem' }}>Officer</th>
              <th style={{ padding: '1rem' }}>SLA Urgency</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {complaints.map((c) => (
              <tr
                key={c.id}
                onClick={() => onSelectComplaint(c.id)}
                style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', cursor: 'pointer' }}
              >
                <td style={{ padding: '1rem', fontWeight: 800, color: '#D4FF00', fontSize: '0.82rem' }}>{c.complaint_number}</td>
                <td style={{ padding: '1rem', color: '#F8FAFC', fontSize: '0.85rem' }}>{c.category}</td>
                <td style={{ padding: '1rem', color: '#D4FF00', fontSize: '0.82rem' }}>PIN: {c.pincode}</td>
                <td style={{ padding: '1rem' }}><PriorityBadge priority={c.priority} /></td>
                <td style={{ padding: '1rem' }}><StatusBadge status={c.status} /></td>
                <td style={{ padding: '1rem', color: '#CBD5E1', fontSize: '0.8rem' }}>{c.assigned_officer_name || 'Unassigned'}</td>
                <td style={{ padding: '1rem', color: c.sla_breached ? '#EF4444' : '#F59E0B', fontWeight: 700, fontSize: '0.8rem' }}>
                  {c.sla_breached ? '🚨 OVERDUE' : '⚠️ &lt; 24h Remaining'}
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <button className="btn-ghost" style={{ padding: '0.35rem 0.65rem', borderRadius: '8px', fontSize: '0.75rem' }}>
                    Escalate & Assign
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
