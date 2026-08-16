/**
 * Phazon Academic Courses Module
 */

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('pz-courses-grid');

  async function renderAcademicCourses() {
    if (!container) return;

    let courses = [];
    try {
      const res = await PzAPI.getCourses();
      if (res && res.data && res.data.length > 0) {
        courses = res.data;
      }
    } catch (_) {}

    if (courses.length === 0) {
      courses = window.PzAcademicCourses || [
        {
          id: 'ds-101',
          code: 'CS-301',
          name: 'Data Structures & Algorithms',
          department: { name: 'AI & Data Science' },
          credits: 4,
          description: 'Arrays, linked lists, trees, graphs, and algorithmic complexity.',
        },
        {
          id: 'db-201',
          code: 'CS-302',
          name: 'Database Management Systems',
          department: { name: 'AI & Data Science' },
          credits: 4,
          description: 'Relational model, SQL querying, normalization, and indexing.',
        },
      ];
    }

    container.innerHTML = courses.map(c => `
      <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-sm flex flex-col justify-between">
        <div>
          <div class="flex justify-between items-center mb-2">
            <span class="px-2.5 py-1 bg-secondary/10 text-secondary font-bold text-xs rounded-full">${c.code || 'COURSE'}</span>
            <span class="text-xs font-semibold text-on-surface-variant">${c.credits || 3} Credits</span>
          </div>
          <h3 class="font-bold text-primary text-lg mb-2">${c.name || c.title}</h3>
          <p class="text-xs text-on-surface-variant mb-4 leading-relaxed">${c.description || 'Academic course module.'}</p>
        </div>
        <div class="pt-md border-t border-outline-variant/60 flex items-center justify-between">
          <span class="text-xs font-medium text-on-surface-variant">${c.department?.name || 'Department'}</span>
          <button class="bg-primary text-white text-xs font-bold py-1.5 px-3 rounded-lg hover:opacity-90 transition-opacity">Enrolled</button>
        </div>
      </div>
    `).join('');
  }

  renderAcademicCourses();
});
