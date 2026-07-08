/**
 * 3D模型自动优化器
 * 上传 GLB/GLTF 时自动执行 Draco 压缩和纹理优化
 */
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * 使用 gltf-transform 压缩模型
 * @param {string} inputPath  - 原始模型路径
 * @param {string} outputPath - 压缩后输出路径
 * @returns {Promise<{success: boolean, originalSize: number, compressedSize: number, message: string}>}
 */
function optimizeModel(inputPath, outputPath) {
  return new Promise((resolve) => {
    const originalSize = fs.statSync(inputPath).size;

    // 如果模型小于 2MB，跳过压缩
    if (originalSize < 2 * 1024 * 1024) {
      return resolve({
        success: true,
        originalSize,
        compressedSize: originalSize,
        message: '模型较小，无需压缩',
      });
    }

    const cmd = [
      'npx --yes @gltf-transform/cli draco',
      `"${inputPath}"`,
      `"${outputPath}"`,
    ].join(' ');

    console.log('[Optimizer] Compressing model...');

    exec(cmd, { timeout: 120000 }, (err, stdout, stderr) => {
      if (err) {
        console.error('[Optimizer] Compression failed:', err.message);
        // 压缩失败不影响上传，返回原文件
        return resolve({
          success: false,
          originalSize,
          compressedSize: originalSize,
          message: '模型压缩失败，已保留原始文件',
        });
      }

      try {
        const compressedSize = fs.statSync(outputPath).size;
        const ratio = (100 - (compressedSize / originalSize) * 100).toFixed(0);

        // 如果压缩后反而更大，使用原文件
        if (compressedSize >= originalSize) {
          fs.unlinkSync(outputPath);
          return resolve({
            success: true,
            originalSize,
            compressedSize: originalSize,
            message: '模型已是最优大小',
          });
        }

        // 用压缩版替换原文件
        fs.unlinkSync(inputPath);
        fs.renameSync(outputPath, inputPath);

        console.log(`[Optimizer] Compressed: ${(originalSize/1024/1024).toFixed(1)}MB → ${(compressedSize/1024/1024).toFixed(1)}MB (${ratio}%)`);
        resolve({
          success: true,
          originalSize,
          compressedSize,
          message: `压缩成功，减小 ${ratio}%（${(originalSize/1024/1024).toFixed(1)}MB → ${(compressedSize/1024/1024).toFixed(1)}MB）`,
        });
      } catch (e) {
        console.error('[Optimizer] Post-compression error:', e.message);
        resolve({
          success: false,
          originalSize,
          compressedSize: originalSize,
          message: '压缩后处理失败，已保留原始文件',
        });
      }
    });
  });
}

module.exports = { optimizeModel };
