/**
 * Phazon App — Global Initializer
 * Loaded on every page. Sets up active nav, streak tracking, and logout handler.
 * Depends on: state.js, ui.js, auth-client.js
 */

document.addEventListener('DOMContentLoaded', () => {
  // Update streak
  if (window.PzState) PzState.updateStreak();

  // Set active nav highlight
  if (window.PzUI) PzUI.setActiveNav();

  // Populate user name wherever [data-pz-username] exists
  if (window.PzUI) PzUI.populateUserName();

  // Global Logout button handler
  document.addEventListener('click', (e) => {
    const logoutTarget = e.target.closest('#logout-btn, [data-pz-logout], a[href*="logout"]');
    if (logoutTarget) {
      e.preventDefault();
      if (window.PzAuth) {
        PzAuth.logout();
      } else {
        window.location.href = '/pages/auth/auth.html';
      }
    }
  });

  // Mobile nav hamburger (if present)
  const menuBtn = document.getElementById('pz-mobile-menu-btn');
  const mobileSidebar = document.getElementById('pz-mobile-sidebar');
  const mobileSidebarOverlay = document.getElementById('pz-mobile-overlay');

  if (menuBtn && mobileSidebar) {
    menuBtn.addEventListener('click', () => {
      mobileSidebar.classList.toggle('hidden');
      mobileSidebarOverlay?.classList.toggle('hidden');
    });
    mobileSidebarOverlay?.addEventListener('click', () => {
      mobileSidebar.classList.add('hidden');
      mobileSidebarOverlay.classList.add('hidden');
    });
  }
});
