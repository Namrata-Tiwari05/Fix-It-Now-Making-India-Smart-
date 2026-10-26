import React, { useState, useEffect } from 'react';
import { Settings, Building2, Phone, Mail, Clock, MapPin, Save, CheckCircle2, AlertCircle, RefreshCw, Plus, X } from 'lucide-react';
import { adminApi } from '../../services/api.js';

export const MunicipalSettingsView = () => {
  const [settings, setSettings] = useState({
    name: '',
    code: '',
    state: '',
    contact_email: '',
    contact_phone: '',
    emergency_helpline: '',
    default_sla_hours: 48,
    pincodes: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text: '' }

  // PIN code management state
  const [newPin, setNewPin] = useState('');
  const [newLocality, setNewLocality] = useState('');
  const [isAddingPin, setIsAddingPin] = useState(false);
  const [pinActionError, setPinActionError] = useState(null);

  const fetchSettings = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await adminApi.getMunicipalSettings();
      if (res.success && res.data) {
        setSettings({
          name: res.data.name || '',
          code: res.data.code || '',
          state: res.data.state || '',
          contact_email: res.data.contact_email || '',
          contact_phone: res.data.contact_phone || '',
          emergency_helpline: res.data.emergency_helpline || '',
          default_sla_hours: res.data.default_sla_hours || 48,
          pincodes: Array.isArray(res.data.pincodes) ? res.data.pincodes : []
        });
      }
    } catch (err) {
      console.error('Failed to fetch municipal settings:', err);
      setStatusMessage({ type: 'error', text: 'Failed to load settings. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleAddPin = async (e) => {
    if (e) e.preventDefault();
    const clean = newPin.replace(/\D/g, '').slice(0, 6);
    if (clean.length !== 6) {
      setPinActionError('Please enter a valid 6-digit PIN code.');
      return;
    }
    if (settings.pincodes.includes(clean)) {
      setPinActionError(`PIN code ${clean} is already covered by this municipality.`);
      return;
    }

    setIsAddingPin(true);
    setPinActionError(null);
    try {
      const res = await adminApi.addMunicipalPincode(clean, newLocality.trim());
      if (res.success) {
        setSettings(prev => ({
          ...prev,
          pincodes: [...prev.pincodes, clean]
        }));
        setNewPin('');
        setNewLocality('');
        setStatusMessage({ type: 'success', text: `PIN code ${clean} successfully added and persisted to municipality jurisdiction.` });
      } else {
        setPinActionError(res.message || 'Failed to add PIN code.');
      }
    } catch (err) {
      setPinActionError('Network error while adding PIN code.');
    } finally {
      setIsAddingPin(false);
    }
  };

  const handleRemovePin = async (pinToRemove) => {
    if (!window.confirm(`Are you sure you want to unmap PIN code ${pinToRemove} from this municipality?`)) return;

    try {
      const res = await adminApi.removeMunicipalPincode(pinToRemove);
      if (res.success) {
        setSettings(prev => ({
          ...prev,
          pincodes: prev.pincodes.filter(p => p !== pinToRemove)
        }));
        setStatusMessage({ type: 'success', text: `PIN code ${pinToRemove} unmapped successfully.` });
      } else {
        alert(res.message || 'Failed to remove PIN code.');
      }
    } catch (err) {
      alert('Error removing PIN code.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);
    try {
      const payload = {
        contact_email: settings.contact_email,
        contact_phone: settings.contact_phone,
        emergency_helpline: settings.emergency_helpline,
        default_sla_hours: parseInt(settings.default_sla_hours, 10) || 48,
        pincodes: settings.pincodes
      };
      const res = await adminApi.updateMunicipalSettings(payload);
      if (res.success) {
        setStatusMessage({ type: 'success', text: 'Municipal settings successfully updated and saved.' });
      } else {
        setStatusMessage({ type: 'error', text: res.message || 'Failed to update settings.' });
      }
    } catch (err) {
      console.error('Failed to update municipal settings:', err);
      setStatusMessage({ type: 'error', text: 'Network error while saving settings.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Settings size={24} color="#D4FF00" />
            Municipal Configuration & Settings
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#94A3B8', marginTop: '0.3rem' }}>
            Manage civic authority metadata, SLA dispatch limits, emergency helplines, and jurisdictional PIN codes.
          </p>
        </div>

        <button
          onClick={fetchSettings}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            backgroundColor: '#18202A',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#CBD5E1',
            borderRadius: '8px',
            padding: '0.5rem 0.85rem',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Reload
        </button>
      </div>

      {statusMessage && (
        <div style={{
          padding: '0.9rem 1.25rem',
          borderRadius: '10px',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          backgroundColor: statusMessage.type === 'success' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: statusMessage.type === 'success' ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
          color: statusMessage.type === 'success' ? '#34D399' : '#EF4444',
          fontSize: '0.85rem',
          fontWeight: 600
        }}>
          {statusMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#64748B' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem auto' }} />
          <div>Loading configuration details...</div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Identity Card */}
          <div style={{
            backgroundColor: '#18202A',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={18} color="#D4FF00" />
              Civic Entity Information
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.4rem' }}>
                  Municipality Name (Authority)
                </label>
                <input
                  type="text"
                  value={settings.name}
                  disabled
                  style={{
                    width: '100%',
                    backgroundColor: '#12181F',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px',
                    padding: '0.6rem 0.8rem',
                    fontSize: '0.85rem',
                    color: '#94A3B8',
                    cursor: 'not-allowed'
                  }}
                />
                <span style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '0.25rem', display: 'block' }}>
                  Assigned by Master Government Admin
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.4rem' }}>
                  Official Corporation Code
                </label>
                <input
                  type="text"
                  value={settings.code}
                  disabled
                  style={{
                    width: '100%',
                    backgroundColor: '#12181F',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px',
                    padding: '0.6rem 0.8rem',
                    fontSize: '0.85rem',
                    color: '#94A3B8',
                    cursor: 'not-allowed'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.4rem' }}>
                  State / Jurisdiction
                </label>
                <input
                  type="text"
                  value={settings.state}
                  disabled
                  style={{
                    width: '100%',
                    backgroundColor: '#12181F',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px',
                    padding: '0.6rem 0.8rem',
                    fontSize: '0.85rem',
                    color: '#94A3B8',
                    cursor: 'not-allowed'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Contact & Helplines Card */}
          <div style={{
            backgroundColor: '#18202A',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Phone size={18} color="#D4FF00" />
              Public Contact & Emergency Helplines
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.4rem' }}>
                  Support / Grievance Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} color="#64748B" style={{ position: 'absolute', left: '10px', top: '12px' }} />
                  <input
                    type="email"
                    value={settings.contact_email}
                    onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
                    placeholder="contact@municipality.gov.in"
                    style={{
                      width: '100%',
                      backgroundColor: '#12181F',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      padding: '0.6rem 0.8rem 0.6rem 2.2rem',
                      fontSize: '0.85rem',
                      color: '#F8FAFC',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.4rem' }}>
                  Primary Desk Contact
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={15} color="#64748B" style={{ position: 'absolute', left: '10px', top: '12px' }} />
                  <input
                    type="text"
                    value={settings.contact_phone}
                    onChange={(e) => setSettings({ ...settings, contact_phone: e.target.value })}
                    placeholder="+91-551-2200000"
                    style={{
                      width: '100%',
                      backgroundColor: '#12181F',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      padding: '0.6rem 0.8rem 0.6rem 2.2rem',
                      fontSize: '0.85rem',
                      color: '#F8FAFC',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.4rem' }}>
                  Emergency Civic Helpline
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={15} color="#EF4444" style={{ position: 'absolute', left: '10px', top: '12px' }} />
                  <input
                    type="text"
                    value={settings.emergency_helpline}
                    onChange={(e) => setSettings({ ...settings, emergency_helpline: e.target.value })}
                    placeholder="1533 or 1800-XXX-XXXX"
                    style={{
                      width: '100%',
                      backgroundColor: '#12181F',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      padding: '0.6rem 0.8rem 0.6rem 2.2rem',
                      fontSize: '0.85rem',
                      color: '#F8FAFC',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SLA & Governance Card */}
          <div style={{
            backgroundColor: '#18202A',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} color="#D4FF00" />
              Service Level Agreement (SLA) Defaults
            </h3>

            <div style={{ maxWidth: '400px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.4rem' }}>
                Default Citizen Resolution Window (Hours)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="number"
                  min="6"
                  max="168"
                  value={settings.default_sla_hours}
                  onChange={(e) => setSettings({ ...settings, default_sla_hours: e.target.value })}
                  style={{
                    width: '120px',
                    backgroundColor: '#12181F',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '0.6rem 0.8rem',
                    fontSize: '0.85rem',
                    color: '#F8FAFC',
                    outline: 'none'
                  }}
                />
                <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                  Hours (Standard civic turnaround: 48h)
                </span>
              </div>
            </div>
          </div>

          {/* Jurisdictional Coverage PINs (Interactive Add & Manage) */}
          <div style={{
            backgroundColor: '#18202A',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <MapPin size={18} color="#D4FF00" />
                  Active Covered PIN Codes ({settings.pincodes.length})
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', marginTop: '0.2rem' }}>
                  Citizen complaints reported in these postal codes automatically route to your corporation queue
                </span>
              </div>
            </div>

            {/* Quick Add PIN Form */}
            <div style={{
              backgroundColor: '#12181F',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1.25rem'
            }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.6rem' }}>
                Add New Covered PIN Code
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                <input
                  type="text"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => {
                    setNewPin(e.target.value.replace(/\D/g, ''));
                    setPinActionError(null);
                  }}
                  placeholder="6-digit PIN (e.g. 273010)"
                  style={{
                    width: '180px',
                    backgroundColor: '#18202A',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '8px',
                    padding: '0.55rem 0.8rem',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: '#D4FF00',
                    outline: 'none'
                  }}
                />
                <input
                  type="text"
                  value={newLocality}
                  onChange={(e) => setNewLocality(e.target.value)}
                  placeholder="Locality / Zone (optional)"
                  style={{
                    flex: '1',
                    minWidth: '200px',
                    backgroundColor: '#18202A',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '8px',
                    padding: '0.55rem 0.8rem',
                    fontSize: '0.82rem',
                    color: '#F8FAFC',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddPin}
                  disabled={isAddingPin || newPin.length !== 6}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    backgroundColor: newPin.length === 6 ? '#D4FF00' : 'rgba(212, 255, 0, 0.2)',
                    color: newPin.length === 6 ? '#0B0F12' : '#64748B',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.55rem 1.1rem',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: newPin.length === 6 && !isAddingPin ? 'pointer' : 'not-allowed',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isAddingPin ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={15} />}
                  <span>Add PIN Code</span>
                </button>
              </div>

              {pinActionError && (
                <div style={{ marginTop: '0.5rem', color: '#EF4444', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <AlertCircle size={13} />
                  <span>{pinActionError}</span>
                </div>
              )}
            </div>

            {/* List of Covered PINs with Remove Option */}
            {settings.pincodes.length === 0 ? (
              <div style={{ padding: '1.25rem', backgroundColor: '#12181F', borderRadius: '10px', color: '#94A3B8', fontSize: '0.8rem', textAlign: 'center' }}>
                No postal codes mapped yet. Add a PIN code above to route complaints here.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
                {settings.pincodes.map((pin, idx) => (
                  <span
                    key={idx}
                    style={{
                      backgroundColor: 'rgba(212, 255, 0, 0.08)',
                      border: '1px solid rgba(212, 255, 0, 0.25)',
                      color: '#D4FF00',
                      borderRadius: '8px',
                      padding: '0.4rem 0.65rem 0.4rem 0.8rem',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <span>📍 {pin}</span>
                    <button
                      type="button"
                      onClick={() => handleRemovePin(pin)}
                      title={`Remove PIN ${pin}`}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'rgba(212, 255, 0, 0.6)',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '4px',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(212, 255, 0, 0.6)'; }}
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Save Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#D4FF00',
                color: '#0B0F12',
                border: 'none',
                borderRadius: '10px',
                padding: '0.75rem 1.75rem',
                fontSize: '0.88rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Saving Changes...' : 'Save Municipal Settings'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
