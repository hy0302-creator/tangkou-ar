# 🌾 塘口镇 AR 文化平台

阳西塘口镇三下乡项目 — 基于 Web AR 技术的乡村文化展示平台。

## 功能

- **📱 AR 扫描体验**: 扫描标记图片，3D模型叠加现实世界
- **📦 内容管理后台**: 可视化管理 AR 内容、上传模型和标记图片
- **📷 二维码生成**: 每个 AR 内容自动生成二维码，方便线下分发
- **🎨 塘口 IP 展示**: 农特产品、文化景点、非遗手艺、乡村风貌四大分类

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 初始化数据库和示例数据
npm run seed

# 3. 启动服务
npm start
```

启动后访问：
- 🏠 **首页**: http://localhost:3000
- 🔧 **管理后台**: http://localhost:3000/admin
- 📱 **AR 体验**: 从首页选择内容进入

默认管理员账号：`admin` / `tangkou2024`

## 如何使用

### 用户端（扫码体验 AR）

1. 打开首页，浏览 AR 内容
2. 点击"体验 AR"或扫描二维码
3. 将摄像头对准 AR 标记图片
4. 3D 模型出现在标记上方，查看详情信息

> 如果 AR 内容尚未设置标记图片，会自动进入 **3D 演示模式**，仍然可以旋转查看 3D 模型。

### 管理端（添加 AR 内容）

1. 登录管理后台 → 分类管理 → 创建分类
2. AR 内容管理 → 新增内容 → 填写信息
3. 为内容上传文件：
   - **标记图片**: 用于 AR 识别的图片（需编译为 .mind 格式）
   - **3D 模型**: GLB/GLTF 格式的 3D 模型（推荐使用 Blender 导出）
   - **语音导览**: MP3 格式的语音介绍（可选）
   - **缩略图**: 列表展示用
4. 生成二维码 → 打印张贴到对应的实物/景点旁

### 编译 AR 标记图片

标记图片需要用 mindAR 编译工具将普通图片转为 `.mind` 特征文件：

- **在线工具**: https://hiukim.github.io/mind-ar-js-doc/tools/compile
- **命令行**: `npx @mindar/image-target-compiler -i input.png -o output.mind`

推荐标记图片要求：
- 纹理丰富、细节清晰
- 正方形或接近正方形
- 分辨率 ≥ 512×512
- 避免对称图案

## 项目结构

```
tangkou-ar/
├── public/          # AR 前端（用户端）
│   ├── index.html       # 首页
│   ├── ar-viewer.html   # AR 扫描页
│   ├── css/             # 样式
│   └── js/              # 前端逻辑
├── admin/           # 管理后台
│   ├── index.html
│   ├── css/
│   └── js/pages/        # 页面模块
├── server/          # 后端 API
│   ├── index.js         # 入口
│   ├── routes/          # 路由
│   ├── middleware/       # 中间件
│   └── utils/           # 工具函数
├── data/            # 数据存储
│   ├── uploads/         # 上传文件
│   └── database.sqlite  # SQLite 数据库
└── package.json
```

## 部署建议

本平台设计为轻量部署，可在以下环境运行：

### 局域网部署（推荐）
```bash
# 获取本机 IP 后修改 .env
BASE_URL=http://192.168.x.x:3000

# 重新生成二维码
npm run seed  # 重新初始化
```

### 云服务器部署
推荐使用 nginx 反向代理 + PM2 进程管理。

## 技术栈

| 功能 | 技术 |
|------|------|
| AR 引擎 | mindAR (Image Tracking) |
| 3D 渲染 | Three.js |
| 前端 | 原生 HTML/CSS/JS |
| 后端 | Node.js + Express |
| 数据库 | SQLite (sql.js) |

## License

MIT — 阳西塘口镇三下乡实践项目
