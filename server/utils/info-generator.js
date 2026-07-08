/**
 * AR内容详细介绍智能生成器
 * 根据产品标题、描述和分类，自动生成结构化的HTML详细介绍
 */
const INFO_GENERATOR = {
  /**
   * 根据输入自动生成详细介绍HTML
   * @param {Object} params
   * @param {string} params.title - 产品标题
   * @param {string} params.description - 产品简述
   * @param {string} params.categorySlug - 分类标识 (如 farm-products)
   * @param {string} params.categoryName - 分类名称 (如 农特产品)
   * @returns {string} 生成的HTML
   */
  generate({ title, description, categorySlug, categoryName }) {
    // 提取产品/景点名称（去掉"塘口"前缀）
    const productName = title.replace(/^塘口/, '').trim();

    // 根据分类选择模板
    switch (categorySlug) {
      case 'farm-products':
        return this._farmProduct({ title, productName, description });
      case 'featured-sites':
        return this._featuredSite({ title, productName, description });
      case 'intangible-heritage':
        return this._intangibleHeritage({ title, productName, description });
      case 'rural-scenery':
        return this._ruralScenery({ title, productName, description });
      default:
        return this._generic({ title, productName, description, categoryName });
    }
  },

  // ======================== 农特产品模板 ========================
  _farmProduct({ title, productName, description }) {
    const descHtml = description ? `<p>${description}</p>` : '';
    return `
      <h3>🌟 ${title}</h3>
      ${descHtml}
      <p>${productName}产自阳西县<strong>塘口镇</strong>——这里拥有广东省首个获得国家地质协会认证的<strong>1530亩天然富硒土地</strong>。得益于富硒土壤和山泉水灌溉，${productName}品质出众，是塘口镇"富硒健康"品牌的代表性农产品。</p>

      <h4>✨ 品质特点</h4>
      <p>在塘口天然富硒土壤和优越生态环境中生长的${productName}，<strong>口感纯正、营养丰富</strong>，富含对人体有益的硒元素。塘口镇森林覆盖率达67%，生态环境优越，为农产品提供了理想的生长条件。</p>

      <h4>🌱 富硒优势</h4>
      <p>硒是人体必需的微量元素，被誉为<strong>"生命火种"</strong>。塘口镇富硒土地上种植的${productName}天然含硒，具有抗氧化、增强免疫力的保健功效，是健康饮食的理想选择。</p>

      <h4>🍴 推荐食用方式</h4>
      <p>${productName}吃法多样，最能体现其本味。无论是家常烹饪还是创意料理，都能展现其独特的风味魅力。</p>

      <h4>🛒 购买渠道</h4>
      <p>塘口镇已注册<strong>"塘口乡"</strong>农产品品牌，通过"公司+合作社+基地+农户+电商"模式，线上线下同步销售。欢迎来到塘口镇亲自品尝选购！</p>

      <p style="margin-top:16px;padding:12px;background:rgba(212,163,115,0.15);border-radius:8px;font-size:14px;">
        🌱 <strong>产地：</strong>阳西县塘口镇富硒种植基地 | 🏆 富硒认证 | 💚 绿色生态种植
      </p>
    `;
  },

  // ======================== 特色景点模板 ========================
  _featuredSite({ title, productName, description }) {
    const descHtml = description ? `<p>${description}</p>` : '';
    return `
      <h3>📍 ${title}</h3>
      ${descHtml}
      <p>${title}位于阳西县<strong>塘口镇</strong>，是塘口镇"富硒产业+文旅融合"特色发展之路上的亮丽名片。这里山水相依、田园环抱，是远离城市喧嚣、体验乡村慢生活的理想去处。</p>

      <h4>🏞️ 周边环境</h4>
      <p>塘口镇依山傍水，拥有<strong>桐油山</strong>（海拔927米）、<strong>三甲河旅游示范带</strong>（5公里休闲碧道）、<strong>滨河公园</strong>等自然景观。${productName}坐落于这片生态宝地之中，推窗见绿、出门见景。</p>

      <h4>📸 打卡亮点</h4>
      <p>这里融合了岭南乡村的古朴韵味与现代旅游的舒适体验。四季皆有不同的田园画卷——春有秧苗翠绿，夏有稻花飘香，秋有金浪翻滚，冬有山雾缭绕。随手一拍都是朋友圈大片。</p>

      <h4>🚶 游玩建议</h4>
      <p>建议安排半天到一天时间，可以沿三甲河碧道骑行或散步，感受田园微风；参观附近的网红打卡点<strong>五亭桥和枕月桥</strong>；在滨河公园露营野餐，享受悠闲的乡村时光。</p>

      <h4>🍽️ 周边美食</h4>
      <p>塘口镇拥有丰富的富硒农产品——"红姑娘"番薯、彭垌黄皮、胭脂米、富硒蜂蜜等。来到这里，一定要品尝地道的塘口农家菜！</p>

      <p style="margin-top:16px;padding:12px;background:rgba(212,163,115,0.15);border-radius:8px;font-size:14px;">
        📍 <strong>位置：</strong>阳西县塘口镇 | 🚗 <strong>自驾可达</strong> | 📸 <strong>网红打卡地</strong>
      </p>
    `;
  },

  // ======================== 非遗手艺模板 ========================
  _intangibleHeritage({ title, productName, description }) {
    const descHtml = description ? `<p>${description}</p>` : '';
    return `
      <h3>🎨 ${title}</h3>
      ${descHtml}
      <p>${title}是塘口镇珍贵的<strong>非物质文化遗产</strong>，承载着数代塘口手艺人的匠心与智慧。在漫长的农耕岁月中，塘口人用灵巧的双手创造出了独具特色的传统工艺。</p>

      <h4>📜 历史渊源</h4>
      <p>${productName}在塘口镇已有数百年传承历史。老一辈手艺人代代相传，将这门技艺完整地保留至今。每一件作品都凝聚着匠人对生活的热爱和对传统的坚守。</p>

      <h4>✨ 工艺特色</h4>
      <p>塘口${productName}选材考究、工艺精湛，融合了实用性与艺术性。从原料选取到成品完成，每一道工序都体现着手艺人的匠心精神和对品质的极致追求。</p>

      <h4>💎 文化价值</h4>
      <p>${productName}不仅是实用的物品，更是塘口文化的载体。它记录着塘口人的生活方式、审美情趣和精神追求，是了解塘口乡土文化的重要窗口。</p>

      <h4>🤝 传承与创新</h4>
      <p>如今，年轻一代的手艺人正在将现代设计理念融入传统工艺，让${productName}焕发新的生机。来塘口镇，你可以亲身体验这项传统手艺，感受手作的温度。</p>

      <p style="margin-top:16px;padding:12px;background:rgba(212,163,115,0.15);border-radius:8px;font-size:14px;">
        🎨 <strong>非遗传承</strong> | 🏛️ 塘口文化瑰宝 | 🤝 可预约体验
      </p>
    `;
  },

  // ======================== 乡村风貌模板 ========================
  _ruralScenery({ title, productName, description }) {
    const descHtml = description ? `<p>${description}</p>` : '';
    return `
      <h3>🏞️ ${title}</h3>
      ${descHtml}
      <p>${title}是塘口镇<strong>美丽乡村建设</strong>的缩影。塘口镇坚持"硒旺山水，健康塘口"的发展理念，将生态保护与乡村振兴紧密结合，绘就了一幅宜居宜业宜游的乡村新画卷。</p>

      <h4>🌿 生态之美</h4>
      <p>塘口镇森林覆盖率高达<strong>67%</strong>，群山环抱、溪流潺潺。${productName}展现了塘口最本真的自然风貌——青山绿水间，农田与村落错落有致，四季更迭各有风情。</p>

      <h4>🏡 乡村新貌</h4>
      <p>随着"百千万工程"的深入推进，塘口镇的乡村面貌日新月异。三甲河碧道、滨河公园、网红桥等新地标与传统田园风光交相辉映，让古老乡村焕发新的活力。</p>

      <h4>📸 最佳观赏季节</h4>
      <p>春季油菜花开金黄遍野，夏季稻田翠绿生机勃勃，<strong>秋季是最美时节</strong>——金色稻浪翻涌，与远山、蓝天构成绝美画卷。冬季晨雾缭绕，宛若仙境。</p>

      <h4>🚴 体验方式</h4>
      <p>推荐骑行或徒步探索，沿着乡间小路慢行，感受风吹稻浪、鸟鸣山涧的田园诗意。塘口镇的多条乡村道路已实现硬底化，出行便利。</p>

      <p style="margin-top:16px;padding:12px;background:rgba(212,163,115,0.15);border-radius:8px;font-size:14px;">
        🌾 <strong>塘口镇</strong> | 🏆 "硒旺山水·健康塘口" | 📸 四季皆景
      </p>
    `;
  },

  // ======================== 通用模板 ========================
  _generic({ title, productName, description, categoryName }) {
    const descHtml = description ? `<p>${description}</p>` : '';
    const catStr = categoryName ? `属于【${categoryName}】分类` : '';
    return `
      <h3>📌 ${title}</h3>
      ${descHtml}
      <p>${title}${catStr}，是阳西县塘口镇的一张特色名片。塘口镇位于阳西县西北部，拥有丰富的天然富硒土壤资源和优美的生态环境，正在全力打造"富硒塘口，健康小镇"。</p>

      <h4>✨ 特色亮点</h4>
      <p>${productName}以其独特的魅力和品质，吸引着越来越多的人关注塘口、了解塘口、走进塘口。</p>

      <h4>🌱 塘口优势</h4>
      <p>塘口镇拥有广东省首个国家认证的天然富硒土地，森林覆盖率达67%，山泉水灌溉，生态环境得天独厚。这些自然资源为塘口的各类产品提供了卓越的品质保障。</p>

      <h4>📌 更多信息</h4>
      <p>欢迎来到塘口镇亲身体验！您可以沿三甲河碧道漫步，探访网红桥五亭桥和枕月桥，品尝地道的富硒农产品，感受塘口独特的乡土魅力。</p>

      <p style="margin-top:16px;padding:12px;background:rgba(212,163,115,0.15);border-radius:8px;font-size:14px;">
        📍 <strong>阳西县塘口镇</strong> | 🌾 富硒健康 | 🏞️ 生态宜居
      </p>
    `;
  },
};

module.exports = INFO_GENERATOR;
