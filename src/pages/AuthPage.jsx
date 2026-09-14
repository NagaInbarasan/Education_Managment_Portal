import React, { useState } from 'react';
import { Lock, ShieldAlert, Sparkles, BookOpen, Key, Loader } from 'lucide-react';
import GrowingBranches from '../components/GrowingBranches';
import { loginUser } from '../lib/api';

const AuthPage = ({ setCurrentRole, setCurrentPage, theme }) => {
  const [portalId, setPortalId] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!portalId.trim() || !password) {
      setErrorMsg('Please enter your Portal ID and password.');
      return;
    }

    setLoading(true);

    try {
      const { token, user } = await loginUser(portalId.trim(), password);

      // Store server-issued token and authenticated user data
      localStorage.setItem('phazon_auth_token', token);
      localStorage.setItem('phazon_logged_in_user', JSON.stringify(user));

      // Navigate to dashboard — role comes from server, not user selection
      setCurrentRole(user.role);
      setCurrentPage('dashboard');
    } catch (err) {
      setErrorMsg(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" style={{ position: 'relative', width: '100%', minHeight: 'calc(100vh - 120px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      
      {/* Decorative Natural Vines Growth Overlay */}
      <GrowingBranches />

      {/* Auth Panel Box */}
      <div className="auth-card glass-panel animate-pop-in" style={{ width: '100%', maxWidth: '480px', padding: '40px', borderRadius: 'var(--radius-lg)', zIndex: 10 }}>
        
        {/* Logo Banner */}
        <div className="auth-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '32px' }}>
          <div className="logo-icon-bg" style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
            <BookOpen size={24} />
          </div>
          <span style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
            PHAZON <span style={{ color: 'var(--primary)', fontWeight: 600 }}>portal</span>
          </span>
        </div>

        {/* Heading */}
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, textAlign: 'center', marginBottom: '10px' }}>
          Sign In to Your Workspace
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '28px' }}>
          Enter your secure credentials below.
        </p>

        {/* Error Alert */}
        {errorMsg && (
          <div className="error-box" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: 'var(--radius-md)', color: '#ef4444', fontSize: '0.88rem', fontWeight: 500, marginBottom: '20px' }}>
            <ShieldAlert size={18} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Portal ID */}
          <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-subtle)' }}>Portal ID</label>
            <div style={{ position: 'relative' }}>
              <Key size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="STD-2026-001"
                value={portalId}
                onChange={(e) => setPortalId(e.target.value.toUpperCase())}
                style={{ width: '100%', padding: '12px 16px 12px 48px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-color)', background: 'var(--bg-surface-hover)', color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.04em', outline: 'none' }}
                autoComplete="username"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-subtle)' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '12px 16px 12px 48px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-color)', background: 'var(--bg-surface-hover)', color: 'var(--text-main)', fontSize: '0.95rem', outline: 'none' }}
                autoComplete="current-password"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Authenticating...
              </>
            ) : (
              <>
                Sign In to Portal <Sparkles size={16} />
              </>
            )}
          </button>
        </form>

        {/* Demo Credentials Hint */}
        <div style={{ marginTop: '24px', padding: '14px 16px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Demo Credentials</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: '0.82rem' }}>
            <span style={{ color: 'var(--text-subtle)', fontWeight: 600 }}>Student:</span>
            <span style={{ fontFamily: 'monospace', color: 'var(--primary)', fontWeight: 700 }}>STD-2026-001</span>
            <span style={{ color: 'var(--text-subtle)', fontWeight: 600 }}>Teacher:</span>
            <span style={{ fontFamily: 'monospace', color: 'var(--primary)', fontWeight: 700 }}>TCH-2026-001</span>
            <span style={{ color: 'var(--text-subtle)', fontWeight: 600 }}>HOD:</span>
            <span style={{ fontFamily: 'monospace', color: 'var(--primary)', fontWeight: 700 }}>HOD-2026-001</span>
            <span style={{ color: 'var(--text-subtle)', fontWeight: 600 }}>Admin:</span>
            <span style={{ fontFamily: 'monospace', color: 'var(--primary)', fontWeight: 700 }}>ADM-2026-001</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            Password: your Portal ID in lowercase (e.g., <strong style={{ fontFamily: 'monospace' }}>std-2026-001</strong>)
          </p>
        </div>

      </div>
    </div>
  );
};

export default AuthPage;