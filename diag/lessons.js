/* Diag Tutor — 课程数据
 * 结构：window.LESSONS = { appVersion, groups: [...], lessons: [...] }
 * 每节课 lesson 是 { id, title, subtitle?, html }
 * 内容更新流程见 README。增量加内容时直接在 LESSONS.lessons 里 push 即可。
 */
(function(){
  const L = []; // lessons
  const G = []; // groups (顺序决定侧边栏顺序)

  // ---------- 工具：让 HTML 更紧凑 ----------
  const tag = (cls, txt) => `<span class="tag ${cls||''}">${txt}</span>`;
  const code = (s) => `<code>${s}</code>`;

  // ============================================================
  // GROUP 1 — 基础导论
  // ============================================================
  G.push({ title:'第一部分 · 入门导论', lessons:['intro','layers'] });

  L.push({
    id:'intro',
    title:'1. 为什么要学车载诊断？',
    subtitle:'从通信工程师视角，先建立诊断的全局认知',
    html: `
      <h2>诊断在车上扮演什么角色</h2>
      <p>车载诊断不是一种通信总线，而是<b>跑在通信总线之上的一套"问答协议"</b>。它解决三类问题：</p>
      <ul>
        <li><b>读</b> — 故障码（DTC）、ECU 信息（VIN、零件号、版本）、实时数据（电压、车速、SOC）</li>
        <li><b>控</b> — 强制让 ECU 执行某动作：电机标定、踏板传感器学习、Evac & Fill 等</li>
        <li><b>写</b> — 修改 ECU 的存储数据：VIN、维护信息、刷写新固件</li>
      </ul>

      <h2>OBD vs UDS — 你最容易混的两个词</h2>
      <table class="t">
        <tr><th></th><th>OBD-II (SAE J1979 / ISO 15031)</th><th>UDS (ISO 14229)</th></tr>
        <tr><td>定位</td><td>法规强制（排放/通用故障）</td><td>厂家工程级诊断（万能工具）</td></tr>
        <tr><td>对象</td><td>发动机/动力总成相关</td><td>所有 ECU</td></tr>
        <tr><td>会话</td><td>无（公开访问）</td><td>有（Default/Programming/Extended/Supplier）</td></tr>
        <tr><td>报文</td><td>SID 0x01~0x0A</td><td>SID 0x10~0x3E、0x83~0x87 等</td></tr>
        <tr><td>项目应用</td><td>DFXY 仅保留少量 PID（如 0xF0xx 可读）</td><td><b>DFXY 主要使用</b></td></tr>
      </table>
      <blockquote>口诀：法规检车看 OBD；工程师调车、刷车、查故障，几乎全是 UDS。</blockquote>

      <h2>本课程会带你走完的链路</h2>
      <ol>
        <li>物理层 → CAN/CAN-FD 帧（你已经熟）</li>
        <li>传输层 → ISO-TP（单帧 / 首帧 / 连续帧 / 流控帧）<b>← 你最想搞懂的就在这</b></li>
        <li>会话层 → UDS 报文（SID + 子功能 + 数据）</li>
        <li>应用层 → DID / RID / DTC / 刷写</li>
        <li>软件层 → AUTOSAR DCM/DEM 模块如何把以上一切落到代码</li>
        <li>项目层 → DFXY 项目的真实 DID/RID/Session/Security 配置</li>
      </ol>
      <p>每讲都有<b>真实字节示例</b>，遇到诊断仪报文你能逐字节翻译。</p>
    `
  });

  L.push({
    id:'layers',
    title:'2. 协议栈视角：诊断在哪一层？',
    subtitle:'OSI 模型 vs 车载诊断协议栈',
    html: `
      <h2>一张图说明白</h2>
      <table class="t">
        <tr><th>OSI 层</th><th>诊断协议栈</th><th>对应内容</th></tr>
        <tr><td>7 应用层</td><td>UDS (ISO 14229-1)</td><td>SID、DID、RID、NRC、Session、Security</td></tr>
        <tr><td>5/6 会话/表示</td><td>UDS 状态管理</td><td>S3 timer、SecurityLevel、SuppressPosResp</td></tr>
        <tr><td>4 传输层</td><td>ISO-TP / ISO 15765-2</td><td>SF / FF / CF / FC，分包重组</td></tr>
        <tr><td>3 网络层</td><td>诊断寻址</td><td>物理寻址 / 功能寻址、11/29 位 ID</td></tr>
        <tr><td>1/2 物理/链路</td><td>CAN / CAN-FD</td><td>仲裁、CRC、ACK、最大 8 / 64 字节</td></tr>
      </table>

      <h2>AUTOSAR 中对应的模块</h2>
      <ul>
        <li><b>CanIf / CanDrv</b> — 物理/链路</li>
        <li><b>CanTp</b> — ISO-TP 实现（自动拆 FF/CF/FC）</li>
        <li><b>PduR</b> — 报文路由器</li>
        <li><b>Dcm</b>（你项目里就是这个）— UDS 应用层服务处理器</li>
        <li><b>Dem</b> — 故障事件管理器（DTC 来源）</li>
        <li><b>NvM</b> — DTC、安全计数器、写入数据的存储后端</li>
      </ul>
      <blockquote>记住一个核心抽象：<b>诊断仪发的字节流，被 CanTp 重组成完整 PDU，丢给 Dcm，Dcm 根据 SID 分发给 callout，callout 调用应用层逻辑。</b></blockquote>

      <h2>项目里的入口在哪</h2>
      <p>DFXY 工程的诊断代码主入口分布如下（先有个印象，后面会逐个走读）：</p>
      <ul>
        <li>${code('SourceCode/PLUGIN/AUTOSAR/.../Dcm/DF_XY_A/')} — Dcm 自动生成的配置（DID/RID/Session/Security 表）</li>
        <li>${code('SourceCode/BSW/DIAG/SRC/DiagMain.c')} — 诊断主循环、状态管理</li>
        <li>${code('SourceCode/BSW/DIAG/SRC/DiagAppDidHandle.c')} — DID 读写通用逻辑</li>
        <li>${code('SourceCode/BSW/DIAG/SRC/DiagAppRidHandle.c')} — Routine 通用逻辑</li>
        <li>${code('SourceCode/BSW/DIAG/SRC/DF_XY_A/DiagAppDidCallOut.c')} — 项目专属 DID 回调</li>
        <li>${code('SourceCode/BSW/DIAG/SRC/DF_XY_A/DiagAppRidCallOut.c')} — 项目专属 RID 回调</li>
        <li>${code('SourceCode/BSW/DIAG/SRC/DF_XY_A/DiagAppSecurityAccess.c')} — 0x27 安全访问 seed/key 算法</li>
      </ul>
    `
  });

  // ============================================================
  // GROUP 2 — 物理与传输层（你最想搞懂的：单帧/多帧/流控帧）
  // ============================================================
  G.push({ title:'第二部分 · 传输层（ISO-TP）', lessons:['can','isotp_intro','isotp_frames','cantp_impl'] });

  L.push({
    id:'can',
    title:'3. CAN / CAN-FD 帧与诊断寻址',
    subtitle:'帧结构、ID 与寻址方式一站式掌握',
    html: `
      <h2>诊断只关心数据帧的两件事</h2>
      <ol>
        <li><b>仲裁 ID</b> — 诊断里就是"诊断地址"。常见 11 位（0x7E0~0x7EF 标准）或 29 位（车厂自定）。</li>
        <li><b>数据域 DLC</b> — 经典 CAN 最多 8B，CAN-FD 最多 64B。这个直接决定 ISO-TP 怎么分帧。</li>
      </ol>

      <h2>OBD-II 的标准 ID（背下来）</h2>
      <table class="t">
        <tr><th>方向</th><th>11 位 ID</th><th>29 位 ID</th></tr>
        <tr><td>诊断仪 → ECU（请求）</td><td>0x7DF（功能广播）<br>0x7E0~0x7E7（物理点对点）</td><td>0x18DB33F1（功能）<br>0x18DA<b>xx</b>F1</td></tr>
        <tr><td>ECU → 诊断仪（应答）</td><td>0x7E8~0x7EF</td><td>0x18DAF1<b>xx</b></td></tr>
      </table>
      <blockquote>规律：<b>ECU 应答 ID = 请求 ID + 0x08</b>（11 位时）。29 位则把目标/源地址互换。</blockquote>

      <h2>DFXY 项目里有几个 PduId？</h2>
      <p>从 <code>Dcm_Dsl_Cfg.h</code> 我们看到：</p>
      <pre><code>#define DCM_NUM_RX_PDU_ID   2U   // 1 个物理寻址 + 1 个功能寻址
#define DCM_NUM_TX_PDU_ID   1U   // 1 个发送通道
#define DCM_TOTAL_CONFIGURED_BUFFER_SIZE   2110U
#define DCM_TOTAL_RX_CONFIGURED_BUFFER_SIZE 1087U</code></pre>
      <p>这意味着：项目支持 <b>物理寻址 + 功能寻址两个接收通道</b>，发送通道一个，最大单条 UDS 报文 ~1KB（典型够用）。</p>

      <h2>物理寻址 vs 功能寻址</h2>
      <table class="t">
        <tr><th></th><th>物理寻址 Physical</th><th>功能寻址 Functional</th></tr>
        <tr><td>对象</td><td>点对点 — 仅一个 ECU</td><td>广播 — 所有支持的 ECU</td></tr>
        <tr><td>11 位 ID 例</td><td>0x7E0 → 仅发动机</td><td>0x7DF → 所有 ECU</td></tr>
        <tr><td>能否走多帧</td><td>✅ 完整 ISO-TP</td><td>❌ 只能 SF（≤7B）</td></tr>
        <tr><td>典型用途</td><td>读写 DID、刷写、Routine</td><td>0x10/0x3E/0x11/0x14 这类广播服务</td></tr>
      </table>

      <h2>项目里的体现</h2>
      <p>DFXY 配置 <b>RX PduId = 2</b>，正是物理 + 功能两个独立通道。诊断仪发 0x7DF（或厂家广播 ID）时，多个 ECU 同时收到、同时回。所以你不能用 0x7DF 去读 17 字节 VIN（因为它会被多 ECU 同时应答撞车），必须用物理寻址 0x7Ex。</p>
      <blockquote>记住：<b>"广播只能短，长报文必物理"</b>。</blockquote>
    `
  });

  L.push({
    id:'isotp_intro',
    title:'4. ISO-TP 是什么？为什么要分帧？',
    subtitle:'ISO 15765-2 — 在 8/64 字节 CAN 上传几百字节 UDS 报文',
    html: `
      <h2>问题来了</h2>
      <p>UDS 报文长度可以是几百字节（比如读 VIN 是 17 字节、读 DTC 列表上百字节、刷写一段 4KB Flash）。但经典 CAN 一次最多 8 字节，CAN-FD 也只到 64 字节。<b>怎么把长报文塞进短帧里？</b></p>
      <p>答案：<b>ISO-TP（也叫 ISO 15765-2）</b> 在 CAN 之上做<b>分包 + 重组 + 流控</b>。</p>

      <h2>四种 PCI 帧（核心概念）</h2>
      <p>每个 ISO-TP 帧的<b>第一个字节（高 4 bit）</b>叫 PCI（Protocol Control Information），决定帧类型：</p>
      <table class="t">
        <tr><th>类型</th><th>缩写</th><th>PCI 高 4 bit</th><th>用途</th></tr>
        <tr><td>Single Frame</td><td>SF</td><td><b>0</b>x</td><td>报文 ≤ 7B（CAN）/ 62B（FD），一帧搞定</td></tr>
        <tr><td>First Frame</td><td>FF</td><td><b>1</b>x</td><td>长报文的第一帧，带总长度</td></tr>
        <tr><td>Consecutive Frame</td><td>CF</td><td><b>2</b>x</td><td>长报文的后续帧，带序号</td></tr>
        <tr><td>Flow Control</td><td>FC</td><td><b>3</b>x</td><td>接收方告诉发送方："你可以继续发了"</td></tr>
      </table>
      <blockquote><b>记忆口诀：0/1/2/3 — 单/首/续/控</b>。后面三课逐个拆。</blockquote>
    `
  });

  L.push({
    id:'isotp_frames',
    title:'5. ISO-TP 帧详解：SF / FF / CF / FC',
    subtitle:'单帧、多帧首帧、连续帧、流控帧一次讲透',
    html: `
      <h2>SF 字节结构（经典 CAN，DLC=8）</h2>
      <pre><code>Byte0 (PCI):  0x0L         L = 真实数据长度（1~7）
Byte1..N:    UDS 数据
Byte后面:    0x55 / 0xAA / 0x00 等填充字节（不解析）</code></pre>

      <h2>例 1：进入扩展会话</h2>
      <p>诊断仪发：<code>02 10 03 00 00 00 00 00</code></p>
      <ul>
        <li><code>02</code> — 高 4bit=0 → SF；低 4bit=2 → 后面 <b>2 个字节是真数据</b></li>
        <li><code>10</code> — UDS SID = 0x10（DiagnosticSessionControl）</li>
        <li><code>03</code> — 子功能 = 0x03 → ExtendedDiagnosticSession</li>
        <li><code>00 00 00 00 00</code> — 填充，没有意义</li>
      </ul>
      <p>ECU 正向应答：<code>06 50 03 00 32 01 F4 00</code></p>
      <ul>
        <li><code>06</code> — SF，6 字节有效</li>
        <li><code>50</code> — 正向应答 SID = 请求 SID + 0x40，即 0x10+0x40=0x50</li>
        <li><code>03</code> — 回显子功能</li>
        <li><code>00 32</code> — P2Server_max = 50ms（默认响应超时）</li>
        <li><code>01 F4</code> — P2*Server_max = 5000ms（NRC 0x78 之后的延长超时）</li>
      </ul>
      <blockquote>这个 8 字节里你已经能<b>逐字节读懂</b>。这是诊断的"基本功"。</blockquote>

      <h2>CAN-FD 的 SF 不一样</h2>
      <p>当报文 ≤ 6B 时仍用经典 SF（0x0L）。当 7B ≤ 报文 ≤ 62B 时用 <b>FD-SF</b>：</p>
      <pre><code>Byte0:  0x00            // PCI 类型 = SF，长度位用第二字节
Byte1:  L                // 实际数据长度（最多 62）
Byte2..: UDS 数据</code></pre>
      <p>DFXY 用经典 CAN（看 Dcm 缓冲区配置和 PduId 数量），所以以经典 SF/FF/CF 为主。</p>

      <h2>FF（First Frame）字节结构</h2>
      <pre><code>Byte0 (PCI 高 4bit=1):  0x1X    X = 总长度高 4bit
Byte1:                  YY      总长度低 8bit
合起来 12bit = 总长度（最多 4095 字节）
Byte2..7:               UDS 数据前 6 字节</code></pre>

      <h2>CF（Consecutive Frame）字节结构</h2>
      <pre><code>Byte0 (PCI):  0x2N    N = 序号（1, 2, 3 ... F, 0, 1, 2 ... 循环）
Byte1..7:    UDS 数据后续 7 字节</code></pre>
      <blockquote><b>序号从 1 开始，不是 0！</b> FF 算 0，所以第一个 CF 是 0x21，第二个 0x22，到 0x2F 之后回到 0x20，然后 0x21…如此循环。</blockquote>

      <h2>例：读 VIN（DID 0xF190，应答 17 字节 ASCII）</h2>
      <p>请求很短，单帧：<code>02 22 F1 90 00 00 00 00</code></p>
      <p>应答 20 字节（1B 正向 SID + 2B DID + 17B VIN），需要多帧。假设 VIN = "LBVHA1234567XYZAB"：</p>
      <pre><code>FF: 10 14 62 F1 90 4C 42 56     ← 0x14=20字节总长，'L''B''V'
CF: 21 48 41 31 32 33 34 35     ← 序号1：'H''A''1''2''3''4''5'
CF: 22 36 37 58 59 5A 41 42     ← 序号2：'6''7''X''Y''Z''A''B'</code></pre>
      <p>但是！发送方发完 FF 后<b>不能直接发 CF</b>，必须先<b>等接收方发 FC</b>批准。下一节讲 FC。</p>

      <h2>什么时候出现 FC？</h2>
      <p>当发送方发出 FF 后，<b>接收方必须先回复 FC</b>，才能开始发 CF。这是 ISO-TP 的握手节奏。</p>

      <h2>FC 字节结构</h2>
      <pre><code>Byte0 (PCI):  0x3F     F = FlowStatus
                       0 = ContinueToSend（继续发）
                       1 = Wait（等等，先别发）
                       2 = Overflow（缓冲区溢出，放弃）
Byte1:        BS       Block Size，发完几个 CF 必须再等一次 FC（0=不限）
Byte2:        STmin    最小帧间隔
                       0x00~0x7F = 0~127 ms
                       0xF1~0xF9 = 100~900 μs（CAN-FD 才用）</code></pre>

      <h2>典型握手过程</h2>
      <pre><code>Tester  → ECU:   10 14 62 F1 90 4C 42 56     [FF]
ECU     → Tester: 30 00 0A 00 00 00 00 00      [FC: continue, BS=0 不限, STmin=10ms]
Tester  → ECU:   21 48 41 31 32 33 34 35     [CF1]
Tester  → ECU:   22 36 37 58 59 5A 41 42     [CF2]   ← 全部送达</code></pre>

      <h2>BS 不为 0 时</h2>
      <p>例如 BS=2，STmin=20ms：发送方先发 2 个 CF，<b>停下来等接收方再发一个 FC</b>，FC 里再次告诉它能不能继续、节奏多快。常用于刷写时控制 ECU 不被淹没。</p>

      <h2>容易出的坑</h2>
      <ul>
        <li>${tag('err','坑')} 序号必须 1→F→0→1 循环，跳号会被丢弃</li>
        <li>${tag('err','坑')} STmin 是<b>帧间隔最小值</b>，发太快被丢；太慢则可能 N_Cs 超时</li>
        <li>${tag('warn','注意')} ECU 可能回 0x31（FC Wait），这时<b>启动 N_Bs/N_Cr 计时器</b>，超时整个会话失败</li>
        <li>${tag('ok','技巧')} 抓 CAN log 时按 ID + 帧首字节高 4bit 过滤就能挑出 ISO-TP 全过程</li>
      </ul>
      <p>到这里你已经掌握了 SF/FF/CF/FC 全部四种帧的字节结构。<b>这是诊断的物理基础</b>，后面所有 UDS 字节都建立在它之上。</p>
    `
  });

  // ============================================================
  // GROUP 3 — UDS 协议核心
  // ============================================================
  G.push({ title:'第三部分 · UDS 协议核心', lessons:['uds_frame','nrc','session','security','misc_services','p2_timer','uds_auth'] });

  L.push({
    id:'uds_frame',
    title:'9. UDS 报文结构 — SID / 子功能 / 应答',
    subtitle:'看完这讲所有 UDS 报文都能拆解',
    html: `
      <h2>请求报文结构</h2>
      <pre><code>┌───────┬─────────────┬───────────────────────┐
│  SID  │ Sub-function│ Data (DID/RID/参数等)  │
└───────┴─────────────┴───────────────────────┘
  1 字节   0 或 1 字节         若干字节</code></pre>

      <h2>三种应答可能</h2>
      <table class="t">
        <tr><th>类型</th><th>首字节</th><th>含义</th></tr>
        <tr><td>正向应答</td><td><b>SID + 0x40</b></td><td>请求成功，后跟数据</td></tr>
        <tr><td>负向应答</td><td><b>0x7F</b></td><td>失败，第二字节回显 SID，第三字节为 NRC</td></tr>
        <tr><td>抑制应答</td><td><i>无</i></td><td>请求带了 SuppressBit，ECU 静默不回</td></tr>
      </table>

      <h2>常见 SID 速查</h2>
      <table class="t">
        <tr><th>SID</th><th>名称</th><th>用途</th></tr>
        <tr><td>0x10</td><td>DiagnosticSessionControl</td><td>切换会话</td></tr>
        <tr><td>0x11</td><td>ECUReset</td><td>软/硬复位</td></tr>
        <tr><td>0x14</td><td>ClearDiagnosticInformation</td><td>清 DTC</td></tr>
        <tr><td>0x19</td><td>ReadDTCInformation</td><td>读 DTC（多种子功能）</td></tr>
        <tr><td>0x22</td><td>ReadDataByIdentifier</td><td>读 DID</td></tr>
        <tr><td>0x23</td><td>ReadMemoryByAddress</td><td>读内存（少用）</td></tr>
        <tr><td>0x27</td><td>SecurityAccess</td><td>seed/key 解锁</td></tr>
        <tr><td>0x28</td><td>CommunicationControl</td><td>关闭某些 CAN 通信</td></tr>
        <tr><td>0x2E</td><td>WriteDataByIdentifier</td><td>写 DID</td></tr>
        <tr><td>0x2F</td><td>InputOutputControlByIdentifier</td><td>强制 IO（actuator test）</td></tr>
        <tr><td>0x31</td><td>RoutineControl</td><td>触发 RID（标定/自检/刷写步骤）</td></tr>
        <tr><td>0x34/0x36/0x37</td><td>RequestDownload / Transfer / Exit</td><td>刷写三件套</td></tr>
        <tr><td>0x3D</td><td>WriteMemoryByAddress</td><td>写内存（少用）</td></tr>
        <tr><td>0x3E</td><td>TesterPresent</td><td>保活，防止退出会话</td></tr>
        <tr><td>0x85</td><td>ControlDTCSetting</td><td>暂停/恢复 DTC 监控</td></tr>
      </table>
      <blockquote>规律：<b>正应答 = 请求 SID 加 0x40</b>。0x10→0x50，0x22→0x62，0x27→0x67，0x31→0x71。看到 0x7F 就是出错了。</blockquote>

      <h2>子功能（Sub-function）</h2>
      <p>许多服务在 SID 后面跟 1 字节子功能。例如：</p>
      <ul>
        <li>0x10 01 — 默认会话；0x10 02 — 编程；0x10 03 — 扩展；0x10 60 — 厂家自定</li>
        <li>0x27 01 — 请求 Seed Lev01；0x27 02 — 发送 Key Lev01；0x27 03/04…类推</li>
        <li>0x31 01 XXXX — 启动 RID；0x31 02 XXXX — 停止；0x31 03 XXXX — 请求结果</li>
      </ul>

      <h2>Suppress Bit（高位 bit7）</h2>
      <p>子功能字节的<b>最高位 = 1</b> 时，告诉 ECU"<b>处理成功别回正向应答</b>"，但失败时仍会回 0x7F NRC。</p>
      <pre><code>请求：02 3E <b>80</b> 00 00 00 00 00     ← TesterPresent 带 SuppressBit
应答：（无）                              ← 静默</code></pre>
      <p>这就是<b>为什么 TesterPresent 0x3E 80</b> 是固定写法 — 只是为了保活，不需要 ECU 占用总线回应答。</p>

      <h2>怎么判断</h2>
      <ul>
        <li>子功能 = <code>0x03</code> → 想要正向应答</li>
        <li>子功能 = <code>0x83</code> → 同样的子功能，但抑制正应答（0x83 = 0x80 | 0x03）</li>
      </ul>
    `
  });

  L.push({
    id:'nrc',
    title:'11. NRC 负向应答码完全速查',
    subtitle:'0x7F xx YY 里那个 YY 都是什么意思',
    html: `
      <h2>结构</h2>
      <pre><code>负向应答：7F  &lt;请求SID&gt;  &lt;NRC&gt;
例：    7F  22         31    ← 读 DID 失败，requestOutOfRange</code></pre>

      <h2>开发/调试中最常遇到的 NRC</h2>
      <table class="t">
        <tr><th>NRC</th><th>名称</th><th>典型原因</th></tr>
        <tr><td>0x10</td><td>generalReject</td><td>没分类的拒绝</td></tr>
        <tr><td>0x11</td><td>serviceNotSupported</td><td>SID 没实现</td></tr>
        <tr><td>0x12</td><td>subFunctionNotSupported</td><td>SID 实现了，子功能没</td></tr>
        <tr><td>0x13</td><td>incorrectMessageLengthOrInvalidFormat</td><td>长度对不上</td></tr>
        <tr><td>0x14</td><td>responseTooLong</td><td>应答超过 ECU 缓冲区</td></tr>
        <tr><td>0x21</td><td>busyRepeatRequest</td><td>ECU 忙，稍后重试</td></tr>
        <tr><td>0x22</td><td>conditionsNotCorrect</td><td><b>最常见</b>：车速 ≠0、未点火、温度异常等</td></tr>
        <tr><td>0x24</td><td>requestSequenceError</td><td>步骤错（如先 0x36 没 0x34）</td></tr>
        <tr><td>0x31</td><td>requestOutOfRange</td><td>DID/RID 不存在或值越界</td></tr>
        <tr><td>0x33</td><td>securityAccessDenied</td><td>没解锁就读写受保护对象</td></tr>
        <tr><td>0x35</td><td>invalidKey</td><td>0x27 02 的 key 错了</td></tr>
        <tr><td>0x36</td><td>exceededNumberOfAttempts</td><td>连续 key 错次数超限</td></tr>
        <tr><td>0x37</td><td>requiredTimeDelayNotExpired</td><td>解锁延时未到</td></tr>
        <tr><td>0x70</td><td>uploadDownloadNotAccepted</td><td>刷写起始拒绝</td></tr>
        <tr><td>0x71</td><td>transferDataSuspended</td><td>0x36 中止</td></tr>
        <tr><td>0x72</td><td>generalProgrammingFailure</td><td>Flash 写失败</td></tr>
        <tr><td>0x73</td><td>wrongBlockSequenceCounter</td><td>0x36 块序号错</td></tr>
        <tr><td><b>0x78</b></td><td><b>requestCorrectlyReceived-ResponsePending</b></td><td><b>处理中，请等等！不算失败</b></td></tr>
        <tr><td>0x7E</td><td>subFunctionNotSupportedInActiveSession</td><td>当前会话不允许</td></tr>
        <tr><td>0x7F</td><td>serviceNotSupportedInActiveSession</td><td>当前会话整个 SID 都不让用</td></tr>
      </table>

      <h2>关于 0x78（最容易误解）</h2>
      <p>当 ECU 处理时间超过 P2Server_max（默认 50ms），它会先回 <code>7F xx 78</code> 让诊断仪把超时延长到 P2*Server_max（默认 5000ms），然后继续处理。<b>这不是失败</b>，诊断仪应继续等待真正的应答。</p>
      <blockquote>记忆：<b>78 不是 78（病），是"再给我点时间"</b>。</blockquote>
    `
  });

  L.push({
    id:'session',
    title:'12. 0x10 会话控制 — DFXY 的四个会话',
    subtitle:'Default / Programming / Extended / Supplier',
    html: `
      <h2>会话是什么</h2>
      <p>会话决定了"现在能用哪些服务"。ECU 上电默认在 Default 会话，能用的服务很有限（基本只能读公开 DID、读 DTC）。要做更多事必须先切到对应会话。</p>

      <h2>DFXY 项目配置的四个会话</h2>
      <p>来自 <code>DiagAppSession.h</code>：</p>
      <table class="t">
        <tr><th>子功能</th><th>会话名</th><th>项目宏</th><th>典型用途</th></tr>
        <tr><td>0x01</td><td>DefaultSession</td><td>DCM_DEFAULT_SESSION</td><td>上电默认，可读公开 DID/DTC</td></tr>
        <tr><td>0x02</td><td>ProgrammingSession</td><td>DCM_PROGRAMMING_SESSION</td><td>刷写专用，进入后会重启 Bootloader</td></tr>
        <tr><td>0x03</td><td>ExtendedDiagnosticSession</td><td>DCM_EXTENDED_DIAGNOSTIC_SESSION</td><td><b>大部分 EOL/标定/读受保护数据用它</b></td></tr>
        <tr><td>0x60</td><td>SupplierSession</td><td>DCM_SUPPLIER_SESSION</td><td>供应商私有调试（Mando 内部）</td></tr>
      </table>

      <h2>切换报文示例</h2>
      <pre><code>请求：02 10 03 00 00 00 00 00          ← 进入扩展
应答：06 50 03 00 32 01 F4 00          ← P2=50ms, P2*=5000ms

请求：02 10 60 00 00 00 00 00          ← 进入 Supplier
应答：06 50 60 00 32 01 F4 00</code></pre>

      <h2>S3 Timer — 自动回 Default</h2>
      <p>非默认会话有 <b>S3 计时器（默认 5 秒）</b>。如果 5 秒内没收到任何诊断请求，ECU 会自动切回 Default。<b>所以诊断仪要不停发 0x3E 80 保活</b>（典型每 2 秒一次）。</p>
      <blockquote>看到一次刷写卡了 6 秒，ECU 突然不认 key 了？十有八九是 S3 超时把会话踢回 Default。</blockquote>

      <h2>项目代码入口</h2>
      <p>会话切换 callout：<code>DiagApp_SessionCtrlProcessing()</code> 在 <code>DiagAppSession.c</code>。需要进/出每种会话时做的特殊动作（关 NM、停 IO、切 Bootloader）就在这里。</p>
    `
  });

  L.push({
    id:'security',
    title:'13. 0x27 安全访问 — Seed/Key 流程',
    subtitle:'DFXY 的 Lev01 解锁全过程（16B AES-CMAC）',
    html: `
      <h2>核心思想</h2>
      <p>很多服务（写 VIN、刷写、Routine）必须先"解锁"。诊断仪和 ECU 共享一个<b>密钥算法</b>：</p>
      <ol>
        <li>诊断仪发 <code>0x27 01</code> → ECU 回一个随机 Seed</li>
        <li>诊断仪用算法 <code>Key = f(Seed, SecretKey)</code> 算出 Key</li>
        <li>诊断仪发 <code>0x27 02 &lt;Key&gt;</code></li>
        <li>ECU 内部也算一遍，比对一致 → 解锁；不一致 → NRC 0x35</li>
      </ol>

      <h2>子功能编码规则</h2>
      <table class="t">
        <tr><th>子功能</th><th>含义</th></tr>
        <tr><td>0x01, 0x03, 0x05…(奇)</td><td>requestSeed Level 1, 2, 3…</td></tr>
        <tr><td>0x02, 0x04, 0x06…(偶)</td><td>sendKey Level 1, 2, 3…</td></tr>
      </table>
      <blockquote>奇请 Seed，偶发 Key。两两配对。</blockquote>

      <h2>DFXY 项目配置（来自源码确认）</h2>
      <p>从 <code>DiagAppSecurityAccess.c</code> 看到的真实参数：</p>
      <table class="t">
        <tr><th>参数</th><th>真实值</th></tr>
        <tr><td>安全等级数</td><td><b>仅 1 个 Lev01</b>（<code>DCM_NUM_CONFIGURED_SECURITY_LEVELS = 1U</code>）</td></tr>
        <tr><td><b>Seed 长度</b></td><td><b>16 字节</b>（<code>DIAG_SEED_LV1_LEN = 16</code>）</td></tr>
        <tr><td><b>Key 长度</b></td><td><b>16 字节</b>（<code>DIAG_KEY_LV1_LEN = 16</code>）</td></tr>
        <tr><td><b>算法</b></td><td><b>AES-CMAC</b>（<code>SGP_GenerateCMAC()</code>，AES sbox/Rcon 均在源文件中）</td></tr>
        <tr><td>随机源</td><td><code>Csm_RandomGenerate</code>（CSM/Crypto 真随机数生成器）</td></tr>
        <tr><td>失败上限</td><td>3 次（<code>SECURITY_ACCESS_FAILURE_CNT = 3</code>）</td></tr>
        <tr><td>锁定时间</td><td>10 秒（<code>SECURITY_ACCESS_DELAY_TIME = 10s × (1000/DCM_TASK_TIME)</code>）</td></tr>
        <tr><td>失败计数持久化</td><td>NvM (<code>DiagApp_Secu_FailCnt_SaveNvm/ReadNvm</code>)，断电不丢</td></tr>
      </table>

      <h2>★ StaticSeed 防爆破机制（DFXY 关键设计）</h2>
      <p>同一个会话期内，诊断仪即使<b>反复发 0x27 01</b>，DFXY 也<b>只生成一次新 Seed</b>，后面所有 27 01 都返回这个固定 Seed：</p>
      <pre><code>// DiagAppSecurityAccess.c · SecurityGetSeedLev01 简化版
if (StaticSeed_Flag == 0u) {
    StaticSeed_Flag = 1u;
    Csm_RandomGenerate(...);          // 仅这一次生成
    memcpy(StaticSeed, DiagSecLev1Seed, 16);
} else {
    memcpy(DiagSecLev1Seed, StaticSeed, 16);  // 后续返回固定值
    FailCounter += 1;                  // 反复请求会被计为失败！
    if (FailCounter >= 3) {
        StaticSeed_Flag = 0u;
        return NRC_EXCEED_ATTEMPTS;
    }
}</code></pre>
      <p><b>意义</b>：诊断仪不能"先要一堆 Seed 再慢慢算 Key 试"，因为同会话只有 1 个 Seed，且重复请求被算作失败。要拿新 Seed，必须切换会话或 ECU 复位。</p>

      <h2>典型解锁报文（16B Seed/Key）</h2>
      <pre><code>请求：02 27 01 00 00 00 00 00              ← 要 Seed (单帧)
应答(多帧)：
       10 12 67 01 4F 8A C2 1B            ← FF: 总长 0x12=18B (1 SID + 1 sub + 16 seed)
       21 D9 73 65 2A 18 04 9E
       22 BC F0 5D 27 33 91 6A
       (Seed = 4F 8A C2 1B D9 73 65 2A 18 04 9E BC F0 5D 27 33 91 6A 截 16B)

(诊断仪本地：Key = AES-CMAC(SecretKey, Seed))

请求(多帧)：
       10 12 27 02 &lt;Key 前 4B&gt;            ← FF
       21 &lt;Key 4-10B&gt;
       22 &lt;Key 11-16B&gt;
应答：02 67 02 00 00 00 00 00              ← 解锁成功</code></pre>

      <h2>失败场景与 NRC</h2>
      <pre><code>7F 27 35   invalidKey         ← Key 算错
7F 27 36   exceedNumberOfAttempts  ← 累计 3 次错（DFXY 实际触发条件）
7F 27 37   requiredTimeDelayNotExpired  ← 锁定中，10s 内再请求
7F 27 24   requestSequenceError    ← 没先 27 01 直接 27 02
7F 27 12   subFunctionNotSupported ← 用了不存在的 level (例如 27 03)</code></pre>

      <h2>失败计数器状态机</h2>
      <pre><code>正常 → 27 01 → 算 Key → 27 02 错 → FailCounter+=1
                                              ↓
                                  FailCounter==1 / 2 → 还能再试
                                              ↓
                                  FailCounter==3 → 启动 DelayTimer_10s = 10s
                                              ↓
锁定期间任何 27 01/02 → NRC 0x37 RequiredTimeDelayNotExpired
                                              ↓
                                  10s 到 → FailCounter -= 1（变 2，可再试）
                                  
正确 Key → FailCounter = 0；解锁成功</code></pre>
      <blockquote><b>FailCounter 写到 NvM</b>：意味着<b>诊断仪故意失败 3 次后断电再开机，依然是锁定状态</b>，必须等 10s。这是 DFXY 反爆破的第二道防线。</blockquote>

      <h2>项目实现位置</h2>
      <ul>
        <li><code>SourceCode/BSW/DIAG/SRC/DF_XY_A/DiagAppSecurityAccess.c</code> — Seed/Key 主流程</li>
        <li>同文件包含完整的 AES sbox(256B) + Rcon(10B) + SubBytes/ShiftRows/MixColumns 等 AES 原语</li>
        <li><code>SGP_GenerateCMAC()</code> — 真正的 CMAC 计算入口（在 SGP 模块）</li>
        <li><code>Csm_RandomGenerate()</code> — Crypto 模块真随机数</li>
      </ul>
      <p><b>SecretKey 不在工程代码里</b>，存在受保护的 Flash 区域。诊断仪侧需要拿到对应的 DLL 才能算出正确 Key（厂家"诊断授权"的核心）。</p>
    `
  });

  L.push({
    id:'misc_services',
    title:'14. 其他常用服务 — 0x11 / 0x28 / 0x3E / 0x85',
    subtitle:'保活、复位、屏蔽通信、关 DTC',
    html: `
      <h2>0x11 ECUReset</h2>
      <pre><code>02 11 01    硬复位 (HardReset)
02 11 02    Key-Off-On 模拟
02 11 03    软复位 (SoftReset)         ← 最常用</code></pre>
      <p>常用于：刷完写后让 ECU 重启进入新固件、清除 RAM 状态。</p>

      <h2>0x28 CommunicationControl</h2>
      <p>临时关掉 ECU 的某些 CAN 通信，刷写时<b>避免在线 ECU 互相干扰</b>。</p>
      <pre><code>03 28 03 03    关闭收/发普通通信，只留诊断</code></pre>
      <ul>
        <li>子功能 0x00=enableRxAndTx, 0x01=enableRxAndDisableTx</li>
        <li>0x02=disableRxAndEnableTx, 0x03=disableRxAndTx</li>
        <li>第二字节"通信类型"：0x01=应用报文 0x02=NM 0x03=两者</li>
      </ul>

      <h2>0x3E TesterPresent</h2>
      <pre><code>02 3E 00     正常请求（要应答 02 7E 00）
02 3E 80     带 Suppress Bit（无应答）  ← 推荐</code></pre>
      <p>每 ~2 秒发一次防止 S3 超时把会话踢回 Default。</p>

      <h2>0x85 ControlDTCSetting</h2>
      <p>刷写、标定时，<b>暂时让 DEM 不再记录新 DTC</b>，避免污染：</p>
      <pre><code>02 85 02     DTCSettingTypeOff (停止记录)
02 85 01     DTCSettingTypeOn  (恢复记录)</code></pre>
      <blockquote>建议刷写流程：进 ProgrammingSession → 0x85 02 关 DTC → 0x28 03 03 关通信 → 解锁 → 0x34/36/37 → 复位 → 0x85 01 → 0x28 00 → 退出。</blockquote>
    `
  });

  // ============================================================
  // GROUP 4 — 数据访问与刷写
  // ============================================================
  G.push({ title:'第四部分 · 数据访问与刷写', lessons:['did_read','did_write','io_control','routine','dtc','flash','bootloader_deep','rdtc_ext'] });

  L.push({
    id:'did_read',
    title:'15. 0x22 ReadDataByIdentifier',
    subtitle:'读 DID — 用得最多的服务',
    html: `
      <h2>什么是 DID</h2>
      <p>DID = <b>Data Identifier</b>，2 字节标识符，每一个 DID 对应一段数据。比如 0xF190 永远是 VIN，0xF187 永远是 SwPartNumber。</p>
      <p>DID 范围有<b>语义约定</b>（ISO 14229-1 Annex C）：</p>
      <table class="t">
        <tr><th>范围</th><th>含义</th></tr>
        <tr><td>0x0000 ~ 0x00FF</td><td>OBD-II PID 镜像</td></tr>
        <tr><td>0xF010 ~ 0xF0FF</td><td>厂家 OBD 信息</td></tr>
        <tr><td>0xF180 ~ 0xF19F</td><td><b>识别类（VIN/零件号/版本/日期）</b>（强制定义）</td></tr>
        <tr><td>0xF1A0 ~ 0xF1EF</td><td>厂家自定义</td></tr>
        <tr><td>0xF200 ~ 0xF2FF</td><td>周期性数据</td></tr>
        <tr><td>0xFD00 ~ 0xFEFF</td><td>系统供应商自定义</td></tr>
        <tr><td>0xFF00 ~ 0xFFFF</td><td>UDS 系统保留</td></tr>
      </table>

      <h2>请求/应答格式</h2>
      <pre><code>请求：03 22 F1 90 00 00 00 00         ← 读 0xF190 (VIN)
应答：FF 62 F1 90 &lt;17B 数据&gt;         ← 多帧
       └─ 正应答 SID = 0x22+0x40 = 0x62
                └─ 回显 DID
                       └─ 真实数据</code></pre>
      <p>可以一次<b>请求多个 DID</b>：<code>05 22 F1 90 F1 87 00 00</code>。但 DFXY 配置 <code>DCM_READ_DID_MAX = 1U</code>，所以一次只允许 1 个。</p>

      <h2>底层调用链（项目代码）</h2>
      <pre><code>诊断仪发 22 F1 90
   ↓ ISO-TP
CanTp 重组成完整 PDU
   ↓
PduR 路由到 Dcm
   ↓
Dcm 在 Dcm_Cfg.c 的 DID 表里找 0xF190
   ↓ 找到对应 callout
DiagDidData_VIN_Read(uint8 Data[])    ← 在 DiagAppDidCallOut.c 实现
   ↓
应用层把 VIN 拷到 Data[]，返回 E_OK
   ↓
Dcm 打包正应答交给 PduR / CanTp
   ↓
ECU 发 FF + CF + ...</code></pre>

      <h2>同步 vs 异步 DID</h2>
      <p>从 <code>Dcm_Cfg.c</code> 看到：</p>
      <ul>
        <li><code>IsDidSync = TRUE</code> — 同步：callout 立刻返回数据，简单变量类用</li>
        <li><code>IsDidSync = FALSE</code> — 异步：需要 OpStatus 状态机，<b>从 EEP/NvM/外设读取时用</b>，比如 0xF18B 出厂日期、0xF18C 序列号</li>
      </ul>
      <p>异步 DID 的 callout 要处理三种 OpStatus：</p>
      <pre><code>DCM_INITIAL          // 第一次调用，启动读流程，可能返回 PENDING
DCM_PENDING          // Dcm 轮询，问"读完了吗"
DCM_CANCEL           // 取消（比如超时）</code></pre>
      <blockquote>异步 callout 必须在<b>规定时间内</b>返回结果，否则 Dcm 会发 0x78 ResponsePending 给诊断仪。</blockquote>
    `
  });

  L.push({
    id:'did_write',
    title:'16. 0x2E WriteDataByIdentifier',
    subtitle:'写 DID — 通常需要安全解锁',
    html: `
      <h2>请求/应答格式</h2>
      <pre><code>请求：FF 2E F1 90 &lt;新 17B VIN&gt;        ← 写 VIN
应答：03 6E F1 90 00 00 00 00            ← 6E = 2E+0x40，正应答只回显 DID</code></pre>

      <h2>权限要求</h2>
      <p>写 DID 通常要求：<b>扩展会话 + 安全解锁</b>。Dcm 在配置表里检查不通过就直接回 NRC：</p>
      <ul>
        <li>会话不对 → <code>7F 2E 7F</code> serviceNotSupportedInActiveSession</li>
        <li>没解锁 → <code>7F 2E 33</code> securityAccessDenied</li>
        <li>长度错 → <code>7F 2E 13</code> incorrectMessageLength</li>
      </ul>

      <h2>项目里的写 DID 例</h2>
      <p>从 <code>Dcm_API_Cfg.h</code> 看到 DFXY 工程层暴露的写接口：</p>
      <ul>
        <li><code>DiagDidData_VIN_Write</code> — 0xF190</li>
        <li><code>DiagDidData_EcuManufactureDate_Write</code> — 0xF18B</li>
        <li><code>DiagDidData_ECUSerialNumDataID_Write</code> — 0xF18C</li>
        <li><code>DiagDidData_ClearVariantCodingReq_Write</code> — 清除变体编码（写 = 触发动作）</li>
        <li><code>DiagDidData_EraseEEPDataReq_Write</code> — 写一个 magic 触发 EEP 擦除</li>
        <li><code>DiagDidData_MaintenanceInfo_Write</code> — 写保养信息</li>
      </ul>
      <blockquote>注意 <b>很多 "Write" DID 实际上是"动作触发"</b>：你写一个特定值，应用层就执行某段逻辑（清编码、擦 EEP）。这是工程实战常用技巧。</blockquote>

      <h2>错误码反馈</h2>
      <p>callout 函数签名：</p>
      <pre><code>Std_ReturnType DiagDidData_VIN_Write(
  const uint8 Data[],
  Dcm_NegativeResponseCodeType *ErrorCode);</code></pre>
      <p>callout 校验失败时把 <code>*ErrorCode</code> 设为想要的 NRC（比如 0x22 conditionsNotCorrect），返回 E_NOT_OK。Dcm 自动打包成负应答。</p>
    `
  });

  L.push({
    id:'io_control',
    title:'17. 0x2F InputOutputControlByIdentifier',
    subtitle:'强制控制传感器/执行器（actuator test）',
    html: `
      <h2>用途</h2>
      <p>开发或 EOL 测试时，<b>越过应用层逻辑直接驱动一个 IO</b>：让灯亮一下、让阀打开 50%、让电机转 100rpm。</p>

      <h2>请求格式</h2>
      <pre><code>04 2F &lt;DID hi&gt; &lt;DID lo&gt; &lt;ControlOptionRecord&gt; [&lt;Mask&gt;]

ControlOptionRecord 第一字节：
  00 = returnControlToECU    (交还控制)
  01 = resetToDefault        (恢复默认)
  02 = freezeCurrentState    (冻住当前)
  03 = shortTermAdjustment   (临时强制为指定值)</code></pre>

      <h2>例</h2>
      <pre><code>请求：05 2F 12 34 03 50 00 00       ← 把 IO 0x1234 强制为 0x50
应答：05 6F 12 34 03 50 00 00       ← 已应用</code></pre>
      <p>退出时务必发 <code>0x2F xx xx 00</code>（returnControlToECU），否则 IO 一直被占用。</p>

      <h2>项目里的 IOC</h2>
      <p>DFXY 在 <code>DiagAppIocHandle.c</code>、<code>DiagAppIocIdCallOut.c</code> 实现 IO 控制。比如：</p>
      <ul>
        <li><code>DiagIO_MotorPhs_ReturnControlToEcu</code> — 电机相控制器交还</li>
      </ul>
      <p>注意 <b>2F 同样需要扩展会话 + 安全解锁</b>，且很多 IOC 在车辆运动时拒绝（NRC 0x22 conditionsNotCorrect）。</p>
    `
  });

  L.push({
    id:'routine',
    title:'18. 0x31 RoutineControl — DFXY 17 个标定例程',
    subtitle:'Start / Stop / RequestResults 三套子功能',
    html: `
      <h2>RID 是什么</h2>
      <p>RID = <b>Routine Identifier</b>，2 字节，对应 ECU 内一段"过程"：自检、标定、刷写步骤、特殊清除等。</p>

      <h2>三个子功能</h2>
      <table class="t">
        <tr><th>子功能</th><th>名称</th><th>说明</th></tr>
        <tr><td>0x01</td><td>startRoutine</td><td>启动一个例程</td></tr>
        <tr><td>0x02</td><td>stopRoutine</td><td>停止</td></tr>
        <tr><td>0x03</td><td>requestRoutineResults</td><td>查询执行结果（异步例程必用）</td></tr>
      </table>

      <h2>报文格式</h2>
      <pre><code>请求：04 31 01 02 02 00 00 00       ← 启动 RID 0x0202
应答：05 71 01 02 02 &lt;结果&gt; 00      ← 71 = 31+0x40</code></pre>

      <h2>典型异步例程时序</h2>
      <pre><code>① 04 31 01 02 02 00              → 启动
   05 71 01 02 02 00              ← 已启动 (Started)

② 等几秒（标定中）...

③ 04 31 03 02 02 00              → 查询结果
   05 71 03 02 02 01              ← 完成，结果 = 1 (OK)</code></pre>

      <h2>DFXY 项目的 RID 全表（17 个）</h2>
      <p>来自 <code>Dcm_RoutineControl_Cfg.h</code>：</p>
      <table class="t">
        <tr><th>例程名</th><th>典型用途</th></tr>
        <tr><td>Motor_Calibration</td><td>电机标定（角度/相位）</td></tr>
        <tr><td>Motor_DeCalibration</td><td>电机反标定（清除）</td></tr>
        <tr><td>PHS_Current_Calibration</td><td>PHS 电流标定</td></tr>
        <tr><td>MOC_FUNCTION_TEST</td><td>电机控制器功能自测</td></tr>
        <tr><td>iPTS_Calibration / iPTS_Calibration_Mode</td><td>iPTS 标定 + 模式</td></tr>
        <tr><td>PbcControl</td><td>PBC 控制例程</td></tr>
        <tr><td>PressSen_Calibration</td><td>压力传感器标定</td></tr>
        <tr><td>PedalSen_Calibration</td><td>踏板传感器学习</td></tr>
        <tr><td>Evac_And_Fill</td><td>制动液真空抽吸 + 填充</td></tr>
        <tr><td>Service_Filling</td><td>售后填充</td></tr>
        <tr><td>…还有 6 个</td><td>共 17 个 RID（见 DCM_NUM_ROUTINES = 17）</td></tr>
      </table>

      <h2>项目代码入口</h2>
      <p>每个 RID 在 <code>Dcm_RoutineControlOperations_Cfg.c</code> 里有<b>函数指针绑定</b>，最终调用工程层 <code>DiagAppRidCallOut.c</code>（DFXY 版本在 <code>SourceCode/BSW/DIAG/SRC/DF_XY_A/DiagAppRidCallOut.c</code>）。</p>
      <blockquote>调试技巧：每个 Routine 通常会先校验"<b>当前是不是允许的会话/安全级别 + 车速 = 0 + 制动液不在标定中</b>"。返回 NRC 0x22 90% 是这些条件没满足。</blockquote>
    `
  });

  L.push({
    id:'dtc',
    title:'19. 0x19 ReadDTCInformation + DTC 编码',
    subtitle:'故障码长什么样、怎么读',
    html: `
      <h2>DTC 是什么</h2>
      <p>DTC = <b>Diagnostic Trouble Code</b>，3 字节标识一个故障 + 1 字节状态。例如 <code>C1A001 2F</code>：</p>

      <h2>DTC 3 字节解码</h2>
      <pre><code>         字节1 高 2bit
                ↓
       0b 00 = P (Powertrain 动力总成)
       0b 01 = C (Chassis 底盘)        ← DFXY (IBC=底盘)
       0b 10 = B (Body 车身)
       0b 11 = U (Network 通信)

       字节1 中 2bit = 0/1/2/3 (子类)
       字节1 低 4bit + 字节2 + 字节3 (具体编号)

C1A0 01 → "Chassis"，编号 1A00 / 子项 01
SAE 标准故障 = 0x0xxx；厂家自定义 = 0x1xxx 起</code></pre>

      <h2>DTC Status 字节（位掩码）</h2>
      <table class="t">
        <tr><th>bit</th><th>含义</th></tr>
        <tr><td>0</td><td>testFailed — 当前监控失败</td></tr>
        <tr><td>1</td><td>testFailedThisOperationCycle</td></tr>
        <tr><td>2</td><td>pendingDTC — 待定（一次失败但未确认）</td></tr>
        <tr><td>3</td><td>confirmedDTC — 已确认（多次失败，存 NvM）</td></tr>
        <tr><td>4</td><td>testNotCompletedSinceLastClear</td></tr>
        <tr><td>5</td><td>testFailedSinceLastClear</td></tr>
        <tr><td>6</td><td>testNotCompletedThisOperationCycle</td></tr>
        <tr><td>7</td><td>warningIndicatorRequested — 报警灯请求</td></tr>
      </table>

      <h2>0x19 常用子功能</h2>
      <table class="t">
        <tr><th>子功能</th><th>含义</th></tr>
        <tr><td>0x01</td><td>reportNumberOfDTCByStatusMask — 几个 DTC</td></tr>
        <tr><td>0x02</td><td>reportDTCByStatusMask — DTC 列表</td></tr>
        <tr><td>0x04</td><td>reportDTCSnapshotRecordByDTCNumber — Freeze frame</td></tr>
        <tr><td>0x06</td><td>reportDTCExtendedDataRecordByDTCNumber</td></tr>
        <tr><td>0x0A</td><td>reportSupportedDTC — 全部支持的 DTC</td></tr>
      </table>

      <h2>请求示例</h2>
      <pre><code>请求：03 19 02 09 00 00 00 00       ← 读 confirmed+testFailed 的 DTC
应答(多帧)：
  59 02 09 C1 A0 01 2F C1 B2 03 0F ...
  └─ 子功能 │ Mask │ DTC1+Status │ DTC2+Status …</code></pre>

      <h2>项目里 DTC 来源 — DEM</h2>
      <p>0x19 是 Dcm 提供的"接口"，<b>DTC 真正的"产生地"是 DEM 模块</b>。应用层每检测到故障就调用 <code>Dem_SetEventStatus(EventId, DEM_EVENT_STATUS_FAILED)</code>。DEM 根据 debounce / aging 策略把事件升级成 confirmed DTC，存 NvM。Dcm 处理 0x19 时直接调 DEM API 取数据。</p>

      <h2>清除 DTC — 0x14 ClearDiagnosticInformation</h2>
      <pre><code>请求：04 14 FF FF FF 00 00 00       ← 清所有
应答：01 54 00 00 00 00 00 00       ← 完成

请求：04 14 C1 A0 01 00 00 00       ← 只清 C1A001
应答：01 54 00 00 00 00 00 00</code></pre>
      <p>3 字节 = 要清的 DTC 编号，<code>0xFFFFFF</code> 表示<b>全清</b>。</p>

      <h2>什么时候用</h2>
      <ul>
        <li>EOL 测试通过后清出厂前的"演练故障"</li>
        <li>修完车清 confirmed DTC，让仪表 MIL 灯熄灭</li>
        <li>开发自检通过后清 pendingDTC</li>
      </ul>

      <h2>项目实现</h2>
      <p>0x14 触发 DEM 的 <code>Dem_ClearDTC()</code>，DEM 再清 NvM。注意 <b>0x85 02 关 DTC 监控</b> 不会清已有 DTC，只是不再产生新的。</p>
    `
  });

  L.push({
    id:'flash',
    title:'21. 刷写流程 — 0x34 / 0x36 / 0x37',
    subtitle:'下载、传输、退出三件套',
    html: `
      <h2>刷写整体流程</h2>
      <pre><code>1. 10 02       进入 Programming Session   ← Bootloader 接管
2. 27 01/02    解锁 Lev01
3. 31 01 FF 00 PreProgrammingCondition (RID 检查)
4. 28 03 03    关闭非诊断通信
5. 85 02       关 DTC 监控
6. 31 01 FF 01 EraseMemory (RID 擦 Flash)
7. 34 ...      RequestDownload (告诉 ECU 起始地址 + 长度)
8. 36 01 ...   TransferData 块 1
9. 36 02 ...   TransferData 块 2
   ...
10. 37          RequestTransferExit
11. 31 01 FF 02 CheckProgrammingDependencies (CRC/签名校验)
12. 11 01      ECU Reset 进入新固件
13. 28 00 03   恢复通信
14. 85 01      恢复 DTC 监控
15. 10 01      回到 Default</code></pre>

      <h2>0x34 RequestDownload</h2>
      <pre><code>34 &lt;DataFormat&gt; &lt;AddrLenFormat&gt; &lt;Addr...&gt; &lt;Size...&gt;

例：34 00 44 80008000 00010000
   00 = 数据格式（不压缩不加密）
   44 = 地址 4 字节、长度 4 字节
   0x80008000 = 起始地址
   0x00010000 = 64KB

应答：74 20 0F 02      ← 74 = 34+0x40
  20 = lengthFormatId (高4=2 → 后续 maxNumberOfBlockLength 长度2字节)
  0F02 = ECU 一次最多接受 0x0F02 = 3842 字节(含 SID 1B+SeqNo 1B)</code></pre>

      <h2>0x36 TransferData</h2>
      <pre><code>36 &lt;BlockSeqNo&gt; &lt;Data...&gt;
BlockSeqNo 从 01 开始，每发一块 +1，到 FF 后回 00 再 01...循环

应答：76 &lt;BlockSeqNo&gt;          ← 已收
错误：7F 36 73 (块序号错)
      7F 36 71 (传输被中止)</code></pre>

      <h2>0x37 RequestTransferExit</h2>
      <pre><code>请求：01 37 00 00 00 00 00 00
应答：01 77 00 00 00 00 00 00</code></pre>
      <p>之后通常用 0x31 RID 做 CRC/签名校验，再 0x11 复位。</p>

      <blockquote><b>DFXY 是 IBC（底盘）模块，刷写靠 Bootloader 完成</b>。Application 不直接处理 0x34/0x36/0x37 — 看 <code>Dcm_DefProg_Cfg.h</code> 与 <code>Dcm_Cfg.h</code> 里的 <code>DCM_NUM_ROUTINES = 17U</code> 不包含刷写步骤的 RID，所以这些 service 跳到 Bootloader（jump-to-boot 由进入 0x10 02 触发）。</blockquote>
    `
  });

  // ============================================================
  // GROUP 5 — AUTOSAR 诊断架构
  // ============================================================
  G.push({ title:'第五部分 · AUTOSAR DCM / DEM', lessons:['dcm_arch','dem_arch','callout_layer','dem_config_chain'] });

  L.push({
    id:'dcm_arch',
    title:'22. DCM 模块 = DSL + DSD + DSP',
    subtitle:'AUTOSAR Dcm 内部三件套，看代码必懂',
    html: `
      <h2>DCM 三层架构</h2>
      <table class="t">
        <tr><th>子模块</th><th>全称</th><th>职责</th></tr>
        <tr><td><b>DSL</b></td><td>Diagnostic Session Layer</td><td>下接 PduR/CanTp，管 Rx/Tx 缓冲、ResponsePending、抢占、协议优先级</td></tr>
        <tr><td><b>DSD</b></td><td>Diagnostic Service Dispatcher</td><td>看 SID 把请求<b>分发</b>给具体服务处理函数；管理子功能、SuppressBit</td></tr>
        <tr><td><b>DSP</b></td><td>Diagnostic Service Processor</td><td>每个 UDS 服务的<b>真正实现</b>：0x22/0x2E/0x31… 都是 DSP 函数</td></tr>
      </table>

      <h2>请求一条诊断报文，DCM 内部走的路径</h2>
      <pre><code>CanTp.RxIndication
   ↓
PduR_DcmRxIndication
   ↓
Dcm_StartOfReception / CopyRxData / TpRxIndication      [DSL]
   ↓
Dcm_DsdInternal_DispatchSvcReq                          [DSD]
   ↓ (按 SID 查表)
Dcm_DspInternal_ReadDataByIdentifier                    [DSP]
   ↓ (按 DID 查表)
DiagDidData_VIN_Read                                    [user callout — 你写的!]
   ↓ 返回数据
DSP 打包 → DSD 加 SID 头 → DSL 交给 PduR_DcmTransmit → CanTp.Transmit</code></pre>

      <h2>DCM 配置文件全景（DFXY DF_XY_A 变体）</h2>
      <table class="t">
        <tr><th>文件</th><th>内容</th></tr>
        <tr><td><code>Dcm_Dsl_Cfg.h/.c</code></td><td>RxPduId/TxPduId 数量、缓冲区大小、连接 ID</td></tr>
        <tr><td><code>Dcm_Cfg.h/.c</code></td><td>DID 总表、信号映射、长度、读写函数指针</td></tr>
        <tr><td><code>Dcm_API_Cfg.h</code></td><td>所有 callout 函数的 extern 声明（应用层接口契约）</td></tr>
        <tr><td><code>Dcm_RoutineControl_Cfg.h</code> + <code>Dcm_RoutineControlOperations_Cfg.c</code></td><td>RID 表、Start/Stop/RequestResults 函数指针绑定</td></tr>
        <tr><td><code>Dcm_SecurityAccess_Cfg.h/.c</code></td><td>安全等级、Seed/Key callout 绑定、延时计数器</td></tr>
        <tr><td><code>Dcm_CommunicationControl_Cfg.h/.c</code></td><td>0x28 通信控制配置</td></tr>
        <tr><td><code>Dcm_DefProg_Cfg.h</code></td><td>编程会话默认设置（OEM Boot 常量）</td></tr>
      </table>
      <blockquote>这个架构的设计哲学：<b>把"协议解析"和"业务实现"完全解耦</b>。Dcm 只懂 UDS 怎么解析；具体读什么、写到哪、做什么动作 — 全交给 callout（应用层），所以你 BSW/DIAG 文件夹里的代码才是核心。</blockquote>
    `
  });

  L.push({
    id:'dem_arch',
    title:'23. DEM 模块基础',
    subtitle:'故障从"事件"到"DTC"的过程',
    html: `
      <h2>DEM 在做什么</h2>
      <p>应用层不直接产生 DTC。它只产生 <b>Event</b>（事件），DEM 来决定这个事件够不够格升级成 DTC：</p>
      <pre><code>App: Dem_SetEventStatus(DEM_EVENTID_BRAKE_PEDAL_STUCK, DEM_EVENT_STATUS_FAILED)
                  ↓
DEM Debounce: 连续 N 次 FAILED 才认 (counter / time-based)
                  ↓
DEM Aging:    停一段时间没再失败就降级
                  ↓
DTC State:    pending → confirmed → 触发存 NvM
                  ↓
0x19 ReadDTCInformation 才能查出来</code></pre>

      <h2>关键概念</h2>
      <ul>
        <li><b>EventId</b> — 应用层用的内部 ID（uint16）</li>
        <li><b>DTC</b> — 诊断仪能看到的 3 字节编号（如 C1A001）</li>
        <li><b>Debounce</b> — 防抖；典型 "5 个监控周期内失败 ≥ 3 次"</li>
        <li><b>Aging</b> — 老化；典型 "40 个 OperationCycle 没失败就清"</li>
        <li><b>OperationCycle</b> — 一般 = 一次 IGN-ON 到 IGN-OFF</li>
        <li><b>FreezeFrame</b> — 故障发生瞬间的快照（车速、电池电压、温度等）</li>
        <li><b>ExtendedData</b> — 扩展数据（occurrence counter, aging counter）</li>
      </ul>

      <h2>DEM 与 NvM 的关系</h2>
      <p>DTC 必须断电不丢，所以 DEM 把 confirmed DTC + status + freeze frame 放在 NvM 块里。<b>每次 confirmed 状态变化、每个 OperationCycle 结束都会触发 NvM 写</b>，这是为什么 NvM 配置里能看到一堆 DEM 块。</p>
      <blockquote>注意：DFXY 工程的 EEP 处理逻辑在 <code>DiagAppEEPHandle.c</code>。DTC 之外，写 DID（VIN、维护信息等）也走 EEP/NvM。</blockquote>
    `
  });

  L.push({
    id:'callout_layer',
    title:'24. Callout 层 — 应用工程师的"主战场"',
    subtitle:'你 80% 的工作时间花在这',
    html: `
      <h2>什么是 Callout</h2>
      <p>Dcm/Dem 配置生成的是<b>函数指针表</b>，指向你工程层手写的函数。这些被 BSW 调用的应用层函数就是 callout。</p>

      <h2>DFXY 工程 callout 文件层级</h2>
      <pre><code>SourceCode/BSW/DIAG/
├── HDR/                              头文件
│   ├── DiagAppDidCallOut.h           DID callout 声明
│   ├── DiagAppRidCallOut.h           RID callout 声明
│   ├── DiagAppIocIdCallOut.h         IO 控制 callout 声明
│   └── DiagAppSecurityAccess.h       安全访问声明
├── SRC/                              通用实现（多 OEM 共享）
│   ├── DiagMain.c                    主循环 (周期 5ms)
│   ├── DiagAppDidHandle.c            DID 通用读写处理
│   ├── DiagAppRidHandle.c            RID 通用处理
│   ├── DiagAppDidCallOutCommon.c     公共 DID 实现 (VIN/版本号等)
│   ├── DiagAppRidCallOutCommon.c     公共 RID
│   ├── DiagAppEEPHandle.c            EEP 读写
│   ├── DiagAppSession.c              会话切换 callout
│   └── DF_XY_A/                      ★ 项目专属
│       ├── DiagAppDidCallOut.c       DFXY 自己的 DID 实现
│       ├── DiagAppRidCallOut.c       DFXY 自己的 RID 实现
│       ├── DiagAppIocIdCallOut.c     DFXY IO 控制
│       ├── DiagAppPidCallOut.c       OBD PID
│       ├── DiagAppSecurityAccess.c   ★ Seed/Key 算法
│       ├── DiagAppDFXYRidHandle.c    XY 特殊 RID 子流程
│       └── DiagAppDFXYSupport.c      杂项支持
└── CFG/VariantName/                  变体配置开关</code></pre>

      <h2>典型 callout 模板</h2>
      <pre><code>// 同步 DID 读
Std_ReturnType DiagDidData_HWVersion_Read(uint8 Data[])
{
    Data[0] = 'A'; Data[1] = '.'; Data[2] = '0'; Data[3] = '0';
    return E_OK;
}

// 异步 DID 读 (需要 OpStatus 状态机)
Std_ReturnType DiagDidData_VIN_Read(
    Dcm_OpStatusType OpStatus,
    uint8 Data[])
{
    static uint8 step = 0;
    switch (OpStatus) {
        case DCM_INITIAL:
            step = 0;
            EEP_StartReadVIN();
            return DCM_E_PENDING;
        case DCM_PENDING:
            if (EEP_ReadVINComplete()) {
                EEP_GetVIN(Data);
                return E_OK;
            }
            return DCM_E_PENDING;
        case DCM_CANCEL:
            EEP_AbortReadVIN();
            return E_OK;
    }
    return E_NOT_OK;
}</code></pre>
      <p><b>重点：</b>异步 callout 一定要在<b>有限步内</b>完成，否则 Dcm 一直发 0x78 给诊断仪，诊断仪也有总超时。</p>
    `
  });

  // ============================================================
  // GROUP 6 — DFXY 项目实战
  // ============================================================
  G.push({ title:'第六部分 · DFXY 项目实战', lessons:['dfxy_overview','dfxy_did_table','dfxy_rid_table','dfxy_seq_security','dfxy_walkthrough','practice_endtoend']});

  L.push({
    id:'dfxy_overview',
    title:'25. DFXY 诊断画像',
    subtitle:'你接手项目第一天该看的全景表',
    html: `
      <h2>项目身份</h2>
      <ul>
        <li><b>OEM</b>：东风（DF_XY_A 变体名）</li>
        <li><b>ECU</b>：IBC（Integrated Brake Control，集成式制动控制器，底盘域，C 类故障）</li>
        <li><b>软件供应商</b>：万都（Mando）</li>
        <li><b>MCU</b>：Infineon TC387（看路径 <code>AUTOCORE_TC387/</code>）</li>
        <li><b>BSW</b>：Elektrobit AUTOSAR Dcm 5.0.19</li>
      </ul>

      <h2>诊断关键数据（来自 Dcm 配置）</h2>
      <table class="t">
        <tr><th>项</th><th>值</th><th>来源</th></tr>
        <tr><td>DID 数量</td><td><b>87</b></td><td><code>DCM_NUM_DID_DATA = 87U</code></td></tr>
        <tr><td>DID 信号数</td><td>87（一对一）</td><td><code>DCM_DID_SIGNALS_COUNT = 87U</code></td></tr>
        <tr><td>最大 DID 数据</td><td>1000 字节</td><td><code>DCM_DID_MAX_SIZE = 1000U</code></td></tr>
        <tr><td>RID 数量</td><td><b>17</b></td><td><code>DCM_NUM_ROUTINES = 17U</code></td></tr>
        <tr><td>RxPduId</td><td>2（物理+功能）</td><td><code>DCM_NUM_RX_PDU_ID = 2U</code></td></tr>
        <tr><td>TxPduId</td><td>1</td><td><code>DCM_NUM_TX_PDU_ID = 1U</code></td></tr>
        <tr><td>会话数</td><td>4</td><td>Default/Programming/Extended/Supplier</td></tr>
        <tr><td>安全等级</td><td>1（Lev01）</td><td><code>DCM_NUM_CONFIGURED_SECURITY_LEVELS = 1U</code></td></tr>
        <tr><td>缓冲区总大小</td><td>2110 B</td><td><code>DCM_TOTAL_CONFIGURED_BUFFER_SIZE</code></td></tr>
        <tr><td>Rx 缓冲区</td><td>1087 B</td><td>支持 ~1KB 单请求</td></tr>
        <tr><td>DID 最大读个数</td><td>1</td><td><code>DCM_READ_DID_MAX = 1U</code> — 严格</td></tr>
        <tr><td>字节序转换</td><td>对 DID 启用</td><td><code>DCM_DID_ENDIANNESS_CONVERSION = STD_ON</code></td></tr>
      </table>

      <h2>多 OEM 一套代码结构</h2>
      <p>看 <code>SourceCode/BSW/DIAG/SRC/</code>：除了 <code>DF_XY_A/</code>，还能看到 <code>FAW/</code>、<code>HKMC/</code>、<code>HUAWANG_F03/</code>、<code>FORD/</code>、<code>MHD/</code>、<code>SYMC/</code>、<code>TESLA/</code>、<code>CEER/</code>、<code>CEVT/</code>。<b>同一份制动 ECU 软件支持 10+ OEM 项目</b>，靠的是：</p>
      <ul>
        <li>各 OEM 自己的 callout 文件夹（DID/RID/SecAccess 不同）</li>
        <li>变体宏（如 <code>M_CAR_MAKER == FAW</code>）</li>
        <li>Dcm 生成代码也按变体放 <code>Dcm/CEER/</code>、<code>Dcm/DF_XY_A/</code> 等</li>
      </ul>
    `
  });

  L.push({
    id:'dfxy_did_table',
    title:'26. DFXY DID 完整对照表',
    subtitle:'87 个 DID 的语义、长度、callout（按源码核对）',
    html: `
      <h2>识别类（0xF1xx）— ISO 14229-1 强制定义</h2>
      <p>下表全部来自 <code>SourceCode/BSW/DIAG/SRC/DF_XY_A/DiagAppDidCallOut.c</code>，每个 DID 上方注释里写明 <code>SID = 0x22 / DID 0xXX / Len = N</code>。</p>
      <table class="t">
        <tr><th>DID</th><th>名称</th><th>长度</th><th>权限</th><th>callout 函数</th></tr>
        <tr><td>0xF179</td><td>HWVersion（硬件版本号）</td><td>2 B</td><td>R</td><td>DiagDidData_HWVersion_Read</td></tr>
        <tr><td>0xF187</td><td><b>ComponentNumber</b>（零部件号）</td><td>14 B</td><td>R</td><td>DiagDidData_ComponentNumber_Read（值="460073XY0A"）</td></tr>
        <tr><td>0xF188</td><td><b>SwPartNumber</b>（软件零件号）</td><td>14 B</td><td>R</td><td>DiagDidData_SwPartNumber_Read（值="47207XY00A"）</td></tr>
        <tr><td>0xF189</td><td>SWVersion（软件版本号）</td><td>2 B</td><td>R</td><td>DiagDidData_SWVersion_Read</td></tr>
        <tr><td>0xF18A</td><td>SystemSupplierID（系统供应商 ID）</td><td>10 B</td><td>R</td><td>DiagDidData_SystemSupplierID_Read（值="M30023"）</td></tr>
        <tr><td><b>0xF18B</b></td><td>EcuManufactureDate（ECU 出厂日期）</td><td>4 B</td><td><b>R/W</b></td><td>EcuManufactureDate_Read/Write（写入 NvM EEP）</td></tr>
        <tr><td><b>0xF18C</b></td><td>ECUSerialNumber（ECU 序列号）</td><td>21 B</td><td><b>R/W</b></td><td>ECUSerialNumDataID_Read/Write（写入 NvM EEP）</td></tr>
        <tr><td><b>0xF190</b></td><td><b>VIN</b>（车辆识别号）</td><td>17 B</td><td><b>R/W</b></td><td>DiagDidData_VIN_Read/Write</td></tr>
        <tr><td>0xF193</td><td>SupplierECUHWID（供应商硬件 ID）</td><td>16 B</td><td>R</td><td>DiagDidData_SupplierECUHWID_Read</td></tr>
        <tr><td>0xF195</td><td>SupplierECUSWID（供应商软件 ID）</td><td>16 B</td><td>R</td><td>DiagDidData_SupplierECUSWID_Read</td></tr>
        <tr><td>0xF197</td><td><b>SystemName</b>（系统名称）</td><td>10 B</td><td>R</td><td>DiagDidData_SystemName_Read（值="IBC"）</td></tr>
        <tr><td>0xF199</td><td>SWReleaseDate（软件发布日期）</td><td>4 B</td><td>R</td><td>DiagDidData_SWReleaseDate_Read</td></tr>
      </table>

      <h2>OBD/EOL 类（0xF0xx）</h2>
      <table class="t">
        <tr><th>DID</th><th>名称</th><th>长度</th><th>权限</th><th>说明</th></tr>
        <tr><td><b>0xF010</b></td><td>EOLDate（EOL 标定日期 / VIM 数据）</td><td>12 B</td><td>R/W</td><td>EOLDate_Read/Write — 写需异步 VIM 状态机+EEP，可能 NRC 0x72 generalProgrammingFailure</td></tr>
      </table>

      <h2>厂家自定义类（0xF1F0~0xF1FF）</h2>
      <table class="t">
        <tr><th>DID</th><th>名称</th><th>说明</th></tr>
        <tr><td>0xF1F0</td><td>ECUID</td><td>—</td></tr>
        <tr><td>0xF1F2</td><td>MtrStrokePos（电机行程位置）</td><td>实时数据</td></tr>
      </table>

      <h2>实时数据类（车辆状态）</h2>
      <p>从 <code>DiagAppDidCallOut.c</code> 的 read 接口列表抽取，全部走 callout 实时取值：</p>
      <table class="t">
        <tr><th>callout 名</th><th>含义</th><th>典型应用</th></tr>
        <tr><td>DiagDidData_IgnStatus_Read</td><td>点火状态 IGN ON/OFF/CRANK</td><td>诊断条件预检</td></tr>
        <tr><td>DiagDidData_BattVolt_Read</td><td>电池电压</td><td>欠压保护、刷写前置</td></tr>
        <tr><td>DiagDidData_OdometerValue_Read</td><td>累计里程</td><td>保养、保修判断</td></tr>
        <tr><td>DiagDidData_VehicleSpeed_Read</td><td>车速</td><td>RID 标定要求 0 km/h</td></tr>
        <tr><td>DiagDidData_TimeStamp_Read</td><td>时间戳</td><td>故障关联</td></tr>
        <tr><td>DiagDidData_EngineSpeed_Read</td><td>发动机转速</td><td>条件检查</td></tr>
        <tr><td>DiagDidData_xEVReadySts_Read</td><td>电动车 Ready 状态</td><td>EV 工况判定</td></tr>
        <tr><td>DiagDidData_SocValue_Read</td><td>电池荷电量 SOC</td><td>低 SOC 抑制写操作</td></tr>
        <tr><td>DiagDidData_UsageMode_Read</td><td>使用模式</td><td>—</td></tr>
        <tr><td>DiagDidData_PowerMode_Read</td><td>电源模式</td><td>—</td></tr>
        <tr><td>DiagDidData_BattSOC_Read</td><td>电池 SOC（另一份）</td><td>—</td></tr>
        <tr><td>DiagDidData_MaintenanceInfo_Read/Write</td><td>保养信息</td><td>4S 店写</td></tr>
        <tr><td>DiagDidData_FingerPrint_Read</td><td>指纹（上次刷写记录）</td><td>追溯</td></tr>
        <tr><td>DiagDidData_CurrentRunPartition_Read</td><td>当前运行 Partition (A/B 区)</td><td>OTA 双区切换</td></tr>
      </table>

      <h2>"动作触发型"DID（写 = 触发流程）</h2>
      <p>这些 DID 表面是 0x2E 写，实际是<b>"写一个 magic 值就执行一段动作"</b>：</p>
      <table class="t">
        <tr><th>callout 名</th><th>动作</th></tr>
        <tr><td>DiagDidData_ClearVariantCodingReq_Write</td><td>清除变体编码</td></tr>
        <tr><td>DiagDidData_EraseEEPDataReq_Write</td><td>擦除整片 EEP（出厂复位）</td></tr>
      </table>

      <h2>容易踩的坑</h2>
      <ul>
        <li><b>F187 vs F188 互换</b>：F187 是 ComponentNumber（产品组件号 14B），F188 是 SwPartNumber（软件零件号 14B），不要颠倒。诊断标准是 vehicleManufacturerSpare，但 OEM 实际语义看项目而定。</li>
        <li><b>F18A vs F189</b>：F189 是 2 字节 SWVersion（数字版本号），F18A 是 10 字节 SystemSupplierID（厂家字符串）。</li>
        <li><b>F18C 实际 21 字节</b>：注释里有 "Len=21" 但有些文档误标为 17，按代码 <code>ECUSerialNumDataID_LEN</code> 为准。</li>
        <li><b>EOLDate 在 F010 不在 F19C</b>：F19C 在标准里是 ECUInstallationDate，DFXY 不实现。</li>
      </ul>
      <blockquote><b>权威获取真实 DID 列表</b>：<code>grep -n "DiagDidData_.*_Read" SourceCode/BSW/DIAG/SRC/DF_XY_A/DiagAppDidCallOut.c</code>，把所有匹配函数名收集起来，每个对应一个 DID。配置侧搜 <code>Dcm_Cfg.c</code> 里 <code>DcmDspDid_0x</code> 拿到 DID 编号映射。</blockquote>
    `
  });

  L.push({
    id:'dfxy_rid_table',
    title:'27. DFXY RID 完整对照表',
    subtitle:'13 组 routine — 按 DiagAppRidCallOut.c 源码核对',
    html: `
      <h2>全部 RID（按源码注释 SID/RID 编号）</h2>
      <p>下表 RID 编号全部来自 <code>SourceCode/BSW/DIAG/SRC/DF_XY_A/DiagAppRidCallOut.c</code> 函数顶部 <code>SID = 0x31 / RID = 0xXX</code> 注释。</p>
      <table class="t">
        <tr><th>#</th><th>Routine 名</th><th>RID</th><th>子功能</th><th>说明</th></tr>
        <tr><td>1</td><td>Check_Preconditions</td><td><b>0x0203</b></td><td>Start</td><td>刷写前置条件检查（电压/车速/IGN/挡位/EngSpd）</td></tr>
        <tr><td>2</td><td>Version_Switchover</td><td><b>0xDD04</b></td><td>Start / Result</td><td>OTA A/B 区版本切换</td></tr>
        <tr><td>3</td><td>PbcControl</td><td><b>0x3002</b></td><td>Start / Result</td><td>PBC（驻车制动控制器）执行控制</td></tr>
        <tr><td>4</td><td>Press_Cal</td><td><b>0x8066</b></td><td>Start / Result</td><td>压力传感器零点标定</td></tr>
        <tr><td>5</td><td>Pedal_Cal</td><td><b>0x8065</b></td><td>Start / Result</td><td>踏板位置传感器学习</td></tr>
        <tr><td>6</td><td>iPTS_CalData</td><td><b>0xF506</b></td><td>Start (1B inParam) / Result</td><td>智能踏板模拟器标定数据存储</td></tr>
        <tr><td>7</td><td>Service_Filling</td><td><b>0x02AD</b></td><td>Start / <b>Stop</b> / Result</td><td>售后填充（持续模式，可中途停）</td></tr>
        <tr><td>8</td><td>Evac_And_Fill</td><td><b>0xF002</b></td><td>Start (1B inParam) / <b>Stop</b> / Result</td><td>制动液真空抽吸 + 注液</td></tr>
        <tr><td>9</td><td>Static_Test</td><td><b>0x02AE</b></td><td>Start / Stop / Result</td><td>静态自检（不动车）</td></tr>
        <tr><td>10</td><td>WhlSens（轮速传感器）</td><td>—</td><td>Start / Stop / Result</td><td>轮速传感器测试</td></tr>
        <tr><td>11</td><td>AbsEsc_Test</td><td><b>0x02B9</b></td><td>Start (5B inParam) / Stop / Result</td><td>ABS/ESC 动态测试，单轮控制</td></tr>
        <tr><td>12</td><td>BaseBrake_Test</td><td><b>0x02BA</b></td><td>Start (4B inParam) / Stop / Result</td><td>基础制动测试，4 轮同时</td></tr>
        <tr><td>13</td><td>TPMS_System_Reset</td><td><b>0xE0F0</b></td><td>Start / Result</td><td>胎压监测系统复位</td></tr>
        <tr><td>14</td><td>TPMS_Factory_Reset</td><td>0xE0xx</td><td>Start / Result</td><td>胎压监测出厂复位</td></tr>
      </table>
      <p><b>RID 数 ≠ Routine 数</b>：Dcm 配置 <code>DCM_NUM_ROUTINES = 17</code> 是把每个 RID 的 Start/Stop/Result 算独立操作得来的，源码侧只有 ~13-14 个不同的 RID 编号。</p>

      <h2>带输入参数的 RID（要传数据进 ECU）</h2>
      <pre><code>iPTS_CalData (0xF506)
  inParam0 = 1B：标定模式选择 (0/1/2)

Evac_And_Fill (0xF002)
  inParam0 = 1B：抽吸/填充时长档位

PbcControl (0x3002)
  inParam0 = 1B：控制模式 (检查后调用 DiagRid_DataCheck_Pbc)

AbsEsc_Test (0x02B9)
  inParam0[0] = 目标压力 (≤80 bar)
  inParam0[1] = 压力变化率 (50~200%)
  inParam0[2..3] = 保压时间 (≤100, 单位 2ms = ≤200ms)
  inParam0[4] = 轮控选择 (≤3)
  超出范围 → NRC 0x31 requestOutOfRange

BaseBrake_Test (0x02BA)
  inParam0[0] = 目标压力 (≤100)
  inParam0[1] = 压力变化率 (50~100%)
  inParam0[2..3] = 保压时间 (1~1000ms)</code></pre>

      <h2>典型 RID 时序（Pedal_Cal 0x8065）</h2>
      <pre><code>① 10 03                              进入 ExtendedSession
   50 03 00 32 01 F4

② 27 01                              请求 Seed (16B)
   多帧应答 67 01 &lt;Seed16B&gt;

③ 27 02 &lt;Key16B&gt;                    发送 Key (16B)
   67 02

④ 04 31 01 80 65 00                  启动 Pedal_Cal
   05 71 01 80 65 00                  已启动 (Started, IN_PROGRESS)

⑤ ... 用户依次踩踏板到位/松踏板 ...
   每 1s 自动发 3E 80 保活

⑥ 04 31 03 80 65 00                  查询结果
   05 71 03 80 65 01                  完成，01 = SUCCESS</code></pre>

      <h2>RID 通用结果码（出现在 outParam0[0]）</h2>
      <table class="t">
        <tr><th>值</th><th>宏</th><th>含义</th></tr>
        <tr><td>0x00</td><td>RID_CAL_COMPLETED_SUCCESS / RID_STAT_START_SUCCESS</td><td>启动成功 / 完成成功</td></tr>
        <tr><td>0x01</td><td>RID_CAL_COMPLETED_FAILURE / RID_STAT_COMPLETED_FAILURE</td><td>完成但失败</td></tr>
        <tr><td>0x02</td><td>RID_CAL_IN_PROGRESS / RID_IN_PROGRESS</td><td>进行中（继续 0x31 03 轮询）</td></tr>
        <tr><td>0x10</td><td>ROUTINE_CTRL_CAL_FAIL_NO_REACTION</td><td>启动后无响应（30 个 task 周期）</td></tr>
        <tr><td>0x11</td><td>ROUTINE_CTRL_CAL_FAIL_SENSOR_OFFSET</td><td>iPTS 标定失败 — 传感器偏移</td></tr>
        <tr><td>0x12</td><td>ROUTINE_CTRL_CAL_FAIL_SENSOR_NOISE</td><td>传感器噪声过大</td></tr>
        <tr><td>0x13</td><td>ROUTINE_CTRL_CAL_FAIL_SENSOR_FAULT</td><td>传感器故障</td></tr>
        <tr><td>0x14</td><td>ROUTINE_CTRL_CAL_FAIL_NVM_WRITE</td><td>NvM 写失败</td></tr>
        <tr><td>0x15</td><td>ROUTINE_CTRL_CAL_FAIL_WRONG_SEQUENCE</td><td>用户操作步骤错</td></tr>
      </table>

      <h2>设计模式总结</h2>
      <ul>
        <li>${tag('','★')} <b>简单标定 RID</b>（Press_Cal/Pedal_Cal/Version_Switchover）只有 Start+Result</li>
        <li>${tag('','★')} <b>持续模式 RID</b>（Service_Filling/Evac_And_Fill/Static_Test/AbsEsc_Test/BaseBrake_Test）含 Stop，可中途取消</li>
        <li>${tag('warn','注意')} 几乎所有 RID 第一步先调 <code>DiagMain_ConditionCheck_DF()</code>：失败 → NRC 0x22 conditionsNotCorrect。条件包括 <b>电压不欠/不过 + IGN ON + 车速=0 + 挡位 P</b></li>
        <li>${tag('warn','注意')} <b>动态测试类（AbsEsc/BaseBrake）</b> 有 DynoMode（功能模式）开关：<code>DiagT_VMM_DynoMode == 1</code> 时跳过车速检查</li>
        <li>${tag('ok','技巧')} 异步标定：5ms 任务 <code>Diag_Hndlr5ms()</code> 推进 <code>DiagT_PressCalStat / DiagT_iPTS_CALDATA_Rsp</code> 状态机；callout 在 <code>DCM_PENDING</code> 中查这些状态决定返回 OK/PENDING/NOT_OK</li>
        <li>${tag('err','超时')} 大部分 RID 内部有 <code>CalibrationTimeout</code>（典型几秒），超时返回 NRC 0x10 GeneralReject</li>
        <li>${tag('','★')} <b>互斥锁</b>：<code>DiagF_RID_MODE_SEL</code> 全局变量，同时只能跑一类动态测试。新 Start 检查 <code>DIAG_DYNAMIC_MODE_NONE/REQ_STOP_ACTUATION/自身</code>，否则 NRC 0x24</li>
      </ul>

      <h2>RID 0x0203 Check_Preconditions 的 outParam 编码</h2>
      <p>该 RID 不返回 NRC，而是<b>用 outParam0[0] 报告哪一项不通过</b>，方便诊断仪定位：</p>
      <table class="t">
        <tr><th>outParam0</th><th>原因</th></tr>
        <tr><td>0x00</td><td>全部通过，可以刷写</td></tr>
        <tr><td>0x02</td><td>电压欠压或过压</td></tr>
        <tr><td>0x03</td><td>车速 ≥ U8_DIAG_STANDSTILL_SPEED</td></tr>
        <tr><td>0x04</td><td>引擎/电机转速异常</td></tr>
        <tr><td>0x05</td><td>挡位非 P 或目标挡位非 P</td></tr>
        <tr><td>0x06</td><td>IGN 状态不对</td></tr>
      </table>
    `
  });

  L.push({
    id:'dfxy_seq_security',
    title:'28. DFXY 会话/安全权限矩阵',
    subtitle:'什么时候允许什么操作',
    html: `
      <h2>会话表</h2>
      <table class="t">
        <tr><th>子功能</th><th>会话</th><th>S3 超时回 Default</th><th>典型可执行服务</th></tr>
        <tr><td>0x01</td><td>Default</td><td>—</td><td>0x22 公开 DID, 0x19 读 DTC, 0x3E 保活</td></tr>
        <tr><td>0x02</td><td>Programming</td><td>是</td><td>0x34/36/37 刷写, 0x11 复位 (Bootloader 接管)</td></tr>
        <tr><td>0x03</td><td>Extended</td><td>是</td><td>0x2E 写 DID, 0x31 RID, 0x2F IOC, 0x14 清 DTC, 0x85 控 DTC, 0x28 控通信</td></tr>
        <tr><td>0x60</td><td>Supplier</td><td>是</td><td>Mando 私有调试 DID/RID</td></tr>
      </table>

      <h2>安全等级（与源码核对）</h2>
      <table class="t">
        <tr><th>Level</th><th>Seed 长度</th><th>Key 长度</th><th>算法</th><th>解锁后能做</th></tr>
        <tr><td>Lev01</td><td><b>16 字节</b></td><td><b>16 字节</b></td><td><b>AES-CMAC</b></td><td>所有写 DID / 所有 RID / 所有 IOC</td></tr>
      </table>
      <p>由于 DFXY 只配了 <b>1 个安全级</b>，意味着：<b>解一次锁就能做所有事</b>。这与某些项目"读受保护数据用 Lev01，写 VIN 用 Lev03"的多级方案不同。<b>但失败 3 次会锁 10 秒</b>（NRC 0x37），FailCounter 在 NvM 里持久化、断电不丢。</p>

      <h2>权限矩阵（与代码对应）</h2>
      <table class="t">
        <tr><th>服务</th><th>会话</th><th>需 Lev01 解锁</th><th>额外条件</th></tr>
        <tr><td>0x22 读 0xF190 VIN</td><td>Default/Extended</td><td>否</td><td>—</td></tr>
        <tr><td>0x2E 写 0xF190 VIN</td><td>Extended</td><td>✅</td><td><code>DiagMain_ConditionCheck_DF()</code></td></tr>
        <tr><td>0x2E 写 0xF18B 制造日期</td><td>Extended</td><td>✅</td><td>同上 + EEP 异步写</td></tr>
        <tr><td>0x2E 写 0xF010 EOLDate</td><td>Extended</td><td>✅</td><td>VIM 异步状态机</td></tr>
        <tr><td>0x31 0x8065 Pedal_Cal</td><td>Extended</td><td>✅</td><td>车速=0 + IGN ON</td></tr>
        <tr><td>0x31 0x8066 Press_Cal</td><td>Extended</td><td>✅</td><td>车速=0 + IGN ON</td></tr>
        <tr><td>0x31 0x02BA BaseBrake_Test</td><td>Extended</td><td>✅</td><td>挡位 P + Diag_FctMode</td></tr>
        <tr><td>0x31 0xF002 Evac_And_Fill</td><td>Extended</td><td>✅</td><td>IGN ON + 互斥锁空闲</td></tr>
        <tr><td>0x31 0x0203 Check_Preconditions</td><td>Extended/Programming</td><td>否（典型）</td><td>仅检查，不动 IO</td></tr>
        <tr><td>0x2F IO 控制</td><td>Extended</td><td>✅</td><td>—</td></tr>
        <tr><td>0x14 清所有 DTC</td><td>Extended</td><td>否（典型）</td><td>—</td></tr>
        <tr><td>0x85 关 DTC 监控</td><td>Extended</td><td>否</td><td>—</td></tr>
        <tr><td>0x28 关通信</td><td>Extended/Programming</td><td>否</td><td>—</td></tr>
        <tr><td>0x34/36/37 刷写</td><td>Programming</td><td>✅</td><td>Bootloader 接管</td></tr>
      </table>
      <blockquote>这张表项目里以函数指针 + Sec/Ses 引用形式硬编码在 <code>Dcm_RoutineControlOperations_Cfg.c</code>、<code>Dcm_Cfg.c</code> 的 DID 表里。要更准的"哪个 DID 哪个 RID 需要哪个会话/级别"，搜索 <code>SecurityLevelRef</code> / <code>SessionRef</code>。</blockquote>
    `
  });

  L.push({
    id:'dfxy_walkthrough',
    title:'29. 走读 DiagAppDidCallOut.c',
    subtitle:'你的"主战场"代码长什么样',
    html: `
      <h2>文件开头 — 全局常量（按源码核对）</h2>
      <p><code>SourceCode/BSW/DIAG/SRC/DF_XY_A/DiagAppDidCallOut.c</code>：</p>
      <pre><code>uint8 ComponentNumber[ComponentNumber_LEN] = {"460073XY0A"};  // 0xF187 (14B)
uint8 SwPartNumber[SwPartNumber_LEN]       = {"47207XY00A"};   // 0xF188 (14B)
uint8 System_Name[System_Name_LEN]         = {"IBC"};          // 0xF197 (10B)
uint8 SysSprID[SysSprID_LEN]               = {"M30023"};       // 0xF18A (10B)
uint8 SupECUHWVNum[Version_NUM_LEN]        = {"A.00"};         // 用于 0xF193 拼装
uint8 Device_Number_default = 0x20;</code></pre>
      <p>这些<b>常量</b>就是 ECU 出厂"身份证"的内容，诊断仪读 0xF187/F188/F197/F18A 拿到的就是它们。改版本号 / 改零件号就改这里。</p>

      <h2>典型 callout 三种风格</h2>
      <pre><code>// ① 同步 — 直接从常量数组拷贝
Std_ReturnType DiagDidData_SystemName_Read(uint8 Data[])
{
    Data_Clear(Data, System_Name_LEN);
    Data_Load(System_Name, Data, System_Name_LEN, 0u);
    return DCM_E_OK;
}

// ② 同步 — 从 NvM RAM mirror 拷贝（NvM 已经把 EEP 内容映射到 RAM）
Std_ReturnType DiagDidData_EcuManufactureDate_Read(uint8 Data[])
{
    Data_Clear(Data, EcuManufactureDate_LEN);
    Data_Load(&NvMCdd_Block_DIAG_SEGMENT_RAM[EPP_DIAG_ADDR_EcuManufcteDate],
              Data, EcuManufactureDate_LEN, 0u);
    return DCM_E_OK;
}

// ③ 异步 — 写 EEP，要 OpStatus 状态机
Std_ReturnType DiagDidData_EcuManufactureDate_Write(
    const uint8 Data[],
    Dcm_OpStatusType OpStatus,
    Dcm_NegativeResponseCodeType *ErrorCode)
{
    static uint8 u8ReqBlockId = 0u;
    if (DiagMain_ConditionCheck_DF() == E_NOT_OK) {
        *ErrorCode = NRC_CONDITIONS_NOT_CORRECT;       // 0x22
        return E_NOT_OK;
    }
    if ((WriteNvMBlockReq_Diag == 0u) && (u8ReqBlockId == 0u)) {
        WriteNvMBlockReq_Diag = 1u;
        u8ReqBlockId = NvMConf_NvMBlockDescriptor_NvMCdd_Block_DIAG_SEGMENT;
        Data_Load(Data, NvMCdd_Block_DIAG_SEGMENT_RAM,
                  EcuManufactureDate_LEN, EPP_DIAG_ADDR_EcuManufcteDate);
    }
    return DiagApp_EEP_WriteRes(&u8ReqBlockId, ErrorCode);  // 内部轮询 OK/PENDING/FAIL
}</code></pre>

      <h2>为什么有些 DID 在 Common 文件，有些在 DF_XY_A 文件</h2>
      <ul>
        <li><b>Common 文件</b>（<code>DiagAppDidCallOutCommon.c</code>）：所有 OEM 都用同样实现 — 比如硬件版本、引导版本，从同一段固件里读。</li>
        <li><b>DF_XY_A 文件</b>：东风专属的 DID 内容。比如 0xF197 系统名"IBC"、0xF187 "460073XY0A" 这种带项目代号的字符串，每个 OEM 不同；或者 0xF1F2 行程位置的换算公式 OEM 不同。</li>
      </ul>

      <h2>常见 bug 定位思路</h2>
      <blockquote><b>诊断仪读 0xF18A 拿到乱码</b> → 大概率是 <code>SysSprID_LEN</code> 长度宏与 Dcm 配置里的 DID Data Size 不一致，<code>Data_Load</code> 拷少/多了字节。看 <code>Dcm_Cfg.c</code> 里 0xF18A 表项的 DataSize vs <code>Diag_Setting.h</code> 里的长度宏。</blockquote>
      <blockquote><b>写 0xF18B 总是 NRC 0x22</b> → <code>DiagMain_ConditionCheck_DF()</code> 在某项不满足。打开 <code>DiagAppMain.c</code>/<code>DiagAppRidHandle.c</code>，看条件检查里电压/IGN/车速/挡位哪一项 false。</blockquote>
      <blockquote><b>写 0xF18B 卡在 NRC 0x78 几秒后变 0x72</b> → EEP/NvM 写超时。看 <code>DiagApp_EEP_WriteRes</code> 实现，多半是 NvM 块在做其它写操作（<code>WriteNvMBlockReq_Diag</code> 没释放），或 NvM 后台错误。</blockquote>
    `
  });

  L.push({
    id:'practice_endtoend',
    title:'30. 综合实战 — 端到端解读一次诊断',
    subtitle:'拿到一份 BLF 抓包，从字节到含义',
    html: `
      <h2>给你一段 CAN log（节选）</h2>
      <pre><code>// ID=0x7E0 (诊断仪→ECU)，ID=0x7E8 (ECU→诊断仪)
1.000  7E0  02 10 03 00 00 00 00 00
1.012  7E8  06 50 03 00 32 01 F4 00
1.500  7E0  02 27 01 00 00 00 00 00
1.512  7E8  06 67 01 12 34 56 78 00
1.700  7E0  06 27 02 AA BB CC DD 00
1.712  7E8  02 67 02 00 00 00 00 00
2.000  7E0  03 22 F1 90 00 00 00 00
2.012  7E8  10 14 62 F1 90 4C 42 56
2.020  7E0  30 00 14 00 00 00 00 00
2.040  7E8  21 48 41 31 32 33 34 35
2.060  7E8  22 36 37 58 59 5A 41 42
2.500  7E0  02 11 01 00 00 00 00 00
2.512  7E8  02 51 01 00 00 00 00 00</code></pre>

      <h2>逐行翻译</h2>
      <table class="t">
        <tr><th>时间</th><th>方向</th><th>含义</th></tr>
        <tr><td>1.000</td><td>→ECU</td><td>10 03 进入 ExtendedSession</td></tr>
        <tr><td>1.012</td><td>←ECU</td><td>50 03 + P2/P2*：进入成功，超时配 50ms/5000ms</td></tr>
        <tr><td>1.500</td><td>→ECU</td><td>27 01 请求 Seed</td></tr>
        <tr><td>1.512</td><td>←ECU</td><td>67 01 12 34 56 78 → Seed = 0x12345678</td></tr>
        <tr><td>1.700</td><td>→ECU</td><td>27 02 AA BB CC DD → 发 Key</td></tr>
        <tr><td>1.712</td><td>←ECU</td><td>67 02 → 解锁成功</td></tr>
        <tr><td>2.000</td><td>→ECU</td><td>22 F1 90 → 读 VIN（单帧请求）</td></tr>
        <tr><td>2.012</td><td>←ECU</td><td><b>FF</b>：总长 0x14=20B，前 6B = 62 F1 90 4C 42 56（"...LBV"）</td></tr>
        <tr><td>2.020</td><td>→ECU</td><td><b>FC</b>：CTS, BS=0, STmin=20ms</td></tr>
        <tr><td>2.040</td><td>←ECU</td><td><b>CF1</b>：48 41 31 32 33 34 35 → "HA12345"</td></tr>
        <tr><td>2.060</td><td>←ECU</td><td><b>CF2</b>：36 37 58 59 5A 41 42 → "67XYZAB"</td></tr>
        <tr><td>2.500</td><td>→ECU</td><td>11 01 → 硬复位</td></tr>
        <tr><td>2.512</td><td>←ECU</td><td>51 01 → 已确认，将复位</td></tr>
      </table>

      <h2>VIN 拼接</h2>
      <p>FF 后 3B (62 F1 90) 是 SID + DID 头，<b>真正 VIN 数据从 4C 开始</b>：</p>
      <pre><code>4C 42 56   "LBV"
48 41 31 32 33 34 35   "HA12345"
36 37 58 59 5A 41 42   "67XYZAB"
合并 17 字节 = "LBVHA1234567XYZAB"</code></pre>

      <h2>给自己出几个练习题</h2>
      <ol>
        <li>${tag('warn','题')} 这条报文可不可以用 ID=0x7DF 广播？为什么？（提示：广播 + 多帧）</li>
        <li>${tag('warn','题')} 如果 1.500 的 27 01 之前没发 10 03，ECU 会回什么？</li>
        <li>${tag('warn','题')} 如果 1.700 发的 Key 错了，下一次 27 01 立刻又发，ECU 回什么 NRC？</li>
        <li>${tag('warn','题')} 把 2.000 的 22 F1 90 改成 22 F1 91 (SupplierECUSWID)，DCM 怎么处理？答：在 Dcm_Cfg.c 找 0xF191 → 调对应 callout → 返回值打包应答。</li>
      </ol>

      <h2>到此为止你已经掌握</h2>
      <ul>
        <li>${tag('ok','✓')} 物理层和 ISO-TP 全部 4 种帧的字节结构</li>
        <li>${tag('ok','✓')} UDS 报文 SID/子功能/正负应答的解析</li>
        <li>${tag('ok','✓')} 13 类常用 NRC 的成因</li>
        <li>${tag('ok','✓')} Session/Security/DID/RID/DTC/刷写的工作流程</li>
        <li>${tag('ok','✓')} AUTOSAR DCM 三层架构 (DSL/DSD/DSP)</li>
        <li>${tag('ok','✓')} DEM 事件→DTC 升级链路</li>
        <li>${tag('ok','✓')} DFXY 项目的 DID/RID/Session/Security 全貌</li>
        <li>${tag('ok','✓')} 应用层 callout 的写法和定位 bug 思路</li>
      </ul>
      <p>下一步建议：</p>
      <ol>
        <li>抓一段实车诊断 BLF，按本课方法逐字节翻译</li>
        <li>读 <code>DiagAppDidCallOut.c</code> 里 5 个 DID 的实现，对照配置表</li>
        <li>追一个 RID 从 <code>Dcm_RoutineControlOperations_Cfg.c</code> 入口到 <code>DiagAppRidCallOut.c</code> 真正实现</li>
        <li>看 <code>DiagAppSecurityAccess.c</code> 的 Seed/Key 算法</li>
      </ol>
      <blockquote>有任何具体的报文 / NRC / 函数想深挖的，回到对话框告诉我，我可以为下一版课程继续追加章节。</blockquote>
    `
  });

  // ============================================================
  // GROUP 7 — 进阶专题
  // ============================================================
  G.push({ title:'第七部分 · 进阶专题', lessons:['seedkey_lab','nrc_full','dtc_deep','canfd_diag'] });

  L.push({
    id:'seedkey_lab',
    title:'31. Seed/Key 算法实战 — AES-CMAC',
    subtitle:'诊断仪侧从 Seed 算 Key 的完整伪代码',
    html: `
      <h2>为什么是 AES-CMAC，不是简单异或</h2>
      <p>早期 ECU 用过 "Key = Seed XOR Const" 这种弱算法，被诊断仪逆向后随便破解。现代量产项目（DFXY 也是）一律走 <b>密码学强算法 + 厂家保密 SecretKey</b>。AES-CMAC 是 RFC 4493 标准消息认证码：</p>
      <pre><code>Key = AES-CMAC(SecretKey, Seed)
                  ↑                ↑
                16B 厂家秘密     16B 随机种子
            存在 ECU 安全 Flash</code></pre>
      <p>诊断仪要拿到 SecretKey 才能算 Key — 厂家发授权 DLL 给诊断仪厂商，DLL 里硬编码了 SecretKey。</p>

      <h2>AES-CMAC 标准流程（RFC 4493）</h2>
      <pre><code>输入：SecretKey (16B), Message=Seed (16B)
输出：MAC (16B) = Key

步骤：
1. L = AES-ECB(SecretKey, 0x00...00)
2. 如果 L 最高位 = 0：K1 = L &lt;&lt; 1
   否则：K1 = (L &lt;&lt; 1) ⊕ 0x87
3. Seed 正好 16B（一个完整 block），不需要 padding
4. M' = Seed ⊕ K1
5. T = AES-ECB(SecretKey, M')
6. 返回 T 全部 16B 作为 MAC</code></pre>

      <h2>诊断仪侧 Python 伪代码</h2>
      <pre><code>from Crypto.Cipher import AES
from Crypto.Util.strxor import strxor

SECRET_KEY = bytes.fromhex('XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')

def lshift(b16):
    n = int.from_bytes(b16, 'big')
    return ((n &lt;&lt; 1) & ((1 &lt;&lt; 128) - 1)).to_bytes(16, 'big')

def aes_cmac(key, msg):
    cipher = AES.new(key, AES.MODE_ECB)
    L = cipher.encrypt(b'\\x00' * 16)
    K1 = lshift(L) if L[0] & 0x80 == 0 else strxor(lshift(L), b'\\x00'*15 + b'\\x87')
    return cipher.encrypt(strxor(msg, K1))

# 用法
seed = bytes.fromhex('4F8AC21BD973652A18049EBCF05D2733')
key  = aes_cmac(SECRET_KEY, seed)
print('27 02 应答应发：', key.hex())</code></pre>

      <h2>CAPL 脚本（Vector CANoe）</h2>
      <pre><code>on key 'F1' {
    byte seed[16], key[16];
    diag_request 0x27, 0x01;
    diag_get_response_data(seed);
    SecAlgo_AesCmac(SECRET_KEY, 16, seed, 16, key);
    diag_request 0x27, 0x02, key[0..15];
}</code></pre>

      <h2>常见调试场景</h2>
      <table class="t">
        <tr><th>现象</th><th>诊断</th></tr>
        <tr><td>27 02 一直 NRC 0x35 invalidKey</td><td>SecretKey 不对，或大小端搞反，或 Seed 截取错</td></tr>
        <tr><td>27 01 第二次开始 NRC 0x36</td><td>StaticSeed 机制：同会话再要 Seed 已被记为失败 +1</td></tr>
        <tr><td>27 01 直接 NRC 0x37</td><td>之前累计 3 次错，DelayTimer 在跑。等 10 秒</td></tr>
        <tr><td>27 02 NRC 0x13</td><td>Key 长度不对。DFXY 必须 16B（不是 4B）</td></tr>
        <tr><td>27 02 NRC 0x24 sequenceError</td><td>没先发 27 01 直接发 27 02，或会话超时回 Default</td></tr>
      </table>

      <h2>SecretKey 的存储与轮换</h2>
      <ul>
        <li><b>位置</b>：DFXY 的 SecretKey 不在普通 Flash，在受保护的 HSM/CSM 区，应用不可读</li>
        <li><b>轮换</b>：每个项目一把唯一 Key。换车型 = 换 Key</li>
        <li><b>泄漏后果</b>：诊断仪可以无限解锁、刷恶意固件，所以是<b>厂家最高机密</b>之一</li>
        <li><b>授权</b>：诊断仪厂商签 NDA → 拿到 DLL（含 SecretKey 但被混淆/反调试保护）→ 用 DLL 解锁</li>
      </ul>
    `
  });

  L.push({
    id:'nrc_full',
    title:'32. NRC 完整速查表（30+ 全收录）',
    subtitle:'ISO 14229-1 标准 + DFXY 实际触发场景',
    html: `
      <h2>使用方法</h2>
      <p>抓包看到 <code>7F xx YY</code>，按 YY 在下表查含义和"在 DFXY 项目里通常什么原因触发"。</p>

      <h2>通用类（0x10~0x14）</h2>
      <table class="t">
        <tr><th>NRC</th><th>名称</th><th>DFXY 实际场景</th></tr>
        <tr><td>0x10</td><td>generalReject</td><td>RID 内部超时（如 Press_Cal 标定 30 个 task 周期没响应）</td></tr>
        <tr><td>0x11</td><td>serviceNotSupported</td><td>SID 没在 Dcm_Cfg.c 配置（如 0x86 ResponseOnEvent 在 DFXY 不实现）</td></tr>
        <tr><td>0x12</td><td>subFunctionNotSupported</td><td>子功能错（如 27 03 不存在的 Level）</td></tr>
        <tr><td>0x13</td><td>incorrectMessageLengthOrInvalidFormat</td><td>请求长度不对（如 27 02 跟了 4B Key 而不是 16B）</td></tr>
        <tr><td>0x14</td><td>responseTooLong</td><td>应答超 Rx 缓冲区</td></tr>
      </table>

      <h2>处理状态类（0x21~0x24）</h2>
      <table class="t">
        <tr><th>NRC</th><th>名称</th><th>DFXY 实际场景</th></tr>
        <tr><td>0x21</td><td>busyRepeatRequest</td><td>Dcm 在处理别的请求</td></tr>
        <tr><td>0x22</td><td><b>conditionsNotCorrect</b></td><td><b>最常见！</b><code>DiagMain_ConditionCheck_DF()</code> 不通过：电压欠/过、IGN OFF、车速&gt;0、挡位非 P</td></tr>
        <tr><td>0x24</td><td>requestSequenceError</td><td>步骤错：先 0x36 没 0x34；先 27 02 没 27 01；RID Result 没先 Start</td></tr>
      </table>

      <h2>请求参数类（0x31）</h2>
      <table class="t">
        <tr><th>NRC</th><th>名称</th><th>DFXY 实际场景</th></tr>
        <tr><td>0x31</td><td><b>requestOutOfRange</b></td><td>DID/RID 不存在；inParam 越界（AbsEsc_Test 目标压力&gt;80）；VIM_CONDITION_NOT</td></tr>
      </table>

      <h2>安全访问类（0x33~0x37）</h2>
      <table class="t">
        <tr><th>NRC</th><th>名称</th><th>DFXY 实际场景</th></tr>
        <tr><td>0x33</td><td>securityAccessDenied</td><td>没解锁就操作受保护对象（写 VIN、跑 RID）</td></tr>
        <tr><td>0x35</td><td>invalidKey</td><td>27 02 Key 算错（多半 SecretKey 不对或大小端反）</td></tr>
        <tr><td>0x36</td><td>exceededNumberOfAttempts</td><td>FailCounter 累计到 3</td></tr>
        <tr><td>0x37</td><td>requiredTimeDelayNotExpired</td><td>10 秒锁定期内任何 27 01/02</td></tr>
      </table>

      <h2>上传/下载类（0x70~0x73）</h2>
      <table class="t">
        <tr><th>NRC</th><th>名称</th><th>DFXY 实际场景</th></tr>
        <tr><td>0x70</td><td>uploadDownloadNotAccepted</td><td>0x34 起始拒绝（地址越界、Bootloader 未就绪）</td></tr>
        <tr><td>0x71</td><td>transferDataSuspended</td><td>0x36 中途异常（Flash 写错、CRC 错）</td></tr>
        <tr><td>0x72</td><td>generalProgrammingFailure</td><td>EEP/NvM 写失败</td></tr>
        <tr><td>0x73</td><td>wrongBlockSequenceCounter</td><td>0x36 块序号错（前一块 SeqNo=05，本块期望 06，结果发 04）</td></tr>
      </table>

      <h2>响应延时（0x78）— 不是错误</h2>
      <table class="t">
        <tr><th>NRC</th><th>名称</th><th>DFXY 实际场景</th></tr>
        <tr><td><b>0x78</b></td><td>requestCorrectlyReceived-ResponsePending</td><td>callout 返回 DCM_E_PENDING，Dcm 自动给诊断仪发 0x78 让其延长超时到 P2*=5000ms</td></tr>
      </table>

      <h2>会话/状态类（0x7E~0x7F）</h2>
      <table class="t">
        <tr><th>NRC</th><th>名称</th><th>DFXY 实际场景</th></tr>
        <tr><td>0x7E</td><td>subFunctionNotSupportedInActiveSession</td><td>当前会话不允许某子功能</td></tr>
        <tr><td>0x7F</td><td>serviceNotSupportedInActiveSession</td><td>Default 发 0x2E 写 VIN；Default 发 0x31 RID</td></tr>
      </table>

      <h2>NRC 0x78 的"双层超时"</h2>
      <pre><code>诊断仪发请求
   ↓
ECU 在 P2_server (50ms) 内必须回什么
   ↓
   ├─ 正应答 / 负应答 → 结束
   └─ 0x78 → 把超时延长到 P2*_server (5000ms)
                ↓
                继续等
                ↓
                ├─ 真正应答来 → 结束
                ├─ 又一个 0x78 → 再延 5000ms（可循环）
                └─ 5000ms 都没来 → 诊断仪自己判断 ECU 死了

ECU 内部什么时候发 0x78？
   - callout 返回 DCM_E_PENDING
   - Dcm 计数到 P2_server-某个余量 (典型 45ms)
   - 自动打包 7F xx 78 发出
   - 然后继续等 callout</code></pre>

      <h2>DFXY 看 NRC 反查代码的诀窍</h2>
      <p>每个 NRC 在 <code>DiagAppRidCallOut.c</code> / <code>DiagAppDidCallOut.c</code> 都对应一个宏：</p>
      <pre><code>NRC_CONDITIONS_NOT_CORRECT       = 0x22
NRC_REQUEST_SEQUENCE_ERROR        = 0x24
NRC_REQUEST_OUT_RANGE             = 0x31
NRC_GENERAL_REJECT                = 0x10
NRC_GENERAL_PROGRAM_FAILURE       = 0x72
NRC_REQ_CORRECT_RSP_PENDING       = 0x78
NRC_EXCEED_ATTEMPTS               = 0x36
NRC_REQUIRED_TIME_DALAY           = 0x37
NRC_POSITIVE_RESPONSE             = 0x00 (内部用)</code></pre>
      <blockquote><b>调试技巧</b>：现场看到 NRC，回工程 grep <code>"NRC_xxx"</code> 找出所有给 *ErrorCode 赋这个值的位置，逐个对照场景就能定位到具体哪个分支触发。</blockquote>
    `
  });

  L.push({
    id:'dtc_deep',
    title:'33. DTC / DEM 深入',
    subtitle:'故障从产生到读出的完整链路',
    html: `
      <h2>DTC 4 字节布局</h2>
      <pre><code>byte0    byte1    byte2    byte3
&lt;Hi&gt;     &lt;Mid&gt;    &lt;Lo&gt;    &lt;Status&gt;
└─DTC 编号 3 字节─┘   └─状态 1 字节─┘

例：C1 A0 01  2F
DTC = 0xC1A001
Status = 0x2F</code></pre>

      <h2>DTC 编号 3 字节解码</h2>
      <table class="t">
        <tr><th>位段</th><th>含义</th></tr>
        <tr><td>byte0[7:6]</td><td>00=P / 01=C / 10=B / 11=U</td></tr>
        <tr><td>byte0[5:4]</td><td>00=SAE 通用 / 01=厂家 1 / 10=SAE / 11=厂家 2</td></tr>
        <tr><td>byte0[3:0]</td><td>故障大类编号</td></tr>
        <tr><td>byte1, byte2</td><td>故障细分</td></tr>
      </table>
      <p>DFXY 是 IBC 制动控制器（底盘域），所以大量 DTC 以 <code>C1xx xx</code> 开头（C=Chassis，1=厂家自定义）。</p>

      <h2>Status 字节 8 位掩码（重要！）</h2>
      <pre><code>bit7  bit6  bit5  bit4  bit3  bit2  bit1  bit0
WIR  TNCT  TFSL TNCS  CDTC  PDTC  TFTC  TF

bit0 TF (testFailed)              当前监控失败
bit1 TFTC (testFailedThisCycle)   本循环失败过
bit2 PDTC (pendingDTC)            一次失败但未确认
bit3 CDTC (confirmedDTC)          ★ 已确认，存 NvM
bit4 TNCS (testNotCompletedSinceLastClear)  上次清后没完成
bit5 TFSL (testFailedSinceLastClear)        上次清后失败过
bit6 TNCT (testNotCompletedThisCycle)       本循环未完成
bit7 WIR  (warningIndicatorRequested)       报警灯请求

Status 0x2F = 0b00101111 = TF + TFTC + PDTC + CDTC + TFSL
意思：当前失败 + 本循环失败 + 待定 + 已确认 + 上次清后失败过</code></pre>

      <h2>DTC 状态迁移（DEM 内部）</h2>
      <pre><code>初始 (0x50 = TNCS+TNCT)
   ↓ 应用层调 Dem_SetEventStatus(EventId, FAILED)
   ↓ Debounce: 5 个监控周期内 ≥ 3 次失败
   ↓
PENDING (0x04 = PDTC)
   ↓ 又一个 OperationCycle 失败
   ↓
CONFIRMED (0x0F = CDTC + TFSL + TFTC + TF)
   ↓ 写 NvM，断电不丢
   ↓ 故障消失，N 个 OpCycle 没再失败
   ↓
AGED (清除 CDTC 位，留下 TFSL 历史)</code></pre>

      <h2>FreezeFrame（冻结帧 / 故障快照）</h2>
      <p>故障第一次确认（CDTC=1）瞬间，DEM 自动抓拍一组数据存 NvM：</p>
      <table class="t">
        <tr><th>典型字段</th><th>说明</th></tr>
        <tr><td>VehicleSpeed</td><td>故障时车速</td></tr>
        <tr><td>BatteryVoltage</td><td>电池电压</td></tr>
        <tr><td>EngineSpeed</td><td>引擎转速</td></tr>
        <tr><td>OdometerValue</td><td>累计里程</td></tr>
        <tr><td>EcuTemp</td><td>ECU 温度</td></tr>
        <tr><td>OperationCycleCounter</td><td>第几个上电循环</td></tr>
      </table>
      <pre><code>读：03 19 04 C1 A0 01    ReadDTCSnapshotByDTCNumber
应答：59 04 C1 A0 01 2F &lt;snapshot data...&gt;</code></pre>

      <h2>ExtendedData（扩展数据）</h2>
      <p>每个 DTC 还有附加计数器：</p>
      <ul>
        <li><b>OccurrenceCounter</b> — 这个 DTC 总共 confirmed 过几次</li>
        <li><b>AgingCounter</b> — 还需要几个 OpCycle 才老化</li>
        <li><b>FailedCycles</b> — 累计失败循环数</li>
      </ul>
      <pre><code>读：03 19 06 C1 A0 01 01    ReadDTCExtendedData (record=01)
应答：59 06 C1 A0 01 2F 01 &lt;extended data&gt;</code></pre>

      <h2>DEM Debounce 两种策略</h2>
      <p><b>1. Counter-based</b>：</p>
      <pre><code>每 50ms 检查一次：
  失败 → counter += JumpUp (典型 +1)
  通过 → counter -= JumpDown (典型 -2)
  counter ≥ FailedThreshold (如 +127) → 升级 PENDING/CONFIRMED
  counter ≤ PassedThreshold (如 -127) → 降级 / 清失败</code></pre>
      <p><b>2. Time-based</b>：</p>
      <pre><code>失败持续 ≥ FailedTime (如 500ms) → PENDING/CONFIRMED
通过持续 ≥ PassedTime (如 5s) → 降级</code></pre>

      <h2>DFXY 项目典型 DTC 示例（推测）</h2>
      <table class="t">
        <tr><th>DTC</th><th>含义</th></tr>
        <tr><td>C1A001</td><td>压力传感器电气故障</td></tr>
        <tr><td>C1A002</td><td>踏板位置传感器故障</td></tr>
        <tr><td>C1B0xx</td><td>电机相关</td></tr>
        <tr><td>C1C0xx</td><td>制动液液位</td></tr>
        <tr><td>U0001</td><td>CAN 通信丢失（U=Network）</td></tr>
      </table>
      <blockquote><b>查 DFXY 真实 DTC 列表</b>：找 <code>Dem_Cfg.h</code> / <code>Dem_DemEvent.c</code> 或者 grep <code>Dem_SetEventStatus</code> 看应用层在什么条件下设故障，再反查 EventId → DTC 的映射表。</blockquote>

      <h2>OperationCycle = 一个上电周期</h2>
      <p>DFXY 的 OperationCycle 一般 = 一次 IGN-ON → IGN-OFF。每次 IGN-ON 时 DEM 调 <code>Dem_SetOperationCycleState(START)</code>，IGN-OFF 时调 STOP。Aging 计数器跟它绑定。</p>
      <blockquote><b>关键差别</b>：4S 店清 DTC（0x14）<b>不重置 OperationCycle</b>，只清 status 位。诊断仪界面"重置故障"和"清故障"是两件事。</blockquote>
    `
  });

  L.push({
    id:'canfd_diag',
    title:'34. CAN-FD 在诊断中的应用',
    subtitle:'DFXY 用 CAN-FD，与传统 CAN 在诊断上有何不同',
    html: `
      <h2>DFXY 是 CAN-FD 项目（dbc 验证）</h2>
      <p>工作区里看到 <code>XY-A_Matrix_CCANFD_IBC_v2.2.0.dbc</code> 和 <code>XY-A_Matrix_CCANFD2_IBC_v2.2.0.dbc</code>，<b>命名里的 CCANFD</b> 表明项目跑的是 Classical CAN-FD。</p>

      <h2>CAN-FD vs 传统 CAN</h2>
      <table class="t">
        <tr><th>对比</th><th>CAN 2.0</th><th>CAN-FD</th></tr>
        <tr><td>最大数据长度</td><td>8 字节</td><td><b>64 字节</b></td></tr>
        <tr><td>仲裁段比特率</td><td>500kbps（典型）</td><td>500kbps（与 CAN 兼容）</td></tr>
        <tr><td>数据段比特率</td><td>同上</td><td><b>2/5 Mbps</b>（BRS 切换后）</td></tr>
        <tr><td>DLC 编码</td><td>0~8 直接表示</td><td>9~15 表示 12/16/20/24/32/48/64</td></tr>
        <tr><td>CRC</td><td>15 位</td><td>17 / 21 位</td></tr>
        <tr><td>SOF/EOF</td><td>同 CAN</td><td>同 CAN（兼容）</td></tr>
      </table>

      <h2>BRS（Bit Rate Switch）的影响</h2>
      <p>CAN-FD 帧结构里有 <b>BRS bit</b>：</p>
      <ul>
        <li>BRS=0：数据段保持仲裁段比特率（500kbps）</li>
        <li>BRS=1：数据段切换到高速（2 Mbps）—— DFXY 实际用法</li>
      </ul>
      <pre><code>SOF │ ID │ 控制域 │BRS│ 数据(64B) │ CRC │ EOF
                       ↑
                    BRS=1 这里开始 2Mbps，CRC 也在 2Mbps
                       ↑
                    BRS=1 这里跳回 500kbps</code></pre>

      <h2>对 ISO-TP 的影响</h2>
      <p>ISO 15765-2:2016 规定了 CAN-FD 上的 ISO-TP，主要变化：</p>
      <table class="t">
        <tr><th>帧类型</th><th>CAN 2.0 (8B)</th><th>CAN-FD (64B)</th></tr>
        <tr><td>SF（单帧）</td><td>SF_DL ≤ 7</td><td>SF_DL ≤ 62（PCI 占 2B）</td></tr>
        <tr><td>FF（首帧）</td><td>总长 12 位（≤4095B）</td><td>总长 32 位（≤4GB），PCI 6B</td></tr>
        <tr><td>CF（连续帧）</td><td>携 7B 数据</td><td>携 63B 数据</td></tr>
        <tr><td>FC（流控）</td><td>3B 头 + padding</td><td>同上（不变）</td></tr>
      </table>

      <h2>SF 在 CAN-FD 上的 PCI 变化</h2>
      <pre><code>CAN 2.0 SF：
  byte0[7:4] = 0 (SF type)
  byte0[3:0] = SF_DL (1~7)

CAN-FD SF (DLC ≥ 9, 即数据 ≥ 12B 的帧)：
  byte0 = 0x00          ← SF type 高 4 位 = 0，低 4 位也 = 0
  byte1 = SF_DL (1~62)  ← PCI 扩到 2 字节</code></pre>

      <h2>FF 在 CAN-FD 上变化（重大）</h2>
      <pre><code>CAN 2.0 FF（总长 12 位）：
  10 &lt;Len_hi&gt; &lt;Len_lo&gt; ...     ← Len 字段 12 位

CAN-FD FF（总长 32 位，PDU ≥ 4096B 时强制用）：
  10 00 &lt;Len_31:24&gt; &lt;Len_23:16&gt; &lt;Len_15:8&gt; &lt;Len_7:0&gt; ...
  └─FF type = 0x10
       └─后两位 0
              └─4 字节大长度</code></pre>
      <p><b>意义</b>：CAN-FD 上你可以传 4GB 的诊断 PDU（理论上）。实际 DFXY 限制 1087B Rx。</p>

      <h2>诊断速度提升估算</h2>
      <p>读一段 1KB 数据（如刷写一个块）的对比：</p>
      <table class="t">
        <tr><th>方案</th><th>帧数</th><th>有效载荷/帧</th><th>典型时长</th></tr>
        <tr><td>CAN 2.0 (8B/500k)</td><td>1 FF + 146 CF + 流控</td><td>7B</td><td>~30ms</td></tr>
        <tr><td>CAN-FD (64B/2M)</td><td>1 FF + 16 CF + 流控</td><td>63B</td><td>~5ms</td></tr>
      </table>
      <p>刷写 1MB 固件，CAN 2.0 要 30s，CAN-FD 5s — 这是 OEM 全面转 CAN-FD 的主要驱动。</p>

      <h2>DFXY ID 寻址（CCANFD vs CCANFD2）</h2>
      <p>项目有两路 CAN-FD：</p>
      <ul>
        <li><b>CCANFD</b> — 主底盘 CAN-FD（IBC 通讯主用）</li>
        <li><b>CCANFD2</b> — 第二路（与其他 ECU 备份/分流）</li>
      </ul>
      <p>诊断地址通常配在主路。IBC 的 RxPDU 一般是 0x7E0（物理寻址）+ 0x7DF（功能寻址），TxPDU 是 0x7E8。具体看 <code>Dcm_Dsl_Cfg.c</code> 里的 PDU ID 配置。</p>

      <h2>抓包注意</h2>
      <blockquote>用 CANalyzer/CANoe 抓 BLF 时<b>必须设硬件支持 CAN-FD</b>（如 VN5640、VN1640A），否则 DLC ≥ 9 的帧会被丢弃。低端的 CANcaseXL 只支持 CAN 2.0。</blockquote>
    `
  });

  // ============================================================
  // GROUP 8 — 工程实战
  // ============================================================
  G.push({ title:'第八部分 · 工程实战', lessons:['condition_check','eep_nvm','obd2','capture_debug'] });

  // ============================================================
  // GROUP 9 — 加餐专题
  // ============================================================
  G.push({ title:'第九部分 · 加餐专题', lessons:['periodic_did','gateway_diag','diag_test_validation'] });

  L.push({
    id:'condition_check',
    title:'35. 诊断条件检查 — DiagMain_ConditionCheck_DF',
    subtitle:'DFXY 几乎每个 RID/写 DID 第一步都调它',
    html: `
      <h2>函数定义（来自 DiagAppRidCallOut.c）</h2>
      <pre><code>Std_ReturnType DiagMain_ConditionCheck_DF(void)
{
    uint8 HVoltage, LVoltage, IGState;

    HVoltage = DiagMain_ConditionCheck(DIAG_CHK_HIGH_VOLTAGE);
    LVoltage = DiagMain_ConditionCheck(DIAG_CHK_LOW_VOLTAGE);
    IGState  = DiagMain_ConditionCheck(DIAG_CHK_IGNITION_STATUS);

    if ((DiagMain_ConditionCheck(DIAG_CHK_VEHICLE_SPEED) == E_NOT_OK)
        || (HVoltage == E_NOT_OK)
        || (LVoltage == E_NOT_OK)
        || (IGState  == E_NOT_OK))
    {
        return E_NOT_OK;
    }
    return E_OK;
}</code></pre>

      <h2>4 项检查含义</h2>
      <table class="t">
        <tr><th>检查项</th><th>含义</th><th>不通过时表现</th></tr>
        <tr><td>DIAG_CHK_VEHICLE_SPEED</td><td>车速 = 0（U8_DIAG_STANDSTILL_SPEED 阈值，典型 ≤2 km/h）</td><td>车在动 → NRC 0x22</td></tr>
        <tr><td>DIAG_CHK_HIGH_VOLTAGE</td><td>电池电压不超过上限（典型 ≤16V）</td><td>过压 → NRC 0x22</td></tr>
        <tr><td>DIAG_CHK_LOW_VOLTAGE</td><td>电池电压不低于下限（典型 ≥9V）</td><td>欠压 → NRC 0x22</td></tr>
        <tr><td>DIAG_CHK_IGNITION_STATUS</td><td>IGN ON</td><td>IGN OFF → NRC 0x22</td></tr>
      </table>

      <h2>DynoMode（功能模式）变体</h2>
      <p>开发/EOL 测试用，跳过车速检查（让车在测功机上转可以测 ABS）：</p>
      <pre><code>Std_ReturnType DiagMain_ConditionCheck_DF_FctMode(void)
{
    // 同上但少了 DIAG_CHK_VEHICLE_SPEED
    if ((HVoltage == E_NOT_OK)
        || (LVoltage == E_NOT_OK)
        || (IGState  == E_NOT_OK))
    {
        return E_NOT_OK;
    }
    return E_OK;
}</code></pre>
      <p>触发：<code>DiagT_VMM_DynoMode == 1</code> 时 RID 用 FctMode 版本，否则用普通版。AbsEsc_Test / BaseBrake_Test 的 inParam 第一个字节就是动态测试参数。</p>

      <h2>RID 0x0203 Check_Preconditions 的 6 项检查</h2>
      <p>这个 RID 是<b>刷写前置专用条件检查</b>，比 DiagMain_ConditionCheck_DF 还多 2 项：</p>
      <table class="t">
        <tr><th>outParam0</th><th>检查项</th><th>条件</th></tr>
        <tr><td>0x00</td><td>全部通过</td><td>—</td></tr>
        <tr><td>0x02</td><td>电压</td><td>Diag_VolUdrInv 或 Diag_VolOvrInv 任一为 NOT_OK</td></tr>
        <tr><td>0x03</td><td>车速</td><td>DiagT_VehicleSpeed ≥ 阈值 且 DiagT_VehicleSpeedInv = OK</td></tr>
        <tr><td>0x04</td><td>引擎/电机转速</td><td>EngState = NOT_OK</td></tr>
        <tr><td>0x05</td><td>挡位</td><td>DiagGearPos != P 且 Diag_TgtGear != P</td></tr>
        <tr><td>0x06</td><td>IGN</td><td>DiagIgnState = 0</td></tr>
      </table>
      <p>诊断仪用这个 RID 拿到具体的失败码，告诉用户"请挂 P 挡"或"请打开钥匙"，比单纯回 NRC 0x22 友好很多。</p>

      <h2>调试技巧 · 看哪一项失败</h2>
      <pre><code>// 在 ECU 里加调试输出（开发阶段）
Std_ReturnType DiagMain_ConditionCheck_DF_Debug(void)
{
    if (DiagMain_ConditionCheck(DIAG_CHK_VEHICLE_SPEED) == E_NOT_OK) {
        DEBUG_PRINTF("Cond fail: VehicleSpeed = %d", DiagT_VehicleSpeed);
        return E_NOT_OK;
    }
    if (DiagMain_ConditionCheck(DIAG_CHK_HIGH_VOLTAGE) == E_NOT_OK) {
        DEBUG_PRINTF("Cond fail: BattVolt high = %d mV", BattVolt);
        return E_NOT_OK;
    }
    // ...
}</code></pre>

      <h2>常见踩坑</h2>
      <ul>
        <li><b>怠速车速不为 0</b>：传感器噪声让 DiagT_VehicleSpeed 在 1km/h 抖动，但阈值就是 1，结果 RID 永远 NRC 0x22。<b>方案</b>：调大阈值到 2-3，或用滑动平均</li>
        <li><b>IGN 信号未到达</b>：DCAN 上 IGN 由 BCM 广播，如果 BCM 报文丢失，DiagIgnState 会一直 0。检查 BCM 通信是否健康</li>
        <li><b>ConditionCheck 通过但 RID 还是 NRC 0x22</b>：可能 RID 内部还有自己的额外条件（如 Evac_And_Fill 检查互斥锁）。看 callout 第一段的 <code>else if</code> 分支</li>
      </ul>
    `
  });

  L.push({
    id:'eep_nvm',
    title:'36. EEP/NvM 异步写流程',
    subtitle:'写 DID 为何必须异步、什么时候返回 NRC 0x72',
    html: `
      <h2>为什么写 EEP 必须异步</h2>
      <p>EEPROM 物理写一个字节需要 ~5ms，写一个 4 字节制造日期需要 ~20ms。Dcm 任务周期 5ms，<b>callout 不能阻塞</b>，否则 Dcm 主任务卡住，影响其他诊断请求。</p>
      <p>解决方案：<b>启动 NvM 后台写</b>，callout 在 OpStatus=PENDING 时反复轮询 NvM 状态：</p>
      <pre><code>初次调用 (OpStatus=DCM_INITIAL)：
  ┌──────────────────────────────┐
  │ 校验数据                       │
  │ WriteNvMBlockReq_Diag = 1    │← 标记请求
  │ 把要写的内容拷到 NvM RAM mirror│
  │ NvM 后台任务自动取走写 EEP     │
  │ return DCM_E_PENDING          │← 让 Dcm 知道还没完
  └──────────────────────────────┘
                ↓
后续调用 (OpStatus=DCM_PENDING，每 5ms 一次)：
  ┌──────────────────────────────┐
  │ NvM 状态查询                   │
  │   还在写 → return DCM_E_PENDING│
  │   写完成功 → return DCM_E_OK    │
  │   写失败 → *ErrorCode = 0x72   │
  │             return E_NOT_OK   │
  └──────────────────────────────┘</code></pre>

      <h2>DFXY 实现核心 — DiagApp_EEP_WriteRes</h2>
      <p>这个工具函数封装了 NvM 写完成判断（在 <code>DiagAppEEPHandle.c</code>）：</p>
      <pre><code>Std_ReturnType DiagApp_EEP_WriteRes(uint8 *u8ReqBlockId, NRC *ErrorCode)
{
    NvM_RequestResultType nvmRslt;
    if (NvM_GetErrorStatus(*u8ReqBlockId, &nvmRslt) != E_OK) {
        return DCM_E_PENDING;       // NvM 还没准备好
    }
    switch (nvmRslt) {
        case NVM_REQ_PENDING:
            return DCM_E_PENDING;
        case NVM_REQ_OK:
            *u8ReqBlockId = 0;            // 释放
            WriteNvMBlockReq_Diag = 0;
            return E_OK;
        case NVM_REQ_NOT_OK:
        case NVM_REQ_INTEGRITY_FAILED:
            *u8ReqBlockId = 0;
            WriteNvMBlockReq_Diag = 0;
            *ErrorCode = NRC_GENERAL_PROGRAM_FAILURE;  // 0x72
            return E_NOT_OK;
        default:
            return DCM_E_PENDING;
    }
}</code></pre>

      <h2>WriteNvMBlockReq_Diag 互斥锁</h2>
      <p>同一时刻只能有一个 NvM 写请求在 fly。<b>这是为什么 callout 必须先检查它</b>：</p>
      <pre><code>if ((WriteNvMBlockReq_Diag == 0u) && (u8ReqBlockId == 0u)) {
    // 当前没有别的诊断写在排队，启动新的
    WriteNvMBlockReq_Diag = 1u;
    u8ReqBlockId = NvMConf_NvMBlockDescriptor_NvMCdd_Block_DIAG_SEGMENT;
    Data_Load(...);   // 拷贝数据到 RAM mirror
}
// else: 锁占用中，下次 PENDING 再判断 NvM 状态</code></pre>
      <p>意味着：<b>诊断仪同时发两个写 DID 请求会串行处理</b>，第二个请求看到第一个的 lock，自己等。</p>

      <h2>VIM (Variant Initialization Module) — 写 EOLDate 的特殊流程</h2>
      <p>0xF010 EOLDate 不是直接写 NvM，而是先经过 VIM 模块（变体编码处理）：</p>
      <pre><code>OpStatus=INITIAL：
  Data_Load(Data, DiagF_VIM_Data_2, ...);  // 先把数据放 VIM 缓冲
  DiagInlineCodingReq = TRUE;               // 触发 VIM 任务
  DiagPendingTime = 0;
  return DCM_E_PENDING;

OpStatus=PENDING：
  switch (DiagInlineCodingSts) {
    VIM_COMPLETED_NOT  → return DCM_E_PENDING (继续等)
    VIM_COMPLETED_OK   → 接着启动 NvM 写，return E_OK 后转 NvM 流程
    VIM_COMPLETED_NG   → *ErrorCode = NRC_GENERAL_PROGRAM_FAILURE (0x72)
    VIM_CONDITION_NOT  → *ErrorCode = NRC_REQUEST_OUT_RANGE (0x31)
  }
  if (DiagPendingTime > GeneralTimeout)
    *ErrorCode = NRC_GENERAL_REJECT (0x10)</code></pre>
      <p>所以写 0xF010 比写 0xF18B 多一层"先编码计算再写"，可能耗时更长（数百 ms）。</p>

      <h2>NvM 块布局（DFXY 关键块）</h2>
      <table class="t">
        <tr><th>NvM Block</th><th>内容</th></tr>
        <tr><td>NvMCdd_Block_DIAG_SEGMENT</td><td>VIN, EcuManufactureDate, ECUSerialNumber 等 0xF18x DID 数据</td></tr>
        <tr><td>NvMCdd_Block_VIM_SEGMENT</td><td>EOLDate 等 VIM 编码数据</td></tr>
        <tr><td>(DEM 多块)</td><td>每个 confirmed DTC + status + freeze frame + extended data</td></tr>
        <tr><td>(SecAccess 块)</td><td>Seed/Key 失败计数器</td></tr>
      </table>

      <h2>读 NvM = 同步还是异步</h2>
      <p><b>读是同步</b>（看 EcuManufactureDate_Read）：直接从 <code>NvMCdd_Block_DIAG_SEGMENT_RAM[]</code> 拷贝。NvM 启动时把 EEP 内容映射到 RAM 镜像，应用读 RAM 即可，不走异步。</p>
      <p><b>写必须异步</b>：因为要把 RAM 改动同步回 EEP，物理写慢。</p>

      <h2>常见 bug</h2>
      <ul>
        <li><b>第二次写 0xF18B 卡住</b>：第一次的 <code>WriteNvMBlockReq_Diag</code> 没释放（第一次写超时但没清锁）。grep 看哪个分支没清</li>
        <li><b>读出来的 VIN 永远是 0xFF</b>：NvM 块校验失败，第一次启动用了默认值 0xFF。需要先用 0x2E 写一次有效 VIN</li>
        <li><b>EOLDate 写完了但读出来还是旧的</b>：VIM 编码 OK 但 NvM 写没真正触发，看 <code>WriteNvMBlockReq_Diag</code> 是否被设置过</li>
      </ul>
    `
  });

  L.push({
    id:'obd2',
    title:'37. OBD-II 服务（DFXY 实现）',
    subtitle:'排放法规要求 — SID 01/02/04/09 + PID',
    html: `
      <h2>OBD-II vs UDS 的关系</h2>
      <p>OBD-II（ISO 15031-5）和 UDS（ISO 14229-1）<b>同一个 ECU 同一根 CAN 上共存</b>。区别：</p>
      <table class="t">
        <tr><th>对比</th><th>OBD-II</th><th>UDS</th></tr>
        <tr><td>立法目的</td><td>排放监管（强制）</td><td>诊断/刷写</td></tr>
        <tr><td>SID 范围</td><td>0x01~0x0A</td><td>0x10~0x3E, 0x83+</td></tr>
        <tr><td>会话</td><td>无概念，永远可读</td><td>4 种会话</td></tr>
        <tr><td>安全</td><td>无（所有人能读）</td><td>0x27 解锁</td></tr>
        <tr><td>诊断 ID</td><td>0x7DF (功能广播)</td><td>0x7E0/7E8 (物理) + 0x7DF</td></tr>
      </table>

      <h2>DFXY 实现的 OBD SID</h2>
      <p>从 <code>DiagAppPidCallOut.c</code> 看到（IBC 是底盘 ECU 但仍要响应排放相关 SID 09 等）：</p>
      <table class="t">
        <tr><th>SID</th><th>名称</th><th>用途</th></tr>
        <tr><td>0x01</td><td>RequestCurrentPtData (Show current data)</td><td>读实时车辆数据</td></tr>
        <tr><td>0x02</td><td>RequestPTFreezeFrame</td><td>读冻结帧</td></tr>
        <tr><td>0x04</td><td>ClearEmissionDTC</td><td>清排放相关 DTC</td></tr>
        <tr><td>0x09</td><td>RequestVehicleInformation</td><td>读 VIN/CAL ID/CVN 等识别信息</td></tr>
      </table>

      <h2>OBD PID 是什么</h2>
      <p>PID = Parameter Identifier，<b>1 字节</b>编号（不是 UDS DID 那 2 字节）。比如 PID 0x0C = EngineRPM、0x0D = VehicleSpeed。</p>
      <pre><code>请求：02 01 0D 00 00 00 00 00      ← Mode 01, PID 0D (Vehicle Speed)
应答：03 41 0D 50 00 00 00 00      ← 41 = 01+0x40, 0x50 = 80 km/h</code></pre>

      <h2>支持 PID 位图查询（PID 0x00, 0x20, 0x40...）</h2>
      <p>OBD 标准要求 ECU 报告"我支持哪些 PID"，方法是<b>查询 PID 0x00/0x20/0x40/0x60/0x80/0xA0/0xC0/0xE0</b>，每次返回 4 字节位图覆盖接下来 32 个 PID。</p>
      <pre><code>请求：02 01 00 00 00 00 00 00      ← 问 "支持哪些 PID 0x01~0x20?"
应答：06 41 00 BE 1F B8 13 00      ← 41 00 + 4B 位图
                BE 1F B8 13
                ↓
位图位 7-0 = PID 01-08, 位图位 15-8 = PID 09-10...
0xBE = 1011 1110 → 支持 01,02,03,04,05,06 (位 1=支持)
0x1F = 0001 1111 → 支持 0C,0D,0E,0F,10
0xB8 = 1011 1000 → 支持 11,13,14,15
0x13 = 0001 0011 → 支持 1C,1F,20</code></pre>

      <h2>DFXY 的 PID 位图算法（DiagAppPidCallOut.c）</h2>
      <pre><code>Std_ReturnType ReadPIDData_SupportedPID(uint8 reqSID, uint8 reqPID, uint8 Data[])
{
    uint8 ConfigPID, MaxPID = 0;
    Data_Clear(Data, OBD_SUPPORTED_PID_LEN);   // 4B 清零

    // 选不同 SID 的 PID 配置表
    if (reqSID == 0x01) MaxPID = READ_OBDII_01_PID_MAXNUM;
    else if (reqSID == 0x02) MaxPID = READ_OBDII_02_PID_MAXNUM;
    else if (reqSID == 0x09) MaxPID = READ_OBDII_09_PID_MAXNUM;

    for (i = 0; i &lt; MaxPID; i++) {
        ConfigPID = DcmCdd_ReadPID_SID01_DataConfig[i].DID;
        // PID 在 reqPID+1 ~ reqPID+0x20 范围内 → 设位图位
        if ((ConfigPID &gt; reqPID) && (ConfigPID &lt; (reqPID + 0x20u))) {
            Data[(ConfigPID - 1 - reqPID) / 8] |= (0x01 &lt;&lt; (7 - ((ConfigPID - 1) % 8)));
        }
    }
    return E_OK;
}</code></pre>

      <h2>SID 0x04 ClearEmissionDTC 的特殊条件检查</h2>
      <p>排放法规要求<b>清码必须发动机熄火</b>，DFXY 实现：</p>
      <pre><code>uint8 DiagMain_OBDII_SID04_Inhibit_Cdt(void)
{
    if ((DiagT_PrplsnSysAtv_Msg_Valid && DiagT_PrplsnSysAtv == 0) &&
        (DiagT_EngSpd_Msg_Valid && DiagEngineRPM == 0) &&
        (DiagIgnState == 1)) {
        return FALSE;   // 条件 OK，可以清
    }
    return TRUE;        // 条件不满足，拒绝
}</code></pre>
      <p>不满足时返回 NRC（OBD 没标准 NRC，多数 ECU 用 0x22 或直接不响应）。</p>

      <h2>常见 OBD PID 速查（标准 SAE J1979）</h2>
      <table class="t">
        <tr><th>PID</th><th>含义</th><th>单位</th></tr>
        <tr><td>0x04</td><td>引擎负荷</td><td>%</td></tr>
        <tr><td>0x05</td><td>冷却液温度</td><td>°C</td></tr>
        <tr><td>0x0C</td><td>引擎转速</td><td>rpm</td></tr>
        <tr><td>0x0D</td><td>车速</td><td>km/h</td></tr>
        <tr><td>0x10</td><td>进气流量</td><td>g/s</td></tr>
        <tr><td>0x11</td><td>节气门位置</td><td>%</td></tr>
        <tr><td>0x1F</td><td>引擎运行时间</td><td>s</td></tr>
        <tr><td>0x21</td><td>MIL 灯亮起后行驶距离</td><td>km</td></tr>
        <tr><td>0x31</td><td>清码后行驶距离</td><td>km</td></tr>
      </table>

      <h2>SID 09 InfoType（VIN/CalID/CVN）</h2>
      <table class="t">
        <tr><th>InfoType</th><th>含义</th></tr>
        <tr><td>0x02</td><td>VIN（17 字节）</td></tr>
        <tr><td>0x04</td><td>Calibration Identification</td></tr>
        <tr><td>0x06</td><td>Calibration Verification Number (CVN)</td></tr>
        <tr><td>0x08</td><td>In-Use Performance Tracking</td></tr>
      </table>
      <pre><code>请求：02 09 02 00 00 00 00 00          ← 读 VIN
应答多帧：49 02 01 &lt;VIN 17B&gt;            ← 49 = 09+0x40, 01 = NumOfDataItem</code></pre>

      <h2>IBC 为什么也要响应 OBD？</h2>
      <p>虽然 IBC 不直接管发动机，但<b>排放认证要求所有 OBD 节点都能广播 VIN（PID 09 02）和支持基本查询</b>，否则法规不通过。所以即使 IBC 不烧汽油，也得有 SID 09 实现。</p>
    `
  });

  L.push({
    id:'capture_debug',
    title:'38. 抓包与调试技巧 — 工程师手艺',
    subtitle:'CANoe / CANalyzer / Wireshark / CAPL',
    html: `
      <h2>核心工具链</h2>
      <table class="t">
        <tr><th>工具</th><th>厂家</th><th>用途</th></tr>
        <tr><td><b>CANalyzer</b></td><td>Vector</td><td>抓包+回放，看报文最方便</td></tr>
        <tr><td><b>CANoe</b></td><td>Vector</td><td>仿真+测试，能写脚本自动化诊断</td></tr>
        <tr><td><b>BusMaster</b></td><td>开源</td><td>免费替代，功能少但够用</td></tr>
        <tr><td><b>Wireshark + CAN</b></td><td>开源</td><td>带 socketCAN 插件可解码</td></tr>
        <tr><td><b>VehicleSpy</b></td><td>Intrepid</td><td>美国厂家，类似 CANoe</td></tr>
      </table>

      <h2>BLF 文件 = Vector Binary Logging Format</h2>
      <p>Vector 工具默认抓包格式，比 ASC 文本小 10 倍，记录精确时间戳。工作区里看到的 <code>#133running.blf</code> 就是工程师在车上抓的数据。</p>
      <pre><code>BLF 解析方式：
  1. CANalyzer/CANoe 直接打开
  2. Python：python-can 库 → can.io.BLFReader
  3. C++：vector_blf (开源)
  4. dbc 文件 + BLF → 可以解码所有报文成业务信号</code></pre>

      <h2>CAPL 脚本自动诊断（Vector 自家的 C 类语言）</h2>
      <pre><code>// 自动跑一遍 Pedal 标定流程
on key 'F2' {
    // ① 进会话
    diag_request 0x10, 0x03;
    while (testWaitForDiagResponse(2000) != 1) { write("Wait..."); }
    
    // ② 解锁
    diag_request 0x27, 0x01;
    testWaitForDiagResponse(2000);
    seed = diag_get_response_byte_array(2);   // 跳过 67 01 取 16B
    SecAlgo_AesCmac(SECRET_KEY, 16, seed, 16, key);
    diag_request 0x27, 0x02, key[0..15];
    testWaitForDiagResponse(2000);
    
    // ③ 启动 Pedal_Cal
    diag_request 0x31, 0x01, 0x80, 0x65;
    testWaitForDiagResponse(2000);
    
    // ④ 等用户操作
    write("请踩踏板到底再松开...");
    timer pedalTimer = setTimer(30000);
    
    // ⑤ 轮询结果
    do {
        diag_request 0x31, 0x03, 0x80, 0x65;
        testWaitForDiagResponse(1000);
        result = diag_get_response_byte(4);   // outParam0
    } while (result == 0x02);   // IN_PROGRESS
    
    if (result == 0x00) write("成功!");
    else write("失败 code=%X", result);
}</code></pre>

      <h2>CANoe 诊断面板</h2>
      <p>CANoe 内置 <b>Diagnostic Console</b>，不写代码也能：</p>
      <ul>
        <li>导入 <code>.cdd</code>（CANdela 描述文件，类似 OEM 的诊断说明书）</li>
        <li>UI 上点服务/DID/RID 即发请求</li>
        <li>自动解码应答，把 17 字节 VIN 显示成 ASCII</li>
        <li>记录请求/应答时间，自动统计 P2/P2*</li>
      </ul>

      <h2>Python 离线分析 BLF</h2>
      <pre><code>import can
import cantools

# 加载 dbc 解码业务信号
db = cantools.database.load_file('XY-A_Matrix_CCANFD_IBC_v2.2.0.dbc')

# 打开 BLF
with can.io.BLFReader('#133running.blf') as log:
    for msg in log:
        if msg.arbitration_id == 0x7E8:           # IBC 应答
            print(f"{msg.timestamp:.3f}  ← {msg.data.hex()}")
        elif msg.arbitration_id == 0x7E0:         # 诊断仪请求
            print(f"{msg.timestamp:.3f}  → {msg.data.hex()}")
        else:
            try:
                decoded = db.decode_message(msg.arbitration_id, msg.data)
                if 'IBC_BrakePedalPos' in decoded:
                    print(f"  踏板: {decoded['IBC_BrakePedalPos']}%")
            except:
                pass</code></pre>

      <h2>调试 NRC 0x22 的"流程"</h2>
      <ol>
        <li>先确认会话是不是对：抓包看最后一次 <code>10 0x</code> 的应答</li>
        <li>确认是不是解了锁：抓包看最近的 <code>27 02</code> 是否成功（应答 67 02）</li>
        <li>确认 ECU 视角下的车辆状态：用 <code>22 FD xx</code> 读 BattVolt/IgnStatus/VehicleSpeed</li>
        <li>四项条件逐个对照 ECU 阈值（看 <code>DiagAppRidCallOut.c</code> 顶部的宏定义）</li>
        <li>实在不行 → 在 ECU 调试版本里加 <code>DEBUG_PRINTF</code> 打到 UART/JTAG</li>
      </ol>

      <h2>调试 NRC 0x78 然后 0x72 的"流程"</h2>
      <ol>
        <li>说明 callout 启动了 NvM 异步写但最终失败</li>
        <li>先确认 NvM 块 ID 配置正确（<code>NvMConf_NvMBlockDescriptor_xxx</code>）</li>
        <li>看 NvM 那边日志（如果有 DET）：是不是写过保护、CRC 错</li>
        <li>看 <code>WriteNvMBlockReq_Diag</code> 锁有没有被前一次写 hang 住没释放</li>
        <li>EEP 物理芯片是不是写满了/坏了 → 用 <code>22 FE 00</code> 读 EEP 健康状态（如果有）</li>
      </ol>

      <h2>实车抓包注意</h2>
      <ul>
        <li><b>OBD-II 接口</b>位置：方向盘下方仪表板下面，国标车都有</li>
        <li>用 <b>OBD 转接线</b>把 Vector VN5640 接到车上 → CANoe 即可识别 0x7E0/0x7E8</li>
        <li>抓包之前先 <b>开 IGN ON 不启动</b>，避免发动机噪声</li>
        <li>用 <b>触发器</b>抓特定时刻（比如设置"看到 0x7F 就触发并多抓 5 秒"）</li>
        <li><b>BLF 大小</b>：1 小时实车抓包约 50-200MB（CAN-FD 比 CAN 2.0 多几倍）</li>
      </ul>

      <h2>诊断仪侧调试推荐工具</h2>
      <table class="t">
        <tr><th>工具</th><th>价位</th><th>适合</th></tr>
        <tr><td>Bosch KTS</td><td>万元</td><td>4S 店标准配置</td></tr>
        <tr><td>金德K81</td><td>千元</td><td>国产中端</td></tr>
        <tr><td>OBDLink MX+</td><td>百元</td><td>个人爱好者，配 ELM327</td></tr>
        <tr><td><b>Vector CANoe + 自写 CAPL</b></td><td>软件几万</td><td>开发工程师标配，可深度定制</td></tr>
        <tr><td>Python + python-can + udsoncan</td><td>免费</td><td>自动化测试、写脚本</td></tr>
      </table>
      <blockquote><b>开发工程师必备</b>：CANoe + dbc + cdd + 自己写的 CAPL 测试套件。每天调一个 RID，自动跑 100 次回归。</blockquote>
    `
  });

  L.push({
    id:'cantp_impl',
    title:'2A. AUTOSAR CanTp 分段重组源码解读',
    subtitle:'把 ISO-TP 协议和 AUTOSAR 代码串起来',
    html: `
      <h2>CanTp 在 AUTOSAR 中的位置</h2>
      <p>CanTp 是 <b>BSW 通信服务层</b>，上接 PduR，下接 CanIf。诊断报文从 CAN 控制器 ISR 进来：</p>
      <pre><code>CanIf → CanTp_RxIndication(PduId, PduInfo)
   ↓
PduR → Dcm_StartOfReception(PduId, TpSduLength, BufferSizePtr)
   ↓
Dcm 内部申请缓冲 → 等所有 CF 收齐后 PduR_CanTpRxIndication(OK)</code></pre>

      <h2>SF（单帧）接收路径</h2>
      <pre><code>CanTp_RxIndication()
  → CanTp_RxIndicationHandleSF()      // 看 byte0 高 4 位 = 0
    → 取出 SF_DL（byte0[3:0] 或 CAN-FD 下 byte1）
    → 判断是不是功能寻址（0x7DF）→ 不能发 FC
    → 调用 PduR_CanTpStartOfReception()
    → 如果 BufferSize ≥ SF_DL，直接 PduR_CanTpCopyRxData() 拷贝
    → 最后 PduR_CanTpRxIndication(OK)</code></pre>
      <blockquote><b>关键点</b>：CanTp 收到 SF 时<b>不发流控帧</b>，只有收到 FF 才发 FC。</blockquote>

      <h2>FF（首帧）接收路径 + FC 发送</h2>
      <pre><code>CanTp_RxIndication()
  → CanTp_RxIndicationHandleFF()
    → 读出 12bit / 32bit 总长
    → PduR_CanTpStartOfReception(总长)
    → Dcm 说"我只有 4095B 缓冲" → CanTp 内部设 BS / STmin
    → 发 FC 帧：byte0=0x30(CTS), byte1=BS, byte2=STmin
    → 切到 CANTP_RX_WAIT_CF，启动 N_Cr 超时（典型 1s）</code></pre>
      <p>FC 帧的三个参数：</p>
      <table class="t">
        <tr><th>参数</th><th>值</th><th>含义</th></tr>
        <tr><td>FS (FlowStatus)</td><td>0x00 = CTS</td><td>继续发</td></tr>
        <tr><td></td><td>0x01 = WAIT</td><td>暂停，ECU 忙</td></tr>
        <tr><td></td><td>0x02 = OVFLW</td><td>缓冲溢出，终止</td></tr>
        <tr><td>BS (BlockSize)</td><td>0 = 不设限</td><td>连续发多少 CF 再停等 FC</td></tr>
        <tr><td>STmin</td><td>0x00~0x7F ms</td><td>CF 之间的最小间隔</td></tr>
      </table>

      <h2>CF（连续帧）接收 + 超时管理</h2>
      <pre><code>CanTp_RxIndicationHandleCF()
  → 检查 SN（Sequence Number）是否匹配期望
  → SN 错 → 发 FC(WAIT) 或直接 abort，看 OEM 实现
  → SN 对 → 拷贝数据，更新已收长度
  → 如果 BS 计数到 0 → 发 FC(CTS) 续传
  → 收完 → PduR_CanTpRxIndication(OK)，状态回到 IDLE</code></pre>
      <p>CanTp 内部用 N_Cr 定时器：<b>收到 FF 后，每帧 CF 必须在 N_Cr 内到达</b>，否则 abort。DFXY 典型配 1s。</p>

      <h2>发送路径（诊断仪 → ECU）</h2>
      <pre><code>Dcm → PduR_CanTpTransmit() → CanTp_Transmit()
  → 数据 ≤ 7B(CAN) / 62B(CAN-FD SF): 发 SF
  → 数据长: 发 FF，等对方 FC
  → 收到 FC(CTS): 按 BS 和 STmin 发 CF 序列
  → 收到 FC(WAIT): 停等，重启动 N_Bs 超时</code></pre>
      <p>发送侧超时 <b>N_Bs</b>：发完 FF 或一组 CF 后等 FC 的时间。典型 1s。连续发 CF 时也要等对方 FC 确认。</p>

      <h2>常见踩坑</h2>
      <ul>
        <li><b>BS=0 但 Dcm 缓冲只有 4095B</b>：CanTp 其实不会校验总长，它只看每帧 BS 内的 CF 能不能塞进 PduR 申请的缓冲。如果 Dcm 的接收缓冲 < 总长，PduR 会拒绝 StartOfReception，CanTp 发 FC(OVFLW)</li>
        <li><b>STmin=0 但总线满载</b>：ECU 收到 FC 后按 STmin 发 CF，但 STmin=0 意味着"尽快发"。如果 CanIf 队列满，实际间隔由调度决定，可能违反 STmin</li>
        <li><b>功能寻址发多帧</b>：ISO 14229 禁止功能寻址用多帧（FF/CF），因为多个 ECU 会同时回 FC 撞车。CanTp 内部应拒绝功能寻址的 FF</li>
        <li><b>DLC padding 问题</b>：传统 CAN 诊断帧必须 pad 到 8B，CanTp 发 SF_DL=3 时实际帧是 8B，后面 4B 填 0xAA 或 0x00。dbc 里要设好 DLC=8</li>
      </ul>
    `
  });

  L.push({
    id:'p2_timer',
    title:'3A. P2/P2*/S3server 计时器详解',
    subtitle:'诊断工程师每天打交道但课程里容易忽略的三个计时器',
    html: `
      <h2>为什么计时器是诊断的"隐形杀手"</h2>
      <p>你发一条诊断请求，ECU 必须在规定时间内回应答，否则诊断仪报超时、重发、甚至断开连接。这三个计时器定义了所有时间边界：</p>
      <table class="t">
        <tr><th>计时器</th><th>定义</th><th>典型值</th><th>谁管</th></tr>
        <tr><td><b>P2</b></td><td>诊断仪发完请求后，ECU 必须回第一帧的时间</td><td>50 ms</td><td>Dcm (DSL)</td></tr>
        <tr><td><b>P2*</b></td><td>ECU 发了 0x78 NRC 后，允许延长的最大时间</td><td>5000 ms</td><td>Dcm (DSL)</td></tr>
        <tr><td><b>S3server</b></td><td>ECU 在非 DefaultSession 中收到最后一条请求后，保持会话的时间</td><td>5000 ms</td><td>Dcm (DSL)</td></tr>
      </table>

      <h2>P2 的完整链路</h2>
      <pre><code>诊断仪                    ECU (Dcm DSL)
  → 请求 (10 03)
                           启动 P2 定时器
                           DSD 分发 → DSP 处理
  ← 正应答 (50 03 xx xx)    // 必须在 P2 内回第一字节
                           停 P2 定时器</code></pre>
      <p><b>注意</b>：多帧应答时，P2 只约束<b>第一帧</b>（FF）必须在 P2 内发出。后续 CF 由流控管理，不受 P2 约束。</p>

      <h2>0x78 (ResponsePending) 与 P2* 的关系</h2>
      <pre><code>诊断仪 → 请求 (2E F190 ... VIN)
         ECU callout 处理慢 / NvM 异步写还没完
         P2 快超了 (50ms)
         DSL 自动回 7F 2E 78  ← 这就是 ResponsePending
         启动 P2* 定时器 (5000ms)
         ...
         callout 终于完成
         回 6E F190 ...        ← 必须在 P2* 内</code></pre>
      <blockquote><b>关键规则</b>：0x78 可以连续发多次，每次刷新 P2*。但诊断仪有 patience limit（典型 10 次），超过就 abort。</blockquote>

      <h2>S3server — 会话保活的幕后推手</h2>
      <p>你进 ExtendedSession (10 03) 后，如果<b>5秒内没发任何请求</b>，ECU 自动切回 DefaultSession，安全等级也掉回 0。</p>
      <pre><code>进 ExtendedSession
  ↓
S3server 定时器启动 (5000ms)
  ↓
诊断仪每 2s 发一次：02 3E 80 00 00 00 00 00  ← TesterPresent
  ↓
Dcm 收到任意请求 → 复位 S3server
  ↓
超时未收到 → DSL 自动切 DefaultSession，SecLevel = 0</code></pre>
      <p>这就是为什么标定过程中要不停地发 <b>3E 80</b>（SuppressBit=1，静默保活）。如果忘了发，30 秒后进 Extended 做的解锁、DID 写权限全没了。</p>

      <h2>DFXY 项目配置在哪看</h2>
      <ul>
        <li><code>Dcm_Cfg.h</code> → <code>DCM_P2MAX_TIME</code> / <code>DCM_P2STARMAX_TIME</code> / <code>DCM_S3SERVER_TIME</code></li>
        <li>DaVinci Configurator → Dcm → Timings 面板，直接图形化改</li>
        <li>注意单位：Dcm 内部是 tick 数，要乘任务周期（如 5ms）才是真实毫秒</li>
      </ul>

      <h2>抓包验证 P2/P2* 的方法</h2>
      <pre><code>// Python + python-can 离线分析 BLF
for msg in blf:
    if msg.arbitration_id == 0x7E8:
        t_rx = msg.timestamp
    elif msg.arbitration_id == 0x7E0:
        t_tx = msg.timestamp
        # 计算请求→应答间隔，看是否 > P2(0.05s) 或 P2*(5s)
        delta = t_rx - t_tx
        if delta > 5.0:
            print(f"P2* 违规! 请求后 {delta:.2f}s 才回")</code></pre>
      <p>如果抓包发现 ECU 频繁发 0x78，说明 callout 处理太慢，需要优化异步流程或增大 P2。</p>
    `
  });

  L.push({
    id:'uds_auth',
    title:'3B. UDS 0x29 网络安全认证服务',
    subtitle:'ISO 14229-1:2020 新增，未来会替代 Seed/Key 的趋势',
    html: `
      <h2>0x27 Seed/Key 的局限</h2>
      <p>传统 Seed/Key 有两个根本缺陷：</p>
      <ul>
        <li><b>密钥分发问题</b>：同一车型的所有 ECU 常用同一套 Key 算法，泄漏一次等于全网破解</li>
        <li><b>无法区分"谁"在解锁</b>：只要算对 Key，不管是诊断仪、黑客还是竞争对手，ECU 都认</li>
      </ul>
      <p>0x29 Authentication 基于 <b>PKI/证书 + 双向认证</b>，解决以上问题。</p>

      <h2>0x29 子功能概览</h2>
      <table class="t">
        <tr><th>子功能</th><th>名称</th><th>作用</th></tr>
        <tr><td>0x01</td><td>deAuthentication</td><td>注销当前认证会话</td></tr>
        <tr><td>0x05</td><td>verifyCertificateUnidirectional</td><td>单向认证（诊断仪认证 ECU）</td></tr>
        <tr><td>0x06</td><td>verifyCertificateBidirectional</td><td>双向认证（互相验证证书）</td></tr>
        <tr><td>0x07</td><td>proofOfOwnership</td><td>证明拥有对应私钥（挑战-应答）</td></tr>
        <tr><td>0x08</td><td>transmitCertificate</td><td>传输证书（如 ECU 软件证书）</td></tr>
      </table>

      <h2>单向认证流程（0x05 → 0x07）</h2>
      <pre><code>诊断仪                                              ECU
  → 29 05 01  &lt;诊断仪证书&gt;      (CertificateVerify)
                               ECU 用 Root CA 公钥验证书合法性
                               生成随机挑战 ChallengeA
  ← 69 05 01  &lt;ChallengeA&gt;

  → 29 07 01  &lt;Sign(ChallengeA)&gt;   (ProofOfOwnership)
                               ECU 用证书里的公钥验签名
                               验签通过 → AccessGranted
  ← 69 07 01  00</code></pre>
      <p>和 0x27 的区别：<b>Challenge 是诊断仪验 ECU，不是 ECU 验诊断仪</b>。而且私钥永远存在安全芯片（HSM/TPM）里，不外传。</p>

      <h2>与 0x27 的共存策略</h2>
      <p>量产车型不会一夜切到 0x29，通常：</p>
      <ol>
        <li><b>过渡期</b>：0x27 Lev01 保留给 4S 店旧诊断仪，0x29 给新一代云端/OTA 诊断</li>
        <li><b>安全等级映射</b>：0x29 认证通过后，Dcm 内部设 AccessLevel，和 0x27 解锁后的 SecLevel 统一走 DSP 的权限检查</li>
        <li><b>刷写场景</b>：OTA 刷写必须 0x29 双向认证，防止中间人篡改固件包</li>
      </ol>

      <h2>DFXY 现状</h2>
      <blockquote>截至当前代码基线，DFXY IBC 模块仍以 0x27 AES-CMAC 为主，0x29 未启用。建议关注 OEM 网络安全路线图，下一代平台大概率切 PKI。</blockquote>
    `
  });

  L.push({
    id:'bootloader_deep',
    title:'4A. Bootloader 深入与 A/B 分区切换',
    subtitle:'刷写完后怎么激活新固件？看 Bootloader 的跳转逻辑',
    html: `
      <h2>Application vs Bootloader 的边界</h2>
      <p>ECU 上电后先跑 Bootloader（常驻 Flash 首扇区，不可擦除），由它决定跳 Application A 还是 B：</p>
      <pre><code>上电
  ↓
Bootloader 启动
  ↓
检查 ReprogrammingRequestFlag（由 Dcm 在 10 02 时置位）
  ↓
Flag=1 → 留在 Bootloader 等刷写 (0x34/36/37)
Flag=0 → 看 ValidFlag 决定跳 A 还是 B
  ↓
运行 Application</code></pre>

      <h2>A/B 双区架构</h2>
      <table class="t">
        <tr><th>分区</th><th>地址</th><th>状态</th><th>说明</th></tr>
        <tr><td>Bootloader</td><td>0x0000_0000 ~ 0x0001_FFFF</td><td>永远保留</td><td>16KB~128KB，含 FlashDriver、签名验签</td></tr>
        <tr><td>Application A</td><td>0x0002_0000 ~ 0x001F_FFFF</td><td>ValidFlag_A</td><td>当前运行区或备份区</td></tr>
        <tr><td>Application B</td><td>0x0020_0000 ~ 0x003D_FFFF</td><td>ValidFlag_B</td><td>互为备份</td></tr>
      </table>
      <p>刷写时<b>只写非运行区</b>（比如当前跑 A，就把新固件刷进 B），刷完验签通过后<b>互换 ValidFlag</b>，下次启动自动跳新分区。</p>

      <h2>DFXY 的 Version_Switchover (0xDD04)</h2>
      <p>RID 0xDD04 就是 A/B 切换的触发器，但不是立即切换，而是<b>标记下次启动时切区</b>：</p>
      <pre><code>诊断仪 → 31 01 DD 04       // 启动 Version_Switchover
ECU    ← 71 01 DD 04       // 已接受

内部逻辑：
  1. 校验新分区签名/CRC 通过
  2. SwapRequestFlag = 1
  3. 应答 71 01，但仍在当前区运行
  4. 诊断仪发 11 01 (HardReset) 或 11 03 (SoftReset)
  5. Bootloader 看到 SwapRequestFlag=1
  6. 互换 ValidFlag_A / ValidFlag_B
  7. 跳新分区启动</code></pre>
      <blockquote><b>为什么不是立即切？</b>：因为切区需要复位重新初始化所有外设、CAN 控制器、NvM，不能在 Application 运行时直接做。</blockquote>

      <h2>刷写三步走（0x34/36/37）在 Bootloader 中的落地</h2>
      <p>Application 收到 10 02 (ProgrammingSession) 后，把环境存到 NvM，置 ReprogrammingRequestFlag，然后软复位进 Bootloader：</p>
      <pre><code>Application 处理 10 02:
  → Dcm 回调 DcmAppl_Switch_DcmBootLoaderReset()
  → 写 NvM: ReprogrammingRequest = TRUE
  → 调用 Mcal_PerformReset()  // 软复位

Bootloader 启动:
  → 读 ReprogrammingRequestFlag = TRUE
  → 留在 Bootloader，初始化 CAN/CAN-FD
  → 等待诊断仪发 0x34 RequestDownload
  → 34/36/37 循环把数据写到 Flash
  → 每写完一块，CRC 校验
  → 全部写完，验签（RSA/ECDSA 或 CMAC）
  → 验签通过 → 写新分区 ValidFlag = TRUE
  → 清 ReprogrammingRequestFlag
  → 跳新 Application</code></pre>

      <h2>失败回滚机制</h2>
      <ul>
        <li><b>刷写中途断电</b>：新分区 CRC 不完整，ValidFlag 不会被置位。下次启动 Bootloader 发现新分区无效，继续跳老分区</li>
        <li><b>验签失败</b>：新分区 ValidFlag 保持 FALSE，老分区不受影响</li>
        <li><b>新分区启动后崩溃</b>：看门狗复位，Bootloader 发现上一次启动的是新分区且崩溃计数器 ≥ 阈值，自动回退老分区</li>
      </ul>

      <h2>FlashDriver 为什么临时加载</h2>
      <p>Application 不能自己擦写自己的 Flash（会跑飞），所以 Bootloader 自带最小 FlashDriver，或者诊断仪在 0x34 前通过 0x31 把 FlashDriver 下载到 RAM 执行。DFXY 采用<b>自带 FlashDriver</b> 方案，Bootloader 固件里已经内嵌擦写算法。</p>
    `
  });

  L.push({
    id:'rdtc_ext',
    title:'4B. 0x19 ReadDTCInformation 子功能补全',
    subtitle:'把 0x19 剩下的常用子功能和调试技巧补全',
    html: `
      <h2>0x19 子功能全景速查</h2>
      <table class="t">
        <tr><th>子功能</th><th>名称</th><th>用途</th></tr>
        <tr><td>0x01</td><td>reportNumberOfDTCByStatusMask</td><td>查有多少个 DTC 符合 mask</td></tr>
        <tr><td>0x02</td><td>reportDTCByStatusMask</td><td>列出所有匹配的 DTC</td></tr>
        <tr><td>0x03</td><td>reportDTCSnapshotIdentification</td><td>查哪些 DTC 有快照记录</td></tr>
        <tr><td>0x04</td><td>reportDTCSnapshotByDTCNumber</td><td>读指定 DTC 的快照（FreezeFrame）</td></tr>
        <tr><td>0x06</td><td>reportDTCExtDataRecordByDTCNumber</td><td>读扩展数据</td></tr>
        <tr><td>0x07</td><td>reportNumberOfDTCBySeverityMaskRecord</td><td>按严重度统计</td></tr>
        <tr><td>0x08</td><td>reportDTCBySeverityMaskRecord</td><td>按严重度列出</td></tr>
        <tr><td>0x0A</td><td>reportSupportedDTC</td><td>查 ECU 支持的所有 DTC</td></tr>
        <tr><td>0x0B</td><td>reportFirstTestFailedDTC</td><td>第一个失败的 DTC</td></tr>
        <tr><td>0x0C</td><td>reportFirstConfirmedDTC</td><td>第一个确认的 DTC</td></tr>
        <tr><td>0x0D</td><td>reportMostRecentTestFailedDTC</td><td>最近一次失败的 DTC</td></tr>
        <tr><td>0x0E</td><td>reportMostRecentConfirmedDTC</td><td>最近一次确认的 DTC</td></tr>
        <tr><td>0x14</td><td>reportDTCFaultDetectionCounter</td><td>读 Debounce 计数器</td></tr>
        <tr><td>0x19</td><td>reportDTCExtDataRecordByRecordNumber</td><td>按记录号读扩展数据</td></tr>
      </table>

      <h2>0x14 reportDTCFaultDetectionCounter — 调 Debounce 的神器</h2>
      <p>怀疑某个故障"快报了但还没报"，用 0x14 读它当前的 Debounce Counter：</p>
      <pre><code>请求：03 19 14 FF FF FF 00 00   ← 查所有 DTC 的 FDC
应答：59 14 03 C1 A0 01 7A 00   ← DTC C1A001 的 FDC = 0x7A (+122)
                 ↓
              Counter=0x7A → 接近 FailedThreshold (+127)，只差 5 次</code></pre>
      <p>FDC 范围一般是 -128 ~ +127（8bit signed 或 16bit）。正值越大越接近 confirmed，负值越大越接近 passed。</p>

      <h2>0x0B / 0x0C / 0x0D / 0x0E — 历史追溯</h2>
      <p>这几个子功能返回<b>历史首次/最近</b>的故障记录。对偶发故障排查特别有用：</p>
      <pre><code>19 0D → 最近一次 testFailed 的 DTC
19 0E → 最近一次 confirmed 的 DTC
19 0B → 整个生命周期第一个 testFailed 的 DTC</code></pre>

      <h2>0x07 / 0x08 — 按严重度过滤</h2>
      <p>ISO 14229 定义了 DTC 的 Severity，如 LampRelated / Immediate / Moderate。排放故障通常 severity 最高：</p>
      <pre><code>请求：03 19 08 20 00 FF FF 00
       ↑ severityMask=0x20 (lamp-related)
       ↑ statusMask=0xFF (所有状态)
应答：58 08 01 C1 A0 01 2F 20 ...</code></pre>

      <h2>常见踩坑</h2>
      <ul>
        <li><b>0x14 返回 NRC 0x31</b>：某些 ECU 只支持 0x14 配特定 DTC，不支持 0xFFFF 全查。先 0x0A 查支持列表，再逐个 0x14</li>
        <li><b>0x03 返回空</b>：FreezeFrame 只在 CDTC=1 的瞬间存一次，如果当前没有 confirmed DTC，0x03 返回 0 条</li>
        <li><b>0x0B/0x0C 在清码后也清掉了</b>：有些 ECU 清 0x14 会把 FirstFailed/FirstConfirmed 的历史也清，看 OEM 策略</li>
      </ul>
    `
  });

  L.push({
    id:'dem_config_chain',
    title:'5A. DEM Event → DTC 完整配置链',
    subtitle:'DaVinci 里怎么配一个故障：从 Event 到 DTC 落地的全链路',
    html: `
      <h2>为什么需要理解这条链</h2>
      <p>看代码时你只会看到 <code>Dem_SetEventStatus(EventId, FAILED)</code>，但 EventId 怎么映射到用户看到的 DTC（如 C1A001）？这中间隔了 4 层配置。</p>

      <h2>四层配置链全景</h2>
      <pre><code>应用层代码
  ↓ Dem_SetEventStatus(EventId=42, FAILED)

DEM 配置层 (DaVinci / EB tresos)
  ├─ EventId 42 → DemEventParameter "Evt_BrakePedalSensor_Circuit"
  ├─ 该 Event 绑定的 DebounceAlgorithm = CounterBased
  ├─ 该 Event 绑定的 OperationCycle = PowerCycle
  ├─ 该 Event 绑定的 DTCRef = DemDTC_C1A001
  ↓
DTC 配置层
  ├─ DemDTC_C1A001
  ├─ 绑定的 DTCValue = 0xC1A001
  ├─ 绑定的 Severity = LampRelated
  ├─ 绑定的 FunctionalUnit = Chassis / Braking
  ├─ 绑定的 OBDReadinessGroup = None (底盘 ECU 通常不关联 OBD)
  ↓
NvM 配置层
  ├─ 该 DTC 的 status + FDC + occurrence + aging + freezeFrame
  ├─ 存到 NvM Block: Dem_NvMBlock_DTC_&lt;ID&gt;
  ↓
Dcm 配置层
  ├─ DcmDtc 表引用 DemDTC_C1A001
  ├─ 0x19 子功能 02/0A 查询时，Dcm 调用 Dem API 取出 DTC 列表</code></pre>

      <h2>Debounce 在配置层的体现</h2>
      <table class="t">
        <tr><th>参数</th><th>DaVinci 配置名</th><th>典型值</th></tr>
        <tr><td>JumpUp</td><td>DebounceCounterJumpUp</td><td>+1</td></tr>
        <tr><td>JumpDown</td><td>DebounceCounterJumpDown</td><td>-2</td></tr>
        <tr><td>FailedThreshold</td><td>DebounceCounterFailedThreshold</td><td>+127</td></tr>
        <tr><td>PassedThreshold</td><td>DebounceCounterPassedThreshold</td><td>-127</td></tr>
        <tr><td>JumpUpValue</td><td>DebounceCounterJumpUpValue</td><td>+1</td></tr>
        <tr><td>JumpDownValue</td><td>DebounceCounterJumpDownValue</td><td>-2</td></tr>
      </table>
      <p>注意 JumpUp/JumpDown 和 JumpUpValue/JumpDownValue 的区别：前者是"每次跳多少"，后者是"跳到的目标值"。通常配成一样。</p>

      <h2>Enable Condition 的影响</h2>
      <p>DEM 允许给 Event 配 <b>EnableCondition</b>，不满足时 Event 不被处理（FDC 不增不减）：</p>
      <pre><code>EnableCondition "IgnitionOn":
  信号来源: DiagIgnState == 1

如果 EnableCondition = FALSE:
  Dem_SetEventStatus(EventId, FAILED) 被 DEM 忽略
  → FDC 不变 → 不会 pending/confirmed
  → 这就是为什么有些故障"明明条件满足却不报"</code></pre>
      <p>调试方法：用 0x19 14 读 FDC，如果永远 0，检查 EnableCondition 是否未满足。</p>

      <h2>OperationCycle 配置</h2>
      <p>DEM 的 OperationCycle 不是单一"上电周期"，可以定义多个：</p>
      <table class="t">
        <tr><th>Cycle 名</th><th>触发条件</th><th>用途</th></tr>
        <tr><td>PowerCycle</td><td>IGN ON/OFF</td><td>通用，大多数 DTC 用这个</td></tr>
        <tr><td>DrivingCycle</td><td>车速 &gt; 0 持续 N 秒</td><td>行驶相关故障（如转向角传感器）</td></tr>
        <tr><td>WarmUpCycle</td><td>冷却液温度从冷到热</td><td>排放相关 OBD 故障</td></tr>
        <tr><td>OBD_DrivingCycle</td><td>法规定义</td><td>MIL 灯控制</td></tr>
      </table>
      <p>OperationCycle 的 START/STOP 由应用层或 BSW 模块调用 <code>Dem_SetOperationCycleState()</code>。 AgingCounter 的递减只发生在 OperationCycle 完成时（STOP → 下一次 START 之间算一个完整 cycle）。</p>

      <h2>FreezeFrame 配置链</h2>
      <p>不是所有 DTC 都存 FreezeFrame，要显式在 DaVinci 里绑：</p>
      <pre><code>DemDTC_C1A001
  ├─ FreezeFrameClassRef = "FF_Class_Standard"    // 定义存哪些信号
  │   ├─ VehicleSpeed (1B)
  │   ├─ BatteryVoltage (2B)
  │   ├─ EngineSpeed (2B)
  │   └─ ...
  └─ FreezeFrameRecordNumber = 1                  // 该 DTC 最多存几组快照</code></pre>
      <p>通常每个 DTC 只存 1 组 FreezeFrame（RecordNumber=1）。RAM 和 NvM 都要分配对应大小。</p>

      <h2>常见踩坑</h2>
      <ul>
        <li><b>EventId 改了，DTC 没变</b>：DemEventParameter 的 EventId 是内部索引（0~N），如果 DaVinci 重新生成导致 EventId 偏移，但 DTCValue 不变，诊断仪读出来的 DTC 列表一样，只是代码里 <code>Dem_SetEventStatus(42, FAILED)</code> 的 42 可能指向另一个故障</li>
        <li><b>EnableCondition 太严格</b>：设了"车速&gt;0"才能报，但故障发生在驻车场景，永远进不了 confirmed</li>
        <li><b>OperationCycle 配错</b>：用 DrivingCycle 但车速信号源（如 CAN 报文）在 IGN ON 后 3s 才有效，结果前 3 个周期的 FDC 变化被漏掉</li>
        <li><b>NvM Block 大小不够</b>：FreezeFrame 8B + ExtendedData 4B + Status 1B = 13B，但 NvM Block 只配了 8B，导致 extended data 被截断</li>
      </ul>
    `
  });

  L.push({
    id:'periodic_did',
    title:'9A. 0x2A ReadDataByPeriodicIdentifier',
    subtitle:'不用反复发 0x22，让 ECU 自动广播 DID 数据',
    html: `
      <h2>0x22 vs 0x2A 的本质区别</h2>
      <p>0x22 是"问答式"：诊断仪问一次，ECU 答一次。实时监控时，诊断仪要不停轮询，总线负载高、延迟大。</p>
      <p>0x2A 是"订阅式"：诊断仪发一次请求，ECU 按固定周期自动广播该 DID 的值，直到诊断仪叫停。</p>

      <h2>0x2A 子功能</h2>
      <table class="t">
        <tr><th>子功能</th><th>名称</th><th>作用</th></tr>
        <tr><td>0x01</td><td>startSendingAtSlowRate</td><td>慢速周期（如 1000ms）</td></tr>
        <tr><td>0x02</td><td>startSendingAtMediumRate</td><td>中速周期（如 100ms）</td></tr>
        <tr><td>0x03</td><td>startSendingAtFastRate</td><td>快速周期（如 10ms）</td></tr>
        <tr><td>0x04</td><td>stopSending</td><td>停止发送</td></tr>
      </table>
      <p>三个速率的具体毫秒数由 ECU 内部配置，不是诊断仪传的。 DaVinci / EB tresos 里配 <code>DcmDspPeriodicTransmission</code>。</p>

      <h2>请求与应答示例</h2>
      <pre><code>// 启动 2 个 DID 的中速周期广播
请求：05 2A 02 F1 90 F1 87 00
       ↑   ↑  ↑  ↑
      len  SF  rate DID1 DID2

// ECU 开始每隔 100ms 主动发：
应答：06 6A 02 F1 90 01 02 03   ← 第 1 个 DID 的值
应答：06 6A 02 F1 87 AA BB CC   ← 第 2 个 DID 的值
// 没有请求方！ECU 自发 Tx</code></pre>
      <p>注意：0x2A 的应答 SID 不是 <code>0x2A + 0x40 = 0x6A</code>，而且应答里不再带子功能字节，而是直接跟 DID + 数据。</p>

      <h2>使用限制</h2>
      <ul>
        <li><b>物理寻址 only</b>：功能寻址不支持 0x2A，因为多个 ECU 同时广播会撞车</li>
        <li><b>会话要求</b>：通常只在 ExtendedSession 允许，DefaultSession 禁用</li>
        <li><b>安全等级</b>：某些敏感 DID（如车速、电机扭矩）要求解锁后才能订阅</li>
        <li><b>总线负载</b>：快速 10ms × 8B 数据 × 多个 DID 可能占满 CAN-FD。实际项目中通常只用 MediumRate</li>
      </ul>

      <h2>停止广播的两种方式</h2>
      <pre><code>// 方式 1：显式 stop
请求：02 2A 04 00 00 00 00 00

// 方式 2：会话掉回 Default（S3server 超时）
// 方式 3：诊断仪发 0x11 ECUReset</code></pre>
      <p>大部分 OEM 要求 Dcm 在会话切换或复位时自动清掉所有 periodic DID 订阅，避免 ECU 复位后还在广播。</p>

      <h2>DFXY 项目现状</h2>
      <blockquote>DFXY IBC 模块当前代码基线中 0x2A 未启用。底盘 ECU 对实时监控需求较低，通常由功能安全相关的 CAN 周期报文直接广播。如需调试，建议用 0x22 轮询 + 诊断仪侧脚本实现。</blockquote>
    `
  });

  L.push({
    id:'gateway_diag',
    title:'9B. 整车诊断网络与 Gateway 转发',
    subtitle:'多 ECU、多网段时诊断报文怎么路由',
    html: `
      <h2>现代汽车网络拓扑</h2>
      <p>一辆车上不是一根 CAN 总线，而是分区互联：</p>
      <pre><code>诊断仪 (OBD 口)
      │
      ▼
┌─────────────┐
│   Gateway   │ ← 中央网关，负责跨网段路由
│  (Domain)   │
└─┬───┬───┬───┘
  ▼   ▼   ▼
PT-CAN  Ch-CAN  Infotainment-CAN
(动力)  (底盘)    (娱乐)
  │      │        │
 ECU1   ECU2     ECU3
(EMS)  (IBC)    (HU)</code></pre>
      <p>诊断仪插在 OBD 口，物理上只接到 Gateway 的<b>诊断 CAN</b>。要访问底盘 ECU（IBC），报文必须经 Gateway 转发。</p>

      <h2>诊断路由的两种模式</h2>
      <table class="t">
        <tr><th>模式</th><th>原理</th><th>特点</th></tr>
        <tr><td><b>物理寻址路由</b></td><td>诊断仪发 0x7E0 → Gateway 看目标 ECU 在哪个网段 → 改 ID 发到对应 CAN</td><td>一对一，可长报文（多帧）</td></tr>
        <tr><td><b>功能寻址路由</b></td><td>诊断仪发 0x7DF → Gateway 广播到所有网段 → 各 ECU 同时应答</td><td>一对多，只能短报文（单帧）</td></tr>
      </table>

      <h2>Gateway 的诊断路由表</h2>
      <p>Gateway 内部有一张 <b>诊断路由表</b>，把诊断请求 ID 映射到目标网段和目标 ECU 物理 ID：</p>
      <pre><code>诊断仪请求 ID → 目标网段 → 目标 ECU 请求 ID → 目标 ECU 应答 ID

0x7E0 (EMS)  → PT-CAN  → 0x7E0  → 0x7E8
0x7E1 (TCU)  → PT-CAN  → 0x7E1  → 0x7E9
0x7E2 (IBC)  → Ch-CAN  → 0x7E2  → 0x7EA   ← DFXY 的 IBC
0x7E3 (EPS)  → Ch-CAN  → 0x7E3  → 0x7EB
0x7E4 (BMS)  → HV-CAN  → 0x7E4  → 0x7EC</code></pre>
      <p>Gateway 不只是改 ID，还要处理 <b>ISO-TP 会话状态</b>：如果诊断仪和 ECU 之间正在传多帧（FF/CF），Gateway 必须保持两端的序列号、BS、STmin 一致。</p>

      <h2>跨网段 ISO-TP 的难点</h2>
      <ul>
        <li><b>速率不匹配</b>：诊断 CAN 是 500kbps CAN-FD，Ch-CAN 可能是 250kbps 传统 CAN。Gateway 要缓冲整帧再转发，不能逐 byte 透传</li>
        <li><b>FC 帧方向</b>：诊断仪发 FF → Gateway 收到后发给 ECU → ECU 回 FC → Gateway 收 FC → 转发给诊断仪。Gateway 必须维持两个独立的 CanTp 状态机</li>
        <li><b>P2 超时</b>：诊断仪计时器从发请求开始，但 ECU 实际收到请求有 Gateway 转发延迟。OEM 通常把 Gateway 转发延迟计入 P2，或者放宽诊断仪超时</li>
      </ul>

      <h2>DoIP (Diagnostics over IP) — 以太网诊断</h2>
      <p>新能源车和高端车越来越多用 <b>DoIP (ISO 13400)</b>：诊断仪通过以太网（100BASE-T1）连 Gateway，UDS 报文封装在 TCP/UDP 里。</p>
      <pre><code>DoIP 帧头 (8B):
  协议版本 = 0x02 (DoIP v2)
  载荷类型 = 0x8001 (诊断消息)
  载荷长度 = N
  源地址 = 0x0E00 (诊断仪逻辑地址)
  目标地址 = 0x0007 (ECU 逻辑地址)

载荷 = UDS 原始报文 (SID + Data)</code></pre>
      <p>DoIP 不受 CAN 8B/64B 限制，单条消息可传数 KB，刷写速度比 CAN-FD 再快 10 倍以上。</p>

      <h2>整车诊断地址规划（典型）</h2>
      <table class="t">
        <tr><th>ECU</th><th>功能</th><th>网段</th><th>请求 ID</th><th>应答 ID</th></tr>
        <tr><td>EMS</td><td>发动机管理</td><td>PT-CAN</td><td>0x7E0</td><td>0x7E8</td></tr>
        <tr><td>TCU</td><td>变速箱</td><td>PT-CAN</td><td>0x7E1</td><td>0x7E9</td></tr>
        <tr><td>IBC</td><td>底盘制动</td><td>Ch-CAN</td><td>0x7E2</td><td>0x7EA</td></tr>
        <tr><td>EPS</td><td>转向</td><td>Ch-CAN</td><td>0x7E3</td><td>0x7EB</td></tr>
        <tr><td>BMS</td><td>电池管理</td><td>HV-CAN</td><td>0x7E4</td><td>0x7EC</td></tr>
        <tr><td>ACU</td><td>气囊</td><td>Body-CAN</td><td>0x7E5</td><td>0x7ED</td></tr>
        <tr><td>Gateway</td><td>网关本身</td><td>Diag-CAN</td><td>0x7E6</td><td>0x7EE</td></tr>
      </table>
      <p>同一网段内的 ECU 请求 ID 通常连续分配（0x7E0~0x7E7），应答 ID = 请求 ID + 0x8。</p>
    `
  });

  L.push({
    id:'diag_test_validation',
    title:'9C. 诊断一致性测试与法规认证',
    subtitle:'开发完后怎么证明 ECU 的诊断实现是合规的',
    html: `
      <h2>一致性测试 vs 功能测试 vs 法规认证</h2>
      <table class="t">
        <tr><th>类型</th><th>目的</th><th>工具</th></tr>
        <tr><td><b>一致性测试</b></td><td>验证 UDS/OBD 实现符合 ISO/SAE 标准</td><td>CANoe Test Module / vTESTstudio / 自研脚本</td></tr>
        <tr><td><b>功能测试</b></td><td>验证业务逻辑（DID 值、RID 标定效果）</td><td>CANoe Panel / HIL / 实车</td></tr>
        <tr><td><b>法规认证</b></td><td>满足 OBD-II / EOBD / GB18352 排放法规</td><td>认证机构 / 自检清单</td></tr>
      </table>

      <h2>UDS 一致性测试典型用例</h2>
      <pre><code>1. 正向：合法请求 → 验证应答 SID、格式、数据范围
2. 负向：
   - 非法 SID → 0x7F xx 11
   - 非法子功能 → 0x7F xx 12
   - 会话不支持 → 0x7F xx 7E
   - 安全等级不够 → 0x7F xx 33
   - 长度错误 → 0x7F xx 13
3. 超时：发请求后不应答 → 验证 ECU 重发/放弃策略
4. 边界：DID 边界值、DLC 边界、数据长度上限</code></pre>

      <h2>CANoe Test Module 自动化示例</h2>
      <pre><code>void Test_ReadDID_F190() {
    diagRequest(0x10, 0x03);
    checkResponse(0x50, 0x03, timeout=P2);

    diagRequest(0x22, 0xF1, 0x90);
    var r = getResponse();
    assert(r.SID == 0x62);
    assert(r.DID == 0xF190);
    assert(r.DataLength == 17);   // VIN 必须 17B
    assert(isAscii(r.Data));
}</code></pre>
      <p>vTESTstudio 支持参数化数据驱动，自动生成数百用例。</p>

      <h2>OBD 法规认证自检清单（GB18352.6 国六）</h2>
      <ul>
        <li><b>MIL 灯控制</b>：confirmed DTC 亮灯，清码后灭灯，3 个点火循环验证</li>
        <li><b>冻结帧</b>：MIL 相关 DTC confirmed 时存 FreezeFrame（含车速、负荷、冷却液温度）</li>
        <li><b>就绪状态</b>：PID 0x01 Readiness 位图，所有监控在规定循环完成</li>
        <li><b>VIN 可读</b>：OBD 口必须能读 VIN（PID 09 02）</li>
        <li><b>永久 DTC</b>：清码后 PermanentDTC 保留到 200 warm-up cycle 无故障</li>
      </ul>

      <h2>测试环境对比</h2>
      <table class="t">
        <tr><th>环境</th><th>用途</th><th>优缺</th></tr>
        <tr><td><b>HIL</b></td><td>ECU 脱离实车，仿真传感器/网络</td><td>可重复、24h 自动化；模型与实车有偏差</td></tr>
        <tr><td><b>实车/台架</b></td><td>真实信号、真实负载</td><td>最真实；不可重复、安全风险</td></tr>
        <tr><td><b>SW-SIL</b></td><td>纯软件仿真（PC 上跑 ECU 代码）</td><td> fastest；无总线时序、无硬件驱动</td></tr>
      </table>
    `
  });

  // ============================================================
  // QUIZZES — 综合测验
  // ============================================================
  const QUIZZES = [
    {
      id: 'final',
      title: '诊断知识总测验',
      questions: [
        {
          q: 'ISO-TP 中，单帧 SF 的 PCI 首字节高 4bit 是什么？',
          options: ['0', '1', '2', '3'],
          correct: 0,
          explanation: 'SF = Single Frame，PCI 类型码为 0（高 4bit=0），低 4bit=数据长度。'
        },
        {
          q: 'CAN-FD 的最大数据域长度（DLC）是多少字节？',
          options: ['8', '16', '32', '64'],
          correct: 3,
          explanation: '经典 CAN 最多 8B，CAN-FD 最多 64B。'
        },
        {
          q: 'UDS 正向应答 SID 的计算方式是什么？',
          options: ['请求 SID + 0x20', '请求 SID + 0x40', '请求 SID ^ 0x7F', '请求 SID + 0x10'],
          correct: 1,
          explanation: '正应答 = 请求 SID + 0x40。例如 0x10 → 0x50，0x22 → 0x62。'
        },
        {
          q: 'SuppressPosRspMsgIndicationBit 位于子功能字节的哪一位？',
          options: ['bit0', 'bit3', 'bit7', 'bit15'],
          correct: 2,
          explanation: '子功能字节的最高位 bit7 = 1 时抑制正应答，仅失败时回 0x7F NRC。'
        },
        {
          q: 'ISO-TP 流控帧 FC 的 PCI 类型码高 4bit 是什么？',
          options: ['0', '1', '2', '3'],
          correct: 3,
          explanation: 'FC = Flow Control，PCI 类型码为 3（高 4bit=3）。'
        },
        {
          q: 'DTC 3 字节编码中，首字节高 2bit 为 0b01 代表哪个系统？',
          options: ['P (动力总成)', 'C (底盘)', 'B (车身)', 'U (网络)'],
          correct: 1,
          explanation: '高 2bit：00=P，01=C，10=B，11=U。DFXY 的 IBC 属于底盘系统，因此高 2bit=01。'
        },
        {
          q: '以下哪个 NRC 表示"请求报文长度或格式不正确"？',
          options: ['0x11', '0x12', '0x13', '0x31'],
          correct: 2,
          explanation: '0x13 = incorrectMessageLengthOrInvalidFormat，表示长度对不上或格式错误。'
        },
        {
          q: '进入编程会话（Programming Session）的 UDS 请求是什么？',
          options: ['02 10 01', '02 10 02', '02 10 03', '02 10 04'],
          correct: 1,
          explanation: '0x10 02 是 ProgrammingSession，用于刷写和 Bootloader。'
        },
        {
          q: '物理寻址与功能寻址的最大区别是什么？',
          options: ['物理寻址更快', '功能寻址只能发单帧（SF）', '物理寻址使用 29 位 ID', '功能寻址只支持 UDS'],
          correct: 1,
          explanation: '功能寻址是广播，只能走单帧（≤7B），不能进行 ISO-TP 多帧长报文传输。'
        },
        {
          q: '刷写流程中，请求下载（RequestDownload）的服务 ID 是什么？',
          options: ['0x31', '0x34', '0x36', '0x37'],
          correct: 1,
          explanation: '0x34 = RequestDownload，0x36 = TransferData，0x37 = RequestTransferExit，0x31 = RoutineControl。'
        },
        {
          q: 'DEM 模块中，confirmed DTC 的 bit3 状态表示什么？',
          options: ['当前测试失败', '故障已确认并存入 NvM', '故障待定', '测试未完成'],
          correct: 1,
          explanation: 'confirmedDTC（bit3）表示故障已经过多次验证，被确认并存储到 NvM。'
        },
        {
          q: '0x27 安全访问的 Seed/Key 流程中，请求 Seed 的子功能一般是多少？',
          options: ['0x01', '0x02', '0x03', '0x04'],
          correct: 0,
          explanation: '0x27 01 请求 Seed（奇数），0x27 02 发送 Key（偶数），以此类推。'
        },
        {
          q: '以下哪种服务不需要扩展会话即可执行？',
          options: ['0x22 读 DID', '0x2E 写 DID', '0x2F IO 控制', '0x10 会话切换'],
          correct: 0,
          explanation: '0x22 读 DID 在默认会话即可执行；写 DID、IO 控制、Routine 通常需要扩展会话+解锁。'
        },
        {
          q: 'ISO-TP 多帧传输中，发送方发完 FF 后下一步必须等待什么？',
          options: ['FC（流控帧）', '下一个 CF', 'ACK 信号', 'P2 超时'],
          correct: 0,
          explanation: 'FF 之后发送方必须等待接收方回 FC（Flow Control），才能继续发送 CF。'
        },
        {
          q: 'DID 0xF190 在 ISO 14229 中通常代表什么数据？',
          options: ['软件版本号', 'VIN 车辆识别码', 'ECU 硬件版本', '生产日期'],
          correct: 1,
          explanation: '0xF190 是 ISO 规定的 VIN DID，全球统一语义。'
        }
      ]
    }
  ];

  // 暴露 + 占位（后续追加用）
  window.LESSONS = {
    appVersion: '1.6.2',
    groups: G,
    lessons: L,
    quizzes: QUIZZES
  };
})();
