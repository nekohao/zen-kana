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
  G.push({ title:'第二部分 · 传输层（ISO-TP）', lessons:['can','isotp_intro','isotp_sf','isotp_mf','isotp_fc','addressing'] });

  L.push({
    id:'can',
    title:'3. CAN / CAN-FD 帧速览',
    subtitle:'你做通信熟，这里只把诊断关心的点拎出来',
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
    id:'isotp_sf',
    title:'5. 单帧 SF — 一帧装得下的情况',
    subtitle:'看懂 02 10 03 这种"短诊断报文"',
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
    `
  });

  L.push({
    id:'isotp_mf',
    title:'6. 多帧 FF + CF — 长报文怎么拆',
    subtitle:'读 VIN、读 DTC、刷写都靠它',
    html: `
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
      <p>但是！发送方发完 FF 后<b>不能直接发 CF</b>，必须先<b>等接收方发 FC</b>批准。下一讲讲 FC。</p>
    `
  });

  L.push({
    id:'isotp_fc',
    title:'7. 流控帧 FC — 接收方的"红绿灯"',
    subtitle:'Block Size 与 STmin 是什么意思',
    html: `
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

  L.push({
    id:'addressing',
    title:'8. 物理寻址 vs 功能寻址',
    subtitle:'为什么 DFXY 要配 2 个 RxPduId',
    html: `
      <h2>两种寻址</h2>
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

  // ============================================================
  // GROUP 3 — UDS 协议核心
  // ============================================================
  G.push({ title:'第三部分 · UDS 协议核心', lessons:['uds_frame','suppress','nrc','session','security','misc_services'] });

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
    `
  });

  L.push({
    id:'suppress',
    title:'10. 子功能 & SuppressPosRspMsgIndicationBit',
    subtitle:'第二字节最高位为什么有时是 0x80',
    html: `
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
        <li>子功能 = <code>0x83</code> → 同样的子功能，但抑制正应答（0x83 = 0x80 \| 0x03）</li>
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
    subtitle:'DFXY 的 Lev01 解锁全过程',
    html: `
      <h2>核心思想</h2>
      <p>很多服务（写 VIN、刷写、Routine）必须先"解锁"。诊断仪和 ECU 共享一个<b>密钥算法</b>：</p>
      <ol>
        <li>诊断仪发 <code>0x27 01</code> → ECU 回一个随机 Seed</li>
        <li>诊断仪用算法 <code>Key = f(Seed, Secret)</code> 算出 Key</li>
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

      <h2>DFXY 项目配置</h2>
      <p>来自 <code>Dcm_SecurityAccess_Cfg.h</code> 和 <code>Dcm_API_Cfg.h</code>：</p>
      <ul>
        <li><b>仅 1 个安全等级 Lev01</b>（<code>DCM_NUM_CONFIGURED_SECURITY_LEVELS = 1U</code>）</li>
        <li>异步 callout：<code>SecurityGetSeedLev01()</code>、<code>SecurityCompareKeyLev01()</code></li>
        <li>有<b>失败计数器</b>：<code>SecurityLev1_GetAttemptCount()/SetAttemptCount()</code> — 防穷举</li>
        <li>有<b>延时锁定</b>：<code>DCM_DSP_SECURITYACCESS_DELAY_TIMERS_ENABLED = STD_ON</code> — key 错多次后冻结一段时间</li>
      </ul>

      <h2>典型解锁报文</h2>
      <pre><code>请求：02 27 01 00 00 00 00 00                   ← 要 Seed
应答：06 67 01 12 34 56 78 00                   ← Seed = 0x12345678

(诊断仪本地算 Key，假设 = 0xAA BB CC DD)

请求：06 27 02 AA BB CC DD 00                   ← 发 Key
应答：02 67 02 00 00 00 00 00                   ← 解锁成功</code></pre>

      <h2>失败场景</h2>
      <pre><code>7F 27 35   → invalidKey
7F 27 36   → 试错次数超限
7F 27 37   → 延时还没到，再等
7F 27 24   → 步骤错（没先要 Seed 直接发 Key）</code></pre>

      <h2>项目实现位置</h2>
      <p><code>SourceCode/BSW/DIAG/SRC/DF_XY_A/DiagAppSecurityAccess.c</code> — DFXY 自己的 Seed/Key 算法在这里。<b>这是出厂保密的核心算法之一</b>，刷写工具厂商需要拿到对应的 DLL 才能解锁你的 ECU。</p>
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
  G.push({ title:'第四部分 · 数据访问与刷写', lessons:['did_read','did_write','io_control','routine','dtc','clear_dtc','flash'] });

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
    `
  });

  L.push({
    id:'clear_dtc',
    title:'20. 0x14 ClearDiagnosticInformation',
    subtitle:'清 DTC',
    html: `
      <h2>请求/应答</h2>
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
  G.push({ title:'第五部分 · AUTOSAR DCM / DEM', lessons:['dcm_arch','dem_arch','callout_layer'] });

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
    subtitle:'87 个 DID 的语义、长度、callout',
    html: `
      <h2>识别类（0xF1xx）— 强制定义</h2>
      <table class="t">
        <tr><th>DID</th><th>名称</th><th>callout</th><th>权限</th></tr>
        <tr><td>0xF170</td><td>SystemName</td><td>DiagDidData_SystemName_Read</td><td>R</td></tr>
        <tr><td>0xF171</td><td>HWVersion</td><td>DiagDidData_HWVersion_Read</td><td>R</td></tr>
        <tr><td>0xF172</td><td>SwPartNumber</td><td>DiagDidData_SwPartNumber_Read</td><td>R</td></tr>
        <tr><td>0xF179</td><td>HaxiCode</td><td>DiagDidData_HaxiCode_Read</td><td>R</td></tr>
        <tr><td>0xF17F</td><td>BootVersion</td><td>DiagDidData_BootVersion_Read</td><td>R</td></tr>
        <tr><td>0xF180</td><td>BootLoaderVersionNumber</td><td>DiagDidData_BootLoaderVersionNumber_Read</td><td>R</td></tr>
        <tr><td>0xF182</td><td>CalDataPartNumber</td><td>DiagDidData_CalDataPartNumber_Read</td><td>R</td></tr>
        <tr><td>0xF184</td><td>CalDataVersion</td><td>DiagDidData_CalDataVersion_Read</td><td>R</td></tr>
        <tr><td>0xF187</td><td>SwPartNumber (vehicleManufacturerSpare)</td><td>—</td><td>R</td></tr>
        <tr><td>0xF188</td><td>SWVersion (manufacturer)</td><td>DiagDidData_SWVersion_Read</td><td>R</td></tr>
        <tr><td>0xF189</td><td>SystemSupplierID</td><td>DiagDidData_SystemSupplierID_Read</td><td>R</td></tr>
        <tr><td>0xF18A</td><td>SupplierECUHWID</td><td>DiagDidData_SupplierECUHWID_Read</td><td>R</td></tr>
        <tr><td><b>0xF18B</b></td><td>EcuManufactureDate</td><td>DiagDidData_EcuManufactureDate_Read/Write</td><td>R/W</td></tr>
        <tr><td><b>0xF18C</b></td><td>ECUSerialNumber</td><td>DiagDidData_ECUSerialNumDataID_Read/Write</td><td>R/W</td></tr>
        <tr><td><b>0xF190</b></td><td>VIN</td><td>DiagDidData_VIN_Read/Write</td><td>R/W</td></tr>
        <tr><td>0xF191</td><td>SupplierECUSWID</td><td>DiagDidData_SupplierECUSWID_Read</td><td>R</td></tr>
        <tr><td>0xF193</td><td>SupplierHWVersion</td><td>—</td><td>R</td></tr>
        <tr><td>0xF195</td><td>SupplierSWVersion</td><td>—</td><td>R</td></tr>
        <tr><td>0xF197</td><td>SystemNameOrEngineType</td><td>—</td><td>R</td></tr>
        <tr><td>0xF199</td><td>SWReleaseDate</td><td>DiagDidData_SWReleaseDate_Read</td><td>R</td></tr>
        <tr><td>0xF19C</td><td>EOLDate</td><td>DiagDidData_EOLDate_Read</td><td>R</td></tr>
        <tr><td>0xF1A1</td><td>FlashDriverPN</td><td>DiagDidData_FlashDriverPN_Read</td><td>R</td></tr>
      </table>

      <h2>OBD 类（0xF0xx）— 厂家 OBD 信息</h2>
      <table class="t">
        <tr><th>DID</th><th>典型用途</th></tr>
        <tr><td>0xF0A2</td><td>厂家 OBD 信息 A</td></tr>
        <tr><td>0xF0AF</td><td>厂家 OBD 信息</td></tr>
        <tr><td>0xF0F0</td><td>厂家 OBD 信息</td></tr>
      </table>

      <h2>厂家自定义（0xF1F0~0xF1FF）</h2>
      <table class="t">
        <tr><th>DID</th><th>名称</th><th>callout</th></tr>
        <tr><td>0xF1F0</td><td>ECUID</td><td>DiagDidData_ECUID_Read</td></tr>
        <tr><td>0xF1F2</td><td>电机行程位置</td><td>DiagDidData_MtrStrokePos_Read</td></tr>
      </table>

      <h2>系统供应商类（0xFD00~）— 实时数据</h2>
      <table class="t">
        <tr><th>DID</th><th>典型含义</th></tr>
        <tr><td>0xFD00</td><td>InterPower / 内部电源值</td></tr>
        <tr><td>0xFD01</td><td>InterSwitch 内部开关</td></tr>
        <tr><td>0xFD02</td><td>InterSensor 内部传感器</td></tr>
        <tr><td>0xFDxx</td><td>...另有 ~60 个，覆盖 IgnStatus / BattVolt / VehicleSpeed / SOC / EngineSpeed / TimeStamp / xEVReadySts 等</td></tr>
      </table>
      <blockquote>查具体 DID 完整列表的可靠方式：<b>grep <code>"DcmDspDid_0x"</code> 在 <code>Dcm_Cfg.c</code> 里全文搜索</b>。每个 DID 在那里都有一条 <code>{ 0xXXXXU, 1U, ... }</code> 记录 + 注释。</blockquote>
    `
  });

  L.push({
    id:'dfxy_rid_table',
    title:'27. DFXY RID 完整对照表',
    subtitle:'17 个 routine — 这是项目的"灵魂"',
    html: `
      <h2>全部 17 个 RID（按 callout 名）</h2>
      <table class="t">
        <tr><th>#</th><th>Routine 名</th><th>子功能</th><th>说明</th></tr>
        <tr><td>1</td><td>Motor_Calibration</td><td>Start / RequestResults</td><td>电机角度/相位标定</td></tr>
        <tr><td>2</td><td>Motor_DeCalibration</td><td>Start / RequestResults</td><td>清除电机标定</td></tr>
        <tr><td>3</td><td>PHS_Current_Calibration</td><td>Start / RequestResults</td><td>PHS 电流偏置标定</td></tr>
        <tr><td>4</td><td>MOC_FUNCTION_TEST</td><td>Start / RequestResults</td><td>电机控制器自测</td></tr>
        <tr><td>5</td><td>iPTS_Calibration</td><td>Start / RequestResults</td><td>iPTS 标定</td></tr>
        <tr><td>6</td><td>iPTS_Calibration_Mode</td><td>Start / Stop / RequestResults</td><td>iPTS 标定模式 (3 子功能完整)</td></tr>
        <tr><td>7</td><td>PbcControl</td><td>Start / RequestResults</td><td>PBC 控制</td></tr>
        <tr><td>8</td><td>PressSen_Calibration</td><td>Start / RequestResults</td><td>压力传感器标定</td></tr>
        <tr><td>9</td><td>PedalSen_Calibration</td><td>Start / RequestResults</td><td>踏板位置传感器学习</td></tr>
        <tr><td>10</td><td>Evac_And_Fill</td><td>Start / Stop / RequestResults</td><td>真空抽吸 + 制动液填充</td></tr>
        <tr><td>11</td><td>Service_Filling</td><td>Start / Stop / RequestResults</td><td>售后填充</td></tr>
        <tr><td>12-17</td><td>(其余 6 个)</td><td>—</td><td>读 <code>Dcm_RoutineControl_Cfg.h</code> 后半部分获得完整名单</td></tr>
      </table>

      <h2>典型 RID 时序（PedalSen_Calibration）</h2>
      <pre><code>① 10 03                     进入 ExtendedSession
   50 03 00 32 01 F4

② 27 01                     请求 Seed
   67 01 &lt;Seed4B&gt;

③ 27 02 &lt;Key4B&gt;             发送 Key
   67 02

④ 31 01 02 02               启动 PedalSen_Calibration (RID=0x0202 假设)
   71 01 02 02 00            已启动

⑤ ... 用户踩踏板/松踏板 ...

⑥ 31 03 02 02               查询结果
   71 03 02 02 01            完成，结果=1 OK</code></pre>

      <h2>设计模式总结</h2>
      <ul>
        <li>${tag('','★')} <b>大部分 RID 仅有 Start + RequestResults</b>，没有 Stop（一次启动跑完为止）</li>
        <li>${tag('','★')} 涉及"持续模式"的 RID（iPTS_Calibration_Mode、Evac_And_Fill、Service_Filling）有 <b>Stop</b>，可以中途取消</li>
        <li>${tag('warn','注意')} 几乎所有 RID 都要求：<b>扩展会话 + 安全解锁 + 车速=0</b></li>
        <li>${tag('ok','技巧')} 标定异步过程中应用层用周期任务 <code>Diag_Hndlr5ms()</code> 推进状态机，结果存全局变量供 <code>RequestResults</code> 读</li>
      </ul>
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

      <h2>安全等级</h2>
      <table class="t">
        <tr><th>Level</th><th>Seed 长度</th><th>Key 长度</th><th>解锁后能做</th></tr>
        <tr><td>Lev01</td><td>实现里定（典型 4B）</td><td>同上</td><td>所有写 DID / 所有 RID / 所有 IOC</td></tr>
      </table>
      <p>由于 DFXY 只配了 <b>1 个安全级</b>，意味着：<b>解一次锁就能做所有事</b>。这与某些项目"读受保护数据用 Lev01，写 VIN 用 Lev03"的多级方案不同。</p>

      <h2>权限矩阵（典型）</h2>
      <table class="t">
        <tr><th>服务</th><th>会话</th><th>需解锁</th></tr>
        <tr><td>0x22 读 0xF190 VIN</td><td>Default/Extended</td><td>否</td></tr>
        <tr><td>0x2E 写 0xF190 VIN</td><td>Extended</td><td>✅</td></tr>
        <tr><td>0x2E 写 0xF18B 制造日期</td><td>Extended</td><td>✅</td></tr>
        <tr><td>0x31 PedalSen_Calibration</td><td>Extended</td><td>✅</td></tr>
        <tr><td>0x2F MotorPhs IO 控制</td><td>Extended</td><td>✅</td></tr>
        <tr><td>0x14 清所有 DTC</td><td>Extended</td><td>否（典型）</td></tr>
        <tr><td>0x85 关 DTC 监控</td><td>Extended</td><td>否</td></tr>
        <tr><td>0x28 关通信</td><td>Extended/Programming</td><td>否</td></tr>
        <tr><td>0x34/36/37 刷写</td><td>Programming</td><td>✅</td></tr>
      </table>
      <blockquote>这张表项目里以函数指针 + Sec/Ses 引用形式硬编码在 <code>Dcm_RoutineControlOperations_Cfg.c</code>、<code>Dcm_Cfg.c</code> 的 DID 表里。要更准的"哪个 DID 哪个 RID 需要哪个会话/级别"，搜索 <code>SecurityLevelRef</code> / <code>SessionRef</code>。</blockquote>
    `
  });

  L.push({
    id:'dfxy_walkthrough',
    title:'29. 走读 DiagAppDidCallOut.c',
    subtitle:'你的"主战场"代码长什么样',
    html: `
      <h2>文件开头 — 全局缓冲</h2>
      <p><code>SourceCode/BSW/DIAG/SRC/DF_XY_A/DiagAppDidCallOut.c</code>：</p>
      <pre><code>uint8 ComponentNumber[ComponentNumber_LEN] = {"460073XY0A"};   // 0xF187
uint8 SwPartNumber[SwPartNumber_LEN] = {"47207XY00A"};         // 0xF172
uint8 System_Name[System_Name_LEN] = {"IBC"};                  // 0xF170
uint8 SysSprID[SysSprID_LEN] = {"M30023"};                     // 0xF18A 系统供应商
uint8 SupECUHWVNum[Version_NUM_LEN] = {"A.00"};                // 0xF18A 之类
uint8 Device_Number_default = 0x20;</code></pre>
      <p>这些<b>常量</b>就是 ECU 出厂"身份证"的内容，诊断仪读 0xF170 系列 DID 拿到的就是它们。改版本号 / 改零件号就改这里。</p>

      <h2>典型的 callout 风格</h2>
      <pre><code>Std_ReturnType DiagDidData_SystemName_Read(uint8 Data[])
{
    memcpy(Data, System_Name, System_Name_LEN);
    return E_OK;
}

Std_ReturnType DiagDidData_VIN_Read(uint8 Data[])
{
    /* VIN 来自 EEP，需先确保已加载 */
    EEP_GetVIN(Data);   // 拷贝 17 字节
    return E_OK;
}

Std_ReturnType DiagDidData_VIN_Write(
    const uint8 Data[],
    Dcm_NegativeResponseCodeType *ErrorCode)
{
    /* 校验：VIN 必须是 17 个 ASCII 字符 [0-9A-HJ-NPR-Z] */
    if (!IsValidVIN(Data)) {
        *ErrorCode = 0x31;   // requestOutOfRange
        return E_NOT_OK;
    }
    /* 写到 EEP — 异步 */
    if (EEP_WriteVIN(Data) != E_OK) {
        *ErrorCode = 0x72;   // generalProgrammingFailure
        return E_NOT_OK;
    }
    return E_OK;
}</code></pre>

      <h2>为什么有些 DID 在 Common 文件，有些在 DF_XY_A 文件</h2>
      <ul>
        <li><b>Common 文件</b>（<code>DiagAppDidCallOutCommon.c</code>）：所有 OEM 都用同样实现 — 比如硬件版本、引导版本，从同一段固件里读。</li>
        <li><b>DF_XY_A 文件</b>：东风专属的 DID 内容。比如 0xF170 系统名"IBC"，每个 OEM 字符串可能不同；或者 0xF1F2 行程位置的换算公式 OEM 不同。</li>
      </ul>

      <h2>一个常见 bug 的定位思路</h2>
      <blockquote>诊断仪读 0xF18A 拿到乱码 → 大概率是 <code>SysSprID[]</code> 长度宏 <code>SysSprID_LEN</code> 与 Dcm 配置里的 DID Data Size 不一致。<b>callout 拷多了几个字节</b>，污染了应答缓冲。看 <code>Dcm_Cfg.c</code> 里 0xF18A 表项的 DataSize 字段 vs <code>Diag_Setting.h</code> 里的长度宏。</blockquote>
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

  // 暴露 + 占位（后续追加用）
  window.LESSONS = {
    appVersion: '1.0.0',
    groups: G,
    lessons: L
  };
})();
