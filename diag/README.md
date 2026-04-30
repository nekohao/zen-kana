# 诊断学习手册 (Diag Tutor)

> 面向 **通信工程师 / 嵌入式工程师** 的系统化车载诊断学习 PWA。
> 基于 **DFXY 项目真实 DCM/DEM 配置** 编写课程内容。

## 内置课程（30 讲，6 大部分）

| 部分 | 讲数 | 重点 |
|---|---|---|
| 一 入门导论 | 2 | 角色 / OBD vs UDS / 协议栈分层 |
| 二 传输层 ISO-TP | 6 | **SF / FF / CF / FC**、寻址、CAN-FD |
| 三 UDS 协议核心 | 6 | 报文结构、Suppress Bit、NRC、Session、Security、其他服务 |
| 四 数据访问与刷写 | 7 | 0x22/0x2E/0x2F/0x31/0x19/0x14/0x34-37 |
| 五 AUTOSAR DCM/DEM | 3 | DSL/DSD/DSP 三层、DEM、Callout |
| 六 DFXY 项目实战 | 6 | 87 DID / 17 RID / 会话+安全矩阵 / callout 走读 / 端到端实战 |

## 主要特性

- ✅ **PWA** — 离线可用，iOS Safari "添加到主屏幕"后变成桌面 App，全屏体验
- ✅ **右上角双按钮**：📱/💻 切换移动版/桌面版排版；ⓘ 查看本地版本 / 云端版本
- ✅ **自动更新** — 每次启动 fetch `version.json` 比对，发现新版本自动清缓存 + 刷新（带 Toast 提示）
- ✅ **零依赖** — 纯原生 HTML/CSS/JS，单文件托管即可

---

## 部署到 GitHub Pages（最简流程）

### 方式 A：作为独立仓库（推荐）

```powershell
cd D:\branch\DF_GIT_BRANCH\China_Master\diag-tutor

git init
git add .
git commit -m "feat: diag tutor v1.0.0"

# 在 GitHub 网站新建一个空仓库 diag-tutor (public)
git branch -M main
git remote add origin https://github.com/<你的用户名>/diag-tutor.git
git push -u origin main
```

然后在 GitHub 仓库 → Settings → Pages：
- Source 选 **Deploy from a branch**
- Branch 选 `main` / 根目录 `/`，保存

约 1 分钟后访问 `https://<你的用户名>.github.io/diag-tutor/`。

### 方式 B：用 GitHub CLI 一行搞定（如果装了 `gh`）

```powershell
cd D:\branch\DF_GIT_BRANCH\China_Master\diag-tutor
gh repo create diag-tutor --public --source=. --push
gh api -X POST /repos/{owner}/diag-tutor/pages -f "source[branch]=main" -f "source[path]=/"
```

---

## 在 iPhone 上"装成原生 App"

1. iPhone 用 **Safari** 打开 `https://<你>.github.io/diag-tutor/`（不要用 Chrome，Chrome iOS 不支持 PWA 安装）
2. 点底部 **分享** 按钮 → **添加到主屏幕**
3. 桌面就出现紫蓝色"UDS"图标，点开自动全屏（无 Safari 工具栏）

> 安卓 Chrome 同理：右上角 ⋮ → "安装应用"。

---

## 后续怎么更新内容（这是为啥要 PWA 的关键）

### 步骤

1. 改 `lessons.js` 增加章节 / 修订内容
2. 改 `version.json`：版本号 `+0.0.1`，`buildTime` 改成现在
3. `git commit && git push`
4. GitHub Pages 1 分钟后生效
5. **下次用户打开 App，自动检测、自动更新到最新**（Toast 提示，无需手动操作）

### 版本号规则

- patch（1.0.0 → 1.0.1）：错别字、小修订
- minor（1.0.x → 1.1.0）：新增章节
- major（1.x.x → 2.0.0）：重大重构（侧边栏分组、UI 大改）

---

## 文件结构

```
diag-tutor/
├── index.html              # 主页面 (UI 容器 + 内联 CSS)
├── app.js                  # 路由、版本检测、Service Worker 注册、视图切换
├── lessons.js              # 全部课程内容（最常更新）
├── sw.js                   # Service Worker（缓存策略、自动更新）
├── manifest.webmanifest    # PWA 元数据
├── version.json            # 版本信息（autoupdate 检查目标）
├── icon.svg                # 应用图标
└── README.md               # 本文件
```

---

## 关于课程数据

每节课在 `lessons.js` 中是一个对象：

```js
L.push({
  id: 'unique_id',         // 路由 hash
  title: '编号. 标题',
  subtitle: '副标题',
  html: `直接是 HTML 字符串，可用 <h2><table class="t"><pre><code> 等`
});
```

加新章节时：
1. 在 `lessons.js` 里 `L.push({...})` 一段新的
2. 在对应分组的 `G.push({ ..., lessons:[...] })` 里把新 id 加进去（决定侧边栏顺序）
3. 改 `version.json` 推送即可

---

## 已知限制 & 后续可加

- 当前 30 讲覆盖核心，但可继续追加：DTC 详细位掩码、DEM Debounce 策略、CAN-FD 帧编排、Bootloader 协议细节、UDS over DoIP 等
- 目前没做夜间/白天切换（已默认深色，符合大多数工程师审美）
- 没有搜索框（章节足够时再加）
- 没有作业 / 测验交互（可在 v2 加）

如果想扩内容，告诉我具体方向，我会按这个结构继续追加。
