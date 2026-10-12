# points 数据库维护约定

- 项目只保留两个 SQL 文件：schema-full.sql 是最新完整结构基线，schema-increment.sql 是当前可重复执行的升级增量。不要再新增日期命名或模块命名的部署 SQL。
- 每次数据库代码修改，必须同步更新当前增量、sql-backup/current-schema.json 和全量 SQL，验证后一起提交。纯前端修改保留当前增量，不清空、不伪造数据库变更。
- 增量注明起始结构；扩展时保留从该结构升级至当前版本所需的依赖，不能因尚未执行而遗漏之前的变更。不维护 pending/applied 部署状态。
- 全量始终代表最新代码，不能把线上尚未执行当作阻止更新的理由；全量不是在已有数据库重复执行的升级脚本。
- 使用 python points/build-sql-backup.py 从 current-schema.json 生成全量 SQL；表、函数、权限、索引、触发器和初始化定义必须完整同步。
- online-confirmed.json 是原始只读结构参考，不自动改写成已部署状态，也不能用它覆盖最新维护基线。
- 历史版本从 Git 查阅。历史测试数据不作为用户执行入口，不由工具重新生成额外 SQL 文件。
- 不含业务行、密钥配置行、平台结构和调度配置；外部改库或需核实线上差异时才索取新导出。
- 大文件每批最多写入 200 行；只修改本次涉及文件，保持模块风格统一，不改写旧迁移伪装部署事实。

- 生成后执行 python points/build-sql-backup.py --check，检查项目只有两个 SQL 文件且全量与结构 JSON 一致；本地测试输入集中在 tests/database-fixtures.json，不增加部署入口。
