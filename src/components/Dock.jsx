import React, { useState } from 'react';

const Dock = ({ items, panelHeight = 68, baseItemSize = 44, magnification = 70 }) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const getScale = (idx) => {
    if (hoveredIdx === null) return 1;
    const dist = Math.abs(idx - hoveredIdx);
    if (dist === 0) return 1.45; // Max magnification
    if (dist === 1) return 1.22; // Proximity magnification
    return 1;
  };

  return (
    <div className="no-print" style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 990, display: 'flex', justifyContent: 'center' }}>
      <div className="glass-panel" style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '14px',
        padding: '8px 20px',
        borderRadius: '40px',
        height: `${panelHeight}px`,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        background: 'var(--glass-bg)',
        border: '1.5px solid var(--glass-border)',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {items.map((item, idx) => {
          const scale = getScale(idx);
          const size = baseItemSize * scale;

          return (
            <div
              key={idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={item.onClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: `${size}px`,
                height: `${size}px`,
                borderRadius: '50%',
                background: 'var(--primary)',
                color: '#ffffff',
                cursor: 'pointer',
                transition: 'width 0.15s ease, height 0.15s ease, transform 0.15s ease',
                boxShadow: '0 4px 10px rgba(var(--primary-rgb), 0.25)',
                position: 'relative'
              }}
              title={item.label}
            >
              <div style={{ transform: `scale(${scale})`, transition: 'transform 0.15s ease', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {item.icon}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Dock;
