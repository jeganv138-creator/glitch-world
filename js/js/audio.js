/**
 * audio.js
 * High-performance Audio Engine for GLITCH WORLD.
 * Integrates real audio files from assets/sounds/ with a Web Audio API procedural synthesizer fallback.
 */

class AudioManager {
  constructor() {
    this.ctx = null;
    this.soundOn = true;
    this.musicOn = true;
    this.masterVolume = 0.7;

    this.currentMusicKey = null;
    this.currentMusicAudio = null;
    this.sfxCache = {};
    this.musicCache = {};

    this.soundFiles = {
      // Music
      'menu_music': 'assets/sounds/menu_music.mp3',
      'level1_music': 'assets/sounds/level1_music.mp3',
      'level2_music': 'assets/sounds/level2_music.mp3',
      'level3_music': 'assets/sounds/level3_music.mp3',
      'boss_music': 'assets/sounds/boss_music.mp3',
      'victory': 'assets/sounds/victory.mp3',
      'game_over': 'assets/sounds/game_over.mp3',

      // Sound Effects
      'click': 'assets/sounds/button_click.wav',
      'button_click': 'assets/sounds/button_click.wav',
      'jump': 'assets/sounds/jump.wav',
      'double_jump': 'assets/sounds/jump.wav',
      'footstep': 'assets/sounds/footstep.wav',
      'shoot': 'assets/sounds/gunshot.wav',
      'gunshot': 'assets/sounds/gunshot.wav',
      'reload': 'assets/sounds/reload.wav',
      'explosion': 'assets/sounds/explosion.wav',
      'coin': 'assets/sounds/coin.wav',
      'enemy_hit': 'assets/sounds/enemy_hit.wav',
      'player_hurt': 'assets/sounds/player_hurt.wav',
      'hurt': 'assets/sounds/player_hurt.wav',
      'key_collect': 'assets/sounds/key_collect.wav',
      'key_pickup': 'assets/sounds/key_collect.wav',
      'door_open': 'assets/sounds/door_open.wav',
      'door_unlock': 'assets/sounds/door_open.wav',
      'success': 'assets/sounds/key_collect.wav',
      'death': 'assets/sounds/explosion.wav',
      'hover': 'assets/sounds/button_click.wav',
      'error': 'assets/sounds/player_hurt.wav',
      'glitch': 'assets/sounds/reload.wav',
      'glitch_activate': 'assets/sounds/reload.wav'
    };

    this._initContext();
    this._preloadAudio();
  }

  _initContext() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      this.ctx = new AudioContext();
    }
  }

  _resumeContext() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  _preloadAudio() {
    // Pre-create Audio elements for reliable streaming & low latency
    for (const [key, path] of Object.entries(this.soundFiles)) {
      try {
        const audio = new Audio();
        audio.src = path;
        audio.preload = 'auto';
        if (key.includes('music') || key === 'victory' || key === 'game_over') {
          this.musicCache[key] = audio;
        } else {
          this.sfxCache[key] = audio;
        }
      } catch (e) {
        console.warn(`Audio preload warning for ${key}:`, e);
      }
    }
  }

  updateSettings(settings) {
    if (settings.soundOn !== undefined) this.soundOn = settings.soundOn;
    if (settings.musicOn !== undefined) {
      this.musicOn = settings.musicOn;
      if (!this.musicOn && this.currentMusicAudio) {
        this.currentMusicAudio.pause();
      } else if (this.musicOn && this.currentMusicAudio) {
        this.currentMusicAudio.play().catch(() => {});
      }
    }
    if (settings.volume !== undefined) {
      this.masterVolume = Math.max(0, Math.min(1, settings.volume));
      if (this.currentMusicAudio) {
        this.currentMusicAudio.volume = this.masterVolume * 0.7;
      }
    }
  }

  playMusic(key, loop = true) {
    this._resumeContext();
    if (!this.musicOn) {
      this.currentMusicKey = key;
      return;
    }

    if (this.currentMusicKey === key && this.currentMusicAudio && !this.currentMusicAudio.paused) {
      return; // Already playing
    }

    // Stop previous music
    if (this.currentMusicAudio) {
      this.currentMusicAudio.pause();
      this.currentMusicAudio.currentTime = 0;
    }

    this.currentMusicKey = key;
    let audio = this.musicCache[key];
    if (!audio) {
      audio = new Audio(this.soundFiles[key] || `assets/sounds/${key}.mp3`);
      this.musicCache[key] = audio;
    }

    audio.loop = loop;
    audio.volume = this.masterVolume * 0.7;
    this.currentMusicAudio = audio;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay policy fallback: will resume on next user gesture
      });
    }
  }

  stopMusic() {
    if (this.currentMusicAudio) {
      this.currentMusicAudio.pause();
      this.currentMusicAudio.currentTime = 0;
      this.currentMusicKey = null;
    }
  }

  play(key, vol = 1.0) {
    if (!this.soundOn) return;
    this._resumeContext();

    const finalVol = Math.max(0, Math.min(1, this.masterVolume * vol));
    const path = this.soundFiles[key];

    let playedFile = false;
    if (path) {
      try {
        const sound = new Audio(path);
        sound.volume = finalVol;
        const p = sound.play();
        if (p !== undefined) {
          p.then(() => { playedFile = true; }).catch(() => {
            this.synthesizeSfx(key, finalVol);
          });
        }
      } catch (e) {
        this.synthesizeSfx(key, finalVol);
      }
    } else {
      this.synthesizeSfx(key, finalVol);
    }
  }

  // --- Web Audio API Procedural Synthesizer Fallback ---
  synthesizeSfx(type, volume = 0.5) {
    if (!this.soundOn || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      gain.connect(this.ctx.destination);
      gain.gain.value = volume;

      if (type === 'jump' || type === 'double_jump') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(450, now + 0.15);
        gain.gain.setValueAtTime(volume * 0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === 'shoot' || type === 'gunshot') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
        gain.gain.setValueAtTime(volume * 0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'coin') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, now); // B5
        osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6
        gain.gain.setValueAtTime(volume * 0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'explosion') {
        this._playNoise(0.4, volume * 0.9);
      } else if (type === 'player_hurt' || type === 'hurt' || type === 'enemy_hit') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);
        gain.gain.setValueAtTime(volume * 0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.16);
      } else if (type === 'key_collect' || type === 'door_open' || type === 'success') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.1);
        osc.frequency.setValueAtTime(783.99, now + 0.2);
        gain.gain.setValueAtTime(volume * 0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === 'glitch' || type === 'glitch_activate') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.linearRampToValueAtTime(1200, now + 0.05);
        osc.frequency.linearRampToValueAtTime(300, now + 0.15);
        gain.gain.setValueAtTime(volume * 0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'footstep') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.05);
        gain.gain.setValueAtTime(volume * 0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.06);
      } else {
        // Generic click
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(volume * 0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.04);
      }
    } catch (e) {
      // Audio synth error ignored
    }
  }

  _playNoise(duration = 0.3, volume = 0.5) {
    if (!this.ctx) return;
    try {
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + duration);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      whiteNoise.start(this.ctx.currentTime);
    } catch (e) {}
  }
}

// Global Singleton Export
window.audioManager = new AudioManager();
