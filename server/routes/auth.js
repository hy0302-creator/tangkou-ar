const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const database = require('../utils/database');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '请输入用户名和密码' });
  }

  await database.getDb();
  const user = database.get('SELECT * FROM users WHERE username = ?', [username]);

  if (!user) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    config.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role },
  });
});

// Verify token
router.get('/verify', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.JWT_SECRET);
    res.json({ user: decoded });
  } catch (err) {
    return res.status(401).json({ error: '登录已过期' });
  }
});

// Change password (requires JWT)
router.post('/change-password', async (req, res) => {
  // 手动验证JWT（/api/admin/auth路径跳过全局auth中间件）
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }

  let userId;
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.JWT_SECRET);
    userId = decoded.id;
  } catch (err) {
    return res.status(401).json({ error: '登录已过期' });
  }

  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: '请输入旧密码和新密码' });
  }
  if (newPassword.length < 4) {
    return res.status(400).json({ error: '新密码至少4个字符' });
  }

  await database.getDb();
  const user = database.get('SELECT * FROM users WHERE id = ?', [userId]);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  const valid = await bcrypt.compare(oldPassword, user.password_hash);
  if (!valid) {
    return res.status(400).json({ error: '旧密码错误' });
  }

  const hash = await bcrypt.hash(newPassword, 10);
  database.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);
  res.json({ success: true, message: '密码修改成功' });
});

module.exports = router;
