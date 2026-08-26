/**
 * about.js
 * About Screen Controller for GLITCH WORLD.
 * Displays credits for ROHITH & SUNRUTHI, game description, and interactive controls/features tabs.
 */

class AboutController {
  constructor() {
    this.aboutScreen = document.getElementById('about-screen');
    this.btnBack = document.getElementById('about-back-btn');
    this.tabFeatures = document.getElementById('about-tab-features');
    this.tabControls = document.getElementById('about-tab-controls');

    this.featuresPanel = document.getElementById('about-features-panel');
    this.controlsPanel = document.getElementById('about-controls-panel');

    this._bindEvents();
  }

  _bindEvents() {
    if (this.btnBack) {
      this.btnBack.addEventListener('click', () => {
        window.audioManager.play('click', 0.5);
        if (window.mainApp) window.mainApp.showScreen('home');
      });
    }

    if (this.tabFeatures) {
      this.tabFeatures.addEventListener('click', () => this.setTab('features'));
    }

    if (this.tabControls) {
      this.tabControls.addEventListener('click', () => this.setTab('controls'));
    }
  }

  setTab(tab) {
    window.audioManager.play('click', 0.4);
    if (tab === 'features') {
      if (this.tabFeatures) this.tabFeatures.classList.add('active');
      if (this.tabControls) this.tabControls.classList.remove('active');
      if (this.featuresPanel) this.featuresPanel.style.display = 'block';
      if (this.controlsPanel) this.controlsPanel.style.display = 'none';
    } else {
      if (this.tabControls) this.tabControls.classList.add('active');
      if (this.tabFeatures) this.tabFeatures.classList.remove('active');
      if (this.controlsPanel) this.controlsPanel.style.display = 'block';
      if (this.featuresPanel) this.featuresPanel.style.display = 'none';
    }
  }
}

// Global Singleton Export
window.aboutController = new AboutController();
