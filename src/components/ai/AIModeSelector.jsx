import React from 'react';
import { Sparkles, BookOpen } from 'lucide-react';

/**
 * Enterprise-grade mode selector for Phazon AI (Assistant vs Subject Tutor).
 */
const AIModeSelector = ({ activeMode, onChangeMode }) => {
  return (
    <div
      style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-surface-hover)'
      }}
    >
      <button
        type="button"
        onClick={() => onChangeMode('assistant')}
        style={{
          flex: 1,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          background: activeMode === 'assistant' ? 'var(--bg-surface)' : 'transparent',
          border: 'none',
          borderBottom: activeMode === 'assistant' ? '2px solid var(--primary)' : '2px solid transparent',
          cursor: 'pointer',
          fontWeight: activeMode === 'assistant' ? 700 : 500,
          fontSize: '0.85rem',
          color: activeMode === 'assistant' ? 'var(--primary)' : 'var(--text-muted)',
          transition: 'all 0.15s ease'
        }}
      >
        <Sparkles size={15} />
        <span>Assistant</span>
      </button>

      <button
        type="button"
        onClick={() => onChangeMode('tutor')}
        style={{
          flex: 1,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          background: activeMode === 'tutor' ? 'var(--bg-surface)' : 'transparent',
          border: 'none',
          borderBottom: activeMode === 'tutor' ? '2px solid var(--primary)' : '2px solid transparent',
          cursor: 'pointer',
          fontWeight: activeMode === 'tutor' ? 700 : 500,
          fontSize: '0.85rem',
          color: activeMode === 'tutor' ? 'var(--primary)' : 'var(--text-muted)',
          transition: 'all 0.15s ease'
        }}
      >
        <BookOpen size={15} />
        <span>Subject Tutor</span>
      </button>
    </div>
  );
};

export default AIModeSelector;
