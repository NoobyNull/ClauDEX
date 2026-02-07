// ═══════════════════════════════════════════════════════════════════
// ClauDEX Interactive Dashboard
// ═══════════════════════════════════════════════════════════════════

const DASH_STYLE_ID = 'claudex-dashboard-styles';

function injectDashboardStyles() {
  if (document.getElementById(DASH_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = DASH_STYLE_ID;
  style.textContent = `
    /* ── Clickable stat cards ────────────────────────── */
    .stat-card-link {
      cursor: pointer;
      position: relative;
    }

    .stat-card-link .stat-card-arrow {
      position: absolute;
      top: 12px;
      right: 12px;
      color: var(--text-tertiary);
      opacity: 0;
      transition: all 0.2s ease;
    }

    .stat-card-link:hover .stat-card-arrow {
      opacity: 1;
      color: var(--accent);
      transform: translateX(2px);
    }

    .stat-card-link:hover {
      border-color: var(--accent) !important;
    }

    .stat-card-link:active {
      transform: scale(0.98);
    }

    /* ── Activity Feed ───────────────────────────────── */
    .dash-section {
      margin-top: 24px;
    }

    .dash-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }

    .dash-section-title {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-secondary);
    }

    .dash-section-link {
      font-size: 12px;
      color: var(--accent);
      text-decoration: none;
      font-weight: 500;
      transition: opacity 0.15s ease;
    }

    .dash-section-link:hover { opacity: 0.8; }

    /* ── Recent Sessions ─────────────────────────────── */
    .dash-session {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 14px 16px;
      border-bottom: 1px solid var(--border);
      transition: background 0.15s ease;
      cursor: pointer;
    }

    .dash-session:last-child { border-bottom: none; }
    .dash-session:hover { background: var(--accent-glow); }

    .dash-session-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 14px;
      font-weight: 700;
      font-family: var(--font-mono);
    }

    .dash-session-icon.live {
      background: var(--success-subtle);
      color: var(--success);
      animation: pulse 2s infinite;
    }

    .dash-session-icon.ended {
      background: var(--bg-tertiary);
      color: var(--text-tertiary);
    }

    .dash-session-info { flex: 1; min-width: 0; }

    .dash-session-summary {
      font-size: 13px;
      color: var(--text);
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .dash-session-meta {
      font-size: 11px;
      color: var(--text-tertiary);
      margin-top: 3px;
      display: flex;
      gap: 10px;
      align-items: center;
    }

    .dash-session-meta .live-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--success);
      animation: pulse 2s infinite;
    }

    /* ── Recent Knowledge ────────────────────────────── */
    .dash-knowledge {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      transition: background 0.15s ease;
      cursor: pointer;
    }

    .dash-knowledge:last-child { border-bottom: none; }
    .dash-knowledge:hover { background: var(--accent-glow); }

    .dash-kn-type {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .dash-kn-type[data-type="fact"] { background: var(--accent-subtle); color: var(--accent); }
    .dash-kn-type[data-type="decision"] { background: var(--success-subtle); color: var(--success); }
    .dash-kn-type[data-type="preference"] { background: var(--warning-subtle); color: var(--warning); }
    .dash-kn-type[data-type="pattern"] { background: var(--purple-subtle); color: var(--purple); }
    .dash-kn-type[data-type="issue"] { background: var(--error-subtle); color: var(--error); }
    .dash-kn-type[data-type="context"] { background: var(--bg-tertiary); color: var(--text-secondary); }
    .dash-kn-type[data-type="discovery"] { background: rgba(34, 197, 94, 0.12); color: #22c55e; }

    .dash-kn-content {
      font-size: 13px;
      color: var(--text);
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      flex: 1;
    }

    .dash-kn-age {
      font-size: 10px;
      color: var(--text-tertiary);
      font-family: var(--font-mono);
      flex-shrink: 0;
      margin-top: 2px;
    }

    /* ── Quick Actions ───────────────────────────────── */
    .dash-actions {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-top: 24px;
    }

    @media (max-width: 640px) {
      .dash-actions { grid-template-columns: 1fr; }
    }

    .dash-action-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 16px;
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
      color: var(--text);
      font-family: var(--font);
    }

    .dash-action-btn:hover {
      border-color: var(--accent);
      box-shadow: var(--shadow-sm);
      transform: translateY(-1px);
    }

    .dash-action-btn:hover .dash-action-icon {
      color: var(--accent);
    }

    .dash-action-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-tertiary);
      color: var(--text-secondary);
      transition: color 0.2s ease;
      flex-shrink: 0;
    }

    .dash-action-text {
      flex: 1;
    }

    .dash-action-label {
      font-size: 13px;
      font-weight: 600;
    }

    .dash-action-hint {
      font-size: 11px;
      color: var(--text-tertiary);
      margin-top: 1px;
    }

    /* ── Two-column layout ───────────────────────────── */
    .dash-columns {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 24px;
    }

    @media (max-width: 768px) {
      .dash-columns { grid-template-columns: 1fr; }
    }

    /* ── Tag cloud interactive ───────────────────────── */
    .dash-tag-cloud {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .dash-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      background: var(--accent-subtle);
      border-radius: 12px;
      font-size: 11px;
      color: var(--accent);
      font-family: var(--font-mono);
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      border: 1px solid transparent;
    }

    .dash-tag:hover {
      background: var(--accent);
      color: #fff;
      border-color: var(--accent);
      transform: scale(1.05);
    }

    .dash-tag-count {
      font-size: 10px;
      opacity: 0.7;
    }
  `;
  document.head.appendChild(style);
}

async function renderDashboard(container) {
  injectDashboardStyles();
  container.innerHTML = '<div class="loading">Loading dashboard...</div>';

  // Fetch all data in parallel
  const [stats, sessionsData, knowledgeData] = await Promise.all([
    api('/stats' + sessionParam(false)),
    api('/sessions?limit=5'),
    api('/knowledge?limit=5'),
  ]);

  if (!stats) {
    container.innerHTML = `
      <div class="empty">
        <div class="empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        Failed to load dashboard stats
      </div>
    `;
    return;
  }

  const sessions = (sessionsData && sessionsData.sessions) || [];
  const knowledge = (knowledgeData && knowledgeData.items) || [];

  const filterLabel = activeSessionFilter
    ? `<span style="color: var(--accent); font-size: 14px; font-weight: 500;"> — Session ${getSessionLabel()}</span>`
    : '';

  container.innerHTML = `
    <h2 class="page-title">Dashboard${filterLabel}</h2>

    <!-- ── Stats Grid (clickable) ─────────────────── -->
    <div class="stats-grid">
      ${renderStatCard(stats.observations || 0, 'Observations', '#/timeline', 'View timeline')}
      ${renderStatCard(stats.knowledge || 0, 'Knowledge', '#/knowledge', 'Browse knowledge')}
      ${renderStatCard(stats.sessions || 0, 'Sessions', '#/timeline', 'View sessions')}
      ${renderStatCard(stats.conversations || 0, 'Conversations', null, null)}
      ${renderStatCard(stats.stashed || 0, 'Stashed', null, null)}
      ${renderStatCard(stats.projects || 0, 'Projects', null, null)}
      ${renderStatCard(stats.embeddings || 0, 'Embeddings', '#/settings', 'Configure')}
      ${renderStatCard(formatBytes(stats.storageBytes || 0), 'Storage', '#/settings', 'Settings')}
    </div>

    ${stats.pendingEmbeddings > 0 ? `
    <div class="pending-banner">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
        <path d="M8 5V8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="8" cy="11" r="0.75" fill="currentColor"/>
      </svg>
      ${stats.pendingEmbeddings} embedding${stats.pendingEmbeddings === 1 ? '' : 's'} pending — will process at end of next session
    </div>
    ` : ''}

    <!-- ── Quick Actions ──────────────────────────── -->
    <div class="dash-actions">
      <a href="#/search" class="dash-action-btn">
        <div class="dash-action-icon">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5"/><path d="M11 11L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </div>
        <div class="dash-action-text">
          <div class="dash-action-label">Search</div>
          <div class="dash-action-hint">Find any memory</div>
        </div>
      </a>
      <a href="#/timeline" class="dash-action-btn">
        <div class="dash-action-icon">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1V15M4 4H1M12 4H15M4 8H1M12 8H15M4 12H1M12 12H15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </div>
        <div class="dash-action-text">
          <div class="dash-action-label">Timeline</div>
          <div class="dash-action-hint">Browse activity</div>
        </div>
      </a>
      <a href="#/help" class="dash-action-btn">
        <div class="dash-action-icon">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M6 6a2 2 0 1 1 2.5 1.94c-.39.15-.5.46-.5.81V10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="12.5" r="0.75" fill="currentColor"/></svg>
        </div>
        <div class="dash-action-text">
          <div class="dash-action-label">Help</div>
          <div class="dash-action-hint">Usage guide</div>
        </div>
      </a>
    </div>

    <!-- ── Two-column: Sessions + Knowledge ──────── -->
    <div class="dash-columns">

      <!-- Recent Sessions -->
      <div class="dash-section">
        <div class="dash-section-header">
          <span class="dash-section-title">Recent Sessions</span>
          <a href="#/timeline" class="dash-section-link">View all →</a>
        </div>
        <div class="card" style="padding: 0; overflow: hidden;">
          ${sessions.length === 0
            ? '<div style="padding: 24px; text-align: center; color: var(--text-tertiary); font-size: 13px;">No sessions yet</div>'
            : sessions.map((s, i) => renderDashSession(s, i)).join('')
          }
        </div>
      </div>

      <!-- Recent Knowledge -->
      <div class="dash-section">
        <div class="dash-section-header">
          <span class="dash-section-title">Recent Knowledge</span>
          <a href="#/knowledge" class="dash-section-link">View all →</a>
        </div>
        <div class="card" style="padding: 0; overflow: hidden;">
          ${knowledge.length === 0
            ? '<div style="padding: 24px; text-align: center; color: var(--text-tertiary); font-size: 13px;">No knowledge saved yet</div>'
            : knowledge.map(k => renderDashKnowledge(k)).join('')
          }
        </div>
      </div>

    </div>

    <!-- ── Tags Cloud ─────────────────────────────── -->
    ${stats.topTags && stats.topTags.length > 0 ? `
    <div class="dash-section">
      <div class="dash-section-header">
        <span class="dash-section-title">Top Tags</span>
      </div>
      <div class="dash-tag-cloud" id="dash-tag-cloud">
        ${stats.topTags.map(t => `
          <span class="dash-tag" data-tag="${escapeHtml(t.tag)}">
            ${escapeHtml(t.tag)}
            <span class="dash-tag-count">${t.count}</span>
          </span>
        `).join('')}
      </div>
    </div>
    ` : ''}
  `;

  // ── Bind interactions ──────────────────────────────────────────

  // Stat cards navigate
  container.querySelectorAll('.stat-card-link[data-href]').forEach(card => {
    card.addEventListener('click', () => {
      window.location.hash = card.dataset.href;
    });
  });

  // Session cards navigate to timeline
  container.querySelectorAll('.dash-session[data-session-id]').forEach(el => {
    el.addEventListener('click', () => {
      window.location.hash = '#/timeline';
    });
  });

  // Knowledge cards open graph explorer
  container.querySelectorAll('.dash-knowledge[data-knowledge-id]').forEach(el => {
    el.addEventListener('click', () => {
      const knId = el.dataset.knowledgeId;
      if (knId && typeof openGraphExplorer === 'function') {
        openGraphExplorer(knId);
      }
    });
  });

  // Tags navigate to search with that tag
  container.querySelectorAll('.dash-tag[data-tag]').forEach(el => {
    el.addEventListener('click', () => {
      const tag = el.dataset.tag;
      window.location.hash = '#/search';
      // Small delay to let the search view render, then fill in the query
      setTimeout(() => {
        const input = document.getElementById('search-input');
        if (input) {
          input.value = tag;
          input.dispatchEvent(new Event('input'));
          // Trigger search
          const btn = document.getElementById('search-btn');
          if (btn) btn.click();
        }
      }, 200);
    });
  });
}

// ── Helper renderers ──────────────────────────────────────────────

function renderStatCard(value, label, href, tooltip) {
  if (href) {
    return `
      <div class="stat-card stat-card-link" data-href="${href}" title="${tooltip || ''}">
        <svg class="stat-card-arrow" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 1L11 7L5 13" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div class="stat-value">${value}</div>
        <div class="stat-label">${label}</div>
      </div>
    `;
  }
  return `
    <div class="stat-card">
      <div class="stat-value">${value}</div>
      <div class="stat-label">${label}</div>
    </div>
  `;
}

function renderDashSession(s, index) {
  const isLive = !s.ended_at;
  const age = s.started_at ? formatAge(s.started_at) : '';
  const obsCount = s.observation_count || 0;

  return `
    <div class="dash-session" data-session-id="${escapeHtml(s.id)}">
      <div class="dash-session-icon ${isLive ? 'live' : 'ended'}">
        ${isLive ? '●' : (index + 1)}
      </div>
      <div class="dash-session-info">
        <div class="dash-session-summary">
          ${s.summary ? escapeHtml(s.summary) : '<span style="color: var(--text-tertiary); font-style: italic;">No summary</span>'}
        </div>
        <div class="dash-session-meta">
          ${isLive ? '<span class="live-dot"></span><span style="color: var(--success);">Active</span>' : ''}
          <span>${age}</span>
          <span style="font-family: var(--font-mono);">${obsCount} obs</span>
        </div>
      </div>
    </div>
  `;
}

function renderDashKnowledge(k) {
  return `
    <div class="dash-knowledge" data-knowledge-id="${escapeHtml(k.id)}">
      <span class="dash-kn-type" data-type="${escapeHtml(k.type)}">${escapeHtml(k.type)}</span>
      <div class="dash-kn-content">${escapeHtml(k.content)}</div>
      <span class="dash-kn-age">${k.created_at ? formatAge(k.created_at) : ''}</span>
    </div>
  `;
}
