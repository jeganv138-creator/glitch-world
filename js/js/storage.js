/**
 * storage.js
 * Comprehensive LocalStorage and Session Manager for GLITCH WORLD.
 * Persists accounts, game progress, checkpoints, settings, run history, and achievements.
 */

class StorageManager {
  constructor() {
    this.STORAGE_KEY_USERS = 'glitch_world_users';
    this.STORAGE_KEY_SESSION = 'glitch_world_session';
    this.STORAGE_KEY_SETTINGS = 'glitch_world_settings';
    this.STORAGE_KEY_PROGRESS = 'glitch_world_progress';
    this.STORAGE_KEY_HISTORY = 'glitch_world_history';
    this.STORAGE_KEY_ACHIEVEMENTS = 'glitch_world_achievements';

    this._initDefaults();
  }

  _initDefaults() {
    // Ensure default demo account exists if storage is fresh
    const users = this.getUsers();
    if (Object.keys(users).length === 0) {
      this.registerUser('player', '1234');
      this.registerUser('rohith', 'admin');
      this.registerUser('sunruthi', 'admin');
    }
  }

  // --- Hashing Helper ---
  _hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return 'gw_hash_' + Math.abs(hash).toString(16);
  }

  // --- Authentication & User Store ---
  getUsers() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY_USERS);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.error('Storage error getting users:', e);
      return {};
    }
  }

  registerUser(username, password) {
    username = username.trim().toLowerCase();
    if (!username || username.length < 3) {
      return { success: false, message: 'Username must be at least 3 characters.' };
    }
    if (!password || password.length < 3) {
      return { success: false, message: 'Password must be at least 3 characters.' };
    }

    const users = this.getUsers();
    if (users[username]) {
      return { success: false, message: 'Username already taken.' };
    }

    users[username] = {
      username: username,
      passwordHash: this._hashPassword(password),
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(users));
    return { success: true, message: 'Account created successfully!' };
  }

  verifyLogin(username, password) {
    username = username.trim().toLowerCase();
    const users = this.getUsers();
    const user = users[username];

    if (!user) {
      return { success: false, message: 'User not found.' };
    }
    if (user.passwordHash !== this._hashPassword(password)) {
      return { success: false, message: 'Incorrect password.' };
    }

    this.setCurrentUser(username);
    return { success: true, message: 'Welcome back, ' + username + '!' };
  }

  getCurrentUser() {
    return localStorage.getItem(this.STORAGE_KEY_SESSION) || 'player';
  }

  setCurrentUser(username) {
    localStorage.setItem(this.STORAGE_KEY_SESSION, username);
  }

  logout() {
    localStorage.removeItem(this.STORAGE_KEY_SESSION);
  }

  // --- Settings Store ---
  getSettings(username = this.getCurrentUser()) {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY_SETTINGS);
      const allSettings = raw ? JSON.parse(raw) : {};
      return allSettings[username] || {
        soundOn: true,
        musicOn: true,
        vibrationOn: true,
        volume: 0.7,
        brightness: 1.0,
        mobileControls: false,
      };
    } catch (e) {
      return { soundOn: true, musicOn: true, vibrationOn: true, volume: 0.7, brightness: 1.0, mobileControls: false };
    }
  }

  saveSettings(settings, username = this.getCurrentUser()) {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY_SETTINGS);
      const allSettings = raw ? JSON.parse(raw) : {};
      allSettings[username] = { ...this.getSettings(username), ...settings };
      localStorage.setItem(this.STORAGE_KEY_SETTINGS, JSON.stringify(allSettings));
    } catch (e) {
      console.error('Storage error saving settings:', e);
    }
  }

  // --- Level Progress & Checkpoints ---
  getProgress(username = this.getCurrentUser()) {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY_PROGRESS);
      const allProgress = raw ? JSON.parse(raw) : {};
      return allProgress[username] || {
        unlockedLevels: [1],
        highestLevelCompleted: 0,
        checkpoint: null,
        scores: { 1: 0, 2: 0, 3: 0 },
        coins: { 1: 0, 2: 0, 3: 0 }
      };
    } catch (e) {
      return { unlockedLevels: [1], highestLevelCompleted: 0, checkpoint: null, scores: {}, coins: {} };
    }
  }

  saveProgress(progress, username = this.getCurrentUser()) {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY_PROGRESS);
      const allProgress = raw ? JSON.parse(raw) : {};
      allProgress[username] = { ...this.getProgress(username), ...progress };
      localStorage.setItem(this.STORAGE_KEY_PROGRESS, JSON.stringify(allProgress));
    } catch (e) {
      console.error('Storage error saving progress:', e);
    }
  }

  unlockLevel(levelNumber, username = this.getCurrentUser()) {
    const prog = this.getProgress(username);
    if (!prog.unlockedLevels.includes(levelNumber)) {
      prog.unlockedLevels.push(levelNumber);
      prog.unlockedLevels.sort((a, b) => a - b);
    }
    prog.highestLevelCompleted = Math.max(prog.highestLevelCompleted, levelNumber - 1);
    this.saveProgress(prog, username);
  }

  saveCheckpoint(levelIndex, pos, stats, username = this.getCurrentUser()) {
    const prog = this.getProgress(username);
    prog.checkpoint = {
      level: levelIndex,
      x: pos.x,
      y: pos.y,
      health: stats.health,
      armor: stats.armor,
      ammo: stats.ammo,
      coins: stats.coins,
      score: stats.score,
      timestamp: Date.now()
    };
    this.saveProgress(prog, username);
  }

  clearCheckpoint(username = this.getCurrentUser()) {
    const prog = this.getProgress(username);
    prog.checkpoint = null;
    this.saveProgress(prog, username);
  }

  // --- Run History Log ---
  getHistory(filterUser = null) {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY_HISTORY);
      let history = raw ? JSON.parse(raw) : [];
      if (filterUser) {
        history = history.filter(h => h.username.toLowerCase() === filterUser.toLowerCase());
      }
      return history.sort((a, b) => b.timestamp - a.timestamp);
    } catch (e) {
      return [];
    }
  }

  addHistoryEntry(entry) {
    try {
      const history = this.getHistory();
      const now = new Date();
      const newEntry = {
        id: 'run_' + Date.now(),
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        timestamp: now.getTime(),
        username: entry.username || this.getCurrentUser(),
        levelReached: entry.levelReached || 'Level 1',
        result: entry.result || 'Defeat',
        score: entry.score || 0,
        coins: entry.coins || 0,
        enemiesDefeated: entry.enemiesDefeated || 0,
        timePlayed: entry.timePlayed || '00:00'
      };
      history.unshift(newEntry);
      // Keep up to 200 history entries
      if (history.length > 200) history.pop();
      localStorage.setItem(this.STORAGE_KEY_HISTORY, JSON.stringify(history));
    } catch (e) {
      console.error('Storage error adding history:', e);
    }
  }

  clearHistory(username = null) {
    try {
      if (username) {
        const history = this.getHistory().filter(h => h.username.toLowerCase() !== username.toLowerCase());
        localStorage.setItem(this.STORAGE_KEY_HISTORY, JSON.stringify(history));
      } else {
        localStorage.removeItem(this.STORAGE_KEY_HISTORY);
      }
    } catch (e) {
      console.error('Storage error clearing history:', e);
    }
  }

  // --- Achievements ---
  getAchievements(username = this.getCurrentUser()) {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY_ACHIEVEMENTS);
      const all = raw ? JSON.parse(raw) : {};
      return all[username] || [];
    } catch (e) {
      return [];
    }
  }

  unlockAchievement(id, username = this.getCurrentUser()) {
    const list = this.getAchievements(username);
    if (!list.includes(id)) {
      list.push(id);
      const raw = localStorage.getItem(this.STORAGE_KEY_ACHIEVEMENTS);
      const all = raw ? JSON.parse(raw) : {};
      all[username] = list;
      localStorage.setItem(this.STORAGE_KEY_ACHIEVEMENTS, JSON.stringify(all));
      return true; // Newly unlocked
    }
    return false;
  }
}

// Global Singleton Export
window.storageManager = new StorageManager();
