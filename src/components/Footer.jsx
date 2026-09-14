import React from 'react';

const Footer = () => {
  return (
    <footer className="footer-container no-print" style={{ borderTop: '1px solid var(--border-color)', padding: '24px 0', marginTop: '40px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
      <div className="container">
        <p>© 2026 PHAZON Educational Systems Portal. All secure nodes verified.</p>
      </div>
    </footer>
  );
};

export default Footer;