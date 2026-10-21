import React, { useState, useEffect, useRef } from 'react';
import { Bot, Sparkles, Send, X, RefreshCw, BookOpen, GraduationCap, CheckCircle, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function AIAssistantDrawer({ isOpen, onClose }) {
  const { token, user } = useAuth();
  const [mode, setMode] = useState('college');
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      content: `Hello ${user?.full_name?.split(' ')[0] || 'there'}! I am your CAMPON U AI Assistant. Ask me about your real-time attendance, today's lecture schedule, published exam marks, or switch to Study mode for CS tutoring.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg = { sender: 'user', content: query };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ message: query, mode }),
      });

      if (!res.ok) {
        throw new Error('Failed to retrieve response from AI engine.');
      }

      const data = await res.json();
      setMessages((prev) => [...prev, { sender: 'assistant', content: data.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          content: 'I encountered an error connecting to the intelligence service. Please verify your connection.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const collegeChips = [
    'What is my attendance percentage?',
    'What classes do I have today?',
    'What assignments are pending?',
    'What are my published marks?',
    'What is my fee balance?',
  ];

  const studyChips = [
    'Explain B-Trees in simple terms',
    'How does SQL indexing work?',
    'Difference between Process & Thread',
    'What is ACID in databases?',
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          zIndex: 90,
          transition: 'opacity 0.25s ease',
        }}
      />

      {/* Slide-over Drawer */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '440px',
        maxWidth: '100vw',
        backgroundColor: '#FFFFFF',
        borderLeft: '1px solid var(--color-border)',
        boxShadow: '-8px 0 35px rgba(0, 0, 0, 0.2)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
      }} className="animate-fade-in">
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#F8FAFD',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
              color: 'var(--color-white)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px -2px rgba(249, 115, 22, 0.35)',
            }}>
              <Bot size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text-main)', letterSpacing: '-0.01em' }}>
                CAMPON U Intelligence
              </h3>
              <span style={{ fontSize: '0.725rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 500 }}>
                <span className="pulse-dot pulse-green" style={{ width: '6px', height: '6px' }} />
                <span>Verified Grounding • No SQL Injection</span>
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              color: 'var(--color-text-muted)',
              padding: '0.45rem',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            className="btn-ghost"
            aria-label="Close Assistant"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mode Selector Segmented Tabs */}
        <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: '0.5rem', backgroundColor: '#FFFFFF' }}>
          <button
            type="button"
            onClick={() => setMode('college')}
            style={{
              flex: 1,
              padding: '0.55rem',
              fontSize: '0.8rem',
              fontWeight: mode === 'college' ? 700 : 500,
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              backgroundColor: mode === 'college' ? 'var(--color-primary-subtle)' : 'var(--color-bg-subtle)',
              color: mode === 'college' ? 'var(--color-primary-dark)' : 'var(--color-text-secondary)',
              border: mode === 'college' ? '1px solid rgba(249, 115, 22, 0.3)' : '1px solid transparent',
              transition: 'all 0.15s ease',
            }}
          >
            <GraduationCap size={16} /> Campus Records
          </button>
          <button
            type="button"
            onClick={() => setMode('study')}
            style={{
              flex: 1,
              padding: '0.55rem',
              fontSize: '0.8rem',
              fontWeight: mode === 'study' ? 700 : 500,
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              backgroundColor: mode === 'study' ? 'var(--color-primary-subtle)' : 'var(--color-bg-subtle)',
              color: mode === 'study' ? 'var(--color-primary-dark)' : 'var(--color-text-secondary)',
              border: mode === 'study' ? '1px solid rgba(249, 115, 22, 0.3)' : '1px solid transparent',
              transition: 'all 0.15s ease',
            }}
          >
            <BookOpen size={16} /> CS Concept Tutor
          </button>
        </div>

        {/* Suggested Prompt Chips */}
        <div style={{
          padding: '0.65rem 1.25rem',
          backgroundColor: '#F8FAFC',
          borderBottom: '1px solid var(--color-border)',
          overflowX: 'auto',
          display: 'flex',
          gap: '0.45rem',
          whiteSpace: 'nowrap',
        }}>
          {(mode === 'college' ? collegeChips : studyChips).map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(chip)}
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.725rem',
                fontWeight: 500,
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-full)',
                color: 'var(--color-text-secondary)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary)';
                e.currentTarget.style.color = 'var(--color-primary-dark)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
              }}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Message Thread */}
        <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: '#FAFCFE' }}>
          {messages.map((m, idx) => {
            const isUser = m.sender === 'user';
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                  maxWidth: '88%',
                }}
              >
                {!isUser && (
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-primary-subtle)',
                    color: 'var(--color-primary-dark)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                    border: '1px solid rgba(249, 115, 22, 0.25)',
                  }}>
                    <Bot size={16} />
                  </div>
                )}

                <div
                  style={{
                    padding: '0.8rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    lineHeight: 1.5,
                    backgroundColor: isUser ? 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))' : '#FFFFFF',
                    background: isUser ? 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))' : '#FFFFFF',
                    color: isUser ? 'var(--color-white)' : 'var(--color-text-main)',
                    border: isUser ? 'none' : '1px solid var(--color-border)',
                    boxShadow: isUser ? '0 4px 12px rgba(249, 115, 22, 0.25)' : 'var(--shadow-xs)',
                    borderBottomRightRadius: isUser ? '2px' : 'var(--radius-md)',
                    borderBottomLeftRadius: isUser ? 'var(--radius-md)' : '2px',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {m.content}
                </div>

                {isUser && (
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: '#1E293B',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}>
                    <User size={15} />
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.75rem 1rem', backgroundColor: '#FFFFFF', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', width: 'fit-content' }}>
              <div className="typing-dots">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
              <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>
                Synthesizing response...
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          style={{ padding: '1rem', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '0.6rem', backgroundColor: '#FFFFFF' }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'college' ? "Ask attendance %, today's classes, marks..." : "Ask any data structures or CS concept..."}
            style={{
              flex: 1,
              padding: '0.75rem 0.95rem',
              fontSize: '0.875rem',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              outline: 'none',
              backgroundColor: '#F8FAFC',
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="btn-primary"
            style={{ padding: '0.75rem 1.15rem', borderRadius: 'var(--radius-md)' }}
            aria-label="Send Message"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </>
  );
}
