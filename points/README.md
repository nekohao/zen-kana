# 小世界 · points

从这里定位文件，不在根目录堆放新模块、日期报告或测试输出。修改前阅读 [AGENTS.md](AGENTS.md)。

| 目录或文件 | 职责 |
| --- | --- |
| src/ | 页面、业务模块、样式、启动和更新源码 |
| scripts/ | 构建、SQL 生成、仓库校验与提交钩子 |
| docs/DEVELOPMENT.md | 当前开发、验证、发布与稳定性要求 |
| docs/PRODUCT.md | 当前小世界、家庭、减脂与权限规则 |
| tests/ | 可复现回归测试、数据库夹具与唯一家庭预览 |
| assets/、images/、ICON/、vendor/ | 发布资源、菜图、图标和固定依赖 |
| sql-backup/ | 当前结构数据与原始只读参考 |
| schema-full.sql | 最新完整结构与逻辑基线 |
| schema-increment.sql | 现有数据库的当前升级入口 |

发布地址和运行资源路径保持不变。index.html、sw.js、version.json 由构建生成，不手工修改。

## 常用命令

- 构建：node points/scripts/build.mjs
- 仓库检查：node points/scripts/check-repo.mjs
- 暂存检查：node points/scripts/check-repo.mjs --staged
- SQL 生成与检查：python points/scripts/build-sql-backup.py；同命令加 --check
- 资源校验：node points/tests/release-artifacts.test.mjs
- 通知内容与跳转验证：node points/tests/notification-presentation.test.mjs
- 本地预览：node points/tests/family-preview.mjs

本地提交钩子使用 points/scripts/hooks；GitHub 检查复核目录、文档、SQL 和构建资源。

数据库变更必须同步两个 SQL 和 current-schema.json。全量用于结构核对或具备平台依赖的新环境恢复，不能当作已有数据库的重复升级脚本。“最新”表示与代码一致，不代表线上已执行。

截图、压缩包、调试日志和旧版本报告只留本地或 Git 历史。旧文件不能因“看起来多”就删除；兼容资源按登记与保留窗口审核。
