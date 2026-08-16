/**
 * Phazon Academic Foundation Data
 * Navigation configuration, role metadata, and public course catalog.
 */

// ═══════════════════════════════════════════════════════════════════
// ROLES METADATA
// ═══════════════════════════════════════════════════════════════════

const PzRoles = {
  ADMIN: {
    id: 'admin',
    name: 'Administrator',
    dashboard: '/pages/admin/dashboard.html',
    icon: 'admin_panel_settings',
  },
  HOD: {
    id: 'hod',
    name: 'Head of Department',
    dashboard: '/pages/hod/dashboard.html',
    icon: 'supervisor_account',
  },
  TEACHER: {
    id: 'teacher',
    name: 'Teacher / Instructor',
    dashboard: '/pages/teacher/dashboard.html',
    icon: 'co_present',
  },
  STUDENT: {
    id: 'student',
    name: 'Student',
    dashboard: '/pages/student/dashboard.html',
    icon: 'school',
  },
};

// ═══════════════════════════════════════════════════════════════════
// ROLE-BASED NAVIGATION MENUS
// ═══════════════════════════════════════════════════════════════════

const PzNav = {
  student: [
    { label: 'Dashboard', href: '/pages/student/dashboard.html', icon: 'dashboard' },
    { label: 'My Courses', href: '/pages/courses/courses.html', icon: 'school' },
    { label: 'Attendance', href: '/pages/attendance/attendance.html', icon: 'fact_check' },
    { label: 'Assignments', href: '/pages/assignments/assignments.html', icon: 'assignment' },
    { label: 'Exams', href: '/pages/exams/exams.html', icon: 'quiz' },
    { label: 'Grades', href: '/pages/grades/grades.html', icon: 'grade' },
    { label: 'My Progress', href: '/pages/progress/progress.html', icon: 'trending_up' },
    { label: 'Profile', href: '/pages/profile/profile.html', icon: 'person' },
  ],
  teacher: [
    { label: 'Dashboard', href: '/pages/teacher/dashboard.html', icon: 'dashboard' },
    { label: 'Assigned Classes', href: '/pages/teacher/classes.html', icon: 'class' },
    { label: 'Students', href: '/pages/teacher/students.html', icon: 'groups' },
    { label: 'Attendance', href: '/pages/attendance/attendance.html', icon: 'fact_check' },
    { label: 'Assignments', href: '/pages/assignments/assignments.html', icon: 'assignment' },
    { label: 'Exams', href: '/pages/exams/exams.html', icon: 'quiz' },
    { label: 'Grades', href: '/pages/grades/grades.html', icon: 'grade' },
    { label: 'Class Performance', href: '/pages/teacher/performance.html', icon: 'analytics' },
    { label: 'Profile', href: '/pages/profile/profile.html', icon: 'person' },
  ],
  hod: [
    { label: 'Dashboard', href: '/pages/hod/dashboard.html', icon: 'dashboard' },
    { label: 'Classes', href: '/pages/hod/classes.html', icon: 'class' },
    { label: 'Teachers', href: '/pages/hod/teachers.html', icon: 'badge' },
    { label: 'Students', href: '/pages/hod/students.html', icon: 'groups' },
    { label: 'Courses', href: '/pages/courses/courses.html', icon: 'school' },
    { label: 'Attendance', href: '/pages/attendance/attendance.html', icon: 'fact_check' },
    { label: 'Assignments', href: '/pages/assignments/assignments.html', icon: 'assignment' },
    { label: 'Exams', href: '/pages/exams/exams.html', icon: 'quiz' },
    { label: 'Grades', href: '/pages/grades/grades.html', icon: 'grade' },
    { label: 'Reports', href: '/pages/reports/reports.html', icon: 'assessment' },
    { label: 'Profile', href: '/pages/profile/profile.html', icon: 'person' },
  ],
  admin: [
    { label: 'Dashboard', href: '/pages/admin/dashboard.html', icon: 'dashboard' },
    { label: 'Students', href: '/pages/admin/students.html', icon: 'groups' },
    { label: 'Teachers', href: '/pages/admin/teachers.html', icon: 'badge' },
    { label: 'HODs', href: '/pages/admin/hods.html', icon: 'supervisor_account' },
    { label: 'Departments', href: '/pages/admin/departments.html', icon: 'domain' },
    { label: 'Classes', href: '/pages/admin/classes.html', icon: 'class' },
    { label: 'Courses', href: '/pages/courses/courses.html', icon: 'school' },
    { label: 'Assignments', href: '/pages/assignments/assignments.html', icon: 'assignment' },
    { label: 'Exams', href: '/pages/exams/exams.html', icon: 'quiz' },
    { label: 'Grades', href: '/pages/grades/grades.html', icon: 'grade' },
    { label: 'Reports', href: '/pages/reports/reports.html', icon: 'assessment' },
    { label: 'AI Monitoring', href: '/pages/admin/ai-monitoring.html', icon: 'psychology' },
    { label: 'Profile', href: '/pages/profile/profile.html', icon: 'person' },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// SAMPLE ACADEMIC COURSES
// ═══════════════════════════════════════════════════════════════════

const PzAcademicCourses = [
  {
    id: 'ds-101',
    code: 'CS-301',
    title: 'Data Structures & Algorithms',
    department: 'AI & Data Science',
    semester: 'Semester 3',
    credits: 4,
    instructor: 'Dr. Priya Mehta',
    description: 'Comprehensive study of arrays, linked lists, trees, graphs, and algorithmic complexity.',
    coverUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBXnzTjXxn7IL2NITbpT1DN4Cyr18vhjREAuwPVM-KZPoNLYfK0Olv8x4Q0iLkd4mm5UrCVYiOKsp7CVl8bBuP-CBPeLrhV6PNx8VCj9jGTtUXScphs6JnK9dNIM0_a7R4r62P-kclYvnjsf0eeCklX7v9wpNukvgeNYwRzoWY83lRLO5ZoB5o_y2kZyNXGp7NnlymTwoLyUJrVORjiHIzEWso7Aw1wKjJG7VsORWGDmw71vVPrG2qG',
  },
  {
    id: 'db-201',
    code: 'CS-302',
    title: 'Database Management Systems',
    department: 'AI & Data Science',
    semester: 'Semester 3',
    credits: 4,
    instructor: 'Prof. Arjun Sharma',
    description: 'Relational model, SQL querying, normalization, transaction management, and indexing.',
    coverUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAG43Fxb3GIEKjIrGsFaM5JDviAOntmcsVtOXtYcmJc8NWKsthLfaP5M-RhkjCmZe61Vo-l6L5dmciog3ssRVML6_ARx7pclzRwwnJbs_A6JBOxQXzXieZ9O0_pDdd9tqlKUkGjsh3jEDn1b0-P3CxMsNSz6NdT327QAJGbl_h9tuL1jlH3zqWcK7eWEcl1du4L9g74Ahuc2A4nYZs_sIGMmacCanahiywveixERJBH1ylqXZrnU-OH',
  },
  {
    id: 'ai-301',
    code: 'AD-401',
    title: 'Artificial Intelligence & Machine Learning',
    department: 'AI & Data Science',
    semester: 'Semester 4',
    credits: 4,
    instructor: 'Dr. Sneha Reddy',
    description: 'Supervised and unsupervised learning models, neural networks, and decision systems.',
    coverUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCSSxdqQLAnzmyP1O0CpDh0pk66h8LNOnOF-ozVidpiiMoZMQ2WaPA1kaikqsF2E3Pt0LKpvM0GzpPxmb6TD9bDfPiAHaKZnQpAasfL_5kDvm1MqAux_kk3sYHIk52SzEcqW8GrLv23Gm1_4fLzA32JAQb_JzmBQzvgIOIAGvpSE5D5YINEPWM0U5fZYwySr4v7g5iZbTxKX3LX0TMwSaffLp7yOSNkURT7REih67kt68JMxtisArZH',
  },
];

// Make available globally
window.PzRoles = PzRoles;
window.PzNav = PzNav;
window.PzAcademicCourses = PzAcademicCourses;
