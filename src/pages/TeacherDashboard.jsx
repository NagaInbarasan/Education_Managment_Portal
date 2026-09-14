import React, { useState, useEffect } from 'react';
import { Users, CheckCircle, Clock, BookOpen, UserCheck, CreditCard, Activity, Award, Plus, FileText, Check, AlertCircle, Calendar, Edit, X, UserPlus, Flame, Search, Bell, AlertTriangle, ShieldCheck, BrainCircuit } from 'lucide-react';
import SpotlightCard from '../components/SpotlightCard';
import TimetableGrid from '../components/TimetableGrid';
import TimetableEntryModal from '../components/TimetableEntryModal';
import PhazonAiPanel from '../components/PhazonAiPanel';
import { fetchSubjects, fetchOfferings, fetchMyTimetable, getLoggedInUser, fetchSectionStudents, fetchMyAdvisedSections, fetchSectionTimetable, fetchSectionOfferings, createTimetableEntry, updateTimetableEntry, deleteTimetableEntry, fetchOfferingAttendance, recordAttendance } from '../lib/api';

const TeacherDashboard = ({ theme, onOpenSubject }) => {
  const [activeTab, setActiveTab] = useState('attendance');
  const [searchTerm, setSearchTerm] = useState('');
  const [advisedSections, setAdvisedSections] = useState([]);

  const user = getLoggedInUser() || {};
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [teacherOfferings, setTeacherOfferings] = useState([]);
  
  // Attendance State
  const [attendanceOfferingId, setAttendanceOfferingId] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState({}); // map of studentId -> status
  const [savingAttendance, setSavingAttendance] = useState(false);

  useEffect(() => {
    setLoadingStudents(true);
    fetchOfferings().then(offerings => {
      setTeacherOfferings(offerings || []);
      if (offerings && offerings.length > 0) {
        // Extract unique section IDs this teacher is involved with
        const sectionIds = [...new Set(offerings.map(o => o.section_id).filter(Boolean))];
        
        // Fetch students for all these sections
        Promise.all(sectionIds.map(id => fetchSectionStudents(id)))
          .then(results => {
            // Flatten and remove duplicates (if a student is in multiple sections, though unlikely)
            const allStudents = results.flat();
            const uniqueStudents = Array.from(new Map(allStudents.map(s => [s.portal_id, s])).values());
            
            // Map to the format expected by the UI
            const mappedStudents = uniqueStudents.map(s => ({
              id: s.portal_id,
              name: s.name,
              dept: s.department || 'Unknown',
              degree: 'Unknown',
              year: s.batch_year ? `${new Date().getFullYear() - s.batch_year} Year` : 'Unknown',
              semester: '-',
              section: s.sections?.section_name || 'Unknown',
              batch: s.batch_year ? `${s.batch_year}-${s.batch_year + 4}` : 'Unknown',
              classAdvisor: '-',
              cgpa: '-',
              assignments: '-',
              attendanceRate: 0,
              todayAttendance: '-',
              feeTotal: 0,
              feePaid: 0,
              feeDue: 0,
              feeCategoryBreakdown: { tuition: 0, skill: 0, hostel: 0 },
              club: '-',
              achievement: '-',
              status: 'Active'
            }));
            
            setStudents(mappedStudents);
          })
          .catch(console.error)
          .finally(() => setLoadingStudents(false));
      } else {
        setLoadingStudents(false);
      }
    }).catch(err => {
      console.error(err);
      setLoadingStudents(false);
    });

    fetchMyAdvisedSections().then(data => setAdvisedSections(data || [])).catch(console.error);
  }, []);

  // Modals state
  const [editingStudent, setEditingStudent] = useState(null);
  const [editingModalTab, setEditingModalTab] = useState('personal');

  // Fetch Attendance Data
  useEffect(() => {
    if (!attendanceOfferingId || !attendanceDate) {
      setStudents([]);
      setAttendanceRecords({});
      return;
    }

    setLoadingStudents(true);
    
    // Find the section id for this offering
    const offering = teacherOfferings.find(o => o.id === attendanceOfferingId);
    if (!offering) return;

    // Fetch students and attendance in parallel
    Promise.all([
      fetchSectionStudents(offering.section_id),
      fetchOfferingAttendance(attendanceOfferingId, attendanceDate)
    ]).then(([stData, attData]) => {
      const mappedStudents = (stData || []).map(s => ({
        id: s.portal_id,
        name: s.name,
        dept: s.department || 'Unknown',
        attendanceRate: 'N/A' // we don't have this yet per student in teacher view easily without another call
      }));
      setStudents(mappedStudents);

      const recordsMap = {};
      (attData || []).forEach(r => {
        recordsMap[r.student_portal_id] = r.status;
      });
      setAttendanceRecords(recordsMap);
      setLoadingStudents(false);
    }).catch(err => {
      console.error(err);
      setLoadingStudents(false);
    });
  }, [attendanceOfferingId, attendanceDate, teacherOfferings]);

  // Toggle Attendance handler
  const handleToggleAttendance = (studentId) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'present' ? 'absent' : 'present'
    }));
  };

  const handleSaveAttendance = async () => {
    if (!attendanceOfferingId || !attendanceDate) return;
    
    setSavingAttendance(true);
    const recordsToSave = students.map(s => ({
      student_portal_id: s.id,
      status: attendanceRecords[s.id] || 'present' // default to present if unmarked
    }));
    
    try {
      await recordAttendance({
        offering_id: attendanceOfferingId,
        date: attendanceDate,
        records: recordsToSave
      });
      alert('Attendance saved successfully');
    } catch (err) {
      console.error(err);
      alert('Failed to save attendance: ' + err.message);
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleSaveEditedStudent = (e) => {
    e.preventDefault();
    setStudents(students.map(s => s.id === editingStudent.id ? editingStudent : s));
    setEditingStudent(null);
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const presentCount = students.filter(s => s.todayAttendance === 'Present').length;

  return (
    <div className="workspace-layout animate-pop-in">
      
      {/* Sidebar Controls */}
      <aside className="sidebar-panel glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
        <h4 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '16px' }}>Teacher Workspace</h4>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button onClick={() => setActiveTab('subjects')} className={`btn ${activeTab === 'subjects' ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '10px 16px', fontSize: '0.88rem' }}>
            <BookOpen size={16} /> 📚 My Classes
          </button>
          <button onClick={() => setActiveTab('timetable')} className={`btn ${activeTab === 'timetable' ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '10px 16px', fontSize: '0.88rem' }}>
            <Calendar size={16} /> 📅 My Timetable
          </button>
          {advisedSections.length > 0 && (
            <button onClick={() => setActiveTab('classtimetable')} className={`btn ${activeTab === 'classtimetable' ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '10px 16px', fontSize: '0.88rem', background: activeTab === 'classtimetable' ? 'var(--primary)' : 'rgba(139, 92, 246, 0.1)', color: activeTab === 'classtimetable' ? '#fff' : '#8b5cf6', borderColor: activeTab === 'classtimetable' ? 'transparent' : 'rgba(139, 92, 246, 0.3)' }}>
              <Calendar size={16} /> 📝 Class Timetable
            </button>
          )}
          <button onClick={() => setActiveTab('attendance')} className={`btn ${activeTab === 'attendance' ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '10px 16px', fontSize: '0.88rem' }}>
            <UserCheck size={16} /> Mark Attendance Register
          </button>
          <button onClick={() => setActiveTab('monitoring')} className={`btn ${activeTab === 'monitoring' ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '10px 16px', fontSize: '0.88rem' }}>
            <Clock size={16} /> Study Monitoring & CGPA
          </button>
          <button onClick={() => setActiveTab('fees')} className={`btn ${activeTab === 'fees' ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '10px 16px', fontSize: '0.88rem' }}>
            <CreditCard size={16} /> Student Fees Details (₹)
          </button>
          <button onClick={() => setActiveTab('activities')} className={`btn ${activeTab === 'activities' ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '10px 16px', fontSize: '0.88rem' }}>
            <Award size={16} /> Student Activities & Clubs
          </button>
          <button onClick={() => setActiveTab('profiles')} className={`btn ${activeTab === 'profiles' ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '10px 16px', fontSize: '0.88rem' }}>
            <Users size={16} /> 7-Tab Student Profiles Editor
          </button>
          <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '8px', paddingTop: '8px' }}>
            <button onClick={() => setActiveTab('phazonai')} className={`btn ${activeTab === 'phazonai' ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '10px 16px', fontSize: '0.88rem', background: activeTab === 'phazonai' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(99, 102, 241, 0.08)', color: activeTab === 'phazonai' ? '#fff' : '#6366f1', borderColor: activeTab === 'phazonai' ? 'transparent' : 'rgba(99, 102, 241, 0.3)' }}>
              <BrainCircuit size={16} /> 🤖 Phazon AI
            </button>
          </div>
        </div>
      </aside>

      <div className="main-content-pane" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        
        {/* Metric Cards Banner */}
        <section className="metrics-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <SpotlightCard className="metric-card-box" spotlightColor="rgba(var(--primary-rgb), 0.12)">
            <div className="info" style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '1.65rem', fontWeight: 800 }}>{students.length} Students</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-subtle)', marginTop: '4px' }}>Across {teacherOfferings.length} Active Offerings</span>
            </div>
            <div className="icon-wrap" style={{ position: 'absolute', right: '20px', bottom: '20px', color: 'var(--primary)' }}>
              <Users size={24} />
            </div>
          </SpotlightCard>

          <SpotlightCard className="metric-card-box" spotlightColor="rgba(16, 185, 129, 0.12)">
            <div className="info" style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '1.65rem', fontWeight: 800, color: '#10b981' }}>{presentCount} / {students.length} Present</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-subtle)', marginTop: '4px' }}>Today's Live Attendance Count</span>
            </div>
            <div className="icon-wrap" style={{ position: 'absolute', right: '20px', bottom: '20px', color: '#10b981' }}>
              <CheckCircle size={24} />
            </div>
          </SpotlightCard>

          <SpotlightCard className="metric-card-box" spotlightColor="rgba(245, 158, 11, 0.12)">
            <div className="info" style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '1.65rem', fontWeight: 800, color: '#d97706' }}>-</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-subtle)', marginTop: '4px' }}>Backend endpoint required: CGPA Avg</span>
            </div>
            <div className="icon-wrap" style={{ position: 'absolute', right: '20px', bottom: '20px', color: '#d97706' }}>
              <Award size={24} />
            </div>
          </SpotlightCard>
        </section>

        {/* TAB: MY SUBJECTS */}
        {activeTab === 'subjects' && <TeacherClassesTab onOpenSubject={onOpenSubject} />}

        {activeTab === 'timetable' && <TeacherTimetableTab />}
        
        {activeTab === 'classtimetable' && <TeacherClassTimetableTab sections={advisedSections} />}

        {/* TAB 1: MARK ATTENDANCE REGISTER */}
        {activeTab === 'attendance' && (
          <div className="glass-panel animate-pop-in" style={{ padding: '32px', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>📋 Daily Student Attendance Register</h3>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <select 
                  className="input-field" 
                  value={attendanceOfferingId} 
                  onChange={e => setAttendanceOfferingId(e.target.value)}
                  style={{ padding: '8px', borderRadius: '8px' }}
                >
                  <option value="">Select Offering...</option>
                  {teacherOfferings.map(o => (
                    <option key={o.id} value={o.id}>{o.subjects?.name} ({o.sections?.section_name})</option>
                  ))}
                </select>
                <input 
                  type="date" 
                  className="input-field" 
                  value={attendanceDate} 
                  onChange={e => setAttendanceDate(e.target.value)}
                  style={{ padding: '8px', borderRadius: '8px' }}
                />
              </div>
            </div>

            {!attendanceOfferingId ? (
              <p style={{ color: 'var(--text-muted)', padding: '20px', textAlign: 'center' }}>Please select an offering to view and mark attendance.</p>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {loadingStudents ? (
                    <p style={{ color: 'var(--text-muted)', padding: '20px' }}>Loading students...</p>
                  ) : filteredStudents.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', padding: '20px' }}>No students found in this section.</p>
                  ) : filteredStudents.map(std => {
                    const status = attendanceRecords[std.id] || 'unmarked';
                    const isPresent = status === 'present' || status === 'unmarked';
                    
                    return (
                      <div key={std.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: 'var(--bg-surface)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                        <div>
                          <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{std.name}</span>
                          <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)' }}>ID: {std.id} | Dept: {std.dept} | Attendance Rate: <strong>{std.attendanceRate}</strong></span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.85rem', color: isPresent ? '#10b981' : '#ef4444' }}>
                            {isPresent ? 'Present' : 'Absent'}
                          </span>
                          <button
                            onClick={() => handleToggleAttendance(std.id)}
                            className={`btn ${isPresent ? 'btn-primary' : 'btn-outline'}`}
                            style={{ padding: '6px 16px', fontSize: '0.8rem' }}
                          >
                            Toggle {isPresent ? 'Absent' : 'Present'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {filteredStudents.length > 0 && (
                  <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={handleSaveAttendance} 
                      disabled={savingAttendance}
                      className="btn btn-primary" 
                      style={{ padding: '10px 24px', fontSize: '1rem', fontWeight: 'bold' }}
                    >
                      {savingAttendance ? 'Saving...' : 'Save Attendance'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 2: REGULAR STUDY MONITORING & CGPA */}
        {activeTab === 'monitoring' && (
          <div className="glass-panel animate-pop-in" style={{ padding: '32px', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '6px' }}>📊 Regular Study Monitoring & CGPA Tracking</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '24px' }}>Monitor CGPA (scaled out of 10.0) and submitted assignments.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {filteredStudents.map(std => (
                <div key={std.id} style={{ padding: '20px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 800 }}>{std.name}</h4>
                    <span className="badge" style={{ background: 'rgba(37,99,235,0.1)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800 }}>CGPA: {std.cgpa}</span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Reg ID: <strong>{std.id}</strong></p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '6px', fontWeight: 700 }}>
                    <span>Attendance: <strong style={{ color: std.attendanceRate > 85 ? '#10b981' : '#ef4444' }}>{std.attendanceRate}%</strong></span>
                    <span>Assignments: <strong style={{ color: '#10b981' }}>{std.assignments}</strong></span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: std.status.includes('Warning') ? '#ef4444' : '#10b981', fontWeight: 800, marginTop: '4px' }}>
                    Status: {std.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: STUDENT FEES DETAILS (₹) */}
        {activeTab === 'fees' && (
          <div className="glass-panel animate-pop-in" style={{ padding: '32px', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '6px' }}>💳 Student Fee Details & Payment Tracking (₹)</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '24px' }}>Tuition Fee: ₹65,000 | Skill Fee: ₹15,000 | Hostel Fee: ₹25,000 (Total ₹1,05,000).</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filteredStudents.map(std => (
                <div key={std.id} style={{ padding: '18px 24px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h4 style={{ fontWeight: 800, fontSize: '0.98rem' }}>{std.name} ({std.id})</h4>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Tuition: ₹{std.feeCategoryBreakdown.tuition.toLocaleString('en-IN')} | Skill: ₹{std.feeCategoryBreakdown.skill.toLocaleString('en-IN')} | Hostel: ₹{std.feeCategoryBreakdown.hostel.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#10b981' }}>Paid: ₹{std.feePaid.toLocaleString('en-IN')}</span>
                      <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: std.feeDue > 0 ? '#ef4444' : '#10b981' }}>Due: ₹{std.feeDue.toLocaleString('en-IN')}</span>
                    </div>
                    {std.feeDue > 0 && (
                      <button className="btn btn-outline" style={{ padding: '6px 14px', fontSize: '0.78rem', color: '#d97706', borderColor: '#d97706' }} onClick={() => alert(`Fee reminder sent to ${std.name} for ₹${std.feeDue.toLocaleString('en-IN')}`)}>
                        <Bell size={14} /> Send Reminder
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: STUDENT ACTIVITIES & CLUBS */}
        {activeTab === 'activities' && (
          <div className="glass-panel animate-pop-in" style={{ padding: '32px', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '6px' }}>🏆 Student Activities & Club Memberships</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '24px' }}>Extracurricular participations, club leads, and hackathon achievements.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
              {filteredStudents.map(std => (
                <div key={std.id} style={{ padding: '20px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <h4 style={{ fontWeight: 800, fontSize: '0.98rem' }}>{std.name}</h4>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Club: <strong>{std.club}</strong></p>
                  <p style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: 800 }}>Achievement: {std.achievement}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: 7-TAB STUDENT PROFILES EDITOR */}
        {activeTab === 'profiles' && (
          <div className="glass-panel animate-pop-in" style={{ padding: '32px', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>🎓 7-Tab Comprehensive Student Profiles Editor</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Class Advisors: <strong>Mr. P. Saravanan & Mr. L. Kavibharath</strong></p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {filteredStudents.map(std => (
                <div key={std.id} style={{ padding: '20px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 800 }}>{std.name}</h4>
                    <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.78rem' }} onClick={() => { setEditingStudent({ ...std }); setEditingModalTab('personal'); }}>
                      <Edit size={14} /> Edit 7-Tab Profile
                    </button>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>ID: <strong>{std.id}</strong> | CGPA (10.0): <strong style={{ color: '#10b981' }}>{std.cgpa}</strong></p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: PHAZON AI */}
        {activeTab === 'phazonai' && (
          <div className="glass-panel animate-pop-in" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
            <PhazonAiPanel userName={user.name} userRole="teacher" />
          </div>
        )}

      </div>

      {/* 7-Tab Profile Edit Modal */}
      {editingStudent && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <form onSubmit={handleSaveEditedStudent} className="glass-panel" style={{ width: '700px', borderRadius: 'var(--radius-lg)', padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Edit 7-Tab Profile — {editingStudent.name}</h4>
              <button type="button" onClick={() => setEditingStudent(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <input type="text" value={editingStudent.name} onChange={e => setEditingStudent({ ...editingStudent, name: e.target.value })} placeholder="Full Name" required style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }} />
              <input type="text" value={editingStudent.id} onChange={e => setEditingStudent({ ...editingStudent, id: e.target.value })} placeholder="Register Number" required style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }} />
              <input type="text" value={editingStudent.cgpa} onChange={e => setEditingStudent({ ...editingStudent, cgpa: e.target.value })} placeholder="CGPA (10.0 Scale)" required style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }} />
              <input type="text" value={editingStudent.classAdvisor} onChange={e => setEditingStudent({ ...editingStudent, classAdvisor: e.target.value })} placeholder="Class Advisor" required style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setEditingStudent(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Profile Changes</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

// TeacherClassesTab: shows offerings grouped by subject + dept + section
const TeacherClassesTab = ({ onOpenSubject }) => {
  const [offerings, setOfferings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOfferings()
      .then(data => setOfferings(data))
      .catch(err => console.error('Failed to load offerings:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="glass-panel animate-pop-in" style={{ padding: '40px', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}><p style={{ color: 'var(--text-subtle)' }}>Loading your classes...</p></div>;

  return (
    <div className="glass-panel animate-pop-in" style={{ padding: '32px', borderRadius: 'var(--radius-lg)' }}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '6px' }}>📚 My Teaching Classes</h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>Your assigned subject offerings across departments and sections.</p>
      {offerings.length === 0 ? (
        <p style={{ color: 'var(--text-subtle)' }}>No classes assigned to you yet.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {offerings.map(o => {
            const subj = o.subjects || {};
            const sec = o.sections || {};
            const dept = sec.departments || {};
            return (
              <div key={o.id} className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'transform 0.2s' }}
                onClick={() => onOpenSubject && onOpenSubject(subj.id, o.id)}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '2rem' }}>{subj.icon || '📚'}</span>
                  <div>
                    <h4 style={{ fontWeight: 800, fontSize: '1rem' }}>{subj.code || 'N/A'}</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-subtle)' }}>{subj.name || ''}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                  <span style={{ fontSize: '0.72rem', padding: '3px 10px', background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', borderRadius: '20px', fontWeight: 700 }}>
                    {dept.department_code || ''}
                  </span>
                  <span style={{ fontSize: '0.72rem', padding: '3px 10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '20px', fontWeight: 700 }}>
                    Section {sec.section_name || ''} ({sec.batch_year || ''})
                  </span>
                  <span style={{ fontSize: '0.72rem', padding: '3px 10px', background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', borderRadius: '20px', fontWeight: 700 }}>
                    {o.academic_year || ''}
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', marginTop: '10px', lineHeight: 1.5 }}>{subj.description || ''}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// TeacherTimetableTab: weekly teaching schedule
const TeacherTimetableTab = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyTimetable()
      .then(data => setEntries(data))
      .catch(err => console.error('Failed to load timetable:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="glass-panel animate-pop-in" style={{ padding: '40px', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}><p style={{ color: 'var(--text-subtle)' }}>Loading timetable...</p></div>;

  return (
    <TimetableGrid
      entries={entries}
      viewMode="teacher"
      title="📅 My Teaching Timetable"
      subtitle="Your weekly teaching schedule across all departments and sections."
    />
  );
};

// TeacherClassTimetableTab: edit advised class timetable
const TeacherClassTimetableTab = ({ sections }) => {
  const [activeSectionId, setActiveSectionId] = useState(sections.length > 0 ? sections[0].id : null);
  const [entries, setEntries] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  const loadData = () => {
    if (!activeSectionId) return;
    setLoading(true);
    Promise.all([
      fetchSectionTimetable(activeSectionId),
      fetchSectionOfferings(activeSectionId)
    ])
      .then(([timetableRes, offeringsRes]) => {
        setEntries(timetableRes || []);
        setOfferings(offeringsRes || []);
      })
      .catch(err => console.error('Failed to load class timetable:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [activeSectionId]);

  const handleAddEntry = (day_of_week, period_number) => {
    setEditingEntry({ day_of_week, period_number });
    setIsModalOpen(true);
  };

  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    setIsModalOpen(true);
  };

  const handleDeleteEntry = async (id) => {
    await deleteTimetableEntry(id);
    loadData();
  };

  const handleSaveEntry = async (data, id) => {
    if (id) {
      await updateTimetableEntry(id, data);
    } else {
      await createTimetableEntry(data);
    }
    loadData();
  };

  if (sections.length === 0) return <p>You are not assigned as an advisor or mentor to any class.</p>;

  return (
    <div className="animate-pop-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--radius-lg)', display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>📝 Class Timetable Management</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>You have edit access to these sections as a Class Advisor or Mentor.</p>
        </div>
        <select
          value={activeSectionId || ''}
          onChange={e => setActiveSectionId(e.target.value)}
          style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--primary)', color: 'var(--text-main)', fontWeight: 700, marginLeft: 'auto' }}
        >
          {sections.map(s => (
            <option key={s.id} value={s.id}>{s.departments?.department_code} - {s.section_name} ({s.batch_year})</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}><p style={{ color: 'var(--text-subtle)' }}>Loading timetable...</p></div>
      ) : (
        <TimetableGrid
          entries={entries}
          editable={true}
          onAddEntry={handleAddEntry}
          onEditEntry={handleEditEntry}
          onDeleteEntry={handleDeleteEntry}
          title=""
        />
      )}

      <TimetableEntryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveEntry}
        onDelete={handleDeleteEntry}
        entry={editingEntry}
        offerings={offerings}
        sectionId={activeSectionId}
      />
    </div>
  );
};

export default TeacherDashboard;