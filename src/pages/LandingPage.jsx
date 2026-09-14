import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, Sparkles, BookOpen, CheckCircle, Trophy, BrainCircuit, Activity, BarChart2, MessageSquare, Send, X, Bot } from 'lucide-react';
import SpotlightCard from '../components/SpotlightCard';
import heroIllustration from '../assets/hero_illustration.png';

const LandingPage = ({ setCurrentPage, currentRole, theme = 'light', weather = 'sunny', palette = 'indigo' }) => {
  
  // Homepage AI Assistant Widget State
  const [aiWidgetOpen, setAiWidgetOpen] = useState(false);
  const [inputMsg, setInputMsg] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'ai', text: 'Welcome to Phazon Portal! Sign in to use Phazon AI for personal academic assistance, timetable lookup, attendance tracking, and study materials.' }
  ]);

  const chatEndRef = useRef(null);

  useEffect(() => {
    if (aiWidgetOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isAiTyping, aiWidgetOpen]);

  const handleSendAiQuery = (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const userText = inputMsg;
    setChatMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setInputMsg('');
    setIsAiTyping(true);

    setTimeout(() => {
      const reply = "Sign in to use Phazon AI. Once logged in, Phazon AI assists you with your class schedule, attendance, assignments, and subject study materials.";
      setChatMessages(prev => [...prev, { sender: 'ai', text: reply }]);
      setIsAiTyping(false);
    }, 400);
  };

  // Custom weather gradients strictly for the main hero card box container
  const getWeatherBoxStyle = () => {
    if (theme === 'light') {
      switch (weather) {
        case 'sunny':
        case 'cloudy':
          return { background: 'linear-gradient(135deg, #bae6fd 0%, #f0f9ff 100%)', border: '1.5px solid rgba(14, 165, 233, 0.45)', color: '#0369a1' };
        case 'rainy':
        case 'stormy':
          return { background: 'linear-gradient(135deg, #c7d2fe 0%, #e0e7ff 100%)', border: '1.5px solid rgba(99, 102, 241, 0.45)', color: '#312e81' };
        case 'snowy':
          return { background: 'linear-gradient(135deg, #ccfbf1 0%, #f0fdfa 100%)', border: '1.5px solid rgba(20, 184, 166, 0.45)', color: '#0f766e' };
        default:
          return { background: 'linear-gradient(135deg, #bae6fd 0%, #f0f9ff 100%)', border: '1.5px solid rgba(14, 165, 233, 0.45)', color: '#0369a1' };
      }
    } else {
      switch (weather) {
        case 'sunny':
          return { background: 'linear-gradient(135deg, #075985 0%, #0c4a6e 100%)', border: '1.5px solid rgba(14, 165, 233, 0.2)', color: '#f0f9ff' };
        case 'cloudy':
          return { background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', border: '1.5px solid rgba(148, 163, 184, 0.2)', color: '#f8fafc' };
        case 'rainy':
        case 'stormy':
          return { background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)', border: '1.5px solid rgba(99, 102, 241, 0.2)', color: '#f8fafc' };
        case 'snowy':
          return { background: 'linear-gradient(135deg, #115e59 0%, #134e4a 100%)', border: '1.5px solid rgba(20, 184, 166, 0.2)', color: '#f8fafc' };
        default:
          return { background: 'linear-gradient(135deg, #075985 0%, #0c4a6e 100%)', border: '1.5px solid rgba(14, 165, 233, 0.2)', color: '#f0f9ff' };
      }
    }
  };

  const getThemeSpotlightColor = () => {
    switch (palette) {
      case 'indigo': return 'rgba(79, 70, 229, 0.28)';
      case 'emerald': return 'rgba(5, 150, 105, 0.28)';
      case 'violet': return 'rgba(124, 58, 237, 0.28)';
      case 'amber': return 'rgba(217, 119, 6, 0.28)';
      case 'crimson': return 'rgba(225, 29, 72, 0.28)';
      case 'cyan': return 'rgba(8, 145, 178, 0.28)';
      case 'rose': return 'rgba(219, 39, 119, 0.28)';
      case 'orange': return 'rgba(234, 88, 12, 0.28)';
      case 'teal': return 'rgba(13, 148, 136, 0.28)';
      case 'blue': return 'rgba(37, 99, 235, 0.28)';
      case 'lime': return 'rgba(101, 163, 13, 0.28)';
      default: return 'rgba(79, 70, 229, 0.28)';
    }
  };

  const activeBoxStyle = getWeatherBoxStyle();
  const themeSpotlightColor = getThemeSpotlightColor();

  const platformFeatures = [
    {
      title: 'MCQ Practice',
      desc: 'Interactive multiple choice questions with feedback grids.',
      icon: <CheckCircle size={22} className="feature-icon" style={{ color: 'var(--primary)' }} />
    },
    {
      title: 'Model Tests',
      desc: 'Timed mock exams replicating official university patterns.',
      icon: <Trophy size={22} className="feature-icon" style={{ color: '#10b981' }} />
    },
    {
      title: 'Personalized Learning',
      desc: 'Syllabus flows tailored directly to weak subject scores.',
      icon: <BrainCircuit size={22} className="feature-icon" style={{ color: '#8b5cf6' }} />
    },
    {
      title: 'Detailed Solutions',
      desc: 'Explanatory breakdowns for equations and algorithms.',
      icon: <BookOpen size={22} className="feature-icon" style={{ color: '#f59e0b' }} />
    },
    {
      title: 'Progress Tracking',
      desc: 'Real-time radial gauges monitor attendance and milestones.',
      icon: <Activity size={22} className="feature-icon" style={{ color: '#db2777' }} />
    },
    {
      title: 'Question Analytics',
      desc: 'Statistical grade histories predict academic trajectories.',
      icon: <BarChart2 size={22} className="feature-icon" style={{ color: '#06b6d4' }} />
    }
  ];

  return (
    <div
      className="landing-page-wrapper"
      style={{
        position: 'relative',
        width: '100%',
        minHeight: 'calc(100vh - 76px)',
        padding: '40px 24px 80px 24px',
        background: 'transparent',
        transition: 'all 0.4s ease'
      }}
    >
      
      {/* 3D Weather-reactive Hero Card Box */}
      <SpotlightCard
        className="hero-box-panel animate-pop-in"
        spotlightColor={theme === 'light' ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 255, 255, 0.08)'}
        style={{
          position: 'relative',
          padding: '64px 64px 40px 64px',
          borderRadius: '24px',
          ...activeBoxStyle,
          width: '100%',
          maxWidth: '1150px',
          margin: '0 auto 60px auto',
          overflow: 'hidden',
          transition: 'all 0.35s ease'
        }}
      >
        
        {/* Local Bright Clouds floating inside the hero box wrapper */}
        <div className="local-clouds-overlay" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
          <div className="local-cloud lc-1" />
          <div className="local-cloud lc-2" />
          {weather !== 'sunny' && (
            <div className="local-cloud lc-3" />
          )}
        </div>

        {/* Local weather precipitations inside the hero box */}
        {weather === 'rainy' && (
          <div className="local-rain-overlay" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
            <div className="lr-drop lr-1" />
            <div className="lr-drop lr-2" />
            <div className="lr-drop lr-3" />
            <div className="lr-drop lr-4" />
          </div>
        )}

        {weather === 'stormy' && (
          <div className="local-rain-overlay" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
            <div className="lr-flash" />
            <div className="lr-drop lr-1" />
            <div className="lr-drop lr-3" />
          </div>
        )}

        {weather === 'snowy' && (
          <div className="local-snow-overlay" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
            <div className="lr-snow ls-1" />
            <div className="lr-snow ls-2" />
            <div className="lr-snow ls-3" />
          </div>
        )}

        {/* --- HERO SPLIT CONTENT GRID --- */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 0.75fr', gap: '50px', alignItems: 'center', marginBottom: '48px', position: 'relative', zIndex: 10 }}>
          
          {/* Left Column Description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{
              display: 'inline-flex',
              alignSelf: 'flex-start',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              background: theme === 'light' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255, 255, 255, 0.08)',
              color: theme === 'light' ? '#2563eb' : '#38bdf8',
              borderRadius: '30px',
              fontSize: '0.8rem',
              fontWeight: 800,
              letterSpacing: '0.04em'
            }}>
              <Sparkles size={13} /> DRISTY SMART LEARNING PLATFORM
            </div>
            
            <h1 style={{
              fontSize: '3.4rem',
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              fontFamily: 'var(--font-display)',
              color: theme === 'light' ? '#0f172a' : '#ffffff'
            }}>
              Smarter Learning For A <span style={{ color: theme === 'light' ? '#2563eb' : '#38bdf8' }}>Brighter Future!</span>
            </h1>
            
            <p style={{
              fontSize: '1.08rem',
              color: theme === 'light' ? '#475569' : '#e2e8f0',
              lineHeight: 1.65,
              maxWidth: '600px'
            }}>
              Our academic tools adapt with expert recommendations, modular tasks, and personalized grade tracking paths. Easily coordinate your university syllabus and master new skills.
            </p>

            <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
              <button
                className="btn btn-primary"
                onClick={() => setCurrentPage(currentRole === 'guest' ? 'auth' : 'dashboard')}
                style={{ padding: '14px 28px', fontSize: '0.98rem' }}
              >
                Start Learning <ArrowRight size={16} />
              </button>
              <button
                className="btn btn-outline"
                onClick={() => setCurrentPage('contact')}
                style={{
                  padding: '14px 28px',
                  fontSize: '0.98rem',
                  border: theme === 'light' ? '1.5px solid #0f172a' : '1.5px solid #f8fafc',
                  color: theme === 'light' ? '#0f172a' : '#f8fafc'
                }}
              >
                Get in touch
              </button>
            </div>
          </div>

          {/* Right Column Student Graphic card */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{
              background: theme === 'light' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(12px)',
              padding: '20px',
              borderRadius: '24px',
              border: theme === 'light' ? '1px solid rgba(255, 255, 255, 0.9)' : '1px solid rgba(255, 255, 255, 0.08)',
              width: '100%',
              maxWidth: '400px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-md)'
            }}>
              <img
                src={heroIllustration}
                alt="Dristy Student Illustration"
                style={{ width: '100%', height: 'auto', borderRadius: '12px' }}
              />
            </div>
          </div>

        </div>

        {/* Lower deck Stats */}
        <div style={{
          display: 'flex',
          gap: '64px',
          borderTop: theme === 'light' ? '1.5px solid rgba(15, 23, 42, 0.08)' : '1.5px solid rgba(255, 255, 255, 0.08)',
          paddingTop: '28px',
          flexWrap: 'wrap',
          position: 'relative',
          zIndex: 10
        }}>
          {[
            { value: '12k+', label: 'Active Learners' },
            { value: '45+', label: 'Syllabus Courses' },
            { value: '99%', label: 'Satisfaction Rate' }
          ].map((stat, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '1.9rem', fontWeight: 900, color: theme === 'light' ? '#0f172a' : '#ffffff', fontFamily: 'var(--font-display)' }}>
                {stat.value}
              </span>
              <span style={{ fontSize: '0.85rem', color: theme === 'light' ? '#475569' : '#cbd5e1', fontWeight: 650 }}>
                {stat.label}
              </span>
            </div>
          ))}
        </div>

      </SpotlightCard>

      {/* platform introductory banner */}
      <div className="glass-panel animate-pop-in stagger-2" style={{ padding: '32px', borderRadius: 'var(--radius-lg)', textAlign: 'center', marginBottom: '80px', position: 'relative', zIndex: 10, background: 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.04) 0%, rgba(var(--primary-rgb), 0.01) 100%)' }}>
        <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '12px' }}>Education Subject Management System</h3>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-subtle)', maxWidth: '600px', margin: '0 auto 20px auto', lineHeight: 1.6 }}>
          Register an authorized account today to configure course files, log lecture schedules, and analyze student grading registries.
        </p>
        <button
          className="btn btn-outline"
          onClick={() => setCurrentPage('auth')}
          style={{ padding: '10px 22px' }}
        >
          Begin Enrolment
        </button>
      </div>

      {/* 6-card Features Grid */}
      <section style={{ position: 'relative', zIndex: 10 }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, textAlign: 'center', marginBottom: '10px', fontFamily: 'var(--font-display)' }}>
          Platform Features
        </h2>
        <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '40px' }}>
          Explore key components driving user engagement and analytical excellence.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '28px' }}>
          {platformFeatures.map((feat, index) => (
            <SpotlightCard
              key={index}
              className="animate-pop-in"
              spotlightColor={themeSpotlightColor}
              style={{
                padding: '32px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                animationDelay: `${0.08 * index}s`,
                transition: 'transform var(--transition-normal), box-shadow var(--transition-normal)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {feat.icon}
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{feat.title}</h4>
              </div>
              <p style={{ fontSize: '0.92rem', color: 'var(--text-subtle)', lineHeight: 1.55 }}>
                {feat.desc}
              </p>
            </SpotlightCard>
          ))}
        </div>
      </section>

      {/* FLOATING HOMEPAGE AI ASSISTANT WIDGET */}
      <div style={{ position: 'fixed', bottom: '90px', right: '30px', zIndex: 1000 }}>
        {!aiWidgetOpen ? (
          <button
            onClick={() => setAiWidgetOpen(true)}
            className="btn btn-primary"
            style={{
              padding: '14px 22px',
              borderRadius: '35px',
              boxShadow: '0 8px 24px rgba(var(--primary-rgb), 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.92rem',
              fontWeight: 800
            }}
          >
            <Bot size={22} />
            <span>Phazon AI Assistant</span>
          </button>
        ) : (
          <div
            className="glass-panel animate-pop-in"
            style={{
              width: '360px',
              height: '480px',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-lg)',
              border: '1.5px solid var(--primary)',
              overflow: 'hidden'
            }}
          >
            {/* AI Widget Header */}
            <div style={{ padding: '16px 20px', background: 'var(--primary)', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Bot size={22} />
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>Phazon AI Assistant</h4>
                  <p style={{ fontSize: '0.7rem', opacity: 0.9 }}>Admissions & Syllabus Helper</p>
                </div>
              </div>
              <button
                onClick={() => setAiWidgetOpen(false)}
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', outline: 'none' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Chat History */}
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-surface)' }}>
              {chatMessages.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                    background: m.sender === 'user' ? 'var(--primary)' : 'var(--bg-surface-hover)',
                    color: m.sender === 'user' ? '#ffffff' : 'var(--text-main)',
                    padding: '10px 14px',
                    borderRadius: m.sender === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    maxWidth: '85%',
                    fontSize: '0.85rem',
                    lineHeight: 1.45,
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  {m.text}
                </div>
              ))}
              {isAiTyping && (
                <div style={{ alignSelf: 'flex-start', background: 'var(--bg-surface-hover)', padding: '8px 14px', borderRadius: '14px 14px 14px 2px', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  AI is typing...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Prompt Chips */}
            <div style={{ padding: '8px 12px', background: 'var(--bg-surface-hover)', display: 'flex', gap: '6px', overflowX: 'auto', borderTop: '1px solid var(--border-color)' }}>
              {['Courses offered', 'Fees info', 'Faculty list'].map((chip, i) => (
                <button
                  key={i}
                  onClick={() => { setInputMsg(chip); }}
                  style={{ whiteSpace: 'nowrap', fontSize: '0.72rem', padding: '4px 10px', borderRadius: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', cursor: 'pointer', color: 'var(--primary)', fontWeight: 700 }}
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendAiQuery} style={{ padding: '10px 14px', background: 'var(--bg-surface)', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Ask Phazon AI..."
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                style={{ flex: 1, padding: '8px 14px', borderRadius: '20px', border: '1px solid var(--border-color)', background: 'var(--bg-surface-hover)', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none' }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '8px 14px', borderRadius: '50%' }}>
                <Send size={15} />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Custom stylesheets for localized weather elements inside the card */}
      <style>{`
        .local-cloud {
          position: absolute;
          background: rgba(255, 255, 255, 0.98) !important;
          border-radius: 9999px;
          filter: blur(4px);
          box-shadow: 0 6px 18px rgba(255, 255, 255, 0.3);
          animation: driftLocalClouds 30s linear infinite;
        }

        .dark-sky .local-cloud {
          background: rgba(148, 163, 184, 0.25) !important;
          box-shadow: none;
        }

        .lc-1 {
          width: 80px;
          height: 24px;
          top: 30px;
          animation-duration: 35s;
          animation-delay: -5s;
        }
        .lc-1::before { content: ''; position: absolute; width: 35px; height: 35px; top: -14px; left: 14px; background: inherit; border-radius: 50%; }

        .lc-2 {
          width: 120px;
          height: 30px;
          top: 90px;
          animation-duration: 45s;
          animation-delay: -15s;
          opacity: 0.85;
        }
        .lc-2::before { content: ''; position: absolute; width: 50px; height: 50px; top: -20px; left: 20px; background: inherit; border-radius: 50%; }

        .lc-3 {
          width: 90px;
          height: 26px;
          top: 140px;
          animation-duration: 40s;
          animation-delay: -8s;
          opacity: 0.75;
        }
        .lc-3::before { content: ''; position: absolute; width: 40px; height: 40px; top: -16px; left: 16px; background: inherit; border-radius: 50%; }

        @keyframes driftLocalClouds {
          0% { transform: translateX(-150px); }
          100% { transform: translateX(1150px); }
        }

        .lr-drop {
          position: absolute;
          background: linear-gradient(transparent, rgba(14, 165, 233, 0.45));
          width: 1.5px;
          height: 35px;
          animation: localRain 1s linear infinite;
        }
        .lr-1 { left: 20%; top: -40px; animation-duration: 0.9s; animation-delay: 0s; }
        .lr-2 { left: 50%; top: -40px; animation-duration: 1.1s; animation-delay: 0.2s; }
        .lr-3 { left: 75%; top: -40px; animation-duration: 1.0s; animation-delay: 0.4s; }
        .lr-4 { left: 90%; top: -40px; animation-duration: 0.8s; animation-delay: 0.1s; }

        @keyframes localRain {
          0% { transform: translateY(0) rotate(10deg); }
          100% { transform: translateY(450px) rotate(10deg); }
        }

        .lr-flash {
          position: absolute;
          width: 100%;
          height: 100%;
          background: rgba(255, 255, 255, 0.75);
          opacity: 0;
          animation: localFlash 6s ease-out infinite;
        }
        @keyframes localFlash {
          0%, 94%, 97%, 100% { opacity: 0; }
          95% { opacity: 0.8; }
          96% { opacity: 0.2; }
        }

        .lr-snow {
          position: absolute;
          background: #ffffff;
          border-radius: 50%;
          opacity: 0.8;
          animation: localSnow 4s linear infinite;
        }
        .ls-1 { width: 5px; height: 5px; left: 25%; top: -10px; animation-duration: 3s; }
        .ls-2 { width: 6px; height: 6px; left: 60%; top: -10px; animation-duration: 4s; }
        .ls-3 { width: 4px; height: 4px; left: 85%; top: -10px; animation-duration: 3.5s; }

        @keyframes localSnow {
          0% { transform: translate(0, 0); }
          50% { transform: translate(10px, 200px); }
          100% { transform: translate(-10px, 400px); }
        }
      `}</style>

    </div>
  );
};

export default LandingPage;