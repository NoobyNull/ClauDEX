// ═══════════════════════════════════════════════════════════════════
// Engram Interactive Timeline — Observatory Chrono-Rail
// ═══════════════════════════════════════════════════════════════════

const TL_STYLE_ID = 'engram-timeline-styles';

function injectTimelineStyles() {
  if (document.getElementById(TL_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = TL_STYLE_ID;
  style.textContent = `
    /* ── Timeline Container ──────────────────────────── */
    .tl-wrap {
      position: relative;
      min-height: 400px;
    }

    /* ── Top Controls Bar ────────────────────────────── */
    .tl-controls {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 28px;
      flex-wrap: wrap;
    }

    .tl-zoom-group {
      display: flex;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
    }

    .tl-zoom-btn {
      background: none;
      border: none;
      padding: 7px 16px;
      font-size: 12px;
      font-weight: 600;
      font-family: var(--font);
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      border-right: 1px solid var(--border);
      letter-spacing: 0.03em;
    }

    .tl-zoom-btn:last-child { border-right: none; }
    .tl-zoom-btn:hover { color: var(--text); background: var(--bg-elevated); }

    .tl-zoom-btn.active {
      background: var(--accent);
      color: #fff;
      box-shadow: inset 0 1px 2px rgba(0,0,0,0.15);
    }

    .tl-session-count {
      font-size: 12px;
      color: var(--text-tertiary);
      font-family: var(--font-mono);
      margin-left: auto;
    }

    .tl-jump-today {
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 6px 12px;
      font-size: 11px;
      font-weight: 600;
      font-family: var(--font);
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .tl-jump-today:hover {
      color: var(--accent);
      border-color: var(--accent);
      background: var(--accent-subtle);
    }

    /* ── Chrono-Rail (vertical axis) ─────────────────── */
    .tl-rail {
      position: relative;
      padding-left: 48px;
    }

    .tl-rail::before {
      content: '';
      position: absolute;
      left: 19px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: linear-gradient(
        180deg,
        var(--accent) 0%,
        var(--border-strong) 20%,
        var(--border-strong) 80%,
        transparent 100%
      );
      border-radius: 1px;
    }

    /* ── Day / Week / Month Group Headers ────────────── */
    .tl-group {
      position: relative;
      margin-bottom: 8px;
    }

    .tl-group-header {
      position: relative;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 0;
      margin-bottom: 4px;
      cursor: default;
    }

    .tl-group-dot {
      position: absolute;
      left: -48px;
      top: 50%;
      transform: translate(10px, -50%);
      width: 20px;
      height: 20px;
      background: var(--bg-secondary);
      border: 2px solid var(--accent);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
      box-shadow: 0 0 0 4px var(--bg), 0 0 12px rgba(242, 101, 34, 0.15);
    }

    .tl-group-dot-inner {
      width: 6px;
      height: 6px;
      background: var(--accent);
      border-radius: 50%;
    }

    .tl-group-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--text-tertiary);
      background: var(--bg);
      padding-right: 12px;
    }

    .tl-group-line {
      flex: 1;
      height: 1px;
      background: var(--border);
    }

    .tl-group-count {
      font-size: 11px;
      color: var(--text-tertiary);
      font-family: var(--font-mono);
    }

    /* ── Session Node ────────────────────────────────── */
    .tl-session {
      position: relative;
      margin-bottom: 6px;
      animation: tl-slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    @keyframes tl-slideIn {
      from { opacity: 0; transform: translateX(-12px); }
      to { opacity: 1; transform: translateX(0); }
    }

    .tl-session-node {
      position: absolute;
      left: -48px;
      top: 18px;
      transform: translateX(14px);
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--bg-tertiary);
      border: 2px solid var(--border-strong);
      z-index: 2;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
      box-shadow: 0 0 0 3px var(--bg);
    }

    .tl-session:hover .tl-session-node,
    .tl-session.expanded .tl-session-node {
      background: var(--accent);
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--bg), 0 0 10px rgba(242, 101, 34, 0.3);
      transform: translateX(14px) scale(1.2);
    }

    .tl-session-card {
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 16px 20px;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: var(--shadow-sm);
      position: relative;
      overflow: hidden;
    }

    .tl-session-card::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: var(--accent);
      opacity: 0;
      transition: opacity 0.25s ease;
      border-radius: 3px 0 0 3px;
    }

    .tl-session:hover .tl-session-card,
    .tl-session.expanded .tl-session-card {
      border-color: var(--border-strong);
      box-shadow: var(--shadow);
    }

    .tl-session.expanded .tl-session-card::before { opacity: 1; }

    .tl-session-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }

    .tl-session-info { flex: 1; min-width: 0; }

    .tl-session-time {
      font-size: 11px;
      font-family: var(--font-mono);
      color: var(--text-tertiary);
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .tl-session-duration {
      font-size: 10px;
      padding: 1px 6px;
      background: var(--bg-tertiary);
      border-radius: 3px;
      color: var(--text-tertiary);
    }

    .tl-session-live {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--success);
      animation: pulse 2s infinite;
    }

    .tl-session-summary {
      font-size: 14px;
      color: var(--text);
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .tl-session-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 6px;
      flex-shrink: 0;
    }

    .tl-obs-badge {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 600;
      color: var(--accent);
      background: var(--accent-subtle);
      padding: 3px 10px;
      border-radius: 12px;
      font-family: var(--font-mono);
    }

    .tl-obs-badge svg {
      width: 12px;
      height: 12px;
      opacity: 0.8;
    }

    .tl-session-files {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 8px;
    }

    .tl-file-chip {
      font-size: 10px;
      padding: 2px 7px;
      background: var(--bg-tertiary);
      border-radius: 3px;
      color: var(--text-tertiary);
      font-family: var(--font-mono);
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* ── Expand chevron ──────────────────────────────── */
    .tl-chevron {
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      color: var(--text-tertiary);
      flex-shrink: 0;
    }

    .tl-session.expanded .tl-chevron { transform: rotate(180deg); color: var(--accent); }

    /* ── Observation Mini-Timeline ────────────────────── */
    .tl-observations {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.45s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
      opacity: 0;
    }

    .tl-session.expanded .tl-observations {
      opacity: 1;
    }

    .tl-obs-list {
      padding: 16px 0 4px;
      border-top: 1px solid var(--border);
      margin-top: 14px;
      position: relative;
    }

    .tl-obs-list::before {
      content: '';
      position: absolute;
      left: 8px;
      top: 16px;
      bottom: 4px;
      width: 1px;
      background: linear-gradient(180deg, var(--border-strong), transparent);
    }

    .tl-obs-item {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 8px 0 8px 0;
      cursor: pointer;
      border-radius: var(--radius-sm);
      transition: background 0.15s ease;
      position: relative;
      padding-left: 28px;
    }

    .tl-obs-item:hover { background: var(--accent-glow); }

    .tl-obs-dot {
      position: absolute;
      left: 4px;
      top: 14px;
      width: 9px;
      height: 9px;
      border-radius: 50%;
      border: 2px solid var(--border-strong);
      background: var(--bg-elevated);
      z-index: 1;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .tl-obs-item:hover .tl-obs-dot {
      border-color: var(--accent);
      background: var(--accent);
      box-shadow: 0 0 6px rgba(242, 101, 34, 0.4);
    }

    .tl-obs-time {
      font-size: 10px;
      color: var(--text-tertiary);
      font-family: var(--font-mono);
      min-width: 52px;
      padding-top: 2px;
    }

    .tl-obs-body { flex: 1; min-width: 0; }

    .tl-obs-tool {
      font-size: 12px;
      font-weight: 600;
      color: var(--accent);
      margin-bottom: 2px;
    }

    .tl-obs-summary {
      font-size: 12px;
      color: var(--text-secondary);
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .tl-obs-files {
      display: flex;
      gap: 4px;
      margin-top: 4px;
      flex-wrap: wrap;
    }

    /* ── Detail Panel (slide-in) ─────────────────────── */
    .tl-detail-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.25s ease;
      pointer-events: none;
    }

    .tl-detail-overlay.open {
      opacity: 1;
      pointer-events: all;
    }

    .tl-detail-panel {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: min(520px, 90vw);
      background: var(--bg-secondary);
      border-left: 1px solid var(--border);
      box-shadow: -8px 0 32px rgba(0, 0, 0, 0.3);
      z-index: 1001;
      transform: translateX(100%);
      transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .tl-detail-panel.open { transform: translateX(0); }

    .tl-detail-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid var(--border);
      background: var(--bg-elevated);
      flex-shrink: 0;
    }

    .tl-detail-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .tl-detail-close {
      background: none;
      border: 1px solid var(--border);
      color: var(--text-secondary);
      width: 32px;
      height: 32px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .tl-detail-close:hover {
      background: var(--bg-tertiary);
      color: var(--text);
      border-color: var(--border-strong);
    }

    .tl-detail-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }

    .tl-detail-section {
      margin-bottom: 24px;
    }

    .tl-detail-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--text-tertiary);
      margin-bottom: 8px;
    }

    .tl-detail-value {
      font-size: 14px;
      color: var(--text);
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .tl-detail-value.mono {
      font-family: var(--font-mono);
      font-size: 12px;
      background: var(--bg-tertiary);
      padding: 12px 16px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
    }

    .tl-detail-meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .tl-detail-meta-item { }

    .tl-detail-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    /* ── Load More ────────────────────────────────────── */
    .tl-load-more {
      text-align: center;
      padding: 24px 0;
    }

    .tl-load-btn {
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 10px 28px;
      font-size: 13px;
      font-weight: 600;
      font-family: var(--font);
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .tl-load-btn:hover {
      color: var(--text);
      border-color: var(--accent);
      background: var(--accent-subtle);
    }

    .tl-load-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    /* ── Empty State ─────────────────────────────────── */
    .tl-empty {
      text-align: center;
      padding: 80px 24px;
      color: var(--text-tertiary);
    }

    .tl-empty-icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 16px;
      opacity: 0.2;
    }

    .tl-empty-text { font-size: 14px; }

    /* ── Keyboard focus ──────────────────────────────── */
    .tl-session-card:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }

    .tl-obs-item:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: -2px;
      border-radius: var(--radius-sm);
    }

    /* ── Responsive ──────────────────────────────────── */
    @media (max-width: 640px) {
      .tl-rail { padding-left: 32px; }
      .tl-rail::before { left: 11px; }
      .tl-group-dot { left: -32px; transform: translate(6px, -50%); width: 16px; height: 16px; }
      .tl-group-dot-inner { width: 4px; height: 4px; }
      .tl-session-node { left: -32px; transform: translateX(8px); width: 10px; height: 10px; }
      .tl-session:hover .tl-session-node,
      .tl-session.expanded .tl-session-node { transform: translateX(8px) scale(1.2); }
      .tl-session-card { padding: 12px 14px; }
      .tl-detail-panel { width: 100vw; }
      .tl-detail-meta-grid { grid-template-columns: 1fr; }
      .tl-session-files { display: none; }
    }
  `;
  document.head.appendChild(style);
}

// ── Data & State ──────────────────────────────────────────────────
let tlSessions = [];
let tlExpanded = new Set();
let tlSessionDetails = {}; // cached fetched session details
let tlZoom = 'day'; // 'day' | 'week' | 'month'
let tlLimit = 30;
let tlHasMore = true;
let tlDetailObs = null; // currently shown observation in detail panel

// ── Main Render ───────────────────────────────────────────────────
async function renderTimeline(container) {
  injectTimelineStyles();

  container.innerHTML = '<div class="loading">Loading timeline...</div>';

  // Fetch sessions
  if (activeSessionFilter) {
    const s = await api(`/sessions/${encodeURIComponent(activeSessionFilter)}`);
    tlSessions = s ? [s] : [];
    tlHasMore = false;
  } else {
    const data = await api(`/sessions?limit=${tlLimit}`);
    tlSessions = (data && data.sessions) ? data.sessions : [];
    tlHasMore = tlSessions.length >= tlLimit;
  }

  if (tlSessions.length === 0) {
    container.innerHTML = renderEmptyState();
    return;
  }

  renderTimelineDOM(container);
}

// ── Empty State ───────────────────────────────────────────────────
function renderEmptyState() {
  return `
    <h2 class="page-title">Timeline</h2>
    <div class="tl-empty">
      <svg class="tl-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
      <div class="tl-empty-text">No sessions recorded yet</div>
    </div>
  `;
}

// ── Full DOM Build ────────────────────────────────────────────────
function renderTimelineDOM(container) {
  const filterLabel = activeSessionFilter
    ? `<span style="color: var(--accent); font-size: 14px; font-weight: 500;"> — Session ${getSessionLabel()}</span>`
    : '';

  const groups = groupSessions(tlSessions, tlZoom);

  container.innerHTML = `
    <h2 class="page-title">Timeline${filterLabel}</h2>

    <div class="tl-controls">
      <div class="tl-zoom-group">
        <button class="tl-zoom-btn ${tlZoom === 'day' ? 'active' : ''}" data-zoom="day">Day</button>
        <button class="tl-zoom-btn ${tlZoom === 'week' ? 'active' : ''}" data-zoom="week">Week</button>
        <button class="tl-zoom-btn ${tlZoom === 'month' ? 'active' : ''}" data-zoom="month">Month</button>
      </div>
      <button class="tl-jump-today" id="tl-jump-today">Today</button>
      <span class="tl-session-count">${tlSessions.length} session${tlSessions.length !== 1 ? 's' : ''}</span>
    </div>

    <div class="tl-wrap">
      <div class="tl-rail" id="tl-rail">
        ${groups.map((g, gi) => renderGroup(g, gi)).join('')}
      </div>

      ${tlHasMore ? `
        <div class="tl-load-more">
          <button class="tl-load-btn" id="tl-load-more-btn">Load older sessions</button>
        </div>
      ` : ''}
    </div>

    <!-- Detail panel -->
    <div class="tl-detail-overlay" id="tl-detail-overlay"></div>
    <div class="tl-detail-panel" id="tl-detail-panel">
      <div class="tl-detail-header">
        <span class="tl-detail-title">Observation Detail</span>
        <button class="tl-detail-close" id="tl-detail-close">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 1L13 13M13 1L1 13" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <div class="tl-detail-body" id="tl-detail-body"></div>
    </div>
  `;

  bindTimelineEvents(container);
}

// ── Group sessions by day/week/month ──────────────────────────────
function groupSessions(sessions, zoom) {
  const groups = [];
  const map = new Map();

  for (const s of sessions) {
    const ts = s.started_at || Date.now();
    const key = getGroupKey(ts, zoom);
    if (!map.has(key)) {
      map.set(key, { key, label: getGroupLabel(ts, zoom), sessions: [] });
    }
    map.get(key).sessions.push(s);
  }

  for (const g of map.values()) {
    groups.push(g);
  }

  return groups;
}

function getGroupKey(ts, zoom) {
  const d = new Date(ts);
  if (zoom === 'day') return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  if (zoom === 'week') {
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${week}`;
  }
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function getGroupLabel(ts, zoom) {
  const d = new Date(ts);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (zoom === 'day') {
    const diff = Math.floor((today - dateDay) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return d.toLocaleDateString(undefined, { weekday: 'long' });
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  }

  if (zoom === 'week') {
    const startOfWeek = new Date(d);
    startOfWeek.setDate(d.getDate() - d.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    const opts = { month: 'short', day: 'numeric' };
    return `${startOfWeek.toLocaleDateString(undefined, opts)} — ${endOfWeek.toLocaleDateString(undefined, opts)}`;
  }

  // month
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

// ── Render a group ────────────────────────────────────────────────
function renderGroup(group, groupIndex) {
  return `
    <div class="tl-group">
      <div class="tl-group-header">
        <div class="tl-group-dot"><div class="tl-group-dot-inner"></div></div>
        <span class="tl-group-label">${escapeHtml(group.label)}</span>
        <div class="tl-group-line"></div>
        <span class="tl-group-count">${group.sessions.length}</span>
      </div>
      ${group.sessions.map((s, si) => renderSession(s, groupIndex, si)).join('')}
    </div>
  `;
}

// ── Render a session node ─────────────────────────────────────────
function renderSession(s, gi, si) {
  const isExpanded = tlExpanded.has(s.id);
  const startTs = s.started_at || Date.now();
  const isLive = !s.ended_at;
  const duration = s.ended_at ? formatDuration(s.ended_at - s.started_at) : 'ongoing';
  const obsCount = s.observation_count || 0;
  const delay = si * 0.06;
  const keyActions = (s.key_actions || []).slice(0, 3);
  const filesModified = (s.files_modified || []).slice(0, 4);

  const timeStr = new Date(startTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return `
    <div class="tl-session ${isExpanded ? 'expanded' : ''}" data-session-id="${escapeHtml(s.id)}" style="animation-delay: ${delay}s">
      <div class="tl-session-node"></div>
      <div class="tl-session-card" tabindex="0" role="button" aria-expanded="${isExpanded}">
        <div class="tl-session-top">
          <div class="tl-session-info">
            <div class="tl-session-time">
              <span>${timeStr}</span>
              <span class="tl-session-duration">${escapeHtml(duration)}</span>
              ${isLive ? '<span class="tl-session-live" title="Active session"></span>' : ''}
            </div>
            <div class="tl-session-summary">${s.summary ? escapeHtml(s.summary) : '<span style="color: var(--text-tertiary); font-style: italic;">No summary</span>'}</div>
            ${filesModified.length > 0 ? `
              <div class="tl-session-files">
                ${filesModified.map(f => `<span class="tl-file-chip" title="${escapeHtml(f)}">${escapeHtml(shortenPath(f))}</span>`).join('')}
                ${(s.files_modified || []).length > 4 ? `<span class="tl-file-chip">+${(s.files_modified || []).length - 4}</span>` : ''}
              </div>
            ` : ''}
          </div>
          <div class="tl-session-right">
            <div class="tl-obs-badge">
              <svg viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="3"/></svg>
              ${obsCount}
            </div>
            <svg class="tl-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 6L8 10L12 6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
        <div class="tl-observations" id="tl-obs-${escapeHtml(s.id)}">
          ${isExpanded && tlSessionDetails[s.id] ? renderObservations(tlSessionDetails[s.id]) : ''}
        </div>
      </div>
    </div>
  `;
}

// ── Render observations within a session ──────────────────────────
function renderObservations(session) {
  const obs = session.observations || [];
  if (obs.length === 0) {
    return `<div class="tl-obs-list"><div style="color: var(--text-tertiary); font-size: 12px; padding: 12px 0 4px 28px;">No observations recorded</div></div>`;
  }

  return `
    <div class="tl-obs-list">
      ${obs.map((o, i) => {
        const time = o.timestamp ? new Date(o.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
        return `
          <div class="tl-obs-item" tabindex="0" role="button" data-obs-index="${i}" data-session-id="${escapeHtml(session.id)}">
            <div class="tl-obs-dot"></div>
            <div class="tl-obs-time">${time}</div>
            <div class="tl-obs-body">
              <div class="tl-obs-tool">${escapeHtml(o.tool || '')}</div>
              <div class="tl-obs-summary">${escapeHtml(o.input_summary || '')}</div>
              ${o.files && o.files.length > 0 ? `
                <div class="tl-obs-files">
                  ${o.files.slice(0, 3).map(f => `<span class="tl-file-chip">${escapeHtml(shortenPath(f))}</span>`).join('')}
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ── Detail Panel Content ──────────────────────────────────────────
function renderDetailContent(obs, sessionId) {
  const time = obs.timestamp ? formatDate(obs.timestamp) : 'Unknown';

  return `
    <div class="tl-detail-section">
      <div class="tl-detail-meta-grid">
        <div class="tl-detail-meta-item">
          <div class="tl-detail-label">Tool</div>
          <div class="tl-detail-value" style="color: var(--accent); font-weight: 600;">${escapeHtml(obs.tool || '')}</div>
        </div>
        <div class="tl-detail-meta-item">
          <div class="tl-detail-label">Timestamp</div>
          <div class="tl-detail-value" style="font-family: var(--font-mono); font-size: 12px;">${escapeHtml(time)}</div>
        </div>
        <div class="tl-detail-meta-item">
          <div class="tl-detail-label">Observation ID</div>
          <div class="tl-detail-value" style="font-family: var(--font-mono); font-size: 11px; color: var(--text-tertiary);">${escapeHtml(obs.id || '')}</div>
        </div>
        <div class="tl-detail-meta-item">
          <div class="tl-detail-label">Conversation</div>
          <div class="tl-detail-value" style="font-family: var(--font-mono); font-size: 11px; color: var(--text-tertiary);">${escapeHtml(obs.conversation_id || 'None')}</div>
        </div>
      </div>
    </div>

    ${obs.input_summary ? `
      <div class="tl-detail-section">
        <div class="tl-detail-label">Input</div>
        <div class="tl-detail-value mono">${escapeHtml(obs.input_summary)}</div>
      </div>
    ` : ''}

    ${obs.output_summary ? `
      <div class="tl-detail-section">
        <div class="tl-detail-label">Output</div>
        <div class="tl-detail-value mono">${escapeHtml(obs.output_summary)}</div>
      </div>
    ` : ''}

    ${obs.files && obs.files.length > 0 ? `
      <div class="tl-detail-section">
        <div class="tl-detail-label">Files Involved</div>
        <div class="tl-detail-tags">
          ${obs.files.map(f => `<span class="tag">${escapeHtml(f)}</span>`).join('')}
        </div>
      </div>
    ` : ''}
  `;
}

// ── Event Binding ─────────────────────────────────────────────────
function bindTimelineEvents(container) {
  // Zoom buttons
  container.querySelectorAll('.tl-zoom-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      tlZoom = btn.dataset.zoom;
      renderTimelineDOM(container);
    });
  });

  // Jump to today
  const jumpBtn = container.querySelector('#tl-jump-today');
  if (jumpBtn) {
    jumpBtn.addEventListener('click', () => {
      const rail = container.querySelector('#tl-rail');
      if (rail) rail.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // Session expand/collapse
  container.querySelectorAll('.tl-session-card').forEach(card => {
    const sessionEl = card.closest('.tl-session');
    const sessionId = sessionEl.dataset.sessionId;

    const toggle = async () => {
      if (tlExpanded.has(sessionId)) {
        tlExpanded.delete(sessionId);
        sessionEl.classList.remove('expanded');
        const obsContainer = card.querySelector('.tl-observations');
        obsContainer.style.maxHeight = '0';
        obsContainer.style.opacity = '0';
      } else {
        tlExpanded.add(sessionId);
        sessionEl.classList.add('expanded');
        card.setAttribute('aria-expanded', 'true');

        const obsContainer = card.querySelector('.tl-observations');

        // Fetch details if not cached
        if (!tlSessionDetails[sessionId]) {
          obsContainer.innerHTML = '<div class="tl-obs-list"><div style="color: var(--text-tertiary); font-size: 12px; padding: 16px 0 4px 28px;">Loading observations...</div></div>';
          obsContainer.style.maxHeight = '60px';
          obsContainer.style.opacity = '1';

          const detail = await api(`/sessions/${encodeURIComponent(sessionId)}`);
          if (detail) {
            tlSessionDetails[sessionId] = detail;
          }
        }

        if (tlSessionDetails[sessionId]) {
          obsContainer.innerHTML = renderObservations(tlSessionDetails[sessionId]);
          // Bind observation click handlers
          bindObservationClicks(obsContainer, sessionId);
        }

        // Animate open
        obsContainer.style.maxHeight = obsContainer.scrollHeight + 'px';
        obsContainer.style.opacity = '1';

        // After transition, allow content to flow naturally
        setTimeout(() => {
          if (tlExpanded.has(sessionId)) {
            obsContainer.style.maxHeight = 'none';
          }
        }, 500);
      }
    };

    card.addEventListener('click', (e) => {
      // Don't toggle if clicking an observation item
      if (e.target.closest('.tl-obs-item')) return;
      toggle();
    });

    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
  });

  // Load more
  const loadBtn = container.querySelector('#tl-load-more-btn');
  if (loadBtn) {
    loadBtn.addEventListener('click', async () => {
      loadBtn.disabled = true;
      loadBtn.textContent = 'Loading...';
      tlLimit += 30;
      const data = await api(`/sessions?limit=${tlLimit}`);
      if (data && data.sessions) {
        tlSessions = data.sessions;
        tlHasMore = data.sessions.length >= tlLimit;
      } else {
        tlHasMore = false;
      }
      renderTimelineDOM(container);
    });
  }

  // Detail panel close
  const overlay = document.getElementById('tl-detail-overlay');
  const panel = document.getElementById('tl-detail-panel');
  const closeBtn = document.getElementById('tl-detail-close');

  if (overlay) overlay.addEventListener('click', closeDetailPanel);
  if (closeBtn) closeBtn.addEventListener('click', closeDetailPanel);

  // Escape to close detail panel
  document.addEventListener('keydown', handleTimelineKeydown);

  // Bind existing expanded session observation clicks
  container.querySelectorAll('.tl-session.expanded .tl-observations').forEach(obsContainer => {
    const sessionId = obsContainer.closest('.tl-session').dataset.sessionId;
    bindObservationClicks(obsContainer, sessionId);
  });
}

function bindObservationClicks(obsContainer, sessionId) {
  obsContainer.querySelectorAll('.tl-obs-item').forEach(item => {
    const clickHandler = () => {
      const idx = parseInt(item.dataset.obsIndex, 10);
      const session = tlSessionDetails[sessionId];
      if (session && session.observations && session.observations[idx]) {
        openDetailPanel(session.observations[idx], sessionId);
      }
    };

    item.addEventListener('click', (e) => {
      e.stopPropagation();
      clickHandler();
    });

    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        clickHandler();
      }
    });
  });
}

// ── Detail Panel Open / Close ─────────────────────────────────────
function openDetailPanel(obs, sessionId) {
  tlDetailObs = obs;
  const overlay = document.getElementById('tl-detail-overlay');
  const panel = document.getElementById('tl-detail-panel');
  const body = document.getElementById('tl-detail-body');

  if (body) body.innerHTML = renderDetailContent(obs, sessionId);
  if (overlay) overlay.classList.add('open');
  if (panel) panel.classList.add('open');

  // Prevent background scroll
  document.body.style.overflow = 'hidden';
}

function closeDetailPanel() {
  tlDetailObs = null;
  const overlay = document.getElementById('tl-detail-overlay');
  const panel = document.getElementById('tl-detail-panel');

  if (overlay) overlay.classList.remove('open');
  if (panel) panel.classList.remove('open');
  document.body.style.overflow = '';
}

function handleTimelineKeydown(e) {
  if (e.key === 'Escape' && tlDetailObs) {
    closeDetailPanel();
  }
}

// ── Helpers ───────────────────────────────────────────────────────
function formatDuration(ms) {
  if (ms < 0) return '—';
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return '<1m';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hours < 24) return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function shortenPath(filepath) {
  if (!filepath) return '';
  const parts = filepath.split('/');
  if (parts.length <= 2) return filepath;
  return parts[parts.length - 2] + '/' + parts[parts.length - 1];
}
