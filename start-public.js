/**
 * 公网启动脚本 — 先创建公网隧道，再启动服务器（确保二维码指向公网地址）
 *
 * 使用方式：
 *   node start-public.js
 *
 * 启动后会显示公网地址（带 HTTPS），别人可复制该地址访问你的 AR 平台。
 * 关闭终端窗口后公网访问即断开。
 */

const localtunnel = require('localtunnel');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3000;

(async () => {
  // 1. Get LAN IP for fallback
  const lanIp = getLocalIP();
  const envPath = path.join(__dirname, '.env');

  console.log('🔗 正在创建公网隧道（约5-10秒）...\n');

  let publicUrl = null;

  try {
    const tunnel = await localtunnel({
      port: PORT,
    });

    publicUrl = tunnel.url;
    console.log('✅ 隧道创建成功:', publicUrl);

    // 2. Update .env with public URL BEFORE starting server
    //    This ensures QR codes and API responses use the correct public URL
    let envContent = fs.readFileSync(envPath, 'utf8');
    if (envContent.includes('BASE_URL=')) {
      envContent = envContent.replace(/BASE_URL=.*(\r?\n|$)/, `BASE_URL=${publicUrl}\n`);
    } else {
      envContent += `\nBASE_URL=${publicUrl}\n`;
    }
    fs.writeFileSync(envPath, envContent);
    console.log('✅ 已更新 BASE_URL 为公网地址\n');

    // 3. Start the server (it will read the updated .env)
    const server = spawn('node', ['server/index.js'], {
      cwd: __dirname,
      stdio: 'inherit',
      env: { ...process.env, BASE_URL: publicUrl },
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 4. Display URLs
    console.log('');
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║       🌾  塘口镇 AR 文化平台 - 公网已上线  🌾        ║');
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log(`║                                                      ║`);
    console.log(`║  🌐 公网地址：${publicUrl}`);
    console.log(`║  📱 手机扫码或直接打开上面的链接                        ║`);
    console.log(`║                                                      ║`);
    console.log(`║  🔧 管理后台：${publicUrl}/admin`);
    console.log(`║     (账号: admin / tangkou2024)                       ║`);
    console.log(`║                                                      ║`);
    if (lanIp) {
      console.log(`║  🏠 局域网：  http://${lanIp}:${PORT}               ║`);
      console.log(`║                                                      ║`);
    }
    console.log(`║  ⚠️  关闭本窗口 = 公网停止访问                        ║`);
    console.log(`║  ⚠️  首次访问会提示输入IP验证（localtunnel安全机制）  ║`);
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log('');

    // Handle tunnel events
    tunnel.on('close', () => {
      console.log('\n⛔ 公网隧道已断开。');
      console.log('💡 服务器仍在运行: http://localhost:' + PORT);
      console.log('   如需恢复公网访问，请重新运行 node start-public.js');
      // Keep server running for local access
    });

    tunnel.on('error', (err) => {
      console.error('⚠️  隧道错误:', err.message);
    });

    // Handle process exit
    process.on('SIGINT', () => {
      console.log('\n🛑 正在关闭...');
      tunnel.close();
      server.kill();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      tunnel.close();
      server.kill();
      process.exit(0);
    });

    // Keep the server alive
    server.on('close', (code) => {
      console.log('服务器已退出 (code:', code, ')');
      tunnel.close();
      process.exit(0);
    });

  } catch (err) {
    console.error('❌ 创建公网隧道失败:', err.message);
    console.log('');
    console.log('💡 可能是网络问题，备选方案：');
    console.log('');

    if (lanIp) {
      console.log('【方案1：局域网访问 - 最简单】');
      console.log('  确保手机和电脑连接同一 WiFi，手机浏览器访问：');
      console.log(`  http://${lanIp}:${PORT}`);
      console.log('');
    }

    console.log('【方案2：使用 ngrok（免费注册）】');
    console.log('  1. 访问 https://ngrok.com 注册账号');
    console.log('  2. 下载 ngrok.exe 放到本目录');
    console.log('  3. 运行：ngrok http 3000');
    console.log('  4. 把显示的 https://xxx.ngrok.io 地址分享出去');
    console.log('');

    console.log('【方案3：部署到云服务器】');
    console.log('  将项目上传到阿里云/腾讯云等云服务器');
    console.log('');

    // Fallback: start server locally
    console.log('现在仅启动本地服务器...');
    require('./server/index.js');
  }
})();

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}
