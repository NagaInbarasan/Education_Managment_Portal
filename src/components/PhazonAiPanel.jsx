import React, { useState, useRef, useEffect } from 'react';
import { BrainCircuit } from 'lucide-react';
import { sendAssistantChat } from '../lib/api';
import AIMessageContent from './ai/AIMessageContent';
import AIInput from './ai/AIInput';
import AIExampleQuestions from './ai/AIExampleQuestions';
import { AILoadingIndicator, AIErrorBanner } from './ai/AIStatus';
import AISourceList from './ai/AISourceList';

/**
 * Reusable Phazon AI Assistant chat panel.
 * Used in TeacherDashboard, HodDashboard, AdminDashboard.
 * Connects to POST /api/ai/assistant for portal queries.
 */
const PhazonAiPanel = ({ userName, userRole = 'teacher' }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello ${userName || 'there'}! I'm Phazon AI, your intelligent portal assistant. Ask me about attendance, assignments, tests, timetable, or student rosters.`
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, errorMsg]);

  const handleSend = async (text) => {
    if (!text.trim() || loading) return;
    setErrorMsg('');
    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const response = await sendAssistantChat({ question: text, history });

      if (response.error) {
        setErrorMsg(response.error);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Phazon AI is temporarily unavailable. Please try again.'
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response.answer || 'No response received.'
        }]);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Unable to reach Phazon AI.');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Phazon AI is temporarily unavailable. Please try again.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '480px',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-surface)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'var(--bg-surface-hover)'
        }}
      >
        <BrainCircuit size={20} style={{ color: 'var(--primary)' }} />
        <div>
          <h4 style={{ fontWeight: 800, fontSize: '0.95rem', margin: 0 }}>Phazon AI</h4>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Intelligent Portal Assistant
          </span>
        </div>
        <span
          style={{
            fontSize: '0.72rem',
            color: 'var(--primary)',
            background: 'rgba(var(--primary-rgb), 0.1)',
            padding: '3px 10px',
            borderRadius: '12px',
            marginLeft: 'auto',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em'
          }}
        >
          {userRole}
        </span>
      </div>

      {/* Chat Messages */}
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
            <div
              style={{
                padding: '12px 16px',
                borderRadius: msg.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                background: msg.role === 'user' ? 'var(--primary)' : 'var(--bg-surface-hover)',
                color: msg.role === 'user' ? '#ffffff' : 'var(--text-main)',
                border: msg.role === 'user' ? 'none' : '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              {msg.role === 'user' ? (
                <div style={{ fontSize: '0.88rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{msg.content}</div>
              ) : (
                <AIMessageContent content={msg.content} />
              )}
            </div>
            {msg.sources && <AISourceList sources={msg.sources} />}
          </div>
        ))}

        {loading && <AILoadingIndicator />}
        {errorMsg && <AIErrorBanner message={errorMsg} onRetry={() => setErrorMsg('')} />}

        <div ref={chatEndRef} />
      </div>

      {/* Suggested Questions for the role (shown when <= 2 messages) */}
      {messages.length <= 2 && (
        <AIExampleQuestions role={userRole} onSelectQuestion={handleSend} disabled={loading} />
      )}

      {/* Input */}
      <AIInput onSend={handleSend} loading={loading} placeholder="Ask Phazon AI about attendance, assignments, tests..." />
    </div>
  );
};

export default PhazonAiPanel;

