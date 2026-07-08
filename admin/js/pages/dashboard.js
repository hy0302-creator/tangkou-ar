/**
 * Dashboard page logic.
 */
const DashboardPage = {
  async load() {
    try {
      const [contents, categories] = await Promise.all([
        API.getContents(),
        API.getCategories(),
      ]);

      const total = contents.length;
      const published = contents.filter(c => c.is_published).length;
      const totalViews = contents.reduce((sum, c) => sum + (c.view_count || 0), 0);

      const el = (id) => document.getElementById(id);
      if (el('statTotal')) el('statTotal').textContent = total;
      if (el('statPublished')) el('statPublished').textContent = published;
      if (el('statViews')) el('statViews').textContent = totalViews;
      if (el('statCats')) el('statCats').textContent = categories.length;
    } catch (err) {
      Utils.showToast('加载数据失败: ' + err.message, 'error');
    }
  },
};
