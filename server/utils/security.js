/**
 * 安全策略配置
 * CSP + Helmet + 生产安全头
 *
 * CSP设计说明：
 * - 'unsafe-inline' 用于内联onclick/style（AR viewer必需）
 * - 'wasm-unsafe-eval' 用于 mindAR WebAssembly 图像跟踪
 * - blob: 用于 mindAR Web Worker
 * - CDN源 用于 Three.js + mindAR 库加载
 */
const helmet = require('helmet');

// ======================== CSP 策略 ========================
// 按指令分组，确保每条指令的源列表完整
const CSP = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'",      // HTML onclick/onerror等内联处理器
    "'wasm-unsafe-eval'",    // mindAR WebAssembly
    'https://cdn.jsdelivr.net',  // Three.js + mindAR CDN
    'https://cdnjs.cloudflare.com',
    'blob:',                 // mindAR worker脚本
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'",       // HTML内联style属性（AR viewer大量使用）
    'https://cdn.jsdelivr.net',
  ],
  'img-src': [
    "'self'",
    'data:',                 // QR码内嵌base64图
    'blob:',
  ],
  'media-src': [
    "'self'",
    'data:',
    'blob:',                 // 音频blob
    'mediastream:',          // 摄像头流（AR模式）
  ],
  'font-src': [
    "'self'",
    'data:',
  ],
  'connect-src': [
    "'self'",
    'https://cdn.jsdelivr.net',  // ES模块动态导入
    'blob:',
    'wss:',                  // WebSocket（如需要）
  ],
  'worker-src': [
    "'self'",
    'blob:',                 // mindAR Web Worker
  ],
  'frame-src': ["'none'"],          // 禁止被iframe嵌入
  'frame-ancestors': ["'self'"],    // 仅允许同源iframe
  'object-src': ["'none'"],         // 禁止Flash/ActiveX
  'base-uri': ["'self'"],           // 限制<base>标签
  'form-action': ["'self'"],        // 限制表单提交目标
};

// 构建CSP字符串
const CSP_POLICY = Object.entries(CSP)
  .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
  .join('; ');

// ======================== 中间件 ========================
function securityMiddleware() {
  const helmetMiddleware = helmet({
    contentSecurityPolicy: false,        // 手动配置
    crossOriginEmbedderPolicy: false,    // 允许CDN加载
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });

  const cspMiddleware = (req, res, next) => {
    res.setHeader('Content-Security-Policy', CSP_POLICY);
    next();
  };

  return [helmetMiddleware, cspMiddleware];
}

module.exports = { securityMiddleware, CSP_POLICY };
