/**
 * Phazon Course Detail Module — Step 13 + Step 20 + Step 20.1
 * Drives the course-detail.html lesson reading experience.
 *
 * URL params:
 *   ?course=html-fundamentals        — required
 *   &lesson=html-m1-l1               — optional (defaults to next incomplete)
 *
 * Supports two lesson modes:
 *   1. Plain text  (lesson.structured !== true) — original behaviour
 *   2. Structured  (lesson.structured === true)  — explanation + example +
 *                                                  practice questions + mini task
 *
 * Mini tasks with starterCode mount the PzCodeEditor (code-editor.js).
 *
 * Depends on: state.js, data.js, ui.js, courses.js (PzCourseActions), code-editor.js
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (window.PzAuth) {
    const user = await PzAuth.requireAuth();
    if (!user) return;
  }

  // ══════════════════════════════════════════════════════════════════
  // 1. PARSE URL PARAMS
  // ══════════════════════════════════════════════════════════════════

  const params   = new URLSearchParams(window.location.search);
  const courseId = params.get('course');
  let   lessonId = params.get('lesson');

  // ── Elements ──────────────────────────────────────────────────────
  const loadingEl       = document.getElementById('pz-lesson-loading');
  const viewEl          = document.getElementById('pz-lesson-view');
  const errorEl         = document.getElementById('pz-lesson-error');
  const completeScreen  = document.getElementById('pz-course-complete');

  function showState(state) {
    [loadingEl, viewEl, errorEl, completeScreen].forEach(el => {
      if (el) el.classList.add('hidden');
    });
    if (state === 'loading'  && loadingEl)     { loadingEl.classList.remove('hidden'); }
    if (state === 'view'     && viewEl)        { viewEl.classList.remove('hidden'); viewEl.classList.add('flex'); }
    if (state === 'error'    && errorEl)       { errorEl.classList.remove('hidden'); errorEl.classList.add('flex'); }
    if (state === 'complete' && completeScreen){ completeScreen.classList.remove('hidden'); completeScreen.classList.add('flex'); }
  }

  // ══════════════════════════════════════════════════════════════════
  // 2. RESOLVE COURSE + LESSON
  // ══════════════════════════════════════════════════════════════════

  const course = courseId ? PzCourses.find(c => c.id === courseId) : null;

  if (!course) {
    showState('error');
    return;
  }

  // Build flat lesson list from all modules
  const allLessons = [];
  course.modules.forEach(mod => {
    mod.lessons.forEach(lesson => {
      allLessons.push({ lesson, mod });
    });
  });

  // First, try to load backend progress and seed localStorage (async, pre-render)
  if (window.PzAPI) {
    try {
      const serverProgress = await PzAPI.getProgress(courseId);
      if (serverProgress && serverProgress.length > 0) {
        const row = serverProgress[0];
        const serverCompleted = Array.isArray(row.completed_modules) ? row.completed_modules : [];
        // Merge server progress into localStorage (server is source of truth)
        const localProgress = PzState.getCourseProgress();
        const localCompleted = localProgress[courseId]?.completedLessons || [];
        const merged = [...new Set([...serverCompleted, ...localCompleted])];
        if (!localProgress[courseId]) localProgress[courseId] = { completedLessons: [] };
        localProgress[courseId].completedLessons = merged;
        PzState.setCourseProgress(localProgress);
      }
    } catch (_) {} // silently ignore if backend down
  }

  // Default lesson: URL param → first incomplete → first lesson
  if (!lessonId) {
    const progress         = PzState.getCourseProgress();
    const completedLessons = progress[courseId]?.completedLessons || [];
    const nextIncomplete   = allLessons.find(({ lesson }) => !completedLessons.includes(lesson.id));
    lessonId = nextIncomplete?.lesson?.id || allLessons[0]?.lesson?.id;
  }

  let currentLessonIdx = allLessons.findIndex(({ lesson }) => lesson.id === lessonId);
  if (currentLessonIdx < 0) currentLessonIdx = 0;

  // ══════════════════════════════════════════════════════════════════
  // 3. POPULATE PAGE CHROME
  // ══════════════════════════════════════════════════════════════════

  document.title = `${course.title} — Phazon`;

  const topbarCourse = document.getElementById('pz-topbar-course');
  if (topbarCourse) topbarCourse.textContent = course.title;

  const sidebarTitle = document.getElementById('pz-sidebar-course-title');
  if (sidebarTitle) sidebarTitle.textContent = course.title;

  // ══════════════════════════════════════════════════════════════════
  // 4. STRUCTURED LESSON RENDERER
  // ══════════════════════════════════════════════════════════════════

  /**
   * Escapes HTML special characters so code examples render as text.
   */
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Formats explanation text:
   *   • backtick spans → <code>
   *   • **bold** → <strong>
   *   • bullet lines (•) → list items
   *   • double-newlines → paragraph breaks
   */
  function formatExplanation(text) {
    // Escape HTML first (explanations may contain tag-like text)
    let t = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Apply markdown-like formatting
    t = t
      .replace(/`([^`]+)`/g, '<code class="pz-inline-code">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Split on double newline into blocks
    const blocks = t.split(/\n\n+/);
    return blocks.map(block => {
      const lines = block.split('\n');
      // Detect bullet block (lines starting with •)
      const bulletLines = lines.filter(l => l.trim().startsWith('•'));
      if (bulletLines.length > 0 && bulletLines.length === lines.filter(l => l.trim()).length) {
        const items = lines
          .filter(l => l.trim().startsWith('•'))
          .map(l => `<li>${l.replace(/^•\s*/, '').trim()}</li>`)
          .join('');
        return `<ul class="pz-explanation-list">${items}</ul>`;
      }
      // Numbered list (lines starting with 1. 2. 3.)
      if (lines.every(l => !l.trim() || /^\d+\./.test(l.trim()))) {
        const items = lines
          .filter(l => l.trim())
          .map(l => `<li>${l.replace(/^\d+\.\s*/, '').trim()}</li>`)
          .join('');
        return `<ol class="pz-explanation-list pz-ol">${items}</ol>`;
      }
      return `<p>${block.trim()}</p>`;
    }).join('');
  }

  /**
   * Build the full HTML for a structured lesson.
   * Tracking objects returned so the caller can wire up interactivity.
   */
  function buildStructuredHTML(lesson) {
    const { explanation, example, exampleCaption, questions, miniTask } = lesson;

    // ── Section 1: Explanation ──────────────────────────────────────
    const explanationHTML = `
      <div class="pz-explanation-block">
        <div class="pz-section-label">
          <span class="material-symbols-outlined">menu_book</span>
          Explanation
        </div>
        <div class="pz-explanation-body">
          ${formatExplanation(explanation || '')}
        </div>
      </div>`;

    // ── Section 2: Code Example ─────────────────────────────────────
    const exampleHTML = `
      <div class="pz-example-block">
        <div class="pz-example-header">
          <div class="pz-section-label pz-section-label--light">
            <span class="material-symbols-outlined">code</span>
            Code Example
          </div>
          <button class="pz-copy-btn" onclick="pzCopyCode(this)" title="Copy code">
            <span class="material-symbols-outlined">content_copy</span>
            <span class="pz-copy-label">Copy</span>
          </button>
        </div>
        <pre class="pz-code-pre"><code class="pz-code-block">${escHtml(example || '')}</code></pre>
        ${exampleCaption ? `<p class="pz-example-caption">${escHtml(exampleCaption)}</p>` : ''}
      </div>`;

    // ── Section 3: Practice Questions ──────────────────────────────
    const questionsHTML = `
      <div class="pz-questions-block">
        <div class="pz-section-label">
          <span class="material-symbols-outlined">quiz</span>
          Practice Questions
        </div>
        <p class="pz-questions-intro">Test your understanding. Choose the best answer for each question.</p>
        <div class="pz-questions-list" id="pz-questions-list">
          ${(questions || []).map((q, qi) => `
            <div class="pz-question-card" id="pz-q-${qi}" data-qi="${qi}" data-answered="false">
              <p class="pz-question-text"><span class="pz-q-num">${qi + 1}.</span> ${escHtml(q.q)}</p>
              <div class="pz-choices">
                ${q.choices.map((choice, ci) => `
                  <button class="pz-choice-btn"
                          data-qi="${qi}" data-ci="${ci}"
                          onclick="pzHandleChoice(this, ${qi}, ${ci})"
                          id="pz-choice-${qi}-${ci}">
                    <span class="pz-choice-letter">${String.fromCharCode(65 + ci)}</span>
                    <span class="pz-choice-text">${escHtml(choice)}</span>
                  </button>`).join('')}
              </div>
              <div class="pz-feedback hidden" id="pz-feedback-${qi}"></div>
            </div>`).join('')}
        </div>
      </div>`;

    // ── Section 4: Mini Task ────────────────────────────────────────
    let taskHTML = '';
    if (miniTask) {
      if (miniTask.starterCode) {
        // Code-editor mode: render a mount-point div; PzCodeEditor fills it after innerHTML is set
        taskHTML = `
      <div class="pz-mini-task pz-mini-task--editor" id="pz-mini-task">
        <div class="pz-section-label">
          <span class="material-symbols-outlined">code_blocks</span>
          Mini Task — Code Editor
        </div>
        <div id="pz-ce-mount"></div>
      </div>`;
      } else {
        // Plain mark-done mode (tasks without starterCode)
        taskHTML = `
      <div class="pz-mini-task" id="pz-mini-task">
        <div class="pz-section-label">
          <span class="material-symbols-outlined">assignment</span>
          Mini Task
        </div>
        <h3 class="pz-task-title">${escHtml(miniTask.title)}</h3>
        <div class="pz-task-instructions">${formatExplanation(miniTask.instructions || '')}</div>
        ${miniTask.tip ? `
          <div class="pz-task-tip">
            <span class="material-symbols-outlined">lightbulb</span>
            <span><strong>Tip:</strong> ${escHtml(miniTask.tip)}</span>
          </div>` : ''}
        <div class="pz-task-footer" id="pz-task-footer">
          <button class="pz-task-mark-btn" id="pz-task-mark-btn" onclick="pzMarkTaskDone()">
            <span class="material-symbols-outlined" id="pz-task-check-icon">check_circle</span>
            Mark Task as Done
          </button>
          <span class="pz-task-done-label hidden" id="pz-task-done-label">
            <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1">check_circle</span>
            Task marked as done!
          </span>
        </div>
      </div>`;
      }
    }

    return { explanationHTML, exampleHTML, questionsHTML, taskHTML };
  }

  // ── Copy button handler ────────────────────────────────────────────
  window.pzCopyCode = function(btn) {
    const pre = btn.closest('.pz-example-block').querySelector('code');
    if (!pre) return;
    navigator.clipboard.writeText(pre.textContent).then(() => {
      const label = btn.querySelector('.pz-copy-label');
      if (label) { label.textContent = 'Copied!'; setTimeout(() => label.textContent = 'Copy', 2000); }
    }).catch(() => {});
  };

  // ── Question answer tracking ───────────────────────────────────────
  // answeredMap: { lessonId: { qi: bool (correct) } }
  let _answeredMap = {};
  let _taskDone    = false;

  window.pzHandleChoice = function(btn, qi, ci) {
    const lessonKey   = allLessons[currentLessonIdx]?.lesson?.id;
    if (!_answeredMap[lessonKey]) _answeredMap[lessonKey] = {};

    // Only allow one answer per question
    const card = document.getElementById(`pz-q-${qi}`);
    if (card?.dataset.answered === 'true') return;

    const lesson = allLessons[currentLessonIdx]?.lesson;
    if (!lesson?.questions) return;

    const q         = lesson.questions[qi];
    const isCorrect = ci === q.correct;

    // Mark all choice buttons in this question
    card.querySelectorAll('.pz-choice-btn').forEach((b, idx) => {
      b.disabled = true;
      if (idx === q.correct) b.classList.add('pz-choice--correct');
      else if (idx === ci && !isCorrect) b.classList.add('pz-choice--wrong');
      else b.classList.add('pz-choice--neutral');
    });

    // Show feedback
    const feedbackEl = document.getElementById(`pz-feedback-${qi}`);
    if (feedbackEl) {
      feedbackEl.classList.remove('hidden');
      if (isCorrect) {
        feedbackEl.className = 'pz-feedback pz-feedback--correct';
        feedbackEl.innerHTML = `<span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1">check_circle</span> Correct! ✓ ${escHtml(q.explanation || '')}`;
      } else {
        feedbackEl.className = 'pz-feedback pz-feedback--wrong';
        feedbackEl.innerHTML = `<span class="material-symbols-outlined">cancel</span> Not quite. ${escHtml(q.explanation || 'Review the explanation and try again.')}`;
      }
    }

    card.dataset.answered = 'true';
    _answeredMap[lessonKey][qi] = isCorrect;

    // Check if all questions answered → unlock Complete button
    const total    = lesson.questions.length;
    const answered = Object.keys(_answeredMap[lessonKey]).length;
    if (answered >= total) _refreshCompleteBtn(false);
  };

  window.pzMarkTaskDone = function() {
    _taskDone = true;
    // UI update
    const btn       = document.getElementById('pz-task-mark-btn');
    const doneLabel = document.getElementById('pz-task-done-label');
    if (btn)       { btn.classList.add('hidden'); }
    if (doneLabel) { doneLabel.classList.remove('hidden'); }
    _refreshCompleteBtn(false);
  };

  // Called by PzCodeEditor's Mark Complete button
  function _onEditorComplete() {
    _taskDone = true;
    _refreshCompleteBtn(false);
  }

  function _refreshCompleteBtn(isLessonDone) {
    const completeBtn = document.getElementById('pz-complete-btn');
    if (!completeBtn) return;

    const lesson = allLessons[currentLessonIdx]?.lesson;
    const isStructured = lesson?.structured === true;

    if (isLessonDone) {
      completeBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">check_circle</span> Module Complete';
      completeBtn.className = 'bg-secondary-fixed text-on-secondary-fixed font-label-md text-label-md py-sm px-lg rounded-lg flex items-center gap-2 cursor-default';
      completeBtn.disabled = true;
      return;
    }

    if (!isStructured) {
      completeBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">check_circle</span> Complete Lesson';
      completeBtn.className = 'bg-secondary text-on-secondary font-label-md text-label-md py-sm px-lg rounded-lg hover:opacity-90 transition-opacity shadow-sm flex items-center gap-2';
      completeBtn.disabled = false;
      completeBtn.onclick = () => handleCompleteLesson(currentLessonIdx);
      return;
    }

    // Structured: check if all questions have been attempted
    const lessonKey = lesson.id;
    const attempted  = Object.keys(_answeredMap[lessonKey] || {}).length;
    const total      = (lesson.questions || []).length;
    const allAnswered = attempted >= total;
    const taskDone    = _taskDone;

    if (allAnswered && taskDone) {
      completeBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">check_circle</span> Complete Module';
      completeBtn.className = 'bg-secondary text-on-secondary font-label-md text-label-md py-sm px-lg rounded-lg hover:opacity-90 transition-opacity shadow-sm flex items-center gap-2';
      completeBtn.disabled = false;
      completeBtn.onclick = () => handleCompleteLesson(currentLessonIdx);
    } else {
      let label = !allAnswered ? `Answer questions first (${attempted}/${total})` : 'Complete task first';
      completeBtn.innerHTML = `<span class="material-symbols-outlined text-[18px]">lock</span> ${label}`;
      completeBtn.className = 'bg-surface-container text-on-surface-variant font-label-md text-label-md py-sm px-lg rounded-lg cursor-not-allowed flex items-center gap-2';
      completeBtn.disabled = true;
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // 5. RENDER LESSON
  // ══════════════════════════════════════════════════════════════════

  function renderLesson(idx) {
    if (idx < 0 || idx >= allLessons.length) { showState('error'); return; }

    const { lesson, mod } = allLessons[idx];

    const progress         = PzState.getCourseProgress();
    const completedLessons = progress[courseId]?.completedLessons || [];
    const totalLessons     = allLessons.length;
    const completedCount   = completedLessons.length;
    const pct              = Math.round((completedCount / totalLessons) * 100);
    const isLessonDone     = completedLessons.includes(lesson.id);

    // Reset per-lesson state
    _taskDone = isLessonDone;

    // ── Topbar ────────────────────────────────────────────────────
    const topbarLesson = document.getElementById('pz-topbar-lesson');
    if (topbarLesson) topbarLesson.textContent = lesson.title;
    const topbarBar = document.getElementById('pz-topbar-progress-bar');
    if (topbarBar) topbarBar.style.width = `${pct}%`;
    const topbarPct = document.getElementById('pz-topbar-pct');
    if (topbarPct) topbarPct.textContent = `${pct}%`;

    // ── Sidebar ───────────────────────────────────────────────────
    const sidebarDone = document.getElementById('pz-sidebar-lessons-done');
    if (sidebarDone) sidebarDone.textContent = `${completedCount} / ${totalLessons} modules`;
    const sidebarPct = document.getElementById('pz-sidebar-pct');
    if (sidebarPct) sidebarPct.textContent = `${pct}%`;
    const sidebarBar = document.getElementById('pz-sidebar-bar');
    if (sidebarBar) sidebarBar.style.width = `${pct}%`;

    // Module list in sidebar
    const moduleListEl = document.getElementById('pz-module-list');
    if (moduleListEl) {
      moduleListEl.innerHTML = course.modules.map((m) => {
        const modLessons = m.lessons;
        const modDone    = modLessons.every(l => completedLessons.includes(l.id));
        const modActive  = m.id === mod.id;
        return `
          <div class="mb-xs">
            <div class="px-sm py-2 flex items-center gap-2 ${modActive ? 'text-primary font-semibold' : 'text-on-surface-variant'}">
              <span class="material-symbols-outlined text-[16px] flex-shrink-0 ${modDone ? 'text-secondary' : ''}"
                    style="${modDone ? "font-variation-settings: 'FILL' 1" : ''}">
                ${modDone ? 'check_circle' : 'folder_open'}
              </span>
              <span class="font-label-sm text-[13px] leading-snug">${m.title}</span>
            </div>
            ${modLessons.map(l => {
              const lDone   = completedLessons.includes(l.id);
              const lActive = l.id === lesson.id;
              return `
                <a href="?course=${courseId}&lesson=${l.id}"
                   class="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-left w-full
                     ${lActive ? 'bg-primary-container text-on-primary-container' : 'hover:bg-surface-container text-on-surface-variant hover:text-on-surface'}">
                  <span class="material-symbols-outlined text-[14px] flex-shrink-0 ${lDone ? 'text-secondary' : ''}"
                        style="${lDone ? "font-variation-settings: 'FILL' 1" : ''}">
                    ${lDone ? 'check_circle' : lActive ? 'play_circle' : 'circle'}
                  </span>
                  <span class="font-label-sm text-[12px] leading-snug ${lDone ? 'line-through opacity-70' : ''}">${l.title}</span>
                </a>`;
            }).join('')}
          </div>`;
      }).join('');
    }

    // ── Lesson meta ───────────────────────────────────────────────
    const moduleLabel = document.getElementById('pz-lesson-module-label');
    if (moduleLabel) moduleLabel.textContent = mod.title;
    const titleEl = document.getElementById('pz-lesson-title');
    if (titleEl) titleEl.textContent = lesson.title;

    const doneBadge = document.getElementById('pz-lesson-status-badge');
    if (doneBadge) {
      if (isLessonDone) {
        doneBadge.classList.remove('hidden'); doneBadge.classList.add('flex');
      } else {
        doneBadge.classList.add('hidden'); doneBadge.classList.remove('flex');
      }
    }

    // ── Content body ──────────────────────────────────────────────
    const contentEl = document.getElementById('pz-lesson-content');
    if (contentEl) {
      if (lesson.structured === true) {
        // Rich structured mode
        const { explanationHTML, exampleHTML, questionsHTML, taskHTML } = buildStructuredHTML(lesson);
        contentEl.innerHTML = explanationHTML + exampleHTML + questionsHTML + taskHTML;

        // If already completed, disable all buttons
        if (isLessonDone) {
          contentEl.querySelectorAll('.pz-choice-btn').forEach(b => b.disabled = true);
          const taskBtn = document.getElementById('pz-task-mark-btn');
          if (taskBtn) taskBtn.disabled = true;
        }

        // Mount code editor if this lesson has a starterCode mini task
        // Must come AFTER innerHTML is set so pz-ce-mount exists in DOM
        const miniTask = lesson.miniTask;
        if (miniTask?.starterCode && typeof PzCodeEditor !== 'undefined') {
          const storageKey = PzCodeEditor.buildKey(courseId, lesson.id);
          PzCodeEditor.mount({
            containerId : 'pz-ce-mount',
            taskData    : miniTask,
            storageKey  : storageKey,
            onComplete  : _onEditorComplete,
            isLocked    : isLessonDone,
          });
        }
      } else {
        // Plain text mode — original behaviour
        const raw = lesson.content || `<em>Lesson content coming soon for "${lesson.title}".</em>`;
        const formatted = raw.replace(/`([^`]+)`/g, '<code>$1</code>');
        const paragraphs = formatted.split(/\n\n+/).map(p => `<p>${p.trim()}</p>`).join('');
        contentEl.innerHTML = paragraphs || `<p>${formatted}</p>`;
      }
    }

    // ── Complete button ────────────────────────────────────────────
    _refreshCompleteBtn(isLessonDone);

    // ── Prev / Next ────────────────────────────────────────────────
    const prevBtn = document.getElementById('pz-prev-btn');
    const nextBtn = document.getElementById('pz-next-btn');

    if (prevBtn) {
      prevBtn.disabled = idx === 0;
      prevBtn.onclick  = () => { if (idx > 0) navigateTo(idx - 1); };
    }
    if (nextBtn) {
      if (idx === allLessons.length - 1) {
        nextBtn.innerHTML = '<span>All Done</span><span class="material-symbols-outlined text-[18px]">emoji_events</span>';
        nextBtn.onclick = () => {
          if (!completedLessons.includes(lesson.id)) handleCompleteLesson(idx);
          else showCourseComplete();
        };
      } else {
        nextBtn.innerHTML = 'Next <span class="material-symbols-outlined text-[18px]">arrow_forward</span>';
        nextBtn.disabled  = false;
        nextBtn.onclick   = () => navigateTo(idx + 1);
      }
    }

    PzState.setCurrentCourse(courseId, lesson.id);
    showState('view');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ══════════════════════════════════════════════════════════════════
  // 6. NAVIGATION
  // ══════════════════════════════════════════════════════════════════

  function navigateTo(idx) {
    // Destroy any active editor before leaving
    if (typeof PzCodeEditor !== 'undefined') PzCodeEditor.destroy();
    currentLessonIdx = idx;
    const { lesson } = allLessons[idx];
    const url = new URL(window.location.href);
    url.searchParams.set('course', courseId);
    url.searchParams.set('lesson', lesson.id);
    window.history.pushState({}, '', url.toString());
    renderLesson(idx);
  }

  window.addEventListener('popstate', () => {
    const p   = new URLSearchParams(window.location.search);
    const lId = p.get('lesson');
    const idx = lId ? allLessons.findIndex(({ lesson }) => lesson.id === lId) : 0;
    if (idx >= 0) { currentLessonIdx = idx; renderLesson(idx); }
  });

  // ══════════════════════════════════════════════════════════════════
  // 7. COMPLETE LESSON ACTION
  // ══════════════════════════════════════════════════════════════════

  function handleCompleteLesson(idx) {
    const { lesson } = allLessons[idx];
    const result = PzCourseActions.completeLesson(courseId, lesson.id);

    if (result.newlyComplete) {
      setTimeout(() => showCourseComplete(), 600);
      return;
    }

    if (lesson.structured) {
      PzUI.showToast('Module completed! ✓', 'success', 2000);
    } else {
      PzUI.showToast('Lesson completed! ✓', 'success', 2000);
    }

    if (idx < allLessons.length - 1) {
      setTimeout(() => navigateTo(idx + 1), 800);
    } else {
      renderLesson(idx);
      setTimeout(() => showCourseComplete(), 1200);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // 8. COURSE COMPLETION SCREEN
  // ══════════════════════════════════════════════════════════════════

  function showCourseComplete() {
    const titleEl    = document.getElementById('pz-complete-title');
    const subtitleEl = document.getElementById('pz-complete-subtitle');
    const skillMeta  = PzSkills[course.skill] || { label: course.skill };

    if (titleEl)    titleEl.textContent = `${course.title} Complete! 🎉`;
    if (subtitleEl) subtitleEl.textContent =
      `You've mastered all ${allLessons.length} modules. ` +
      `Your ${skillMeta.label} skill has been boosted to ${course.skillGain || 70}%.`;

    showState('complete');
    PzUI.showToast(`🏆 Course complete: ${course.title}`, 'success', 5000);
  }

  // ══════════════════════════════════════════════════════════════════
  // 9. INITIAL RENDER
  // ══════════════════════════════════════════════════════════════════

  showState('loading');
  setTimeout(() => renderLesson(currentLessonIdx), 50);
});
