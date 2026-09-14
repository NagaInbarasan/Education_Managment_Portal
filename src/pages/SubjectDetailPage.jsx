import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Megaphone, FileText, ClipboardList, FlaskConical, BarChart3, Upload, Plus, Trash2, Download, Edit, Check, X, Send, Clock, Award } from 'lucide-react';
import * as api from '../lib/api';

const SubjectDetailPage = ({ subjectId, offeringId, onBack, userRole }) => {
  const [offering, setOffering] = useState(null);
  const [subject, setSubject] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Tab data
  const [announcements, setAnnouncements] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [tests, setTests] = useState([]);
  const [results, setResults] = useState({ assignmentResults: [], testResults: [] });

  // Modal states
  const [showModal, setShowModal] = useState(null); // 'announcement' | 'document' | 'assignment' | 'test' | 'question' | 'grade'
  const [modalData, setModalData] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const isTeacher = userRole === 'teacher';
  const isAdmin = userRole === 'admin';
  const isStudent = userRole === 'student';
  const canManage = isTeacher || isAdmin;

  const loadSubject = useCallback(async () => {
    try {
      setLoading(true);
      if (offeringId) {
        const data = await api.fetchOffering(offeringId);
        setOffering(data);
        setSubject(data.subjects);
      } else {
        // Fallback for cases without offeringId, though all flows should have it now
        const data = await api.fetchSubject(subjectId);
        setSubject(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [subjectId, offeringId]);

  const loadTabData = useCallback(async (tab) => {
    if (!offeringId) return; // Need offeringId to load tab data
    try {
      if (tab === 'announcements') setAnnouncements(await api.fetchAnnouncements(offeringId));
      if (tab === 'materials') setDocuments(await api.fetchDocuments(offeringId));
      if (tab === 'assignments') setAssignments(await api.fetchAssignments(offeringId));
      if (tab === 'tests') setTests(await api.fetchTests(offeringId));
      if (tab === 'results') setResults(await api.fetchSubjectResults(offeringId));
    } catch (err) {
      console.error('Load tab error:', err);
    }
  }, [offeringId]);

  useEffect(() => { loadSubject(); }, [loadSubject]);
  useEffect(() => { if (activeTab !== 'overview') loadTabData(activeTab); }, [activeTab, loadTabData]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <FileText size={16} /> },
    { id: 'announcements', label: 'Announcements', icon: <Megaphone size={16} /> },
    { id: 'materials', label: 'Materials', icon: <FileText size={16} /> },
    { id: 'assignments', label: 'Assignments', icon: <ClipboardList size={16} /> },
    { id: 'tests', label: 'Tests', icon: <FlaskConical size={16} /> },
    { id: 'results', label: 'Results', icon: <BarChart3 size={16} /> },
  ];

  // ---- MODAL HANDLERS ----

  const handleCreateAnnouncement = async () => {
    setSubmitting(true);
    try {
      if (modalData.id) {
        await api.updateAnnouncement(offeringId, modalData.id, { title: modalData.title, content: modalData.content });
      } else {
        await api.createAnnouncement(offeringId, { title: modalData.title, content: modalData.content });
      }
      setShowModal(null);
      setModalData({});
      loadTabData('announcements');
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadDocument = async () => {
    if (!modalData.file || !modalData.title) return alert('File and title required');
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('file', modalData.file);
      fd.append('title', modalData.title);
      if (modalData.description) fd.append('description', modalData.description);
      if (modalData.unit_or_module) fd.append('unit_or_module', modalData.unit_or_module);
      await api.uploadDocument(offeringId, fd);
      setShowModal(null);
      setModalData({});
      loadTabData('materials');
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAssignment = async () => {
    setSubmitting(true);
    try {
      if (modalData.id) {
        await api.updateAssignment(modalData.id, modalData);
      } else {
        await api.createAssignment(offeringId, modalData);
      }
      setShowModal(null);
      setModalData({});
      loadTabData('assignments');
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateTest = async () => {
    setSubmitting(true);
    try {
      if (modalData.id) {
        await api.updateTest(modalData.id, modalData);
      } else {
        await api.createTest(offeringId, modalData);
      }
      setShowModal(null);
      setModalData({});
      loadTabData('tests');
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async (docId) => {
    try {
      const { url } = await api.getDocumentDownloadUrl(docId);
      window.open(url, '_blank');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!confirm('Delete this document?')) return;
    try {
      await api.deleteDocument(offeringId, docId);
      loadTabData('materials');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteAnnouncement = async (annId) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      await api.deleteAnnouncement(offeringId, annId);
      loadTabData('announcements');
    } catch (err) {
      alert(err.message);
    }
  };

  // ---- RENDER HELPERS ----

  const renderModal = () => {
    if (!showModal) return null;
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowModal(null)}>
        <div className="glass-panel" style={{ padding: '32px', borderRadius: 'var(--radius-lg)', maxWidth: '560px', width: '90%', maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
          {showModal === 'announcement' && renderAnnouncementForm()}
          {showModal === 'document' && renderDocumentForm()}
          {showModal === 'assignment' && renderAssignmentForm()}
          {showModal === 'test' && renderTestForm()}
          {showModal === 'question' && renderQuestionForm()}
          {showModal === 'submissions' && renderSubmissionsView()}
          {showModal === 'take-test' && renderTakeTest()}
          {showModal === 'grade-submission' && renderGradeForm()}
          {showModal === 'test-submissions' && renderTestSubmissionsView()}
        </div>
      </div>
    );
  };

  const renderAnnouncementForm = () => (
    <>
      <h3 style={{ fontWeight: 800, marginBottom: '20px' }}>{modalData.id ? 'Edit' : 'New'} Announcement</h3>
      <input className="glass-panel" style={inputStyle} placeholder="Title" value={modalData.title || ''} onChange={e => setModalData({ ...modalData, title: e.target.value })} />
      <textarea className="glass-panel" style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }} placeholder="Content" value={modalData.content || ''} onChange={e => setModalData({ ...modalData, content: e.target.value })} />
      <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={handleCreateAnnouncement} disabled={submitting}>
        {submitting ? 'Saving...' : 'Save'}
      </button>
    </>
  );

  const renderDocumentForm = () => (
    <>
      <h3 style={{ fontWeight: 800, marginBottom: '20px' }}>Upload Material</h3>
      <input className="glass-panel" style={inputStyle} placeholder="Title" value={modalData.title || ''} onChange={e => setModalData({ ...modalData, title: e.target.value })} />
      <input className="glass-panel" style={inputStyle} placeholder="Description (optional)" value={modalData.description || ''} onChange={e => setModalData({ ...modalData, description: e.target.value })} />
      <input className="glass-panel" style={inputStyle} placeholder="Unit/Module (e.g. Unit 1)" value={modalData.unit_or_module || ''} onChange={e => setModalData({ ...modalData, unit_or_module: e.target.value })} />
      <input type="file" style={{ marginTop: '12px' }} accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.png,.jpg,.jpeg" onChange={e => setModalData({ ...modalData, file: e.target.files[0] })} />
      <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={handleUploadDocument} disabled={submitting}>
        {submitting ? 'Uploading...' : 'Upload'}
      </button>
    </>
  );

  const renderAssignmentForm = () => (
    <>
      <h3 style={{ fontWeight: 800, marginBottom: '20px' }}>{modalData.id ? 'Edit' : 'Create'} Assignment</h3>
      <input className="glass-panel" style={inputStyle} placeholder="Title" value={modalData.title || ''} onChange={e => setModalData({ ...modalData, title: e.target.value })} />
      <textarea className="glass-panel" style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} placeholder="Description" value={modalData.description || ''} onChange={e => setModalData({ ...modalData, description: e.target.value })} />
      <textarea className="glass-panel" style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} placeholder="Instructions" value={modalData.instructions || ''} onChange={e => setModalData({ ...modalData, instructions: e.target.value })} />
      <input className="glass-panel" style={inputStyle} placeholder="Unit/Module" value={modalData.unit_or_module || ''} onChange={e => setModalData({ ...modalData, unit_or_module: e.target.value })} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={labelStyle}>Due Date</label>
          <input type="datetime-local" className="glass-panel" style={inputStyle} value={modalData.due_date ? modalData.due_date.slice(0, 16) : ''} onChange={e => setModalData({ ...modalData, due_date: new Date(e.target.value).toISOString() })} />
        </div>
        <div>
          <label style={labelStyle}>Max Marks</label>
          <input type="number" className="glass-panel" style={inputStyle} value={modalData.max_marks || 100} onChange={e => setModalData({ ...modalData, max_marks: parseInt(e.target.value) })} />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Status</label>
        <select className="glass-panel" style={inputStyle} value={modalData.status || 'draft'} onChange={e => setModalData({ ...modalData, status: e.target.value })}>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="closed">Closed</option>
        </select>
      </div>
      <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={handleCreateAssignment} disabled={submitting}>
        {submitting ? 'Saving...' : 'Save Assignment'}
      </button>
    </>
  );

  const renderTestForm = () => (
    <>
      <h3 style={{ fontWeight: 800, marginBottom: '20px' }}>{modalData.id ? 'Edit' : 'Create'} Test</h3>
      <input className="glass-panel" style={inputStyle} placeholder="Title" value={modalData.title || ''} onChange={e => setModalData({ ...modalData, title: e.target.value })} />
      <textarea className="glass-panel" style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} placeholder="Description" value={modalData.description || ''} onChange={e => setModalData({ ...modalData, description: e.target.value })} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={labelStyle}>Duration (mins)</label>
          <input type="number" className="glass-panel" style={inputStyle} value={modalData.duration_minutes || ''} onChange={e => setModalData({ ...modalData, duration_minutes: parseInt(e.target.value) })} />
        </div>
        <div>
          <label style={labelStyle}>Max Marks</label>
          <input type="number" className="glass-panel" style={inputStyle} value={modalData.max_marks || 100} onChange={e => setModalData({ ...modalData, max_marks: parseInt(e.target.value) })} />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Status</label>
        <select className="glass-panel" style={inputStyle} value={modalData.status || 'draft'} onChange={e => setModalData({ ...modalData, status: e.target.value })}>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="closed">Closed</option>
        </select>
      </div>
      <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={handleCreateTest} disabled={submitting}>
        {submitting ? 'Saving...' : 'Save Test'}
      </button>
    </>
  );

  const renderQuestionForm = () => {
    const qType = modalData.question_type || 'mcq';
    return (
      <>
        <h3 style={{ fontWeight: 800, marginBottom: '20px' }}>Add Question</h3>
        <textarea className="glass-panel" style={{ ...inputStyle, minHeight: '60px' }} placeholder="Question text" value={modalData.question_text || ''} onChange={e => setModalData({ ...modalData, question_text: e.target.value })} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Type</label>
            <select className="glass-panel" style={inputStyle} value={qType} onChange={e => setModalData({ ...modalData, question_type: e.target.value })}>
              <option value="mcq">MCQ</option>
              <option value="true_false">True/False</option>
              <option value="short_answer">Short Answer</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Marks</label>
            <input type="number" className="glass-panel" style={inputStyle} value={modalData.marks || 1} onChange={e => setModalData({ ...modalData, marks: parseInt(e.target.value) })} />
          </div>
        </div>
        {qType === 'mcq' && (
          <>
            {['A', 'B', 'C', 'D'].map((opt, i) => (
              <input key={opt} className="glass-panel" style={inputStyle} placeholder={`Option ${opt}`}
                value={(modalData.options || [])[i] || ''}
                onChange={e => {
                  const opts = [...(modalData.options || ['', '', '', ''])];
                  opts[i] = e.target.value;
                  setModalData({ ...modalData, options: opts });
                }} />
            ))}
          </>
        )}
        {qType !== 'short_answer' && (
          <input className="glass-panel" style={inputStyle} placeholder="Correct answer" value={modalData.correct_answer || ''} onChange={e => setModalData({ ...modalData, correct_answer: e.target.value })} />
        )}
        <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={async () => {
          setSubmitting(true);
          try {
            await api.addTestQuestion(modalData.test_id, modalData);
            setShowModal(null);
            setModalData({});
            loadTabData('tests');
          } catch (err) { alert(err.message); }
          finally { setSubmitting(false); }
        }} disabled={submitting}>{submitting ? 'Adding...' : 'Add Question'}</button>
      </>
    );
  };

  // Assignment submissions view (teacher)
  const renderSubmissionsView = () => {
    const [subs, setSubs] = useState([]);
    const [loadingSubs, setLoadingSubs] = useState(true);
    useEffect(() => {
      api.fetchSubmissions(modalData.assignment_id).then(d => { setSubs(d); setLoadingSubs(false); }).catch(() => setLoadingSubs(false));
    }, []);
    return (
      <>
        <h3 style={{ fontWeight: 800, marginBottom: '20px' }}>Submissions — {modalData.assignment_title}</h3>
        {loadingSubs ? <p>Loading...</p> : subs.length === 0 ? <p style={{ color: 'var(--text-subtle)' }}>No submissions yet</p> :
          subs.map(s => (
            <div key={s.id} className="glass-panel" style={{ padding: '16px', marginBottom: '12px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{s.student_name}</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginLeft: '8px' }}>{s.student_portal_id}</span>
                </div>
                <span style={{ ...statusBadge(s.status) }}>{s.status}</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', marginTop: '4px' }}>Submitted: {new Date(s.submitted_at).toLocaleString()}</p>
              {s.marks_obtained !== null && <p style={{ marginTop: '4px', fontWeight: 700 }}>Marks: {s.marks_obtained} | Feedback: {s.feedback || '—'}</p>}
              {s.status === 'submitted' && canManage && (
                <button className="btn btn-primary" style={{ marginTop: '8px', padding: '6px 12px', fontSize: '0.8rem' }}
                  onClick={() => { setShowModal('grade-submission'); setModalData({ submission_id: s.id, student_name: s.student_name, marks_obtained: '', feedback: '' }); }}>
                  Grade
                </button>
              )}
            </div>
          ))}
      </>
    );
  };

  const renderGradeForm = () => (
    <>
      <h3 style={{ fontWeight: 800, marginBottom: '20px' }}>Grade — {modalData.student_name}</h3>
      <input type="number" className="glass-panel" style={inputStyle} placeholder="Marks" value={modalData.marks_obtained || ''} onChange={e => setModalData({ ...modalData, marks_obtained: parseInt(e.target.value) })} />
      <textarea className="glass-panel" style={{ ...inputStyle, minHeight: '60px' }} placeholder="Feedback" value={modalData.feedback || ''} onChange={e => setModalData({ ...modalData, feedback: e.target.value })} />
      <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={async () => {
        setSubmitting(true);
        try {
          await api.gradeSubmission(modalData.submission_id, { marks_obtained: modalData.marks_obtained, feedback: modalData.feedback });
          setShowModal(null);
          setModalData({});
          loadTabData('assignments');
        } catch (err) { alert(err.message); }
        finally { setSubmitting(false); }
      }} disabled={submitting}>{submitting ? 'Saving...' : 'Submit Grade'}</button>
    </>
  );

  // Take test view (student)
  const renderTakeTest = () => {
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [loadingQ, setLoadingQ] = useState(true);
    useEffect(() => {
      api.fetchTestQuestions(modalData.test_id).then(d => { setQuestions(d); setLoadingQ(false); }).catch(() => setLoadingQ(false));
    }, []);

    const handleSubmitTest = async () => {
      setSubmitting(true);
      try {
        const ansArr = Object.entries(answers).map(([question_id, student_answer]) => ({ question_id, student_answer }));
        await api.submitTest(modalData.test_id, ansArr);
        alert('Test submitted successfully!');
        setShowModal(null);
        setModalData({});
        loadTabData('tests');
      } catch (err) { alert(err.message); }
      finally { setSubmitting(false); }
    };

    return (
      <>
        <h3 style={{ fontWeight: 800, marginBottom: '20px' }}>{modalData.test_title}</h3>
        {loadingQ ? <p>Loading questions...</p> :
          questions.map((q, idx) => (
            <div key={q.id} className="glass-panel" style={{ padding: '16px', marginBottom: '12px', borderRadius: 'var(--radius-md)' }}>
              <p style={{ fontWeight: 700 }}>Q{idx + 1}. {q.question_text} <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>({q.marks} marks)</span></p>
              {q.question_type === 'mcq' && (q.options || []).map((opt, i) => (
                <label key={i} style={{ display: 'block', marginTop: '6px', cursor: 'pointer' }}>
                  <input type="radio" name={`q-${q.id}`} value={opt} checked={answers[q.id] === opt} onChange={() => setAnswers({ ...answers, [q.id]: opt })} style={{ marginRight: '8px' }} />
                  {opt}
                </label>
              ))}
              {q.question_type === 'true_false' && ['True', 'False'].map(opt => (
                <label key={opt} style={{ display: 'block', marginTop: '6px', cursor: 'pointer' }}>
                  <input type="radio" name={`q-${q.id}`} value={opt} checked={answers[q.id] === opt} onChange={() => setAnswers({ ...answers, [q.id]: opt })} style={{ marginRight: '8px' }} />
                  {opt}
                </label>
              ))}
              {q.question_type === 'short_answer' && (
                <textarea className="glass-panel" style={{ ...inputStyle, minHeight: '50px', marginTop: '8px' }} placeholder="Your answer" value={answers[q.id] || ''} onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })} />
              )}
            </div>
          ))}
        {questions.length > 0 && (
          <button className="btn btn-primary" style={{ marginTop: '12px' }} onClick={handleSubmitTest} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Test'}
          </button>
        )}
      </>
    );
  };

  // Test submissions view (teacher)
  const renderTestSubmissionsView = () => {
    const [subs, setSubs] = useState([]);
    const [loadingSubs, setLoadingSubs] = useState(true);
    useEffect(() => {
      api.fetchTestSubmissions(modalData.test_id).then(d => { setSubs(d); setLoadingSubs(false); }).catch(() => setLoadingSubs(false));
    }, []);
    return (
      <>
        <h3 style={{ fontWeight: 800, marginBottom: '20px' }}>Test Submissions — {modalData.test_title}</h3>
        {loadingSubs ? <p>Loading...</p> : subs.length === 0 ? <p style={{ color: 'var(--text-subtle)' }}>No submissions yet</p> :
          subs.map(s => (
            <div key={s.id} className="glass-panel" style={{ padding: '16px', marginBottom: '12px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <strong>{s.student_name}</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginLeft: '8px' }}>{s.student_portal_id}</span>
                </div>
                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{s.total_marks_obtained} marks</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>Status: {s.status} | Submitted: {new Date(s.submitted_at).toLocaleString()}</p>
            </div>
          ))}
      </>
    );
  };

  // ---- TAB CONTENT ----

  const renderOverview = () => (
    <div className="animate-pop-in">
      <div className="glass-panel" style={{ padding: '32px', borderRadius: 'var(--radius-lg)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <span style={{ fontSize: '2.5rem' }}>{subject?.icon || '📚'}</span>
          <div>
            <h2 style={{ fontWeight: 800, fontSize: '1.5rem' }}>{subject?.code} — {subject?.name}</h2>
            <p style={{ color: 'var(--text-subtle)', marginTop: '4px' }}>{subject?.department}</p>
          </div>
        </div>
        <p style={{ lineHeight: 1.6, color: 'var(--text-subtle)' }}>{subject?.description}</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
          <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>{subject?.subject_teachers?.length || 0}</p>
          <p style={{ color: 'var(--text-subtle)', fontSize: '0.85rem' }}>Teachers</p>
        </div>
        <div className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
          <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>{subject?.subject_enrollments?.length || 0}</p>
          <p style={{ color: 'var(--text-subtle)', fontSize: '0.85rem' }}>Students</p>
        </div>
      </div>
      {subject?.subject_teachers?.length > 0 && (
        <div className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--radius-md)', marginTop: '16px' }}>
          <h4 style={{ fontWeight: 700, marginBottom: '12px' }}>Faculty</h4>
          {subject.subject_teachers.map(t => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(var(--primary-rgb), 0.1)' }}>
              <span>{t.teacher_name}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>{t.teacher_portal_id}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderAnnouncements = () => (
    <div className="animate-pop-in">
      {canManage && (
        <button className="btn btn-primary" style={{ marginBottom: '16px' }} onClick={() => { setShowModal('announcement'); setModalData({}); }}>
          <Plus size={16} style={{ marginRight: '6px' }} /> New Announcement
        </button>
      )}
      {announcements.length === 0 ? <p style={{ color: 'var(--text-subtle)' }}>No announcements yet.</p> :
        announcements.map(a => (
          <div key={a.id} className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--radius-md)', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h4 style={{ fontWeight: 700 }}>{a.title}</h4>
                <p style={{ marginTop: '8px', lineHeight: 1.5, color: 'var(--text-subtle)' }}>{a.content}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '8px' }}>
                  By {a.posted_by_name} · {new Date(a.created_at).toLocaleDateString()}
                </p>
              </div>
              {canManage && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-outline" style={{ padding: '6px' }} onClick={() => { setShowModal('announcement'); setModalData({ id: a.id, title: a.title, content: a.content }); }}><Edit size={14} /></button>
                  <button className="btn btn-outline" style={{ padding: '6px', color: '#ef4444' }} onClick={() => handleDeleteAnnouncement(a.id)}><Trash2 size={14} /></button>
                </div>
              )}
            </div>
          </div>
        ))
      }
    </div>
  );

  const renderMaterials = () => {
    const grouped = {};
    documents.forEach(d => {
      const unit = d.unit_or_module || 'General';
      if (!grouped[unit]) grouped[unit] = [];
      grouped[unit].push(d);
    });

    return (
      <div className="animate-pop-in">
        {canManage && (
          <button className="btn btn-primary" style={{ marginBottom: '16px' }} onClick={() => { setShowModal('document'); setModalData({}); }}>
            <Upload size={16} style={{ marginRight: '6px' }} /> Upload Material
          </button>
        )}
        {Object.keys(grouped).length === 0 ? <p style={{ color: 'var(--text-subtle)' }}>No materials uploaded yet.</p> :
          Object.entries(grouped).map(([unit, docs]) => (
            <div key={unit} style={{ marginBottom: '24px' }}>
              <h4 style={{ fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📂 {unit}
              </h4>
              {docs.map(d => (
                <div key={d.id} className="glass-panel" style={{ padding: '14px 20px', borderRadius: 'var(--radius-md)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontWeight: 600 }}>{d.title}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>{d.file_name} · {(d.file_size / 1024).toFixed(0)} KB · {new Date(d.created_at).toLocaleDateString()}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {d.index_status && (
                      <span style={{
                        fontSize: '0.68rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 700,
                        background: d.index_status === 'indexed' ? 'rgba(16,185,129,0.12)' : d.index_status === 'indexing' ? 'rgba(245,158,11,0.12)' : d.index_status === 'failed' ? 'rgba(239,68,68,0.12)' : 'rgba(107,114,128,0.1)',
                        color: d.index_status === 'indexed' ? '#10b981' : d.index_status === 'indexing' ? '#d97706' : d.index_status === 'failed' ? '#ef4444' : '#6b7280'
                      }}>
                        {d.index_status === 'indexed' ? '✅ AI Ready' : d.index_status === 'indexing' ? '⏳ Indexing' : d.index_status === 'failed' ? '❌ Failed' : '⬜ Not indexed'}
                      </span>
                    )}
                    {canManage && (
                      <button
                        className="btn btn-outline"
                        style={{ padding: '6px 10px', fontSize: '0.72rem', fontWeight: 700 }}
                        onClick={async () => {
                          try {
                            const result = await api.indexDocumentForAi(d.id);
                            alert(result.message || 'Document indexed!');
                            // Refresh documents
                            setDocuments(await api.fetchDocuments(offeringId));
                          } catch (err) {
                            alert('Index failed: ' + (err.message || 'Unknown error'));
                          }
                        }}
                      >
                        🧠 Index AI
                      </button>
                    )}
                    <button className="btn btn-outline" style={{ padding: '6px' }} onClick={() => handleDownload(d.id)}><Download size={14} /></button>
                    {canManage && (
                      <button className="btn btn-outline" style={{ padding: '6px', color: '#ef4444' }} onClick={() => handleDeleteDocument(d.id)}><Trash2 size={14} /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))
        }
      </div>
    );
  };

  const renderAssignments = () => (
    <div className="animate-pop-in">
      {canManage && (
        <button className="btn btn-primary" style={{ marginBottom: '16px' }} onClick={() => { setShowModal('assignment'); setModalData({ max_marks: 100, status: 'draft' }); }}>
          <Plus size={16} style={{ marginRight: '6px' }} /> Create Assignment
        </button>
      )}
      {assignments.length === 0 ? <p style={{ color: 'var(--text-subtle)' }}>No assignments yet.</p> :
        assignments.map(a => (
          <div key={a.id} className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--radius-md)', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h4 style={{ fontWeight: 700 }}>{a.title}</h4>
                  <span style={{ ...statusBadge(a.status) }}>{a.status}</span>
                </div>
                {a.description && <p style={{ fontSize: '0.85rem', color: 'var(--text-subtle)', marginTop: '4px' }}>{a.description}</p>}
                <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-subtle)' }}>
                  {a.due_date && <span><Clock size={12} style={{ marginRight: '4px' }} />Due: {new Date(a.due_date).toLocaleDateString()}</span>}
                  <span><Award size={12} style={{ marginRight: '4px' }} />{a.max_marks} marks</span>
                  {a.unit_or_module && <span>📂 {a.unit_or_module}</span>}
                </div>
              </div>
            </div>

            {/* Student submission status */}
            {isStudent && a.my_submission && (
              <div style={{ marginTop: '12px', padding: '10px', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--primary-rgb), 0.05)' }}>
                <p style={{ fontSize: '0.85rem' }}>
                  <strong>Status:</strong> {a.my_submission.status}
                  {a.my_submission.marks_obtained !== null && <> · <strong>Marks:</strong> {a.my_submission.marks_obtained}/{a.max_marks}</>}
                  {a.my_submission.feedback && <> · <strong>Feedback:</strong> {a.my_submission.feedback}</>}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              {isStudent && a.status === 'published' && !a.my_submission && (
                <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '0.8rem' }} onClick={async () => {
                  try {
                    await api.submitAssignment(a.id, { submission_text: 'Submitted' });
                    alert('Assignment submitted!');
                    loadTabData('assignments');
                  } catch (err) { alert(err.message); }
                }}>
                  <Send size={12} style={{ marginRight: '4px' }} /> Submit
                </button>
              )}
              {canManage && (
                <>
                  <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    onClick={() => { setShowModal('assignment'); setModalData({ ...a }); }}>
                    <Edit size={12} style={{ marginRight: '4px' }} /> Edit
                  </button>
                  <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    onClick={() => { setShowModal('submissions'); setModalData({ assignment_id: a.id, assignment_title: a.title }); }}>
                    View Submissions
                  </button>
                </>
              )}
            </div>
          </div>
        ))
      }
    </div>
  );

  const renderTests = () => (
    <div className="animate-pop-in">
      {canManage && (
        <button className="btn btn-primary" style={{ marginBottom: '16px' }} onClick={() => { setShowModal('test'); setModalData({ max_marks: 100, status: 'draft' }); }}>
          <Plus size={16} style={{ marginRight: '6px' }} /> Create Test
        </button>
      )}
      {tests.length === 0 ? <p style={{ color: 'var(--text-subtle)' }}>No tests yet.</p> :
        tests.map(t => (
          <div key={t.id} className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--radius-md)', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h4 style={{ fontWeight: 700 }}>{t.title}</h4>
                  <span style={{ ...statusBadge(t.status) }}>{t.status}</span>
                  {t.results_released && <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '8px', background: '#10b981', color: '#fff' }}>Results Released</span>}
                </div>
                {t.description && <p style={{ fontSize: '0.85rem', color: 'var(--text-subtle)', marginTop: '4px' }}>{t.description}</p>}
                <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-subtle)' }}>
                  <span><Award size={12} style={{ marginRight: '4px' }} />{t.max_marks} marks</span>
                  {t.duration_minutes && <span><Clock size={12} style={{ marginRight: '4px' }} />{t.duration_minutes} mins</span>}
                </div>
              </div>
            </div>

            {/* Student: show result if released */}
            {isStudent && t.my_submission && (
              <div style={{ marginTop: '12px', padding: '10px', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--primary-rgb), 0.05)' }}>
                <p style={{ fontSize: '0.85rem' }}>
                  <strong>Status:</strong> {t.my_submission.status}
                  {t.results_released && t.my_submission.total_marks_obtained !== null && (
                    <> · <strong>Score:</strong> {t.my_submission.total_marks_obtained}/{t.max_marks} ({Math.round((t.my_submission.total_marks_obtained / t.max_marks) * 100)}%)</>
                  )}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              {isStudent && t.status === 'published' && !t.my_submission && (
                <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                  onClick={() => { setShowModal('take-test'); setModalData({ test_id: t.id, test_title: t.title }); }}>
                  <FlaskConical size={12} style={{ marginRight: '4px' }} /> Take Test
                </button>
              )}
              {canManage && (
                <>
                  <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    onClick={() => { setShowModal('test'); setModalData({ ...t }); }}>
                    <Edit size={12} style={{ marginRight: '4px' }} /> Edit
                  </button>
                  <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    onClick={() => { setShowModal('question'); setModalData({ test_id: t.id, question_order: 1, marks: 1, question_type: 'mcq' }); }}>
                    <Plus size={12} style={{ marginRight: '4px' }} /> Add Question
                  </button>
                  <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    onClick={() => { setShowModal('test-submissions'); setModalData({ test_id: t.id, test_title: t.title }); }}>
                    Submissions
                  </button>
                  <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    onClick={async () => {
                      try {
                        await api.releaseTestResults(t.id, !t.results_released);
                        loadTabData('tests');
                      } catch (err) { alert(err.message); }
                    }}>
                    {t.results_released ? 'Hide Results' : 'Release Results'}
                  </button>
                </>
              )}
            </div>
          </div>
        ))
      }
    </div>
  );

  const renderResults = () => (
    <div className="animate-pop-in">
      <h4 style={{ fontWeight: 700, marginBottom: '16px' }}>📝 Assignment Results</h4>
      {results.assignmentResults.length === 0 ? <p style={{ color: 'var(--text-subtle)' }}>No graded assignments.</p> :
        results.assignmentResults.map((r, i) => (
          <div key={i} className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontWeight: 600 }}>{r.title}</p>
              {r.feedback && <p style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>Feedback: {r.feedback}</p>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)' }}>{r.marks_obtained}/{r.max_marks}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>{Math.round((r.marks_obtained / r.max_marks) * 100)}%</p>
            </div>
          </div>
        ))
      }

      <h4 style={{ fontWeight: 700, marginTop: '24px', marginBottom: '16px' }}>🧪 Test Results</h4>
      {results.testResults.length === 0 ? <p style={{ color: 'var(--text-subtle)' }}>No released test results.</p> :
        results.testResults.map((r, i) => (
          <div key={i} className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontWeight: 600 }}>{r.title}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)' }}>{r.total_marks_obtained}/{r.max_marks}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>{Math.round((r.total_marks_obtained / r.max_marks) * 100)}%</p>
            </div>
          </div>
        ))
      }
    </div>
  );

  if (loading) return <div className="non-statistics-panel animate-pop-in" style={{ marginTop: '40px', textAlign: 'center', padding: '60px' }}><p>Loading subject...</p></div>;
  if (error) return <div className="non-statistics-panel animate-pop-in" style={{ marginTop: '40px', textAlign: 'center', padding: '60px', color: '#ef4444' }}><p>Error: {error}</p></div>;

  return (
    <div style={{ marginTop: '40px', paddingBottom: '80px' }}>
      {/* Back button */}
      <button className="btn btn-outline" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={onBack}>
        <ArrowLeft size={16} /> Back
      </button>

      {/* Tab nav */}
      <div className="glass-panel" style={{ padding: '8px', borderRadius: 'var(--radius-md)', display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {tabs.map(tab => (
          <button key={tab.id}
            className={activeTab === tab.id ? 'btn btn-primary' : 'btn btn-outline'}
            style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setActiveTab(tab.id)}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'announcements' && renderAnnouncements()}
      {activeTab === 'materials' && renderMaterials()}
      {activeTab === 'assignments' && renderAssignments()}
      {activeTab === 'tests' && renderTests()}
      {activeTab === 'results' && renderResults()}

      {/* Modals */}
      {renderModal()}
    </div>
  );
};

// Styles
const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid rgba(var(--primary-rgb), 0.2)',
  marginTop: '8px',
  fontSize: '0.9rem',
  background: 'transparent',
  color: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle = {
  fontSize: '0.8rem',
  fontWeight: 600,
  color: 'var(--text-subtle)',
  marginTop: '12px',
  display: 'block',
};

const statusBadge = (status) => ({
  fontSize: '0.7rem',
  fontWeight: 700,
  padding: '2px 8px',
  borderRadius: '8px',
  background: status === 'published' ? 'rgba(16,185,129,0.1)' : status === 'closed' ? 'rgba(239,68,68,0.1)' : 'rgba(var(--primary-rgb),0.1)',
  color: status === 'published' ? '#10b981' : status === 'closed' ? '#ef4444' : 'var(--primary)',
});

export default SubjectDetailPage;
