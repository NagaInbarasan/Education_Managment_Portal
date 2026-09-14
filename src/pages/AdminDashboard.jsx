import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Users, Database, Layers, BookOpen, Calendar, Award, Edit, Trash2, Plus, X, AlertTriangle, RefreshCw, Save, ChevronRight, BrainCircuit, CheckCircle } from 'lucide-react';
import SpotlightCard from '../components/SpotlightCard';
import TimetableGrid from '../components/TimetableGrid';
import TimetableEntryModal from '../components/TimetableEntryModal';
import PhazonAiPanel from '../components/PhazonAiPanel';
import {
  fetchPortalUsers, createPortalUser, updatePortalUser, deletePortalUser,
  fetchDepartments, fetchDepartment, createDepartment, updateDepartment, deleteDepartment,
  fetchSections, createSection, updateSection, deleteSection,
  fetchSubjects, createSubject, updateSubject,
  fetchOfferings, createOffering, updateOffering, deleteOffering, reassignTeacher,
  fetchDepartmentTimetable, fetchSectionOfferings,
  createTimetableEntry, updateTimetableEntry, deleteTimetableEntry,
  getLoggedInUser, fetchSectionAttendanceSummary
} from '../lib/api';

// ============================================
// ADMIN DASHBOARD
// ============================================
const AdminDashboard = ({ theme, onOpenSubject }) => {
  const [adminTab, setAdminTab] = useState('overview');

  const tabs = [
    { id: 'overview', icon: <ShieldCheck size={16} />, label: '📊 Overview' },
    { id: 'users', icon: <Users size={16} />, label: '👥 Users' },
    { id: 'departments', icon: <Database size={16} />, label: '🏛️ Departments' },
    { id: 'sections', icon: <Layers size={16} />, label: '📋 Sections' },
    { id: 'subjects', icon: <BookOpen size={16} />, label: '📚 Subjects' },
    { id: 'offerings', icon: <Award size={16} />, label: '🎯 Offerings' },
    { id: 'timetable', icon: <Calendar size={16} />, label: '📅 Timetable' },
    { id: 'attendance', icon: <CheckCircle size={16} />, label: '✅ Attendance' },
    { id: 'phazonai', icon: <BrainCircuit size={16} />, label: '🤖 Phazon AI' },
  ];

  return (
    <div className="workspace-layout animate-pop-in">
      {/* Sidebar */}
      <aside className="sidebar-panel glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
        <h4 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '16px' }}>Admin Controls</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setAdminTab(t.id)} className={`btn ${adminTab === t.id ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '10px 16px', fontSize: '0.88rem' }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </aside>

      <div className="main-content-pane" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {adminTab === 'overview' && <AdminOverviewTab />}
        {adminTab === 'users' && <AdminUsersTab />}
        {adminTab === 'departments' && <AdminDepartmentsTab />}
        {adminTab === 'sections' && <AdminSectionsTab />}
        {adminTab === 'subjects' && <AdminSubjectsTab onOpenSubject={onOpenSubject} />}
        {adminTab === 'offerings' && <AdminOfferingsTab />}
        {adminTab === 'timetable' && <AdminTimetableTab />}
        {adminTab === 'attendance' && <AdminAttendanceTab />}
        {adminTab === 'phazonai' && (
          <div className="glass-panel animate-pop-in" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
            <PhazonAiPanel userName={getLoggedInUser()?.name} userRole="admin" />
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// SHARED: Simple modal wrapper
// ============================================
const Modal = ({ title, onClose, children }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }} onClick={onClose}>
    <div className="glass-panel animate-pop-in" style={{ width: '560px', maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto', padding: '28px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }} onClick={e => e.stopPropagation()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{title}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-subtle)', padding: '4px' }}><X size={20} /></button>
      </div>
      {children}
    </div>
  </div>
);

// Shared: error alert
const ErrorAlert = ({ message }) => message ? (
  <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: '12px', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
    <AlertTriangle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
    <span style={{ fontSize: '0.85rem', color: '#ef4444' }}>{message}</span>
  </div>
) : null;

// Shared: input field style
const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.9rem' };

// ============================================
// 1. OVERVIEW TAB
// ============================================
const AdminOverviewTab = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchPortalUsers(), fetchDepartments(), fetchSubjects(), fetchOfferings()])
      .then(([users, depts, subjects, offerings]) => {
        setStats({
          students: users.filter(u => u.role === 'student').length,
          teachers: users.filter(u => u.role === 'teacher').length,
          hods: users.filter(u => u.role === 'hod').length,
          admins: users.filter(u => u.role === 'admin').length,
          departments: depts.length,
          subjects: subjects.length,
          offerings: offerings.length,
          sections: depts.reduce((sum, d) => sum + (d.sections?.length || 0), 0),
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="glass-panel animate-pop-in" style={{ padding: '40px', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}><p style={{ color: 'var(--text-subtle)' }}>Loading institution overview...</p></div>;
  if (!stats) return <div className="glass-panel animate-pop-in" style={{ padding: '40px', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}><p style={{ color: 'var(--text-subtle)' }}>Failed to load overview.</p></div>;

  const metrics = [
    { label: 'Students', value: stats.students, color: 'rgba(var(--primary-rgb), 0.12)', icon: '🎓' },
    { label: 'Teachers', value: stats.teachers, color: 'rgba(16, 185, 129, 0.12)', icon: '👨‍🏫' },
    { label: 'HODs', value: stats.hods, color: 'rgba(139, 92, 246, 0.12)', icon: '🏛️' },
    { label: 'Departments', value: stats.departments, color: 'rgba(245, 158, 11, 0.12)', icon: '🏢' },
    { label: 'Sections', value: stats.sections, color: 'rgba(236, 72, 153, 0.12)', icon: '📋' },
    { label: 'Subjects', value: stats.subjects, color: 'rgba(6, 182, 212, 0.12)', icon: '📚' },
    { label: 'Offerings', value: stats.offerings, color: 'rgba(234, 88, 12, 0.12)', icon: '🎯' },
  ];

  return (
    <div className="animate-pop-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        {metrics.map(m => (
          <SpotlightCard key={m.label} className="metric-card-box" spotlightColor={m.color}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '2rem' }}>{m.icon}</span>
              <span style={{ fontSize: '1.65rem', fontWeight: 800, marginTop: '4px' }}>{m.value}</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-subtle)' }}>{m.label}</span>
            </div>
          </SpotlightCard>
        ))}
      </section>
      <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '8px' }}>👑 Admin Panel — Institution-Wide Management</h4>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Use the sidebar tabs to manage users, departments, sections, subjects, offerings, and timetables across the institution. All operations are persisted to the database and enforced server-side.
        </p>
      </div>
    </div>
  );
};

// ============================================
// 2. USERS TAB
// ============================================
const AdminUsersTab = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(() => {
    setLoading(true);
    fetchPortalUsers(roleFilter || undefined)
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [roleFilter]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await updatePortalUser(editingUser.portal_id, {
        name: editingUser.name,
        email: editingUser.email,
        department: editingUser.department,
        section_id: editingUser.section_id,
        batch_year: editingUser.batch_year,
        register_number: editingUser.register_number,
      });
      setEditingUser(null);
      loadUsers();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const roles = ['', 'student', 'teacher', 'hod', 'admin'];

  return (
    <div className="animate-pop-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>👥 Portal Users ({users.length})</h3>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {roles.map(r => (
              <button key={r} onClick={() => setRoleFilter(r)} className={`btn ${roleFilter === r ? 'btn-primary' : 'btn-outline'}`} style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
                {r || 'All'}
              </button>
            ))}
          </div>
        </div>

        {loading ? <p style={{ color: 'var(--text-muted)' }}>Loading users...</p> : users.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No users found.</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  {['Portal ID', 'Name', 'Email', 'Role', 'Department', 'Batch', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 800, fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.portal_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>{u.portal_id}</td>
                    <td style={{ padding: '10px 12px' }}>{u.name}</td>
                    <td style={{ padding: '10px 12px', fontSize: '0.8rem', color: 'var(--text-subtle)' }}>{u.email || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800, background: u.role === 'admin' ? 'rgba(239,68,68,0.1)' : u.role === 'hod' ? 'rgba(139,92,246,0.1)' : u.role === 'teacher' ? 'rgba(16,185,129,0.1)' : 'rgba(var(--primary-rgb),0.1)', color: u.role === 'admin' ? '#ef4444' : u.role === 'hod' ? '#8b5cf6' : u.role === 'teacher' ? '#10b981' : 'var(--primary)' }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: '0.8rem' }}>{u.department || '—'}</td>
                    <td style={{ padding: '10px 12px', fontSize: '0.8rem' }}>{u.batch_year || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <button onClick={() => setEditingUser({ ...u })} className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.75rem' }}><Edit size={12} /> Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingUser && (
        <Modal title={`Edit User — ${editingUser.portal_id}`} onClose={() => setEditingUser(null)}>
          <ErrorAlert message={error} />
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-subtle)', display: 'block', marginBottom: '4px' }}>Name</label>
                <input value={editingUser.name || ''} onChange={e => setEditingUser({ ...editingUser, name: e.target.value })} style={inputStyle} required />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-subtle)', display: 'block', marginBottom: '4px' }}>Email</label>
                <input type="email" value={editingUser.email || ''} onChange={e => setEditingUser({ ...editingUser, email: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-subtle)', display: 'block', marginBottom: '4px' }}>Department</label>
                <input value={editingUser.department || ''} onChange={e => setEditingUser({ ...editingUser, department: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-subtle)', display: 'block', marginBottom: '4px' }}>Batch Year</label>
                <input type="number" value={editingUser.batch_year || ''} onChange={e => setEditingUser({ ...editingUser, batch_year: e.target.value ? parseInt(e.target.value) : null })} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-subtle)', display: 'block', marginBottom: '4px' }}>Register Number</label>
                <input value={editingUser.register_number || ''} onChange={e => setEditingUser({ ...editingUser, register_number: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-subtle)', display: 'block', marginBottom: '4px' }}>Role (read-only)</label>
                <input value={editingUser.role} disabled style={{ ...inputStyle, opacity: 0.6 }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setEditingUser(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}><Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

// ============================================
// 3. DEPARTMENTS TAB
// ============================================
const AdminDepartmentsTab = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = create, object = edit
  const [form, setForm] = useState({ department_code: '', department_name: '', hod_portal_id: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadDepts = () => { setLoading(true); fetchDepartments().then(setDepartments).catch(console.error).finally(() => setLoading(false)); };
  useEffect(() => { loadDepts(); }, []);

  const openCreate = () => { setEditing(null); setForm({ department_code: '', department_name: '', hod_portal_id: '' }); setError(''); setModalOpen(true); };
  const openEdit = (d) => { setEditing(d); setForm({ department_code: d.department_code, department_name: d.department_name, hod_portal_id: d.hod_portal_id || '' }); setError(''); setModalOpen(true); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (editing) {
        await updateDepartment(editing.id, form);
      } else {
        await createDepartment(form);
      }
      setModalOpen(false); loadDepts();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this department? This cannot be undone.')) return;
    try { await deleteDepartment(id); loadDepts(); } catch (err) { alert(err.message); }
  };

  return (
    <div className="animate-pop-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>🏛️ Departments ({departments.length})</h3>
          <button onClick={openCreate} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}><Plus size={14} /> Add Department</button>
        </div>

        {loading ? <p style={{ color: 'var(--text-muted)' }}>Loading...</p> : departments.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No departments.</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {departments.map(d => (
              <div key={d.id} style={{ padding: '20px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800 }}>{d.department_code} — {d.department_name}</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>HOD: <strong>{d.hod_portal_id || 'Unassigned'}</strong> | Sections: <strong>{d.sections?.length || 0}</strong></p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => openEdit(d)} className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.78rem' }}><Edit size={12} /> Edit</button>
                  <button onClick={() => handleDelete(d.id)} className="btn" style={{ padding: '6px 12px', fontSize: '0.78rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal title={editing ? 'Edit Department' : 'Create Department'} onClose={() => setModalOpen(false)}>
          <ErrorAlert message={error} />
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div><label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-subtle)', display: 'block', marginBottom: '4px' }}>Department Code</label><input value={form.department_code} onChange={e => setForm({ ...form, department_code: e.target.value })} style={inputStyle} required /></div>
            <div><label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-subtle)', display: 'block', marginBottom: '4px' }}>Department Name</label><input value={form.department_name} onChange={e => setForm({ ...form, department_name: e.target.value })} style={inputStyle} required /></div>
            <div><label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-subtle)', display: 'block', marginBottom: '4px' }}>HOD Portal ID</label><input value={form.hod_portal_id} onChange={e => setForm({ ...form, hod_portal_id: e.target.value })} placeholder="e.g. HOD-2026-001" style={inputStyle} /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}><Save size={14} /> {saving ? 'Saving...' : (editing ? 'Update' : 'Create')}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

// ============================================
// 4. SECTIONS TAB
// ============================================
const AdminSectionsTab = () => {
  const [departments, setDepartments] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ section_name: '', batch_year: new Date().getFullYear(), class_advisor_portal_id: '', mentor_portal_id: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([fetchDepartments(), fetchPortalUsers('teacher')])
      .then(([depts, tchs]) => {
        setDepartments(depts || []);
        setTeachers(tchs || []);
        if (depts.length > 0) { setSelectedDept(depts[0].id); }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedDept) {
      fetchSections(selectedDept).then(setSections).catch(console.error);
    }
  }, [selectedDept]);

  const reload = () => { if (selectedDept) fetchSections(selectedDept).then(setSections).catch(console.error); };

  const openCreate = () => { setEditing(null); setForm({ section_name: '', batch_year: new Date().getFullYear(), class_advisor_portal_id: '', mentor_portal_id: '' }); setError(''); setModalOpen(true); };
  const openEdit = (s) => { setEditing(s); setForm({ section_name: s.section_name, batch_year: s.batch_year, class_advisor_portal_id: s.class_advisor_portal_id || '', mentor_portal_id: s.mentor_portal_id || '' }); setError(''); setModalOpen(true); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (editing) {
        await updateSection(editing.id, form);
      } else {
        await createSection(selectedDept, form);
      }
      setModalOpen(false); reload();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this section?')) return;
    try { await deleteSection(id); reload(); } catch (err) { alert(err.message); }
  };

  if (loading) return <div className="glass-panel animate-pop-in" style={{ padding: '40px', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}><p style={{ color: 'var(--text-subtle)' }}>Loading...</p></div>;

  return (
    <div className="animate-pop-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>📋 Sections</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select value={selectedDept || ''} onChange={e => setSelectedDept(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
              {departments.map(d => <option key={d.id} value={d.id}>{d.department_code} — {d.department_name}</option>)}
            </select>
            <button onClick={openCreate} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}><Plus size={14} /> Add Section</button>
          </div>
        </div>

        {sections.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No sections in this department.</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {sections.map(s => (
              <div key={s.id} style={{ padding: '20px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800 }}>Section {s.section_name} ({s.batch_year})</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Advisor: <strong>{s.class_advisor_portal_id || '—'}</strong> | Mentor: <strong>{s.mentor_portal_id || '—'}</strong> | Students: <strong>{s.student_count ?? '—'}</strong>
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => openEdit(s)} className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.78rem' }}><Edit size={12} /> Edit</button>
                  <button onClick={() => handleDelete(s.id)} className="btn" style={{ padding: '6px 12px', fontSize: '0.78rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal title={editing ? 'Edit Section' : 'Create Section'} onClose={() => setModalOpen(false)}>
          <ErrorAlert message={error} />
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div><label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-subtle)', display: 'block', marginBottom: '4px' }}>Section Name</label><input value={form.section_name} onChange={e => setForm({ ...form, section_name: e.target.value })} placeholder="e.g. A, B, C" style={inputStyle} required /></div>
              <div><label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-subtle)', display: 'block', marginBottom: '4px' }}>Batch Year</label><input type="number" value={form.batch_year} onChange={e => setForm({ ...form, batch_year: parseInt(e.target.value) })} style={inputStyle} required /></div>
            </div>
            <div><label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-subtle)', display: 'block', marginBottom: '4px' }}>Class Advisor</label>
              <select value={form.class_advisor_portal_id} onChange={e => setForm({ ...form, class_advisor_portal_id: e.target.value })} style={inputStyle}>
                <option value="">— None —</option>
                {teachers.map(t => <option key={t.portal_id} value={t.portal_id}>{t.portal_id} — {t.name}</option>)}
              </select>
            </div>
            <div><label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-subtle)', display: 'block', marginBottom: '4px' }}>Mentor</label>
              <select value={form.mentor_portal_id} onChange={e => setForm({ ...form, mentor_portal_id: e.target.value })} style={inputStyle}>
                <option value="">— None —</option>
                {teachers.map(t => <option key={t.portal_id} value={t.portal_id}>{t.portal_id} — {t.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}><Save size={14} /> {saving ? 'Saving...' : (editing ? 'Update' : 'Create')}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

// ============================================
// 5. SUBJECTS TAB
// ============================================
const AdminSubjectsTab = ({ onOpenSubject }) => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ code: '', name: '', department: '', description: '', icon: '📚' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadSubjects = () => { setLoading(true); fetchSubjects().then(setSubjects).catch(console.error).finally(() => setLoading(false)); };
  useEffect(() => { loadSubjects(); }, []);

  const openCreate = () => { setEditing(null); setForm({ code: '', name: '', department: '', description: '', icon: '📚' }); setError(''); setModalOpen(true); };
  const openEdit = (s) => { setEditing(s); setForm({ code: s.code, name: s.name, department: s.department || '', description: s.description || '', icon: s.icon || '📚' }); setError(''); setModalOpen(true); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (editing) { await updateSubject(editing.id, form); }
      else { await createSubject(form); }
      setModalOpen(false); loadSubjects();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="glass-panel animate-pop-in" style={{ padding: '40px', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}><p style={{ color: 'var(--text-subtle)' }}>Loading subjects...</p></div>;

  return (
    <div className="animate-pop-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>📚 All Subjects ({subjects.length})</h3>
          <button onClick={openCreate} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}><Plus size={14} /> Add Subject</button>
        </div>

        {subjects.length === 0 ? <p style={{ color: 'var(--text-subtle)' }}>No subjects.</p> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {subjects.map(s => (
              <div key={s.id} style={{ padding: '20px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'transform 0.15s' }}
                onClick={() => onOpenSubject && onOpenSubject(s.id)}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.8rem' }}>{s.icon || '📚'}</span>
                    <div>
                      <h4 style={{ fontWeight: 800, fontSize: '0.95rem' }}>{s.code}</h4>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-subtle)' }}>{s.name}</p>
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); openEdit(s); }} className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '0.7rem' }}><Edit size={11} /></button>
                </div>
                {s.department && <span style={{ display: 'inline-block', marginTop: '10px', fontSize: '0.72rem', padding: '3px 10px', background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', borderRadius: '20px', fontWeight: 700 }}>{s.department}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal title={editing ? 'Edit Subject' : 'Create Subject'} onClose={() => setModalOpen(false)}>
          <ErrorAlert message={error} />
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div><label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-subtle)', display: 'block', marginBottom: '4px' }}>Code</label><input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. B25ADT301" style={inputStyle} required /></div>
              <div><label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-subtle)', display: 'block', marginBottom: '4px' }}>Icon</label><input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} placeholder="📚" style={inputStyle} /></div>
            </div>
            <div><label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-subtle)', display: 'block', marginBottom: '4px' }}>Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} required /></div>
            <div><label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-subtle)', display: 'block', marginBottom: '4px' }}>Department</label><input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="AI&DS" style={inputStyle} /></div>
            <div><label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-subtle)', display: 'block', marginBottom: '4px' }}>Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical' }} /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}><Save size={14} /> {saving ? 'Saving...' : (editing ? 'Update' : 'Create')}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

// ============================================
// 6. OFFERINGS TAB
// ============================================
const AdminOfferingsTab = () => {
  const [offerings, setOfferings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [allSections, setAllSections] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [form, setForm] = useState({ subject_id: '', section_id: '', teacher_portal_id: '', academic_year: '2026-2027' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [reassigning, setReassigning] = useState(null); // offering being reassigned
  const [newTeacher, setNewTeacher] = useState('');

  const loadOfferings = () => { setLoading(true); fetchOfferings().then(setOfferings).catch(console.error).finally(() => setLoading(false)); };

  useEffect(() => {
    Promise.all([fetchOfferings(), fetchSubjects(), fetchDepartments(), fetchPortalUsers('teacher')])
      .then(([offs, subjs, depts, tchs]) => {
        setOfferings(offs || []);
        setSubjects(subjs || []);
        setDepartments(depts || []);
        setTeachers(tchs || []);
        // Flatten all sections from departments
        const secs = [];
        (depts || []).forEach(d => (d.sections || []).forEach(s => secs.push({ ...s, dept: d })));
        setAllSections(secs);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const openCreate = () => { setForm({ subject_id: '', section_id: '', teacher_portal_id: '', academic_year: '2026-2027' }); setError(''); setModalOpen(true); };

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try { await createOffering(form); setModalOpen(false); loadOfferings(); }
    catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleReassign = async () => {
    if (!reassigning || !newTeacher) return;
    try {
      await reassignTeacher(reassigning.id, newTeacher);
      setReassigning(null); setNewTeacher(''); loadOfferings();
    } catch (err) { alert(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this offering? Timetable entries using it must be removed first.')) return;
    try { await deleteOffering(id); loadOfferings(); } catch (err) { alert(err.message); }
  };

  if (loading) return <div className="glass-panel animate-pop-in" style={{ padding: '40px', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}><p style={{ color: 'var(--text-subtle)' }}>Loading offerings...</p></div>;

  return (
    <div className="animate-pop-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>🎯 Subject Offerings ({offerings.length})</h3>
          <button onClick={openCreate} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}><Plus size={14} /> Create Offering</button>
        </div>

        {offerings.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No offerings.</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  {['Subject', 'Section', 'Teacher', 'Year', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 800, fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {offerings.map(o => (
                  <tr key={o.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px 12px' }}><strong>{o.subjects?.code}</strong> — {o.subjects?.name}</td>
                    <td style={{ padding: '10px 12px' }}>{o.sections?.departments?.department_code} / {o.sections?.section_name} ({o.sections?.batch_year})</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>{o.teacher_portal_id}</td>
                    <td style={{ padding: '10px 12px', fontSize: '0.8rem' }}>{o.academic_year || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => { setReassigning(o); setNewTeacher(''); }} className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.72rem' }}><RefreshCw size={11} /> Reassign</button>
                        <button onClick={() => handleDelete(o.id)} className="btn" style={{ padding: '4px 10px', fontSize: '0.72rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}><Trash2 size={11} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal title="Create Offering" onClose={() => setModalOpen(false)}>
          <ErrorAlert message={error} />
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div><label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-subtle)', display: 'block', marginBottom: '4px' }}>Subject</label>
              <select value={form.subject_id} onChange={e => setForm({ ...form, subject_id: e.target.value })} style={inputStyle} required>
                <option value="">— Select —</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
              </select>
            </div>
            <div><label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-subtle)', display: 'block', marginBottom: '4px' }}>Section</label>
              <select value={form.section_id} onChange={e => setForm({ ...form, section_id: e.target.value })} style={inputStyle} required>
                <option value="">— Select —</option>
                {allSections.map(s => <option key={s.id} value={s.id}>{s.dept?.department_code} / {s.section_name} ({s.batch_year})</option>)}
              </select>
            </div>
            <div><label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-subtle)', display: 'block', marginBottom: '4px' }}>Teacher</label>
              <select value={form.teacher_portal_id} onChange={e => setForm({ ...form, teacher_portal_id: e.target.value })} style={inputStyle} required>
                <option value="">— Select —</option>
                {teachers.map(t => <option key={t.portal_id} value={t.portal_id}>{t.portal_id} — {t.name}</option>)}
              </select>
            </div>
            <div><label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-subtle)', display: 'block', marginBottom: '4px' }}>Academic Year</label><input value={form.academic_year} onChange={e => setForm({ ...form, academic_year: e.target.value })} style={inputStyle} /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}><Save size={14} /> {saving ? 'Creating...' : 'Create'}</button>
            </div>
          </form>
        </Modal>
      )}

      {reassigning && (
        <Modal title={`Reassign Teacher — ${reassigning.subjects?.code}`} onClose={() => setReassigning(null)}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>Current: <strong>{reassigning.teacher_portal_id}</strong></p>
          <select value={newTeacher} onChange={e => setNewTeacher(e.target.value)} style={{ ...inputStyle, marginBottom: '16px' }}>
            <option value="">— Select New Teacher —</option>
            {teachers.filter(t => t.portal_id !== reassigning.teacher_portal_id).map(t => <option key={t.portal_id} value={t.portal_id}>{t.portal_id} — {t.name}</option>)}
          </select>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button className="btn btn-outline" onClick={() => setReassigning(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleReassign} disabled={!newTeacher}><RefreshCw size={14} /> Reassign</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ============================================
// 7. TIMETABLE TAB
// ============================================
const AdminTimetableTab = () => {
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);
  const [deptData, setDeptData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState(null);
  const [sectionOfferings, setSectionOfferings] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  useEffect(() => {
    fetchDepartments().then(depts => {
      setDepartments(depts || []);
      if (depts.length > 0) setSelectedDept(depts[0].id);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const loadTimetable = useCallback(() => {
    if (!selectedDept) return;
    setLoading(true);
    fetchDepartmentTimetable(selectedDept)
      .then(data => {
        setDeptData(data);
        if (data.sections?.length > 0 && !selectedSection) {
          setSelectedSection(data.sections[0].id);
          fetchSectionOfferings(data.sections[0].id).then(setSectionOfferings).catch(console.error);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedDept]);

  useEffect(() => { loadTimetable(); }, [loadTimetable]);

  useEffect(() => {
    if (selectedSection) {
      fetchSectionOfferings(selectedSection).then(setSectionOfferings).catch(console.error);
    }
  }, [selectedSection]);

  const handleSave = async (data, entryId) => {
    if (entryId) { await updateTimetableEntry(entryId, data); }
    else { await createTimetableEntry(data); }
    loadTimetable();
  };

  const handleDelete = async (id) => {
    await deleteTimetableEntry(id);
    loadTimetable();
  };

  const handleEditEntry = (entry) => { setEditingEntry(entry); setModalOpen(true); };
  const handleAddEntry = (day, period) => { setEditingEntry({ day_of_week: day, period_number: period }); setModalOpen(true); };

  if (loading && !deptData) return <div className="glass-panel animate-pop-in" style={{ padding: '40px', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}><p style={{ color: 'var(--text-subtle)' }}>Loading timetable...</p></div>;

  const selectedEntries = selectedSection
    ? (deptData?.entries || []).filter(e => e.section_id === selectedSection)
    : deptData?.entries || [];

  return (
    <div className="animate-pop-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>📅 Institution Timetable</h3>
          <select value={selectedDept || ''} onChange={e => { setSelectedDept(e.target.value); setSelectedSection(null); setDeptData(null); }} style={{ ...inputStyle, width: 'auto' }}>
            {departments.map(d => <option key={d.id} value={d.id}>{d.department_code} — {d.department_name}</option>)}
          </select>
        </div>

        {deptData && (
          <>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
              {(deptData.sections || []).map(sec => (
                <button key={sec.id} onClick={() => setSelectedSection(sec.id)} className={`btn ${selectedSection === sec.id ? 'btn-primary' : 'btn-outline'}`} style={{ padding: '8px 16px', fontSize: '0.82rem' }}>
                  Section {sec.section_name} ({sec.batch_year})
                </button>
              ))}
            </div>

            <TimetableGrid
              entries={selectedEntries}
              viewMode="admin"
              editable={true}
              onEditEntry={handleEditEntry}
              onAddEntry={handleAddEntry}
              title={`Section ${(deptData.sections || []).find(s => s.id === selectedSection)?.section_name || ''} Timetable`}
            />
          </>
        )}
      </div>

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

// ============================================
// ADMIN ATTENDANCE TAB
// ============================================
const AdminAttendanceTab = () => {
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDepartments().then(data => {
      setDepartments(data || []);
      if (data?.length > 0) setSelectedDept(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedDept) return;
    fetchSections(selectedDept).then(data => {
      setSections(data || []);
      if (data?.length > 0) setSelectedSection(data[0].id);
      else setSelectedSection(null);
    });
  }, [selectedDept]);

  useEffect(() => {
    if (!selectedSection) {
      setAttendanceData([]);
      return;
    }
    setLoading(true);
    fetchSectionAttendanceSummary(selectedSection)
      .then(data => {
        setAttendanceData(data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedSection]);

  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', fontSize: '0.9rem' };

  return (
    <div className="animate-pop-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>✅ Institution Attendance Overview</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <select value={selectedDept || ''} onChange={e => setSelectedDept(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
              {departments.map(d => <option key={d.id} value={d.id}>{d.department_code} — {d.department_name}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {sections.map(sec => (
            <button key={sec.id} onClick={() => setSelectedSection(sec.id)} className={`btn ${selectedSection === sec.id ? 'btn-primary' : 'btn-outline'}`} style={{ padding: '8px 16px', fontSize: '0.82rem' }}>
              Section {sec.section_name} ({sec.batch_year})
            </button>
          ))}
          {sections.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No sections found for this department.</p>}
        </div>

        {selectedSection && (
          <div style={{ marginTop: '20px' }}>
            {loading ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>Loading attendance...</p>
            ) : attendanceData.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No attendance records found for this section.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {attendanceData.map(student => (
                  <div key={student.portal_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: 'var(--bg-surface)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <div>
                      <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{student.name}</span>
                      <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)' }}>ID: {student.portal_id}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 900, fontSize: '1.2rem', color: student.percentage >= 75 ? '#10b981' : '#ef4444' }}>
                        {student.percentage !== null ? `${student.percentage}%` : 'N/A'}
                      </span>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {student.present} / {student.total_classes} Classes Present
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;