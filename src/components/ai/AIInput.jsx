import React, { useState, useRef } from 'react';
import { Send } from 'lucide-react';

/**
 * Polished, accessible chat input component for Phazon AI.
 */
const AIInput = ({ onSend, loading, placeholder = 'Ask Phazon AI...' }) => {
  const [value, setValue] = useState('');
  const textareaRef = useRef(null);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!value.trim() || loading) return;
    const text = value.trim();
    setValue('');
    onSend(text);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: 'var(--bg-surface)'
      }}
    >
      <input
        ref={textareaRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={loading}
        style={{
          flex: 1,
          padding: '10px 16px',
          borderRadius: '24px',
          border: '1px solid var(--border-color)',
          background: 'var(--bg-app)',
          color: 'var(--text-main)',
          fontSize: '0.88rem',
          outline: 'none',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          opacity: loading ? 0.7 : 1
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--primary)';
          e.target.style.boxShadow = '0 0 0 2px rgba(var(--primary-rgb), 0.15)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'var(--border-color)';
          e.target.style.boxShadow = 'none';
        }}
      />
      <button
        type="submit"
        disabled={loading || !value.trim()}
        aria-label="Send message"
        className="btn btn-primary"
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          cursor: loading || !value.trim() ? 'not-allowed' : 'pointer',
          opacity: loading || !value.trim() ? 0.45 : 1
        }}
      >
        <Send size={16} />
      </button>
    </form>
  );
};

export default AIInput;
