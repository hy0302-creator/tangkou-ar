/**
 * 修改管理员密码
 * 用法: node scripts/change-password.js 新密码
 */
const bcrypt = require('bcryptjs');
const { getDb, run, closeDb } = require('../server/utils/database');

const newPassword = process.argv[2];

if (!newPassword || newPassword.length < 8) {
  console.log('用法: node scripts/change-password.js 你的新密码');
  console.log('密码至少8个字符，建议包含字母和数字');
  process.exit(1);
}

(async () => {
  await getDb();
  const hash = await bcrypt.hash(newPassword, 10);
  const result = run('UPDATE users SET password_hash = ? WHERE username = ?', [hash, 'admin']);
  closeDb();

  if (result.success) {
    console.log('✅ 密码已修改成功！');
    console.log('   用户名: admin');
    console.log('   新密码: ' + newPassword);
  } else {
    console.log('❌ 修改失败: ' + result.error);
  }
})();
