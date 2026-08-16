/**
 * Phazon Auth Controller Module
 * Handles login & registration UI interactions, Supabase Email/Password Auth execution, and error handling.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('pz-auth-form');
  if (!form) return;

  const tabRegister          = document.getElementById('tab-register');
  const tabLogin             = document.getElementById('tab-login');
  const registerFields       = document.getElementById('register-fields');
  const confirmPasswordField = document.getElementById('confirm-password-field');
  const formSubtitle         = document.getElementById('auth-form-subtitle');
  const submitBtn            = document.getElementById('auth-submit-btn');
  const toggleLink           = document.getElementById('auth-toggle-link');
  const toggleText           = document.getElementById('auth-toggle-text');
  const errorBox             = document.getElementById('auth-error-box');
  const errorMsg             = document.getElementById('auth-error-msg');

  let isRegister = false; // Default to Login tab

  function showError(msg) {
    if (errorBox && errorMsg) {
      errorMsg.textContent = msg;
      errorBox.classList.remove('hidden');
      errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function clearError() {
    if (errorBox) errorBox.classList.add('hidden');
  }

  function setLoading(btn, text, loading) {
    if (!btn) return;
    btn.disabled = loading;
    btn.textContent = text;
    btn.style.opacity = loading ? '0.7' : '1';
  }

  function setMode(register) {
    isRegister = register;
    clearError();

    if (register) {
      tabRegister?.classList.add('border-b-2', 'border-secondary', 'text-primary');
      tabRegister?.classList.remove('text-on-surface-variant');
      tabLogin?.classList.remove('border-b-2', 'border-secondary', 'text-primary');
      tabLogin?.classList.add('text-on-surface-variant');
      registerFields?.classList.remove('hidden');
      confirmPasswordField?.classList.remove('hidden');
      if (formSubtitle) formSubtitle.textContent = 'Create your academic management account.';
      if (submitBtn)    submitBtn.textContent = 'Create Account';
      if (toggleText)   toggleText.textContent = 'Already have an account?';
      if (toggleLink)   toggleLink.textContent = 'Login';
    } else {
      tabLogin?.classList.add('border-b-2', 'border-secondary', 'text-primary');
      tabLogin?.classList.remove('text-on-surface-variant');
      tabRegister?.classList.remove('border-b-2', 'border-secondary', 'text-primary');
      tabRegister?.classList.add('text-on-surface-variant');
      registerFields?.classList.add('hidden');
      confirmPasswordField?.classList.add('hidden');
      if (formSubtitle) formSubtitle.textContent = 'Log in to continue to your academic portal.';
      if (submitBtn)    submitBtn.textContent = 'Log In';
      if (toggleText)   toggleText.textContent = "Don't have an account?";
      if (toggleLink)   toggleLink.textContent = 'Register';
    }
  }

  function redirectToDashboard(userRole) {
    const url = PzAuth.getDashboardUrl(userRole || PzState.getRole());
    window.location.href = url;
  }

  // Set default mode to Login
  setMode(false);

  tabRegister?.addEventListener('click', () => setMode(true));
  tabLogin?.addEventListener('click',    () => setMode(false));
  toggleLink?.addEventListener('click',  (e) => { e.preventDefault(); setMode(!isRegister); });

  // Redirect if already logged in
  if (window.PzAuth) {
    const session = await PzAuth.getSession();
    if (session) {
      redirectToDashboard(session.user?.role);
      return;
    }
  }

  // Form Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const email           = document.getElementById('email')?.value?.trim() || '';
    const password        = document.getElementById('password')?.value || '';
    const name            = document.getElementById('name')?.value?.trim() || '';
    const selectedRole    = document.getElementById('role')?.value || 'student';
    const confirmPassword = document.getElementById('confirm_password')?.value || '';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError('Please enter a valid email address.'); return;
    }
    if (!password) { showError('Please enter your password.'); return; }
    if (password.length < 6) { showError('Password must be at least 6 characters long.'); return; }

    if (isRegister) {
      if (!name) { showError('Please enter your full name.'); return; }
      if (password !== confirmPassword) { showError('Passwords do not match.'); return; }

      setLoading(submitBtn, 'Creating Account...', true);
      try {
        const { user, requiresConfirmation } = await PzAuth.register({ name, email, password, role: selectedRole });

        if (requiresConfirmation) {
          showError('');
          errorBox?.classList.remove('hidden');
          if (errorMsg) {
            errorMsg.textContent = '';
            errorBox.className = 'p-sm bg-secondary-container text-on-background rounded-lg font-body-sm text-body-sm flex items-center gap-sm';
            errorBox.innerHTML = '<span class="material-symbols-outlined text-[18px] text-secondary">mark_email_read</span><span>Account created! Please check your email to confirm, then log in.</span>';
          }
          setLoading(submitBtn, 'Create Account', false);
          return;
        }

        redirectToDashboard(user?.role || selectedRole);

      } catch (err) {
        setLoading(submitBtn, 'Create Account', false);
        let msg = err.message || 'Registration failed. Please try again.';
        if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already been registered')) {
          msg = 'This email is already registered. Please log in instead.';
        }
        showError(msg);
      }

    } else {
      setLoading(submitBtn, 'Logging In...', true);
      try {
        const session = await PzAuth.login({ email, password });
        if (!session || !session.user) {
          throw new Error('User profile not found. Please contact system administrator.');
        }
        redirectToDashboard(session.user.role);

      } catch (err) {
        setLoading(submitBtn, 'Log In', false);
        let msg = err.message || 'Login failed. Please check your credentials.';
        if (msg.includes('Invalid email or password') || msg.includes('Invalid login credentials')) {
          msg = 'Invalid email address or password.';
        } else if (msg.includes('Email not confirmed')) {
          msg = 'Please confirm your email address before logging in.';
        }
        showError(msg);
      }
    }
  });
});
