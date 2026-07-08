/**
 * Admin API client — wraps fetch with JWT auth.
 */
const API = {
  _token: localStorage.getItem('tk_ar_token') || '',

  setToken(token) {
    this._token = token;
    localStorage.setItem('tk_ar_token', token);
  },

  clearToken() {
    this._token = '';
    localStorage.removeItem('tk_ar_token');
  },

  getToken() {
    return this._token;
  },

  async _fetch(url, options = {}) {
    const headers = {
      ...(options.headers || {}),
    };
    if (this._token) {
      headers['Authorization'] = `Bearer ${this._token}`;
    }
    // Don't set Content-Type for FormData (browser sets it with boundary)
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
      this.clearToken();
      window.location.hash = '#login';
      throw new Error('登录已过期');
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `请求失败 (${res.status})`);
    }
    return data;
  },

  // Auth
  login(username, password) {
    return this._fetch('/api/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },
  verify() {
    return this._fetch('/api/admin/auth/verify');
  },
  changePassword(oldPassword, newPassword) {
    return this._fetch('/api/admin/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword }),
    });
  },

  // Contents
  getContents() {
    return this._fetch('/api/admin/contents');
  },
  getContent(id) {
    return this._fetch(`/api/admin/contents/${id}`);
  },
  createContent(data) {
    return this._fetch('/api/admin/contents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateContent(id, data) {
    return this._fetch(`/api/admin/contents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  deleteContent(id) {
    return this._fetch(`/api/admin/contents/${id}`, { method: 'DELETE' });
  },
  generateQR(id) {
    return this._fetch(`/api/admin/contents/${id}/qrcode`, { method: 'POST' });
  },
  compileTarget(id) {
    return this._fetch(`/api/admin/contents/${id}/compile`, { method: 'POST' });
  },
  generateInfo(title, description, categoryId) {
    return this._fetch('/api/admin/contents/generate-info', {
      method: 'POST',
      body: JSON.stringify({ title, description, category_id: categoryId }),
    });
  },

  // Categories
  getCategories() {
    return this._fetch('/api/admin/categories');
  },
  getCategory(id) {
    return this._fetch(`/api/admin/categories/${id}`);
  },
  createCategory(data) {
    return this._fetch('/api/admin/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateCategory(id, data) {
    return this._fetch(`/api/admin/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  deleteCategory(id) {
    return this._fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
  },

  // Upload
  uploadTarget(file, contentId) {
    const form = new FormData();
    form.append('target_image', file);
    if (contentId) form.append('content_id', contentId);
    return this._fetch('/api/admin/upload/target', {
      method: 'POST',
      body: form,
    });
  },
  uploadModel(file, contentId) {
    const form = new FormData();
    form.append('model_3d', file);
    if (contentId) form.append('content_id', contentId);
    return this._fetch('/api/admin/upload/model', {
      method: 'POST',
      body: form,
    });
  },
  uploadAudio(file, contentId) {
    const form = new FormData();
    form.append('audio', file);
    if (contentId) form.append('content_id', contentId);
    return this._fetch('/api/admin/upload/audio', {
      method: 'POST',
      body: form,
    });
  },
  uploadThumbnail(file, contentId) {
    const form = new FormData();
    form.append('thumbnail', file);
    if (contentId) form.append('content_id', contentId);
    return this._fetch('/api/admin/upload/thumbnail', {
      method: 'POST',
      body: form,
    });
  },
};
