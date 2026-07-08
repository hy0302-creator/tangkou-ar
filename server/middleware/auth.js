const jwt = require('jsonwebtoken');
const config = require('../config');

function authMiddleware(req, res, next) {
  // Public paths — no auth required
  const publicPaths = ['/api/public', '/data/uploads', '/api/admin/auth'];
  if (publicPaths.some(p => req.path.startsWith(p))) {
    return next();
  }

  // Static files (admin panel, public pages)
  if (!req.path.startsWith('/api/admin')) {
    return next();
  }

  // Protected admin API routes
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

module.exports = authMiddleware;
