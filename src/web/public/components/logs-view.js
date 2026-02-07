/**
 * Logs View - Live log viewer with auto-refresh
 */

let logsRefreshInterval = null;
let isAutoscrollEnabled = true;

async function renderLogsView() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="container">
      <div class="page-header">
        <div>
          <h1>System Logs</h1>
          <p class="subtitle">Real-time view of Engram's internal operations</p>
        </div>
        <div class="logs-controls">
          <button id="refresh-logs-btn" class="btn btn-secondary" title="Refresh now">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M14 8A6 6 0 1 1 8 2c1.5 0 2.9.6 4 1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M14 2v4h-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Refresh
          </button>
          <label class="toggle-label">
            <input type="checkbox" id="autoscroll-toggle" checked>
            <span>Auto-scroll</span>
          </label>
          <label class="toggle-label">
            <input type="checkbox" id="autorefresh-toggle" checked>
            <span>Auto-refresh (5s)</span>
          </label>
        </div>
      </div>

      <div class="logs-container">
        <div id="logs-loading" class="loading-state">
          <div class="spinner"></div>
          <p>Loading logs...</p>
        </div>
        <div id="logs-content" class="logs-content" style="display: none;"></div>
        <div id="logs-error" class="error-state" style="display: none;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
            <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <p id="logs-error-message">Failed to load logs</p>
        </div>
      </div>
    </div>
  `;

  // Setup event listeners
  document.getElementById('refresh-logs-btn').onclick = () => fetchLogs();

  document.getElementById('autoscroll-toggle').onchange = (e) => {
    isAutoscrollEnabled = e.target.checked;
  };

  document.getElementById('autorefresh-toggle').onchange = (e) => {
    if (e.target.checked) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }
  };

  // Initial fetch
  await fetchLogs();

  // Start auto-refresh
  startAutoRefresh();
}

async function fetchLogs() {
  const loading = document.getElementById('logs-loading');
  const content = document.getElementById('logs-content');
  const error = document.getElementById('logs-error');
  const errorMessage = document.getElementById('logs-error-message');

  try {
    const response = await fetch('/api/logs');

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    loading.style.display = 'none';
    error.style.display = 'none';
    content.style.display = 'block';

    if (!data.logs || data.logs.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <p>No logs available yet</p>
          <small>Logs will appear here as Engram runs</small>
        </div>
      `;
      return;
    }

    // Render logs
    content.innerHTML = data.logs.map(log => renderLogEntry(log)).join('');

    // Auto-scroll to bottom if enabled
    if (isAutoscrollEnabled) {
      content.scrollTop = content.scrollHeight;
    }

    // Update timestamp
    const now = new Date().toLocaleTimeString();
    document.querySelector('.subtitle').textContent = `Last updated: ${now} • ${data.count} entries`;

  } catch (err) {
    loading.style.display = 'none';
    content.style.display = 'none';
    error.style.display = 'flex';
    errorMessage.textContent = err.message;
  }
}

function renderLogEntry(log) {
  // Parse log entry if it's a string
  const entry = typeof log === 'string' ? parseLogLine(log) : log;

  const levelClass = `log-level-${entry.level || 'info'}`;
  const timestamp = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : '';
  const component = entry.component || entry.module || '';
  const message = entry.message || entry.msg || String(log);

  return `
    <div class="log-entry ${levelClass}">
      <span class="log-time">${timestamp}</span>
      <span class="log-level">${(entry.level || 'INFO').toUpperCase()}</span>
      ${component ? `<span class="log-component">${component}</span>` : ''}
      <span class="log-message">${escapeHtml(message)}</span>
      ${entry.data ? `<span class="log-data">${escapeHtml(JSON.stringify(entry.data))}</span>` : ''}
    </div>
  `;
}

function parseLogLine(line) {
  // Try to parse structured log: [timestamp] [LEVEL] [component] message
  const match = line.match(/\[(.*?)\]\s*\[(.*?)\]\s*\[(.*?)\]\s*(.*)/);
  if (match) {
    return {
      timestamp: match[1],
      level: match[2].toLowerCase(),
      component: match[3],
      message: match[4],
    };
  }

  // Fallback: treat as plain message
  return {
    level: 'info',
    message: line,
    timestamp: new Date().toISOString(),
  };
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function startAutoRefresh() {
  if (logsRefreshInterval) {
    clearInterval(logsRefreshInterval);
  }
  logsRefreshInterval = setInterval(() => {
    fetchLogs();
  }, 5000); // Refresh every 5 seconds
}

function stopAutoRefresh() {
  if (logsRefreshInterval) {
    clearInterval(logsRefreshInterval);
    logsRefreshInterval = null;
  }
}

// Cleanup on route change
window.addEventListener('hashchange', () => {
  if (!window.location.hash.includes('logs')) {
    stopAutoRefresh();
  }
});
