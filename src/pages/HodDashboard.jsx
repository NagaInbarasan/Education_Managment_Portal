import React, { useState, useEffect, useCallback } from 'react';
import { Award, Users, AlertTriangle, CheckCircle, TrendingUp, Clock, BookOpen, Calendar, Search, ChevronDown, ChevronRight, UserCheck, Briefcase, Layers, Edit, X, BrainCircuit } from 'lucide-react';
import SpotlightCard from '../components/SpotlightCard';
import TimetableGrid from '../components/TimetableGrid';
import TimetableEntryModal from '../components/TimetableEntryModal';
import PhazonAiPanel from '../components/PhazonAiPanel';
import { fetchDepartments, fetchDepartment, fetchSections, fetchSectionStudents, fetchOfferings, fetchMyTimetable, fetchDepartmentTimetable, fetchSectionOfferings, fetchSectionAttendanceSummary, fetchDepartmentAttendanceSummary, createTimetableEntry, updateTimetableEntry, deleteTimetableEntry, getLoggedInUser, updateSection, reassignTeacher } from '../lib/api';

const HodDashboard = ({ theme, onOpenSubject }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const user = getLoggedInUser() || {};

  // Department data (loaded once)
  const [myDept, setMyDept] = useState(null);
  const [deptDetail, setDeptDetail] = useState(null);
  const [deptSections, setDeptSections] = useState([]);
  const [deptOfferings, setDeptOfferings] = useState([]);
  const [deptAttendance, setDeptAttendance] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load core department data on mount
  useEffect(() => {
    setLoading(true);
    fetchDepartments().then(async depts => {
      const dept = (depts || []).find(d => d.hod_portal_id === user.portal_id);
      if (!dept) {
        setLoading(false);
        return;
      }
      setMyDept(dept);

      // Parallel fetch
      const [detail, sections, offerings, attSummary] = await Promise.all([
        fetchDepartment(dept.id).catch(() => null),
        fetchSections(dept.id).catch(() => []),
        fetchOfferings().catch(() => []),
        fetchDepartmentAttendanceSummary(dept.id).catch(() => null),
      ]);

      setDeptDetail(detail);
      setDeptSections(sections || []);
      setDeptOfferings(offerings || []);
      setDeptAttendance(attSummary);
      setLoading(false);
    }).catch(err => {
      console.error('Failed to load department data:', err);
      setLoading(false);
    });
  }, [user.portal_id]);

  // Computed metrics
  const totalStudents = deptSections.reduce((sum, s) => sum + (s.student_count || 0), 0);
  const totalTeachers = deptDetail?.teachers?.length || 0;
  const attendanceRate = deptAttendance?.totals?.percentage;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <HodOverviewTab dept={myDept} detail={deptDetail} sections={deptSections} offerings={deptOfferings} attendance={deptAttendance} totalStudents={totalStudents} totalTeachers={totalTeachers} />;
      case 'sections':
        return <HodSectionsTab dept={myDept} sections={deptSections} onRefresh={() => fetchSections(myDept.id).then(setDeptSections)} />;
      case 'teachers':
        return <HodTeachersTab detail={deptDetail} offerings={deptOfferings} />;
      case 'subjects':
        return <HodSubjectsTab offerings={deptOfferings} onOpenSubject={onOpenSubject} />;
      case 'attendance':
        return <HodAttendanceTab dept={myDept} attendance={deptAttendance} sections={deptSections} />;
      case 'dept_timetable':
        return <HodDeptTimetableTab dept={myDept} />;
      case 'my_timetable':
        return <HodMyTimetableTab />;
      case 'phazonai':
        return (
          <div className="glass-panel animate-pop-in" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
            <PhazonAiPanel userName={user.name} userRole="hod" />
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="workspace-layout animate-pop-in">
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', borderRadius: 'var(--radius-lg)', gridColumn: '1 / -1' }}>
          <p style={{ color: 'var(--text-subtle)', fontSize: '1.1rem' }}>Loading HOD Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!myDept) {
    return (
      <div className="workspace-layout animate-pop-in">
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', borderRadius: 'var(--radius-lg)', gridColumn: '1 / -1' }}>
          <AlertTriangle size={32} style={{ color: '#ef4444', marginBottom: '12px' }} />
          <p style={{ color: 'var(--text-subtle)', fontSize: '1.1rem' }}>No department assignment found for your account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-layout animate-pop-in">
      
      {/* Sidebar Controls */}
      <aside className="sidebar-panel glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
        <h4 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '16px' }}>HOD Management Console</h4>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button onClick={() => setActiveTab('overview')} className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '10px 16px', fontSize: '0.88rem' }}>
            <TrendingUp size={16} /> 📊 Department Overview
          </button>
          <button onClick={() => setActiveTab('sections')} className={`btn ${activeTab === 'sections' ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '10px 16px', fontSize: '0.88rem' }}>
            <Layers size={16} /> 🏫 Sections & Students
          </button>
          <button onClick={() => setActiveTab('teachers')} className={`btn ${activeTab === 'teachers' ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '10px 16px', fontSize: '0.88rem' }}>
            <Briefcase size={16} /> 👩‍🏫 Department Teachers
          </button>
          <button onClick={() => setActiveTab('subjects')} className={`btn ${activeTab === 'subjects' ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '10px 16px', fontSize: '0.88rem' }}>
            <BookOpen size={16} /> 📚 Subject Offerings
          </button>
          <button onClick={() => setActiveTab('attendance')} className={`btn ${activeTab === 'attendance' ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '10px 16px', fontSize: '0.88rem' }}>
            <UserCheck size={16} /> 📋 Attendance Monitor
          </button>
          <button onClick={() => setActiveTab('dept_timetable')} className={`btn ${activeTab === 'dept_timetable' ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '10px 16px', fontSize: '0.88rem' }}>
            <Calendar size={16} /> 🏢 Department Timetable
          </button>
          <button onClick={() => setActiveTab('my_timetable')} className={`btn ${activeTab === 'my_timetable' ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '10px 16px', fontSize: '0.88rem' }}>
            <Calendar size={16} /> 📅 My Teaching Timetable
          </button>
          <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '8px', paddingTop: '8px' }}>
            <button onClick={() => setActiveTab('phazonai')} className={`btn ${activeTab === 'phazonai' ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '10px 16px', fontSize: '0.88rem', background: activeTab === 'phazonai' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(99, 102, 241, 0.08)', color: activeTab === 'phazonai' ? '#fff' : '#6366f1', borderColor: activeTab === 'phazonai' ? 'transparent' : 'rgba(99, 102, 241, 0.3)' }}>
              <BrainCircuit size={16} /> 🤖 Phazon AI
            </button>
          </div>
        </div>
      </aside>

      <div className="main-content-pane" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        
        {/* Department Overview Banner */}
        <section className="metrics-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <SpotlightCard className="metric-card-box" spotlightColor="rgba(var(--primary-rgb), 0.12)">
            <div className="info" style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '1.65rem', fontWeight: 800 }}>{totalStudents}</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-subtle)', marginTop: '4px' }}>Students in {myDept.department_code}</span>
            </div>
            <div className="icon-wrap" style={{ position: 'absolute', right: '20px', bottom: '20px', color: 'var(--primary)' }}>
              <Users size={24} />
            </div>
          </SpotlightCard>

          <SpotlightCard className="metric-card-box" spotlightColor="rgba(16, 185, 129, 0.12)">
            <div className="info" style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '1.65rem', fontWeight: 800, color: '#10b981' }}>
                {attendanceRate !== null && attendanceRate !== undefined ? `${attendanceRate}%` : 'N/A'}
              </span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-subtle)', marginTop: '4px' }}>Department Attendance</span>
            </div>
            <div className="icon-wrap" style={{ position: 'absolute', right: '20px', bottom: '20px', color: '#10b981' }}>
              <CheckCircle size={24} />
            </div>
          </SpotlightCard>

          <SpotlightCard className="metric-card-box" spotlightColor="rgba(59, 130, 246, 0.12)">
            <div className="info" style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '1.65rem', fontWeight: 800, color: '#3b82f6' }}>{deptOfferings.length}</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-subtle)', marginTop: '4px' }}>Active Subject Offerings</span>
            </div>
            <div className="icon-wrap" style={{ position: 'absolute', right: '20px', bottom: '20px', color: '#3b82f6' }}>
              <BookOpen size={24} />
            </div>
          </SpotlightCard>

          <SpotlightCard className="metric-card-box" spotlightColor="rgba(245, 158, 11, 0.12)">
            <div className="info" style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '1.65rem', fontWeight: 800, color: '#d97706' }}>{totalTeachers}</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-subtle)', marginTop: '4px' }}>Department Teachers</span>
            </div>
            <div className="icon-wrap" style={{ position: 'absolute', right: '20px', bottom: '20px', color: '#d97706' }}>
              <Briefcase size={24} />
            </div>
          </SpotlightCard>
        </section>

        <div className="main-pane-body">
          {renderTabContent()}
        </div>

      </div>

    </div>
  );
};

// ===========================
// OVERVIEW TAB
// ===========================
const HodOverviewTab = ({ dept, detail, sections, offerings, attendance, totalStudents, totalTeachers }) => {
  if (!dept) return null;
  return (
    <div className="glass-panel animate-pop-in" style={{ padding: '32px', borderRadius: 'var(--radius-lg)' }}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '6px' }}>🏛️ Department Overview — {dept.department_name}</h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
        Department Code: <strong>{dept.department_code}</strong> | HOD: <strong>{detail?.hod_portal_id || 'Not assigned'}</strong>
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        <div style={{ padding: '20px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Total Department Students</span>
          <p style={{ fontSize: '1.8rem', fontWeight: 900, marginTop: '4px' }}>{totalStudents}</p>
        </div>
        <div style={{ padding: '20px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Department Teachers</span>
          <p style={{ fontSize: '1.8rem', fontWeight: 900, marginTop: '4px' }}>{totalTeachers}</p>
        </div>
        <div style={{ padding: '20px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Sections</span>
          <p style={{ fontSize: '1.8rem', fontWeight: 900, marginTop: '4px' }}>{sections.length}</p>
        </div>
        <div style={{ padding: '20px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Overall Attendance</span>
          <p style={{ fontSize: '1.8rem', fontWeight: 900, color: attendance?.totals?.percentage != null ? '#10b981' : 'var(--text-muted)', marginTop: '4px' }}>
            {attendance?.totals?.percentage != null ? `${attendance.totals.percentage}%` : 'No data'}
          </p>
        </div>
      </div>

      {/* Section breakdown */}
      <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '12px' }}>📊 Section Breakdown</h4>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 800, color: 'var(--text-muted)' }}>Section</th>
              <th style={{ textAlign: 'center', padding: '10px 12px', fontWeight: 800, color: 'var(--text-muted)' }}>Students</th>
              <th style={{ textAlign: 'center', padding: '10px 12px', fontWeight: 800, color: 'var(--text-muted)' }}>Advisor</th>
              <th style={{ textAlign: 'center', padding: '10px 12px', fontWeight: 800, color: 'var(--text-muted)' }}>Mentor</th>
              <th style={{ textAlign: 'center', padding: '10px 12px', fontWeight: 800, color: 'var(--text-muted)' }}>Attendance</th>
              <th style={{ textAlign: 'center', padding: '10px 12px', fontWeight: 800, color: 'var(--text-muted)' }}>Offerings</th>
            </tr>
          </thead>
          <tbody>
            {sections.map(sec => {
              const secAtt = (attendance?.sections || []).find(a => a.section_id === sec.id);
              const secOfferings = offerings.filter(o => o.section_id === sec.id);
              return (
                <tr key={sec.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px' }}>
                    <strong>Section {sec.section_name}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '8px' }}>Batch {sec.batch_year}</span>
                  </td>
                  <td style={{ textAlign: 'center', padding: '12px', fontWeight: 700 }}>{sec.student_count || 0}</td>
                  <td style={{ textAlign: 'center', padding: '12px', fontSize: '0.82rem', color: 'var(--text-subtle)' }}>{sec.class_advisor_portal_id || '—'}</td>
                  <td style={{ textAlign: 'center', padding: '12px', fontSize: '0.82rem', color: 'var(--text-subtle)' }}>{sec.mentor_portal_id || '—'}</td>
                  <td style={{ textAlign: 'center', padding: '12px' }}>
                    {secAtt?.percentage != null ? (
                      <span style={{ fontWeight: 800, color: secAtt.percentage >= 75 ? '#10b981' : '#ef4444' }}>{secAtt.percentage}%</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center', padding: '12px', fontWeight: 700 }}>{secOfferings.length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ===========================
// SECTIONS TAB
// ===========================
const HodSectionsTab = ({ dept, sections, onRefresh }) => {
  const [expandedSection, setExpandedSection] = useState(null);
  const [sectionStudents, setSectionStudents] = useState({});
  const [loadingStudents, setLoadingStudents] = useState(null);

  const toggleSection = async (secId) => {
    if (expandedSection === secId) {
      setExpandedSection(null);
      return;
    }
    setExpandedSection(secId);
    if (!sectionStudents[secId]) {
      setLoadingStudents(secId);
      try {
        const students = await fetchSectionStudents(secId);
        setSectionStudents(prev => ({ ...prev, [secId]: students }));
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingStudents(null);
      }
    }
  };

  return (
    <div className="glass-panel animate-pop-in" style={{ padding: '32px', borderRadius: 'var(--radius-lg)' }}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '6px' }}>🏫 Department Sections & Students</h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>Click a section to expand and view enrolled students.</p>

      {sections.length === 0 ? (
        <p style={{ color: 'var(--text-subtle)' }}>No sections found in this department.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sections.map(sec => (
            <div key={sec.id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <div
                onClick={() => toggleSection(sec.id)}
                style={{ padding: '16px 20px', background: 'var(--bg-surface)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(var(--primary-rgb), 0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-surface)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {expandedSection === sec.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  <div>
                    <h4 style={{ fontWeight: 800, fontSize: '1rem' }}>Section {sec.section_name}</h4>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Batch {sec.batch_year}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', padding: '4px 12px', background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', borderRadius: '20px', fontWeight: 700 }}>
                    {sec.student_count || 0} students
                  </span>
                  <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <div>Advisor: {sec.class_advisor_portal_id || '—'}</div>
                    <div>Mentor: {sec.mentor_portal_id || '—'}</div>
                  </div>
                </div>
              </div>

              {expandedSection === sec.id && (
                <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)' }}>
                  {loadingStudents === sec.id ? (
                    <p style={{ color: 'var(--text-subtle)', fontSize: '0.88rem' }}>Loading students...</p>
                  ) : (sectionStudents[sec.id] || []).length === 0 ? (
                    <p style={{ color: 'var(--text-subtle)', fontSize: '0.88rem' }}>No students enrolled in this section.</p>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ textAlign: 'left', padding: '8px', fontWeight: 700, color: 'var(--text-muted)' }}>Portal ID</th>
                          <th style={{ textAlign: 'left', padding: '8px', fontWeight: 700, color: 'var(--text-muted)' }}>Name</th>
                          <th style={{ textAlign: 'left', padding: '8px', fontWeight: 700, color: 'var(--text-muted)' }}>Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sectionStudents[sec.id].map(s => (
                          <tr key={s.portal_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '8px', fontWeight: 600, fontFamily: 'monospace', fontSize: '0.82rem' }}>{s.portal_id}</td>
                            <td style={{ padding: '8px' }}>{s.name}</td>
                            <td style={{ padding: '8px', color: 'var(--text-subtle)' }}>{s.email || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ===========================
// TEACHERS TAB
// ===========================
const HodTeachersTab = ({ detail, offerings }) => {
  const teachers = detail?.teachers || [];
  const [searchTerm, setSearchTerm] = useState('');

  const teacherOfferings = (portalId) => offerings.filter(o => o.teacher_portal_id === portalId);

  const filtered = teachers.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.portal_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="glass-panel animate-pop-in" style={{ padding: '32px', borderRadius: 'var(--radius-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '4px' }}>👩‍🏫 Department Teachers</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Teachers assigned to subject offerings in your department.</p>
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search teachers..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ padding: '8px 12px 8px 34px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', fontSize: '0.85rem', width: '220px' }}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: 'var(--text-subtle)' }}>No teachers found.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map(t => {
            const tOff = teacherOfferings(t.portal_id);
            return (
              <div key={t.portal_id} style={{ padding: '20px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <h4 style={{ fontWeight: 800, fontSize: '1rem' }}>{t.name}</h4>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{t.portal_id}</span>
                    {t.email && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '12px' }}>{t.email}</span>}
                  </div>
                  <span style={{ fontSize: '0.78rem', padding: '4px 12px', background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', borderRadius: '20px', fontWeight: 700 }}>
                    {tOff.length} offering{tOff.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {tOff.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {tOff.map(o => (
                      <span key={o.id} style={{ fontSize: '0.72rem', padding: '3px 10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '20px', fontWeight: 700 }}>
                        {o.subjects?.code || 'N/A'} — Sec {o.sections?.section_name || '?'}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ===========================
// SUBJECTS / OFFERINGS TAB
// ===========================
const HodSubjectsTab = ({ offerings, onOpenSubject }) => {
  return (
    <div className="glass-panel animate-pop-in" style={{ padding: '32px', borderRadius: 'var(--radius-lg)' }}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '6px' }}>📚 Department Subject Offerings</h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>All subject offerings in your department with assigned teachers and sections.</p>
      {offerings.length === 0 ? <p style={{ color: 'var(--text-subtle)' }}>No offerings found.</p> :
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
                    <h4 style={{ fontWeight: 800 }}>{subj.code || 'N/A'}</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-subtle)' }}>{subj.name || ''}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                  <span style={{ fontSize: '0.72rem', padding: '3px 10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '20px', fontWeight: 700 }}>
                    Section {sec.section_name || ''} ({sec.batch_year || ''})
                  </span>
                  <span style={{ fontSize: '0.72rem', padding: '3px 10px', background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', borderRadius: '20px', fontWeight: 700 }}>
                    Teacher: {o.teacher_portal_id}
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', marginTop: '10px' }}>{subj.description || ''}</p>
              </div>
            );
          })}
        </div>
      }
    </div>
  );
};

// ===========================
// ATTENDANCE TAB
// ===========================
const HodAttendanceTab = ({ dept, attendance, sections }) => {
  const [selectedSection, setSelectedSection] = useState(null);
  const [sectionDetail, setSectionDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadSectionDetail = async (secId) => {
    setSelectedSection(secId);
    setLoadingDetail(true);
    try {
      const data = await fetchSectionAttendanceSummary(secId);
      setSectionDetail(data);
    } catch (err) {
      console.error(err);
      setSectionDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="glass-panel animate-pop-in" style={{ padding: '32px', borderRadius: 'var(--radius-lg)' }}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '6px' }}>📋 Department Attendance Monitor</h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
        Overall: <strong style={{ color: attendance?.totals?.percentage != null ? '#10b981' : 'var(--text-muted)' }}>
          {attendance?.totals?.percentage != null ? `${attendance.totals.percentage}%` : 'No data'}
        </strong>
        {' '}| Total records: <strong>{attendance?.totals?.total_classes || 0}</strong>
      </p>

      {/* Per-section summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {(attendance?.sections || []).map(sec => (
          <div
            key={sec.section_id}
            onClick={() => loadSectionDetail(sec.section_id)}
            style={{
              padding: '16px', background: selectedSection === sec.section_id ? 'rgba(var(--primary-rgb), 0.08)' : 'var(--bg-surface)',
              border: `1.5px solid ${selectedSection === sec.section_id ? 'var(--primary)' : 'var(--border-color)'}`,
              borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <h4 style={{ fontWeight: 800, fontSize: '0.92rem' }}>Section {sec.section_name}</h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{sec.student_count} students</p>
            <p style={{ fontSize: '1.4rem', fontWeight: 900, marginTop: '6px', color: sec.percentage != null ? (sec.percentage >= 75 ? '#10b981' : '#ef4444') : 'var(--text-muted)' }}>
              {sec.percentage != null ? `${sec.percentage}%` : 'N/A'}
            </p>
          </div>
        ))}
      </div>

      {/* Per-student detail for selected section */}
      {selectedSection && (
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '12px' }}>
            Student Attendance — Section {(sections || []).find(s => s.id === selectedSection)?.section_name || ''}
          </h4>
          {loadingDetail ? (
            <p style={{ color: 'var(--text-subtle)' }}>Loading student details...</p>
          ) : !sectionDetail || sectionDetail.length === 0 ? (
            <p style={{ color: 'var(--text-subtle)' }}>No attendance data for this section.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ textAlign: 'left', padding: '10px', fontWeight: 800, color: 'var(--text-muted)' }}>Student</th>
                  <th style={{ textAlign: 'center', padding: '10px', fontWeight: 800, color: 'var(--text-muted)' }}>Classes</th>
                  <th style={{ textAlign: 'center', padding: '10px', fontWeight: 800, color: 'var(--text-muted)' }}>Present</th>
                  <th style={{ textAlign: 'center', padding: '10px', fontWeight: 800, color: 'var(--text-muted)' }}>%</th>
                </tr>
              </thead>
              <tbody>
                {sectionDetail.map(s => (
                  <tr key={s.portal_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px' }}>
                      <strong>{s.name}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '8px', fontFamily: 'monospace' }}>{s.portal_id}</span>
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px' }}>{s.total_classes}</td>
                    <td style={{ textAlign: 'center', padding: '10px' }}>{s.present}</td>
                    <td style={{ textAlign: 'center', padding: '10px' }}>
                      {s.percentage != null ? (
                        <span style={{ fontWeight: 800, color: s.percentage >= 75 ? '#10b981' : '#ef4444', padding: '2px 8px', borderRadius: '12px', background: s.percentage >= 75 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }}>
                          {s.percentage}%
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

// ===========================
// DEPARTMENT TIMETABLE TAB (Preserved from original, with improved data loading)
// ===========================
const HodDeptTimetableTab = ({ dept }) => {
  const [deptData, setDeptData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState(null);
  const [sectionOfferings, setSectionOfferings] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  const loadData = useCallback(() => {
    if (!dept) return;
    setLoading(true);
    fetchDepartmentTimetable(dept.id)
      .then(data => {
        setDeptData(data);
        if (data?.sections?.length > 0 && !selectedSection) {
          setSelectedSection(data.sections[0].id);
          fetchSectionOfferings(data.sections[0].id).then(setSectionOfferings).catch(console.error);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [dept]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (selectedSection) {
      fetchSectionOfferings(selectedSection).then(setSectionOfferings).catch(console.error);
    }
  }, [selectedSection]);

  const handleSave = async (data, entryId) => {
    if (entryId) {
      await updateTimetableEntry(entryId, data);
    } else {
      await createTimetableEntry(data);
    }
    loadData();
  };

  const handleDelete = async (id) => {
    await deleteTimetableEntry(id);
    loadData();
  };

  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    setModalOpen(true);
  };

  const handleAddEntry = (day, period) => {
    setEditingEntry({ day_of_week: day, period_number: period });
    setModalOpen(true);
  };

  if (loading) return <div className="glass-panel animate-pop-in" style={{ padding: '40px', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}><p style={{ color: 'var(--text-subtle)' }}>Loading department timetable...</p></div>;
  if (!deptData) return <div className="glass-panel animate-pop-in" style={{ padding: '40px', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}><p style={{ color: 'var(--text-subtle)' }}>No department data found.</p></div>;

  const selectedEntries = selectedSection
    ? (deptData.entries || []).filter(e => e.section_id === selectedSection)
    : deptData.entries || [];

  return (
    <div className="glass-panel animate-pop-in" style={{ padding: '32px', borderRadius: 'var(--radius-lg)' }}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '6px' }}>🏢 Department Timetable</h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>Manage timetables for all sections in your department. Click a cell to edit.</p>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {(deptData.sections || []).map(sec => (
          <button
            key={sec.id}
            onClick={() => setSelectedSection(sec.id)}
            className={`btn ${selectedSection === sec.id ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '8px 16px', fontSize: '0.82rem' }}
          >
            Section {sec.section_name} ({sec.batch_year})
          </button>
        ))}
      </div>
      <TimetableGrid
        entries={selectedEntries}
        viewMode="hod"
        editable={true}
        onEditEntry={handleEditEntry}
        onAddEntry={handleAddEntry}
        title={`Section ${(deptData.sections || []).find(s => s.id === selectedSection)?.section_name || ''} Timetable`}
      />
      <TimetableEntryModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingEntry(null); }}
        onSave={handleSave}
        onDelete={handleDelete}
        entry={editingEntry}
        offerings={sectionOfferings}
        sectionId={selectedSection}
      />
    </div>
  );
};

// ===========================
// MY TEACHING TIMETABLE TAB (Preserved)
// ===========================
const HodMyTimetableTab = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyTimetable()
      .then(data => setEntries(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="glass-panel animate-pop-in" style={{ padding: '40px', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}><p style={{ color: 'var(--text-subtle)' }}>Loading timetable...</p></div>;

  return (
    <TimetableGrid
      entries={entries}
      viewMode="teacher"
      title="📅 My Personal Teaching Timetable"
      subtitle="Shows only the periods where you are assigned as a teacher."
    />
  );
};

export default HodDashboard;