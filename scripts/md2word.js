/**
 * Markdown to Word (.doc) 转换器
 * 用法: node scripts/md2word.js docs/交接指南.md 交接指南.doc
 *
 * 生成 HTML 格式的 .doc 文件，Microsoft Word / WPS / LibreOffice 均可打开。
 */
const fs = require('fs');
const path = require('path');

const inputFile = process.argv[2];
const outputFile = process.argv[3] || inputFile.replace(/\.md$/, '.doc');

if (!inputFile) {
  console.log('用法: node scripts/md2word.js <input.md> [output.doc]');
  process.exit(1);
}

const md = fs.readFileSync(inputFile, 'utf8');

// ===== 简易 Markdown → HTML 转换 =====
function md2html(md) {
  let html = md;

  // 转义 HTML 特殊字符（先处理代码块，避免被转义）
  html = html.replace(/&/g, '&amp;');
  html = html.replace(/</g, '&lt;');
  html = html.replace(/>/g, '&gt;');

  // 还原代码块中的转义
  html = html.replace(/&lt;code&gt;/g, '<code>');
  html = html.replace(/&lt;\/code&gt;/g, '</code>');
  html = html.replace(/&lt;pre&gt;/g, '<pre>');
  html = html.replace(/&lt;\/pre&gt;/g, '</pre>');

  // 代码块 ```...```
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre style="background:#f5f5f5;padding:12px;border-radius:6px;font-size:13px;line-height:1.5;overflow-x:auto;"><code>${code.trim()}</code></pre>`;
  });

  // 行内代码 `...`
  html = html.replace(/`([^`]+)`/g, '<code style="background:#f0f0f0;padding:2px 6px;border-radius:3px;font-size:13px;">$1</code>');

  // 标题
  html = html.replace(/^#### (.+)$/gm, '<h4 style="margin:16px 0 8px;color:#2D6A4F;">$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3 style="margin:20px 0 10px;color:#333;">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 style="margin:24px 0 12px;color:#1B4332;border-bottom:2px solid #D4A373;padding-bottom:6px;">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 style="margin:28px 0 16px;color:#1B4332;font-size:24px;">$1</h1>');

  // 水平线
  html = html.replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #ddd;margin:24px 0;">');

  // 粗体 **...**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // 链接 [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
    if (url.startsWith('#')) return `<a href="${url}" style="color:#2D6A4F;">${text}</a>`;
    return `<a href="${url}" style="color:#2D6A4F;">${text}</a>`;
  });

  // 图片
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<p style="text-align:center;"><img src="$2" alt="$1" style="max-width:100%;"></p>');

  // 无序列表
  html = html.replace(/^- (.+)$/gm, '<li style="margin:4px 0;">$1</li>');
  html = html.replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g, '<ul style="margin:8px 0;padding-left:24px;">$1</ul>');

  // 有序列表
  html = html.replace(/^\d+\. (.+)$/gm, '<li style="margin:4px 0;">$1</li>');

  // 引用 >
  html = html.replace(/^> (.+)$/gm, '<blockquote style="border-left:3px solid #D4A373;margin:12px 0;padding:8px 16px;background:#f9f6f0;color:#666;">$1</blockquote>');

  // 表格（简化处理：|...|...|）
  html = html.replace(/(\|[^\n]+\|\n\|[-| ]+\|\n((?:\|[^\n]+\|\n?)+))/g, (_, table) => {
    const rows = table.split('\n').filter(r => r.includes('|') && !r.match(/^\|[-| ]+\|$/));
    const cells = rows.map(r => r.split('|').filter(c => c.trim()).map(c => c.trim()));
    if (cells.length === 0) return '';
    const thead = `<tr style="background:#2D6A4F;color:white;">${cells[0].map(c => `<th style="padding:8px 12px;text-align:left;">${c}</th>`).join('')}</tr>`;
    const tbody = cells.slice(1).map(row =>
      `<tr>${row.map(c => `<td style="padding:8px 12px;border-bottom:1px solid #eee;">${c}</td>`).join('')}</tr>`
    ).join('');
    return `<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:14px;">${thead}${tbody}</table>`;
  });

  // 段落（连续的非空文本行）
  html = html.replace(/^(?!<[hupolbtdc]|$|\s)(.+)$/gm, '<p style="margin:8px 0;line-height:1.8;">$1</p>');

  // 清理多余空行
  html = html.replace(/\n{3,}/g, '\n\n');

  return html;
}

const bodyHtml = md2html(md);

// ===== Word 兼容 HTML 模板 =====
const docHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<!--[if gte mso 9]><xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml><![endif]-->
<style>
@page {
  size: A4;
  margin: 2.54cm 3.18cm 2.54cm 3.18cm;
  mso-header-margin: 1.5cm;
  mso-footer-margin: 1.25cm;
}
body {
  font-family: "Microsoft YaHei", "微软雅黑", "SimSun", "宋体", sans-serif;
  font-size: 14px;
  line-height: 1.8;
  color: #333;
}
h1 { font-size: 22px; color: #1B4332; }
h2 { font-size: 18px; color: #1B4332; border-bottom: 2px solid #D4A373; padding-bottom: 6px; }
h3 { font-size: 15px; color: #333; }
h4 { font-size: 14px; color: #2D6A4F; }
code { font-family: "Courier New", monospace; font-size: 13px; background: #f0f0f0; padding: 2px 6px; }
pre { background: #f5f5f5; padding: 12px; font-size: 13px; line-height: 1.5; }
table { border-collapse: collapse; width: 100%; margin: 12px 0; }
th { background: #2D6A4F; color: white; padding: 8px 12px; text-align: left; }
td { padding: 8px 12px; border-bottom: 1px solid #eee; }
a { color: #2D6A4F; }
blockquote { border-left: 3px solid #D4A373; margin: 12px 0; padding: 8px 16px; background: #f9f6f0; color: #666; }
hr { border: none; border-top: 1px solid #ddd; margin: 24px 0; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;

// Write .doc file (Word opens HTML with .doc extension)
fs.writeFileSync(outputFile, docHtml, 'utf8');

const sizeKB = Math.round(fs.statSync(outputFile).size / 1024);
console.log(`✅ 转换完成: ${path.basename(outputFile)} (${sizeKB} KB)`);
console.log(`   双击用 Word 或 WPS 打开即可。`);
