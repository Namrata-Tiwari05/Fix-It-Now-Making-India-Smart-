import React, { useState, useEffect } from 'react';
import { HomeView } from './pages/HomeView.jsx';
import { ComplaintDetailView } from './pages/ComplaintDetailView.jsx';
import { MyReportsView } from './pages/MyReportsView.jsx';
import { CityMapView } from './pages/CityMapView.jsx';
import { NotificationsView } from './pages/NotificationsView.jsx';
import { ProfileView } from './pages/ProfileView.jsx';
import { HelpView } from './pages/HelpView.jsx';
import { FAQView } from './pages/FAQView.jsx';
import { BylawsView } from './pages/BylawsView.jsx';
import { CitizenLogin } from './pages/CitizenLogin.jsx';
import { BottomNav } from './components/BottomNav.jsx';
import { NavigationDrawer } from './components/NavigationDrawer.jsx';
import { LogoutConfirmModal } from './components/LogoutConfirmModal.jsx';
import { ReportIssueModal } from './features/ReportIssueModal.jsx';
import { api } from './services/api.js';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => api.getUser());
  const [activeTab, setActiveTab] = useState('home');
  const [navHistory, setNavHistory] = useState(['home']);
  const [selectedComplaintId, setSelectedComplaintId] = useState(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [complaints, setComplaints] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Persistent Theme State ('dark' | 'light')
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('fixitnow_theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('fixitnow_theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Validate and synchronize session with authoritative server profile on mount
  useEffect(() => {
    const token = api.getToken();
    if (token) {
      api.getMe().then((res) => {
        if (res.success && res.data) {
          api.setSession(token, res.data);
          setCurrentUser(res.data);
        } else if (res.error?.code === 'UNAUTHORIZED' || res.error?.code === 'INVALID_TOKEN') {
          api.clearSession();
          setCurrentUser(null);
        }
      }).catch(() => {
        // Server offline or starting up, retain session
      });
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  const fetchData = async () => {
    try {
      const [compRes, notifRes] = await Promise.all([
        api.getMyComplaints(),
        api.getNotifications()
      ]);

      if (compRes.success && Array.isArray(compRes.data)) {
        setComplaints(compRes.data);
      } else if (compRes.error?.code === 'UNAUTHORIZED' || compRes.error?.code === 'INVALID_TOKEN') {
        api.clearSession();
        setCurrentUser(null);
      }
      if (notifRes.success && Array.isArray(notifRes.data)) {
        setNotifications(notifRes.data);
      }
    } catch (e) {
      console.warn('Failed to load initial citizen data:', e);
    }
  };

  const handleLoginSuccess = (user, token) => {
    setCurrentUser(user);
    setActiveTab('home');
    setNavHistory(['home']);
  };

  const handleRequestLogout = () => {
    setIsDrawerOpen(false);
    setIsLogoutModalOpen(true);
  };

  const handleConfirmLogout = () => {
    try {
      api.clearSession();
      setCurrentUser(null);
      setSelectedComplaintId(null);
      setActiveTab('home');
      setNavHistory(['home']);
      setIsDrawerOpen(false);
      setIsLogoutModalOpen(false);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleNavigate = (targetView) => {
    setSelectedComplaintId(null);
    setNavHistory(prev => {
      if (prev[prev.length - 1] === targetView) return prev;
      return [...prev, targetView];
    });
    setActiveTab(targetView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = (fallbackView = 'home') => {
    setSelectedComplaintId(null);
    setNavHistory(prev => {
      if (prev.length > 1) {
        const next = [...prev];
        next.pop();
        const previousView = next[next.length - 1];
        setActiveTab(previousView || fallbackView);
        return next;
      } else {
        setActiveTab(fallbackView);
        return [fallbackView];
      }
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateProfile = () => {
    handleNavigate('profile');
    setIsDrawerOpen(false);
  };

  const handleSelectComplaint = (id) => {
    setSelectedComplaintId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackFromDetail = () => {
    setSelectedComplaintId(null);
    fetchData();
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Unauthenticated Citizen State -> Citizen Phone OTP Login
  if (!currentUser) {
    return <CitizenLogin onLoginSuccess={handleLoginSuccess} />;
  }

  // Incomplete Citizen Profile State -> Redirect directly to Create Profile Step
  if (!currentUser.is_profile_completed) {
    return (
      <CitizenLogin
        initialStep="profile"
        initialPhone={currentUser.phone ? currentUser.phone.replace('+91', '') : ''}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary, #0B0F12)',
        color: 'var(--text-primary, #F8FAFC)',
        transition: 'background-color 0.25s ease, color 0.25s ease'
      }}
    >
      {/* If a specific complaint is selected, show Detail View */}
      {selectedComplaintId ? (
        <ComplaintDetailView
          complaintId={selectedComplaintId}
          onBack={handleBackFromDetail}
        />
      ) : (
        /* Tab Navigation Views */
        <main>
          {activeTab === 'home' && (
            <HomeView
              user={currentUser}
              complaints={complaints}
              onOpenReport={() => setIsReportOpen(true)}
              onSelectComplaint={handleSelectComplaint}
              onOpenDrawer={() => setIsDrawerOpen(true)}
              unreadCount={unreadCount}
            />
          )}

          {activeTab === 'reports' && (
            <MyReportsView
              complaints={complaints}
              onSelectComplaint={handleSelectComplaint}
              onOpenReport={() => setIsReportOpen(true)}
            />
          )}

          {activeTab === 'map' && (
            <CityMapView
              user={currentUser}
              complaints={complaints}
              onSelectComplaint={handleSelectComplaint}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationsView
              notifications={notifications}
              onSelectComplaint={handleSelectComplaint}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileView
              user={currentUser}
              onLogout={handleRequestLogout}
              onBack={() => handleBack('home')}
              onNavigate={handleNavigate}
            />
          )}

          {activeTab === 'help' && (
            <HelpView
              onBack={() => handleBack('profile')}
            />
          )}

          {activeTab === 'faq' && (
            <FAQView
              onBack={() => handleBack('profile')}
            />
          )}

          {activeTab === 'bylaws' && (
            <BylawsView
              onBack={() => handleBack('profile')}
            />
          )}
        </main>
      )}

      {/* Slide-out Navigation Drawer (approx. half screen width) */}
      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        user={currentUser}
        onNavigateProfile={handleNavigateProfile}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onRequestLogout={handleRequestLogout}
      />

      {/* Logout Confirmation Dialog Modal */}
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onCancel={() => setIsLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
      />

      {/* Floating Report Modal Flow */}
      <ReportIssueModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        onSuccess={() => {
          fetchData();
        }}
        onSelectComplaint={handleSelectComplaint}
      />

      {/* Mobile-First Bottom Navigation Bar */}
      <BottomNav
        activeTab={
          ['home', 'reports', 'map', 'notifications'].includes(activeTab) && !selectedComplaintId
            ? activeTab
            : null
        }
        onSelectTab={(tab) => handleNavigate(tab)}
        onOpenReport={() => setIsReportOpen(true)}
        unreadCount={unreadCount}
      />
    </div>
  );
}
