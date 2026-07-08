/**
 * Seed script — populates the database with default admin account
 * and Tangkou Town specific categories and sample content.
 */
const bcrypt = require('bcryptjs');
const database = require('./database');

const CATEGORIES = [
  {
    name: '农特产品',
    slug: 'farm-products',
    icon: '🌾',
    description: '塘口镇的特色农产品，扫码了解产地故事与种植过程',
    sort_order: 1,
  },
  {
    name: '文化景点',
    slug: 'cultural-sites',
    icon: '🏛️',
    description: '塘口镇的历史文化地标，AR还原古迹风貌',
    sort_order: 2,
  },
  {
    name: '非遗手艺',
    slug: 'intangible-heritage',
    icon: '🎨',
    description: '塘口镇传统手工艺，感受非遗文化的魅力',
    sort_order: 3,
  },
  {
    name: '乡村风貌',
    slug: 'rural-scenery',
    icon: '🏞️',
    description: '美丽的塘口镇田园风光与乡村振兴成果',
    sort_order: 4,
  },
];

async function seed() {
  console.log('🌱 开始初始化数据库...\n');
  const db = await database.getDb();

  // Check if already seeded
  const existingAdmin = database.get('SELECT id FROM users WHERE username = ?', ['admin']);
  if (existingAdmin) {
    console.log('⚠️  数据库已初始化，跳过 seed。');
    console.log('   如需重新初始化，请删除 data/database.sqlite 后重试。');
    return;
  }

  // Create admin user
  const hash = await bcrypt.hash('tangkou2024', 10);
  database.run('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', ['admin', hash, 'admin']);
  console.log('✅ 管理员账号已创建: admin / tangkou2024');

  // Create categories
  for (const cat of CATEGORIES) {
    database.run(
      'INSERT INTO categories (name, slug, icon, description, sort_order) VALUES (?, ?, ?, ?, ?)',
      [cat.name, cat.slug, cat.icon, cat.description, cat.sort_order]
    );
  }
  console.log('✅ 分类已创建:', CATEGORIES.map(c => c.name).join('、'));

  // Create sample AR content
  const samples = [
    {
      title: '塘口大米',
      slug: 'tangkou-rice',
      description: '阳西塘口镇的优质丝苗米',
      category_slug: 'farm-products',
      info_html: '<h3>🌾 塘口大米</h3><p>塘口镇位于阳西县西北部，依山傍水，土地肥沃，出产的丝苗米粒粒晶莹，香软可口。这里的水稻采用传统农耕方式种植，山泉水灌溉，品质上乘。</p>',
    },
    {
      title: '塘口古村落',
      slug: 'tangkou-old-village',
      description: '百年历史的岭南特色古村落',
      category_slug: 'cultural-sites',
      info_html: '<h3>🏛️ 塘口古村落</h3><p>保存完好的岭南风格古建筑群，青砖黛瓦，雕梁画栋，见证了塘口镇数百年的沧桑变迁。漫步其中，仿佛穿越时空。</p>',
    },
    {
      title: '竹编工艺',
      slug: 'bamboo-weaving',
      description: '塘口镇传统手工竹编技艺',
      category_slug: 'intangible-heritage',
      info_html: '<h3>🎨 竹编工艺</h3><p>塘口竹编已有数百年历史，老一辈手艺人用灵巧的双手将竹子编织成精美的日用品和工艺品。每一件作品都蕴含着匠心精神。</p>',
    },
    {
      title: '田园风光',
      slug: 'rural-landscape',
      description: '塘口镇美丽的田园风光与农业观光',
      category_slug: 'rural-scenery',
      info_html: '<h3>🏞️ 田园风光</h3><p>春天的油菜花海、夏天的碧绿稻田、秋天的金黄丰收、冬天的静谧山村——塘口镇的四季都有着不同的田园美景等你来发现。</p>',
    },
  ];

  for (const s of samples) {
    const cat = database.get('SELECT id FROM categories WHERE slug = ?', [s.category_slug]);
    database.run(
      `INSERT INTO ar_contents (title, slug, description, category_id, info_html, is_published)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [s.title, s.slug, s.description, cat ? cat.id : null, s.info_html]
    );
  }
  console.log('✅ 示例AR内容已创建:', samples.map(s => s.title).join('、'));

  console.log('\n🎉 初始化完成！运行 npm start 启动服务\n');
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
