/**
 * UI Utilities — modal, toast, and helper functions.
 */
const UI = {
  // Escape HTML to prevent XSS
  _esc(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  /**
   * Show a QR code modal for a content item.
   */
  showQRModal(content) {
    // Remove existing modal if any
    const existing = document.querySelector('.modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    let qrContent;
    if (content.qr_code_path) {
      qrContent = `<img src="${this._esc(content.qr_code_path)}" alt="QR Code" class="modal-qr">`;
    } else {
      qrContent = `<div class="modal-qr" style="width:240px;height:240px;background:#f0f0f0;display:flex;align-items:center;justify-content:center;margin:0 auto;border-radius:12px;color:#999;">二维码<br>尚未生成</div>`;
    }

    const safeSlug = encodeURIComponent(content.slug);
    overlay.innerHTML = `
      <div class="modal" onclick="event.stopPropagation()">
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
        <h3>${this._esc(content.category_icon || '')} ${this._esc(content.title)}</h3>
        <p>扫描二维码开始 AR 体验</p>
        ${qrContent}
        <p style="font-size:12px;color:#999;margin-top:8px;">或点击下方按钮直接体验</p>
        <a href="ar-viewer.html?content=${safeSlug}" class="btn btn-primary" style="display:inline-block;margin-top:8px;" onclick="event.stopPropagation();">
          📱 直接体验
        </a>
      </div>
    `;

    // Close overlay on background click (not on modal content)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
  },

  /**
   * Get HTML for a category tab button.
   */
  getCategoryTabHTML(cat, isActive) {
    return `
      <button class="cat-tab ${isActive ? 'active' : ''}" data-slug="${this._esc(cat.slug)}">
        ${this._esc(cat.icon)} ${this._esc(cat.name)}
        <span style="font-size:12px;opacity:0.7;">(${cat.content_count || 0})</span>
      </button>
    `;
  },

  /**
   * Get HTML for a content card.
   */
  getContentCardHTML(content) {
    const safeTitle = this._esc(content.title);
    const safeThumb = content.thumbnail_path ? this._esc(content.thumbnail_path) : '';
    const safeSlug = encodeURIComponent(content.slug);

    const thumb = content.thumbnail_path
      ? `<img src="${safeThumb}" alt="${safeTitle}">`
      : `<span>${this._esc(content.category_icon || '📦')}</span>`;

    return `
      <div class="content-card" data-slug="${this._esc(content.slug)}">
        <div class="card-img">
          ${thumb}
          ${content.category_name ? `<span class="card-category">${this._esc(content.category_name)}</span>` : ''}
        </div>
        <div class="card-body">
          <h3>${safeTitle}</h3>
          <p>${this._esc(content.description) || '暂无描述'}</p>
          <div class="card-actions">
            <a href="ar-viewer.html?content=${safeSlug}" class="btn btn-primary">📱 体验 AR</a>
            <button class="btn btn-outline qr-btn" data-slug="${this._esc(content.slug)}">📷 扫码</button>
          </div>
        </div>
      </div>
    `;
  },
};
