const express = require('express');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const authMiddleware = require('./middleware/auth');
const { getDb, get } = require('./utils/database');
const { securityMiddleware } = require('./utils/security');
const INFO_GENERATOR = require('./utils/info-generator');

// Initialize database
getDb().then(() => {
  console.log('Database initialized');
}).catch(err => {
  console.error('Database init error:', err);
  process.exit(1);
});

const app = express();

// ======================== 安全中间件 ========================
// Helmet + CSP（兼容Three.js/mindAR CDN资源）
app.use(securityMiddleware());

// Gzip/Brotli 压缩
app.use(compression());

// CORS — 生产环境应限制具体域名
let corsOrigin = '*';
try {
  if (config.BASE_URL) corsOrigin = new URL(config.BASE_URL).origin;
} catch (e) { /* keep wildcard */ }
app.use(cors({ origin: corsOrigin, credentials: true }));

// 防止 .env 等敏感文件被访问
app.use((req, res, next) => {
  if (req.path.match(/\.(env|sqlite|db)$/i)) {
    return res.status(404).send('Not Found');
  }
  next();
});

// Body解析 + 大小限制（防止大payload攻击）
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ======================== 速率限制 ========================
// 全局限制
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 1000,                 // 最多1000请求
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '请求过于频繁，请稍后再试' },
});
app.use(globalLimiter);

// 登录接口严格限制（防暴力破解）
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '登录尝试过于频繁，请15分钟后再试' },
});
app.use('/api/admin/auth/login', authLimiter);
app.use('/api/admin/auth/verify', authLimiter);

// ======================== 认证中间件 ========================
app.use(authMiddleware);

// ======================== 静态文件 ========================
// 上传文件（3D模型/图片等不可变资源 → 长缓存）
app.use('/data/uploads', express.static(config.UPLOADS_DIR, {
  maxAge: '30d',
  immutable: true,
  dotfiles: 'deny',
}));
// 公开文件（HTML/CSS/JS → 短缓存，通过?v=版本号更新）
app.use(express.static(config.PUBLIC_DIR, {
  maxAge: '1d',
  dotfiles: 'deny',
  setHeaders: (res, filePath) => {
    // 图片和字体长缓存
    if (/\.(jpg|jpeg|png|webp|gif|ico|woff2?)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    }
  },
}));

// Admin SPA — express.static handles /admin→/admin/ redirect automatically
app.use('/admin', express.static(config.ADMIN_DIR, {
  maxAge: '1h',
  dotfiles: 'deny',
  index: 'index.html',
}));

// ======================== 业务API ========================
// 自动生成详细介绍
app.post('/api/admin/contents/generate-info', async (req, res) => {
  try {
    const { title, description, category_id } = req.body;
    if (!title) return res.status(400).json({ error: '标题不能为空' });

    await getDb();
    let categorySlug = '', categoryName = '';
    if (category_id) {
      const cat = get('SELECT slug, name FROM categories WHERE id = ?', [category_id]);
      if (cat) { categorySlug = cat.slug; categoryName = cat.name; }
    }

    const infoHtml = INFO_GENERATOR.generate({
      title: title.trim(),
      description: (description || '').trim(),
      categorySlug, categoryName,
    });
    res.json({ info_html: infoHtml.trim() });
  } catch (err) {
    console.error('Generate info error:', err);
    res.status(500).json({ error: '生成失败，请稍后重试' });
  }
});

// 子路由
app.use('/api/admin/auth', require('./routes/auth'));
app.use('/api/admin/categories', require('./routes/categories'));
app.use('/api/admin/contents', require('./routes/contents'));
app.use('/api/admin/upload', require('./routes/upload'));
app.use('/api/public', require('./routes/public'));

// ======================== SPA回退 ========================
app.get('/', (req, res) => {
  res.sendFile(path.join(config.PUBLIC_DIR, 'index.html'));
});

// Favicon — avoid 404 noise in browser console
app.get('/favicon.ico', (req, res) => res.status(204).end());

// ======================== 404 & 错误处理 ========================
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: '接口不存在' });
  } else {
    res.status(404).sendFile(path.join(config.PUBLIC_DIR, '404.html'));
  }
});

// 全局错误处理（不泄漏堆栈信息）
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: '请求体过大' });
  }
  res.status(500).json({ error: '服务器内部错误' });
});

// ======================== 启动 ========================
app.listen(config.PORT, () => {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  🌾 塘口镇 AR 文化平台 v1.0              ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  🏠 首页:    ${config.BASE_URL}`);
  console.log(`║  ⚙️  后台:    ${config.BASE_URL}/admin`);
  console.log(`║  🔒 CSP:     已启用`);
  console.log(`║  🗜️  压缩:    已启用 (gzip/brotli)`);
  console.log(`║  🛡️  限速:    已启用`);
  console.log('╚══════════════════════════════════════════╝');
});
