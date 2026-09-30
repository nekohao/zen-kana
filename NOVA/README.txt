BSW Learning PWA v2026.09.30.2

目录：
- index.html：PWA App 壳 + UI + Prompt Engine + Supabase 同步逻辑
- data/courses.json：107 节课程 + 392 个知识点的唯一课程数据文件
- notes/07/7.1.html ~ 7.4.html：由原 CanTp 笔记按课程边界拆分的独立 HTML 笔记
- manifest.webmanifest / sw.js / icons/：PWA 必需文件

GitHub Pages 部署：
1. 把压缩包内“所有文件和文件夹”上传到同一个 GitHub Pages 目录，保持目录结构不变。
2. 入口必须是 index.html。
3. iPhone Safari 打开 GitHub Pages 地址 → 分享 → 添加到主屏幕。
4. 如果之前装过旧 PWA，建议删除旧主屏幕图标后重新添加一次，避免旧 Service Worker / 图标缓存。
5. 课程数据由 data/courses.json 加载；不要只上传 index.html。
6. CanTp 笔记不会改变课程完成状态，也不会影响 ChatGPT 学习 Prompt。

兼容：
- 学习进度仍使用原来的 localStorage key：autosar-kp-<Z编号>
- Supabase 仍使用原来的 autosar_study_progress / autosar_user_settings
- 因此覆盖部署后，本机/云端原进度可以继续沿用。

当前只拆入 CanTp 7.1~7.4；NM 笔记尚未纳入本包。


【v2026.09.30.2 修复】
1. Supabase CDN 改为后台异步加载，即使 jsDelivr 不可达也不会卡住课程数据加载。
2. Service Worker 的页面导航改为 network-first，避免 GitHub 更新后主屏幕 PWA长期命中旧首页缓存。
