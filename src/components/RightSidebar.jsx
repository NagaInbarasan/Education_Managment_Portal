import React, { useState } from 'react';
import { Settings, Clock, Flame, Sparkles, X, Sun, Moon } from 'lucide-react';

const RightSidebar = ({
  theme,
  setTheme,
  palette,
  setPalette,
  sessionTime,
  todayUsed,
  totalUsed,
  streak,
  hasCheckedIn,
  handleCheckIn
}) => {
  const [isOpen, setIsOpen] = useState(false);

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
    { id: 'lime', name: 'Lime', color: '#65a30d' }
  ];

  const formatTime = (secs) => {
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    if (mins < 60) return `${mins}m ${remainingSecs}s`;
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hrs}h ${remainingMins}m`;
  };

  return (
    <>
      {/* Floating Settings Button */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          right: '24px',
          bottom: '24px',
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: 'var(--primary)',
          border: 'none',
          color: '#ffffff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(var(--primary-rgb), 0.35)',
          zIndex: 998,
          transition: 'all 0.3s ease'
        }}
        onMouseOver={(e) => e.target.style.transform = 'scale(1.1) rotate(45deg)'}
        onMouseOut={(e) => e.target.style.transform = 'scale(1) rotate(0deg)'}
      >
        <Settings size={22} />
      </button>

      {/* Sliding Drawer */}
      {isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', zIndex: 1000 }} onClick={() => setIsOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-panel"
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              width: '100%',
              maxWidth: '360px',
              height: '100vh',
              borderRadius: 'var(--radius-xl) 0 0 var(--radius-xl)',
              borderRight: 'none',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              gap: '28px',
              overflowY: 'auto',
              animation: 'slideIn 0.35s ease-out forwards'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Phazon Hub</h3>
              <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Streak Section */}
            <div style={{ padding: '20px', background: 'rgba(var(--primary-rgb), 0.05)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Flame size={28} className="fire-streak" style={{ color: '#f59e0b' }} />
                <span style={{ fontSize: '1.5rem', fontWeight: 900 }}>{streak} Day Streak</span>
              </div>
              <button
                className={`btn ${hasCheckedIn ? 'btn-outline' : 'btn-primary'}`}
                onClick={handleCheckIn}
                disabled={hasCheckedIn}
                style={{ width: '100%', padding: '10px' }}
              >
                {hasCheckedIn ? 'Claimed Today' : 'Claim Daily Streak'} <Sparkles size={14} />
              </button>
            </div>

            {/* Timers Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h4 style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Session Analytics</h4>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Clock size={16} /> <span>Active Session</span>
                </div>
                <span style={{ fontWeight: 700 }}>{formatTime(sessionTime)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Clock size={16} /> <span>Today Used</span>
                </div>
                <span style={{ fontWeight: 700 }}>{formatTime(todayUsed)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Clock size={16} /> <span>Total Workspace</span>
                </div>
                <span style={{ fontWeight: 700 }}>{formatTime(totalUsed)}</span>
              </div>
            </div>

            {/* Appearance Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Appearance</h4>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Dark Mode</span>
                <button
                  onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                  style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}
                >
                  {theme === 'light' ? <Moon size={22} /> : <Sun size={22} />}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', fontWeight: 600 }}>Color Accents</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                  {palettes.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPalette(p.id)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: p.color,
                        border: palette === p.id ? '2.5px solid var(--text-main)' : '1px solid var(--border-color)',
                        cursor: 'pointer',
                        transform: palette === p.id ? 'scale(1.15)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                      title={p.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            <style>{`
              @keyframes slideIn {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
              }
            `}</style>
          </div>
        </div>
      )}
    </>
  );
};

export default RightSidebar;