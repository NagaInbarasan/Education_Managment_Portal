import React from 'react';

const ContactPage = () => {
  return (
    <div className="non-statistics-panel animate-pop-in" style={{ marginTop: '40px' }}>
      <h3 className="section-title">📞 Help & Academic Support Node</h3>
      <div className="centered-form-wrap">
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px', textAlign: 'center' }}>
          If you need grading override requests or secure system configurations, please submit a support ticket in your workspace.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.95rem' }}>
          <p><strong>Hotline:</strong> +1 (555) 019-2834</p>
          <p><strong>Support Email:</strong> support@phazonedu.domain</p>
          <p><strong>Operational Hours:</strong> Monday – Friday, 08:00 AM – 05:00 PM</p>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;