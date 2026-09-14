import React from 'react';

/**
 * Role-aware example prompt suggestions for Phazon AI.
 */
const suggestionsByRole = {
  student: [
    "What's my next class?",
    "What assignments are pending?",
    "Show my attendance."
  ],
  teacher: [
    "Who are absent today?",
    "Who hasn't submitted Assignment 2?",
    "Who scored below 40?",
    "Show today's attendance."
  ],
  hod: [
    "Who is absent today in Section C?",
    "Which students have attendance below 75%?",
    "Which assignments are pending?",
    "Show students who failed the latest test."
  ],
  admin: [
    "How many students are absent today?",
    "Which departments have the highest absence?",
    "How many assignments are pending?"
  ]
};

const AIExampleQuestions = ({ role = 'student', onSelectQuestion, disabled = false }) => {
  const list = suggestionsByRole[role] || suggestionsByRole.student;

  return (
    <div
      style={{
        padding: '10px 16px',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        background: 'var(--bg-surface)'
      }}
    >
      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, width: '100%', marginBottom: '2px' }}>
        Suggested questions:
      </span>
      {list.map((question, index) => (
        <button
          key={index}
          type="button"
          disabled={disabled}
          onClick={() => onSelectQuestion(question)}
          style={{
            padding: '5px 12px',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-surface-hover)',
            color: 'var(--text-main)',
            fontSize: '0.78rem',
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontWeight: 500,
            transition: 'all 0.15s ease',
            opacity: disabled ? 0.5 : 1
          }}
          onMouseEnter={(e) => {
            if (!disabled) {
              e.currentTarget.style.borderColor = 'var(--primary)';
              e.currentTarget.style.color = 'var(--primary)';
              e.currentTarget.style.background = 'rgba(var(--primary-rgb), 0.05)';
            }
          }}
          onMouseLeave={(e) => {
            if (!disabled) {
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.color = 'var(--text-main)';
              e.currentTarget.style.background = 'var(--bg-surface-hover)';
            }
          }}
        >
          {question}
        </button>
      ))}
    </div>
  );
};

export default AIExampleQuestions;
