/**
 * Content Loader — fetches AR content and categories from the API.
 * Shared between the landing page and the AR viewer.
 */
const API_BASE = '/api/public';

const ContentLoader = {
  /**
   * Get all categories with content count.
   */
  async getCategories() {
    try {
      const res = await fetch(`${API_BASE}/categories`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('Failed to load categories:', err);
      return [];
    }
  },

  /**
   * Get published contents, optionally filtered by category_slug.
   */
  async getContents(categorySlug = '') {
    try {
      let url = `${API_BASE}/contents`;
      if (categorySlug) url += `?category_slug=${encodeURIComponent(categorySlug)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('Failed to load contents:', err);
      return [];
    }
  },

  /**
   * Get a single content by slug (for AR viewer deep link).
   */
  async getContentBySlug(slug) {
    try {
      const res = await fetch(`${API_BASE}/contents/${encodeURIComponent(slug)}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.error('Failed to load content:', err);
      return null;
    }
  },

  /**
   * Get platform stats.
   */
  async getStats() {
    try {
      const res = await fetch(`${API_BASE}/stats`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('Failed to load stats:', err);
      return { content_count: 0, total_views: 0, category_count: 0 };
    }
  },

  /**
   * Record a view for a content (called when user opens the AR viewer).
   */
  async recordView(slug) {
    try {
      await fetch(`${API_BASE}/contents/${encodeURIComponent(slug)}/view`, { method: 'POST' });
    } catch (err) {
      // Silently ignore — view counting is non-critical
      console.warn('Failed to record view:', err);
    }
  },
};
