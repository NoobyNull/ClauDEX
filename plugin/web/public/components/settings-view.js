async function renderSettings(container) {
  container.innerHTML = '<div class="loading">Loading settings...</div>';

  const config = await api('/config');
  if (!config) {
    container.innerHTML = '<div class="empty"><div class="empty-icon">!</div>Failed to load configuration</div>';
    return;
  }

  container.innerHTML = `
    <h2 class="page-title">Settings</h2>
    <p class="page-subtitle">Configure how ClauDEX captures, stores, and retrieves your memories.</p>

    <form id="settings-form" autocomplete="off">

      <!-- ── Capture ─────────────────────────── -->
      <div class="settings-section">
        <div class="settings-section-header">
          <h3 class="settings-section-title">Capture</h3>
          <p class="settings-section-desc">Control what gets recorded during sessions.</p>
        </div>

        <label class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Auto-capture observations</span>
            <span class="setting-hint">Record tool usage automatically via PostToolUse hook</span>
          </div>
          <div class="toggle-switch">
            <input type="checkbox" id="s-autoCapture" ${config.autoCapture ? 'checked' : ''}>
            <span class="toggle-track"></span>
          </div>
        </label>

        <label class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Privacy exclusion patterns</span>
            <span class="setting-hint">Files matching these patterns are never captured (comma-separated)</span>
          </div>
          <input type="text" class="setting-text" id="s-excludePatterns"
            value="${escapeHtml((config.privacy?.excludePatterns || []).join(', '))}"
            placeholder=".env, credentials, secret">
        </label>
      </div>

      <!-- ── Context Injection ───────────────── -->
      <div class="settings-section">
        <div class="settings-section-header">
          <h3 class="settings-section-title">Context Injection</h3>
          <p class="settings-section-desc">How much past context is injected into new sessions.</p>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Max context tokens</span>
            <span class="setting-hint">Token budget for the SessionStart context injection</span>
          </div>
          <input type="number" class="setting-number" id="s-maxContextTokens"
            value="${config.maxContextTokens || 2000}" min="500" max="8000" step="100">
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Session history depth</span>
            <span class="setting-hint">Number of past sessions to include in context</span>
          </div>
          <input type="number" class="setting-number" id="s-sessionHistoryDepth"
            value="${config.sessionHistoryDepth || 10}" min="1" max="50" step="1">
        </div>
      </div>

      <!-- ── Search Weights ──────────────────── -->
      <div class="settings-section">
        <div class="settings-section-header">
          <h3 class="settings-section-title">Search Weights</h3>
          <p class="settings-section-desc">Balance between search strategies. Weights should sum to 1.0.</p>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Keyword (FTS5)</span>
            <span class="setting-hint">Exact term matching weight</span>
          </div>
          <div class="setting-range-wrap">
            <input type="range" class="setting-range" id="s-ftsWeight"
              value="${config.search?.ftsWeight || 0.4}" min="0" max="1" step="0.05">
            <span class="setting-range-value" id="sv-ftsWeight">${config.search?.ftsWeight || 0.4}</span>
          </div>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Semantic (Vector)</span>
            <span class="setting-hint">Conceptual similarity weight</span>
          </div>
          <div class="setting-range-wrap">
            <input type="range" class="setting-range" id="s-vectorWeight"
              value="${config.search?.vectorWeight || 0.4}" min="0" max="1" step="0.05">
            <span class="setting-range-value" id="sv-vectorWeight">${config.search?.vectorWeight || 0.4}</span>
          </div>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Recency</span>
            <span class="setting-hint">Boost newer results</span>
          </div>
          <div class="setting-range-wrap">
            <input type="range" class="setting-range" id="s-recencyWeight"
              value="${config.search?.recencyWeight || 0.1}" min="0" max="1" step="0.05">
            <span class="setting-range-value" id="sv-recencyWeight">${config.search?.recencyWeight || 0.1}</span>
          </div>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Project affinity</span>
            <span class="setting-hint">Boost results from current project</span>
          </div>
          <div class="setting-range-wrap">
            <input type="range" class="setting-range" id="s-projectAffinityWeight"
              value="${config.search?.projectAffinityWeight || 0.1}" min="0" max="1" step="0.05">
            <span class="setting-range-value" id="sv-projectAffinityWeight">${config.search?.projectAffinityWeight || 0.1}</span>
          </div>
        </div>

        <div id="weight-sum-warning" class="setting-warning" style="display:none;">
          Weights sum to <span id="weight-sum-val"></span> — should be 1.0
        </div>
      </div>

      <!-- ── Embeddings ──────────────────────── -->
      <div class="settings-section">
        <div class="settings-section-header">
          <h3 class="settings-section-title">Embeddings</h3>
          <p class="settings-section-desc">Local vector embedding for semantic search.</p>
        </div>

        <label class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Enable embeddings</span>
            <span class="setting-hint">Generate vector embeddings for semantic search (uses fastembed locally)</span>
          </div>
          <div class="toggle-switch">
            <input type="checkbox" id="s-embeddingsEnabled" ${config.embeddings?.enabled ? 'checked' : ''}>
            <span class="toggle-track"></span>
          </div>
        </label>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Batch size</span>
            <span class="setting-hint">Items per embedding batch at session end</span>
          </div>
          <input type="number" class="setting-number" id="s-batchSize"
            value="${config.embeddings?.batchSize || 10}" min="1" max="100" step="1">
        </div>
      </div>

      <!-- ── Conflict Detection ─────────────────── -->
      <div class="settings-section">
        <div class="settings-section-header">
          <h3 class="settings-section-title">Memory Conflict Detection</h3>
          <p class="settings-section-desc">Detect near-duplicate observations and ask for clarification before saving.</p>
        </div>

        <label class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Enable conflict detection</span>
            <span class="setting-hint">Check new observations against existing memories for duplicates</span>
          </div>
          <div class="toggle-switch">
            <input type="checkbox" id="s-conflictEnabled" ${config.conflictDetection?.enabled ? 'checked' : ''}>
            <span class="toggle-track"></span>
          </div>
        </label>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Similarity threshold</span>
            <span class="setting-hint">Minimum similarity score (0-1) to trigger conflict prompt. Lower = more sensitive.</span>
          </div>
          <div class="setting-range-wrap">
            <input type="range" class="setting-range" id="s-conflictThreshold"
              value="${config.conflictDetection?.similarityThreshold || 0.65}" min="0.3" max="0.95" step="0.05">
            <span class="setting-range-value" id="sv-conflictThreshold">${config.conflictDetection?.similarityThreshold || 0.65}</span>
          </div>
        </div>
      </div>

      <!-- ── Curation ─────────────────────────── -->
      <div class="settings-section">
        <div class="settings-section-header">
          <h3 class="settings-section-title">Curation Agent</h3>
          <p class="settings-section-desc">AI-powered observation curation at session end. Uses Haiku to deduplicate, filter noise, and extract knowledge.</p>
        </div>

        <label class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Enable curation</span>
            <span class="setting-hint">Run the curation agent when sessions end</span>
          </div>
          <div class="toggle-switch">
            <input type="checkbox" id="s-curationEnabled" ${config.curation?.enabled ? 'checked' : ''}>
            <span class="toggle-track"></span>
          </div>
        </label>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Minimum observations</span>
            <span class="setting-hint">Skip curation for sessions with fewer observations</span>
          </div>
          <input type="number" class="setting-number" id="s-curationMinObs"
            value="${config.curation?.minObservations || 5}" min="1" max="100" step="1">
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Max budget (USD)</span>
            <span class="setting-hint">Cost cap per curation run</span>
          </div>
          <input type="number" class="setting-number" id="s-curationBudget"
            value="${config.curation?.maxBudgetUsd || 0.02}" min="0.001" max="1.0" step="0.005">
        </div>
      </div>

      <!-- ── Checkpoints ──────────────────────── -->
      <div class="settings-section">
        <div class="settings-section-header">
          <h3 class="settings-section-title">Checkpoints</h3>
          <p class="settings-section-desc">Session save points for recovery and branching.</p>
        </div>

        <label class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Enable checkpoints</span>
            <span class="setting-hint">Allow creating session save points</span>
          </div>
          <div class="toggle-switch">
            <input type="checkbox" id="s-checkpointsEnabled" ${config.checkpoints?.enabled ? 'checked' : ''}>
            <span class="toggle-track"></span>
          </div>
        </label>

        <label class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Auto-fork before destructive ops</span>
            <span class="setting-hint">Automatically create a checkpoint before rm -rf, git reset --hard, etc.</span>
          </div>
          <div class="toggle-switch">
            <input type="checkbox" id="s-autoFork" ${config.checkpoints?.autoForkBeforeDestructive ? 'checked' : ''}>
            <span class="toggle-track"></span>
          </div>
        </label>
      </div>

      <!-- ── Buffer ───────────────────────────── -->
      <div class="settings-section">
        <div class="settings-section-header">
          <h3 class="settings-section-title">Observation Buffer</h3>
          <p class="settings-section-desc">In-memory staging for observations before curation.</p>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Checkpoint interval</span>
            <span class="setting-hint">Write recovery checkpoint every N observations</span>
          </div>
          <input type="number" class="setting-number" id="s-bufferInterval"
            value="${config.buffer?.checkpointInterval || 20}" min="5" max="100" step="5">
        </div>
      </div>

      <!-- ── Knowledge Graph ──────────────────── -->
      <div class="settings-section">
        <div class="settings-section-header">
          <h3 class="settings-section-title">Knowledge Graph</h3>
          <p class="settings-section-desc">Connect knowledge items into a graph with discoveries and reasoning chains.</p>
        </div>

        <label class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Enable knowledge graph</span>
            <span class="setting-hint">Create edges between related knowledge items and enable graph traversal</span>
          </div>
          <div class="toggle-switch">
            <input type="checkbox" id="s-graphEnabled" ${config.knowledgeGraph?.enabled ? 'checked' : ''}>
            <span class="toggle-track"></span>
          </div>
        </label>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Max traversal depth</span>
            <span class="setting-hint">Maximum chain depth when traversing knowledge graph (prevents exponential blowup)</span>
          </div>
          <input type="number" class="setting-number" id="s-graphMaxDepth"
            value="${config.knowledgeGraph?.maxDepth || 5}" min="1" max="20" step="1">
        </div>

        <label class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Auto-discover</span>
            <span class="setting-hint">Automatically derive new knowledge by combining existing items (uses Haiku)</span>
          </div>
          <div class="toggle-switch">
            <input type="checkbox" id="s-graphDiscovery" ${config.knowledgeGraph?.discoveryEnabled ? 'checked' : ''}>
            <span class="toggle-track"></span>
          </div>
        </label>
      </div>

      <!-- ── Web UI ──────────────────────────── -->
      <div class="settings-section">
        <div class="settings-section-header">
          <h3 class="settings-section-title">Web UI</h3>
          <p class="settings-section-desc">This dashboard. Changes take effect on next server restart.</p>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Port</span>
            <span class="setting-hint">HTTP port for the web interface</span>
          </div>
          <input type="number" class="setting-number" id="s-webPort"
            value="${config.webUI?.port || 37820}" min="1024" max="65535" step="1">
        </div>
      </div>

      <!-- ── Actions ─────────────────────────── -->
      <div class="settings-actions">
        <button type="submit" class="btn" id="save-btn">Save Settings</button>
        <span id="save-status" class="save-status"></span>
      </div>

    </form>

    <!-- ── Danger Zone ─────────────────────── -->
    <div class="settings-section danger-zone">
      <div class="settings-section-header">
        <h3 class="settings-section-title" style="color: var(--error);">Danger Zone</h3>
        <p class="settings-section-desc">Destructive actions that cannot be undone.</p>
      </div>

      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">Purge observations</span>
          <span class="setting-hint">Delete all recorded tool observations</span>
        </div>
        <button class="btn btn-danger btn-sm" data-purge="observations">Purge</button>
      </div>

      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">Purge knowledge</span>
          <span class="setting-hint">Delete all saved knowledge items</span>
        </div>
        <button class="btn btn-danger btn-sm" data-purge="knowledge">Purge</button>
      </div>

      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">Purge sessions</span>
          <span class="setting-hint">Delete all sessions, conversations, and observations</span>
        </div>
        <button class="btn btn-danger btn-sm" data-purge="sessions">Purge</button>
      </div>

      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">Factory reset</span>
          <span class="setting-hint">Delete ALL data — observations, knowledge, sessions, embeddings, everything</span>
        </div>
        <button class="btn btn-danger btn-sm" data-purge="all">Reset All</button>
      </div>

      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">Export data</span>
          <span class="setting-hint">Download all data as JSON</span>
        </div>
        <button class="btn btn-secondary btn-sm" id="export-btn">Export</button>
      </div>
    </div>
  `;

  // ── Wire up range sliders ──────────────────────────────────────
  const weightIds = ['ftsWeight', 'vectorWeight', 'recencyWeight', 'projectAffinityWeight'];
  weightIds.forEach(id => {
    const input = document.getElementById('s-' + id);
    const display = document.getElementById('sv-' + id);
    input.addEventListener('input', () => {
      display.textContent = parseFloat(input.value).toFixed(2);
      checkWeightSum();
    });
  });

  // Conflict threshold slider
  const conflictSlider = document.getElementById('s-conflictThreshold');
  const conflictDisplay = document.getElementById('sv-conflictThreshold');
  if (conflictSlider && conflictDisplay) {
    conflictSlider.addEventListener('input', () => {
      conflictDisplay.textContent = parseFloat(conflictSlider.value).toFixed(2);
    });
  }

  function checkWeightSum() {
    const sum = weightIds.reduce((acc, id) => acc + parseFloat(document.getElementById('s-' + id).value), 0);
    const warning = document.getElementById('weight-sum-warning');
    const val = document.getElementById('weight-sum-val');
    if (Math.abs(sum - 1.0) > 0.01) {
      val.textContent = sum.toFixed(2);
      warning.style.display = 'flex';
    } else {
      warning.style.display = 'none';
    }
  }
  checkWeightSum();

  // ── Save form ──────────────────────────────────────────────────
  document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-btn');
    const status = document.getElementById('save-status');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const payload = {
      autoCapture: document.getElementById('s-autoCapture').checked,
      maxContextTokens: parseInt(document.getElementById('s-maxContextTokens').value, 10),
      sessionHistoryDepth: parseInt(document.getElementById('s-sessionHistoryDepth').value, 10),
      privacy: {
        excludePatterns: document.getElementById('s-excludePatterns').value
          .split(',').map(s => s.trim()).filter(Boolean),
      },
      search: {
        ftsWeight: parseFloat(document.getElementById('s-ftsWeight').value),
        vectorWeight: parseFloat(document.getElementById('s-vectorWeight').value),
        recencyWeight: parseFloat(document.getElementById('s-recencyWeight').value),
        projectAffinityWeight: parseFloat(document.getElementById('s-projectAffinityWeight').value),
      },
      embeddings: {
        enabled: document.getElementById('s-embeddingsEnabled').checked,
        batchSize: parseInt(document.getElementById('s-batchSize').value, 10),
      },
      webUI: {
        port: parseInt(document.getElementById('s-webPort').value, 10),
      },
      curation: {
        enabled: document.getElementById('s-curationEnabled').checked,
        minObservations: parseInt(document.getElementById('s-curationMinObs').value, 10),
        maxBudgetUsd: parseFloat(document.getElementById('s-curationBudget').value),
      },
      checkpoints: {
        enabled: document.getElementById('s-checkpointsEnabled').checked,
        autoForkBeforeDestructive: document.getElementById('s-autoFork').checked,
      },
      buffer: {
        checkpointInterval: parseInt(document.getElementById('s-bufferInterval').value, 10),
      },
      conflictDetection: {
        enabled: document.getElementById('s-conflictEnabled').checked,
        similarityThreshold: parseFloat(document.getElementById('s-conflictThreshold').value),
      },
      knowledgeGraph: {
        enabled: document.getElementById('s-graphEnabled').checked,
        maxDepth: parseInt(document.getElementById('s-graphMaxDepth').value, 10),
        discoveryEnabled: document.getElementById('s-graphDiscovery').checked,
      },
    };

    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      status.textContent = 'Saved';
      status.className = 'save-status success';
      setTimeout(() => { status.textContent = ''; }, 3000);
    } catch (err) {
      status.textContent = 'Failed to save';
      status.className = 'save-status error';
    }

    btn.disabled = false;
    btn.textContent = 'Save Settings';
  });

  // ── Purge buttons ──────────────────────────────────────────────
  document.querySelectorAll('[data-purge]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const target = btn.dataset.purge;
      const labels = {
        observations: 'all observations',
        knowledge: 'all knowledge items',
        sessions: 'all sessions, conversations, and observations',
        all: 'ALL data (this cannot be undone)',
      };

      if (!confirm(`Are you sure you want to delete ${labels[target]}?`)) return;
      if (target === 'all' && !confirm('This is a factory reset. Are you absolutely sure?')) return;

      btn.disabled = true;
      btn.textContent = 'Deleting...';

      try {
        const res = await fetch(`/api/data/${target}`, { method: 'DELETE' });
        const data = await res.json();
        btn.textContent = `Deleted (${data.deleted})`;
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = target === 'all' ? 'Reset All' : 'Purge';
        }, 3000);
      } catch {
        btn.textContent = 'Failed';
        btn.disabled = false;
      }
    });
  });

  // ── Export button ──────────────────────────────────────────────
  document.getElementById('export-btn').addEventListener('click', async () => {
    const btn = document.getElementById('export-btn');
    btn.disabled = true;
    btn.textContent = 'Exporting...';

    try {
      const res = await fetch('/api/export');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `claudex-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Export failed');
    }

    btn.disabled = false;
    btn.textContent = 'Export';
  });
}
