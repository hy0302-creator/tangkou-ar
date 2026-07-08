/**
 * Landing Page App — loads categories and contents, handles interactions.
 */
(async function () {
  // Load stats
  ContentLoader.getStats().then(stats => {
    document.getElementById('statContents').textContent = stats.content_count;
    document.getElementById('statCategories').textContent = stats.category_count;
    document.getElementById('statViews').textContent = stats.total_views;
  });

  // Load categories
  const categories = await ContentLoader.getCategories();
  const tabsContainer = document.getElementById('categoryTabs');

  // Calculate total for "全部" tab
  const totalCount = categories.reduce((sum, c) => sum + (c.content_count || 0), 0);

  // "All" tab + category tabs
  tabsContainer.innerHTML = `
    ${UI.getCategoryTabHTML({ slug: '', name: '全部', icon: '🌟', content_count: totalCount }, true)}
    ${categories.map(cat => UI.getCategoryTabHTML(cat, false)).join('')}
  `;

  // Load initial contents (all)
  await loadContents('');

  // Tab click handlers
  tabsContainer.addEventListener('click', async (e) => {
    const tab = e.target.closest('.cat-tab');
    if (!tab) return;

    // Update active state
    tabsContainer.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // Load filtered contents
    const slug = tab.dataset.slug || '';
    await loadContents(slug);
  });

  // Card click handlers (delegated)
  document.getElementById('contentGrid').addEventListener('click', (e) => {
    // QR button
    const qrBtn = e.target.closest('.qr-btn');
    if (qrBtn) {
      e.preventDefault();
      const slug = qrBtn.dataset.slug;
      ContentLoader.getContentBySlug(slug).then(content => {
        if (content) UI.showQRModal(content);
      });
      return;
    }

    // Card body click → go to AR viewer
    const card = e.target.closest('.content-card');
    if (card && card.dataset.slug) {
      window.location.href = 'ar-viewer.html?content=' + encodeURIComponent(card.dataset.slug);
    }
  });

  /**
   * Load and render contents for a category.
   */
  async function loadContents(categorySlug) {
    const grid = document.getElementById('contentGrid');
    const loading = document.getElementById('loading');
    const empty = document.getElementById('empty');

    grid.innerHTML = '';
    loading.style.display = 'block';
    empty.style.display = 'none';

    const contents = await ContentLoader.getContents(categorySlug);

    loading.style.display = 'none';

    if (contents.length === 0) {
      empty.style.display = 'block';
      return;
    }

    grid.innerHTML = contents.map(c => UI.getContentCardHTML(c)).join('');

    // Re-bind QR button handlers
    grid.querySelectorAll('.qr-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const content = await ContentLoader.getContentBySlug(btn.dataset.slug);
        if (content) UI.showQRModal(content);
      });
    });
  }
})();
