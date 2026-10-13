import React, { useState } from 'react';
import { Shield, ArrowRight, Lock, Mail, RefreshCw, Sparkles, Building2 } from 'lucide-react';
import { adminApi } from '../services/api.js';

export const StaffLogin = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter both your official email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await adminApi.staffLogin(email.trim(), password);

      if (res.success && res.data?.user) {
        adminApi.setSession(res.data.token, res.data.user);
        onLoginSuccess(res.data.user, res.data.token);
      } else {
        setError(res.error?.message || 'Invalid email or password. Please verify credentials.');
      }
    } catch (err) {
      setError(err.message || 'Connection error. Please ensure backend server is operational.');
    } finally {
      setLoading(false);
    }
  };

  // Development Quick-Fill helper buttons (Purely for dev speed; credentials are real in Supabase)
  const handleQuickFill = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('FixItNow@2026!');
    setError(null);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0B0F12',
        color: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '1.5rem',
        position: 'relative'
      }}
    >
      {/* Background Accent Blur */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          width: '380px',
          height: '380px',
          borderRadius: '50%',
          backgroundColor: 'rgba(212, 255, 0, 0.03)',
          filter: 'blur(100px)',
          pointerEvents: 'none'
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#12181F',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '2.25rem 2rem',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
          zIndex: 1
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              backgroundColor: '#D4FF00',
              color: '#0B0F12',
              fontSize: '1.8rem',
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.85rem auto',
              boxShadow: '0 0 25px rgba(212, 255, 0, 0.3)'
            }}
          >
            F
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em' }}>
            FixItNow Staff Portal
          </h1>
          <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '0.25rem' }}>
            Unified Access for Master Admins, Municipalities & Field Officers
          </p>
        </div>

        {/* ERROR BANNER */}
        {error && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '0.75rem 1rem',
              color: '#EF4444',
              fontSize: '0.8rem',
              marginBottom: '1.25rem',
              lineHeight: 1.4
            }}
          >
            {error}
          </div>
        )}

        {/* LOGIN FORM (Email + Password only, NO role dropdown!) */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#CBD5E1', fontWeight: 600, marginBottom: '0.45rem' }}>
              Official Email Address
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#18202A',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '12px',
                padding: '0 1rem'
              }}
            >
              <Mail size={16} color="#94A3B8" />
              <input
                type="email"
                placeholder="officer@fixitnow.gov"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  flex: 1,
                  backgroundColor: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#F8FAFC',
                  fontSize: '0.92rem',
                  padding: '0.85rem 0.75rem'
                }}
                autoFocus
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
              <label style={{ fontSize: '0.8rem', color: '#CBD5E1', fontWeight: 600 }}>
                Password
              </label>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#18202A',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '12px',
                padding: '0 1rem'
              }}
            >
              <Lock size={16} color="#94A3B8" />
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  flex: 1,
                  backgroundColor: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#F8FAFC',
                  fontSize: '0.92rem',
                  padding: '0.85rem 0.75rem'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !email.trim() || !password.trim()}
            className="btn-lime"
            style={{
              width: '100%',
              padding: '0.85rem',
              borderRadius: '14px',
              fontSize: '0.95rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              cursor: loading || !email.trim() || !password.trim() ? 'not-allowed' : 'pointer',
              opacity: loading || !email.trim() || !password.trim() ? 0.6 : 1
            }}
          >
            {loading ? <RefreshCw size={18} className="animate-spin" /> : <>Sign In <ArrowRight size={18} /></>}
          </button>
        </form>

        {/* Development Helper: Quick-Fill Verified Accounts */}
        <div style={{ marginTop: '1.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1.25rem' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748B', display: 'block', textTransform: 'uppercase', marginBottom: '0.65rem', fontWeight: 700 }}>
            Development Quick Fill
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
            <button
              type="button"
              onClick={() => handleQuickFill('masteradmin@fixitnow.gov')}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '0.45rem 0.3rem',
                color: '#CBD5E1',
                fontSize: '0.72rem',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              Master Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('admin.gmc@gorakhpurmc.gov.in')}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '0.45rem 0.3rem',
                color: '#CBD5E1',
                fontSize: '0.72rem',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              Municipal Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('officer.roads@gorakhpurmc.gov.in')}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '0.45rem 0.3rem',
                color: '#CBD5E1',
                fontSize: '0.72rem',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              Field Officer
            </button>
          </div>
        </div>

        {/* Security Notice */}
        <div style={{ marginTop: '1.25rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <Shield size={14} color="#64748B" />
          <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
            Supabase Auth & Database RBAC Enforced
          </span>
        </div>
      </div>
    </div>
  );
};
