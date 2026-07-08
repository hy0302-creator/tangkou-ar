/**
 * QR Code management page.
 */
const QRCodesPage = {
  async load() {
    document.getElementById('btnGenerateAllQR').onclick = () => this.generateAll();
    await this.refresh();
  },

  async refresh() {
    const grid = document.getElementById('qrGrid');
    try {
      const contents = await API.getContents();
      grid.innerHTML = contents.map(c => `
        <div class="qr-card">
          <h4>${c.title}</h4>
          <p>${c.description || ''}</p>
          ${c.qr_code_path
            ? `<img src="${c.qr_code_path}" alt="QR" style="max-width:160px;"><br>
               <div class="qr-url">${window.location.origin}/ar-viewer.html?content=${encodeURIComponent(c.slug)}</div>
               <a href="${window.location.origin}/ar-viewer.html?content=${encodeURIComponent(c.slug)}" target="_blank" class="btn btn-outline btn-sm">📱 预览</a>`
            : `<div style="padding:40px;color:#ccc;">未生成二维码</div>
               <button class="btn btn-primary btn-sm" onclick="QRCodesPage.generateOne(${c.id})">🔧 生成</button>`
          }
        </div>
      `).join('');
    } catch (err) {
      Utils.showToast('加载失败: ' + err.message, 'error');
    }
  },

  async generateOne(id) {
    try {
      await API.generateQR(id);
      Utils.showToast('二维码已生成');
      await this.refresh();
    } catch (err) {
      Utils.showToast(err.message, 'error');
    }
  },

  async generateAll() {
    if (!confirm('将为所有内容生成二维码，已有二维码的将重新生成。确定继续？')) return;
    try {
      const contents = await API.getContents();
      for (const c of contents) {
        await API.generateQR(c.id);
      }
      Utils.showToast(`已为 ${contents.length} 个内容生成二维码`);
      await this.refresh();
    } catch (err) {
      Utils.showToast(err.message, 'error');
    }
  },
};
