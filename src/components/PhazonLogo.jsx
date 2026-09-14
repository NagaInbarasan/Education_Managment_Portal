import React from 'react';

const PhazonLogo = ({ size = 'medium', variant = 'full', className = '' }) => {
  // Scale dimensions based on size prop
  const iconSize = size === 'small' ? 32 : size === 'large' ? 54 : 42;
  const fontSize = size === 'small' ? '1.15rem' : size === 'large' ? '1.8rem' : '1.4rem';
  const subfontSize = size === 'small' ? '0.62rem' : size === 'large' ? '0.85rem' : '0.72rem';

  return (
    <div className={`phazon-logo-brand ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', userSelect: 'none' }}>
      
      {/* Official Phazon Rabbit Line-Art Emblem SVG */}
      <div 
        className="phazon-emblem-wrapper"
        style={{
          width: `${iconSize}px`,
          height: `${iconSize}px`,
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #0284c7 0%, #1e40af 50%, #0f172a 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
          padding: '6px'
        }}
      >
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', stroke: '#ffffff', fill: 'none', strokeWidth: 3.5, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
          {/* Left Ear Outer & Inner Curve */}
          <path d="M 32 60 C 22 45, 20 20, 36 12 C 44 8, 48 24, 42 42 C 40 48, 35 55, 32 60 Z" fill="rgba(255, 255, 255, 0.08)" />
          <path d="M 34 38 C 30 26, 32 18, 38 16" stroke="#38bdf8" strokeWidth={2.8} />

          {/* Right Ear Outer & Inner Curve */}
          <path d="M 68 60 C 78 45, 80 20, 64 12 C 56 8, 52 24, 58 42 C 60 48, 65 55, 68 60 Z" fill="rgba(255, 255, 255, 0.08)" />
          <path d="M 66 38 C 70 26, 68 18, 62 16" stroke="#38bdf8" strokeWidth={2.8} />

          {/* Bunny Chin & Nose Y Structure */}
          <path d="M 35 55 C 38 68, 44 72, 50 72 C 56 72, 62 68, 65 55" />
          <path d="M 50 56 L 50 68 M 44 60 C 47 62, 50 62, 50 62 C 50 62, 53 62, 56 60" stroke="#38bdf8" strokeWidth={3} />

          {/* Cheek Accents */}
          <circle cx="36" cy="48" r="2.5" fill="#38bdf8" stroke="none" />
          <circle cx="64" cy="48" r="2.5" fill="#38bdf8" stroke="none" />
        </svg>
      </div>

      {variant !== 'icon-only' && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          {/* PHAZON Typography */}
          <div style={{ display: 'flex', alignItems: 'center', fontSize: fontSize, fontWeight: 900, fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '0.08em', color: 'var(--text-main)' }}>
            <span>PH</span>
            <span style={{ position: 'relative', display: 'inline-block' }}>
              A
              <span style={{ position: 'absolute', bottom: '22%', left: '30%', width: '40%', height: '3px', background: '#38bdf8', borderRadius: '1px' }} />
            </span>
            <span style={{ color: '#2563eb' }}>Z</span>
            <span style={{ position: 'relative', display: 'inline-block' }}>
              O
              <span style={{ position: 'absolute', top: '38%', left: '38%', width: '24%', height: '24%', borderRadius: '50%', background: '#38bdf8' }} />
            </span>
            <span>N</span>
          </div>

          {/* portal subtext */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
            <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, transparent, #2563eb)' }} />
            <span style={{ fontSize: subfontSize, fontWeight: 650, color: 'var(--primary)', textTransform: 'lowercase', letterSpacing: '0.22em' }}>
              portal
            </span>
            <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, #2563eb, transparent)' }} />
          </div>
        </div>
      )}

    </div>
  );
};

export default PhazonLogo;
