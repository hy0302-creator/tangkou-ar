const express = require('express');
const database = require('../utils/database');
const router = express.Router();

// Get all published contents for frontend display
router.get('/contents', async (req, res) => {
  await database.getDb();
  const { category_slug } = req.query;

  let sql = `
    SELECT ac.*, c.name as category_name, c.slug as category_slug, c.icon as category_icon
    FROM ar_contents ac
    LEFT JOIN categories c ON ac.category_id = c.id
    WHERE ac.is_published = 1
  `;
  const params = [];

  if (category_slug) {
    sql += ' AND c.slug = ?';
    params.push(category_slug);
  }

  sql += ' ORDER BY ac.created_at DESC';
  const contents = database.all(sql, params);
  res.json(contents);
});

// Get single content by slug (for AR viewer deep link / QR modal preview)
// Note: view count is NOT incremented here — call POST /:slug/view to count a real AR view
router.get('/contents/:slug', async (req, res) => {
  await database.getDb();
  const content = database.get(
    `SELECT ac.*, c.name as category_name, c.slug as category_slug, c.icon as category_icon
     FROM ar_contents ac
     LEFT JOIN categories c ON ac.category_id = c.id
     WHERE ac.slug = ? AND ac.is_published = 1`,
    [req.params.slug]
  );

  if (!content) {
    return res.status(404).json({ error: '内容不存在' });
  }

  res.json(content);
});

// Record a real AR view (called when user actually opens the AR viewer)
router.post('/contents/:slug/view', async (req, res) => {
  await database.getDb();
  const content = database.get('SELECT id FROM ar_contents WHERE slug = ? AND is_published = 1', [req.params.slug]);
  if (!content) {
    return res.status(404).json({ error: '内容不存在' });
  }
  database.run('UPDATE ar_contents SET view_count = view_count + 1 WHERE slug = ?', [req.params.slug]);
  res.json({ success: true });
});

// Get all categories
router.get('/categories', async (req, res) => {
  await database.getDb();
  const categories = database.all(
    `SELECT c.*, COUNT(ac.id) as content_count
     FROM categories c
     LEFT JOIN ar_contents ac ON ac.category_id = c.id AND ac.is_published = 1
     GROUP BY c.id
     ORDER BY c.sort_order ASC`
  );
  res.json(categories);
});

// Get stats for homepage
router.get('/stats', async (req, res) => {
  await database.getDb();
  const contentCount = database.get('SELECT COUNT(*) as count FROM ar_contents WHERE is_published = 1');
  const totalViews = database.get('SELECT SUM(view_count) as total FROM ar_contents');
  const categoryCount = database.get('SELECT COUNT(*) as count FROM categories');

  res.json({
    content_count: contentCount?.count || 0,
    total_views: totalViews?.total || 0,
    category_count: categoryCount?.count || 0,
  });
});

module.exports = router;
