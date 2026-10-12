# points 项目入口

处理 points 相关任务时先阅读本文件；数据库工作再阅读 `points/AGENTS.md`。

## 基本边界

1. 除非用户同意，否则不得修改代码和电脑上的任何文件。
2. 生成代码超过 600 行必须分批写入；points 大文件每批最多 200 行。
3. 删除或修改任何非明确授权文件必须先申请正式权限。

## 基本架构

- `points/`：小世界移动端 PWA，包含积分商城、转盘、小家庭、减脂奖励、设备接入和推送。
- `index.source.html`：页面与基础样式源码；`app.js`：主业务与模块装配。
- `family.js`：小家庭统一任务；`kitchen*.js`：菜谱及旧订单接口；`fat*.js`：减脂模块；各模块 CSS 和 `ui-theme.css`：展示样式。
- `app-runtime.js`、`startup.js`：请求保护与启动；`updates.js`、`sw.source.js`：版本更新与缓存。
- `build.mjs`：生成 `index.html`、`sw.js`、`version.json` 和 `assets/` 哈希资源；改源码后构建，不手工改产物。
- `schema-full.sql`、`sql-backup/`：始终随代码同步的最新数据库基线；升级用独立增量 SQL。
- `tests/`：本地验证与演示预览；演示数据不代表线上数据。

开始修改前核对当前源码、版本与已有工作区改动。以用户当次需求决定范围，不预设产品或审美要求。
