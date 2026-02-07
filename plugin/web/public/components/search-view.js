async function renderSearch(container) {
  container.innerHTML = `
    <h2 class="page-title">Search Memory</h2>
    <div class="search-bar">
      <input type="text" class="search-input" id="search-input" placeholder="Search observations, knowledge, sessions..." autofocus>
      <select id="search-type">
        <option value="all">All types</option>
        <option value="observations">Observations</option>
        <option value="knowledge">Knowledge</option>
        <option value="sessions">Sessions</option>
        <option value="conversations">Conversations</option>
      </select>
      <button class="btn" id="search-btn">Search</button>
    </div>
    <div id="search-results"></div>
  `;

  const input = document.getElementById('search-input');
  const typeSelect = document.getElementById('search-type');
  const btn = document.getElementById('search-btn');
  const results = document.getElementById('search-results');

  async function doSearch() {
    const query = input.value.trim();
    if (!query) return;

    results.innerHTML = '<div class="loading">Searching...</div>';

    const type = typeSelect.value;
    const data = await api(`/search?q=${encodeURIComponent(query)}&type=${type}${sessionParam(true)}`);

    if (!data || !data.results || data.results.length === 0) {
      results.innerHTML = `
        <div class="empty">
          <div class="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="11" cy="11" r="8"/><path d="M21 21L16.65 16.65" stroke-linecap="round"/>
            </svg>
          </div>
          No results found for "${escapeHtml(query)}"
        </div>
      `;
      return;
    }

    results.innerHTML = `
      <p style="color: var(--text-tertiary); font-size: 12px; margin-bottom: 14px; font-family: var(--font-mono);">
        ${data.count || data.results.length} result${(data.count || data.results.length) === 1 ? '' : 's'}
      </p>
      <div class="card" style="padding: 0; overflow: hidden;">
        ${data.results.map(r => {
          const isKnowledge = r.type === 'knowledge' || (r.id && r.id.startsWith('kn_'));
          return `
            <div class="result-item ${isKnowledge ? 'result-item-clickable' : ''}" ${isKnowledge ? `data-knowledge-id="${escapeHtml(r.id)}"` : ''}>
              <div class="result-header">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="result-type">${escapeHtml(r.type)}</span>
                  ${isKnowledge ? `
                    <span class="result-graph-hint" title="Click to explore connections">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="8" cy="4" r="2.5"/>
                        <circle cx="3" cy="13" r="2.5"/>
                        <circle cx="13" cy="13" r="2.5"/>
                        <path d="M6.5 6L4.5 10.5M9.5 6L11.5 10.5"/>
                      </svg>
                    </span>
                  ` : ''}
                </div>
                <span class="result-score">${typeof r.score === 'number' ? r.score.toFixed(3) : r.score}</span>
              </div>
              <div class="result-snippet">${escapeHtml(r.snippet)}</div>
              <div class="result-meta">
                <span>${r.timestamp ? formatAge(r.timestamp) : ''}</span>
                ${r.project ? `<span>${escapeHtml(r.project)}</span>` : ''}
                ${(r.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Bind knowledge result clicks to graph explorer
    results.querySelectorAll('.result-item-clickable[data-knowledge-id]').forEach(item => {
      item.addEventListener('click', () => {
        const knId = item.dataset.knowledgeId;
        if (knId && typeof openGraphExplorer === 'function') {
          openGraphExplorer(knId);
        }
      });
    });
  }

  btn.addEventListener('click', doSearch);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch();
  });
}
