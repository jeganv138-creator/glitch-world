/**
 * history.js
 * History Screen Controller for GLITCH WORLD.
 * Displays local run logs (Date, Time, Username, Level Reached, Victory/Defeat, Score, Coins, Enemies, Play Time).
 */

class HistoryController {
  constructor() {
    this.historyScreen = document.getElementById('history-screen');
    this.btnBack = document.getElementById('history-back-btn');
    this.btnClear = document.getElementById('history-clear-btn');
    this.searchInput = document.getElementById('history-search-input');
    this.tableBody = document.getElementById('history-table-body');
    this.emptyState = document.getElementById('history-empty-state');

    this._bindEvents();
  }

  _bindEvents() {
    if (this.btnBack) {
      this.btnBack.addEventListener('click', () => {
        window.audioManager.play('click', 0.5);
        if (window.mainApp) window.mainApp.showScreen('home');
      });
    }

    if (this.btnClear) {
      this.btnClear.addEventListener('click', () => {
        if (confirm('Clear all match history records?')) {
          window.storageManager.clearHistory();
          this.refresh();
          window.uiManager.showToast('History cleared.', 'info');
        }
      });
    }

    if (this.searchInput) {
      this.searchInput.addEventListener('input', () => {
        this.refresh();
      });
    }
  }

  refresh() {
    if (!this.tableBody) return;
    const query = this.searchInput ? this.searchInput.value.trim() : null;
    const history = window.storageManager.getHistory(query);

    this.tableBody.innerHTML = '';

    if (history.length === 0) {
      if (this.emptyState) this.emptyState.style.display = 'block';
      return;
    }

    if (this.emptyState) this.emptyState.style.display = 'none';

    for (let i = 0; i < history.length; i++) {
      const entry = history[i];
      const tr = document.createElement('tr');

      const isVictory = entry.result === 'Victory';
      const badgeClass = isVictory ? 'badge-victory' : 'badge-defeat';

      tr.innerHTML = `
        <td>${entry.date}</td>
        <td>${entry.time}</td>
        <td><strong>${entry.username}</strong></td>
        <td>${entry.levelReached}</td>
        <td class="${badgeClass}">${entry.result}</td>
        <td>${entry.score}</td>
        <td>${entry.coins}</td>
        <td>${entry.enemiesDefeated}</td>
        <td>${entry.timePlayed}</td>
      `;

      this.tableBody.appendChild(tr);
    }
  }
}

// Global Singleton Export
window.historyController = new HistoryController();
