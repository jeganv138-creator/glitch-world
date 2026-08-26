/**
 * settings.js
 * Settings Screen Controller for GLITCH WORLD.
 * Manages Sound, Music, Volume, Vibration, Mobile Controls, and local persistence.
 */

class SettingsController {
  constructor() {
    this.settingsScreen = document.getElementById('settings-screen');
    this.btnBack = document.getElementById('settings-back-btn');

    this.toggleSound = document.getElementById('setting-sound');
    this.toggleMusic = document.getElementById('setting-music');
    this.toggleVibration = document.getElementById('setting-vibration');
    this.toggleMobileControls = document.getElementById('setting-mobile-controls');

    this.sliderVolume = document.getElementById('setting-volume');
    this.volumeVal = document.getElementById('setting-volume-val');
    this.btnClearData = document.getElementById('settings-clear-data-btn');

    this._bindEvents();
  }

  _bindEvents() {
    if (this.btnBack) {
      this.btnBack.addEventListener('click', () => {
        window.audioManager.play('click', 0.5);
        if (window.mainApp) window.mainApp.showScreen('home');
      });
    }

    if (this.toggleSound) {
      this.toggleSound.addEventListener('change', () => {
        this._save();
      });
    }

    if (this.toggleMusic) {
      this.toggleMusic.addEventListener('change', () => {
        this._save();
      });
    }

    if (this.toggleVibration) {
      this.toggleVibration.addEventListener('change', () => {
        this._save();
      });
    }

    if (this.toggleMobileControls) {
      this.toggleMobileControls.addEventListener('change', () => {
        this._save();
      });
    }

    if (this.sliderVolume) {
      this.sliderVolume.addEventListener('input', () => {
        const val = Math.round(this.sliderVolume.value);
        if (this.volumeVal) this.volumeVal.textContent = `${val}%`;
        this._save();
      });
    }

    if (this.btnClearData) {
      this.btnClearData.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all game progression and local data?')) {
          localStorage.clear();
          window.uiManager.showToast('All local data cleared.', 'info');
          setTimeout(() => location.reload(), 800);
        }
      });
    }
  }

  load() {
    const s = window.storageManager.getSettings();
    if (this.toggleSound) this.toggleSound.checked = s.soundOn;
    if (this.toggleMusic) this.toggleMusic.checked = s.musicOn;
    if (this.toggleVibration) this.toggleVibration.checked = s.vibrationOn;
    if (this.toggleMobileControls) this.toggleMobileControls.checked = s.mobileControls;

    const volPct = Math.round(s.volume * 100);
    if (this.sliderVolume) this.sliderVolume.value = volPct;
    if (this.volumeVal) this.volumeVal.textContent = `${volPct}%`;

    window.audioManager.updateSettings({
      soundOn: s.soundOn,
      musicOn: s.musicOn,
      volume: s.volume
    });
  }

  _save() {
    const soundOn = this.toggleSound ? this.toggleSound.checked : true;
    const musicOn = this.toggleMusic ? this.toggleMusic.checked : true;
    const vibrationOn = this.toggleVibration ? this.toggleVibration.checked : true;
    const mobileControls = this.toggleMobileControls ? this.toggleMobileControls.checked : false;
    const volume = this.sliderVolume ? parseInt(this.sliderVolume.value, 10) / 100 : 0.7;

    const settings = { soundOn, musicOn, vibrationOn, mobileControls, volume };
    window.storageManager.saveSettings(settings);
    window.audioManager.updateSettings(settings);

    // Toggle Mobile Controls Overlay
    const mobileOverlay = document.getElementById('mobile-controls');
    if (mobileOverlay) {
      if (mobileControls || ('ontouchstart' in window && window.innerWidth < 1024)) {
        mobileOverlay.classList.add('active');
        mobileOverlay.style.display = 'flex';
      } else {
        mobileOverlay.classList.remove('active');
        mobileOverlay.style.display = 'none';
      }
    }
  }
}

// Global Singleton Export
window.settingsController = new SettingsController();
