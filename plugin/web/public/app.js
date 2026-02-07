// ClauDEX - Frontend SPA

const app = document.getElementById('app');
const navLinks = document.querySelectorAll('.nav-link');

// ── Global session filter ───────────────────────────────────────
let activeSessionFilter = null; // null = "All"
let knownSessions = [];        // populated by polling
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LETTER_CLASSES = ['a','b','c','d','e'];

function getSessionLabel() {
  if (!activeSessionFilter) return 'All';
  const idx = knownSessions.findIndex(s => s.id === activeSessionFilter);
  return idx >= 0 ? LETTERS[idx] : '?';
}

// Returns ?session=xxx query fragment (or empty string)
function sessionParam(prefix) {
  if (!activeSessionFilter) return '';
  const sep = prefix ? '&' : '?';
  return `${sep}session=${encodeURIComponent(activeSessionFilter)}`;
}

// ── Session picker UI ───────────────────────────────────────────
const pickerBtn = document.getElementById('session-picker-btn');
const pickerLabel = document.getElementById('session-picker-label');
const pickerDropdown = document.getElementById('session-picker-dropdown');

pickerBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  pickerDropdown.classList.toggle('open');
  if (pickerDropdown.classList.contains('open')) refreshSessionPicker();
});

document.addEventListener('click', () => {
  pickerDropdown.classList.remove('open');
});

pickerDropdown.addEventListener('click', (e) => {
  e.stopPropagation();
});

async function refreshSessionPicker() {
  const data = await api('/sessions/active');
  if (!data || !data.sessions) return;
  knownSessions = data.sessions;
  renderSessionPicker();
}

function renderSessionPicker() {
  const options = [
    `<button class="session-option ${!activeSessionFilter ? 'active' : ''}" data-session="">
      <span class="session-letter all">*</span>
      <div class="session-option-info">
        <div class="session-option-name">All Sessions</div>
        <div class="session-option-detail">Show everything</div>
      </div>
    </button>`
  ];

  knownSessions.forEach((s, i) => {
    const letter = LETTERS[i] || '?';
    const cls = LETTER_CLASSES[i % LETTER_CLASSES.length];
    const name = s.project_name || 'Session';
    const age = formatAge(s.started_at);
    const obs = s.observation_count || 0;
    const isActive = activeSessionFilter === s.id;

    options.push(`
      <button class="session-option ${isActive ? 'active' : ''}" data-session="${escapeHtml(s.id)}">
        <span class="session-letter ${cls}">${letter}</span>
        <div class="session-option-info">
          <div class="session-option-name">${escapeHtml(name)} — ${letter}</div>
          <div class="session-option-detail">${age} · ${obs} obs</div>
        </div>
        <span class="session-option-live" title="Active"></span>
      </button>
    `);
  });

  pickerDropdown.innerHTML = options.join('');

  // Bind click handlers
  pickerDropdown.querySelectorAll('.session-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const sid = opt.dataset.session;
      activeSessionFilter = sid || null;
      updatePickerButton();
      pickerDropdown.classList.remove('open');
      navigate(); // Re-render current view with new filter
    });
  });
}

function updatePickerButton() {
  const label = getSessionLabel();
  pickerLabel.textContent = label;
  pickerBtn.classList.toggle('has-filter', !!activeSessionFilter);
}

// Poll for active sessions every 15s
refreshSessionPicker();
setInterval(refreshSessionPicker, 15000);

// ── Theme toggle ────────────────────────────────────────────────
const themeToggle = document.getElementById('theme-toggle');
let theme = localStorage.getItem('claudex-theme') || 'dark';
document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : '');

themeToggle.addEventListener('click', () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('claudex-theme', theme);
  document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : '');
});

// ── Router with view transitions ────────────────────────────────
function getRoute() {
  const hash = window.location.hash || '#/';
  return hash.replace('#/', '') || 'dashboard';
}

async function navigate() {
  const route = getRoute();
  navLinks.forEach(link => {
    link.classList.toggle('active', link.dataset.route === route);
  });

  // Fade out current content
  app.style.opacity = '0';
  app.style.transform = 'translateY(6px)';

  await new Promise(r => setTimeout(r, 120));

  switch (route) {
    case 'dashboard':
      renderDashboard(app);
      break;
    case 'search':
      renderSearch(app);
      break;
    case 'timeline':
      renderTimeline(app);
      break;
    case 'knowledge':
      renderKnowledge(app);
      break;
    case 'settings':
      renderSettings(app);
      break;
    case 'help':
      renderHelp(app);
      break;
    default:
      renderDashboard(app);
  }

  // Fade in new content
  requestAnimationFrame(() => {
    app.style.opacity = '1';
    app.style.transform = 'translateY(0)';
  });
}

// Apply transition styles to #app
app.style.transition = 'opacity 0.2s ease, transform 0.2s ease';

window.addEventListener('hashchange', navigate);
navigate();

// ── API helper ──────────────────────────────────────────────────
async function api(path) {
  try {
    const res = await fetch(`/api${path}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('API error:', err);
    return null;
  }
}

function formatDate(isoOrMs) {
  const d = typeof isoOrMs === 'number' ? new Date(isoOrMs) : new Date(isoOrMs);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatAge(isoOrMs) {
  const ts = typeof isoOrMs === 'number' ? isoOrMs : new Date(isoOrMs).getTime();
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
