/**
 * 批量压缩所有现有3D模型
 * 运行: node scripts/compress-models.js
 */
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, '..', 'data', 'uploads', 'models');

async function main() {
  const files = fs.readdirSync(MODELS_DIR).filter(f => f.endsWith('.glb') || f.endsWith('.gltf'));
  console.log(`找到 ${files.length} 个模型文件\n`);

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const input = path.join(MODELS_DIR, f);
    const tmp = input + '.tmp';
    const before = fs.statSync(input).size;

    // 小于2MB跳过
    if (before < 2 * 1024 * 1024) {
      console.log(`[${i+1}/${files.length}] ${f.substring(0,20)}... ${(before/1024/1024).toFixed(1)}MB — 跳过（已很小）`);
      continue;
    }

    console.log(`[${i+1}/${files.length}] 压缩中: ${f.substring(0,20)}... ${(before/1024/1024).toFixed(1)}MB`);

    await new Promise((resolve) => {
      exec(`npx --yes @gltf-transform/cli draco "${input}" "${tmp}"`, { timeout: 300000 }, (err) => {
        if (err) {
          console.log(`  ⚠️ 压缩失败: ${err.message.substring(0, 80)}`);
          if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
          return resolve();
        }

        try {
          const after = fs.statSync(tmp).size;
          const pct = (100 - (after / before) * 100).toFixed(0);

          if (after >= before) {
            fs.unlinkSync(tmp);
            console.log(`  📦 已是最优: ${(before/1024/1024).toFixed(1)}MB`);
          } else {
            fs.unlinkSync(input);
            fs.renameSync(tmp, input);
            console.log(`  ✅ ${(before/1024/1024).toFixed(1)}MB → ${(after/1024/1024).toFixed(1)}MB (减小${pct}%)`);
          }
        } catch (e) {
          console.log(`  ⚠️ 后处理失败: ${e.message}`);
        }
        resolve();
      });
    });
  }

  console.log('\n🎉 批量压缩完成！');
}

main().catch(err => { console.error(err); process.exit(1); });
