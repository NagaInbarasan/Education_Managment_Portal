import React, { useState, useRef, useEffect } from 'react';
import { Calendar, HelpCircle, Folder, CreditCard, BarChart2, Users, Search, Phone, MessageSquare, Send, BrainCircuit, Sparkles, CheckCircle, Clock, ShieldCheck, UserCheck, Plus, Edit2, Download, Video, FileText, Lock, QrCode, Check, AlertCircle, User, Image, Upload, Award, BookOpen, Flame, Home, Layers, Trophy, Star, PieChart, TrendingUp, Edit, Play, BellRing, Bookmark, FileCheck, RefreshCw } from 'lucide-react';
import SpotlightCard from '../components/SpotlightCard';
import TimetableGrid from '../components/TimetableGrid';
import { fetchSubjects, fetchOfferings, fetchMyTimetable, getLoggedInUser, fetchDocuments, fetchPortalUsers, fetchMyAttendance, fetchSection, sendAssistantChat, sendTutorChat, checkAiHealth } from '../lib/api';
import AIMessageContent from '../components/ai/AIMessageContent';
import AIInput from '../components/ai/AIInput';
import AIModeSelector from '../components/ai/AIModeSelector';
import AIExampleQuestions from '../components/ai/AIExampleQuestions';
import AISourceList from '../components/ai/AISourceList';
import { AILoadingIndicator, AIErrorBanner } from '../components/ai/AIStatus';

const StudentDashboard = ({ theme, onOpenSubject }) => {
  const [activeTab, setActiveTab] = useState('statistics');
  const [myProfileSubTab, setMyProfileSubTab] = useState('personal');

  // User profile from backend
  const user = getLoggedInUser() || {};
  const [sectionInfo, setSectionInfo] = useState({});

  // --- WEEKLY TIMETABLE (from API) ---
  const [timetableEntries, setTimetableEntries] = useState([]);
  const [timetableLoading, setTimetableLoading] = useState(false);

  // --- ATTENDANCE (from API) ---
  const [myAttendance, setMyAttendance] = useState({ records: [], summary: [] });
  const [loadingAttendance, setLoadingAttendance] = useState(true);

  // --- MY OFFERINGS (from API) ---
  const [myOfferings, setMyOfferings] = useState([]);

  // --- STUDY MATERIALS ---
  const [selectedOfferingId, setSelectedOfferingId] = useState(null);
  const [subjectDocs, setSubjectDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // --- FACULTY ROSTER ---
  const [facultyMembers, setFacultyMembers] = useState([]);

  useEffect(() => {
    // Fetch timetable and offerings on mount
    fetchMyTimetable().then(setTimetableEntries).catch(console.error);
    fetchMyAttendance().then(data => {
      setMyAttendance(data || { records: [], summary: [] });
      setLoadingAttendance(false);
    }).catch(err => {
      console.error(err);
      setLoadingAttendance(false);
    });
    fetchOfferings().then(offerings => {
      setMyOfferings(offerings || []);
      
      // Derive faculty members from offerings
      if (offerings && offerings.length > 0) {
        // Use a Set to ensure uniqueness
        const uniqueTeachers = new Map();
        offerings.forEach(off => {
          if (off.teacher_portal_id && !uniqueTeachers.has(off.teacher_portal_id)) {
            uniqueTeachers.set(off.teacher_portal_id, {
              id: off.teacher_portal_id,
              name: off.teacher_portal_id, // We might not have the name directly unless we join portal_users
              role: `Faculty for ${off.subjects?.name || 'Subject'}`,
              email: `${off.teacher_portal_id.toLowerCase()}@phazon.edu`,
              dept: off.sections?.departments?.department_code || 'Unknown'
            });
          }
        });
        
        // Fetch real names if we can, but since this is frontend cleanup, 
        // we'll fetch portal users to map IDs to names
        fetchPortalUsers('teacher').then(teachers => {
          const teacherMap = new Map(teachers.map(t => [t.portal_id, t]));
          
          const enrichedFaculty = Array.from(uniqueTeachers.values()).map(f => {
            const tInfo = teacherMap.get(f.id);
            if (tInfo) {
              return { ...f, name: tInfo.name, email: tInfo.email, dept: tInfo.department || f.dept };
            }
            return f;
          });
          setFacultyMembers(enrichedFaculty);
        }).catch(() => setFacultyMembers(Array.from(uniqueTeachers.values())));
        
        // Auto-select first offering
        if (offerings[0] && offerings[0].id) {
          setSelectedOfferingId(offerings[0].id);
        }
      }
    }).catch(console.error);

    if (user.section_id) {
      fetchSection(user.section_id).then(setSectionInfo).catch(console.error);
    }
  }, [user.section_id]);

  useEffect(() => {
    if (selectedOfferingId) {
      setLoadingDocs(true);
      fetchDocuments(selectedOfferingId)
        .then(setSubjectDocs)
        .catch(console.error)
        .finally(() => setLoadingDocs(false));
    }
  }, [selectedOfferingId]);

  // --- CATEGORIZED INDIAN RUPEE FEE PORTAL STATE ---
  const [payMethod, setPayMethod] = useState('gpay');
  const [payCategory, setPayCategory] = useState('tuition');
  const [feeDetails, setFeeDetails] = useState({
    tuition: 65000,
    skill: 15000,
    hostel: 25000,
    total: 105000,
    paid: 75000,
    due: 30000,
    history: [
      { id: 'TXN-90812', category: 'Tuition Fee', amount: 55000, date: 'Jul 15, 2026', method: 'Google Pay (UPI)', status: 'Success' },
      { id: 'TXN-76120', category: 'Skill Development Fee', amount: 20000, date: 'Aug 10, 2026', method: 'HDFC Net Banking', status: 'Success' }
    ]
  });

  const [payAmountInput, setPayAmountInput] = useState('30000');
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const handleProcessPayment = (e) => {
    e.preventDefault();
    const payAmt = parseInt(payAmountInput);
    if (isNaN(payAmt) || payAmt <= 0) return;

    setTimeout(() => {
      setFeeDetails(prev => ({
        ...prev,
        paid: prev.paid + payAmt,
        due: Math.max(0, prev.due - payAmt)
      }));
      setPaymentSuccess(true);
      setTimeout(() => setPaymentSuccess(false), 4000);
    }, 1200);
  };

  // --- EXAM RESULTS LOOKUP STATE ---
  const [searchRegNo, setSearchRegNo] = useState('STD-2026-001');
  const [searchMobileNo, setSearchMobileNo] = useState('9876543210');
  const [fetchedResult, setFetchedResult] = useState(null);

  const handleLookupResults = (e) => {
    e.preventDefault();
    setFetchedResult(null); // Clear previous
    // Since there's no aggregate endpoint, we show a missing endpoint message.
    // The user constraint: "If an endpoint is genuinely missing, do NOT create fake frontend data. Instead report 'Backend endpoint required'"
    alert("Backend endpoint required: Aggregate Semester Results. Currently results can only be viewed per-subject via SubjectDetailPage.");
  };

  // --- PHAZON AI CHAT STATES ---
  const [activeChatContact, setActiveChatContact] = useState('ai');
  const chatTeachers = facultyMembers.slice(0, 2);
  const teacher1 = chatTeachers[0]?.name || 'Teacher 1';
  const teacher2 = chatTeachers[1]?.name || 'Teacher 2';

  const [aiMode, setAiMode] = useState('assistant'); // 'assistant' | 'tutor'
  const [aiMessages, setAiMessages] = useState([
    { role: 'assistant', content: `Hello ${user.name || 'Student'}! I'm Phazon AI. Ask me about your attendance, assignments, tests, timetable, or switch to Subject Tutor mode for academic questions.` }
  ]);
  const [aiTutorSubject, setAiTutorSubject] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const aiChatEndRef = useRef(null);

  const [messages, setMessages] = useState({
    teacher1: [{ sender: 'them', text: `${user.name || 'Student'}, your lab report is verified.`, time: 'Yesterday' }],
    teacher2: [{ sender: 'them', text: 'Great progress on your recent project!', time: '2 days ago' }]
  });

  useEffect(() => {
    if (aiChatEndRef.current) {
      aiChatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiMessages, aiLoading]);

  // Reset messages when changing AI mode or tutor subject
  const switchAiMode = (mode) => {
    setAiMode(mode);
    setAiError('');
    if (mode === 'assistant') {
      setAiMessages([{ role: 'assistant', content: `Hi ${user.name || 'Student'}! Ask me about your attendance, assignments, tests, timetable, or announcements.` }]);
      setAiTutorSubject(null);
    } else {
      setAiMessages([{ role: 'assistant', content: 'Select a subject below, then ask me academic questions about it. I\'ll answer using the study materials available for that subject.' }]);
    }
  };

  const switchTutorSubject = (offering) => {
    setAiTutorSubject(offering);
    setAiMessages([{ role: 'assistant', content: `I'm now your tutor for **${offering.subjects?.name || 'this subject'}**. Ask me any academic question about this subject!` }]);
  };

  const handleAiSend = async (text) => {
    if (!text.trim() || aiLoading) return;
    setAiError('');
    const userMsg = { role: 'user', content: text };
    setAiMessages(prev => [...prev, userMsg]);
    setAiLoading(true);

    try {
      const history = aiMessages.slice(-10).map(m => ({ role: m.role, content: m.content }));

      let response;
      if (aiMode === 'tutor') {
        if (!aiTutorSubject) {
          setAiMessages(prev => [...prev, { role: 'assistant', content: 'Please select a subject first using the dropdown below.' }]);
          setAiLoading(false);
          return;
        }
        response = await sendTutorChat({
          subjectId: aiTutorSubject.subject_id || aiTutorSubject.subjects?.id,
          offeringId: aiTutorSubject.id,
          question: text,
          history
        });
      } else {
        response = await sendAssistantChat({ question: text, history });
      }

      const assistantMsg = {
        role: 'assistant',
        content: response.answer || response.error || 'No response received.',
        sources: response.sources || null
      };
      setAiMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg = err.message || 'Unable to reach Phazon AI.';
      setAiMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${errorMsg}` }]);
    } finally {
      setAiLoading(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {

      case 'subjects':
        return <StudentSubjectsTab onOpenSubject={onOpenSubject} />;
      
      case 'statistics':
        return (
          <div className="animate-pop-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px', width: '100%' }}>
            
            {/* Header Metrics Banner */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              
              {/* Daily Attendance View Log */}
              <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>Overall Attendance</span>
                {loadingAttendance ? (
                  <p style={{ fontSize: '1rem', color: 'var(--text-muted)', marginTop: '4px' }}>Loading...</p>
                ) : myAttendance.summary.length === 0 ? (
                  <p style={{ fontSize: '1rem', color: 'var(--text-muted)', marginTop: '4px' }}>No records yet.</p>
                ) : (
                  <p style={{ fontSize: '2rem', fontWeight: 900, color: '#10b981', marginTop: '4px' }}>
                    {Math.round(myAttendance.summary.reduce((acc, s) => acc + s.percentage, 0) / myAttendance.summary.length) || 0}%
                  </p>
                )}
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem' }}>
                   <p style={{ color: 'var(--text-muted)' }}>Based on {myAttendance.records.length} total records</p>
                </div>
              </div>

              {/* Current CGPA (10.0 Scale) */}
              <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>Current CGPA (Scale 10.0)</span>
                <p style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-muted)', marginTop: '4px' }}>No CGPA data available</p>
              </div>

            </div>

            {/* CLASS ADVISOR ADVICE BOX */}
            <div className="glass-panel" style={{ padding: '24px 28px', borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.08) 0%, rgba(var(--primary-rgb), 0.02) 100%)', border: '1.5px solid rgba(var(--primary-rgb), 0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', color: 'var(--primary)' }}>
                <BrainCircuit size={24} />
                <h4 style={{ fontSize: '1.05rem', fontWeight: 900 }}>Class Advisor Advice & Academic Recommendation</h4>
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.6 }}>
                "{user.name || 'Student'} has demonstrated exceptional academic caliber. Keep up the good work and focus on the upcoming assignments."
              </p>
              <span style={{ display: 'block', marginTop: '8px', fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)' }}>
                — Class Advisor / Mentor: {sectionInfo?.class_advisor_portal_id || sectionInfo?.mentor_portal_id || 'Not assigned'}
              </span>
            </div>

          </div>
        );

      case 'profile':
        return (
          <div className="glass-panel animate-pop-in" style={{ padding: '32px', borderRadius: 'var(--radius-lg)', width: '100%', boxSizing: 'border-box' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', paddingBottom: '24px', borderBottom: '1px solid var(--border-color)', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.9rem' }}>
                  {(user.name && user.name.substring(0, 2).toUpperCase()) || 'ME'}
                </div>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800 }}>{user.name || 'Student'}</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Online</span>
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-main)' }}>👩‍🎓 Student Profile Details — {user.name}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Register ID: <strong>{user.portal_id}</strong> | Department: <strong>{user.department}</strong> | Section: <strong>{sectionInfo?.section_name || 'Loading...'}</strong>
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '10px 14px', background: 'var(--bg-surface-hover)', borderRadius: '16px', marginBottom: '24px', border: '1px solid var(--border-color)', width: '100%', boxSizing: 'border-box' }}>
              {[
                'Profile', 'Attendance', 'Marks', 'Fees', 'Timetable', 'Exams', 'Assignments', 'Events', 'Notices', 'Library', 'Leave Requests', 'Certificates'
              ].map((pill, idx) => (
                <span
                  key={idx}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '16px',
                    background: idx === 0 ? 'var(--primary)' : 'var(--bg-surface)',
                    color: idx === 0 ? '#ffffff' : 'var(--text-main)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                  onClick={() => alert(`Opening ${pill} Portal View...`)}
                >
                  {pill}
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '28px', width: '100%', boxSizing: 'border-box' }}>
              {[
                { id: 'personal', label: '👤 Personal' },
                { id: 'academic', label: '🎓 Academic' },
                { id: 'attendance_marks', label: '📚 Attendance & Marks' },
                { id: 'fees', label: '💰 Fee Details (₹)' },
                { id: 'campus', label: '🏫 Campus Details' },
                { id: 'documents', label: '📄 Documents' },
                { id: 'activities', label: '🏫 Activities & Events' }
              ].map(st => (
                <button
                  key={st.id}
                  onClick={() => setMyProfileSubTab(st.id)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '20px',
                    border: 'none',
                    background: myProfileSubTab === st.id ? 'var(--primary)' : 'var(--bg-surface)',
                    color: myProfileSubTab === st.id ? '#ffffff' : 'var(--text-main)',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <div style={{ padding: '24px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', width: '100%', boxSizing: 'border-box' }}>
              
              {myProfileSubTab === 'personal' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                  <div><label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Student ID / Reg Number:</label><p style={{ fontWeight: 800, fontSize: '0.95rem' }}>{user.portal_id}</p></div>
                  <div><label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Full Name:</label><p style={{ fontWeight: 800, fontSize: '0.95rem' }}>{user.name}</p></div>
                  <div><label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Date of Birth:</label><p style={{ fontWeight: 700 }}>{user.dob || 'Not available'}</p></div>
                  <div><label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Gender & Blood Group:</label><p style={{ fontWeight: 700 }}>Not available | Not available</p></div>
                  <div><label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Phone Number:</label><p style={{ fontWeight: 700 }}>Not available</p></div>
                  <div><label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Email ID:</label><p style={{ fontWeight: 700 }}>{user.email || 'Not available'}</p></div>
                  <div><label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Address:</label><p style={{ fontWeight: 700 }}>Not available</p></div>
                  <div><label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Parent / Guardian Name:</label><p style={{ fontWeight: 700 }}>Not available</p></div>
                  <div><label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Parent / Guardian Contact:</label><p style={{ fontWeight: 700 }}>Not available</p></div>
                </div>
              )}

              {myProfileSubTab === 'academic' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                  <div><label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Department:</label><p style={{ fontWeight: 800 }}>{user.department}</p></div>
                  <div><label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Course / Degree:</label><p style={{ fontWeight: 800 }}>Not available</p></div>
                  <div><label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Year & Semester:</label><p style={{ fontWeight: 800 }}>Not available</p></div>
                  <div><label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Section & Batch:</label><p style={{ fontWeight: 700 }}>{sectionInfo?.section_name || 'Not assigned'} ({user.batch_year ? `${user.batch_year}-${user.batch_year + 4}` : 'Unknown'})</p></div>
                  <div><label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Class Advisor / Mentor:</label><p style={{ fontWeight: 800, color: 'var(--primary)' }}>{sectionInfo?.class_advisor_portal_id || sectionInfo?.mentor_portal_id || 'Not assigned'}</p></div>
                  <div><label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Admission Year:</label><p style={{ fontWeight: 700 }}>{user.batch_year}</p></div>
                  <div><label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>CGPA / GPA (10.0 Scale):</label><p style={{ fontWeight: 900, color: '#10b981', fontSize: '1.1rem' }}>-</p></div>
                  <div><label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Academic Status:</label><p style={{ fontWeight: 800, color: '#10b981' }}>Not available</p></div>
                </div>
              )}

              {myProfileSubTab === 'attendance_marks' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Subject-wise Attendance:</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                      {loadingAttendance ? (
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Loading...</span>
                      ) : myAttendance.summary.length === 0 ? (
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No attendance records available yet.</span>
                      ) : (
                        myAttendance.summary.map((s, i) => (
                          <span key={i} style={{ padding: '6px 12px', background: 'var(--bg-surface-hover)', borderRadius: '12px', fontSize: '0.82rem', fontWeight: 800 }}>
                            {s.subject_code}: <span style={{ color: s.percentage >= 75 ? '#10b981' : '#ef4444' }}>{s.percentage}%</span> ({s.present}/{s.total_classes})
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  <div><label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Overall Attendance:</label><p style={{ fontWeight: 900, color: '#10b981', fontSize: '1.1rem' }}>
                    {myAttendance.summary.length > 0 ? Math.round(myAttendance.summary.reduce((acc, s) => acc + s.percentage, 0) / myAttendance.summary.length) : 0}%
                  </p></div>
                  <div><label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Internal Marks Average:</label><p style={{ fontWeight: 800 }}>Not available</p></div>
                  <div><label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Assignment Status:</label><p style={{ fontWeight: 800, color: '#10b981' }}>Not available</p></div>
                  <div><label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Semester Results:</label><p style={{ fontWeight: 800, color: '#10b981' }}>Not available</p></div>
                  <div><label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Exam Timetable Schedule:</label><p style={{ fontWeight: 700 }}>Not available</p></div>
                  <div><label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Backlog / Arrear Details:</label><p style={{ fontWeight: 800, color: '#10b981' }}>Not available</p></div>
                </div>
              )}

              {myProfileSubTab === 'fees' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                  <div><label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Tuition Fee:</label><p style={{ fontWeight: 800 }}>₹{feeDetails.tuition.toLocaleString('en-IN')}</p></div>
                  <div><label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Skill Development Fee:</label><p style={{ fontWeight: 800 }}>₹{feeDetails.skill.toLocaleString('en-IN')}</p></div>
                  <div><label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Hostel & Mess Fee:</label><p style={{ fontWeight: 800 }}>₹{feeDetails.hostel.toLocaleString('en-IN')}</p></div>
                  <div><label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Exam Fee:</label><p style={{ fontWeight: 800 }}>₹0</p></div>
                  <div><label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Total Fee Amount:</label><p style={{ fontWeight: 900, fontSize: '1.1rem' }}>₹{feeDetails.total.toLocaleString('en-IN')}</p></div>
                  <div><label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Amount Paid:</label><p style={{ fontWeight: 900, color: '#10b981', fontSize: '1.1rem' }}>₹{feeDetails.paid.toLocaleString('en-IN')}</p></div>
                  <div><label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Pending Balance Due:</label><p style={{ fontWeight: 900, color: '#ef4444', fontSize: '1.1rem' }}>₹{feeDetails.due.toLocaleString('en-IN')}</p></div>
                  <div><label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Due Date:</label><p style={{ fontWeight: 800, color: '#ef4444' }}>Not set</p></div>
                </div>
              )}

              {myProfileSubTab === 'campus' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                  <div><label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Hostel / Room Number:</label><p style={{ fontWeight: 800 }}>Not available</p></div>
                  <div><label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Transport / Bus Route:</label><p style={{ fontWeight: 800 }}>Not available</p></div>
                  <div><label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Library ID & Books:</label><p style={{ fontWeight: 700 }}>Not available</p></div>
                  <div><label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Club / Membership Details:</label><p style={{ fontWeight: 800 }}>Not available</p></div>
                  <div><label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Event Participation:</label><p style={{ fontWeight: 800 }}>Not available</p></div>
                </div>
              )}

              {myProfileSubTab === 'documents' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800 }}>Uploaded Certificates & Documents</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No documents uploaded yet.</p>
                </div>
              )}

              {myProfileSubTab === 'activities' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                  <div><label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Active Club:</label><p style={{ fontWeight: 800 }}>Not available</p></div>
                  <div><label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Recent Achievements:</label><p style={{ fontWeight: 800, color: '#10b981' }}>Not available</p></div>
                </div>
              )}

            </div>
          </div>
        );

      case 'results':
        return (
          <div className="glass-panel animate-pop-in" style={{ padding: '32px', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '6px' }}>📑 Semester Examination Results</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>Results for assignments and internal tests can be viewed per-subject.</p>
            <div style={{ padding: '24px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--primary)' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
                Please navigate to <strong>My Subjects</strong> and open a specific subject to view your grades, assignment marks, and test results for that subject.
              </p>
              <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => setActiveTab('subjects')}>
                Go to My Subjects
              </button>
            </div>
          </div>
        );

      case 'planned':
        return (
          <div className="non-statistics-panel animate-pop-in" style={{ padding: '32px' }}>
            <TimetableGrid
              entries={timetableEntries}
              viewMode="student"
              title="📅 Weekly Class Timetable"
              subtitle="Your section's weekly schedule with subjects, rooms, and periods."
            />
          </div>
        );

      case 'members':
        return (
          <div className="non-statistics-panel animate-pop-in" style={{ padding: '32px' }}>
            <h3 className="section-title">👥 Faculty Board Roster ({facultyMembers.length} Members)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginTop: '20px' }}>
              {facultyMembers.map(m => (
                <div key={m.id} className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <h4 style={{ fontWeight: 800, fontSize: '0.98rem' }}>{m.name}</h4>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{m.role}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>{m.email}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'support':
        return (
          <div className="non-statistics-panel animate-pop-in" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 className="pane-title" style={{ textAlign: 'left', margin: 0 }}>Phazon AI Workspace</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  Your intelligent portal and study assistant
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '20px', minHeight: '520px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', overflow: 'hidden' }}>
              {/* Contacts Sidebar */}
              <div style={{ borderRight: '1px solid var(--border-color)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-surface-hover)' }}>
                <button onClick={() => setActiveChatContact('ai')} className={`btn ${activeChatContact === 'ai' ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'flex-start', width: '100%', fontSize: '0.85rem' }}>
                  <BrainCircuit size={16} /> Phazon AI
                </button>
                <button onClick={() => setActiveChatContact('teacher1')} className={`btn ${activeChatContact === 'teacher1' ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'flex-start', width: '100%', fontSize: '0.85rem' }}>
                  👨‍🏫 {teacher1}
                </button>
                <button onClick={() => setActiveChatContact('teacher2')} className={`btn ${activeChatContact === 'teacher2' ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'flex-start', width: '100%', fontSize: '0.85rem' }}>
                  👨‍🏫 {teacher2}
                </button>
              </div>

              {/* Main Panel */}
              <div style={{ padding: '0', display: 'flex', flexDirection: 'column' }}>
                {activeChatContact === 'ai' ? (
                  <>
                    {/* Mode Selector */}
                    <AIModeSelector activeMode={aiMode} onChangeMode={switchAiMode} />

                    {/* Subject Tutor Header Context */}
                    {aiMode === 'tutor' && (
                      <div
                        style={{
                          padding: '10px 16px',
                          borderBottom: '1px solid var(--border-color)',
                          background: 'var(--bg-surface-hover)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          fontSize: '0.82rem'
                        }}
                      >
                        {aiTutorSubject ? (
                          <>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>Subject Tutor: </span>
                              <strong style={{ color: 'var(--primary)' }}>{aiTutorSubject.subjects?.name} ({aiTutorSubject.subjects?.code})</strong>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setAiTutorSubject(null);
                                setAiMessages([{ role: 'assistant', content: 'Select a subject below to ask academic questions based on its study materials.' }]);
                              }}
                              className="btn btn-outline"
                              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                            >
                              Change Subject
                            </button>
                          </>
                        ) : (
                          <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Select Subject:</span>
                            <select
                              value={aiTutorSubject?.id || ''}
                              onChange={(e) => {
                                const offering = myOfferings.find(o => o.id === e.target.value);
                                if (offering) switchTutorSubject(offering);
                              }}
                              style={{
                                flex: 1,
                                padding: '6px 12px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-surface)',
                                fontSize: '0.82rem',
                                color: 'var(--text-main)',
                                outline: 'none'
                              }}
                            >
                              <option value="">Choose subject for study questions...</option>
                              {myOfferings.map(o => (
                                <option key={o.id} value={o.id}>{o.subjects?.name} ({o.subjects?.code})</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Messages Container */}
                    <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '380px' }}>
                      {aiMessages.map((msg, i) => (
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

                      {aiLoading && <AILoadingIndicator />}
                      {aiError && <AIErrorBanner message={aiError} onRetry={() => setAiError('')} />}

                      <div ref={aiChatEndRef} />
                    </div>

                    {/* Suggested Questions */}
                    {aiMode === 'assistant' && aiMessages.length <= 2 && (
                      <AIExampleQuestions role="student" onSelectQuestion={handleAiSend} disabled={aiLoading} />
                    )}

                    {/* Chat Input */}
                    <AIInput
                      onSend={handleAiSend}
                      loading={aiLoading}
                      placeholder={
                        aiMode === 'assistant'
                          ? "Ask about attendance, assignments, tests, timetable..."
                          : aiTutorSubject
                            ? `Ask about ${aiTutorSubject.subjects?.name} study materials...`
                            : "Select a subject above first..."
                      }
                    />
                  </>
                ) : (
                  /* Teacher chat — keep existing behavior */
                  <>
                    <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {messages[activeChatContact]?.map((msg, i) => (
                        <div key={i} style={{ alignSelf: msg.sender === 'me' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                          <div style={{ padding: '12px 16px', borderRadius: msg.sender === 'me' ? '16px 16px 2px 16px' : '16px 16px 16px 2px', background: msg.sender === 'me' ? 'var(--primary)' : 'var(--bg-surface-hover)', color: msg.sender === 'me' ? '#fff' : 'var(--text-main)', fontSize: '0.9rem', lineHeight: 1.5, boxShadow: 'var(--shadow-sm)' }}>
                            {msg.text}
                          </div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', marginTop: '4px', display: 'block', textAlign: msg.sender === 'me' ? 'right' : 'left' }}>
                            {msg.time}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '12px' }}>
                      <input type="text" placeholder="Type your message..." style={{ flex: 1, padding: '12px 16px', borderRadius: '20px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', fontSize: '0.9rem' }} onKeyDown={e => {
                        if (e.key === 'Enter' && e.target.value) {
                          setMessages(prev => ({
                            ...prev,
                            [activeChatContact]: [...(prev[activeChatContact] || []), { sender: 'me', text: e.target.value, time: 'Just now' }]
                          }));
                          e.target.value = '';
                        }
                      }} />
                      <button className="btn btn-primary" style={{ width: '44px', height: '44px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Send size={18} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );

      case 'files':
        return (
          <div className="non-statistics-panel animate-pop-in" style={{ padding: '32px' }}>
            <h3 className="section-title">📚 Subject Study Materials & Video Tutorials</h3>
            <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
              Click any subject box to open its full downloadable lecture notes, formula handbooks, and video tutorials.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '28px' }}>
              {myOfferings.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No enrolled subjects found.</p>
              ) : myOfferings.map(offering => (
                <div
                  key={offering.id}
                  onClick={() => setSelectedSubjectId(offering.subject_id)}
                  className="glass-panel"
                  style={{
                    padding: '24px',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    minWidth: '220px',
                    flex: '1 1 0',
                    border: selectedSubjectId === offering.subject_id ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                    background: selectedSubjectId === offering.subject_id ? 'rgba(var(--primary-rgb), 0.06)' : 'var(--bg-surface)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontSize: '2.2rem', marginBottom: '10px' }}>{offering.subjects?.icon || '📚'}</div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800 }}>{offering.subjects?.name} ({offering.subjects?.code})</h4>
                </div>
              ))}
            </div>

            {selectedSubjectId && (
              <div className="glass-panel animate-pop-in" style={{ padding: '28px', borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--primary)' }}>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--primary)', marginBottom: '6px' }}>
                  Study Materials
                </h4>

                <h5 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '12px' }}>📄 Downloadable Documents:</h5>
                {loadingDocs ? (
                  <p style={{ color: 'var(--text-muted)' }}>Loading documents...</p>
                ) : subjectDocs.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                    {subjectDocs.map(doc => (
                      <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div>
                          <span style={{ fontWeight: 800, fontSize: '0.88rem' }}>{doc.title}</span>
                          <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Uploaded: {new Date(doc.created_at).toLocaleDateString()}</span>
                        </div>
                        <a href={doc.file_url || '#'} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ padding: '6px 14px', fontSize: '0.78rem', textDecoration: 'none' }}>
                          <Download size={14} /> Download File
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '24px' }}>No documents uploaded for this subject yet.</p>
                )}

              </div>
            )}
          </div>
        );

      case 'payments':
        return (
          <div className="non-statistics-panel animate-pop-in" style={{ padding: '32px' }}>
            <h3 className="section-title">💳 Categorized Indian Rupee (₹) Fee Payment Portal</h3>
            <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '28px' }}>
              Categorized semester fee breakdown in ₹ with GPay, PhonePe, Paytm, Net Banking & Cards.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
              <div className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Tuition Fee</span>
                <p style={{ fontSize: '1.5rem', fontWeight: 900, marginTop: '4px' }}>₹{feeDetails.tuition.toLocaleString('en-IN')}</p>
              </div>
              <div className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Skill Development Fee</span>
                <p style={{ fontSize: '1.5rem', fontWeight: 900, marginTop: '4px' }}>₹{feeDetails.skill.toLocaleString('en-IN')}</p>
              </div>
              <div className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Hostel & Mess Fee</span>
                <p style={{ fontSize: '1.5rem', fontWeight: 900, marginTop: '4px' }}>₹{feeDetails.hostel.toLocaleString('en-IN')}</p>
              </div>
              <div className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.08)' }}>
                <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 700 }}>Total Paid Amount</span>
                <p style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10b981', marginTop: '4px' }}>₹{feeDetails.paid.toLocaleString('en-IN')}</p>
              </div>
              <div className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.08)' }}>
                <span style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 700 }}>Pending Balance Due</span>
                <p style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ef4444', marginTop: '4px' }}>₹{feeDetails.due.toLocaleString('en-IN')}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '32px' }}>
              <div className="glass-panel" style={{ padding: '28px', borderRadius: 'var(--radius-lg)' }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '16px' }}>Process Fee Checkout (₹)</h4>

                {paymentSuccess && (
                  <div style={{ padding: '14px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#10b981', borderRadius: '8px', fontSize: '0.88rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Check size={18} /> Fee payment of ₹{parseInt(payAmountInput).toLocaleString('en-IN')} successful! Receipt generated.
                  </div>
                )}

                <form onSubmit={handleProcessPayment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Select Fee Category to Pay:</label>
                    <select value={payCategory} onChange={e => setPayCategory(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
                      <option value="tuition">Tuition Fee (₹65,000)</option>
                      <option value="skill">Skill Development Fee (₹15,000)</option>
                      <option value="hostel">Hostel & Mess Fee (₹25,000)</option>
                      <option value="all">Total Semester Dues</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Payment Amount (₹):</label>
                    <input type="number" value={payAmountInput} onChange={e => setPayAmountInput(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', fontSize: '1rem', fontWeight: 800 }} />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '8px' }}>Select Indian Payment Gateway:</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                      {[
                        { id: 'gpay', label: 'Google Pay', icon: '🟢' },
                        { id: 'phonepe', label: 'PhonePe', icon: '🟣' },
                        { id: 'paytm', label: 'Paytm UPI', icon: '🔵' },
                        { id: 'netbanking', label: 'Net Banking', icon: '🏦' },
                        { id: 'card', label: 'Credit/Debit Card', icon: '💳' }
                      ].map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPayMethod(m.id)}
                          style={{
                            padding: '10px',
                            borderRadius: '8px',
                            border: payMethod === m.id ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                            background: payMethod === m.id ? 'rgba(var(--primary-rgb), 0.1)' : 'var(--bg-surface)',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            cursor: 'pointer'
                          }}
                        >
                          {m.icon} {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ padding: '14px', fontSize: '0.95rem', width: '100%', marginTop: '6px' }}>
                    Pay ₹{parseInt(payAmountInput || 0).toLocaleString('en-IN')} Now
                  </button>
                </form>
              </div>

              <div className="glass-panel" style={{ padding: '28px', borderRadius: 'var(--radius-lg)' }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '16px' }}>Payment Receipts & Statements</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {feeDetails.history.map(item => (
                    <div key={item.id} style={{ padding: '14px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ fontWeight: 800, fontSize: '0.9rem' }}>₹{item.amount.toLocaleString('en-IN')} ({item.category})</p>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.id} | {item.date}</span>
                      </div>
                      <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => alert(`Downloading ${item.category} receipt...`)}>
                        <Download size={14} /> Receipt
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="workspace-layout animate-pop-in stagger-1" style={{ background: 'rgba(238, 242, 255, 0.4)', borderRadius: '24px', padding: '24px' }}>
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="sidebar-panel glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: 'fit-content', borderRadius: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
            {(user.name && user.name.substring(0, 1).toUpperCase()) || 'ME'}
          </div>
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 800 }}>{user.name || 'Student'}</h4>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Reg: {user.portal_id || 'Unknown'}</span>
          </div>
        </div>

        <h4 style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '14px' }}>Student Workspace</h4>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <button onClick={() => setActiveTab('subjects')} className={`btn ${activeTab === 'subjects' ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '10px 14px', fontSize: '0.85rem' }}>
            <BookOpen size={16} /> 📚 My Subjects
          </button>
          <button onClick={() => setActiveTab('statistics')} className={`btn ${activeTab === 'statistics' ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '10px 14px', fontSize: '0.85rem' }}>
            <BarChart2 size={16} /> Statistics & Advice
          </button>
          <button onClick={() => setActiveTab('profile')} className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '10px 14px', fontSize: '0.85rem' }}>
            <User size={16} /> My Full Profile
          </button>
          <button onClick={() => setActiveTab('results')} className={`btn ${activeTab === 'results' ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '10px 14px', fontSize: '0.85rem' }}>
            <FileText size={16} /> Exam Results
          </button>
          <button onClick={() => setActiveTab('planned')} className={`btn ${activeTab === 'planned' ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '10px 14px', fontSize: '0.85rem' }}>
            <Calendar size={16} /> 📅 Weekly Timetable
          </button>
          <button onClick={() => setActiveTab('members')} className={`btn ${activeTab === 'members' ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '10px 14px', fontSize: '0.85rem' }}>
            <Users size={16} /> Faculty Board
          </button>
          <button onClick={() => setActiveTab('support')} className={`btn ${activeTab === 'support' ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '10px 14px', fontSize: '0.85rem' }}>
            <MessageSquare size={16} /> Support Chat
          </button>

          <button onClick={() => setActiveTab('payments')} className={`btn ${activeTab === 'payments' ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '10px 14px', fontSize: '0.85rem' }}>
            <CreditCard size={16} /> Tuition Fees (₹)
          </button>
        </div>
      </aside>

      <div className="main-content-pane" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <div className={`dashboard-split-columns no-print ${activeTab !== 'statistics' ? 'full-width-layout' : ''}`}>
          <div className={`workspace-main-panel ${activeTab !== 'statistics' ? 'non-statistics-panel' : ''}`}>
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

// Student Subjects Tab
const StudentSubjectsTab = ({ onOpenSubject }) => {
  const [offerings, setOfferings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOfferings()
      .then(data => setOfferings(data))
      .catch(err => console.error('Failed to load offerings:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="glass-panel animate-pop-in" style={{ padding: '40px', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}><p style={{ color: 'var(--text-subtle)' }}>Loading enrolled classes...</p></div>;

  return (
    <div className="animate-pop-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>📚 My Enrolled Classes</h3>
      {offerings.length === 0 ? (
        <p style={{ color: 'var(--text-subtle)' }}>No classes enrolled yet.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {offerings.map(o => {
            const s = o.subjects || {};
            return (
              <div key={o.id} className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'transform 0.2s' }}
                onClick={() => onOpenSubject && onOpenSubject(s.id, o.id)}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '2rem' }}>{s.icon || '📚'}</span>
                  <div>
                    <h4 style={{ fontWeight: 800, fontSize: '1rem' }}>{s.code}</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-subtle)' }}>{s.name}</p>
                  </div>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', marginTop: '8px', lineHeight: 1.5 }}>{s.description}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '12px', fontWeight: 600 }}>
                  👤 Teacher ID: {o.teacher_portal_id}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;