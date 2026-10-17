# 小世界 · points

从这里定位文件，不在根目录堆放新模块、日期报告或测试输出。修改前阅读 [AGENTS.md](AGENTS.md)。

| 目录或文件 | 职责 |
| --- | --- |
| src/ | 页面、业务模块、样式、启动和更新源码 |
| scripts/ | 构建、SQL 生成、仓库校验与提交钩子 |
| docs/DEVELOPMENT.md | 当前开发、验证、发布与稳定性要求 |
| docs/PRODUCT.md | 当前小世界、家庭、减脂与权限规则 |
| tests/ | 可复现回归测试、数据库夹具与唯一家庭预览 |
| assets/、images/、ICON/、vendor/ | 发布资源、图标和固定依赖 |
| sql-backup/ | 当前结构数据与原始只读参考 |
| schema-full.sql | 最新完整结构与逻辑基线 |
| schema-increment.sql | 现有数据库的当前升级入口 |

发布地址和运行资源路径保持不变。index.html、sw.js、version.json 由构建生成，不手工修改。

家庭入口由 src/family.js 装配，直接展示家事；做饭通过文字说明记录。菜谱、选菜、菜图和做法已移除，kitchen.css 和 kitchen-refined.css 继续提供家庭布局与控件样式。旧版本哈希资源与历史迁移夹具仅用于兼容及回归。当前增量清除数据库菜谱与旧任务做法快照，保留菜名、要求和积分记录。

## 常用命令

- 构建：node points/scripts/build.mjs
- 仓库检查：node points/scripts/check-repo.mjs
- 暂存检查：node points/scripts/check-repo.mjs --staged
- SQL 生成与检查：python points/scripts/build-sql-backup.py；同命令加 --check
- 资源校验：node points/tests/release-artifacts.test.mjs
- 通知内容与跳转验证：node points/tests/notification-presentation.test.mjs
- 待办分页、权限与撤回验证：node points/tests/todos.test.mjs
- 通知中心界面验证：points/tests/todos-ui.test.mjs（本地预览与 Playwright）
- 本地预览：node points/tests/family-preview.mjs
- 公共框架验证：points/tests/shared-shell.test.mjs（本地预览与 Playwright，检查两页及三个主题的设置、通知中心与导航一致性）

本地提交钩子使用 points/scripts/hooks；GitHub 检查复核目录、文档、SQL 和构建资源。

数据库变更必须同步两个 SQL 和 current-schema.json。全量用于结构核对或具备平台依赖的新环境恢复，不能当作已有数据库的重复升级脚本。“最新”表示与代码一致，不代表线上已执行。

截图、压缩包、调试日志和旧版本报告只留本地或 Git 历史。旧文件不能因“看起来多”就删除；兼容资源按登记与保留窗口审核。
