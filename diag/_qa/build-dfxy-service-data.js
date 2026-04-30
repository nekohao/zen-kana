const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
const chinaRoot = path.resolve(appRoot, '..');
const dcmRoot = path.join(chinaRoot, 'SourceCode', 'PLUGIN', 'AUTOSAR', 'AUTOCORE_TC387', 'generated', 'variant', 'Dcm', 'DF_XY_A');
const diagRoot = path.join(chinaRoot, 'SourceCode', 'BSW', 'DIAG');

const cfg = read(path.join(dcmRoot, 'Dcm_Cfg.c'));
const routineCfg = read(path.join(dcmRoot, 'Dcm_RoutineControlConst_Cfg.c'));
const routineOps = read(path.join(dcmRoot, 'Dcm_RoutineControlOperations_Cfg.c'));
const secCfg = read(path.join(dcmRoot, 'Dcm_SecurityAccess_Cfg.c'));

const sessionNames = new Map([
  [0x01, 'DefaultSession'],
  [0x02, 'ProgrammingSession'],
  [0x03, 'ExtendedDiagnosticSession'],
  [0x05, 'RollerBenchSession'],
  [0x77, 'SupplierSession'],
]);

const securityNames = new Map([
  [0x01, 'DCM_SEC_LEV_L1'],
]);

const serviceNames = new Map([
  [0x10, 'DiagnosticSessionControl'],
  [0x11, 'ECUReset'],
  [0x14, 'ClearDiagnosticInformation'],
  [0x19, 'ReadDTCInformation'],
  [0x22, 'ReadDataByIdentifier'],
  [0x23, 'ReadMemoryByAddress'],
  [0x27, 'SecurityAccess'],
  [0x28, 'CommunicationControl'],
  [0x2e, 'WriteDataByIdentifier'],
  [0x2f, 'InputOutputControlByIdentifier'],
  [0x31, 'RoutineControl'],
  [0x34, 'RequestDownload'],
  [0x36, 'TransferData'],
  [0x37, 'RequestTransferExit'],
  [0x3d, 'WriteMemoryByAddress'],
  [0x3e, 'TesterPresent'],
  [0x85, 'ControlDTCSetting'],
]);

const subNames = {
  0x10: { 0x01: 'DefaultSession', 0x02: 'ProgrammingSession', 0x03: 'ExtendedDiagnosticSession', 0x05: 'RollerBenchSession', 0x77: 'SupplierSession' },
  0x11: { 0x01: 'HardReset' },
  0x19: { 0x01: 'reportNumberOfDTCByStatusMask', 0x02: 'reportDTCByStatusMask', 0x04: 'reportDTCSnapshotRecordByDTCNumber', 0x06: 'reportDTCExtendedDataRecordByDTCNumber', 0x0a: 'reportSupportedDTC' },
  0x27: { 0x01: 'requestSeed_L1', 0x02: 'sendKey_L1' },
  0x28: { 0x00: 'enableRxAndTx', 0x03: 'disableRxAndTx' },
  0x31: { 0x01: 'startRoutine', 0x02: 'stopRoutine', 0x03: 'requestRoutineResults' },
  0x3e: { 0x00: 'zeroSubFunction' },
  0x85: { 0x01: 'on', 0x02: 'off' },
};

const serviceSummary = {
  0x10: '切换诊断会话。会话会直接影响后续服务是否允许执行。',
  0x11: '硬复位 ECU。复位后运行态会回到初始状态，诊断会话和安全解锁状态需要重新建立。',
  0x14: '清除 DTC 信息。执行后会影响 0x19 读取到的 DEM/DTC 结果。',
  0x19: '读取 DTC 信息。当前启用 5 个子服务，结果受 DEM 状态、0x14、0x85 影响。',
  0x22: '读取 DID。服务级只允许 Default/Extended/Supplier，单个 DID 还可能再限制 Session/Security。',
  0x23: '按地址读内存。DFXY 配置为 SupplierSession，可读 memoryId 0/1 的指定范围。',
  0x27: '安全访问。DFXY 只配置 L1，Seed/Key 均 16B，解锁后才能执行写入、刷写和多数例程。',
  0x28: '通信控制。会影响 ECU 通信收发状态，调试时要注意别把后续诊断链路切断。',
  0x2e: '写 DID。服务级要求 L1，单个 DID 还会限制 Session。',
  0x2f: 'IO 控制 DID。服务级要求 SupplierSession + L1，用于短时接管执行器/信号。',
  0x31: '执行 Routine。服务级允许 Extended/Supplier/RollerBench/Programming，具体 RID 再配置安全等级。',
  0x34: '请求下载。刷写链路第一步，要求 ProgrammingSession + L1。',
  0x36: '传输数据。必须跟在 0x34 之后，要求 ProgrammingSession + L1。',
  0x37: '退出传输。刷写下载阶段收尾，要求 ProgrammingSession + L1。',
  0x3d: '按地址写内存。DFXY 配置为 SupplierSession。',
  0x3e: 'TesterPresent 保活。用于避免 S3 超时回 DefaultSession。',
  0x85: '打开/关闭 DTC 设置。关闭后会影响 DEM 事件更新和后续 DTC 可见性。',
};

const serviceDependencies = {
  0x10: '0x10 77 要求已解锁 L1；而 0x27 只能在 0x03/0x77/0x05/0x02 中执行，所以常用链路是 10 03 -> 27 01/02 -> 10 77。',
  0x11: '复位会打断当前诊断上下文；复位后重新 10 03 / 27 解锁。',
  0x14: '清除后 0x19 的结果会变化；如果 0x85 02 关闭了 DTC 设置，故障状态更新也会受影响。',
  0x19: '0x19 本身无 Session/Security 限制，但读到什么由 DEM 当前状态决定。',
  0x22: '只读 DID 不能替代 0x2E/0x2F 权限；同一个 DID 的读、写、控制权限可能不同。',
  0x23: '只能访问 Dcm_MemoryIdInfoAndIdValueTable 配置范围。',
  0x27: '先 27 01 请求 16B Seed，再 27 02 发送 16B Key；失败计数和延时由 SecurityLev1_* 管理。',
  0x28: 'DisableRxAndTx 后会影响通信链路，通常测试完成后用 28 00 恢复。',
  0x2e: '有效条件 = 0x2E 服务级权限 + DID 写权限 + callout 内部业务检查。',
  0x2f: '有效条件 = 0x2F 服务级权限 + DID IO 权限；控制后应使用 returnControlToECU 释放。',
  0x31: '有效条件 = 0x31 服务级权限 + RID 权限 + routine 内部条件检查。0x0203 是前置条件检查例程。',
  0x34: '建议先进入 10 02，再在 ProgrammingSession 内 27 01/02 解锁，然后执行 34/36/37。',
  0x36: '依赖 0x34 建立的下载上下文和 blockSequenceCounter。',
  0x37: '依赖 0x36 传输完成，用于让服务端校验并结束传输。',
  0x3d: '只能访问配置的写内存范围。',
  0x3e: 'Extended/Supplier/Programming/RollerBench 中需要周期发送，避免 S3 回 Default。',
  0x85: '0x85 02 会关闭 DTC setting，影响后续 DEM 记录和 0x19 观察结果。',
};

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function hex(value, width = 2) {
  return '0x' + Number(value).toString(16).toUpperCase().padStart(width, '0');
}

function parseNum(token) {
  const clean = String(token || '').replace(/[uUlL]/g, '').trim();
  if (/^0x/i.test(clean)) return parseInt(clean, 16);
  if (/^\d+$/.test(clean)) return parseInt(clean, 10);
  return null;
}

function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

function extractArray(src, name) {
  const idx = src.indexOf(name);
  if (idx < 0) throw new Error('Array not found: ' + name);
  const start = src.indexOf('{', idx);
  let depth = 0;
  for (let i = start; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(start + 1, i);
    }
  }
  throw new Error('Array not closed: ' + name);
}

function parseValueArray(src, name) {
  const body = stripComments(extractArray(src, name));
  return [...body.matchAll(/0x[0-9a-fA-F]+U?|\b\d+U?\b/g)].map((m) => parseNum(m[0])).filter((v) => v !== null);
}

function splitEntries(body) {
  const entries = [];
  let start = -1;
  let depth = 0;
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (ch === '{') {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        entries.push(body.slice(start, i + 1));
        start = -1;
      }
    }
  }
  return entries;
}

function splitTokens(entry) {
  const text = stripComments(entry.slice(1, -1));
  const out = [];
  let start = 0;
  let paren = 0;
  let bracket = 0;
  let brace = 0;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '(') paren += 1;
    if (ch === ')') paren -= 1;
    if (ch === '[') bracket += 1;
    if (ch === ']') bracket -= 1;
    if (ch === '{') brace += 1;
    if (ch === '}') brace -= 1;
    if (ch === ',' && paren === 0 && bracket === 0 && brace === 0) {
      out.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }
  const tail = text.slice(start).trim();
  if (tail) out.push(tail);
  return out;
}

function ptrIndex(token, name) {
  const re = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\[\\s*(\\d+)\\s*\\]');
  const m = String(token || '').match(re);
  return m ? parseInt(m[1], 10) : null;
}

function fnName(token) {
  const m = String(token || '').match(/&\s*([A-Za-z_]\w*)/);
  return m ? m[1] : null;
}

function resolveLevels(token, count, arrayName, values) {
  const idx = ptrIndex(token, arrayName);
  if (idx === null || !count) return [];
  return values.slice(idx, idx + count);
}

function formatLevels(values, map, width = 2) {
  if (!values || values.length === 0) return ['任意'];
  return values.map((v) => `${hex(v, width)} ${map.get(v) || ''}`.trim());
}

function intersect(a, b) {
  if (!a.length) return b.slice();
  if (!b.length) return a.slice();
  const set = new Set(b);
  return a.filter((v) => set.has(v));
}

function union(a, b) {
  return [...new Set([...(a || []), ...(b || [])])];
}

function parseServices() {
  const sidSes = parseValueArray(cfg, 'Dcm_SidTabSesLevels');
  const sidSec = parseValueArray(cfg, 'Dcm_SidTabSecLevels');
  const subSes = parseValueArray(cfg, 'Dcm_SubSidTabSesLevels');
  const subSec = parseValueArray(cfg, 'Dcm_SubSidTabSecLevels');
  const subTables = new Map();
  const subRe = /STATIC\s+CONST\(Dcm_SubSidTabEntryConfigType[\s\S]*?(Dcm_SidTabEntryConfig0_SubSidTabEntryConfig\d+)\[[^\]]+\]\s*=\s*\{/g;
  for (const m of cfg.matchAll(subRe)) {
    const name = m[1];
    const body = extractArray(cfg, name);
    const entries = splitEntries(body).map((entry) => {
      const t = splitTokens(entry);
      const numSes = parseNum(t[6]) || 0;
      const numSec = parseNum(t[7]) || 0;
      return {
        sub: parseNum(t[5]),
        sessions: resolveLevels(t[0], numSes, 'Dcm_SubSidTabSesLevels', subSes),
        security: resolveLevels(t[1], numSec, 'Dcm_SubSidTabSecLevels', subSec),
        externalHandler: fnName(t[2]),
        internalHandler: fnName(t[3]),
      };
    });
    subTables.set(name, entries);
  }

  const body = extractArray(cfg, 'Dcm_SidTabEntryConfig0[17]');
  return splitEntries(body).map((entry) => {
    const t = splitTokens(entry);
    const sid = parseNum(t[6]);
    const numSes = parseNum(t[7]) || 0;
    const numSec = parseNum(t[8]) || 0;
    const subTable = [...String(t[2]).matchAll(/Dcm_SidTabEntryConfig0_SubSidTabEntryConfig\d+/g)][0]?.[0] || null;
    const subservices = (subTables.get(subTable) || []).map((ss) => ({
      ...ss,
      id: hex(ss.sub, 2),
      name: subNames[sid]?.[ss.sub] || '',
      sessionsText: formatLevels(ss.sessions, sessionNames),
      securityText: formatLevels(ss.security, securityNames),
      meaning: subMeaning(sid, ss.sub),
    }));
    const sessions = resolveLevels(t[0], numSes, 'Dcm_SidTabSesLevels', sidSes);
    const security = resolveLevels(t[1], numSec, 'Dcm_SidTabSecLevels', sidSec);
    return {
      sid: hex(sid, 2),
      sidValue: sid,
      name: serviceNames.get(sid) || '',
      summary: serviceSummary[sid] || '',
      dependencies: serviceDependencies[sid] || '',
      sessions,
      security,
      sessionsText: formatLevels(sessions, sessionNames),
      securityText: formatLevels(security, securityNames),
      subservices,
      handler: fnName(t[4]),
      subfunctionAvailable: String(t[10]).includes('TRUE'),
      asyncService: String(t[11]).includes('TRUE'),
      code: serviceCode(sid, sessions, security, subservices),
    };
  });
}

function subMeaning(sid, sub) {
  if (sid === 0x10) {
    return {
      0x01: '回 DefaultSession。',
      0x02: '进入 ProgrammingSession；配置要求当前处于 Extended 或 Supplier。',
      0x03: '进入 ExtendedDiagnosticSession；常作为解锁和工程服务入口。',
      0x05: '进入 RollerBenchSession；配置允许 Default/Supplier/RollerBench 下请求。',
      0x77: '进入 SupplierSession；配置要求安全等级 L1。',
    }[sub] || '';
  }
  if (sid === 0x27) return sub === 0x01 ? '请求 L1 Seed。' : '发送 L1 Key。';
  if (sid === 0x28) return sub === 0x00 ? '恢复 Rx/Tx。' : '关闭 Rx/Tx。';
  if (sid === 0x31) return subNames[0x31][sub] || '';
  if (sid === 0x85) return sub === 0x01 ? '打开 DTC setting。' : '关闭 DTC setting。';
  return subNames[sid]?.[sub] || '';
}

function serviceCode(sid, sessions, security, subservices) {
  const parts = [
    `SID ${hex(sid)} ${serviceNames.get(sid) || ''}`,
    `  service sessions: ${formatLevels(sessions, sessionNames).join(', ')}`,
    `  service security: ${formatLevels(security, securityNames).join(', ')}`,
  ];
  for (const ss of subservices) {
    parts.push(`  sub ${ss.id} ${ss.name}: sessions=${ss.sessionsText.join('|')}; security=${ss.securityText.join('|')}; handler=${ss.externalHandler || ss.internalHandler || '-'}`);
  }
  return parts.join('\n');
}

function parseAccessInfo(arrayName, secArrayName, sesArrayName, secValues, sesValues, src = cfg) {
  return splitEntries(extractArray(src, arrayName)).map((entry) => {
    const secIdx = ptrIndex(entry, secArrayName);
    const sesIdx = ptrIndex(entry, sesArrayName);
    const numSec = Number((entry.match(/(\d+)\s*,\s*\/\*\s*NumSecLevels/) || [])[1] || 0);
    const numSes = Number((entry.match(/(\d+)\s*,\s*\/\*\s*NumSesCtrls/) || [])[1] || 0);
    const ext = {};
    for (const [key, label] of [
      ['freeze', 'FreezeCurrentStateEnable'],
      ['reset', 'ResetToDefaulEnable'],
      ['shortTerm', 'ShortTermAdjustmentEnable'],
      ['returnControl', 'ReturnControlToEcuEnable'],
    ]) {
      const m = entry.match(new RegExp('(TRUE|FALSE)\\s*,\\s*\\/\\*\\s*' + label));
      if (m) ext[key] = m[1] === 'TRUE';
    }
    return {
      sessions: sesIdx === null ? [] : sesValues.slice(sesIdx, sesIdx + numSes),
      security: secIdx === null ? [] : secValues.slice(secIdx, secIdx + numSec),
      ext,
    };
  });
}

function parseDidDataOps() {
  const body = extractArray(cfg, 'Dcm_DidDataTable');
  const map = new Map();
  let current = null;
  let lastComment = '';
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    const did = line.match(/Available function pointers for DcmDspData_0x([0-9a-fA-F]+)/);
    if (did) {
      current = parseInt(did[1], 16);
      if (!map.has(current)) map.set(current, []);
      lastComment = '';
      continue;
    }
    const comment = line.match(/\/\*\s*(.*?)\s*\*\//);
    if (comment) lastComment = comment[1];
    const fn = line.match(/&([A-Za-z_]\w*)/);
    if (current !== null && fn) {
      map.get(current).push({ kind: normalizeDidOp(lastComment), comment: lastComment, fn: fn[1] });
      lastComment = '';
    }
  }
  return map;
}

function normalizeDidOp(comment) {
  const c = String(comment || '').toLowerCase();
  if (c.includes('conditioncheck')) return 'condition';
  if (c.includes('write')) return 'write';
  if (c.includes('short term')) return 'shortTerm';
  if (c.includes('reset to default')) return 'reset';
  if (c.includes('returncontrol')) return 'returnControl';
  if (c.includes('read')) return 'read';
  return 'other';
}

function parseDidSignals() {
  return splitEntries(extractArray(cfg, 'Dcm_DidSignals')).map((entry) => {
    const nums = [...stripComments(entry).matchAll(/0x[0-9a-fA-F]+U?|\b\d+U?\b/g)].map((m) => parseNum(m[0]));
    const did = (entry.match(/DcmDspDid_0x([0-9a-fA-F]+)/) || [])[1];
    return { bitPos: nums[0], dataIndex: nums[1], did: did ? parseInt(did, 16) : null };
  });
}

function parseDidDataIndexing() {
  return splitEntries(extractArray(cfg, 'Dcm_DidDataIndexingArray')).map((entry) => {
    const nums = [...stripComments(entry).matchAll(/0x[0-9a-fA-F]+U?|\b\d+U?\b/g)].map((m) => parseNum(m[0]));
    return { tableIndex: nums[0], descriptor: nums[1] };
  });
}

function parseDidInfo() {
  return splitEntries(extractArray(cfg, 'Dcm_DidInfo')).map((entry) => {
    const read = (entry.match(/([A-Z0-9_]+|\d+)\s*,\s*\/\*\s*ReadAccessInfoIdx/) || [])[1];
    const write = (entry.match(/([A-Z0-9_]+|\d+)\s*,\s*\/\*\s*WriteAccessInfoIdx/) || [])[1];
    const ioctl = (entry.match(/([A-Z0-9_]+|\d+)\s*,\s*\/\*\s*IoctlAccessInfoIdx/) || [])[1];
    return {
      read: read && /^\d+$/.test(read) ? Number(read) : null,
      write: write && /^\d+$/.test(write) ? Number(write) : null,
      ioctl: ioctl && /^\d+$/.test(ioctl) ? Number(ioctl) : null,
    };
  });
}

function parseDids(services, functionIndex) {
  const readSec = parseValueArray(cfg, 'Dcm_ReadDidSecTypes');
  const readSes = parseValueArray(cfg, 'Dcm_ReadDidSesTypes');
  const writeSec = parseValueArray(cfg, 'Dcm_WriteDidSecTypes');
  const writeSes = parseValueArray(cfg, 'Dcm_WriteDidSesTypes');
  const ctrlSec = parseValueArray(cfg, 'Dcm_ControlDidSecLevels');
  const ctrlSes = parseValueArray(cfg, 'Dcm_ControlDidSesLevels');
  const readAccess = parseAccessInfo('Dcm_DidReadAccessInfo', 'Dcm_ReadDidSecTypes', 'Dcm_ReadDidSesTypes', readSec, readSes);
  const writeAccess = parseAccessInfo('Dcm_DidWriteAccessInfo', 'Dcm_WriteDidSecTypes', 'Dcm_WriteDidSesTypes', writeSec, writeSes);
  const ioctlAccess = parseAccessInfo('Dcm_DidIoctlAccessInfo', 'Dcm_ControlDidSecLevels', 'Dcm_ControlDidSesLevels', ctrlSec, ctrlSes);
  const didInfo = parseDidInfo();
  const didSignals = parseDidSignals();
  const dataIndexing = parseDidDataIndexing();
  const sizes = parseValueArray(cfg, 'Dcm_DidDataSizeArray');
  const dataOps = parseDidDataOps();
  const serviceMap = new Map(services.map((s) => [s.sidValue, s]));

  return splitEntries(extractArray(cfg, 'Dcm_DidConfig')).map((entry) => {
    const t = splitTokens(entry);
    const did = parseNum(t[0]);
    const infoIdx = parseNum(t[2]);
    const signalIdx = parseNum(t[4]);
    const info = didInfo[infoIdx] || {};
    const signal = didSignals[signalIdx] || {};
    const dataMeta = dataIndexing[signal.dataIndex] || {};
    const sizeBits = sizes[signal.dataIndex];
    const ops = dataOps.get(did) || [];
    const readOp = buildDidOperation(did, 'read', info.read, readAccess, serviceMap.get(0x22), ops, functionIndex);
    const writeOp = buildDidOperation(did, 'write', info.write, writeAccess, serviceMap.get(0x2e), ops, functionIndex);
    const ioctlOp = buildDidOperation(did, 'ioctl', info.ioctl, ioctlAccess, serviceMap.get(0x2f), ops, functionIndex);
    const name = inferDidName(did, ops);
    const operations = [readOp, writeOp, ioctlOp].filter(Boolean);
    return {
      did: hex(did, 4),
      didValue: did,
      name,
      sizeBits,
      sizeText: sizeBits == null ? '-' : (sizeBits % 8 === 0 ? `${sizeBits / 8} B` : `${sizeBits} bit`),
      didInfoIdx: infoIdx,
      dataIndex: signal.dataIndex,
      dataTableIndex: dataMeta.tableIndex,
      sync: /TRUE/.test(t[6]),
      operations,
      code: didCode(did, name, operations),
    };
  }).sort((a, b) => a.didValue - b.didValue);
}

function buildDidOperation(did, type, accessIdx, accessTable, service, ops, functionIndex) {
  if (accessIdx === null || accessIdx === undefined || !service) return null;
  const access = accessTable[accessIdx] || { sessions: [], security: [], ext: {} };
  const sessions = intersect(service.sessions, access.sessions);
  const security = union(service.security, access.security);
  const relevantKinds = type === 'ioctl'
    ? ['shortTerm', 'reset', 'returnControl']
    : [type, 'condition'];
  const fns = ops.filter((op) => relevantKinds.includes(op.kind)).map((op) => ({
    ...op,
    ref: functionIndex.get(op.fn) || null,
  }));
  const ioSubservices = type === 'ioctl' ? [
    access.ext.returnControl ? '0x00 returnControlToECU' : null,
    access.ext.reset ? '0x01 resetToDefault' : null,
    access.ext.freeze ? '0x02 freezeCurrentState' : null,
    access.ext.shortTerm ? '0x03 shortTermAdjustment' : null,
  ].filter(Boolean) : [];
  if (type === 'ioctl' && ioSubservices.length === 0 && fns.length === 0) return null;
  return {
    service: type === 'read' ? '0x22' : (type === 'write' ? '0x2E' : '0x2F'),
    type,
    accessIdx,
    sessions,
    security,
    sessionsText: formatLevels(sessions, sessionNames),
    securityText: formatLevels(security, securityNames),
    functions: fns,
    ioSubservices,
  };
}

function inferDidName(did, ops) {
  const fn = (ops.find((op) => op.kind === 'read') || ops[0] || {}).fn || '';
  return fn
    .replace(/^DiagDidData_/, '')
    .replace(/^DiagIO_/, '')
    .replace(/_(Read|Write|Wrtie|CndChk|ShortTermAdjustment|ResetToDefault|ReturnControlToEcu)$/, '')
    || `DID_${hex(did, 4)}`;
}

function didCode(did, name, operations) {
  const lines = [`DID ${hex(did, 4)} ${name}`];
  for (const op of operations) {
    lines.push(`  ${op.service} ${op.type}: sessions=${op.sessionsText.join('|')}; security=${op.securityText.join('|')}`);
    for (const fn of op.functions) lines.push(`    -> ${fn.fn}() ${fn.ref ? `// ${fn.ref.file}:${fn.ref.line}` : ''}`);
    if (op.ioSubservices?.length) lines.push(`    IO subfunctions: ${op.ioSubservices.join(', ')}`);
  }
  return lines.join('\n');
}

function parseRoutines(services, functionIndex) {
  const sesValues = parseValueArray(routineCfg, 'Dcm_RoutineControl_SessionTypes');
  const secValues = parseValueArray(routineCfg, 'Dcm_RoutineControl_SecurityLevel');
  const infos = splitEntries(extractArray(routineCfg, 'Dcm_DspRoutineInfoConfig[17]')).map((entry) => {
    const numSes = Number((entry.match(/Number of sessions \*\/\s*(\d+)U?/) || [])[1] || 0);
    const numSec = Number((entry.match(/Number of security levels \*\/\s*(\d+)U?/) || [])[1] || 0);
    const sesIdx = ptrIndex(entry, 'Dcm_RoutineControl_SessionTypes');
    const secIdx = ptrIndex(entry, 'Dcm_RoutineControl_SecurityLevel');
    return {
      sessions: sesIdx === null ? [] : sesValues.slice(sesIdx, sesIdx + numSes),
      security: secIdx === null ? [] : secValues.slice(secIdx, secIdx + numSec),
    };
  });
  const wrappers = parseRoutineWrappers();
  const svc31 = services.find((s) => s.sidValue === 0x31);
  return splitEntries(extractArray(routineCfg, 'Dcm_DspRoutineConfig[DCM_NUM_ROUTINES]')).map((entry) => {
    const request = fnName((entry.match(/Pointer to request service handler function \*\/\s*([^,]+)/) || [])[1]) || null;
    const start = fnName((entry.match(/Pointer to start service handler function \*\/\s*([^,]+)/) || [])[1]) || null;
    const stop = fnName((entry.match(/Pointer to stop service handler function \*\/\s*([^,]+)/) || [])[1]) || null;
    const infoIdx = Number((entry.match(/Dcm_DspRoutineInfoConfig\[(\d+)\]/) || [])[1]);
    const rid = parseNum((entry.match(/RID Identifier \*\/\s*(0x[0-9a-fA-F]+U?|\d+U?)/) || [])[1]);
    const info = infos[infoIdx] || { sessions: [], security: [] };
    const sessions = intersect(svc31.sessions, info.sessions);
    const security = union(svc31.security, info.security);
    const subservices = [
      start ? routineSub('0x01', 'startRoutine', start, wrappers, functionIndex) : null,
      stop ? routineSub('0x02', 'stopRoutine', stop, wrappers, functionIndex) : null,
      request ? routineSub('0x03', 'requestRoutineResults', request, wrappers, functionIndex) : null,
    ].filter(Boolean);
    const name = inferRoutineName(subservices, rid);
    return {
      rid: hex(rid, 4),
      ridValue: rid,
      name,
      sessions,
      security,
      sessionsText: formatLevels(sessions, sessionNames),
      securityText: formatLevels(security, securityNames),
      subservices,
      code: routineCode(rid, name, sessions, security, subservices),
    };
  }).sort((a, b) => a.ridValue - b.ridValue);
}

function parseRoutineWrappers() {
  const map = new Map();
  const fnRe = /FUNC\(Std_ReturnType,\s*DCM_CODE\)\s+(Dcm_DcmDspRoutine_[A-Za-z0-9_]+)\s*\(/g;
  for (const m of routineOps.matchAll(fnRe)) {
    const name = m[1];
    const start = routineOps.indexOf('{', m.index);
    let depth = 0;
    let end = start;
    for (; end < routineOps.length; end += 1) {
      if (routineOps[end] === '{') depth += 1;
      if (routineOps[end] === '}') {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    const body = routineOps.slice(start, end + 1);
    const calls = [...body.matchAll(/\b(DiagRoutine_[A-Za-z0-9_]+)\s*\(/g)].map((x) => x[1]);
    map.set(name, [...new Set(calls)]);
  }
  return map;
}

function routineSub(id, name, wrapper, wrappers, functionIndex) {
  const calls = wrappers.get(wrapper) || [];
  return {
    id,
    name,
    wrapper,
    calls: calls.map((fn) => ({ fn, ref: functionIndex.get(fn) || null })),
  };
}

function inferRoutineName(subservices, rid) {
  const call = subservices.flatMap((s) => s.calls).find(Boolean)?.fn || subservices[0]?.wrapper || '';
  return call
    .replace(/^DiagRoutine_/, '')
    .replace(/^Dcm_DcmDspRoutine_/, '')
    .replace(/_(Start|Stop|Result|RequestResults)$/, '')
    || `RID_${hex(rid, 4)}`;
}

function routineCode(rid, name, sessions, security, subservices) {
  const lines = [
    `RID ${hex(rid, 4)} ${name}`,
    `  service: 0x31 RoutineControl`,
    `  sessions: ${formatLevels(sessions, sessionNames).join(', ')}`,
    `  security: ${formatLevels(security, securityNames).join(', ')}`,
  ];
  for (const ss of subservices) {
    lines.push(`  ${ss.id} ${ss.name} -> ${ss.wrapper}()`);
    for (const call of ss.calls) lines.push(`    -> ${call.fn}() ${call.ref ? `// ${call.ref.file}:${call.ref.line}` : ''}`);
  }
  return lines.join('\n');
}

function buildFunctionIndex() {
  const files = [
    path.join(diagRoot, 'SRC', 'DF_XY_A', 'DiagAppDidCallOut.c'),
    path.join(diagRoot, 'SRC', 'DF_XY_A', 'DiagAppIocIdCallOut.c'),
    path.join(diagRoot, 'SRC', 'DF_XY_A', 'DiagAppRidCallOut.c'),
    path.join(diagRoot, 'SRC', 'DF_XY_A', 'DiagAppSecurityAccess.c'),
    path.join(diagRoot, 'SRC', 'DiagAppDidCallOutCommon.c'),
    path.join(diagRoot, 'SRC', 'DiagAppIocIdCallOutCommon.c'),
    path.join(diagRoot, 'SRC', 'DiagAppRidCallOutCommon.c'),
    path.join(diagRoot, 'SRC', 'DiagMain.c'),
  ];
  const index = new Map();
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const rel = path.relative(chinaRoot, file).replace(/\\/g, '/');
    const lines = read(file).split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (line.trim().startsWith('*') || line.trim().startsWith('//')) continue;
      const m = line.match(/\b([A-Za-z_]\w*)\s*\([^;]*$/);
      if (!m) continue;
      const before = line.slice(0, m.index);
      if (!/(Std_ReturnType|FUNC\s*\()/.test(before)) continue;
      const name = m[1];
      const look = lines.slice(i, i + 5).join('\n');
      if (!look.includes('{')) continue;
      if (!index.has(name)) index.set(name, { file: rel, line: i + 1 });
    }
  }
  return index;
}

function parseSecurity(functionIndex) {
  return {
    levels: [{
      level: '0x01',
      name: 'DCM_SEC_LEV_L1',
      seedSize: 16,
      keySize: 16,
      delayTimeMs: 2000,
      delayOnBootMs: 2000,
      attemptsUntilDelay: 3,
      getSeed: { fn: 'SecurityGetSeedLev01', ref: functionIndex.get('SecurityGetSeedLev01') || null },
      compareKey: { fn: 'SecurityCompareKeyLev01', ref: functionIndex.get('SecurityCompareKeyLev01') || null },
      getAttempt: { fn: 'SecurityLev1_GetAttemptCount', ref: functionIndex.get('SecurityLev1_GetAttemptCount') || null },
      setAttempt: { fn: 'SecurityLev1_SetAttemptCount', ref: functionIndex.get('SecurityLev1_SetAttemptCount') || null },
      code: `0x27 L1\n  27 01 -> SecurityGetSeedLev01() // 16B seed\n  27 02 -> SecurityCompareKeyLev01() // 16B key\n  failed attempts -> SecurityLev1_GetAttemptCount/SetAttemptCount\n  delay: 2000 ms; attempts until delay: 3`,
    }],
    source: 'Dcm_SecurityAccess_Cfg.c',
    rawCheck: secCfg.includes('&SecurityGetSeedLev01') && secCfg.includes('&SecurityCompareKeyLev01'),
  };
}

function parseMemory() {
  return {
    read: [
      { memoryId: '0x00', ranges: ['0x00000000..0x000004AF'] },
      { memoryId: '0x01', ranges: ['CAL_BEGIN_ADDR..CAL_END_ADDR'] },
    ],
    write: [
      { memoryId: '0x00', ranges: ['0x00000040..0x0000007F', '0x00000084..0x00000092'] },
    ],
    code: `Dcm_MemoryIdInfoAndIdValueTable\n  memoryId 0: read 0x00000000..0x000004AF; write 0x40..0x7F, 0x84..0x92\n  memoryId 1: read CAL_BEGIN_ADDR..CAL_END_ADDR; no write range`,
  };
}

function buildSequences() {
  return [
    {
      title: '进入 SupplierSession',
      steps: ['10 03', '27 01', '27 02 <16B key>', '10 77'],
      why: '0x10 77 子服务要求 L1；0x27 服务不能在 DefaultSession 执行，所以先进入 Extended。',
    },
    {
      title: '写 Supplier 专属 DID',
      steps: ['10 03', '27 01', '27 02 <16B key>', '10 77', '2E <DID> <data>'],
      why: '0x2E 服务级要求 L1，多数 DFXY 写 DID 的对象级 Session 只允许 SupplierSession。',
    },
    {
      title: '执行大多数标定/测试 Routine',
      steps: ['10 03', '27 01', '27 02 <16B key>', '31 01 <RID>', '31 03 <RID>'],
      why: '多数 RID 对象级要求 L1，并允许 Extended/Supplier/RollerBench。',
    },
    {
      title: '刷写下载阶段',
      steps: ['10 03', '10 02', '27 01', '27 02 <16B key>', '34 ...', '36 ...', '37 ...'],
      why: '0x34/0x36/0x37 均要求 ProgrammingSession + L1。建议在 ProgrammingSession 内解锁。',
    },
    {
      title: '保持非默认会话',
      steps: ['10 03 或 10 77', '周期发送 3E 00'],
      why: '避免 S3 超时回 DefaultSession，导致依赖 Extended/Supplier/Programming 的服务失败。',
    },
  ];
}

const functionIndex = buildFunctionIndex();
const services = parseServices();
const data = {
  generatedFrom: 'DF_XY_A EB Dcm generated config + SourceCode/BSW/DIAG callouts',
  generatedAt: new Date().toISOString(),
  sources: {
    dcm: 'SourceCode/PLUGIN/AUTOSAR/AUTOCORE_TC387/generated/variant/Dcm/DF_XY_A',
    callouts: 'SourceCode/BSW/DIAG/SRC/DF_XY_A + common DIAG callouts',
  },
  sessions: [...sessionNames.entries()].map(([value, name]) => ({ id: hex(value), name })),
  services,
  dids: parseDids(services, functionIndex),
  routines: parseRoutines(services, functionIndex),
  security: parseSecurity(functionIndex),
  memory: parseMemory(),
  sequences: buildSequences(),
};

const output = `/* Auto-generated by _qa/build-dfxy-service-data.js. Do not edit by hand. */\nwindow.DFXY_SERVICE_DATA = ${JSON.stringify(data, null, 2)};\n`;
fs.writeFileSync(path.join(appRoot, 'services.js'), output, 'utf8');
console.log(`Generated services.js: ${data.services.length} services, ${data.dids.length} DIDs, ${data.routines.length} RIDs`);
