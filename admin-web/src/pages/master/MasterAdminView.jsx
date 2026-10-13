import React, { useState, useEffect } from 'react';
import {
  Building2, MapPin, AlertTriangle, Shield, Plus,
  CheckCircle2, RefreshCw, ChevronRight, FileText, Globe, Search, Filter
} from 'lucide-react';
import { adminApi } from '../../services/api.js';
import { KpiCard } from '../../components/KpiCard.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';

export const MasterAdminView = ({ activeTab = 'master_overview', onSelectComplaint }) => {
  const [overview, setOverview] = useState(null);
  const [municipalities, setMunicipalities] = useState([]);
  const [pincodes, setPincodes] = useState([]);
  const [routingQueue, setRoutingQueue] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [aiGovernance, setAiGovernance] = useState(null);
  const [loading, setLoading] = useState(true);

  // Search & Filters for PIN Coverage tab
  const [pinSearch, setPinSearch] = useState('');

  // Create Municipality Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newState, setNewState] = useState('');
  const [newDistrict, setNewDistrict] = useState('');
  const [newPincodes, setNewPincodes] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('FixItNow@2026!');

  // Add PINs to existing municipality modal
  const [showAddPinModal, setShowAddPinModal] = useState(false);
  const [selectedMuniForPin, setSelectedMuniForPin] = useState(null);
  const [morePincodes, setMorePincodes] = useState('');

  // Routing Queue assignment state
  const [selectedQueueItem, setSelectedQueueItem] = useState(null);
  const [assignMuniId, setAssignMuniId] = useState('');
  const [assignReason, setAssignReason] = useState('');

  useEffect(() => {
    loadAllMasterData();
  }, [activeTab]);

  const loadAllMasterData = async () => {
    setLoading(true);
    try {
      const [ovRes, muniRes, pinRes, qRes, logRes, aiRes] = await Promise.all([
        adminApi.getMasterOverview(),
        adminApi.getMasterMunicipalities(),
        adminApi.getMasterPincodes(),
        adminApi.getRoutingQueue(),
        adminApi.getAuditLogs(),
        adminApi.getAiGovernance()
      ]);

      if (ovRes.success) setOverview(ovRes.data);
      if (muniRes.success) setMunicipalities(muniRes.data);
      if (pinRes.success) setPincodes(pinRes.data);
      if (qRes.success) setRoutingQueue(qRes.data);
      if (logRes.success) setAuditLogs(logRes.data);
      if (aiRes.success) setAiGovernance(aiRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMunicipality = async (e) => {
    e.preventDefault();
    if (!newName || !newCode) return;

    try {
      const pinArray = newPincodes.split(',').map(p => p.trim()).filter(Boolean);
      const res = await adminApi.createMunicipality({
        name: newName,
        code: newCode,
        state: newState,
        district: newDistrict,
        pincodes: pinArray,
        admin_name: adminName,
        admin_email: adminEmail,
        admin_password: adminPassword
      });

      if (res.success) {
        setShowCreateModal(false);
        setNewName('');
        setNewCode('');
        setNewState('');
        setNewDistrict('');
        setNewPincodes('');
        setAdminName('');
        setAdminEmail('');
        setAdminPassword('FixItNow@2026!');
        loadAllMasterData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMorePincodes = async (e) => {
    e.preventDefault();
    if (!selectedMuniForPin || !morePincodes) return;

    try {
      const pinArray = morePincodes.split(',').map(p => p.trim()).filter(Boolean);
      const res = await adminApi.addPincodes(selectedMuniForPin.id, pinArray);
      if (res.success) {
        setShowAddPinModal(false);
        setSelectedMuniForPin(null);
        setMorePincodes('');
        loadAllMasterData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleManualRoute = async () => {
    if (!selectedQueueItem || !assignMuniId) return;

    try {
      const res = await adminApi.assignMunicipalityToUnmapped(selectedQueueItem.id, {
        municipality_id: assignMuniId,
        reason: assignReason || 'Master Admin resolved jurisdiction'
      });

      if (res.success) {
        setSelectedQueueItem(null);
        setAssignMuniId('');
        setAssignReason('');
        loadAllMasterData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered PIN codes for PIN Coverage tab
  const filteredPincodes = pincodes.filter(p => {
    if (!pinSearch) return true;
    const q = pinSearch.toLowerCase();
    return (
      (p.pincode && p.pincode.includes(q)) ||
      (p.municipality_name && p.municipality_name.toLowerCase().includes(q)) ||
      (p.locality_name && p.locality_name.toLowerCase().includes(q))
    );
  });

  if (loading && !overview && municipalities.length === 0) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8' }}>
        Loading Master Government Command Center...
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto' }}>

      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'rgba(212, 255, 0, 0.1)', padding: '0.2rem 0.65rem', borderRadius: '9999px', marginBottom: '0.35rem' }}>
            <Globe size={13} color="#D4FF00" />
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#D4FF00', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              National & State Authority
            </span>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F8FAFC' }}>
            Master Government Command Portal
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
            Multi-corporation management, PIN code routing jurisdiction, unmapped queue, and AI governance audit.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={loadAllMasterData}
            className="btn-ghost"
            style={{ padding: '0.65rem', borderRadius: '12px' }}
            title="Refresh All Data"
          >
            <RefreshCw size={16} color="#94A3B8" />
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-lime"
            style={{ padding: '0.65rem 1.1rem', borderRadius: '12px', fontSize: '0.85rem' }}
          >
            <Plus size={16} /> Create Municipal Corporation
          </button>
        </div>
      </div>

      {/* 1. Global Overview Section */}
      {activeTab === 'master_overview' && overview && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
            <KpiCard title="Total Civic Complaints" value={overview.totalComplaints || 0} subtitle="All Municipalities" icon={FileText} color="#F8FAFC" />
            <KpiCard title="Active Municipalities" value={overview.activeMunicipalities || 0} subtitle="Corporations" icon={Building2} color="#D4FF00" />
            <KpiCard title="Registered Service PINs" value={overview.totalPincodes || 0} subtitle="Authoritative Coverage" icon={MapPin} color="#60A5FA" />
            <KpiCard title="Routing Review Queue" value={overview.unmappedRoutingQueue || 0} subtitle="Unmapped PINs" icon={AlertTriangle} color="#EF4444" />
          </div>

          {/* Municipal Breakdown Table */}
          <div style={{ backgroundColor: '#18202A', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '1.5rem', marginBottom: '1.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '1rem' }}>
              Corporation Performance & Complaint Volumes
            </h3>

            {(!overview.breakdown || overview.breakdown.length === 0) ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                <Building2 size={36} color="#475569" style={{ margin: '0 auto 0.75rem' }} />
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#94A3B8' }}>No Municipal Corporations Configured Yet</div>
                <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Click "+ Create Municipal Corporation" above to register your first municipality and assign PIN codes.</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#64748B', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.85rem 1rem' }}>Municipal Corporation</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Code</th>
                    <th style={{ padding: '0.85rem 1rem' }}>State</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Service PINs</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Total Filed</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Resolved</th>
                    <th style={{ padding: '0.85rem 1rem' }}>In Progress</th>
                    <th style={{ padding: '0.85rem 1rem' }}>SLA Breaches</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.breakdown.map((b) => (
                    <tr key={b.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '1rem', fontWeight: 700, color: '#F8FAFC' }}>{b.name}</td>
                      <td style={{ padding: '1rem', color: '#D4FF00', fontWeight: 600 }}>{b.code}</td>
                      <td style={{ padding: '1rem', color: '#94A3B8' }}>{b.state}</td>
                      <td style={{ padding: '1rem', color: '#60A5FA', fontWeight: 700 }}>{b.total_pincodes || 0}</td>
                      <td style={{ padding: '1rem', fontWeight: 700, color: '#F8FAFC' }}>{b.total}</td>
                      <td style={{ padding: '1rem', color: '#34D399', fontWeight: 700 }}>{b.resolved}</td>
                      <td style={{ padding: '1rem', color: '#60A5FA' }}>{b.inProgress}</td>
                      <td style={{ padding: '1rem', color: b.slaRisk > 0 ? '#EF4444' : '#94A3B8', fontWeight: 700 }}>{b.slaRisk}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* 2. Municipalities Registry Section */}
      {activeTab === 'master_municipalities' && (
        <div style={{ backgroundColor: '#18202A', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '1.5rem', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F8FAFC' }}>
                Municipal Corporations Registry
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                All active civic authorities, service boundaries, and administrative credentials.
              </p>
            </div>
            <span style={{ fontSize: '0.8rem', backgroundColor: 'rgba(212, 255, 0, 0.1)', color: '#D4FF00', padding: '0.3rem 0.75rem', borderRadius: '8px', fontWeight: 700 }}>
              {municipalities.length} Active Corporations
            </span>
          </div>

          {municipalities.length === 0 ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748B' }}>
              <Building2 size={44} color="#475569" style={{ margin: '0 auto 0.75rem' }} />
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F8FAFC' }}>No Municipalities Created Yet</div>
              <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginTop: '0.35rem', marginBottom: '1.25rem' }}>
                Create a Municipal Corporation and supply comma-separated PIN codes to start routing citizen grievances.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-lime"
                style={{ padding: '0.65rem 1.25rem', borderRadius: '12px', fontSize: '0.85rem' }}
              >
                <Plus size={16} /> Create Municipal Corporation
              </button>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#64748B', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Corporation Name</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Code</th>
                  <th style={{ padding: '0.85rem 1rem' }}>State & District</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Service PINs</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Complaints</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Official Contact</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {municipalities.map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '1rem', fontWeight: 700, color: '#F8FAFC' }}>
                      {m.name}
                      <span style={{ display: 'block', fontSize: '0.72rem', color: '#34D399', fontWeight: 500 }}>Active Jurisdiction</span>
                    </td>
                    <td style={{ padding: '1rem', color: '#D4FF00', fontWeight: 700 }}>{m.code}</td>
                    <td style={{ padding: '1rem', color: '#CBD5E1', fontSize: '0.85rem' }}>{m.district}, {m.state}</td>
                    <td style={{ padding: '1rem', color: '#60A5FA', fontWeight: 700 }}>{m.total_pincodes || 0} PINs</td>
                    <td style={{ padding: '1rem', color: '#F8FAFC', fontWeight: 700 }}>{m.total_complaints || 0}</td>
                    <td style={{ padding: '1rem', color: '#94A3B8', fontSize: '0.78rem' }}>{m.contact_email || 'N/A'}</td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button
                        onClick={() => {
                          setSelectedMuniForPin(m);
                          setShowAddPinModal(true);
                        }}
                        className="btn-ghost"
                        style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', fontSize: '0.75rem', color: '#D4FF00', border: '1px solid rgba(212, 255, 0, 0.2)' }}
                      >
                        + Add PINs
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 3. Problem Location PIN Coverage Section */}
      {activeTab === 'master_pincodes' && (
        <div style={{ backgroundColor: '#18202A', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '1.5rem', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F8FAFC' }}>
                Authoritative Problem Location PIN Coverage
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                Deterministic mapping connecting postal codes directly to their governing Municipal Corporations.
              </p>
            </div>

            {/* Quick Search */}
            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={15} color="#64748B" style={{ position: 'absolute', left: '12px', top: '10px' }} />
              <input
                type="text"
                value={pinSearch}
                onChange={(e) => setPinSearch(e.target.value)}
                placeholder="Search PIN or Corporation..."
                style={{
                  width: '100%',
                  backgroundColor: '#12181F',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  padding: '0.45rem 0.85rem 0.45rem 2.25rem',
                  color: '#F8FAFC',
                  fontSize: '0.8rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {filteredPincodes.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
              <MapPin size={40} color="#475569" style={{ margin: '0 auto 0.75rem' }} />
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#94A3B8' }}>No PIN Codes Match Your Query</div>
              <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Add service PINs when creating or editing a Municipal Corporation.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#64748B', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Problem Location PIN</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Governing Corporation</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Locality / Service Zone</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Registered Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredPincodes.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '0.9rem 1rem', fontWeight: 800, color: '#D4FF00', fontSize: '0.95rem' }}>
                      {p.pincode}
                    </td>
                    <td style={{ padding: '0.9rem 1rem', fontWeight: 600, color: '#F8FAFC' }}>
                      {p.municipality_name || 'Mapped Municipality'}
                    </td>
                    <td style={{ padding: '0.9rem 1rem', color: '#94A3B8', fontSize: '0.82rem' }}>
                      {p.locality_name || 'Central Municipal Zone'}
                    </td>
                    <td style={{ padding: '0.9rem 1rem' }}>
                      <span style={{ fontSize: '0.7rem', backgroundColor: 'rgba(52, 211, 153, 0.15)', color: '#34D399', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 700 }}>
                        ACTIVE ROUTING
                      </span>
                    </td>
                    <td style={{ padding: '0.9rem 1rem', color: '#64748B', fontSize: '0.78rem' }}>
                      {p.created_at ? new Date(p.created_at).toLocaleDateString() : 'Active'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 4. Routing Review Queue (Unmapped/Invalid PINs) */}
      {activeTab === 'master_routing' && (
        <div>
          <div style={{ backgroundColor: '#18202A', borderRadius: '20px', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '1.5rem', marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <AlertTriangle size={20} color="#EF4444" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#EF4444' }}>
                Unmapped PIN Routing Review Queue
              </h3>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#94A3B8', marginBottom: '1rem', lineHeight: 1.5 }}>
              The FixItNow jurisdiction rule strictly prevents client-side municipality manipulation. Complaints filed with unmapped PIN codes enter this queue for authoritative government triage rather than being silently misrouted.
            </p>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#64748B', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Ticket ID</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Problem Location PIN</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Issue Description</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {routingQueue.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                      <CheckCircle2 size={36} color="#34D399" style={{ margin: '0 auto 0.5rem' }} />
                      <div style={{ fontWeight: 600, color: '#F8FAFC' }}>All complaints successfully resolved to active Municipal Corporations!</div>
                      <p style={{ fontSize: '0.78rem', marginTop: '0.2rem' }}>No unmapped tickets requiring manual government routing at this time.</p>
                    </td>
                  </tr>
                ) : (
                  routingQueue.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '1rem', fontWeight: 800, color: '#D4FF00' }}>{item.complaint_number}</td>
                      <td style={{ padding: '1rem', color: '#EF4444', fontWeight: 700 }}>PIN: {item.pincode}</td>
                      <td style={{ padding: '1rem', color: '#CBD5E1', fontSize: '0.85rem' }}>{item.description}</td>
                      <td style={{ padding: '1rem' }}><StatusBadge status={item.status} /></td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedQueueItem(item)}
                          className="btn-lime"
                          style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.75rem' }}
                        >
                          Assign Municipality
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. AI Governance Section */}
      {activeTab === 'master_governance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ backgroundColor: '#18202A', borderRadius: '20px', border: '1px solid rgba(212, 255, 0, 0.2)', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Shield size={20} color="#D4FF00" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#D4FF00' }}>
                AI Model Governance & Human Override Monitor
              </h3>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#94A3B8', marginBottom: '1.25rem' }}>
              Per statutory guidelines, AI is an assistive layer, not an authority. Model triage accuracy and administrative overrides are continuously monitored.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              <div style={{ backgroundColor: '#12181F', padding: '1rem', borderRadius: '12px' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748B' }}>ACTIVE MODEL</span>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#F8FAFC' }}>{aiGovernance?.model_version || 'v1.0-civic-triage'}</div>
              </div>
              <div style={{ backgroundColor: '#12181F', padding: '1rem', borderRadius: '12px' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748B' }}>TOTAL TRIAGE RUNS</span>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#D4FF00' }}>{aiGovernance?.total_analyses || 0}</div>
              </div>
              <div style={{ backgroundColor: '#12181F', padding: '1rem', borderRadius: '12px' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748B' }}>HUMAN OVERRIDES</span>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#FBBF24' }}>{aiGovernance?.human_overrides || 0}</div>
              </div>
              <div style={{ backgroundColor: '#12181F', padding: '1rem', borderRadius: '12px' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748B' }}>OVERRIDE RATE</span>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#34D399' }}>{aiGovernance?.override_rate_percent || 0}%</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Immutable Audit Trail Section */}
      {activeTab === 'master_audit' && (
        <div style={{ backgroundColor: '#18202A', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '1rem' }}>
            Immutable System Audit Logs
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginBottom: '1rem' }}>
            Permanent compliance log capturing every administrative creation, status change, officer assignment, and jurisdiction resolution.
          </p>

          {auditLogs.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
              No audit logs recorded yet.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#64748B', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Timestamp</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Actor</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Action</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Entity ID</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Documented Reason</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.slice(0, 30).map((l) => (
                  <tr key={l.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', color: '#94A3B8' }}>{new Date(l.timestamp).toLocaleString()}</td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: '#F8FAFC' }}>{l.actor_name} ({l.actor_role})</td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#D4FF00' }}>{l.action}</td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', color: '#64748B' }}>{l.entity_id}</td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: '#CBD5E1' }}>{l.reason || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Manual Route Modal */}
      {selectedQueueItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(10px)',
            zIndex: 110,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div style={{ backgroundColor: '#18202A', border: '1px solid #D4FF00', borderRadius: '20px', padding: '1.75rem', maxWidth: '440px', width: '100%' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.5rem' }}>
              Assign Municipality Jurisdiction
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginBottom: '1rem' }}>
              Routing unmapped PIN <strong style={{ color: '#D4FF00' }}>{selectedQueueItem.pincode}</strong> to Municipal Corporation.
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', marginBottom: '0.35rem' }}>
                Select Municipal Corporation
              </label>
              <select
                value={assignMuniId}
                onChange={(e) => setAssignMuniId(e.target.value)}
                style={{ width: '100%', backgroundColor: '#12181F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.55rem', color: '#FFF', fontSize: '0.82rem' }}
              >
                <option value="">-- Choose Municipality --</option>
                {municipalities.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.code})</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', marginBottom: '0.35rem' }}>
                Triage Reason
              </label>
              <input
                type="text"
                value={assignReason}
                onChange={(e) => setAssignReason(e.target.value)}
                placeholder="e.g. Suburb mapped to Municipal expansion zone"
                style={{ width: '100%', backgroundColor: '#12181F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.55rem', color: '#FFF', fontSize: '0.82rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button onClick={() => setSelectedQueueItem(null)} className="btn-ghost" style={{ flex: 1, padding: '0.65rem', borderRadius: '10px' }}>
                Cancel
              </button>
              <button onClick={handleManualRoute} className="btn-lime" style={{ flex: 1, padding: '0.65rem', borderRadius: '10px' }}>
                Confirm Routing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add PINs Modal */}
      {showAddPinModal && selectedMuniForPin && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(10px)',
            zIndex: 110,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div style={{ backgroundColor: '#18202A', border: '1px solid #D4FF00', borderRadius: '20px', padding: '1.75rem', maxWidth: '440px', width: '100%' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.5rem' }}>
              Add Service PIN Codes
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginBottom: '1rem' }}>
              Expand jurisdiction for <strong style={{ color: '#D4FF00' }}>{selectedMuniForPin.name}</strong>.
            </p>

            <form onSubmit={handleAddMorePincodes}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', marginBottom: '0.35rem' }}>
                  Additional PIN Codes (Comma-separated)
                </label>
                <input
                  type="text"
                  required
                  value={morePincodes}
                  onChange={(e) => setMorePincodes(e.target.value)}
                  placeholder="e.g. 273012, 273014, 273016"
                  style={{ width: '100%', backgroundColor: '#12181F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.55rem', color: '#FFF', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button type="button" onClick={() => { setShowAddPinModal(false); setSelectedMuniForPin(null); }} className="btn-ghost" style={{ flex: 1, padding: '0.65rem', borderRadius: '10px' }}>
                  Cancel
                </button>
                <button type="submit" className="btn-lime" style={{ flex: 1, padding: '0.65rem', borderRadius: '10px' }}>
                  Save PIN Codes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Municipality Modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(10px)',
            zIndex: 110,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div style={{ backgroundColor: '#18202A', border: '1px solid #D4FF00', borderRadius: '20px', padding: '1.75rem', maxWidth: '480px', width: '100%' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.5rem' }}>
              Create Municipal Corporation
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginBottom: '1rem' }}>
              Configure authority credentials and registered service PIN codes.
            </p>

            <form onSubmit={handleCreateMunicipality}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', marginBottom: '0.25rem' }}>Corporation Name</label>
                <input type="text" required value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Gorakhpur Municipal Corporation" style={{ width: '100%', backgroundColor: '#12181F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.5rem', color: '#FFF', fontSize: '0.82rem' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', marginBottom: '0.25rem' }}>Code</label>
                  <input type="text" required value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="e.g. GMC-UP" style={{ width: '100%', backgroundColor: '#12181F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.5rem', color: '#FFF', fontSize: '0.82rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', marginBottom: '0.25rem' }}>State</label>
                  <input type="text" required value={newState} onChange={(e) => setNewState(e.target.value)} placeholder="e.g. Uttar Pradesh" style={{ width: '100%', backgroundColor: '#12181F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.5rem', color: '#FFF', fontSize: '0.82rem' }} />
                </div>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', marginBottom: '0.25rem' }}>District</label>
                <input type="text" required value={newDistrict} onChange={(e) => setNewDistrict(e.target.value)} placeholder="e.g. Gorakhpur" style={{ width: '100%', backgroundColor: '#12181F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.5rem', color: '#FFF', fontSize: '0.82rem' }} />
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.75rem', color: '#D4FF00', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                  Service PIN Codes (Comma-separated)
                </label>
                <input
                  type="text"
                  required
                  value={newPincodes}
                  onChange={(e) => setNewPincodes(e.target.value)}
                  placeholder="e.g. 273001, 273002, 273010, 273015"
                  style={{ width: '100%', backgroundColor: '#12181F', border: '1px solid #D4FF00', borderRadius: '8px', padding: '0.55rem', color: '#FFF', fontSize: '0.85rem' }}
                />
                <span style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '0.2rem', display: 'block' }}>
                  All complaints filed with these PIN codes will authoritatively route to this Municipal Corporation.
                </span>
              </div>

              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.75rem', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.7rem', color: '#D4FF00', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '0.5rem' }}>
                  Initial Municipal Admin Account
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>Admin Full Name</label>
                    <input type="text" value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Commissioner Name" style={{ width: '100%', backgroundColor: '#12181F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.45rem', color: '#FFF', fontSize: '0.8rem' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>Admin Email</label>
                    <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin.gmc@gorakhpurmc.gov.in" style={{ width: '100%', backgroundColor: '#12181F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.45rem', color: '#FFF', fontSize: '0.8rem' }} />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>Initial Password</label>
                  <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="FixItNow@2026!" style={{ width: '100%', backgroundColor: '#12181F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.45rem', color: '#FFF', fontSize: '0.8rem' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-ghost" style={{ flex: 1, padding: '0.65rem', borderRadius: '10px' }}>Cancel</button>
                <button type="submit" className="btn-lime" style={{ flex: 1, padding: '0.65rem', borderRadius: '10px' }}>Register Municipality</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
