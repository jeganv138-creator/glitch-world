/**
 * auth.js
 * Authentication Controller for GLITCH WORLD.
 * Handles Login, Registration, Input Validation, and local account persistence.
 */

class AuthController {
  constructor() {
    this.authScreen = document.getElementById('auth-screen');
    this.mode = 'login'; // 'login' or 'register'

    this.tabLogin = document.getElementById('tab-login');
    this.tabRegister = document.getElementById('tab-register');
    this.authForm = document.getElementById('auth-form');

    this.usernameInput = document.getElementById('auth-username');
    this.passwordInput = document.getElementById('auth-password');
    this.confirmGroup = document.getElementById('confirm-password-group');
    this.confirmInput = document.getElementById('auth-confirm-password');
    this.submitBtn = document.getElementById('auth-submit-btn');
    this.toggleText = document.getElementById('auth-toggle-text');

    this._bindEvents();
  }

  _bindEvents() {
    if (this.tabLogin) {
      this.tabLogin.addEventListener('click', () => this.setMode('login'));
    }
    if (this.tabRegister) {
      this.tabRegister.addEventListener('click', () => this.setMode('register'));
    }
    if (this.toggleText) {
      this.toggleText.addEventListener('click', () => {
        this.setMode(this.mode === 'login' ? 'register' : 'login');
      });
    }

    if (this.authForm) {
      this.authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this._handleSubmit();
      });
    }
  }

  setMode(mode) {
    this.mode = mode;
    window.audioManager.play('click', 0.4);

    if (mode === 'login') {
      if (this.tabLogin) this.tabLogin.classList.add('active');
      if (this.tabRegister) this.tabRegister.classList.remove('active');
      if (this.confirmGroup) this.confirmGroup.style.display = 'none';
      if (this.submitBtn) this.submitBtn.textContent = 'SIGN IN';
      if (this.toggleText) this.toggleText.textContent = "Don't have an account? Register now";
    } else {
      if (this.tabRegister) this.tabRegister.classList.add('active');
      if (this.tabLogin) this.tabLogin.classList.remove('active');
      if (this.confirmGroup) this.confirmGroup.style.display = 'block';
      if (this.submitBtn) this.submitBtn.textContent = 'CREATE ACCOUNT';
      if (this.toggleText) this.toggleText.textContent = 'Already have an account? Sign In';
    }
  }

  _handleSubmit() {
    const username = this.usernameInput.value.trim();
    const password = this.passwordInput.value;

    if (!username || username.length < 3) {
      window.uiManager.showToast('Username must be at least 3 characters.', 'error');
      window.audioManager.play('error', 0.5);
      return;
    }
    if (!password || password.length < 3) {
      window.uiManager.showToast('Password must be at least 3 characters.', 'error');
      window.audioManager.play('error', 0.5);
      return;
    }

    if (this.mode === 'register') {
      const confirm = this.confirmInput.value;
      if (password !== confirm) {
        window.uiManager.showToast('Passwords do not match.', 'error');
        window.audioManager.play('error', 0.5);
        return;
      }

      const res = window.storageManager.registerUser(username, password);
      if (res.success) {
        window.uiManager.showToast(res.message, 'success');
        window.audioManager.play('success', 0.6);
        this.setMode('login');
        this.passwordInput.value = '';
        this.confirmInput.value = '';
      } else {
        window.uiManager.showToast(res.message, 'error');
        window.audioManager.play('error', 0.5);
      }
    } else {
      const res = window.storageManager.verifyLogin(username, password);
      if (res.success) {
        window.uiManager.showToast(res.message, 'success');
        window.audioManager.play('success', 0.6);
        if (window.mainApp) {
          window.mainApp.onLoginSuccess(username);
        }
      } else {
        window.uiManager.showToast(res.message, 'error');
        window.audioManager.play('error', 0.5);
      }
    }
  }

  reset() {
    if (this.usernameInput) this.usernameInput.value = '';
    if (this.passwordInput) this.passwordInput.value = '';
    if (this.confirmInput) this.confirmInput.value = '';
    this.setMode('login');
  }
}

// Global Singleton Export
window.authController = new AuthController();
