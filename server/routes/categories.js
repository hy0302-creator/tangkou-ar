const express = require('express');
const database = require('../utils/database');
const router = express.Router();

// List all categories
router.get('/', async (req, res) => {
  await database.getDb();
  const categories = database.all('SELECT * FROM categories ORDER BY sort_order ASC, id ASC');
  res.json(categories);
});

// Get one category
router.get('/:id', async (req, res) => {
  await database.getDb();
  const cat = database.get('SELECT * FROM categories WHERE id = ?', [req.params.id]);
  if (!cat) return res.status(404).json({ error: '分类不存在' });
  res.json(cat);
});

// Create
router.post('/', async (req, res) => {
  const { name, slug, icon, description, sort_order } = req.body;
  if (!name || !slug) {
    return res.status(400).json({ error: '名称和标识不能为空' });
  }

  await database.getDb();
  const result = database.run(
    'INSERT INTO categories (name, slug, icon, description, sort_order) VALUES (?, ?, ?, ?, ?)',
    [name, slug, icon || '📦', description || '', sort_order || 0]
  );

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  const newCat = database.get('SELECT * FROM categories WHERE slug = ?', [slug]);
  res.status(201).json(newCat);
});

// Update
router.put('/:id', async (req, res) => {
  const { name, slug, icon, description, sort_order } = req.body;
  await database.getDb();

  const cat = database.get('SELECT * FROM categories WHERE id = ?', [req.params.id]);
  if (!cat) return res.status(404).json({ error: '分类不存在' });

  database.run(
    `UPDATE categories SET name=?, slug=?, icon=?, description=?, sort_order=? WHERE id=?`,
    [name || cat.name, slug || cat.slug, icon || cat.icon, description ?? cat.description, sort_order ?? cat.sort_order, req.params.id]
  );

  const updated = database.get('SELECT * FROM categories WHERE id = ?', [req.params.id]);
  res.json(updated);
});

// Delete
router.delete('/:id', async (req, res) => {
  await database.getDb();
  database.run('DELETE FROM categories WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
