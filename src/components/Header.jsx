import React, { useState, useEffect } from 'react';
import { Sun, Moon, GraduationCap, Bell, User, Menu, X, ChevronDown, Key } from 'lucide-react';
import PhazonLogo from './PhazonLogo';
import { fetchUnreadNotificationCount, fetchMyNotifications, markNotificationRead, markAllNotificationsRead } from '../lib/api';

const Header = ({
  theme,
  setTheme,
  palette,
  setPalette,
  currentRole,
  setCurrentRole,
  currentPage,
  setCurrentPage,
  weather,
  temp
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [paletteDropdownOpen, setPaletteDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Read logged in user profile details
  useEffect(() => {
    const userJson = localStorage.getItem('phazon_logged_in_user');
    if (userJson) {
      setUserProfile(JSON.parse(userJson));
      loadUnreadCount();
    } else {
      setUserProfile(null);
      setUnreadCount(0);
    }
  }, [currentRole, currentPage]);

  const loadUnreadCount = async () => {
    try {
      const { count } = await fetchUnreadNotificationCount();
      setUnreadCount(count);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    let interval;
    if (userProfile) {
      interval = setInterval(loadUnreadCount, 60000); // Poll every minute
    }
    return () => clearInterval(interval);
  }, [userProfile]);

  const handleNotificationClick = async () => {
    if (!notificationDropdownOpen) {
      setNotificationDropdownOpen(true);
      setProfileDropdownOpen(false);
      setLoadingNotifications(true);
      try {
        const data = await fetchMyNotifications();
        setNotifications(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingNotifications(false);
      }
    } else {
      setNotificationDropdownOpen(false);
    }
  };

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      loadUnreadCount();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const palettes = [
    { id: 'indigo', name: 'Indigo', color: '#4f46e5' },
    { id: 'emerald', name: 'Emerald', color: '#059669' },
    { id: 'violet', name: 'Violet', color: '#7c3aed' },
    { id: 'amber', name: 'Amber', color: '#d97706' },
    { id: 'crimson', name: 'Crimson', color: '#e11d48' },
    { id: 'cyan', name: 'Cyan', color: '#0891b2' },
    { id: 'rose', name: 'Rose', color: '#db2777' },
    { id: 'orange', name: 'Orange', color: '#ea580c' },
    { id: 'teal', name: 'Teal', color: '#0d9488' },
    { id: 'blue', name: 'Blue', color: '#2563eb' },
    { id: 'lime', name: 'Lime', color: '#65a30d' },
  ];

  const handleSignOut = () => {
    localStorage.removeItem('phazon_auth_token');
    localStorage.removeItem('phazon_logged_in_user');
    setCurrentRole('guest');
    setCurrentPage('landing');
    setProfileDropdownOpen(false);
    setUserProfile(null);
  };

  const handleWorkspaceRedirect = () => {
    if (currentRole === 'guest') {
      setCurrentPage('auth');
    } else {
      setCurrentPage('dashboard');
    }
    setProfileDropdownOpen(false);
  };

  const handleNavClick = (page) => {
    setCurrentPage(page);
    setMobileMenuOpen(false);
  };

  return (
    <header className="header-container glass-panel no-print" style={{ borderRadius: '0px 0px var(--radius-lg) var(--radius-lg)', borderTop: 'none', position: 'sticky', top: 0, zIndex: 999, transition: 'all 0.3s ease' }}>
      <div className="container header-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '76px' }}>
        
        {/* OFFICIAL PHAZON RABBIT EMBLEM LOGO */}
        <div className="logo-section" onClick={() => handleNavClick('landing')} style={{ cursor: 'pointer' }}>
          <PhazonLogo size="medium" variant="full" />
        </div>

        {/* DESKTOP NAV */}
        <nav className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          <button 
            className="nav-link"
            onClick={() => handleNavClick('landing')}
            style={{ background: 'none', border: 'none', color: currentPage === 'landing' ? 'var(--primary)' : 'var(--text-subtle)', fontWeight: 650, fontSize: '0.92rem', cursor: 'pointer', transition: 'color var(--transition-fast)' }}
          >
            Home
          </button>
          <button 
            className="nav-link"
            onClick={() => handleNavClick('courses')}
            style={{ background: 'none', border: 'none', color: currentPage === 'courses' ? 'var(--primary)' : 'var(--text-subtle)', fontWeight: 650, fontSize: '0.92rem', cursor: 'pointer', transition: 'color var(--transition-fast)' }}
          >
            Courses
          </button>
          <button 
            className="nav-link"
            onClick={() => handleNavClick('about')}
            style={{ background: 'none', border: 'none', color: currentPage === 'about' ? 'var(--primary)' : 'var(--text-subtle)', fontWeight: 650, fontSize: '0.92rem', cursor: 'pointer', transition: 'color var(--transition-fast)' }}
          >
            About
          </button>
        </nav>

        {/* CONTROLS */}
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Weather Widget */}
          {temp && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', background: 'var(--bg-surface-hover)' }}>
              <span>⛅ {temp}°C</span>
              <span style={{ opacity: 0.7, fontSize: '0.75rem' }}>({weather})</span>
            </div>
          )}

          {/* Theme Toggle Button */}
          <button 
            className="btn btn-outline"
            onClick={toggleTheme}
            style={{ padding: '8px', borderRadius: '50%', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Toggle theme mode"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {/* Notification Bell */}
          {userProfile && (
            <div style={{ position: 'relative' }}>
              <button 
                className="btn btn-outline"
                onClick={handleNotificationClick}
                style={{ padding: '8px', borderRadius: '50%', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
                title="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: -2, right: -2, background: '#ef4444', color: 'white', fontSize: '0.65rem', fontWeight: 'bold', padding: '2px 6px', borderRadius: '10px', minWidth: '18px', textAlign: 'center' }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {notificationDropdownOpen && (
                <div className="glass-panel" style={{ position: 'absolute', right: 0, top: '48px', width: '320px', borderRadius: 'var(--radius-md)', padding: '0', zIndex: 1000, display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-md)', maxHeight: '400px', overflowY: 'auto' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--bg-surface)', zIndex: 2 }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Notifications</h4>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}>Mark all read</button>
                    )}
                  </div>
                  
                  <div style={{ padding: '8px 0' }}>
                    {loadingNotifications ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading...</div>
                    ) : notifications.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No new notifications.</div>
                    ) : (
                      notifications.map(n => (
                        <div 
                          key={n.id} 
                          onClick={() => { if(!n.is_read) handleMarkAsRead(n.id, {stopPropagation:()=>{}}) }}
                          style={{ 
                            padding: '12px 16px', 
                            borderBottom: '1px solid var(--border-color)',
                            background: n.is_read ? 'transparent' : 'var(--bg-surface-hover)',
                            cursor: 'pointer',
                            display: 'flex',
                            gap: '12px',
                            transition: 'background var(--transition-fast)'
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                              <strong style={{ fontSize: '0.85rem', color: n.is_read ? 'var(--text-subtle)' : 'var(--text-main)' }}>{n.title}</strong>
                              {!n.is_read && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, marginTop: 4 }}></span>}
                            </div>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{n.message}</p>
                            <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '6px', opacity: 0.7 }}>
                              {new Date(n.created_at).toLocaleDateString()} {new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Role Profile Menu */}
          {userProfile ? (
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="btn btn-primary"
                style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <User size={16} />
                <span>{userProfile.name} ({currentRole.toUpperCase()})</span>
                <ChevronDown size={14} />
              </button>

              {profileDropdownOpen && (
                <div className="glass-panel" style={{ position: 'absolute', right: 0, top: '48px', width: '220px', borderRadius: 'var(--radius-md)', padding: '12px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '6px', boxShadow: 'var(--shadow-md)' }}>
                  <div style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>
                    <p style={{ fontWeight: 800, fontSize: '0.88rem' }}>{userProfile.name}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{userProfile.email || 'Role: ' + currentRole}</p>
                  </div>
                  <button onClick={handleWorkspaceRedirect} className="btn btn-outline" style={{ justifyContent: 'flex-start', fontSize: '0.82rem', padding: '8px 12px' }}>
                    <User size={14} /> My Workspace
                  </button>
                  <button onClick={handleSignOut} className="btn btn-outline" style={{ justifyContent: 'flex-start', fontSize: '0.82rem', padding: '8px 12px', color: '#ef4444' }}>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button 
              className="btn btn-primary"
              onClick={() => handleNavClick('auth')}
              style={{ padding: '8px 20px', fontSize: '0.88rem' }}
            >
              Portal Login
            </button>
          )}
        </div>

      </div>
    </header>
  );
};

export default Header;