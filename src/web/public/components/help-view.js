// Engram — Help View
// Comprehensive in-app guide generated from capabilities

async function renderHelp(container) {
  // Inject scoped CSS
  if (!document.getElementById('help-view-css')) {
    const style = document.createElement('style');
    style.id = 'help-view-css';
    style.textContent = `
      .help-wrap {
        max-width: 960px;
        margin: 0 auto;
        padding: 2rem 1.5rem 4rem;
      }

      .help-header {
        margin-bottom: 2.5rem;
      }
      .help-header h1 {
        font-size: 1.75rem;
        font-weight: 600;
        margin: 0 0 0.5rem;
      }
      .help-header p {
        color: var(--text-secondary);
        font-size: 0.95rem;
        margin: 0;
        line-height: 1.5;
      }

      /* ── Search ─────────────────────────────── */
      .help-search-bar {
        position: relative;
        margin-bottom: 2rem;
      }
      .help-search-bar input {
        width: 100%;
        padding: 0.75rem 1rem 0.75rem 2.5rem;
        background: var(--bg-secondary);
        border: 1.5px solid var(--border);
        border-radius: 10px;
        color: var(--text-primary);
        font-size: 0.95rem;
        font-family: inherit;
        outline: none;
        transition: border-color 0.2s;
        box-sizing: border-box;
      }
      .help-search-bar input:focus {
        border-color: var(--accent);
      }
      .help-search-bar input::placeholder { color: var(--text-secondary); opacity: 0.6; }
      .help-search-bar .help-search-icon {
        position: absolute;
        left: 0.85rem;
        top: 50%;
        transform: translateY(-50%);
        color: var(--text-secondary);
        opacity: 0.5;
        pointer-events: none;
      }

      /* ── Table of Contents ─────────────────── */
      .help-toc {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 0.5rem;
        margin-bottom: 2.5rem;
        padding: 1.25rem;
        background: var(--bg-secondary);
        border-radius: 12px;
        border: 1px solid var(--border);
      }
      .help-toc-link {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.4rem 0.6rem;
        border-radius: 6px;
        color: var(--text-secondary);
        text-decoration: none;
        font-size: 0.85rem;
        transition: background 0.15s, color 0.15s;
        cursor: pointer;
      }
      .help-toc-link:hover {
        background: var(--bg-tertiary, rgba(255,255,255,0.05));
        color: var(--accent);
      }
      .help-toc-link .toc-dot {
        width: 6px; height: 6px;
        border-radius: 50%;
        background: var(--accent);
        opacity: 0.5;
        flex-shrink: 0;
      }

      /* ── Sections ──────────────────────────── */
      .help-section {
        margin-bottom: 2.5rem;
        padding-bottom: 2rem;
        border-bottom: 1px solid var(--border);
        scroll-margin-top: 80px;
      }
      .help-section:last-child {
        border-bottom: none;
      }
      .help-section[data-hidden="true"] {
        display: none;
      }
      .help-section-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 1.25rem;
        cursor: pointer;
        user-select: none;
      }
      .help-section-header:hover .help-section-title {
        color: var(--accent);
      }
      .help-section-icon {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.1rem;
        flex-shrink: 0;
      }
      .help-section-title {
        font-size: 1.2rem;
        font-weight: 600;
        margin: 0;
        transition: color 0.15s;
      }
      .help-section-body {
        padding-left: 0;
      }
      .help-section-body p {
        color: var(--text-secondary);
        font-size: 0.9rem;
        line-height: 1.65;
        margin: 0 0 1rem;
      }
      .help-section-body p:last-child { margin-bottom: 0; }

      /* ── Cards grid ────────────────────────── */
      .help-cards {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 0.75rem;
        margin-top: 1rem;
      }
      .help-card {
        background: var(--bg-secondary);
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 1rem 1.15rem;
        transition: border-color 0.2s, transform 0.15s;
      }
      .help-card:hover {
        border-color: var(--accent);
        transform: translateY(-1px);
      }
      .help-card-name {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.85rem;
        font-weight: 500;
        color: var(--accent);
        margin-bottom: 0.35rem;
      }
      .help-card-desc {
        font-size: 0.82rem;
        color: var(--text-secondary);
        line-height: 1.5;
        margin: 0;
      }
      .help-card-params {
        margin-top: 0.6rem;
        display: flex;
        flex-wrap: wrap;
        gap: 0.3rem;
      }
      .help-card-param {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.7rem;
        background: var(--bg-tertiary, rgba(255,255,255,0.05));
        color: var(--text-secondary);
        padding: 0.15rem 0.45rem;
        border-radius: 4px;
      }
      .help-card-param.required {
        color: var(--accent);
        background: rgba(242, 101, 34, 0.1);
      }

      /* ── Code blocks ───────────────────────── */
      .help-code {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.82rem;
        background: var(--bg-secondary);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 0.85rem 1rem;
        overflow-x: auto;
        color: var(--text-primary);
        line-height: 1.6;
        margin: 0.75rem 0;
        white-space: pre;
      }

      /* ── Inline code ───────────────────────── */
      .help-section-body code {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.82rem;
        background: var(--bg-secondary);
        padding: 0.15rem 0.4rem;
        border-radius: 4px;
        color: var(--accent);
      }

      /* ── Tables ────────────────────────────── */
      .help-table-wrap {
        overflow-x: auto;
        margin: 0.75rem 0;
        border-radius: 8px;
        border: 1px solid var(--border);
      }
      .help-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.82rem;
      }
      .help-table th {
        text-align: left;
        padding: 0.6rem 0.85rem;
        background: var(--bg-secondary);
        color: var(--text-secondary);
        font-weight: 500;
        border-bottom: 1px solid var(--border);
        white-space: nowrap;
      }
      .help-table td {
        padding: 0.5rem 0.85rem;
        border-bottom: 1px solid var(--border);
        color: var(--text-primary);
        vertical-align: top;
      }
      .help-table tr:last-child td {
        border-bottom: none;
      }
      .help-table td code {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.78rem;
        background: var(--bg-tertiary, rgba(255,255,255,0.05));
        padding: 0.1rem 0.35rem;
        border-radius: 3px;
      }

      /* ── Diagram / ASCII art ───────────────── */
      .help-diagram {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.72rem;
        line-height: 1.45;
        background: var(--bg-secondary);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 1rem 1.25rem;
        overflow-x: auto;
        white-space: pre;
        color: var(--text-secondary);
        margin: 0.75rem 0;
      }
      .help-diagram .hl {
        color: var(--accent);
      }

      /* ── Keyboard shortcut badges ──────────── */
      .help-kbd {
        display: inline-block;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.72rem;
        background: var(--bg-secondary);
        border: 1px solid var(--border);
        border-radius: 4px;
        padding: 0.1rem 0.4rem;
        margin: 0 0.1rem;
        box-shadow: 0 1px 0 var(--border);
      }

      /* ── Collapsible sub-section ───────────── */
      .help-collapse-trigger {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.9rem;
        font-weight: 500;
        color: var(--text-primary);
        cursor: pointer;
        user-select: none;
        padding: 0.4rem 0;
        margin-top: 0.75rem;
      }
      .help-collapse-trigger:hover { color: var(--accent); }
      .help-collapse-trigger .chevron {
        transition: transform 0.2s;
        font-size: 0.7rem;
        opacity: 0.5;
      }
      .help-collapse-trigger.open .chevron {
        transform: rotate(90deg);
      }
      .help-collapse-body {
        display: none;
        padding-left: 0.25rem;
        margin-top: 0.5rem;
      }
      .help-collapse-body.open {
        display: block;
      }

      /* ── Back to top ───────────────────────── */
      .help-back-top {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: var(--accent);
        color: #fff;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 3px 12px rgba(242,101,34,0.3);
        opacity: 0;
        transform: translateY(8px);
        transition: opacity 0.2s, transform 0.2s;
        pointer-events: none;
        z-index: 100;
      }
      .help-back-top.visible {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
      }
      .help-back-top:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(242,101,34,0.45);
      }

      /* ── Highlight from search ─────────────── */
      .help-highlight {
        background: rgba(242, 101, 34, 0.2);
        border-radius: 2px;
        padding: 0 2px;
      }
    `;
    document.head.appendChild(style);
  }

  const sections = buildHelpSections();

  container.innerHTML = `
    <div class="help-wrap">
      <div class="help-header">
        <h1>Engram Help</h1>
        <p>Persistent memory for Claude Code — everything you need to know about your memory system.</p>
      </div>

      <div class="help-search-bar">
        <svg class="help-search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5"/>
          <path d="M11 11L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <input id="help-search" type="text" placeholder="Search help topics..." autocomplete="off" />
      </div>

      <div class="help-toc" id="help-toc">
        ${sections.map(s => `
          <a class="help-toc-link" data-target="${s.id}">
            <span class="toc-dot"></span>
            ${esc(s.title)}
          </a>
        `).join('')}
      </div>

      <div id="help-sections">
        ${sections.map(s => `
          <div class="help-section" id="${s.id}" data-keywords="${esc(s.keywords || '')}">
            <div class="help-section-header" data-section="${s.id}">
              <div class="help-section-icon" style="background:${s.iconBg}">${s.icon}</div>
              <h2 class="help-section-title">${esc(s.title)}</h2>
            </div>
            <div class="help-section-body">${s.html}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <button class="help-back-top" id="help-back-top" title="Back to top">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 13V3M4 7l4-4 4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  `;

  // ── TOC clicks ──
  container.querySelectorAll('.help-toc-link').forEach(link => {
    link.addEventListener('click', () => {
      const target = document.getElementById(link.dataset.target);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // ── Collapsible sub-sections ──
  container.querySelectorAll('.help-collapse-trigger').forEach(trigger => {
    trigger.addEventListener('click', () => {
      trigger.classList.toggle('open');
      const body = trigger.nextElementSibling;
      if (body) body.classList.toggle('open');
    });
  });

  // ── Search filter ──
  const searchInput = document.getElementById('help-search');
  const sectionEls = container.querySelectorAll('.help-section');
  const tocLinks = container.querySelectorAll('.help-toc-link');

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    sectionEls.forEach((sec, i) => {
      if (!q) {
        sec.dataset.hidden = 'false';
        tocLinks[i].style.display = '';
        return;
      }
      const text = sec.textContent.toLowerCase();
      const keywords = (sec.dataset.keywords || '').toLowerCase();
      const match = text.includes(q) || keywords.includes(q);
      sec.dataset.hidden = match ? 'false' : 'true';
      tocLinks[i].style.display = match ? '' : 'none';
    });
  });

  // ── Back to top ──
  const backBtn = document.getElementById('help-back-top');
  const observer = new IntersectionObserver(([entry]) => {
    backBtn.classList.toggle('visible', !entry.isIntersecting);
  }, { threshold: 0 });
  const tocEl = document.getElementById('help-toc');
  if (tocEl) observer.observe(tocEl);

  backBtn.addEventListener('click', () => {
    container.scrollTo ? container.scrollTo({ top: 0, behavior: 'smooth' }) :
      window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function esc(s) { return escapeHtml(s); }

// ── Section definitions ──────────────────────────────────────────────
function buildHelpSections() {
  return [
    {
      id: 'help-overview',
      title: 'Overview',
      icon: '\u{1F9E0}',
      iconBg: 'rgba(242,101,34,0.12)',
      keywords: 'architecture what is engram memory plugin persistent',
      html: `
        <p>Engram gives Claude Code <strong>persistent memory</strong> across sessions, projects, and conversations. Every tool use is captured as an observation, and you can save knowledge explicitly. All data is stored locally in a SQLite database.</p>
        <div class="help-diagram"><span class="hl">Claude Code SDK</span>
  \u2502
  \u251C\u2500\u2500 <span class="hl">6 Hooks</span> (session lifecycle, tool capture, topic shifts)
  \u251C\u2500\u2500 <span class="hl">9 MCP Tools</span> (search, save, timeline, get, forget, stash, resume, stats, resolve)
  \u251C\u2500\u2500 <span class="hl">Observation Buffer</span> + <span class="hl">Curation Agent</span>
  \u251C\u2500\u2500 <span class="hl">Knowledge Graph</span> + <span class="hl">Discovery Engine</span>
  \u251C\u2500\u2500 <span class="hl">Conflict Detection</span>
  \u2514\u2500\u2500 <span class="hl">Web UI</span> at http://127.0.0.1:37820</div>
        <p>Data lives at <code>~/.engram/</code> (override with <code>ENGRAM_DATA_DIR</code> env var). The database uses WAL mode for crash resilience.</p>
      `
    },

    {
      id: 'help-skills',
      title: 'Slash Commands',
      icon: '\u{2F}',
      iconBg: 'rgba(99,179,237,0.12)',
      keywords: 'remember forget recall stash resume checkpoint resolve skills commands',
      html: `
        <p>Type these in the Claude Code prompt. They're the primary way to interact with Engram.</p>
        <div class="help-cards">
          ${skillCard('/remember <content>', 'Save something to memory. Auto-detects type (fact, decision, preference, pattern, issue, context) and suggests tags.')}
          ${skillCard('/forget <what>', 'Delete memories. Searches first, shows matches, confirms before deleting.')}
          ${skillCard('/recall <query>', 'Search all memory types. Shows results grouped by type with the option to fetch deeper detail.')}
          ${skillCard('/stash [label]', 'Park the current conversation for later. Auto-labels from conversation topic if no label given.')}
          ${skillCard('/resume', 'Resume a stashed conversation. Supports: bare (picker), list, search <query>, or <topic> for direct match.')}
          ${skillCard('/checkpoint [label]', 'Create a session save point. Captures observation count, conversation IDs, and last observation reference.')}
          ${skillCard('/resolve', 'Handle memory conflicts. Supports: bare/list (show pending), merge, keep_both, replace, skip.')}
          ${skillCard('/status', 'Show system health dashboard — version, services, dependencies, memory stats, and config.')}
        </div>
      `
    },

    {
      id: 'help-mcp-tools',
      title: 'MCP Tools',
      icon: '\u{1F527}',
      iconBg: 'rgba(72,187,120,0.12)',
      keywords: 'memory_search memory_save memory_timeline memory_get memory_forget memory_stash memory_resume memory_stats memory_resolve tools api',
      html: `
        <p>Nine in-process MCP tools available to Claude during any session. These are what the slash commands call under the hood.</p>

        ${toolSection('memory_search', 'Hybrid FTS5 keyword + vector semantic search across all memory types.', [
          { name: 'query', type: 'string', req: true, desc: 'Keywords, file names, concepts, or natural language' },
          { name: 'type', type: 'enum', req: false, desc: 'all \u00B7 observations \u00B7 knowledge \u00B7 sessions \u00B7 conversations' },
          { name: 'project', type: 'string', req: false, desc: 'Filter by project path' },
          { name: 'tags', type: 'string[]', req: false, desc: 'Filter by tags' },
          { name: 'from_date / to_date', type: 'string', req: false, desc: 'Date range (ISO 8601)' },
          { name: 'limit', type: 'number', req: false, desc: 'Max results (default 20)' },
        ])}

        ${toolSection('memory_save', 'Save a piece of knowledge permanently. Triggers the discovery engine.', [
          { name: 'content', type: 'string', req: true, desc: 'The knowledge to save' },
          { name: 'type', type: 'enum', req: true, desc: 'fact \u00B7 decision \u00B7 preference \u00B7 pattern \u00B7 issue \u00B7 context \u00B7 discovery' },
          { name: 'tags', type: 'string[]', req: false, desc: 'Tags for categorization' },
          { name: 'project', type: 'string', req: false, desc: 'Associated project path' },
          { name: 'source_knowledge_ids', type: 'string[]', req: false, desc: 'Knowledge IDs this derives from' },
        ])}

        ${toolSection('memory_timeline', 'View chronological observations and activity.', [
          { name: 'around', type: 'string', req: false, desc: 'Center on ISO 8601 date' },
          { name: 'session_id', type: 'string', req: false, desc: 'Filter by session' },
          { name: 'conversation_id', type: 'string', req: false, desc: 'Filter by conversation' },
          { name: 'limit', type: 'number', req: false, desc: 'Max results (default 20)' },
        ])}

        ${toolSection('memory_get', 'Fetch full details for specific memory IDs.', [
          { name: 'ids', type: 'string[]', req: true, desc: 'IDs to fetch (obs_, kn_, ses_, conv_, fork_)' },
          { name: 'include_context', type: 'boolean', req: false, desc: 'Include surrounding session context' },
          { name: 'include_graph', type: 'boolean', req: false, desc: 'Include knowledge graph edges and reasoning chains' },
        ])}

        ${toolSection('memory_forget', 'Delete memories for privacy.', [
          { name: 'ids', type: 'string[]', req: false, desc: 'Specific IDs to delete' },
          { name: 'query', type: 'string', req: false, desc: 'Delete memories matching search' },
          { name: 'before_date', type: 'string', req: false, desc: 'Delete before ISO 8601 date' },
        ])}

        ${toolSection('memory_stash', 'List stashed sidebar conversations.', [
          { name: 'list', type: 'boolean', req: false, desc: 'List all stashed sidebars' },
          { name: 'group', type: 'string', req: false, desc: 'Filter by stash group ID' },
        ])}

        ${toolSection('memory_resume', 'Resume a stashed sidebar conversation.', [
          { name: 'conversation_id', type: 'string', req: true, desc: 'Conversation or fork_ ID to resume' },
        ])}

        ${toolSection('memory_stats', 'Get usage analytics.', [
          { name: 'project', type: 'string', req: false, desc: 'Filter stats by project' },
        ])}

        ${toolSection('memory_resolve', 'Resolve a memory conflict.', [
          { name: 'conflict_id', type: 'string', req: true, desc: 'Observation ID of the conflicting memory' },
          { name: 'existing_id', type: 'string', req: false, desc: 'Existing memory it conflicts with' },
          { name: 'action', type: 'enum', req: true, desc: 'merge \u00B7 keep_both \u00B7 replace \u00B7 skip' },
        ])}
      `
    },

    {
      id: 'help-hooks',
      title: 'SDK Hooks',
      icon: '\u{1F517}',
      iconBg: 'rgba(159,122,234,0.12)',
      keywords: 'session start end prompt post tool pre compact hooks lifecycle',
      html: `
        <p>Six hook callbacks registered with the Claude Code SDK. All run in-process \u2014 no shell spawning.</p>
        <div class="help-table-wrap"><table class="help-table">
          <tr><th>Hook</th><th>Trigger</th><th>Blocking</th><th>Purpose</th></tr>
          <tr><td><code>SessionStart</code></td><td>Session startup/resume</td><td>Yes</td><td>Init DB, replay recovery journal, detect project, build context</td></tr>
          <tr><td><code>UserPromptSubmit</code></td><td>Before each prompt</td><td>Yes</td><td>Surface conflicts, detect topic shifts (auto-stash)</td></tr>
          <tr><td><code>PostToolUse</code></td><td>After tool execution</td><td>No (async)</td><td>Capture observation, queue embedding, conflict detection</td></tr>
          <tr><td><code>PreToolUse</code></td><td>Before Bash</td><td>Yes</td><td>Auto-checkpoint before destructive commands</td></tr>
          <tr><td><code>PreCompact</code></td><td>Before context compaction</td><td>Yes</td><td>Save compaction snapshot</td></tr>
          <tr><td><code>SessionEnd</code></td><td>Session termination</td><td>Yes</td><td>Curation, summarization, embedding queue flush</td></tr>
        </table></div>
      `
    },

    {
      id: 'help-knowledge-graph',
      title: 'Knowledge Graph',
      icon: '\u{1F578}\u{FE0F}',
      iconBg: 'rgba(236,201,75,0.12)',
      keywords: 'graph edges connections derives supports contradicts refines supersedes discovery',
      html: `
        <p>A directed graph connecting knowledge items, enabling reasoning chains and automatic discovery.</p>

        <div class="help-collapse-trigger"><span class="chevron">\u25B6</span> Knowledge Types</div>
        <div class="help-collapse-body">
          <div class="help-table-wrap"><table class="help-table">
            <tr><th>Type</th><th>Description</th></tr>
            <tr><td><code>fact</code></td><td>Verified piece of information</td></tr>
            <tr><td><code>decision</code></td><td>A choice that was made</td></tr>
            <tr><td><code>preference</code></td><td>User or project preference</td></tr>
            <tr><td><code>pattern</code></td><td>Recurring pattern or practice</td></tr>
            <tr><td><code>issue</code></td><td>Known problem or bug</td></tr>
            <tr><td><code>context</code></td><td>Background information</td></tr>
            <tr><td><code>discovery</code></td><td>Derived/inferred from combining other knowledge</td></tr>
          </table></div>
        </div>

        <div class="help-collapse-trigger"><span class="chevron">\u25B6</span> Edge Relationships</div>
        <div class="help-collapse-body">
          <div class="help-table-wrap"><table class="help-table">
            <tr><th>Relationship</th><th>Meaning</th></tr>
            <tr><td><code>derives_from</code></td><td>A was derived from B</td></tr>
            <tr><td><code>leads_to</code></td><td>A enables or causes B</td></tr>
            <tr><td><code>supports</code></td><td>A provides evidence for B</td></tr>
            <tr><td><code>contradicts</code></td><td>A conflicts with B</td></tr>
            <tr><td><code>refines</code></td><td>A is more specific than B</td></tr>
            <tr><td><code>supersedes</code></td><td>A replaces B (B is outdated)</td></tr>
          </table></div>
          <p>Each edge has a <strong>strength</strong> value (0.0\u20131.0) indicating confidence.</p>
        </div>

        <div class="help-collapse-trigger"><span class="chevron">\u25B6</span> Graph Traversal</div>
        <div class="help-collapse-body">
          <p>Uses <strong>breadth-first search</strong> from any knowledge node, up to a configurable max depth (default: 5 layers).</p>
          <div class="help-diagram">Root node (depth 0)
  \u251C\u2500\u2500 Direct connections (depth 1)
  \u2502     \u251C\u2500\u2500 derives_from \u2192 Source A
  \u2502     \u251C\u2500\u2500 supports \u2192 Evidence B
  \u2502     \u2514\u2500\u2500 leads_to \u2192 Consequence C
  \u2514\u2500\u2500 Depth 2 connections
        \u251C\u2500\u2500 Source A \u2192 derives_from \u2192 Origin D
        \u2514\u2500\u2500 Consequence C \u2192 leads_to \u2192 Outcome E</div>
        </div>

        <div class="help-collapse-trigger"><span class="chevron">\u25B6</span> Discovery Engine</div>
        <div class="help-collapse-body">
          <p>Fires automatically when knowledge is saved. Links source IDs, searches for related items (&gt;50% similarity), and optionally runs a Haiku subagent to derive new discoveries.</p>
          <div class="help-diagram">New knowledge saved
    \u2502
    \u251C\u2500\u25B6 Link source_knowledge_ids (derives_from edges)
    \u251C\u2500\u25B6 Search related existing knowledge (&gt;50% sim)
    \u2514\u2500\u25B6 Haiku subagent analyzes combinations
         \u251C\u2500\u25B6 No discovery possible \u2192 done
         \u2514\u2500\u25B6 Discovery found!
              \u251C\u2500\u25B6 Create knowledge (type: discovery)
              \u2514\u2500\u25B6 Create derives_from edges to sources</div>
        </div>
      `
    },

    {
      id: 'help-conflict',
      title: 'Conflict Detection',
      icon: '\u{26A0}\u{FE0F}',
      iconBg: 'rgba(245,101,101,0.12)',
      keywords: 'conflict duplicate similar merge keep replace skip resolution',
      html: `
        <p>Detects when a new observation looks similar to an existing memory.</p>
        <div class="help-table-wrap"><table class="help-table">
          <tr><th>Score</th><th>Action</th></tr>
          <tr><td>&gt; 0.95</td><td>Exact duplicate \u2014 silently skip</td></tr>
          <tr><td>&gt; 0.65</td><td>Similar \u2014 flag, prompt user at next prompt</td></tr>
          <tr><td>&lt; 0.65</td><td>No conflict \u2014 proceed normally</td></tr>
        </table></div>
        <p>When a conflict is surfaced, you'll be asked to choose: <code>merge</code>, <code>keep_both</code>, <code>replace</code>, or <code>skip</code>. Conflicts are shown one at a time. The similarity threshold is configurable in Settings.</p>
      `
    },

    {
      id: 'help-curation',
      title: 'Curation Agent',
      icon: '\u{2728}',
      iconBg: 'rgba(72,187,120,0.12)',
      keywords: 'curation agent haiku observation buffer clean keep discard merge extract',
      html: `
        <p>AI-powered observation curation at session end. Uses a Haiku subagent to clean up the observation buffer.</p>
        <div class="help-table-wrap"><table class="help-table">
          <tr><th>Decision</th><th>Meaning</th></tr>
          <tr><td><strong>KEEP</strong></td><td>Meaningful work (edits, architecture decisions)</td></tr>
          <tr><td><strong>DISCARD</strong></td><td>Trivial reads, redundant searches, failed retries</td></tr>
          <tr><td><strong>MERGE</strong></td><td>Related observations (sequential edits to same file)</td></tr>
          <tr><td><strong>EXTRACT</strong></td><td>Derive knowledge (facts, decisions, patterns)</td></tr>
        </table></div>
        <p>Budget cap: <code>$0.02 USD</code> per curation run. Skipped if fewer than 5 observations (configurable). The buffer stages observations in memory before committing them to the database.</p>
      `
    },

    {
      id: 'help-checkpoints',
      title: 'Checkpoints',
      icon: '\u{1F4CC}',
      iconBg: 'rgba(99,179,237,0.12)',
      keywords: 'checkpoint fork save point destructive auto resume branch',
      html: `
        <p>Session save points for recovery and branching. Use <code>/checkpoint</code> to create one manually, or enable <strong>auto-fork</strong> in Settings to automatically checkpoint before destructive Bash commands.</p>
        <div class="help-collapse-trigger"><span class="chevron">\u25B6</span> Destructive patterns detected</div>
        <div class="help-collapse-body">
          <div class="help-table-wrap"><table class="help-table">
            <tr><th>Pattern</th><th>Category</th></tr>
            <tr><td><code>rm -rf</code></td><td>File deletion</td></tr>
            <tr><td><code>git reset --hard</code></td><td>Git destructive</td></tr>
            <tr><td><code>git push --force</code></td><td>Git destructive</td></tr>
            <tr><td><code>git clean -f</code></td><td>Git destructive</td></tr>
            <tr><td><code>drop table / drop database</code></td><td>Database</td></tr>
            <tr><td><code>truncate</code></td><td>Database</td></tr>
          </table></div>
        </div>
        <p>Resume from checkpoint: pass a <code>fork_</code> prefixed ID to <code>/resume</code>.</p>
      `
    },

    {
      id: 'help-search-engine',
      title: 'Search Engine',
      icon: '\u{1F50D}',
      iconBg: 'rgba(237,137,54,0.12)',
      keywords: 'search fts5 vector hybrid embedding scoring weights recency',
      html: `
        <p>Combines four scoring signals into a single ranked result list:</p>
        <div class="help-code">Final Score = (ftsWeight \u00D7 FTS5 keyword match)
           + (vectorWeight \u00D7 cosine similarity)
           + (recencyWeight \u00D7 recency score)
           + (projectAffinityWeight \u00D7 project match)</div>

        <div class="help-collapse-trigger"><span class="chevron">\u25B6</span> Default Weights</div>
        <div class="help-collapse-body">
          <div class="help-table-wrap"><table class="help-table">
            <tr><th>Weight</th><th>Default</th><th>Description</th></tr>
            <tr><td><code>ftsWeight</code></td><td>0.40</td><td>Keyword exact match (FTS5 + Porter stemming)</td></tr>
            <tr><td><code>vectorWeight</code></td><td>0.40</td><td>Semantic similarity (384-dim vectors)</td></tr>
            <tr><td><code>recencyWeight</code></td><td>0.10</td><td>Boost newer results</td></tr>
            <tr><td><code>projectAffinityWeight</code></td><td>0.10</td><td>Boost results from current project</td></tr>
          </table></div>
          <p>Configurable in Settings. Weights should sum to 1.0.</p>
        </div>

        <p>Embeddings are generated locally using <strong>fastembed</strong> (BGE Small EN v1.5, 384 dimensions). If sqlite-vec is unavailable, vector search is disabled and the system falls back to FTS5 + recency scoring.</p>
      `
    },

    {
      id: 'help-topic-shift',
      title: 'Topic Shift Detection',
      icon: '\u{1F500}',
      iconBg: 'rgba(159,122,234,0.12)',
      keywords: 'topic shift detection auto stash conversation switch',
      html: `
        <p>Detects when you switch topics mid-session. Uses five weighted signals:</p>
        <div class="help-table-wrap"><table class="help-table">
          <tr><th>Signal</th><th>Weight</th><th>Description</th></tr>
          <tr><td>File overlap</td><td>0.30</td><td>High overlap = same topic</td></tr>
          <tr><td>Time gap</td><td>0.25</td><td>&lt;30s = continuation, &gt;30min = likely new</td></tr>
          <tr><td>Directory proximity</td><td>0.15</td><td>Working in same dirs = same topic</td></tr>
          <tr><td>Tool pattern change</td><td>0.15</td><td>Code tools \u2192 research tools = shift</td></tr>
          <tr><td>Prompt structure</td><td>0.15</td><td>Short follow-up = continuation, long = new</td></tr>
        </table></div>
        <div class="help-diagram">Score 0.0 \u2500\u2500\u2500\u2500\u2500 0.4 \u2500\u2500\u2500\u2500\u2500 0.85 \u2500\u2500\u2500\u2500\u2500 1.0
  \u2502           \u2502           \u2502             \u2502
  \u2514 <span class="hl">IGNORE</span> \u2500\u2500\u2518           \u2502             \u2502
   (same topic)   <span class="hl">ASK</span> \u2500\u2500\u2500\u2518             \u2502
              (suggest)    <span class="hl">TRUST</span> \u2500\u2500\u2500\u2500\u2518
                         (auto-stash)</div>
        <p>Thresholds adapt per-project based on your feedback (accepted/rejected stash suggestions).</p>
      `
    },

    {
      id: 'help-web-ui',
      title: 'Web UI',
      icon: '\u{1F310}',
      iconBg: 'rgba(66,153,225,0.12)',
      keywords: 'web ui dashboard search timeline knowledge graph settings views',
      html: `
        <p>Served at <code>http://127.0.0.1:37820</code>. Dark/light theme with session filtering.</p>
        <div class="help-cards">
          ${viewCard('Dashboard', 'Stats overview with clickable cards, recent sessions and knowledge, tag cloud, quick actions.')}
          ${viewCard('Search', 'Full-text + semantic search. Knowledge results open the Graph Explorer on click.')}
          ${viewCard('Timeline', 'Interactive chrono-rail. Day/Week/Month zoom. Expand sessions, click observations for detail panel.')}
          ${viewCard('Knowledge', 'Card grid of all knowledge items. Filter by type. Click any card to explore its graph connections.')}
          ${viewCard('Graph Explorer', 'Slide-in panel for navigating knowledge connections. History, breadcrumbs, reasoning chains.')}
          ${viewCard('Settings', 'All configuration with live controls. Capture, search weights, embeddings, curation, checkpoints, graph, danger zone.')}
        </div>
      `
    },

    {
      id: 'help-api',
      title: 'REST API',
      icon: '\u{1F4E1}',
      iconBg: 'rgba(72,187,120,0.12)',
      keywords: 'rest api endpoints http get post delete put config export staging',
      html: `
        <p>All endpoints at <code>/api/</code>. CORS enabled for local development.</p>
        <div class="help-table-wrap"><table class="help-table">
          <tr><th>Method</th><th>Path</th><th>Description</th></tr>
          <tr><td>GET</td><td><code>/api/sessions/active</code></td><td>Currently running sessions</td></tr>
          <tr><td>GET</td><td><code>/api/search?q=&amp;type=</code></td><td>Hybrid search</td></tr>
          <tr><td>GET</td><td><code>/api/sessions?limit=</code></td><td>List sessions</td></tr>
          <tr><td>GET</td><td><code>/api/sessions/:id</code></td><td>Session detail + observations</td></tr>
          <tr><td>GET</td><td><code>/api/knowledge?type=</code></td><td>List knowledge items</td></tr>
          <tr><td>GET</td><td><code>/api/knowledge/:id/graph</code></td><td>Knowledge graph traversal</td></tr>
          <tr><td>GET</td><td><code>/api/conversations</code></td><td>List stashed conversations</td></tr>
          <tr><td>GET</td><td><code>/api/stats</code></td><td>Usage statistics</td></tr>
          <tr><td>GET</td><td><code>/api/config</code></td><td>Current configuration</td></tr>
          <tr><td>GET</td><td><code>/api/staging</code></td><td>Observation buffer contents</td></tr>
          <tr><td>GET</td><td><code>/api/export</code></td><td>Export all data as JSON</td></tr>
          <tr><td>PUT</td><td><code>/api/config</code></td><td>Update configuration</td></tr>
          <tr><td>DELETE</td><td><code>/api/data/all</code></td><td>Factory reset</td></tr>
        </table></div>
      `
    },

    {
      id: 'help-config',
      title: 'Configuration',
      icon: '\u{2699}\u{FE0F}',
      iconBg: 'rgba(160,174,192,0.12)',
      keywords: 'config settings json file defaults data directory',
      html: `
        <p>Settings are stored at <code>~/.engram/settings.json</code>. You can edit them directly or use the Settings page in this UI.</p>
        <div class="help-collapse-trigger"><span class="chevron">\u25B6</span> Full Default Configuration</div>
        <div class="help-collapse-body">
          <div class="help-code">{
  "dataDir": "~/.engram",
  "maxContextTokens": 2000,
  "sessionHistoryDepth": 10,
  "autoCapture": true,
  "webUI": { "enabled": true, "port": 37820 },
  "privacy": {
    "excludePatterns": [".env", "credentials", "secret", ".pem", ".key"]
  },
  "embeddings": {
    "enabled": true, "provider": "fastembed",
    "model": "BGESmallENV15", "batchSize": 10, "dimensions": 384
  },
  "search": {
    "ftsWeight": 0.40, "vectorWeight": 0.40,
    "recencyWeight": 0.10, "projectAffinityWeight": 0.10
  },
  "curation": { "enabled": true, "minObservations": 5, "maxBudgetUsd": 0.02 },
  "checkpoints": { "enabled": true, "autoForkBeforeDestructive": true },
  "buffer": { "checkpointInterval": 20 },
  "conflictDetection": { "enabled": true, "similarityThreshold": 0.65 },
  "knowledgeGraph": { "enabled": true, "maxDepth": 5, "discoveryEnabled": true }
}</div>
        </div>
      `
    },

    {
      id: 'help-keyboard',
      title: 'Keyboard Shortcuts',
      icon: '\u{2328}\u{FE0F}',
      iconBg: 'rgba(203,213,224,0.12)',
      keywords: 'keyboard shortcuts keys navigation accessibility tab enter escape',
      html: `
        <p>The Web UI supports keyboard navigation throughout:</p>
        <div class="help-table-wrap"><table class="help-table">
          <tr><th>Key</th><th>Context</th><th>Action</th></tr>
          <tr><td><span class="help-kbd">Tab</span></td><td>Everywhere</td><td>Move focus between elements</td></tr>
          <tr><td><span class="help-kbd">Enter</span> / <span class="help-kbd">Space</span></td><td>Timeline nodes</td><td>Expand/collapse session</td></tr>
          <tr><td><span class="help-kbd">Escape</span></td><td>Panels</td><td>Close slide-in panels (detail, graph explorer)</td></tr>
          <tr><td><span class="help-kbd">Escape</span></td><td>Dropdowns</td><td>Close session picker</td></tr>
        </table></div>
      `
    },
  ];
}

// ── HTML helpers ──────────────────────────────────────────────────────

function skillCard(name, desc) {
  return `
    <div class="help-card">
      <div class="help-card-name">${escapeHtml(name)}</div>
      <p class="help-card-desc">${escapeHtml(desc)}</p>
    </div>
  `;
}

function viewCard(name, desc) {
  return `
    <div class="help-card">
      <div class="help-card-name">${escapeHtml(name)}</div>
      <p class="help-card-desc">${escapeHtml(desc)}</p>
    </div>
  `;
}

function toolSection(name, desc, params) {
  const rows = params.map(p => `
    <tr>
      <td><code>${escapeHtml(p.name)}</code></td>
      <td>${escapeHtml(p.type)}</td>
      <td>${p.req ? '<span style="color:var(--accent);font-weight:500">required</span>' : 'optional'}</td>
      <td>${escapeHtml(p.desc)}</td>
    </tr>
  `).join('');

  return `
    <div class="help-collapse-trigger"><span class="chevron">\u25B6</span> ${escapeHtml(name)}</div>
    <div class="help-collapse-body">
      <p>${escapeHtml(desc)}</p>
      <div class="help-table-wrap"><table class="help-table">
        <tr><th>Param</th><th>Type</th><th>Required</th><th>Description</th></tr>
        ${rows}
      </table></div>
    </div>
  `;
}
