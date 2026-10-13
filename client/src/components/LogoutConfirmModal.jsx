import React from 'react';
import { LogOut, AlertTriangle, X } from 'lucide-react';

export const LogoutConfirmModal = ({ isOpen, onCancel, onConfirm, loading = false }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 110,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem'
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.72)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)'
        }}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-title"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '380px',
          backgroundColor: 'var(--modal-bg, #12181F)',
          color: 'var(--text-primary, #F8FAFC)',
          borderRadius: '22px',
          border: '1px solid var(--border-medium, rgba(255, 255, 255, 0.12))',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.65)',
          padding: '1.5rem',
          zIndex: 120,
          boxSizing: 'border-box',
          animation: 'modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}
      >
        {/* Close Icon in corner */}
        <button
          onClick={onCancel}
          aria-label="Close dialog"
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted, #94A3B8)',
            cursor: 'pointer',
            padding: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px'
          }}
        >
          <X size={18} />
        </button>

        {/* Warning Icon Graphic */}
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '16px',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#EF4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem'
          }}
        >
          <LogOut size={26} />
        </div>

        {/* Heading */}
        <h3
          id="logout-title"
          style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            marginBottom: '0.5rem',
            lineHeight: 1.25,
            color: 'var(--text-primary, #F8FAFC)'
          }}
        >
          Do you really want to log out?
        </h3>

        {/* Description */}
        <p
          style={{
            fontSize: '0.82rem',
            color: 'var(--text-secondary, #94A3B8)',
            lineHeight: 1.45,
            marginBottom: '1.5rem'
          }}
        >
          You will be signed out of your verified citizen account. You will need to verify via mobile OTP again to sign in.
        </p>

        {/* Action Buttons: Cancel vs Yes, Log Out */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.75rem'
          }}
        >
          {/* Cancel */}
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: '0.8rem 1rem',
              borderRadius: '12px',
              backgroundColor: 'var(--badge-bg, rgba(255, 255, 255, 0.06))',
              border: '1px solid var(--border-medium, rgba(255, 255, 255, 0.12))',
              color: 'var(--text-primary, #F8FAFC)',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s ease',
              textAlign: 'center'
            }}
          >
            Cancel
          </button>

          {/* Yes, Log Out */}
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '0.8rem 1rem',
              borderRadius: '12px',
              backgroundColor: '#EF4444',
              border: '1px solid rgba(239, 68, 68, 0.8)',
              color: '#FFFFFF',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
              transition: 'transform 0.15s ease, opacity 0.15s ease',
              textAlign: 'center'
            }}
          >
            {loading ? 'Logging out...' : 'Yes, Log Out'}
          </button>
        </div>
      </div>
    </div>
  );
};
