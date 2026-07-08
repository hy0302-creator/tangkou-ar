/**
 * Contents CRUD page logic.
 */
const ContentsPage = {
  async load() {
    document.getElementById('btnAddContent').onclick = () => this.showForm();
    await this.refreshTable();
  },

  async refreshTable() {
    const tbody = document.querySelector('#contentsTable tbody');
    try {
      const contents = await API.getContents();
      const categories = await API.getCategories();

      tbody.innerHTML = contents.map(c => {
        const cat = categories.find(cat => cat.id === c.category_id);
        const markerStatus = c.target_mind_path
          ? '<span style="color:#27ae60;">✅ AR可用</span>'
          : (c.target_image_path
            ? '<span style="color:#e67e22;">⚠️ 待编译</span>'
            : '<span style="color:#999;">— 未上传</span>');
        return `
          <tr>
            <td>${c.id}</td>
            <td><strong>${c.title}</strong></td>
            <td>${cat ? cat.icon + ' ' + cat.name : '-'}</td>
            <td>
              模型: ${Utils.fileInfo(c.model_3d_path)}<br>
              标记: ${markerStatus}
            </td>
            <td>${Utils.statusBadge(c.is_published)}</td>
            <td>${c.view_count || 0}</td>
            <td>
              <button class="btn btn-outline btn-sm" onclick="ContentsPage.showForm(${c.id})">✏️</button>
              <button class="btn btn-outline btn-sm" onclick="ContentsPage.uploadFiles(${c.id})" title="上传文件">📁</button>
              ${c.target_image_path && !c.target_mind_path ? `<button class="btn btn-outline btn-sm" onclick="ContentsPage.compileTarget(${c.id})" title="编译标记" style="color:#e67e22;">🔧</button>` : ''}
              <button class="btn btn-outline btn-sm" onclick="ContentsPage.generateQR(${c.id})" title="生成二维码">📷</button>
              <button class="btn btn-danger btn-sm" onclick="ContentsPage.deleteItem(${c.id})">🗑️</button>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      Utils.showToast('加载内容失败: ' + err.message, 'error');
    }
  },

  async showForm(id = null) {
    const categories = await API.getCategories();
    let content = null;
    if (id) {
      try { content = await API.getContent(id); } catch (e) { /* ignore */ }
    }

    const isEdit = !!content;
    const title = content?.title || '';
    const slug = content?.slug || '';
    const desc = content?.description || '';
    const info = content?.info_html || '';
    const video = content?.video_url || '';
    const published = content?.is_published || 0;
    const catId = content?.category_id || '';
    const modelScale = content?.model_scale || '{"x":1,"y":1,"z":1}';
    const modelPos = content?.model_position || '{"x":0,"y":0,"z":0}';

    Utils.openModal(`
      <h3>${isEdit ? '编辑' : '新增'} AR 内容</h3>
      <div class="form-group">
        <label>标题 *</label>
        <input type="text" id="fTitle" value="${this._esc(title)}" placeholder="如：塘口大米">
      </div>
      <div class="form-group">
        <label>标识 (slug) *</label>
        <input type="text" id="fSlug" value="${this._esc(slug)}" placeholder="如：tangkou-rice">
      </div>
      <div class="form-group">
        <label>描述</label>
        <textarea id="fDesc">${this._esc(desc)}</textarea>
      </div>
      <div class="form-group">
        <label>分类</label>
        <select id="fCat">${categories.map(c => `<option value="${c.id}" ${c.id == catId ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('')}<option value="">无分类</option></select>
      </div>
      <div class="form-group">
        <label>详细介绍 (HTML)
          <button type="button" class="btn btn-outline btn-sm" id="btnGenerateInfo" style="margin-left:12px;font-size:13px;padding:4px 14px;">🤖 自动生成详细介绍</button>
        </label>
        <textarea id="fInfo" style="min-height:120px;">${this._esc(info)}</textarea>
        <small style="color:#888;">填写标题和描述后，点击"自动生成"按钮即可生成详细介绍。生成后仍可手动编辑。</small>
      </div>
      <div class="form-group">
        <label>视频链接 (可选)</label>
        <input type="text" id="fVideo" value="${this._esc(video)}">
      </div>
      <div class="form-group" style="display:flex;gap:12px;">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
          <input type="checkbox" id="fPublished" ${published ? 'checked' : ''}> 发布
        </label>
      </div>
      <div class="form-actions">
        <button class="btn btn-outline" onclick="Utils.closeModal()">取消</button>
        <button class="btn btn-primary" id="btnSaveContent">${isEdit ? '保存' : '创建'}</button>
      </div>
    `);

    document.getElementById('btnSaveContent').onclick = async () => {
      await this._save(id);
    };

    // 自动生成详细介绍按钮
    document.getElementById('btnGenerateInfo').onclick = async () => {
      const title = document.getElementById('fTitle').value.trim();
      const desc = document.getElementById('fDesc').value.trim();
      const catId = document.getElementById('fCat').value;

      if (!title) {
        Utils.showToast('请先填写标题', 'error');
        return;
      }

      const btn = document.getElementById('btnGenerateInfo');
      btn.disabled = true;
      btn.textContent = '⏳ 生成中...';

      try {
        const result = await API.generateInfo(title, desc, catId);
        document.getElementById('fInfo').value = result.info_html;
        Utils.showToast('✅ 详细介绍已自动生成！您可以继续编辑修改。');
      } catch (err) {
        Utils.showToast('生成失败: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = '🤖 自动生成详细介绍';
      }
    };
  },

  async _save(id) {
    const data = {
      title: document.getElementById('fTitle').value.trim(),
      slug: document.getElementById('fSlug').value.trim(),
      description: document.getElementById('fDesc').value.trim(),
      category_id: document.getElementById('fCat').value || null,
      info_html: document.getElementById('fInfo').value.trim(),
      video_url: document.getElementById('fVideo').value.trim(),
      is_published: document.getElementById('fPublished').checked ? 1 : 0,
    };

    if (!data.title || !data.slug) {
      return Utils.showToast('标题和标识不能为空', 'error');
    }

    try {
      if (id) {
        await API.updateContent(id, data);
        Utils.showToast('内容已更新');
      } else {
        await API.createContent(data);
        Utils.showToast('内容已创建');
      }
      Utils.closeModal();
      await this.refreshTable();
    } catch (err) {
      Utils.showToast(err.message, 'error');
    }
  },

  uploadFiles(id) {
    Utils.openModal(`
      <h3>上传文件</h3>
      <div class="form-group">
        <label>AR 标记图片 (jpg/png) 或已编译的 .mind 文件</label>
        <input type="file" id="fTarget" accept="image/*,.mind">
        <small style="color:#888;">支持上传原图自动编译，或直接上传 mindAR 在线编译器生成的 .mind 文件</small>
      </div>
      <div class="form-group">
        <label>3D 模型 (.glb/.gltf)</label>
        <input type="file" id="fModel" accept=".glb,.gltf">
      </div>
      <div class="form-group">
        <label>语音导览 (mp3/wav)</label>
        <input type="file" id="fAudio" accept="audio/*">
      </div>
      <div class="form-group">
        <label>缩略图</label>
        <input type="file" id="fThumb" accept="image/*">
      </div>
      <div class="form-actions">
        <button class="btn btn-outline" onclick="Utils.closeModal()">关闭</button>
        <button class="btn btn-primary" id="btnUpload">上传</button>
      </div>
    `);

    document.getElementById('btnUpload').onclick = async () => {
      const target = document.getElementById('fTarget').files[0];
      const model = document.getElementById('fModel').files[0];
      const audio = document.getElementById('fAudio').files[0];
      const thumb = document.getElementById('fThumb').files[0];

      if (!target && !model && !audio && !thumb) {
        return Utils.showToast('请选择至少一个文件', 'error');
      }

      try {
        if (target) {
          const result = await API.uploadTarget(target, id);
          if (result.compiled) {
            Utils.showToast('✅ 标记图片已上传并自动编译成功！');
          } else {
            Utils.showToast('⚠️ 标记图片已上传，但自动编译失败。可稍后点击🔧按钮重新编译。');
          }
        }
        if (model) { await API.uploadModel(model, id); Utils.showToast('3D模型已上传'); }
        if (audio) { await API.uploadAudio(audio, id); Utils.showToast('音频已上传'); }
        if (thumb) { await API.uploadThumbnail(thumb, id); Utils.showToast('缩略图已上传'); }
        Utils.closeModal();
        await this.refreshTable();
      } catch (err) {
        Utils.showToast(err.message, 'error');
      }
    };
  },

  async generateQR(id) {
    try {
      await API.generateQR(id);
      Utils.showToast('二维码已生成');
      await this.refreshTable();
    } catch (err) {
      Utils.showToast(err.message, 'error');
    }
  },

  async compileTarget(id) {
    Utils.showToast('正在编译标记图片...');
    try {
      const result = await API.compileTarget(id);
      if (result.success) {
        Utils.showToast('✅ 标记图片编译成功！AR识别功能已可用。');
      } else {
        Utils.showToast('⚠️ ' + result.message, 'error');
      }
      await this.refreshTable();
    } catch (err) {
      Utils.showToast('编译失败: ' + err.message, 'error');
    }
  },

  async deleteItem(id) {
    if (!confirm('确定删除此 AR 内容吗？此操作不可恢复。')) return;
    try {
      await API.deleteContent(id);
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
