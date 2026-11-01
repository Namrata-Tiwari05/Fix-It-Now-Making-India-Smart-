import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled runtime error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#0B0F12',
          color: '#F8FAFC',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.25rem',
            color: '#EF4444'
          }}>
            <AlertTriangle size={32} />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem', color: '#F8FAFC' }}>
            Application Encountered an Unexpected Issue
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#94A3B8', maxWidth: '480px', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            {this.state.error?.message || 'A runtime error occurred in the operational view.'}
          </p>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '10px',
                backgroundColor: '#1E293B',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#F8FAFC',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Try Again
            </button>
            <button
              onClick={this.handleReload}
              className="btn-lime"
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '10px',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <RefreshCw size={15} /> Reload Portal
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

