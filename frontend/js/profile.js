/**
 * Phazon Profile Module
 * Populates user profile stats from state.
 * Depends on: state.js, data.js, ui.js
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Enforce authentication on protected page
  if (window.PzAuth) {
    const authUser = await PzAuth.requireAuth();
    if (!authUser) return;
  }

  // Load profile from backend (source of truth) — fall back to localStorage
  if (window.PzAPI) {
    try {
      const serverProfile = await PzAPI.getProfile();
      if (serverProfile) {
        // Sync backend profile into localStorage
        PzState.setUser({
          id:            serverProfile.id,
          name:          serverProfile.name,
          email:         serverProfile.email,
          selected_role: serverProfile.selected_role,
        });
        if (serverProfile.selected_role) {
          const slug = serverProfile.selected_role.toLowerCase().includes('frontend')
            ? 'frontend'
            : serverProfile.selected_role.toLowerCase().includes('backend')
            ? 'backend'
            : 'full-stack';
          PzState.setCareer(slug);
        }
      }
    } catch (_) {}
  }

  const user = PzState.getUser();
  const scores = PzState.getSkillScores();
  const careerId = PzState.getCareer();
  const career = PzCareers[careerId];
  const overall = PzScoring.computeOverallScore(scores, careerId);
  const readiness = PzScoring.computeCareerReadiness(scores, careerId);
  const streak = PzState.getStreak();
  const badges = PzState.getBadges();

  // ── User Info ─────────────────────────────────────────────────────
  document.querySelectorAll('[data-pz-username], #pz-profile-name').forEach(el => {
    el.textContent = user.name;
  });
  document.querySelectorAll('[data-pz-useremail], #pz-profile-email').forEach(el => {
    el.textContent = user.email;
  });

  setField('pz-profile-career', career?.title || 'Career Path');
  setField('pz-profile-score', `${overall}%`);
  setField('pz-profile-readiness', `${readiness}%`);
  setField('pz-profile-streak', `${streak} days`);
  setField('pz-profile-badges', `${badges.length}`);

  // ── Certificate count ─────────────────────────────────────────────
  const issuedCertCount = Object.keys(PzState.getIssuedCerts()).length;
  setField('pz-profile-certs', `${issuedCertCount}`);
  const certPluralEl = document.getElementById('pz-profile-certs-plural');
  if (certPluralEl) certPluralEl.textContent = issuedCertCount === 1 ? '' : 's';

  // ── Skill Summary ─────────────────────────────────────────────────
  const skillSummary = document.getElementById('pz-profile-skills');
  if (skillSummary) {
    const topSkills = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    skillSummary.innerHTML = topSkills.map(([skill, score]) => {
      const meta = PzSkills[skill] || { label: skill, icon: 'code' };
      return `
        <div class="flex items-center justify-between py-sm border-b border-outline-variant last:border-0">
          <div class="flex items-center gap-sm">
            <span class="material-symbols-outlined text-[18px] text-on-surface-variant">${meta.icon}</span>
            <span class="font-body-sm text-body-sm text-on-surface">${meta.label}</span>
          </div>
          <div class="flex items-center gap-sm">
            <div class="w-24 bg-surface-container-highest rounded-full h-1.5 overflow-hidden">
              <div class="h-full rounded-full ${PzUI.getScoreBgColor(score)} transition-all" style="width: ${score}%"></div>
            </div>
            <span class="font-label-md text-label-md ${PzUI.getScoreColor(score)} w-10 text-right">${score}%</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // ── Initials Avatar fallback ─────────────────────────────────────
  const avatarEl = document.getElementById('pz-profile-avatar');
  if (avatarEl) {
    const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    const imgEl = avatarEl.querySelector('img');
    if (imgEl) {
      imgEl.onerror = () => {
        imgEl.style.display = 'none';
        avatarEl.textContent = initials;
        avatarEl.classList.add('flex', 'items-center', 'justify-center', 'font-headline-md', 'text-headline-md', 'bg-secondary', 'text-on-secondary');
      };
    }
  }

  // ── Progress Summary ──────────────────────────────────────────────
  const progressEl = document.getElementById('pz-profile-progress-bar');
  if (progressEl) {
    progressEl.style.width = `${readiness}%`;
  }

  // ── Edit profile form (if present) ───────────────────────────────
  const editForm = document.getElementById('pz-profile-edit-form');
  if (editForm) {
    const nameInput = document.getElementById('pz-edit-name');
    const emailInput = document.getElementById('pz-edit-email');
    if (nameInput) nameInput.value = user.name;
    if (emailInput) emailInput.value = user.email;

    editForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const newName = nameInput?.value.trim() || user.name;
      const newEmail = emailInput?.value.trim() || user.email;
      PzState.setUser({ name: newName, email: newEmail });
      PzUI.showToast('Profile updated!', 'success');
      // Refresh displayed name
      document.querySelectorAll('[data-pz-username]').forEach(el => { el.textContent = newName; });
    });
  }
});

function setField(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}
