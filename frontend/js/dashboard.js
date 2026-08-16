/**
 * Phazon Dashboard Module — Step 11
 * Fully personalized dashboard driven by assessment result data.
 *
 * Central function: getDashboardData()
 * All sections read from getDashboardData() — no duplicate calculations.
 *
 * Sections:
 *  1. Greeting (time-aware)
 *  2. Key Metric Cards (readiness, skill score, course progress, streak)
 *  3. Recommendation Card (top gap skill + why explanation + course CTA)
 *  4. Career Roadmap preview (dynamic phases from career data)
 *  5. Job Match Card (top ranked job)
 *  6. Skill Overview Table (all required career skills)
 *  7. Empty State (no assessment)
 *
 * Depends on: state.js, data.js, ui.js
 */

// ════════════════════════════════════════════════════════════════════
// CENTRALIZED DATA PREPARATION
// ════════════════════════════════════════════════════════════════════

/**
 * getDashboardData()
 * Single source of truth for all dashboard data.
 * Reads from PzState.getAssessmentResult() — never re-computes from scratch.
 *
 * @returns {Object} Dashboard data object ready for rendering
 */
function getDashboardData() {
  const careerId  = PzState.getCareer();
  const career    = careerId ? PzCareers[careerId] : null;
  const user      = PzState.getUser();
  const streak    = PzState.getStreak();
  const hasCareer = !!careerId && !!career;

  // ── Assessment result (primary source) ───────────────────────────
  let result = PzState.getAssessmentResult();
  let scores, overall, readiness, strongSkills, weakSkills,
      recommendedCourse, grade, topWeak, assessmentDone;

  assessmentDone = PzState.isAssessmentDone();

  if (result) {
    scores            = result.scores;
    overall           = result.overallScore;
    readiness         = result.careerReadiness;
    strongSkills      = result.strongSkills || [];
    weakSkills        = result.weakSkills || [];
    recommendedCourse = result.recommendedCourse;
    grade             = result.grade;
    topWeak           = result.topWeakSkill || weakSkills[0] || null;
  } else if (assessmentDone && Object.keys(PzState.getSkillScores()).length > 0) {
    // Fallback: recompute from raw scores (happens after state.js update)
    scores            = PzState.getSkillScores();
    overall           = PzScoring.computeOverallScore(scores, careerId);
    readiness         = PzScoring.computeCareerReadiness(scores, careerId);
    strongSkills      = PzRecommendations.getStrongSkills(scores, careerId);
    weakSkills        = PzRecommendations.getWeakSkillsDetailed(scores, careerId);
    recommendedCourse = PzRecommendations.getTopRecommendedCourse(scores, careerId);
    grade             = PzScoring.getSkillLevel(overall);
    topWeak           = weakSkills[0] || null;
  } else {
    // No assessment data
    scores            = {};
    overall           = 0;
    readiness         = 0;
    strongSkills      = [];
    weakSkills        = [];
    recommendedCourse = null;
    grade             = null;
    topWeak           = null;
  }

  // ── Course progress (aggregate across all courses) ─────────────
  let totalLessons = 0, completedLessons = 0;
  PzCourses.forEach(course => {
    const lessons = course.modules.reduce((t, m) => t + m.lessons.length, 0);
    totalLessons += lessons;
    completedLessons += Math.round((PzState.getCoursePercent(course.id, lessons) / 100) * lessons);
  });
  const courseProgress = totalLessons > 0
    ? Math.round((completedLessons / totalLessons) * 100)
    : 0;

  // ── Job matching ────────────────────────────────────────────────
  const rankedJobs = PzJobMatcher.getRankedJobs(scores);
  const topJob     = rankedJobs[0] || null;

  return {
    user, streak, careerId, career, hasCareer,
    scores, overall, readiness, grade,
    strongSkills, weakSkills, topWeak,
    recommendedCourse, assessmentDone,
    courseProgress, rankedJobs, topJob,
  };
}

// ════════════════════════════════════════════════════════════════════
// RENDER FUNCTIONS
// ════════════════════════════════════════════════════════════════════

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
function setStyle(id, prop, val) {
  const el = document.getElementById(id);
  if (el) el.style[prop] = val;
}
function setAttrEl(selector, attr, val) {
  document.querySelectorAll(`[${attr}]`).forEach(el => { el.textContent = val; });
}

/** Time-aware greeting */
function renderGreeting(user) {
  const hour = new Date().getHours();
  const greeting =
    hour >= 5  && hour < 12 ? 'Good morning' :
    hour >= 12 && hour < 17 ? 'Good afternoon' :
    hour >= 17 && hour < 21 ? 'Good evening' : 'Good night';

  setEl('pz-greeting', greeting);
  document.querySelectorAll('[data-pz-username]').forEach(el => {
    el.textContent = user?.name || 'there';
  });
}

/** Animate a bar width with a rAF delay */
function animateBar(id, pct, delay = 100) {
  setTimeout(() => {
    const el = document.getElementById(id);
    if (el) el.style.width = `${pct}%`;
  }, delay);
}

/** Render the 4 top metric cards */
function renderMetricCards(data) {
  const { overall, readiness, courseProgress, streak } = data;

  setEl('pz-stat-readiness', `${readiness}%`);
  animateBar('pz-readiness-bar', readiness);

  setEl('pz-stat-skill', overall);
  animateBar('pz-skill-bar', overall);

  setEl('pz-course-pct-overall', `${courseProgress}%`);
  animateBar('pz-course-bar-overall', courseProgress);

  setEl('pz-stat-streak', streak);
  renderStreakDots(streak);
}

/** Render streak dot visualization (7 dots, filled = streak days up to 7) */
function renderStreakDots(streak) {
  const dotsEl = document.getElementById('pz-streak-dots');
  if (!dotsEl) return;
  const TOTAL_DOTS = 7;
  const filled = Math.min(streak, TOTAL_DOTS);
  dotsEl.innerHTML = Array.from({ length: TOTAL_DOTS }, (_, i) => {
    const isActive = i < filled;
    return `<div class="flex-1 ${isActive ? 'bg-error' : 'bg-surface-container-high'} rounded-full transition-all duration-300"></div>`;
  }).join('');
}

/** Render the recommendation card */
function renderRecommendationCard(data) {
  const { topWeak, recommendedCourse, career, careerId, overall, assessmentDone } = data;

  const recSkillEl  = document.querySelector('[data-pz-rec-skill]');
  const recDescEl   = document.querySelector('[data-pz-rec-desc]');
  const recWhyEl    = document.getElementById('pz-rec-why');
  const recLinkEl   = document.getElementById('pz-rec-course-link');

  if (!assessmentDone || !topWeak) {
    // Empty state: no assessment
    if (recSkillEl) recSkillEl.textContent = 'Complete Your Assessment';
    if (recDescEl)  recDescEl.textContent  = 'Take the skill assessment to unlock personalized recommendations based on your actual skill gaps.';
    if (recLinkEl)  recLinkEl.href         = '../assessment/skill-assessment.html';
    if (recLinkEl)  recLinkEl.innerHTML    = 'Start Assessment <span class="material-symbols-outlined text-[18px]">arrow_forward</span>';
    return;
  }

  // Populate recommendation
  if (recSkillEl) recSkillEl.textContent = `Improve ${topWeak.label}`;

  const course = recommendedCourse || PzRecommendations.getCourseForSkill(topWeak.skill);
  if (recDescEl) {
    recDescEl.textContent = course
      ? `Recommended: ${course.title} — Est. ${course.duration || '4 hours'}`
      : `Focus on ${topWeak.label} to close your biggest skill gap.`;
  }

  // "Why this is recommended" explanation
  if (recWhyEl) {
    recWhyEl.textContent =
      `Why: Your ${topWeak.label} score is ${topWeak.score}%, ` +
      `while ${career?.title || 'your career'} requires ${topWeak.required}%. ` +
      `This creates a ${topWeak.gap}-point gap — your highest priority skill gap.`;
    recWhyEl.classList.remove('hidden');
  }

  // CTA link
  if (recLinkEl) {
    recLinkEl.href    = '../courses/courses.html';
    recLinkEl.innerHTML = 'Start Learning <span class="material-symbols-outlined text-[18px]">arrow_forward</span>';
  }

  // Gap visualization
  const gapCurrentEls = document.querySelectorAll('[data-pz-gap-current]');
  gapCurrentEls.forEach(el => { el.textContent = `${topWeak.score}%`; });

  const gapTargetEls = document.querySelectorAll('[data-pz-gap-target]');
  gapTargetEls.forEach(el => { el.textContent = `${topWeak.required}%`; });

  const gapLabelEl = document.querySelector('[data-pz-gap-label]');
  if (gapLabelEl) gapLabelEl.textContent = `${topWeak.gap}% Gap`;

  // Gap bar (current score)
  const gapBarEl = document.querySelector('[data-pz-gap-bar]');
  if (gapBarEl) {
    setTimeout(() => { gapBarEl.style.width = `${topWeak.score}%`; }, 150);
  }

  // Gap target line position
  const targetLineEl = document.getElementById('pz-gap-target-line');
  const targetLabelEl = document.getElementById('pz-gap-target-label');
  if (targetLineEl) targetLineEl.style.left = `${topWeak.required}%`;
  if (targetLabelEl) targetLabelEl.style.left = `${topWeak.required}%`;

  // Shadow bar (gap region between current and required)
  const shadowBarEl = document.getElementById('pz-gap-shadow-bar');
  if (shadowBarEl) {
    const gapWidth = Math.max(0, topWeak.required - topWeak.score);
    shadowBarEl.style.left  = `${topWeak.score}%`;
    shadowBarEl.style.width = `${gapWidth}%`;
  }

  // SVG ring: actual score vs required
  const ringActual = document.getElementById('pz-rec-ring-actual');
  const ringTarget = document.getElementById('pz-rec-ring-target');
  const circumference = 251.2;

  if (ringActual) {
    const actualOffset = circumference - (topWeak.score / 100) * circumference;
    setTimeout(() => {
      ringActual.style.transition = 'stroke-dashoffset 0.8s ease-out';
      ringActual.setAttribute('stroke-dashoffset', actualOffset.toFixed(2));
    }, 200);
  }
  if (ringTarget) {
    const targetOffset = circumference - (topWeak.required / 100) * circumference;
    ringTarget.setAttribute('stroke-dashoffset', targetOffset.toFixed(2));
  }

  // Career title in gap sentence
  const careerTitleEl = document.getElementById('pz-career-title');
  if (careerTitleEl && career) careerTitleEl.textContent = `a ${career.title}`;
}

/** Render the dynamic career roadmap */
function renderCareerRoadmap(data) {
  const { scores, career, careerId } = data;
  const roadmapEl = document.getElementById('pz-career-roadmap');
  if (!roadmapEl) return;

  if (!career?.phases) {
    // Fallback for careers without phases
    roadmapEl.innerHTML = `
      <div class="absolute left-[11px] top-2 bottom-4 w-[2px] bg-surface-container-high z-0"></div>
      <div class="relative z-10 text-center py-md text-on-surface-variant">
        <p class="font-body-sm text-body-sm">Career roadmap not available.</p>
      </div>`;
    return;
  }

  const phaseHtml = career.phases.map((phase, idx) => {
    // A phase is "complete" if all its skills meet required scores
    const phaseSkills = phase.skills || [];
    const phaseComplete = phaseSkills.length > 0 &&
      phaseSkills.every(s => (scores[s] || 0) >= (career.requiredSkills[s] || 70));

    // "In progress" = at least one skill has a score
    const hasAnyScore = phaseSkills.some(s => (scores[s] || 0) > 0);
    const isInProgress = !phaseComplete && hasAnyScore;
    const isLocked = !phaseComplete && !hasAnyScore;
    const isLast = idx === career.phases.length - 1;

    let dotHtml, titleClass;
    if (phaseComplete) {
      dotHtml    = `<div class="w-6 h-6 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 shadow-[0_0_10px_rgba(70,72,212,0.3)] mt-1"><span class="material-symbols-outlined text-on-secondary text-[14px]">check</span></div>`;
      titleClass = 'font-label-md text-label-md text-primary';
    } else if (isInProgress) {
      dotHtml    = `<div class="w-6 h-6 rounded-full bg-surface-container-lowest border-4 border-secondary flex-shrink-0 mt-1 shadow-sm"></div>`;
      titleClass = 'font-label-md text-label-md text-secondary font-bold';
    } else {
      dotHtml    = `<div class="w-6 h-6 rounded-full bg-surface-container-high border-2 border-outline-variant flex items-center justify-center flex-shrink-0 mt-1 opacity-50"><span class="material-symbols-outlined text-outline-variant text-[14px]">lock</span></div>`;
      titleClass = 'font-label-md text-label-md text-on-surface-variant';
    }

    const skillList = phaseSkills.map(s => PzSkills[s]?.label || s).join(', ');
    const wrapClass = (isLocked ? 'opacity-50 ' : '') + (isLast ? '' : 'mb-6');

    // Average phase score for label
    const avgScore = phaseSkills.length > 0
      ? Math.round(phaseSkills.reduce((sum, s) => sum + (scores[s] || 0), 0) / phaseSkills.length)
      : null;
    const scoreTag = avgScore !== null && !phaseComplete
      ? `<span class="ml-1 font-label-sm text-label-sm text-on-surface-variant">${avgScore}%</span>`
      : '';

    return `
      <div class="relative z-10 flex items-start gap-4 ${wrapClass}">
        ${dotHtml}
        <div>
          <h4 class="${titleClass}">${phase.name}${scoreTag}</h4>
          <p class="font-body-sm text-body-sm text-on-surface-variant">${skillList || 'Core skills'}</p>
        </div>
      </div>`;
  }).join('');

  roadmapEl.innerHTML = `
    <div class="absolute left-[11px] top-2 bottom-4 w-[2px] bg-surface-container-high z-0"></div>
    ${phaseHtml}`;
}

/** Render the top job match card */
function renderJobCard(data) {
  const { topJob, assessmentDone } = data;

  setEl('pz-top-job-title',   topJob ? topJob.title   : assessmentDone ? 'No jobs matched yet' : 'Complete assessment first');
  setEl('pz-top-job-company', topJob ? topJob.company : 'View all jobs →');
  setEl('pz-top-job-match',   topJob ? `${topJob.matchPct}%` : '—');
}

/** Render the skill overview table */
function renderSkillTable(data) {
  const { scores, career, careerId, assessmentDone } = data;
  const tbody = document.querySelector('tbody.divide-y');
  if (!tbody) return;

  // Remove loading row if present
  const loadingRow = document.getElementById('pz-skill-table-loading');
  if (loadingRow) loadingRow.remove();

  if (!assessmentDone || Object.keys(scores).length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="p-lg text-center">
          <div class="flex flex-col items-center gap-sm">
            <span class="material-symbols-outlined text-[36px] text-outline">quiz</span>
            <p class="font-label-md text-primary">No assessment data yet</p>
            <p class="font-body-sm text-body-sm text-on-surface-variant">Complete the skill assessment to see your skill breakdown.</p>
            <a href="../assessment/skill-assessment.html"
               class="mt-2 bg-primary text-on-primary font-label-md py-sm px-md rounded-lg hover:opacity-90 transition-opacity shadow-sm inline-block">
              Start Assessment
            </a>
          </div>
        </td>
      </tr>`;
    return;
  }

  const careerSkills = career ? Object.keys(career.requiredSkills) : Object.keys(scores);
  const top5 = careerSkills.slice(0, 5);

  tbody.innerHTML = top5.map(skill => {
    const score    = scores[skill] || 0;
    const required = career?.requiredSkills[skill] || 70;
    const meta     = PzSkills[skill] || { label: skill, icon: 'code' };
    const level    = PzScoring.getSkillLevel(score);
    const isMet    = score >= required;

    const statusLabel = isMet ? 'Strong' : score >= 50 ? 'Developing' : 'Weak';
    const statusClass = isMet
      ? 'bg-inverse-on-surface text-on-surface'
      : score >= 50
        ? 'bg-surface-container-high text-on-surface'
        : 'bg-error-container text-on-error-container border border-error opacity-80';
    const barColor   = isMet ? 'bg-secondary' : score >= 50 ? 'bg-[#b97a00]' : 'bg-error';
    const dotColor   = isMet ? 'bg-secondary' : score >= 50 ? 'bg-[#b97a00]' : 'bg-error';
    const iconBg     = isMet ? 'bg-surface-container text-primary' : 'bg-error-container text-on-error-container';
    const linkTarget = !isMet ? '../courses/courses.html' : '../skills/skill-profile.html';
    const linkText   = !isMet ? 'Improve' : '→';

    return `
      <tr class="hover:bg-surface transition-colors group">
        <td class="p-md">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded ${iconBg} flex items-center justify-center">
              <span class="material-symbols-outlined text-[18px]">${meta.icon}</span>
            </div>
            <div>
              <span class="font-label-md text-label-md text-primary group-hover:text-secondary transition-colors block">${meta.label}</span>
              <span class="font-label-sm text-label-sm text-on-surface-variant">${level}</span>
            </div>
          </div>
        </td>
        <td class="p-md">
          <div class="flex items-center gap-2">
            <div class="w-24 h-1.5 bg-surface-container-high rounded-full">
              <div class="${barColor} h-full rounded-full" style="width: ${score}%"></div>
            </div>
            <span class="font-label-sm text-label-sm text-on-surface-variant">${score}%</span>
          </div>
        </td>
        <td class="p-md">
          <span class="inline-flex items-center gap-1 px-2 py-1 rounded-md ${statusClass} font-label-sm text-label-sm">
            <span class="w-1.5 h-1.5 rounded-full ${dotColor}"></span> ${statusLabel}
          </span>
        </td>
        <td class="p-md text-right">
          <a href="${linkTarget}" class="text-secondary font-label-sm text-label-sm hover:underline">${linkText}</a>
        </td>
      </tr>`;
  }).join('');
}

/** Dashboard subtitle + career card title */
function renderCareerSection(data) {
  const { career, careerId } = data;

  const subtitleEl = document.getElementById('pz-dashboard-subtitle');
  if (subtitleEl) {
    if (career) {
      subtitleEl.textContent = `Let's continue building your ${career.title} career.`;
    } else {
      subtitleEl.innerHTML = `No career selected. <a href="../onboarding/career-selection.html" class="text-secondary hover:underline font-medium">Choose your career path →</a>`;
    }
  }

  const careerTitleEl = document.getElementById('pz-career-title');
  if (careerTitleEl && career) careerTitleEl.textContent = `a ${career.title}`;
}

// ════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
  // Enforce authentication on protected page
  if (window.PzAuth) {
    const user = await PzAuth.requireAuth();
    if (!user) return;
  }

  // Gather all data from single source
  const data = getDashboardData();

  // Render all sections
  renderGreeting(data.user);
  renderCareerSection(data);
  renderMetricCards(data);
  renderRecommendationCard(data);
  renderCareerRoadmap(data);
  renderJobCard(data);
  renderTypingCard();
  renderInterviewCard();
  renderSkillTable(data);

  // Badge count — evaluate from existing badge data
  renderDashboardBadgeCount();

  // AI Learning Insights (Step 29)
  initAIDashboardInsights();

  // Debug log
  console.group('[Phazon Dashboard]');
  console.log('Career:', data.careerId || 'none');
  console.log('Assessment done:', data.assessmentDone);
  console.log('Overall:', `${data.overall}%`, '| Readiness:', `${data.readiness}%`, '| Streak:', data.streak);
  if (data.topWeak) {
    console.log('Top weak skill:', data.topWeak.label, `(gap: ${data.topWeak.gap}%)`);
  }
  console.log('Course progress:', `${data.courseProgress}%`);
  console.groupEnd();
});

/** Populate badge count on any element with data-pz-badges-earned */
function renderDashboardBadgeCount() {
  try {
    const scores           = PzState.getMergedSkillScores();
    const courseProgress   = PzState.getCourseProgress();
    const assessmentDone   = PzState.isAssessmentDone();
    const completedCourses = PzState.getCompletedCourses();

    let earnedCount = 0;
    PzBadges.forEach(badge => {
      if (badge.skill) {
        if ((scores[badge.skill] || 0) >= badge.threshold) earnedCount++;
      } else if (badge.courseId) {
        const course = PzCourses.find(c => c.id === badge.courseId);
        if (course) {
          const total = course.modules.reduce((t, m) => t + m.lessons.length, 0);
          if (PzState.getCoursePercent(badge.courseId, total) === 100) earnedCount++;
        }
      } else if (badge.requirementType === 'ASSESSMENT') {
        if (assessmentDone) earnedCount++;
      } else if (badge.requirementType === 'FIRST_COURSE') {
        const started = Object.values(courseProgress).some(p => p?.completedLessons?.length > 0);
        if (started) earnedCount++;
      } else if (badge.requirementType === 'CAREER_READINESS') {
        const result   = PzState.getAssessmentResult();
        const readiness = result?.careerReadiness || 0;
        if (readiness >= (badge.readinessThreshold || 80)) earnedCount++;
      } else if (badge.requirementType === 'MULTI_SKILL') {
        const qualified = Object.values(scores).filter(s => s >= (badge.skillThreshold || 60)).length;
        if (qualified >= (badge.skillCount || 5)) earnedCount++;
      }
    });

    document.querySelectorAll('[data-pz-badges-earned]').forEach(el => {
      el.textContent = earnedCount;
    });
  } catch (e) {
    // Silently fail if badges not loaded
  }
}

/** Populate typing card metrics on dashboard */
function renderTypingCard() {
  const speedEl = document.getElementById('pz-dash-typing-speed');
  const subEl   = document.getElementById('pz-dash-typing-sub');
  const levelEl = document.getElementById('pz-dash-typing-level');
  if (!speedEl) return;

  const skill = PzState.getTypingSkill();
  const best  = PzState.getTypingBest();

  if (best.overall.testsCompleted > 0) {
    speedEl.textContent = `${skill.wpm || best.overall.bestWpm} WPM`;
    if (subEl) subEl.textContent = `Accuracy: ${skill.accuracy || best.overall.bestAccuracy}% · Best: ${best.overall.bestWpm} WPM · ${best.overall.testsCompleted} Tests`;
    if (levelEl) levelEl.textContent = skill.level || 'Practicing';
  } else {
    speedEl.textContent = 'Take Test';
    if (subEl) subEl.textContent = 'Practice coding speed & accuracy in the Typing Lab';
    if (levelEl) levelEl.textContent = 'Start Now';
  }
}

/** Populate interview card metrics on dashboard */
function renderInterviewCard() {
  const scoreEl = document.getElementById('pz-dash-interview-score');
  const subEl   = document.getElementById('pz-dash-interview-sub');
  const badgeEl = document.getElementById('pz-dash-interview-badge');
  if (!scoreEl) return;

  const stats = PzState.getInterviewStats();

  if (stats.totalCompleted > 0) {
    scoreEl.textContent = `${stats.latestScore} / 10`;
    if (subEl) subEl.textContent = `Latest: ${stats.latestScore} · Best: ${stats.bestScore} · ${stats.totalCompleted} Completed`;
    if (badgeEl) badgeEl.textContent = stats.latestScore >= 8 ? 'Strong' : 'Practiced';
  } else {
    scoreEl.textContent = 'Start Practice';
    if (subEl) subEl.textContent = 'AI-evaluated technical mock interviews for your role';
    if (badgeEl) badgeEl.textContent = 'Ready';
  }
}

// ════════════════════════════════════════════════════════════════════
// AI LEARNING INSIGHTS (STEP 29)
// ════════════════════════════════════════════════════════════════════

/** Initialize AI Dashboard Insights */
function initAIDashboardInsights() {
  const refreshBtn = document.getElementById('pz-dash-ai-refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => loadAIDashboardInsights(true));
  }
  loadAIDashboardInsights(false);
}

/** Load AI Dashboard Insights (checks DB cache first unless forceRefresh is true) */
async function loadAIDashboardInsights(forceRefresh = false) {
  const loadingEl  = document.getElementById('pz-dash-ai-loading');
  const fallbackEl = document.getElementById('pz-dash-ai-fallback');
  const contentEl  = document.getElementById('pz-dash-ai-content');
  const refreshBtn = document.getElementById('pz-dash-ai-refresh-btn');

  if (!contentEl) return;

  if (loadingEl) loadingEl.classList.remove('hidden');
  if (fallbackEl) fallbackEl.classList.add('hidden');
  if (refreshBtn) {
    refreshBtn.disabled = true;
    refreshBtn.style.opacity = '0.6';
  }

  let resultData = null;

  try {
    // 1. Token-saving cache check (unless explicitly forced)
    if (!forceRefresh && window.PzAPI) {
      const cached = await PzAPI.getDashboardInsights();
      if (cached && cached.insights) {
        resultData = cached.insights;
      }
    }

    // 2. Generate new insights if no cached version exists or forceRefresh is true
    if (!resultData && window.PzAPI) {
      const dashData = getDashboardData();
      const skillsPayload = (dashData.strongSkills || []).concat(dashData.weakSkills || []).map(s => ({
        name: s.label || s.skill,
        score: s.score,
      }));

      const apiRes = await PzAPI.generateDashboardInsights({
        careerRole: dashData.career?.title || dashData.careerId || 'Full Stack Developer',
        skills: skillsPayload,
        courseProgress: [{ course: 'Active Course Path', progress: dashData.courseProgress }],
      });

      if (apiRes && apiRes.insights) {
        resultData = apiRes.insights;
      }
    }

    // 3. Fallback to client-side PzAI if PzAPI wasn't available
    if (!resultData && window.PzAI) {
      const aiRes = await PzAI.generateDashboardInsights();
      if (aiRes && aiRes.success && aiRes.data) {
        resultData = aiRes.data;
      }
    }
  } catch (err) {
    console.warn('[DashboardModule] Failed to load AI Insights:', err);
  } finally {
    if (loadingEl) loadingEl.classList.add('hidden');
    if (refreshBtn) {
      refreshBtn.disabled = false;
      refreshBtn.style.opacity = '1';
    }
  }

  if (resultData) {
    renderAIDashboardInsights(resultData);
  } else {
    if (fallbackEl) fallbackEl.classList.remove('hidden');
  }
}

/** Render AI Dashboard Insights into DOM */
function renderAIDashboardInsights(data) {
  const summaryEl = document.getElementById('pz-dash-ai-summary');
  const listEl    = document.getElementById('pz-dash-ai-insights-list');
  const nextTitle = document.getElementById('pz-dash-ai-next-title');
  const nextMsg   = document.getElementById('pz-dash-ai-next-msg');

  if (summaryEl && data.summary) {
    summaryEl.textContent = data.summary;
  }

  if (listEl && Array.isArray(data.insights)) {
    listEl.innerHTML = data.insights.map(item => {
      const isStrength = item.type === 'strength';
      const isGap = item.type === 'gap';
      const icon = isStrength ? 'check_circle' : isGap ? 'warning' : 'school';
      const colorCls = isStrength ? 'text-secondary bg-secondary-container/20 border-secondary/30'
        : isGap ? 'text-error bg-error-container/20 border-error/30'
        : 'text-primary bg-surface-container border-outline-variant/40';

      return `
        <div class="p-sm rounded-xl border ${colorCls} flex items-start gap-sm">
          <span class="material-symbols-outlined text-[18px] mt-0.5" style="font-variation-settings: 'FILL' 1;">${icon}</span>
          <div>
            <h5 class="font-label-md text-primary text-xs font-bold">${item.title || 'Insight'}</h5>
            <p class="font-body-sm text-on-surface-variant text-xs leading-relaxed mt-0.5">${item.message || ''}</p>
          </div>
        </div>`;
    }).join('');
  }

  if (data.nextAction) {
    if (nextTitle) nextTitle.textContent = data.nextAction.title || 'Focus on core skill gaps';
    if (nextMsg) nextMsg.textContent = data.nextAction.message || 'Continue with your active course path.';
  }
}



