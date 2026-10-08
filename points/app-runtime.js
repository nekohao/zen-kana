/* Bounded requests and local recovery. No telemetry or private-data cache. */
(() => {
  "use strict";
  const REQUEST_MS = 15000;
  const pendingReads = new Map(), issues = new Map();
  let clientEpoch = 0, readEpoch = 0, recovery = null, recovering = false;
  const notice = window.PointsStartup;
  function updateNotice() {
    const message = issues.has("startup") ? "应用加载失败，请重新加载"
      : issues.has("fat") ? "减脂模块加载失败，请重新加载"
      : issues.has("rewards") ? "钻石商城加载失败，请重新加载"
      : issues.has("kitchen") ? "厨房模块加载失败，请重新加载"
      : issues.has("update") ? "新版本已准备好，请在操作完成后重新加载"
      : [...issues.values()].includes("uncertain") ? "操作结果待确认，请先核对历史记录"
      : issues.size ? "网络不稳定，部分数据尚未同步" : "";
    notice?.show(message, issues.has("startup") || issues.has("fat") || issues.has("rewards") || issues.has("kitchen") || issues.has("update"));
  }
  function report(key, uncertain = false) { issues.set(key, uncertain ? "uncertain" : true); updateNotice(); }
  function clear(key) { issues.delete(key); updateNotice(); }
  function timeoutError(write = false) {
    const error = new Error(write ? "Request timed out; result is unknown" : "Request timed out");
    error.code = write ? "APP_RESULT_UNKNOWN" : "APP_REQUEST_TIMEOUT";
    return error;
  }
  const unknownWrite = error => /^(APP_RESULT_UNKNOWN|APP_STALE_READ|08|PGRST00)/.test(error?.code || "")
    || /Failed to fetch|NetworkError|AbortError|Request timed out/i.test(error?.message || "");
  async function bounded(work, ms = REQUEST_MS, controller = new AbortController(), write = false) {
    let timer;
    try {
      return await Promise.race([
        Promise.resolve().then(() => work(controller.signal)),
        new Promise((_, reject) => { timer = setTimeout(() => {
          controller.abort(); reject(timeoutError(write));
        }, ms); })
      ]);
    } finally { clearTimeout(timer); }
  }
  // Keep the browser's auth locking; cap acquisition instead of bypassing it.
  async function fetchWithDeadline(input, init = {}) {
    const controller = new AbortController(), upstream = init.signal;
    const abort = () => controller.abort(upstream.reason);
    if (upstream?.aborted) abort(); else upstream?.addEventListener("abort", abort, {once:true});
    try { return await bounded(() => fetch(input, {...init, signal:controller.signal}), REQUEST_MS, controller); }
    finally { upstream?.removeEventListener("abort", abort); }
  }
  function protectClient(db) {
    const originalRpc = db.rpc.bind(db);
    let identity = null, identityKnown = false;
    db.auth.onAuthStateChange((_event, session) => {
      const next = session?.user?.id || null;
      if (identityKnown && next !== identity) { clientEpoch++; pendingReads.clear(); }
      identity = next; identityKnown = true;
    });
    db.rpc = (name, args = {}) => {
      const read = /^(points_get_|points_admin_get_|points_fat_get_|points_fat_admin_get_|points_shop_get_|points_fat_reward_get_|points_kitchen_get_)/.test(name) || name === "points_is_admin";
      const epoch = clientEpoch, revision = readEpoch;
      const key = `${epoch}:${revision}:${name}:${JSON.stringify(args)}`;
      if (read && pendingReads.has(key)) return pendingReads.get(key);
      if (!read) readEpoch++;
      const request = (async () => {
        const controller = new AbortController();
        try {
          const result = await bounded(signal => {
            let query = originalRpc(name, args);
            // Writes must never be replayed automatically after an uncertain response.
            if (typeof query.retry === "function") query = query.retry(false);
            if (typeof query.abortSignal === "function") query = query.abortSignal(signal);
            return query;
          }, REQUEST_MS, controller, !read);
          if (epoch !== clientEpoch || (read && revision !== readEpoch)) {
            return {data:null, error:{code:"APP_STALE_READ", message:"Superseded request"}};
          }
          if (!result?.error) clear(name);
          else if (!/^(22|23|42|40001|P000|PGRST20)/.test(result.error.code || "")) report(name, !read && unknownWrite(result.error));
          return result;
        } catch (error) {
          report(name, !read); return {data:null, error};
        } finally {
          if (!read) readEpoch++;
          if (pendingReads.get(key) === request) pendingReads.delete(key);
        }
      })();
      if (read) pendingReads.set(key, request);
      return request;
    };
    for (const name of ["getSession", "signInWithPassword", "signOut"]) {
      const original = db.auth[name]?.bind(db.auth);
      if (!original) continue;
      db.auth[name] = async (...args) => {
        try { const result = await bounded(() => original(...args));
          if (!result.error || result.error.status < 500) clear(`auth:${name}`); else report(`auth:${name}`);
          return result;
        } catch (error) { report(`auth:${name}`); return {data:{session:null}, error}; }
      };
    }
    return db;
  }
  async function retry() {
    if (recovering || !recovery) return;
    recovering = true;
    try { await recovery(); } catch (_) { report("recovery"); }
    finally { recovering = false; }
  }
  window.PointsRuntime = {
    bounded, fetchWithDeadline, protectClient, report, clear,
    unknownWrite,
    uncertainMessage: "结果尚未确认，请先同步并核对记录，避免重复提交",
    ready(fn) { recovery = fn; notice?.ready(retry); updateNotice(); }
  };
})();
