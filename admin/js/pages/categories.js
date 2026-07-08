/**
 * Categories CRUD page logic.
 */
const CategoriesPage = {
  async load() {
    document.getElementById('btnAddCategory').onclick = () => this.showForm();
    await this.refreshTable();
  },

  async refreshTable() {
    const tbody = document.querySelector('#categoriesTable tbody');
    try {
      const categories = await API.getCategories();
      tbody.innerHTML = categories.map(c => `
        <tr>
          <td>${c.id}</td>
          <td style="font-size:24px;">${c.icon || '📦'}</td>
          <td><strong>${c.name}</strong></td>
          <td><code>${c.slug}</code></td>
          <td>${c.description || '-'}</td>
          <td>${c.sort_order || 0}</td>
          <td>
            <button class="btn btn-outline btn-sm" onclick="CategoriesPage.showForm(${c.id})">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="CategoriesPage.deleteItem(${c.id})">🗑️</button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      Utils.showToast('加载分类失败: ' + err.message, 'error');
    }
  },

  async showForm(id = null) {
    let cat = null;
    if (id) {
      try { cat = await API.getCategory(id); } catch (e) { /* ignore */ }
    }

    const isEdit = !!cat;
    Utils.openModal(`
      <h3>${isEdit ? '编辑' : '新增'} 分类</h3>
      <div class="form-group">
        <label>名称 *</label>
        <input type="text" id="fName" value="${this._esc(cat?.name || '')}" placeholder="如：农特产品">
      </div>
      <div class="form-group">
        <label>标识 (slug) *</label>
        <input type="text" id="fSlug" value="${this._esc(cat?.slug || '')}" placeholder="如：farm-products">
      </div>
      <div class="form-group">
        <label>图标 (emoji)</label>
        <input type="text" id="fIcon" value="${this._esc(cat?.icon || '📦')}">
      </div>
      <div class="form-group">
        <label>描述</label>
        <textarea id="fDesc">${this._esc(cat?.description || '')}</textarea>
      </div>
      <div class="form-group">
        <label>排序</label>
        <input type="number" id="fSort" value="${cat?.sort_order || 0}">
      </div>
      <div class="form-actions">
        <button class="btn btn-outline" onclick="Utils.closeModal()">取消</button>
        <button class="btn btn-primary" id="btnSaveCat">${isEdit ? '保存' : '创建'}</button>
      </div>
    `);

    document.getElementById('btnSaveCat').onclick = async () => {
      const data = {
        name: document.getElementById('fName').value.trim(),
        slug: document.getElementById('fSlug').value.trim(),
        icon: document.getElementById('fIcon').value.trim(),
        description: document.getElementById('fDesc').value.trim(),
        sort_order: parseInt(document.getElementById('fSort').value) || 0,
      };
      if (!data.name || !data.slug) {
        return Utils.showToast('名称和标识不能为空', 'error');
      }
      try {
        if (id) {
          await API.updateCategory(id, data);
          Utils.showToast('分类已更新');
        } else {
          await API.createCategory(data);
          Utils.showToast('分类已创建');
        }
        Utils.closeModal();
        await this.refreshTable();
      } catch (err) {
        Utils.showToast(err.message, 'error');
      }
    };
  },

  async deleteItem(id) {
    if (!confirm('确定删除此分类？分类下的 AR 内容将变为无分类状态。')) return;
    try {
      await API.deleteCategory(id);
      Utils.showToast('已删除');
      await this.refreshTable();
    } catch (err) {
      Utils.showToast(err.message, 'error');
    }
  },

  _esc(s) {
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },
};
