import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

/**
 * Restrained loading indicator and human-readable error renderer for Phazon AI.
 */
export const AILoadingIndicator = () => (
  <div
    style={{
      alignSelf: 'flex-start',
      padding: '8px 14px',
      borderRadius: '12px 12px 12px 2px',
      background: 'var(--bg-surface-hover)',
      border: '1px solid var(--border-color)',
      fontSize: '0.82rem',
      color: 'var(--text-muted)',
      fontWeight: 500,
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }}
  >
    <RefreshCw size={14} className="animate-spin" style={{ animation: 'spin 1.5s linear infinite' }} />
    <span>Phazon AI is thinking...</span>
  </div>
);

export const AIErrorBanner = ({ message, onRetry }) => {
  if (!message) return null;

  // Transform raw/technical errors to concise human-readable messages
  let displayMsg = message;
  if (message.includes('Ollama') || message.includes('ECONNREFUSED') || message.includes('503')) {
    displayMsg = 'Phazon AI is temporarily unavailable. Please try again.';
  } else if (message.includes('401') || message.includes('Unauthorized') || message.includes('token')) {
    displayMsg = 'Session expired or unauthorized request. Please sign in again.';
  } else if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
    displayMsg = 'Phazon AI timed out. Please try asking again.';
  } else if (message.includes('No subject material') || message.includes('no indexed documents')) {
    displayMsg = 'No study materials found for this subject yet.';
  }

  return (
    <div
      style={{
        padding: '10px 14px',
        margin: '6px 0',
        background: 'rgba(239, 68, 68, 0.08)',
        border: '1px solid rgba(239, 68, 68, 0.25)',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.82rem',
        color: '#ef4444',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <AlertCircle size={15} style={{ flexShrink: 0 }} />
        <span>{displayMsg}</span>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#ef4444',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
};
