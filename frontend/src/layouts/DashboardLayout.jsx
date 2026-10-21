import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  LogOut,
  Bell,
  Sparkles,
  Bot,
  User,
  Shield,
  Layers,
  ChevronRight,
  Wifi,
  ExternalLink,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AIAssistantDrawer from '../components/AIAssistantDrawer';

export default function DashboardLayout({ title, navItems, activeTab, onTabChange, children }) {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    async function loadNotifications() {
      if (token) {
        try {
          const res = await fetch('/api/v1/notifications', {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setUnreadNotifications(data.unread_count);
            setNotifications(data.notifications || []);
          }
        } catch (e) {
          console.error("Notifications fetch error:", e);
        }
      }
    }
    loadNotifications();
  }, [token]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getRoleBadge = (role) => {
    if (role === 'admin') return <span className="badge badge-error">ADMINISTRATOR</span>;
    if (role === 'staff') return <span className="badge badge-warning">FACULTY</span>;
    return <span className="badge badge-success">STUDENT</span>;
  };

  const getUserInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg-main)' }}>
      {/* Top Glassmorphic Navigation Bar */}
      <header style={{
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(226, 232, 240, 0.85)',
        padding: '0.75rem 1.75rem',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
      }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Brand Mark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-white)',
              boxShadow: '0 6px 16px -2px rgba(249, 115, 22, 0.35)',
            }}>
              <GraduationCap size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontFamily: 'var(--font-brand)', fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-text-main)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                  CAMPON <span style={{ color: 'var(--color-primary)' }}>U</span>
                </span>
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  backgroundColor: 'var(--color-primary-subtle)',
                  color: 'var(--color-primary-dark)',
                  padding: '0.15rem 0.45rem',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid rgba(249, 115, 22, 0.25)',
                }}>
                  OS v2.0
                </span>
              </div>
              <div style={{ fontSize: '0.725rem', color: 'var(--color-text-secondary)', fontWeight: 500, marginTop: '2px' }}>
                Next-Gen College Operating System
              </div>
            </div>
          </div>

          {/* Right Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            {/* Live Campus Telemetry Pill */}
            <div style={{
              display: 'none',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: 'var(--color-bg-subtle)',
              padding: '0.35rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 500,
              color: 'var(--color-text-secondary)',
            }} className="desktop-indicator">
              <span className="pulse-dot pulse-green" />
              <span>Campus Live</span>
            </div>

            {/* AI Assistant Glow Button */}
            <button
              onClick={() => setIsAiOpen(true)}
              className="btn-primary"
              style={{
                padding: '0.5rem 0.95rem',
                fontSize: '0.825rem',
                borderRadius: 'var(--radius-full)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: 'var(--shadow-primary)',
              }}
              id="open-ai-assistant-btn"
            >
              <Sparkles size={15} /> AI Assistant
            </button>

            {/* Notification Bell Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                style={{
                  position: 'relative',
                  width: '38px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-text-secondary)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: showNotifications ? 'var(--color-bg-subtle)' : '#FFFFFF',
                  border: '1px solid var(--color-border)',
                  boxShadow: 'var(--shadow-xs)',
                }}
                id="notifications-bell-btn"
                aria-label="Notifications"
              >
                <Bell size={18} />
                {unreadNotifications > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-3px',
                    right: '-3px',
                    backgroundColor: 'var(--color-error)',
                    color: 'var(--color-white)',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 4px rgba(239, 68, 68, 0.4)',
                  }}>
                    {unreadNotifications}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '125%',
                  width: '340px',
                  backgroundColor: 'var(--color-white)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-xl)',
                  padding: '1.15rem',
                  zIndex: 50,
                }} className="animate-fade-in">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Bell size={15} color="var(--color-primary)" />
                      <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-main)' }}>Notifications</h4>
                    </div>
                    <span style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>{notifications.length} alerts</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '280px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                        No new notifications
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          style={{
                            padding: '0.65rem 0.75rem',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: n.is_read ? 'transparent' : 'var(--color-bg-subtle)',
                            border: '1px solid',
                            borderColor: n.is_read ? 'transparent' : 'rgba(226, 232, 240, 0.9)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.2rem',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-main)' }}>{n.title}</span>
                            {!n.is_read && <span className="pulse-dot pulse-orange" style={{ width: '6px', height: '6px' }} />}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>{n.message}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Capsule */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              paddingLeft: '0.75rem',
              borderLeft: '1px solid var(--color-border)',
            }}>
              {/* Initials Avatar */}
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #1E293B, #0F172A)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                fontWeight: 700,
                boxShadow: 'var(--shadow-xs)',
                border: '2px solid #FFFFFF',
              }}>
                {getUserInitials(user?.full_name)}
              </div>

              <div style={{ textAlign: 'left', lineHeight: 1.25 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
                  {user?.full_name || 'User'}
                </div>
                <div style={{ marginTop: '2px' }}>{getRoleBadge(user?.role)}</div>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="btn-secondary"
                style={{ padding: '0.45rem 0.65rem', borderRadius: 'var(--radius-md)' }}
                title="Sign Out of CAMPON U"
                id="logout-btn"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body with Sidebar + Dynamic Content */}
      <div style={{ maxWidth: '1440px', width: '100%', margin: '0 auto', display: 'flex', flex: 1, padding: '1.75rem' }}>
        {/* Navigation Sidebar */}
        <aside style={{ width: '250px', flexShrink: 0, marginRight: '1.75rem' }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: '1rem',
            boxShadow: 'var(--shadow-card)',
            position: 'sticky',
            top: '85px',
          }}>
            <div style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--color-text-muted)', padding: '0.4rem 0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Portal Workspace
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.35rem' }}>
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 700 : 500,
                      backgroundColor: isActive ? 'var(--color-primary-subtle)' : 'transparent',
                      color: isActive ? 'var(--color-primary-dark)' : 'var(--color-text-main)',
                      borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                    id={`nav-tab-${item.id}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    {isActive && <ChevronRight size={14} color="var(--color-primary)" />}
                  </button>
                );
              })}
            </nav>

            {/* Bottom Status Card */}
            <div style={{
              marginTop: '1.5rem',
              padding: '0.85rem',
              backgroundColor: '#F8FAFD',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              fontSize: '0.75rem',
              color: 'var(--color-text-secondary)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '0.25rem' }}>
                <span className="pulse-dot pulse-green" style={{ width: '6px', height: '6px' }} />
                <span>Active Semester Term</span>
              </div>
              <div style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)' }}>
                Term: Spring 2026-2027
              </div>
              <div style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                AI Core: Grounded DB Mode
              </div>
            </div>
          </div>
        </aside>

        {/* Dynamic Main Content Workspace */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {children}
        </main>
      </div>

      {/* Slide-over AI Drawer */}
      <AIAssistantDrawer isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />
    </div>
  );
}
