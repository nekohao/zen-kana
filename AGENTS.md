# points 项目入口

处理 points 任务先阅读本文件和 points/AGENTS.md，再从 points/README.md 定位源码与工具。

## 基本边界

1. 除非用户同意，否则不得修改代码和电脑上的任何文件。
2. 生成代码超过 600 行必须分批写入；points 大文件每批最多 200 行。
3. 删除或修改任何非明确授权文件必须先申请正式权限。
4. 开始前核对源码、版本和已有改动；只处理当次授权范围，不混入其他任务的暂存或未提交工作。

## 基本架构

- points/：小世界 PWA，包含分数、转盘、减脂、小家庭、设备接入与推送。
- points/src/：页面、业务模块与样式源码。index.source.html 和 app.js 是页面与装配入口；family.js 是统一家庭任务，kitchen*.js 保留菜谱与历史接口，fat*.js 是减脂与奖励。
- points/src/app-runtime.js、startup.js：请求与启动保护；updates.js、sw.source.js：更新与缓存。
- points/scripts/：构建、SQL 生成、仓库检查及提交钩子；node points/scripts/build.mjs 生成发布产物。
- points/index.html、sw.js、version.json、assets/：生成的发布文件，不手工编辑。
- points/schema-full.sql、schema-increment.sql：仅有的全量与当前增量 SQL；sql-backup/ 是维护结构数据。
- points/docs/：两份当前文档；tests/ 是本地验证、演示预览与测试夹具。

新增内容归入既有职责目录。不得新增根目录模块、日期报告或额外 SQL；提交前执行仓库、资源及相关业务检查。详细规则见 points/AGENTS.md。
