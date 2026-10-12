# PWA 分文件更新

从 20261012.1 起，`build.mjs` 生成 22 个独立的 CSS/JS 文件和一个小页面外壳。
业务模块源文件、样式内容、执行顺序与 SQL 保持原样。

开发时修改对应源文件，然后运行 `node points/build.mjs`。
提交 `build.mjs`、`updates.js`、`sw.source.js` 的相关修改，以及生成的
`index.html`、`sw.js`、`version.json` 和清单引用的全部 `assets/` 文件。
文件名包含内容 SHA-256；不要手工编辑生成文件或复用旧版本号。
`assets/.gitattributes` 保证 Git 不转换文件换行，避免内容校验失败。
已发布的旧哈希文件应保留，供打开中的旧页面使用。

更新过程读取小清单，复用已经缓存且校验通过的文件，只下载缺少或变化的文件。
全部文件和页面外壳校验通过后才发布缓存指针，页面直接切换到准备好的版本，
不再预下载完整 HTML 后又导航下载一次。下一次启动核对实际版本与目标版本。
旧版单 HTML PWA 首次迁移需要下载一套拆分资源，以后才能复用。

启动、回到前台、恢复网络及每分钟的前台检查都会检查更新。
首次检查失败也会自动重试；中断的已校验下载保留，失败期间继续使用完整旧版。
正在提交的 fetch 请求结束后才切换版本，API 和账户数据不进入静态资源缓存。
服务器返回旧清单时继续等待，不降级。重复启动失败有次数限制，避免无限刷新。

验证：

- `node points/tests/release-cache.test.mjs`
- `node points/tests/release-update.test.mjs`
- `release-browser.test.mjs` 使用隔离本地 HTTP 服务及真实 Chrome Service Worker。
  参数依次为 Playwright 的 `index.mjs` 路径和 Chrome 可执行文件路径。
  覆盖变化文件下载次数、旧版 PWA 迁移、失败重试、离线启动及正在提交的请求。
- 本地实际业务页面验证厨房、导航及减脂；不连接生产数据库。

GitHub Pages 尚未发布、网络不可用或系统暂停后台应用时无法立即取得新版本。
机制在恢复网络和回到前台后继续更新；iPhone 上的最终表现仍需实机确认。
