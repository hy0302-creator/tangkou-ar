const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const database = require('../utils/database');
const { compileTarget } = require('../utils/compiler');
const config = require('../config');
const router = express.Router();

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadDir;
    if (file.fieldname === 'target_image') {
      uploadDir = path.join(config.UPLOADS_DIR, 'targets');
    } else if (file.fieldname === 'model_3d') {
      uploadDir = path.join(config.UPLOADS_DIR, 'models');
    } else if (file.fieldname === 'audio') {
      uploadDir = path.join(config.UPLOADS_DIR, 'audio');
    } else if (file.fieldname === 'thumbnail') {
      uploadDir = path.join(config.UPLOADS_DIR, 'thumbnails');
    } else {
      uploadDir = path.join(config.UPLOADS_DIR, 'targets');
    }

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = uuidv4() + ext;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const allowedImages = ['.jpg', '.jpeg', '.png', '.webp'];
    const allowedModels = ['.glb', '.gltf'];
    const allowedAudio = ['.mp3', '.wav', '.ogg', '.m4a'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (file.fieldname === 'model_3d') {
      if (allowedModels.includes(ext)) return cb(null, true);
      return cb(new Error('3D模型仅支持 .glb, .gltf 格式'));
    }

    if (file.fieldname === 'audio') {
      if (allowedAudio.includes(ext)) return cb(null, true);
      return cb(new Error('音频仅支持 .mp3, .wav, .ogg, .m4a 格式'));
    }

    // target_image: accept images (.jpg/.png) OR pre-compiled .mind files
    if (file.fieldname === 'target_image') {
      if (allowedImages.includes(ext) || ext === '.mind') return cb(null, true);
      return cb(new Error('标记图片仅支持 .jpg, .png, .webp 或 .mind 格式'));
    }

    // thumbnail: images only
    if (allowedImages.includes(ext)) return cb(null, true);
    return cb(new Error('图片仅支持 .jpg, .png, .webp 格式'));
  },
});

// Upload target image or pre-compiled .mind file
router.post('/target', upload.single('target_image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '请选择标记图片或 .mind 文件' });
  }

  const ext = path.extname(req.file.originalname).toLowerCase();
  const contentId = req.body.content_id;
  const relativePath = `/data/uploads/targets/${req.file.filename}`;

  if (ext === '.mind') {
    // Pre-compiled .mind file — save directly as target_mind_path
    if (contentId) {
      await database.getDb();
      database.run('UPDATE ar_contents SET target_mind_path = ? WHERE id = ?', [relativePath, contentId]);
    }

    return res.json({
      path: relativePath,
      filename: req.file.filename,
      size: req.file.size,
      compiled: true,
      compile_message: '已导入 .mind 标记文件，AR识别功能已可用。',
    });
  }

  // Image file — save as target_image, then try to compile
  if (contentId) {
    await database.getDb();
    database.run('UPDATE ar_contents SET target_image_path = ? WHERE id = ?', [relativePath, contentId]);
  }

  // Auto-compile to .mind format
  const imageAbsPath = req.file.path;
  const mindsDir = path.join(config.UPLOADS_DIR, 'targets');
  const compileResult = await compileTarget(imageAbsPath, mindsDir);

  let mindPath = null;
  if (compileResult.success && compileResult.mindPath) {
    const mindFilename = path.basename(compileResult.mindPath);
    mindPath = `/data/uploads/targets/${mindFilename}`;
    if (contentId) {
      database.run('UPDATE ar_contents SET target_mind_path = ? WHERE id = ?', [mindPath, contentId]);
    }
  }

  res.json({
    path: relativePath,
    filename: req.file.filename,
    size: req.file.size,
    mind_path: mindPath,
    compiled: compileResult.success,
    compile_message: compileResult.message,
  });
});

// Upload 3D model
router.post('/model', upload.single('model_3d'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择3D模型文件' });
    }

    const contentId = req.body.content_id;
    if (!contentId) {
      // Clean up orphan file
      const fs = require('fs');
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: '缺少产品ID，上传失败' });
    }

    const relativePath = `/data/uploads/models/${req.file.filename}`;

    await database.getDb();
    const result = database.run('UPDATE ar_contents SET model_3d_path = ? WHERE id = ?', [relativePath, contentId]);
    if (!result.success) {
      console.error('[Upload Model] DB error:', result.error);
      return res.status(500).json({ error: '保存失败，请稍后重试' });
    }

    res.json({
      path: relativePath,
      filename: req.file.filename,
      size: req.file.size,
    });
  } catch (err) {
    console.error('[Upload Model] Unexpected error:', err.message);
    console.error('[Upload Model] Stack:', err.stack);
    return res.status(500).json({ error: '上传失败，请稍后重试' });
  }
});

// Upload audio
router.post('/audio', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '请选择音频文件' });
  }

  const relativePath = `/data/uploads/audio/${req.file.filename}`;
  const contentId = req.body.content_id;

  if (contentId) {
    await database.getDb();
    database.run('UPDATE ar_contents SET audio_path = ? WHERE id = ?', [relativePath, contentId]);
  }

  res.json({
    path: relativePath,
    filename: req.file.filename,
    size: req.file.size,
  });
});

// Upload thumbnail
router.post('/thumbnail', upload.single('thumbnail'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '请选择缩略图' });
  }

  const relativePath = `/data/uploads/thumbnails/${req.file.filename}`;
  const contentId = req.body.content_id;

  if (contentId) {
    await database.getDb();
    database.run('UPDATE ar_contents SET thumbnail_path = ? WHERE id = ?', [relativePath, contentId]);
  }

  res.json({
    path: relativePath,
    filename: req.file.filename,
    size: req.file.size,
  });
});

// Multer error handling — clear messages instead of generic 500
router.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    const maxMB = Math.round(config.MAX_FILE_SIZE / 1024 / 1024);
    return res.status(413).json({ error: `文件过大，最大支持 ${maxMB}MB。请压缩模型后重试。` });
  }
  if (err.message) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

module.exports = router;
