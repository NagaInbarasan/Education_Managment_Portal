/**
 * Phazon UI Utilities
 * Shared UI helpers used across all pages.
 * Depends on: state.js
 */

const PzUI = {
  // ── Active Navigation ─────────────────────────────────────────────
  setActiveNav() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('nav a, aside a');

    navLinks.forEach(link => {
      const href = link.getAttribute('href') || '';
      const linkPage = href.split('/').pop();

      if (linkPage === currentPage && linkPage !== '#') {
        link.classList.add('bg-secondary', 'text-white', 'font-semibold', 'shadow-sm');
        link.classList.remove('text-on-surface-variant', 'hover:bg-surface-container', 'hover:text-primary');
        const icon = link.querySelector('.material-symbols-outlined');
        if (icon) icon.style.fontVariationSettings = "'FILL' 1";
      }
    });
  },

  // ── Side Menu & Mobile Drawer Auto-Handler ──────────────────────────
  initSideMenu() {
    const btn = document.getElementById('mobile-menu-btn') || document.getElementById('dash-mobile-toggle');
    const menu = document.getElementById('mobile-menu');

    if (btn && menu) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('hidden');
      });
    }
  },

  // ── Toast Notifications ───────────────────────────────────────────
  showToast(message, type = 'info', duration = 3000) {
    const existing = document.getElementById('pz-toast');
    if (existing) existing.remove();

    const colors = {
      success: 'bg-secondary text-on-secondary',
      error: 'bg-error text-on-error',
      info: 'bg-primary-container text-on-primary-container',
      warning: 'bg-error-container text-on-error-container',
    };

    const icons = { success: 'check_circle', error: 'error', info: 'info', warning: 'warning' };

    const toast = document.createElement('div');
    toast.id = 'pz-toast';
    toast.className = `fixed bottom-6 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg font-label-md text-label-md transition-all duration-300 ${colors[type] || colors.info}`;
    toast.innerHTML = `
      <span class="material-symbols-outlined text-[18px]">${icons[type] || 'info'}</span>
      <span>${message}</span>
    `;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translate(-50%, 20px)';
      requestAnimationFrame(() => {
        toast.style.transition = 'all 0.3s ease';
        toast.style.opacity = '1';
        toast.style.transform = 'translate(-50%, 0)';
      });
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translate(-50%, 20px)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // ── Progress Bars ─────────────────────────────────────────────────
  animateProgressBar(fillEl, pct, colorClass = 'bg-secondary') {
    if (!fillEl) return;
    fillEl.style.width = '0%';
    fillEl.classList.add(colorClass);
    setTimeout(() => {
      fillEl.style.transition = 'width 0.8s ease-out';
      fillEl.style.width = `${Math.min(100, Math.max(0, pct))}%`;
    }, 100);
  },

  setCircularProgress(svgEl, pct) {
    if (!svgEl) return;
    const path = svgEl.querySelector('[stroke-dasharray]');
    if (path) path.setAttribute('stroke-dasharray', `${Math.min(100, pct)}, 100`);
    const label = svgEl.parentElement?.querySelector('.pz-circle-label');
    if (label) label.textContent = `${Math.round(pct)}%`;
  },

  // ── Score / Grade Color ───────────────────────────────────────────
  getScoreColor(score) {
    if (score >= 70) return 'text-secondary';
    if (score >= 50) return 'text-[#b97a00]';
    return 'text-error';
  },

  getScoreBgColor(score) {
    if (score >= 70) return 'bg-secondary';
    if (score >= 50) return 'bg-[#b97a00]';
    return 'bg-error';
  },

  // ── Populate User Name ────────────────────────────────────────────
  populateUserName() {
    const user = PzState.getUser();
    document.querySelectorAll('[data-pz-username]').forEach(el => {
      el.textContent = user.name;
    });
    document.querySelectorAll('[data-pz-useremail]').forEach(el => {
      el.textContent = user.email;
    });
  },

  // ── Redirect Helper ───────────────────────────────────────────────
  navigateTo(path) {
    window.location.href = path;
  },
};

window.PzUI = PzUI;

document.addEventListener('DOMContentLoaded', () => {
  PzUI.setActiveNav();
  PzUI.initSideMenu();
});
