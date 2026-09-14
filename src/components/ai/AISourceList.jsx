import React from 'react';
import { FileText } from 'lucide-react';

/**
 * Secondary, subtle citations component for RAG study material sources.
 */
const AISourceList = ({ sources }) => {
  if (!sources || sources.length === 0) return null;

  return (
    <div
      style={{
        marginTop: '8px',
        padding: '8px 12px',
        background: 'rgba(var(--primary-rgb), 0.05)',
        border: '1px solid rgba(var(--primary-rgb), 0.12)',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.75rem',
        color: 'var(--text-muted)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>
        <FileText size={13} />
        <span>Sources</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {sources.map((source, index) => {
          const title = typeof source === 'string' ? source : (source.title || 'Study Material');
          const page = source.page ? ` (Page ${source.page})` : '';
          return (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--primary)', fontSize: '0.7rem' }}>•</span>
              <span>{title}{page}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AISourceList;
