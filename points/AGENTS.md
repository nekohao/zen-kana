# points 数据库维护约定

- 每次 SQL 修改都提供独立增量脚本，并同步维护最新的 sql-backup/current-schema.json 与 schema-full.sql，一起提交。
- 全量 SQL 始终代表最新代码版本，无论用户是否已经执行；不维护 pending/applied 部署状态，不以执行确认阻止基线更新。
- online-confirmed.json 保留为用户提供的原始结构参考，不自动把它写成已上线新版本，也不能用旧导出覆盖当前维护基线。
- 使用 python points/build-sql-backup.py 从 current-schema.json 生成全量 SQL；新增表、函数、权限、索引或触发器必须完整进入 JSON 与 SQL。
- 全量 SQL 是应用结构与逻辑基线，不含业务行、密钥配置行、平台结构和调度任务；已有项目升级执行对应增量脚本。
- 不重复索取全量导出；仅外部改库或需核对实际线上差异时再索取。
- 大文件每批最多写入 200 行；遵守用户明确授权范围，不改写旧迁移伪装部署事实。
