const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

/**
 * Get the stored auth token.
 */
function getAuthToken() {
  return localStorage.getItem('phazon_auth_token') || '';
}

/**
 * Get the logged-in user info from localStorage.
 */
export function getLoggedInUser() {
  try {
    return JSON.parse(localStorage.getItem('phazon_logged_in_user') || 'null');
  } catch {
    return null;
  }
}

/**
 * Make an authenticated API request with Bearer token.
 */
async function apiRequest(path, options = {}) {
  const token = getAuthToken();
  const headers = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData (let browser set boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // Handle 401 — token expired or invalid → auto-logout
  if (res.status === 401) {
    localStorage.removeItem('phazon_auth_token');
    localStorage.removeItem('phazon_logged_in_user');
    window.dispatchEvent(new Event('phazon_logout'));
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Session expired. Please sign in again.');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// --- AUTHENTICATION ---
export const loginUser = (portal_id, password) =>
  fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ portal_id, password })
  }).then(async res => {
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data;
  });

export const fetchCurrentUser = () => apiRequest('/auth/me');

// --- SUBJECTS ---
export const fetchSubjects = () => apiRequest('/subjects');
export const fetchSubject = (id) => apiRequest(`/subjects/${id}`);
export const createSubject = (body) => apiRequest('/subjects', { method: 'POST', body: JSON.stringify(body) });
export const updateSubject = (id, body) => apiRequest(`/subjects/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteSubject = (id) => apiRequest(`/subjects/${id}`, { method: 'DELETE' });

// --- TEACHERS ---
export const assignTeacher = (subjectId, teacher_portal_id) =>
  apiRequest(`/subjects/${subjectId}/teachers`, { method: 'POST', body: JSON.stringify({ teacher_portal_id }) });
export const removeTeacher = (subjectId, portalId) =>
  apiRequest(`/subjects/${subjectId}/teachers/${portalId}`, { method: 'DELETE' });

// --- ENROLLMENTS ---
export const enrollStudent = (subjectId, student_portal_id) =>
  apiRequest(`/subjects/${subjectId}/enrollments`, { method: 'POST', body: JSON.stringify({ student_portal_id }) });
export const removeStudent = (subjectId, portalId) =>
  apiRequest(`/subjects/${subjectId}/enrollments/${portalId}`, { method: 'DELETE' });

// --- DOCUMENTS ---
export const fetchDocuments = (offeringId) => apiRequest(`/offerings/${offeringId}/documents`);
export const uploadDocument = (offeringId, formData) =>
  apiRequest(`/offerings/${offeringId}/documents`, { method: 'POST', body: formData });
export const deleteDocument = (offeringId, docId) =>
  apiRequest(`/offerings/${offeringId}/documents/${docId}`, { method: 'DELETE' });
export const getDocumentDownloadUrl = (docId) => apiRequest(`/documents/${docId}/download`);

// --- ANNOUNCEMENTS ---
export const fetchAnnouncements = (offeringId) => apiRequest(`/offerings/${offeringId}/announcements`);
export const createAnnouncement = (offeringId, body) =>
  apiRequest(`/offerings/${offeringId}/announcements`, { method: 'POST', body: JSON.stringify(body) });
export const updateAnnouncement = (offeringId, annId, body) =>
  apiRequest(`/offerings/${offeringId}/announcements/${annId}`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteAnnouncement = (offeringId, annId) =>
  apiRequest(`/offerings/${offeringId}/announcements/${annId}`, { method: 'DELETE' });

// --- ASSIGNMENTS ---
export const fetchAssignments = (offeringId) => apiRequest(`/offerings/${offeringId}/assignments`);
export const fetchAssignment = (id) => apiRequest(`/assignments/${id}`);
export const createAssignment = (offeringId, body) =>
  apiRequest(`/offerings/${offeringId}/assignments`, { method: 'POST', body: JSON.stringify(body) });
export const updateAssignment = (id, body) =>
  apiRequest(`/assignments/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const submitAssignment = (id, body) =>
  apiRequest(`/assignments/${id}/submit`, { method: 'POST', body: JSON.stringify(body) });
export const submitAssignmentFile = (id, formData) =>
  apiRequest(`/assignments/${id}/submit-file`, { method: 'POST', body: formData });
export const uploadAssignmentAttachment = (id, formData) =>
  apiRequest(`/assignments/${id}/attachment`, { method: 'POST', body: formData });
export const fetchSubmissions = (assignmentId) => apiRequest(`/assignments/${assignmentId}/submissions`);
export const gradeSubmission = (submissionId, body) =>
  apiRequest(`/submissions/${submissionId}/grade`, { method: 'PUT', body: JSON.stringify(body) });

// --- TESTS ---
export const fetchTests = (offeringId) => apiRequest(`/offerings/${offeringId}/tests`);
export const createTest = (offeringId, body) =>
  apiRequest(`/offerings/${offeringId}/tests`, { method: 'POST', body: JSON.stringify(body) });
export const updateTest = (id, body) =>
  apiRequest(`/tests/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const fetchTestQuestions = (testId) => apiRequest(`/tests/${testId}/questions`);
export const addTestQuestion = (testId, body) =>
  apiRequest(`/tests/${testId}/questions`, { method: 'POST', body: JSON.stringify(body) });
export const updateQuestion = (questionId, body) =>
  apiRequest(`/questions/${questionId}`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteQuestion = (questionId) =>
  apiRequest(`/questions/${questionId}`, { method: 'DELETE' });
export const submitTest = (testId, answers) =>
  apiRequest(`/tests/${testId}/submit`, { method: 'POST', body: JSON.stringify({ answers }) });
export const fetchTestSubmissions = (testId) => apiRequest(`/tests/${testId}/submissions`);
export const gradeTestAnswer = (answerId, body) =>
  apiRequest(`/test-answers/${answerId}/grade`, { method: 'PUT', body: JSON.stringify(body) });
export const releaseTestResults = (testId, released = true) =>
  apiRequest(`/tests/${testId}/release-results`, { method: 'PUT', body: JSON.stringify({ released }) });

// --- RESULTS ---
export const fetchSubjectResults = (offeringId) => apiRequest(`/offerings/${offeringId}/results`);

// --- PORTAL USERS ---
export const fetchPortalUsers = (role) => apiRequest(`/portal-users${role ? `?role=${role}` : ''}`);
export const createPortalUser = (body) => apiRequest('/portal-users', { method: 'POST', body: JSON.stringify(body) });
export const updatePortalUser = (portalId, body) => apiRequest(`/portal-users/${portalId}`, { method: 'PUT', body: JSON.stringify(body) });
export const deletePortalUser = (portalId) => apiRequest(`/portal-users/${portalId}`, { method: 'DELETE' });

// --- DEPARTMENTS ---
export const fetchDepartments = () => apiRequest('/departments');
export const fetchDepartment = (id) => apiRequest(`/departments/${id}`);
export const createDepartment = (body) => apiRequest('/departments', { method: 'POST', body: JSON.stringify(body) });
export const updateDepartment = (id, body) => apiRequest(`/departments/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteDepartment = (id) => apiRequest(`/departments/${id}`, { method: 'DELETE' });

// --- SECTIONS ---
export const fetchSections = (deptId) => apiRequest(`/departments/${deptId}/sections`);
export const fetchSection = (id) => apiRequest(`/sections/${id}`);
export const createSection = (deptId, body) => apiRequest(`/departments/${deptId}/sections`, { method: 'POST', body: JSON.stringify(body) });
export const updateSection = (id, body) => apiRequest(`/sections/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteSection = (id) => apiRequest(`/sections/${id}`, { method: 'DELETE' });
export const fetchSectionStudents = (id) => apiRequest(`/sections/${id}/students`);
export const fetchMyAdvisedSections = () => apiRequest('/sections/my/advised');
// --- OFFERINGS ---
export const fetchOfferings = () => apiRequest('/offerings');
export const fetchOffering = (id) => apiRequest(`/offerings/${id}`);
export const fetchSectionOfferings = (sectionId) => apiRequest(`/offerings/section/${sectionId}`);
export const createOffering = (body) => apiRequest('/offerings', { method: 'POST', body: JSON.stringify(body) });
export const updateOffering = (id, body) => apiRequest(`/offerings/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const reassignTeacher = (id, new_teacher_portal_id) =>
  apiRequest(`/offerings/${id}/reassign-teacher`, { method: 'PUT', body: JSON.stringify({ new_teacher_portal_id }) });
export const deleteOffering = (id) => apiRequest(`/offerings/${id}`, { method: 'DELETE' });

// --- TIMETABLE ---
export const fetchMyTimetable = () => apiRequest('/timetable/my');
export const fetchSectionTimetable = (sectionId) => apiRequest(`/timetable/section/${sectionId}`);
export const fetchDepartmentTimetable = (deptId) => apiRequest(`/timetable/department/${deptId}`);
export const checkCanEditTimetable = (sectionId) => apiRequest(`/timetable/can-edit/${sectionId}`);
export const createTimetableEntry = (body) => apiRequest('/timetable', { method: 'POST', body: JSON.stringify(body) });
export const updateTimetableEntry = (id, body) => apiRequest(`/timetable/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteTimetableEntry = (id) => apiRequest(`/timetable/${id}`, { method: 'DELETE' });

// --- ATTENDANCE ---
export const recordAttendance = (body) => apiRequest('/attendance/record', { method: 'POST', body: JSON.stringify(body) });
export const fetchOfferingAttendance = (offeringId, date) => apiRequest(`/attendance/offering/${offeringId}${date ? `?date=${date}` : ''}`);
export const fetchMyAttendance = () => apiRequest('/attendance/my');
export const fetchSectionAttendanceSummary = (sectionId) => apiRequest(`/attendance/section/${sectionId}/summary`);
export const fetchDepartmentAttendanceSummary = (deptId) => apiRequest(`/attendance/department/${deptId}/summary`);

// --- NOTIFICATIONS ---
export const fetchMyNotifications = () => apiRequest('/notifications/my');
export const fetchUnreadNotificationCount = () => apiRequest('/notifications/unread-count');
export const markNotificationRead = (id) => apiRequest(`/notifications/${id}/read`, { method: 'PATCH' });
export const markAllNotificationsRead = () => apiRequest('/notifications/read-all', { method: 'PATCH' });

// --- ANNOUNCEMENTS ---
export const fetchMyAnnouncements = () => apiRequest('/announcements/my');
export const createScopedAnnouncement = (body) => apiRequest('/announcements', { method: 'POST', body: JSON.stringify(body) });
export const updateScopedAnnouncement = (id, body) => apiRequest(`/announcements/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteScopedAnnouncement = (id) => apiRequest(`/announcements/${id}`, { method: 'DELETE' });

// --- AI ---
export const checkAiHealth = () => apiRequest('/ai/health');
export const sendAssistantChat = (body) => apiRequest('/ai/assistant', { method: 'POST', body: JSON.stringify(body) });
export const sendTutorChat = (body) => apiRequest('/ai/tutor', { method: 'POST', body: JSON.stringify(body) });
export const indexDocumentForAi = (docId) => apiRequest(`/ai/index-document/${docId}`, { method: 'POST' });
export const getDocIndexStatus = (docId) => apiRequest(`/ai/index-status/${docId}`);
