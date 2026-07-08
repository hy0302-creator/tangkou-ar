/**
 * mindAR Image Target Compiler
 *
 * Compiles marker images (PNG/JPG) into .mind feature-descriptor files
 * that mindAR uses for image tracking.
 *
 * Uses the official mindAR CLI:
 *   npx @mindar/image-target-compiler -i input.png -o output.mind
 *
 * Online alternative:
 *   https://hiukim.github.io/mind-ar-js-doc/tools/compile
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Compile a target image to .mind format.
 *
 * @param {string} imagePath - Absolute path to the marker image
 * @param {string} outputDir - Directory to write the .mind file into
 * @returns {Promise<{success: boolean, mindPath?: string, message: string}>}
 */
function compileTarget(imagePath, outputDir) {
  return new Promise((resolve) => {
    // Validate input
    if (!fs.existsSync(imagePath)) {
      return resolve({
        success: false,
        message: '标记图片文件不存在，请重新上传',
      });
    }

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate output filename: same basename + .mind
    const baseName = path.basename(imagePath, path.extname(imagePath));
    const outputPath = path.join(outputDir, `${baseName}.mind`);

    // Try mindAR CLI compilation
    const cmd = `npx --yes @mindar/image-target-compiler -i "${imagePath}" -o "${outputPath}"`;

    console.log('[Compiler] Running:', cmd);

    exec(cmd, { timeout: 60000 }, (err, stdout, stderr) => {
      if (err) {
        console.error('[Compiler] CLI compilation failed:', err.message);
        if (stderr) console.error('[Compiler] stderr:', stderr);

        return resolve({
          success: false,
          message: '自动编译失败，请使用 mindAR 在线编译工具手动编译：\n' +
                   'https://hiukim.github.io/mind-ar-js-doc/tools/compile\n' +
                   '编译后将 .mind 文件上传为标记图片即可。\n' +
                   '（提示：确保已安装 Node.js，或运行 npm install -g @mindar/image-target-compiler）',
        });
      }

      // Verify output file was created
      if (!fs.existsSync(outputPath)) {
        return resolve({
          success: false,
          message: '编译命令已执行但未生成 .mind 文件，请尝试在线编译工具',
        });
      }

      console.log('[Compiler] Successfully compiled:', outputPath);
      if (stdout) console.log('[Compiler] stdout:', stdout);

      resolve({
        success: true,
        mindPath: outputPath,
        message: '标记图片编译成功！AR 识别功能已可用。',
      });
    });
  });
}

module.exports = { compileTarget };
