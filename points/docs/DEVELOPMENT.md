# 开发与发布

## 目录职责

运行源码在 src/，构建与维护工具在 scripts/，测试与唯一家庭预览在 tests/。页面发布路径仍为 points/index.html，assets、images、ICON 和 vendor 路径保持不变。

改对应模块源码；不要手工编辑 index.html、sw.js、version.json 或哈希资源。移动源码不代表修改业务规则。

## 日常命令

- 构建：node points/scripts/build.mjs
- 仓库检查：node points/scripts/check-repo.mjs
- 暂存检查：node points/scripts/check-repo.mjs --staged
- 资源验证：node points/tests/release-artifacts.test.mjs
- 缓存与更新：node points/tests/release-cache.test.mjs；node points/tests/release-update.test.mjs
- 本地预览：node points/tests/family-preview.mjs
- SQL 生成：python points/scripts/build-sql-backup.py
- SQL 同步检查：python points/scripts/build-sql-backup.py --check
- SQL 恢复与升级：node points/tests/sql-backup.test.mjs；node points/tests/sql-entrypoints.test.mjs

浏览器测试接收 Playwright 模块路径和 Chrome 可执行文件路径，使用隔离 localhost 与演示数据，不连接生产数据库。历史迁移测试只从 database-fixtures.json 读取冻结输入，当前两个 SQL 始终读取真实文件。

## 发布资源与兼容

构建生成独立 CSS/JS、页面外壳及版本清单；文件名含内容 SHA-256。必须提交完整清单引用的资源和 index.html、sw.js、version.json。新版本必须使用新版本号；验证纯目录移动时使用原版本号与原时间复现，产物必须逐字节一致。

只允许提交当前清单及 scripts/retained-releases.json 登记的兼容资源，不批量加入 assets/。兼容登记保留最近两个旧版本及最近 30 天的发布版本；到期资源先列出候选，检查旧页面兼容后再删除，构建不会直接删除文件。不得为掩盖垃圾文件把未发布资源加入兼容登记。

更新器只在完整资源校验成功后切换；失败继续使用完整旧版本。API、账户数据、SQL 和测试输入不进入应用静态缓存。GitHub Pages 发布完成、本地提交和线上数据库升级是不同操作，不能互相代替。

## 稳定性约束

保留请求超时、身份和读取版本检查、忙碌保护、幂等操作 ID、迟到响应保护与恢复同步。响应丢失时核对或重试原操作，不自动重放业务写入。不要为目录整理修改模块装配顺序、SQL 函数正文或动画逻辑。

更新后同步 existing 浏览器订阅；临时网络或身份错误不擅自清除用户选择。设备授权、推送关闭与跨身份清理继续由现有逻辑处理。

手机尺寸测试不能代替 iPhone 主屏幕模式的状态栏、安全区、帧率和锁屏推送验证。这里只保留适用于当前版本的规则；历史故障和测试数字从 Git 提交查阅。

## 入库边界

源码、正式维护工具、当前文档、两个 SQL、必需图片与依赖、可复现回归测试可以入库。截图、压缩包、下载副本、日期报告、一次性预览、调试日志、缓存、密钥和本地配置不入库。

提交前阅读 git diff 和暂存清单，显式选择本次文件；不要使用 git add .、git add -A 或通配符全量暂存，不混入其他任务的工作。被忽略的发布资源仅按当前清单逐项 git add -f。
