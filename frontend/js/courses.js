/**
 * Phazon Academic Courses & Curriculum Module
 */

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('pz-courses-grid');
  const searchInput = document.getElementById('pz-course-search');
  const filterPills = document.querySelectorAll('.pz-dept-filter');

  let allCourses = [];
  let selectedDept = 'all';

  async function loadCourses() {
    if (!container) return;

    try {
      const res = await PzAPI.getCourses();
      if (res && res.data && res.data.length > 0) {
        allCourses = res.data;
      }
    } catch (_) {}

    if (!allCourses || allCourses.length === 0) {
      allCourses = [
        {
          id: 'ad-3301',
          code: 'AD3301',
          title: 'Data Structures & Algorithmic Analysis',
          department: { name: 'Artificial Intelligence & Data Science', code: 'AIDS' },
          credits: 4,
          description: 'Fundamental data structures including linked lists, trees, graphs, hashing, sorting algorithms, and asymptotic complexity analysis.',
          instructor: 'Dr. Ramesh Kumar'
        },
        {
          id: 'ad-3302',
          code: 'AD3302',
          title: 'Database Management Systems & SQL',
          department: { name: 'Artificial Intelligence & Data Science', code: 'AIDS' },
          credits: 4,
          description: 'Relational database architecture, ER modeling, SQL query optimization, normalization forms, transaction processing, and indexing.',
          instructor: 'Dr. Priya Mehta'
        },
        {
          id: 'cs-3401',
          code: 'CS3401',
          title: 'Object-Oriented Programming in Java',
          department: { name: 'Computer Science & Engineering', code: 'CSE' },
          credits: 3,
          description: 'Classes, inheritance, polymorphism, interface abstraction, exception handling, and concurrent multithreading patterns.',
          instructor: 'Prof. Suresh V'
        },
        {
          id: 'ec-3201',
          code: 'EC3201',
          title: 'Digital Signal Processing & Microcontrollers',
          department: { name: 'Electronics & Communication', code: 'ECE' },
          credits: 3,
          description: 'Discrete Fourier transforms, IIR/FIR filter design, microcontroller peripherals, and real-time signal processing applications.',
          instructor: 'Dr. Anita Roy'
        },
        {
          id: 'ai-3501',
          code: 'AI3501',
          title: 'Artificial Intelligence & Machine Learning',
          department: { name: 'Artificial Intelligence & Data Science', code: 'AIDS' },
          credits: 4,
          description: 'Supervised and unsupervised learning, regression, classification trees, neural networks, and model evaluation metrics.',
          instructor: 'Dr. Ramesh Kumar'
        },
        {
          id: 'cs-3502',
          code: 'CS3502',
          title: 'Computer Networks & Internet Protocols',
          department: { name: 'Computer Science & Engineering', code: 'CSE' },
          credits: 3,
          description: 'OSI 7-layer model, TCP/IP protocol stack, routing algorithms, socket programming, and network security protocols.',
          instructor: 'Prof. Suresh V'
        }
      ];
    }

    renderFilteredCourses();
  }

  function renderFilteredCourses() {
    if (!container) return;

    const query = (searchInput?.value || '').toLowerCase().trim();

    const filtered = allCourses.filter(c => {
      const titleMatch = (c.title || c.name || '').toLowerCase().includes(query);
      const codeMatch = (c.code || '').toLowerCase().includes(query);
      const deptMatch = (c.department?.name || '').toLowerCase().includes(query);

      const matchesSearch = titleMatch || codeMatch || deptMatch;

      if (selectedDept === 'all') return matchesSearch;
      return matchesSearch && (c.department?.code === selectedDept || c.department?.name?.toLowerCase().includes(selectedDept.toLowerCase()));
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-12 text-center bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 space-y-3">
          <span class="material-symbols-outlined text-4xl text-on-surface-variant">search_off</span>
          <h3 class="font-bold text-lg text-primary">No Matching Courses Found</h3>
          <p class="text-xs text-on-surface-variant max-w-sm mx-auto">Try adjusting your search query or department filter to explore available curriculum modules.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(c => `
      <div class="bg-surface-container-lowest border border-outline-variant/70 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover-card transition-all space-y-4">
        <div class="space-y-3">
          <div class="flex justify-between items-center">
            <span class="px-3 py-1 bg-secondary/10 text-secondary font-bold text-xs rounded-full border border-secondary/20">${c.code || 'COURSE'}</span>
            <span class="text-xs font-semibold text-on-surface-variant flex items-center gap-1">
              <span class="material-symbols-outlined text-[15px] text-amber-600">stars</span>
              ${c.credits || 3} Credits
            </span>
          </div>

          <h3 class="font-bold text-primary text-lg leading-snug">${c.title || c.name}</h3>
          
          <p class="text-xs text-on-surface-variant leading-relaxed line-clamp-3">${c.description || 'Comprehensive academic course module covering core theoretical and practical competencies.'}</p>
        </div>

        <div class="pt-4 border-t border-outline-variant/60 flex items-center justify-between gap-3">
          <div class="flex items-center gap-2 min-w-0">
            <div class="w-7 h-7 rounded-full bg-secondary/10 text-secondary font-bold text-xs flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined text-[14px]">person</span>
            </div>
            <div class="min-w-0">
              <p class="text-[11px] font-semibold text-primary truncate">${c.instructor || 'Faculty Lead'}</p>
              <p class="text-[10px] text-on-surface-variant truncate">${c.department?.code || c.department?.name || 'Academic Dept'}</p>
            </div>
          </div>

          <a href="course-detail.html?courseId=${c.id}" class="bg-primary text-white text-xs font-semibold py-2 px-3.5 rounded-xl hover:bg-on-surface-variant transition-all flex items-center gap-1 flex-shrink-0">
            <span>Syllabus</span>
            <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
          </a>
        </div>
      </div>
    `).join('');
  }

  // Filter Listeners
  searchInput?.addEventListener('input', renderFilteredCourses);

  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => {
        p.classList.remove('bg-secondary', 'text-white');
        p.classList.add('bg-surface-container-low', 'text-on-surface-variant');
      });
      pill.classList.remove('bg-surface-container-low', 'text-on-surface-variant');
      pill.classList.add('bg-secondary', 'text-white');
      selectedDept = pill.dataset.dept || 'all';
      renderFilteredCourses();
    });
  });

  loadCourses();
});
