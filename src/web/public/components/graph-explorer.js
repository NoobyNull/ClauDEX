// ═══════════════════════════════════════════════════════════════════
// Engram Knowledge Graph Explorer
// Shared panel for exploring knowledge connections from any view
// ═══════════════════════════════════════════════════════════════════

const GX_STYLE_ID = 'engram-graph-explorer-styles';

function injectGraphStyles() {
  if (document.getElementById(GX_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = GX_STYLE_ID;
  style.textContent = `
    /* ── Overlay + Panel Shell ────────────────────────── */
    .gx-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.55);
      z-index: 2000;
      opacity: 0;
      transition: opacity 0.25s ease;
      pointer-events: none;
      backdrop-filter: blur(2px);
      -webkit-backdrop-filter: blur(2px);
    }

    .gx-overlay.open { opacity: 1; pointer-events: all; }

    .gx-panel {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: min(680px, 95vw);
      background: var(--bg);
      border-left: 1px solid var(--border);
      box-shadow: -12px 0 48px rgba(0, 0, 0, 0.35);
      z-index: 2001;
      transform: translateX(100%);
      transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .gx-panel.open { transform: translateX(0); }

    /* ── Header ──────────────────────────────────────── */
    .gx-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 24px;
      border-bottom: 1px solid var(--border);
      background: var(--bg-secondary);
      flex-shrink: 0;
    }

    .gx-back-btn {
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
      flex-shrink: 0;
    }

    .gx-back-btn:hover { background: var(--bg-tertiary); color: var(--text); }
    .gx-back-btn:disabled { opacity: 0.3; cursor: not-allowed; }

    .gx-header-title {
      flex: 1;
      font-size: 14px;
      font-weight: 600;
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .gx-header-subtitle {
      font-size: 11px;
      color: var(--text-tertiary);
      font-weight: 400;
    }

    .gx-close-btn {
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
      flex-shrink: 0;
    }

    .gx-close-btn:hover { background: var(--bg-tertiary); color: var(--text); border-color: var(--border-strong); }

    /* ── Breadcrumb trail ─────────────────────────────── */
    .gx-breadcrumbs {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 10px 24px;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border);
      font-size: 11px;
      flex-shrink: 0;
      overflow-x: auto;
      white-space: nowrap;
    }

    .gx-crumb {
      background: none;
      border: none;
      color: var(--text-tertiary);
      font-family: var(--font-mono);
      font-size: 11px;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }

    .gx-crumb:hover { color: var(--accent); background: var(--accent-subtle); }
    .gx-crumb.current { color: var(--accent); font-weight: 600; cursor: default; }

    .gx-crumb-sep {
      color: var(--text-tertiary);
      opacity: 0.4;
      flex-shrink: 0;
    }

    /* ── Scrollable body ─────────────────────────────── */
    .gx-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }

    /* ── Focus Node Card ─────────────────────────────── */
    .gx-focus-card {
      background: var(--bg-elevated);
      border: 1px solid var(--accent);
      border-radius: var(--radius);
      padding: 20px;
      margin-bottom: 28px;
      box-shadow: 0 0 0 3px var(--accent-subtle), var(--shadow);
      position: relative;
      overflow: hidden;
    }

    .gx-focus-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, var(--accent), transparent 80%);
    }

    .gx-focus-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 10px;
    }

    .gx-focus-type {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 4px;
    }

    .gx-focus-type[data-type="fact"] { background: var(--accent-subtle); color: var(--accent); }
    .gx-focus-type[data-type="decision"] { background: var(--success-subtle); color: var(--success); }
    .gx-focus-type[data-type="preference"] { background: var(--warning-subtle); color: var(--warning); }
    .gx-focus-type[data-type="pattern"] { background: var(--purple-subtle); color: var(--purple); }
    .gx-focus-type[data-type="issue"] { background: var(--error-subtle); color: var(--error); }
    .gx-focus-type[data-type="context"] { background: var(--bg-tertiary); color: var(--text-secondary); }
    .gx-focus-type[data-type="discovery"] { background: rgba(34, 197, 94, 0.12); color: #22c55e; }

    .gx-focus-id {
      font-size: 10px;
      color: var(--text-tertiary);
      font-family: var(--font-mono);
    }

    .gx-focus-content {
      font-size: 14px;
      line-height: 1.6;
      color: var(--text);
      margin-bottom: 12px;
    }

    .gx-focus-meta {
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 11px;
      color: var(--text-tertiary);
    }

    .gx-focus-meta-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .gx-focus-tags {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
      margin-top: 10px;
    }

    /* ── Connections Section ──────────────────────────── */
    .gx-section-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--text-tertiary);
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .gx-section-count {
      font-weight: 400;
      font-family: var(--font-mono);
      color: var(--accent);
    }

    .gx-section-line {
      flex: 1;
      height: 1px;
      background: var(--border);
    }

    /* ── Edge Group (by relationship) ────────────────── */
    .gx-edge-group {
      margin-bottom: 20px;
    }

    .gx-edge-group-label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 4px 10px;
      border-radius: 4px;
      display: inline-block;
      margin-bottom: 8px;
    }

    .gx-edge-group-label[data-rel="derives_from"] { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
    .gx-edge-group-label[data-rel="leads_to"] { background: var(--accent-subtle); color: var(--accent); }
    .gx-edge-group-label[data-rel="supports"] { background: rgba(96, 165, 250, 0.1); color: #60a5fa; }
    .gx-edge-group-label[data-rel="contradicts"] { background: var(--error-subtle); color: var(--error); }
    .gx-edge-group-label[data-rel="refines"] { background: var(--purple-subtle); color: var(--purple); }
    .gx-edge-group-label[data-rel="supersedes"] { background: var(--warning-subtle); color: var(--warning); }

    /* ── Connected Node Card ─────────────────────────── */
    .gx-node-card {
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 14px 16px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: flex-start;
      gap: 12px;
      position: relative;
    }

    .gx-node-card:hover {
      border-color: var(--accent);
      box-shadow: var(--shadow-sm);
      transform: translateX(4px);
    }

    .gx-node-card:hover .gx-node-arrow { opacity: 1; color: var(--accent); }

    .gx-node-indicator {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      margin-top: 4px;
      flex-shrink: 0;
      border: 2px solid;
    }

    .gx-node-indicator[data-dir="outgoing"] { border-color: var(--accent); background: var(--accent-subtle); }
    .gx-node-indicator[data-dir="incoming"] { border-color: var(--purple); background: var(--purple-subtle); }

    .gx-node-body { flex: 1; min-width: 0; }

    .gx-node-top {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }

    .gx-node-type {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 3px;
    }

    .gx-node-type[data-type="fact"] { background: var(--accent-subtle); color: var(--accent); }
    .gx-node-type[data-type="decision"] { background: var(--success-subtle); color: var(--success); }
    .gx-node-type[data-type="preference"] { background: var(--warning-subtle); color: var(--warning); }
    .gx-node-type[data-type="pattern"] { background: var(--purple-subtle); color: var(--purple); }
    .gx-node-type[data-type="issue"] { background: var(--error-subtle); color: var(--error); }
    .gx-node-type[data-type="context"] { background: var(--bg-tertiary); color: var(--text-secondary); }
    .gx-node-type[data-type="discovery"] { background: rgba(34, 197, 94, 0.12); color: #22c55e; }

    .gx-node-strength {
      font-size: 10px;
      font-family: var(--font-mono);
      color: var(--text-tertiary);
    }

    .gx-node-content {
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .gx-node-arrow {
      color: var(--text-tertiary);
      opacity: 0;
      transition: all 0.15s ease;
      flex-shrink: 0;
      margin-top: 4px;
    }

    /* ── Depth Indicator ─────────────────────────────── */
    .gx-depth-badge {
      font-size: 9px;
      font-family: var(--font-mono);
      color: var(--text-tertiary);
      background: var(--bg-tertiary);
      padding: 1px 5px;
      border-radius: 3px;
    }

    /* ── Empty connections state ──────────────────────── */
    .gx-no-connections {
      text-align: center;
      padding: 40px 20px;
      color: var(--text-tertiary);
      font-size: 13px;
    }

    .gx-no-connections-icon {
      width: 48px;
      height: 48px;
      margin: 0 auto 12px;
      opacity: 0.2;
    }

    /* ── Loading state ───────────────────────────────── */
    .gx-loading {
      text-align: center;
      padding: 48px;
      color: var(--text-tertiary);
      font-size: 13px;
    }

    .gx-loading::before {
      content: '';
      display: block;
      width: 24px;
      height: 24px;
      border: 2px solid var(--border-strong);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 12px;
    }

    /* ── Chain visualization (for discoveries) ────────── */
    .gx-chain {
      position: relative;
      padding-left: 24px;
      margin-bottom: 24px;
    }

    .gx-chain::before {
      content: '';
      position: absolute;
      left: 8px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: linear-gradient(180deg, #22c55e, var(--accent), var(--purple));
      border-radius: 1px;
    }

    .gx-chain-node {
      position: relative;
      padding: 8px 0 8px 16px;
      cursor: pointer;
    }

    .gx-chain-node::before {
      content: '';
      position: absolute;
      left: -20px;
      top: 16px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid var(--accent);
      background: var(--bg);
      z-index: 1;
    }

    .gx-chain-node[data-depth="0"]::before { border-color: #22c55e; box-shadow: 0 0 8px rgba(34, 197, 94, 0.3); }

    .gx-chain-content {
      font-size: 12px;
      color: var(--text-secondary);
      line-height: 1.5;
      padding: 8px 12px;
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      transition: all 0.15s ease;
    }

    .gx-chain-node:hover .gx-chain-content {
      border-color: var(--accent);
      box-shadow: var(--shadow-sm);
    }

    .gx-chain-meta {
      font-size: 10px;
      color: var(--text-tertiary);
      margin-top: 4px;
      display: flex;
      gap: 8px;
    }

    /* ── Responsive ──────────────────────────────────── */
    @media (max-width: 640px) {
      .gx-panel { width: 100vw; }
      .gx-body { padding: 16px; }
      .gx-focus-card { padding: 14px; }
    }
  `;
  document.head.appendChild(style);
}

// ── State ─────────────────────────────────────────────────────────
let gxHistory = []; // stack of knowledge IDs for back navigation
let gxOpen = false;

// ── Public API ────────────────────────────────────────────────────

/**
 * Open the graph explorer for a given knowledge ID.
 * Can be called from search results, knowledge cards, or anywhere.
 */
async function openGraphExplorer(knowledgeId) {
  injectGraphStyles();
  ensureGraphDOM();

  gxHistory = [knowledgeId];
  gxOpen = true;

  document.getElementById('gx-overlay').classList.add('open');
  document.getElementById('gx-panel').classList.add('open');
  document.body.style.overflow = 'hidden';

  await loadGraphNode(knowledgeId);
}

function closeGraphExplorer() {
  gxOpen = false;
  gxHistory = [];
  const overlay = document.getElementById('gx-overlay');
  const panel = document.getElementById('gx-panel');
  if (overlay) overlay.classList.remove('open');
  if (panel) panel.classList.remove('open');
  document.body.style.overflow = '';
}

// ── Ensure DOM exists ─────────────────────────────────────────────
function ensureGraphDOM() {
  if (document.getElementById('gx-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'gx-overlay';
  overlay.className = 'gx-overlay';
  overlay.addEventListener('click', closeGraphExplorer);
  document.body.appendChild(overlay);

  const panel = document.createElement('div');
  panel.id = 'gx-panel';
  panel.className = 'gx-panel';
  panel.innerHTML = `
    <div class="gx-header">
      <button class="gx-back-btn" id="gx-back-btn" title="Go back" disabled>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 1L3 7L9 13" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div>
        <div class="gx-header-title">Knowledge Graph</div>
        <div class="gx-header-subtitle" id="gx-header-subtitle">Exploring connections</div>
      </div>
      <button class="gx-close-btn" id="gx-close-btn">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 1L13 13M13 1L1 13" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
    <div class="gx-breadcrumbs" id="gx-breadcrumbs"></div>
    <div class="gx-body" id="gx-body">
      <div class="gx-loading">Loading graph...</div>
    </div>
  `;
  document.body.appendChild(panel);

  // Bind events
  document.getElementById('gx-close-btn').addEventListener('click', closeGraphExplorer);
  document.getElementById('gx-back-btn').addEventListener('click', gxGoBack);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && gxOpen) closeGraphExplorer();
  });
}

// ── Navigate to a node ────────────────────────────────────────────
async function gxNavigateTo(knowledgeId) {
  gxHistory.push(knowledgeId);
  await loadGraphNode(knowledgeId);
}

function gxGoBack() {
  if (gxHistory.length <= 1) return;
  gxHistory.pop();
  const prevId = gxHistory[gxHistory.length - 1];
  loadGraphNode(prevId);
}

function gxJumpTo(index) {
  if (index >= gxHistory.length - 1) return;
  gxHistory = gxHistory.slice(0, index + 1);
  loadGraphNode(gxHistory[gxHistory.length - 1]);
}

// ── Load and render a graph node ──────────────────────────────────
async function loadGraphNode(knowledgeId) {
  const body = document.getElementById('gx-body');
  const backBtn = document.getElementById('gx-back-btn');
  const subtitle = document.getElementById('gx-header-subtitle');

  body.innerHTML = '<div class="gx-loading">Loading graph...</div>';
  backBtn.disabled = gxHistory.length <= 1;

  // Fetch graph data
  const graphData = await api(`/knowledge/${encodeURIComponent(knowledgeId)}/graph`);

  if (!graphData || !graphData.root) {
    body.innerHTML = `
      <div class="gx-no-connections">
        <svg class="gx-no-connections-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 2v4m0 12v4m-10-10h4m12 0h4" stroke-linecap="round"/>
        </svg>
        <div>Could not load graph data for this item</div>
      </div>
    `;
    return;
  }

  subtitle.textContent = `Depth ${graphData.nodes.length} node${graphData.nodes.length !== 1 ? 's' : ''}${graphData.maxDepthReached ? ' (depth limit reached)' : ''}`;

  renderBreadcrumbs();
  renderGraphBody(body, graphData, knowledgeId);
}

// ── Breadcrumbs ───────────────────────────────────────────────────
function renderBreadcrumbs() {
  const container = document.getElementById('gx-breadcrumbs');
  if (!container) return;

  container.innerHTML = gxHistory.map((id, i) => {
    const isCurrent = i === gxHistory.length - 1;
    const shortId = id.length > 16 ? id.slice(0, 16) + '…' : id;
    return `
      ${i > 0 ? '<span class="gx-crumb-sep">→</span>' : ''}
      <button class="gx-crumb ${isCurrent ? 'current' : ''}" data-crumb-index="${i}">${shortId}</button>
    `;
  }).join('');

  container.querySelectorAll('.gx-crumb:not(.current)').forEach(btn => {
    btn.addEventListener('click', () => {
      gxJumpTo(parseInt(btn.dataset.crumbIndex, 10));
    });
  });
}

// ── Render the full graph body ────────────────────────────────────
function renderGraphBody(body, graphData, focusId) {
  const rootNode = graphData.nodes.find(n => n.id === focusId);
  const root = rootNode || { id: graphData.root.id, type: graphData.root.type, content: graphData.root.content, confidence: 1, edges: [] };

  // Group edges by relationship, separating outgoing vs incoming
  const connections = [];
  const seenIds = new Set();
  seenIds.add(focusId);

  const edges = root.edges || [];
  for (const edge of edges) {
    const isOutgoing = edge.from_id === focusId;
    const connectedId = isOutgoing ? edge.to_id : edge.from_id;
    if (seenIds.has(connectedId)) continue;
    seenIds.add(connectedId);

    // Find the connected node in graph data
    const connectedNode = graphData.nodes.find(n => n.id === connectedId);

    connections.push({
      edge,
      direction: isOutgoing ? 'outgoing' : 'incoming',
      node: connectedNode || null,
      relationship: edge.relationship,
      strength: edge.strength,
    });
  }

  // Group by relationship
  const relGroups = {};
  const REL_LABELS = {
    derives_from: 'Derives From',
    leads_to: 'Leads To',
    supports: 'Supports',
    contradicts: 'Contradicts',
    refines: 'Refines',
    supersedes: 'Supersedes',
  };

  for (const conn of connections) {
    const key = conn.relationship;
    if (!relGroups[key]) relGroups[key] = [];
    relGroups[key].push(conn);
  }

  // Check if this is a discovery with a reasoning chain
  const isDiscovery = root.type === 'discovery';
  const chainNodes = isDiscovery ? graphData.nodes
    .filter(n => n.id !== focusId && n.depth !== undefined)
    .sort((a, b) => a.depth - b.depth) : [];

  body.innerHTML = `
    ${renderFocusCard(root)}

    ${isDiscovery && chainNodes.length > 0 ? `
      <div class="gx-section-label">
        <span>Reasoning Chain</span>
        <span class="gx-section-count">${chainNodes.length} steps</span>
        <div class="gx-section-line"></div>
      </div>
      <div class="gx-chain">
        ${chainNodes.map(n => `
          <div class="gx-chain-node" data-depth="${n.depth}" data-node-id="${escapeHtml(n.id)}">
            <div class="gx-chain-content">${escapeHtml(n.content)}</div>
            <div class="gx-chain-meta">
              <span class="gx-node-type" data-type="${escapeHtml(n.type)}">${escapeHtml(n.type)}</span>
              <span class="gx-depth-badge">depth ${n.depth}</span>
            </div>
          </div>
        `).join('')}
      </div>
    ` : ''}

    <div class="gx-section-label">
      <span>Connections</span>
      <span class="gx-section-count">${connections.length}</span>
      <div class="gx-section-line"></div>
    </div>

    ${connections.length === 0 ? `
      <div class="gx-no-connections">
        <svg class="gx-no-connections-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 2v4m0 12v4m-10-10h4m12 0h4" stroke-linecap="round"/>
        </svg>
        <div>No connections found yet</div>
        <div style="font-size: 11px; margin-top: 4px; color: var(--text-tertiary);">
          Connections are created automatically when related knowledge is saved
        </div>
      </div>
    ` : ''}

    ${Object.entries(relGroups).map(([rel, conns]) => `
      <div class="gx-edge-group">
        <span class="gx-edge-group-label" data-rel="${escapeHtml(rel)}">${REL_LABELS[rel] || rel}</span>
        ${conns.map(conn => renderConnectionCard(conn)).join('')}
      </div>
    `).join('')}

    ${graphData.maxDepthReached ? `
      <div style="text-align: center; padding: 16px; color: var(--text-tertiary); font-size: 12px; border-top: 1px solid var(--border); margin-top: 16px;">
        Depth limit reached — deeper connections exist but are not shown
      </div>
    ` : ''}
  `;

  // Bind click handlers on connected nodes
  body.querySelectorAll('.gx-node-card[data-node-id]').forEach(card => {
    card.addEventListener('click', () => {
      const nodeId = card.dataset.nodeId;
      if (nodeId) gxNavigateTo(nodeId);
    });
  });

  // Bind click handlers on chain nodes
  body.querySelectorAll('.gx-chain-node[data-node-id]').forEach(node => {
    node.addEventListener('click', () => {
      const nodeId = node.dataset.nodeId;
      if (nodeId) gxNavigateTo(nodeId);
    });
  });
}

// ── Focus Card (the currently selected node) ──────────────────────
function renderFocusCard(node) {
  return `
    <div class="gx-focus-card">
      <div class="gx-focus-badge">
        <span class="gx-focus-type" data-type="${escapeHtml(node.type)}">${escapeHtml(node.type)}</span>
        <span class="gx-focus-id">${escapeHtml(node.id)}</span>
      </div>
      <div class="gx-focus-content">${escapeHtml(node.content)}</div>
      <div class="gx-focus-meta">
        ${node.confidence !== undefined ? `
          <span class="gx-focus-meta-item">
            <span style="color: var(--accent);">●</span>
            ${Math.round((node.confidence || 1) * 100)}% confidence
          </span>
        ` : ''}
        ${(node.edges || []).length > 0 ? `
          <span class="gx-focus-meta-item">
            ${(node.edges || []).length} edge${(node.edges || []).length !== 1 ? 's' : ''}
          </span>
        ` : ''}
      </div>
    </div>
  `;
}

// ── Connection Card (a node connected to the focus) ───────────────
function renderConnectionCard(conn) {
  const node = conn.node;
  if (!node) {
    // Node not in graph data (maybe beyond depth limit)
    const connectedId = conn.direction === 'outgoing' ? conn.edge.to_id : conn.edge.from_id;
    return `
      <div class="gx-node-card" data-node-id="${escapeHtml(connectedId)}">
        <div class="gx-node-indicator" data-dir="${conn.direction}"></div>
        <div class="gx-node-body">
          <div class="gx-node-top">
            <span class="gx-node-strength">${(conn.strength * 100).toFixed(0)}%</span>
            <span style="color: var(--text-tertiary); font-size: 11px;">${conn.direction === 'outgoing' ? '→' : '←'}</span>
          </div>
          <div class="gx-node-content" style="color: var(--text-tertiary); font-style: italic; font-family: var(--font-mono); font-size: 11px;">
            ${escapeHtml(connectedId)}
          </div>
        </div>
        <svg class="gx-node-arrow" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 1L11 7L5 13" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    `;
  }

  return `
    <div class="gx-node-card" data-node-id="${escapeHtml(node.id)}">
      <div class="gx-node-indicator" data-dir="${conn.direction}"></div>
      <div class="gx-node-body">
        <div class="gx-node-top">
          <span class="gx-node-type" data-type="${escapeHtml(node.type)}">${escapeHtml(node.type)}</span>
          <span class="gx-node-strength">${(conn.strength * 100).toFixed(0)}%</span>
          <span style="color: var(--text-tertiary); font-size: 11px;">${conn.direction === 'outgoing' ? '→' : '←'}</span>
          ${node.depth !== undefined ? `<span class="gx-depth-badge">depth ${node.depth}</span>` : ''}
        </div>
        <div class="gx-node-content">${escapeHtml(node.content)}</div>
      </div>
      <svg class="gx-node-arrow" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M5 1L11 7L5 13" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
  `;
}
