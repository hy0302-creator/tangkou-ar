/**
 * Admin UI utilities.
 */
const Utils = {
  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  },

  openModal(html) {
    const overlay = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');
    content.innerHTML = html;
    overlay.style.display = 'flex';
    overlay.addEventListener('click', function handler(e) {
      if (e.target === overlay) {
        overlay.style.display = 'none';
        overlay.removeEventListener('click', handler);
      }
    });
  },

  closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
  },

  slugify(text) {
    return text
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-')
      .replace(/^-+|-+$/g, '');
  },

  formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  },

  statusBadge(published) {
    return published
      ? '<span class="badge badge-published">已发布</span>'
      : '<span class="badge badge-draft">草稿</span>';
  },

  fileInfo(path) {
    if (!path) return '<span style="color:#ccc;">未上传</span>';
    const name = path.split('/').pop();
    const ext = name.split('.').pop()?.toUpperCase();
    return `<span style="font-size:12px;color:var(--green);" title="${path}">${ext} ✓</span>`;
  },
};
