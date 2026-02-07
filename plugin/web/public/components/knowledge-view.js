async function renderKnowledge(container) {
  container.innerHTML = '<div class="loading">Loading knowledge...</div>';

  const data = await api('/knowledge' + sessionParam(false));

  if (!data || !data.items || data.items.length === 0) {
    container.innerHTML = `
      <h2 class="page-title">Knowledge Base</h2>
      <div class="empty">
        <div class="empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M4 5C4 4.44772 4.44772 4 5 4H19C19.5523 4 20 4.44772 20 5V19C20 19.5523 19.5523 20 19 20H5C4.44772 20 4 19.5523 4 19V5Z"/>
            <path d="M8 8H16M8 12H14" stroke-linecap="round"/>
          </svg>
        </div>
        No knowledge items yet. Use <code style="font-family: var(--font-mono); background: var(--bg-tertiary); padding: 2px 6px; border-radius: 4px; font-size: 12px;">memory_save</code> to store facts, decisions, and preferences.
      </div>
    `;
    return;
  }

  const types = ['all', 'fact', 'decision', 'preference', 'pattern', 'issue', 'context', 'discovery'];

  const filterLabel = activeSessionFilter
    ? `<span style="color: var(--accent); font-size: 14px; font-weight: 500;"> — Session ${getSessionLabel()}</span>`
    : '';

  container.innerHTML = `
    <h2 class="page-title">Knowledge Base${filterLabel}</h2>
    <div class="filters" id="type-filters">
      ${types.map(t => `
        <span class="filter-chip ${t === 'all' ? 'active' : ''}" data-type="${t}">
          ${t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
        </span>
      `).join('')}
    </div>
    <div id="knowledge-list">
      ${renderKnowledgeItems(data.items)}
    </div>
  `;

  // Type filter handling
  let allItems = data.items;
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const type = chip.dataset.type;
      const filtered = type === 'all' ? allItems : allItems.filter(i => i.type === type);
      document.getElementById('knowledge-list').innerHTML = renderKnowledgeItems(filtered);
      bindKnowledgeCardClicks();
    });
  });

  bindKnowledgeCardClicks();
}

function renderKnowledgeItems(items) {
  if (items.length === 0) {
    return '<div class="empty" style="padding: 40px;">No items match this filter</div>';
  }

  return items.map(k => `
    <div class="knowledge-card" data-knowledge-id="${escapeHtml(k.id)}" style="cursor: pointer;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
        <span class="knowledge-type" data-type="${escapeHtml(k.type)}" style="margin-bottom: 0;">${escapeHtml(k.type)}</span>
        <span class="knowledge-graph-btn" title="Explore connections" style="
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          color: var(--text-tertiary);
          padding: 3px 8px;
          border-radius: 4px;
          transition: all 0.15s ease;
          cursor: pointer;
        ">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="8" cy="4" r="2.5"/>
            <circle cx="3" cy="13" r="2.5"/>
            <circle cx="13" cy="13" r="2.5"/>
            <path d="M6.5 6L4.5 10.5M9.5 6L11.5 10.5"/>
          </svg>
          Graph
        </span>
      </div>
      <div class="knowledge-content">${escapeHtml(k.content)}</div>
      <div class="knowledge-footer">
        <div>
          ${(k.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}
        </div>
        <div class="knowledge-meta">
          <span>Confidence: ${Math.round((k.confidence || 1) * 100)}%</span>
          <div class="confidence-bar" style="width: 60px;">
            <div class="confidence-fill" style="width: ${Math.round((k.confidence || 1) * 100)}%;"></div>
          </div>
          <span>${k.created_at ? formatAge(k.created_at) : ''}</span>
        </div>
      </div>
    </div>
  `).join('');
}

function bindKnowledgeCardClicks() {
  document.querySelectorAll('.knowledge-card[data-knowledge-id]').forEach(card => {
    card.addEventListener('click', () => {
      const knId = card.dataset.knowledgeId;
      if (knId && typeof openGraphExplorer === 'function') {
        openGraphExplorer(knId);
      }
    });
  });
}
