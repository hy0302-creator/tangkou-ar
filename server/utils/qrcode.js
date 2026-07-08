const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const config = require('../config');

async function generateQR(contentSlug, contentTitle) {
  const url = `${config.BASE_URL}/ar-viewer.html?content=${encodeURIComponent(contentSlug)}`;

  const qrDir = path.join(config.UPLOADS_DIR, 'qrcodes');
  if (!fs.existsSync(qrDir)) {
    fs.mkdirSync(qrDir, { recursive: true });
  }

  const safeSlug = contentSlug.replace(/[^a-zA-Z0-9_-]/g, '-');
  const fileName = `qr-${safeSlug}.png`;
  const filePath = path.join(qrDir, fileName);

  await QRCode.toFile(filePath, url, {
    width: 400,
    margin: 2,
    color: {
      dark: '#2D6A4F', // 绿色主题（乡村风格）
      light: '#FFFFFF',
    },
  });

  // Also generate a data URL for embedding
  const dataUrl = await QRCode.toDataURL(url, {
    width: 400,
    margin: 2,
    color: {
      dark: '#2D6A4F',
      light: '#FFFFFF',
    },
  });

  return {
    path: `/data/uploads/qrcodes/${fileName}`,
    url: url,
    dataUrl: dataUrl,
  };
}

module.exports = { generateQR };
