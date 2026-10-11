# points 数据库维护约定

- 修改前以 `sql-backup/current-schema.json` 与 `schema-full.sql` 核对当前结构和函数，避免重复索取全量导出。
- `sql-backup/online-confirmed.json` 是用户提供的线上只读导出，未确认部署前不要改写成目标版本。
- SQL 修改必须提供独立增量脚本，同时更新 `sql-backup/state.json`、目标结构 JSON 与 `schema-full.sql`，一起提交。
- 使用 `python points/build-sql-backup.py` 生成基线。当前生成器支持完整函数覆盖；新增表、字段、权限或其他结构时必须扩展生成器，不允许静默漏掉变更。
- 线上部署未确认时保留 pending 标记。新的导出仅在外部改库或需核实线上差异时索取。
- 用户确认部署后，将对应文件从 `pending_migrations` 移到 `applied_migrations`，更新确认时间；继续保留已应用覆盖层，重新生成不会退回旧导出。无需再次全量导出。
- 完整 SQL 为应用结构/逻辑基线，不含业务行、密钥配置行、平台结构和调度任务；日常升级执行增量文件。
- 大文件每批写入最多 200 行；遵守用户的文件授权范围。不要改写旧迁移来假装已经部署。
