import React, { useState, useEffect } from 'react';
import { fetchSubjects } from '../lib/api';

const CoursesPage = ({ onOpenSubject }) => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubjects()
      .then(data => setSubjects(data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="non-statistics-panel animate-pop-in" style={{ marginTop: '40px' }}>
      <h3 className="section-title">📚 Academic Subjects</h3>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: 'var(--text-subtle)' }}>Loading subjects...</p>
        </div>
      ) : subjects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: 'var(--text-subtle)' }}>No subjects found. Please log in or check back later.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginTop: '20px' }}>
          {subjects.map(s => (
            <div key={s.id} className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-md)', cursor: onOpenSubject ? 'pointer' : 'default', transition: 'transform 0.2s, box-shadow 0.2s' }}
              onClick={() => onOpenSubject && s.id && onOpenSubject(s.id)}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '1.5rem' }}>{s.icon || '📚'}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '3px 8px', borderRadius: '12px', background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)' }}>
                  {s.department}
                </span>
              </div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '8px' }}>{s.code}: {s.name}</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-subtle)', marginTop: '8px', lineHeight: 1.5 }}>{s.description}</p>
              {s.subject_teachers && s.subject_teachers.length > 0 && (
                <p style={{ fontSize: '0.8rem', color: 'var(--primary)', marginTop: '12px', fontWeight: 600 }}>
                  👤 {s.subject_teachers.map(t => t.teacher_name).join(', ')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CoursesPage;