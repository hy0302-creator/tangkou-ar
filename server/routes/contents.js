const express = require('express');
const path = require('path');
const fs = require('fs');
const database = require('../utils/database');
const { generateQR } = require('../utils/qrcode');
const { compileTarget } = require('../utils/compiler');
const config = require('../config');
const router = express.Router();

// List all contents (with optional category filter)
router.get('/', async (req, res) => {
  await database.getDb();
  const { category_id, published_only } = req.query;

  let sql = `
    SELECT ac.*, c.name as category_name, c.icon as category_icon
    FROM ar_contents ac
    LEFT JOIN categories c ON ac.category_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (category_id) {
    sql += ' AND ac.category_id = ?';
    params.push(category_id);
  }
  if (published_only === '1') {
    sql += ' AND ac.is_published = 1';
  }

  sql += ' ORDER BY ac.created_at DESC';
  const contents = database.all(sql, params);
  res.json(contents);
});

// Get one content
router.get('/:id', async (req, res) => {
  await database.getDb();
  const content = database.get(
    `SELECT ac.*, c.name as category_name, c.icon as category_icon
     FROM ar_contents ac
     LEFT JOIN categories c ON ac.category_id = c.id
     WHERE ac.id = ?`,
    [req.params.id]
  );
  if (!content) return res.status(404).json({ error: '内容不存在' });
  res.json(content);
});

// Create
router.post('/', async (req, res) => {
  const {
    title, slug, description, category_id,
    model_scale, model_position, info_html, video_url, is_published
  } = req.body;

  if (!title || !slug) {
    return res.status(400).json({ error: '标题和标识不能为空' });
  }

  await database.getDb();

  const existing = database.get('SELECT id FROM ar_contents WHERE slug = ?', [slug]);
  if (existing) {
    return res.status(400).json({ error: '此标识已被使用' });
  }

  const result = database.run(
    `INSERT INTO ar_contents (title, slug, description, category_id, model_scale, model_position, info_html, video_url, is_published)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      title, slug, description || '', category_id || null,
      model_scale || '{"x":1,"y":1,"z":1}',
      model_position || '{"x":0,"y":0,"z":0}',
      info_html || '', video_url || '', is_published || 0
    ]
  );

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  const content = database.get('SELECT * FROM ar_contents WHERE slug = ?', [slug]);
  res.status(201).json(content);
});

// Update
router.put('/:id', async (req, res) => {
  await database.getDb();
  const content = database.get('SELECT * FROM ar_contents WHERE id = ?', [req.params.id]);
  if (!content) return res.status(404).json({ error: '内容不存在' });

  const fields = ['title', 'slug', 'description', 'category_id', 'model_scale', 'model_position', 'info_html', 'video_url', 'is_published'];
  const sets = [];
  const params = [];

  for (const f of fields) {
    if (req.body[f] !== undefined) {
      // category_id: empty string → NULL
      if (f === 'category_id' && req.body[f] === '') {
        sets.push('category_id = NULL');
      } else {
        sets.push(`${f} = ?`);
        params.push(req.body[f]);
      }
    }
  }

  sets.push("updated_at = datetime('now', '+8 hours')");

  if (sets.length > 0) {
    params.push(req.params.id);
    database.run(`UPDATE ar_contents SET ${sets.join(', ')} WHERE id = ?`, params);
  }

  const updated = database.get('SELECT * FROM ar_contents WHERE id = ?', [req.params.id]);
  res.json(updated);
});

// Delete
router.delete('/:id', async (req, res) => {
  await database.getDb();
  const content = database.get('SELECT * FROM ar_contents WHERE id = ?', [req.params.id]);
  if (!content) return res.status(404).json({ error: '内容不存在' });

  // Delete associated files
  const fileFields = ['target_image_path', 'target_mind_path', 'model_3d_path', 'audio_path', 'thumbnail_path', 'qr_code_path'];
  for (const f of fileFields) {
    if (content[f]) {
      const filePath = path.join(config.ROOT_DIR, content[f].replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }

  database.run('DELETE FROM ar_contents WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// Generate QR Code
router.post('/:id/qrcode', async (req, res) => {
  await database.getDb();
  const content = database.get('SELECT * FROM ar_contents WHERE id = ?', [req.params.id]);
  if (!content) return res.status(404).json({ error: '内容不存在' });

  try {
    const qr = await generateQR(content.slug, content.title);
    database.run('UPDATE ar_contents SET qr_code_path = ? WHERE id = ?', [qr.path, req.params.id]);
    res.json({ qr_code_path: qr.path, qr_url: qr.url, qr_dataurl: qr.dataUrl });
  } catch (err) {
    res.status(500).json({ error: '二维码生成失败: ' + err.message });
  }
});

// Compile target image to .mind (manual trigger)
router.post('/:id/compile', async (req, res) => {
  await database.getDb();
  const content = database.get('SELECT * FROM ar_contents WHERE id = ?', [req.params.id]);
  if (!content) return res.status(404).json({ error: '内容不存在' });

  if (!content.target_image_path) {
    return res.status(400).json({ error: '请先上传标记图片' });
  }

  const imageAbsPath = path.join(config.ROOT_DIR, content.target_image_path.replace(/^\//, ''));
  if (!fs.existsSync(imageAbsPath)) {
    return res.status(400).json({ error: '标记图片文件不存在，请重新上传' });
  }

  const mindsDir = path.join(config.UPLOADS_DIR, 'targets');
  const result = await compileTarget(imageAbsPath, mindsDir);

  if (result.success && result.mindPath) {
    const mindFilename = path.basename(result.mindPath);
    const mindPath = `/data/uploads/targets/${mindFilename}`;
    database.run('UPDATE ar_contents SET target_mind_path = ? WHERE id = ?', [mindPath, req.params.id]);
    res.json({ success: true, mind_path: mindPath, message: result.message });
  } else {
    res.json({ success: false, message: result.message });
  }
});

// Increment view count
router.post('/:id/view', async (req, res) => {
  await database.getDb();
  database.run('UPDATE ar_contents SET view_count = view_count + 1 WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
