# points 维护入口

这是小世界 PWA。修改时以 AGENTS.md 为入口，按模块找到对应源码，改源码后构建；不要直接修改发布产物。

| 位置 | 用途 |
| --- | --- |
| index.source.html、app.js | 页面基础与业务装配 |
| family、fat、kitchen、device、push 等 JS/CSS | 各模块源码，按需求局部修改 |
| build.mjs | 生成发布页、版本与哈希资源 |
| assets/ | 当前及兼容旧页面的发布资源，不能只按当前清单删除旧文件 |
| images/、ICON/、vendor/ | 菜图、PWA 图标与固定依赖 |
| tests/ | 本地模拟、回归测试与预览；不会操作线上数据 |
| sql-backup/ | 全量生成的结构数据与原始只读参考 |

## SQL 只保留两个文件

- schema-full.sql：最新代码对应的完整应用结构与逻辑基线，用于核对或具备平台依赖的新环境恢复。不是现有数据库的重复升级脚本，不含业务数据与密钥配置。
- schema-increment.sql：当前升级入口，以原始结构参考为起点，包含此前维护的减脂结算读取修正及小家庭升级，可重复执行。纯前端改动不会清空它。

数据库变更必须同步更新当前增量、current-schema.json 与全量 SQL，一起验证、提交。这里的“最新”指代码与结构一致，不代表线上已经执行。

生成：python points/build-sql-backup.py
检查：python points/build-sql-backup.py --check
恢复验证：node points/tests/sql-backup.test.mjs

旧 SQL 已退出部署入口；必要历史定义集中在 tests/database-fixtures.json，仅供本地迁移回归和只读导出使用。测试通过 database-source.mjs 读取历史夹具，当前两个 SQL 始终读取真实文件。

历史模块说明中的旧部署步骤已被本说明取代；不要再执行过期的模块 SQL，也不要用旧通知构建或旧密钥工具生成第三份 SQL。部署推送使用当前服务器初始化流程。

## 前端验证

构建：node points/build.mjs
资源与版本：release-artifacts、release-cache、release-update 测试。
本地预览：node points/tests/family-preview.mjs

截图和交付压缩包不进入仓库。文件整理不合并业务模块，不移动静态资源路径，不调整界面或结算逻辑。
