import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar.jsx';
import { Topbar } from './components/Topbar.jsx';
import { StaffLogin } from './pages/StaffLogin.jsx';
import { FieldOfficerApp } from './pages/officer/FieldOfficerApp.jsx';
import { MunicipalOverview } from './pages/municipal/MunicipalOverview.jsx';
import { MunicipalComplaints } from './pages/municipal/MunicipalComplaints.jsx';
import { SlaEscalationsView } from './pages/municipal/SlaEscalationsView.jsx';
import { OperationsMapView } from './pages/municipal/OperationsMapView.jsx';
import { DepartmentsView } from './pages/municipal/DepartmentsView.jsx';
import { OfficersView } from './pages/municipal/OfficersView.jsx';
import { AnalyticsView } from './pages/municipal/AnalyticsView.jsx';
import { MunicipalNotificationsView } from './pages/municipal/MunicipalNotificationsView.jsx';
import { MunicipalSettingsView } from './pages/municipal/MunicipalSettingsView.jsx';
import { MasterAdminView } from './pages/master/MasterAdminView.jsx';
import { ComplaintDetailDrawer } from './pages/municipal/ComplaintDetailDrawer.jsx';
import { adminApi } from './services/api.js';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => adminApi.getUser());
  const [activeSection, setActiveSection] = useState('overview');
  const [selectedComplaintId, setSelectedComplaintId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'master_admin') {
        setActiveSection('master_overview');
      } else {
        setActiveSection('overview');
      }

      // Fetch unread notifications count
      adminApi.getNotifications()
        .then(res => {
          if (res.success && Array.isArray(res.data)) {
            const unread = res.data.filter(n => !n.is_read).length;
            setUnreadCount(unread);
          }
        })
        .catch(err => console.error('Failed to fetch initial notifications:', err));
    }
  }, [currentUser]);

  const handleLoginSuccess = (user, token) => {
    setCurrentUser(user);
    if (user.role === 'master_admin') {
      setActiveSection('master_overview');
    } else {
      setActiveSection('overview');
    }
  };

  const handleLogout = () => {
    adminApi.clearSession();
    setCurrentUser(null);
    setSelectedComplaintId(null);
  };

  // 1. Unauthenticated Staff -> Render Unified Staff Login Page
  if (!currentUser) {
    return <StaffLogin onLoginSuccess={handleLoginSuccess} />;
  }

  // 2. Field Officer -> Dedicated Mobile-First Field Officer Application
  if (currentUser.role === 'field_officer') {
    return <FieldOfficerApp user={currentUser} onLogout={handleLogout} />;
  }

  // 3. Desktop Command Center (Master Admin / Municipal Admin)
  const getSectionTitle = () => {
    if (currentUser.role === 'master_admin') return 'National & State Civic Authority';
    switch (activeSection) {
      case 'overview': return 'Command Center Overview';
      case 'complaints': return 'Complaint Operations & Triage';
      case 'map': return 'Operations & Ward Map';
      case 'departments': return 'Municipal Departments';
      case 'officers': return 'Field Officers Squad';
      case 'sla': return 'SLA & Escalations Monitoring';
      case 'analytics': return 'Operational Analytics';
      case 'notifications': return 'Municipal Alerts & Notifications';
      case 'settings': return 'Municipal Configuration & Settings';
      default: return 'FixItNow Municipal Portal';
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0B0F12', color: '#F8FAFC' }}>

      {/* Fixed Left Sidebar */}
      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        currentRole={currentUser.role}
        onSwitchRole={handleLogout}
        municipalityName={currentUser.municipality_name || 'Gorakhpur Municipal Corporation'}
      />

      {/* Main Workspace (Offset by 260px) */}
      <div style={{ flex: 1, marginLeft: '260px', display: 'flex', flexDirection: 'column' }}>

        {/* Top Header */}
        <Topbar
          title={getSectionTitle()}
          subtitle={currentUser.role === 'master_admin' ? 'Master Government Admin View' : `${currentUser.municipality_name || 'Gorakhpur Municipal Corporation'} (${currentUser.municipality_code || 'GMC-UP'})`}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          unreadCount={unreadCount}
          onLogout={handleLogout}
        />

        {/* Dynamic Section Views */}
        <main style={{ flex: 1 }}>

          {/* Municipal Admin Views (All 9 sections) */}
          {currentUser.role === 'municipal_admin' && (
            <>
              {activeSection === 'overview' && (
                <MunicipalOverview
                  onSelectComplaint={setSelectedComplaintId}
                  currentRole={currentUser.role}
                  onLogout={handleLogout}
                />
              )}
              {activeSection === 'complaints' && (
                <MunicipalComplaints
                  onSelectComplaint={setSelectedComplaintId}
                  currentRole={currentUser.role}
                />
              )}
              {activeSection === 'map' && (
                <OperationsMapView
                  onSelectComplaint={setSelectedComplaintId}
                  currentRole={currentUser.role}
                />
              )}
              {activeSection === 'departments' && (
                <DepartmentsView currentRole={currentUser.role} />
              )}
              {activeSection === 'officers' && (
                <OfficersView currentRole={currentUser.role} />
              )}
              {activeSection === 'sla' && (
                <SlaEscalationsView
                  onSelectComplaint={setSelectedComplaintId}
                  currentRole={currentUser.role}
                />
              )}
              {activeSection === 'analytics' && (
                <AnalyticsView />
              )}
              {activeSection === 'notifications' && (
                <MunicipalNotificationsView
                  onSelectComplaint={setSelectedComplaintId}
                />
              )}
              {activeSection === 'settings' && (
                <MunicipalSettingsView />
              )}
            </>
          )}

          {/* Master Government Admin Views (All 6 sections handled inside MasterAdminView) */}
          {currentUser.role === 'master_admin' && (
            <MasterAdminView
              activeTab={activeSection}
              onSelectComplaint={setSelectedComplaintId}
            />
          )}

        </main>

      </div>

      {/* Complaint Detail Drawer */}
      {selectedComplaintId && (
        <ComplaintDetailDrawer
          complaintId={selectedComplaintId}
          onClose={() => setSelectedComplaintId(null)}
          onUpdated={() => {}}
          currentRole={currentUser.role}
        />
      )}

    </div>
  );
}
