(() => {
      "use strict";

      // ============================================================
      // Supabase
      // Only the Publishable Key is present in frontend code.
      // All write authorization is enforced again inside PostgreSQL RPCs.
      // ============================================================
      const SUPABASE_URL = "https://zrzplqwauuruyssgcwqt.supabase.co";
      const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_YENvfSv64ZLopoXrXNNbqw_se6XJYs3";

      const runtime = window.PointsRuntime;
      const db = runtime.protectClient(window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            lockAcquireTimeout: 10000
          },
          global: {fetch: runtime.fetchWithDeadline}
        }
      ));

      const $ = (selector) => document.querySelector(selector);
      const $$ = (selector) => [...document.querySelectorAll(selector)];

      const els = {
        home: $(".home"),
        score: $("#scoreValue"),
        scoreRefreshBtn: $("#scoreRefreshBtn"),
        metricSwitch: $("#metricSwitch"),
        metricEyebrow: $("#metricEyebrow"),
        metricGhostValue: $("#metricGhostValue"),
        redeemRewardBtn: $("#redeemRewardBtn"),
        wheelStage: $("#wheelStage"),
        wheelDisk: $("#wheelDisk"),
        wheelActions: $("#wheelActions"),
        spinWheelActionBtn: $("#spinWheelActionBtn"),
        adjustWheelChancesBtn: $("#adjustWheelChancesBtn"),
        adjustWheelChancesMeta: $("#adjustWheelChancesMeta"),
        adminControls: $("#adminControls"),
        settingsBtn: $("#settingsBtn"),
        overviewBtn: $("#overviewBtn"),
        overview: $("#overview"),
        overviewBackdrop: $(".overview-backdrop"),
        overviewShell: $(".overview-shell"),
        overviewGrabberHitbox: $("#overviewGrabberHitbox"),
        overviewTitle: $("#overviewTitle"),
        overviewSubtitle: $("#overviewSubtitle"),
        overviewQuickNav: $("#overviewQuickNav"),
        overviewContentSwitch: $("#overviewContentSwitch"),
        scoreOverviewContent: $("#scoreOverviewContent"),
        wheelOverviewContent: $("#wheelOverviewContent"),
        wheelAssetsTitle: $("#wheelAssetsTitle"),
        wheelOverviewCash: $("#wheelOverviewCash"),
        wheelOverviewChance: $("#wheelOverviewChance"),
        wheelOverviewPending: $("#wheelOverviewPending"),
        wheelOverviewWon: $("#wheelOverviewWon"),
        wheelOverviewSettled: $("#wheelOverviewSettled"),
        withdrawalNotice: $("#withdrawalNotice"),
        withdrawalNoticeTitle: $("#withdrawalNoticeTitle"),
        withdrawalNoticeCopy: $("#withdrawalNoticeCopy"),
        pendingWithdrawalList: $("#pendingWithdrawalList"),
        wheelRecordList: $("#wheelRecordList"),
        wheelHistoryAdminHint: $("#wheelHistoryAdminHint"),
        withdrawWheelBtn: $("#withdrawWheelBtn"),
        scoreTrendSection: $("#scoreTrendSection"),
        scoreCalendarSection: $("#scoreCalendarSection"),

        settingsLayer: $("#settingsLayer"),
        settingsSheet: $("#settingsSheet"),
        settingsGrabberHitbox: $("#settingsGrabberHitbox"),
        guestAccountLabel: $("#guestAccountLabel"),
        guestSettings: $("#guestSettings"),
        adminSettings: $("#adminSettings"),
        loginStateText: $("#loginStateText"),
        openLoginBtn: $("#openLoginBtn"),
        logoutBtn: $("#logoutBtn"),
        openAdminInventoryBtn: $("#openAdminInventoryBtn"),
        adminInventorySettingsValue: $("#adminInventorySettingsValue"),
        adminInventoryLayer: $("#adminInventoryLayer"),
        adminInventoryList: $("#adminInventoryList"),
        adminInventoryCloseBtn: $("#adminInventoryCloseBtn"),
        adminInventoryAdjustLayer: $("#adminInventoryAdjustLayer"),
        adminInventoryAdjustIcon: $("#adminInventoryAdjustIcon"),
        adminInventoryAdjustTitle: $("#adminInventoryAdjustTitle"),
        adminInventoryAdjustMessage: $("#adminInventoryAdjustMessage"),
        adminInventoryAdjustValue: $("#adminInventoryAdjustValue"),
        adminInventoryMinusBtn: $("#adminInventoryMinusBtn"),
        adminInventoryPlusBtn: $("#adminInventoryPlusBtn"),
        adminInventoryAdjustConfirmBtn: $("#adminInventoryAdjustConfirmBtn"),
        adminInventoryAdjustCancelBtn: $("#adminInventoryAdjustCancelBtn"),
        openWheelProbabilityBtn: $("#openWheelProbabilityBtn"),
        openWheelProbabilityHistoryBtn: $("#openWheelProbabilityHistoryBtn"),
        wheelProbabilityLayer: $("#wheelProbabilityLayer"),
        wheelProbabilityGrid: $("#wheelProbabilityGrid"),
        wheelProbabilityBar: $("#wheelProbabilityBar"),
        wheelProbabilityBoundaries: $("#wheelProbabilityBoundaries"),
        wheelProbabilityLegend: $("#wheelProbabilityLegend"),
        wheelProbabilitySelectedName: $("#wheelProbabilitySelectedName"),
        wheelProbabilitySelectedValue: $("#wheelProbabilitySelectedValue"),
        wheelProbabilityBalanceHint: $("#wheelProbabilityBalanceHint"),
        wheelProbabilityMinusBtn: $("#wheelProbabilityMinusBtn"),
        wheelProbabilityPlusBtn: $("#wheelProbabilityPlusBtn"),
        wheelProbabilityTotal: $("#wheelProbabilityTotal"),
        saveWheelProbabilityBtn: $("#saveWheelProbabilityBtn"),
        resetWheelProbabilityDefaultBtn: $("#resetWheelProbabilityDefaultBtn"),
        closeWheelProbabilityBtn: $("#closeWheelProbabilityBtn"),
        wheelProbabilityHistoryLayer: $("#wheelProbabilityHistoryLayer"),
        wheelProbabilityHistoryList: $("#wheelProbabilityHistoryList"),
        closeWheelProbabilityHistoryBtn: $("#closeWheelProbabilityHistoryBtn"),
        lastRefreshText: $("#lastRefreshText"),
        openVersionInfoBtn: $("#openVersionInfoBtn"),
        versionInfoLayer: $("#versionInfoLayer"),
        closeVersionInfoBtn: $("#closeVersionInfoBtn"),
        openReleaseNotesBtn: $("#openReleaseNotesBtn"),
        releaseNotesLayer: $("#releaseNotesLayer"),
        closeReleaseNotesBtn: $("#closeReleaseNotesBtn"),

        loginLayer: $("#loginLayer"),
        loginSheet: $("#loginSheet"),
        loginGrabberHitbox: $("#loginGrabberHitbox"),
        emailInput: $("#emailInput"),
        passwordInput: $("#passwordInput"),
        cancelLoginBtn: $("#cancelLoginBtn"),
        loginBtn: $("#loginBtn"),

        changeLayer: $("#changeLayer"),
        changeIcon: $("#changeIcon"),
        changeTitle: $("#changeTitle"),
        changeSubtitle: $("#changeSubtitle"),
        changePreview: $("#changePreview"),
        changeAmountCaption: $("#changeAmountCaption"),
        changeAmountPickerBtn: $("#changeAmountPickerBtn"),
        changeAmountValue: $("#changeAmountValue"),
        changeAmountMenu: $("#changeAmountMenu"),
        reasonInput: $("#reasonInput"),
        cancelChangeBtn: $("#cancelChangeBtn"),
        confirmChangeBtn: $("#confirmChangeBtn"),

        redeemLayer: $("#redeemLayer"),
        redeemTitle: $("#redeemTitle"),
        shopBalanceValue: $("#shopBalanceValue"),
        shopBalanceHint: $("#shopBalanceHint"),
        shopDbNote: $("#shopDbNote"),
        shopTabs: $("#shopTabs"),
        shopInventoryBadge: $("#shopInventoryBadge"),
        shopProductsPanel: $("#shopProductsPanel"),
        shopInventoryPanel: $("#shopInventoryPanel"),
        shopFeatured: $("#shopFeatured"),
        shopGrid: $("#shopGrid"),
        shopActiveBuff: $("#shopActiveBuff"),
        shopInventoryList: $("#shopInventoryList"),
        shopInventoryEmpty: $("#shopInventoryEmpty"),
        shopItemLayer: $("#shopItemLayer"),
        shopItemCover: $("#shopItemCover"),
        shopItemTitle: $("#shopItemTitle"),
        shopItemDescription: $("#shopItemDescription"),
        shopItemMeta: $("#shopItemMeta"),
        shopItemPrice: $("#shopItemPrice"),
        shopItemConfirmBtn: $("#shopItemConfirmBtn"),
        cancelRedeemBtn: $("#cancelRedeemBtn"),
        shopWeeklyGiftLayer: $("#shopWeeklyGiftLayer"),
        shopWeeklyGiftConfirmBtn: $("#shopWeeklyGiftConfirmBtn"),
        shopWeeklyGiftCancelBtn: $("#shopWeeklyGiftCancelBtn"),
        shopMysteryOpenLayer: $("#shopMysteryOpenLayer"),
        shopMysteryOpenCover: $("#shopMysteryOpenCover"),
        shopMysteryOpenTitle: $("#shopMysteryOpenTitle"),
        shopMysteryOpenMessage: $("#shopMysteryOpenMessage"),
        shopMysteryOpenConfirmBtn: $("#shopMysteryOpenConfirmBtn"),
        shopMysteryOpenCancelBtn: $("#shopMysteryOpenCancelBtn"),
        adminGrantNoticeLayer: $("#adminGrantNoticeLayer"),
        adminGrantNoticeList: $("#adminGrantNoticeList"),
        adminGrantNoticeOpenBagBtn: $("#adminGrantNoticeOpenBagBtn"),
        adminGrantNoticeDoneBtn: $("#adminGrantNoticeDoneBtn"),
        shopRevealLayer: $("#shopRevealLayer"),
        shopRevealPrize: $("#shopRevealPrize"),
        shopRevealDoneBtn: $("#shopRevealDoneBtn"),
        wheelItemNotice: $("#wheelItemNotice"),
        wheelItemNoticeTitle: $("#wheelItemNoticeTitle"),
        wheelItemNoticeMeta: $("#wheelItemNoticeMeta"),
        wheelChallengeProgress: $("#wheelChallengeProgress"),
        wheelChallengeProgressText: $("#wheelChallengeProgressText"),
        wheelChallengeHitText: $("#wheelChallengeHitText"),
        wheelChallengeFoot: $("#wheelChallengeFoot"),
        wheelToolLayer: $("#wheelToolLayer"),
        wheelToolTitle: $("#wheelToolTitle"),
        wheelToolMessage: $("#wheelToolMessage"),
        wheelToolActiveBuff: $("#wheelToolActiveBuff"),
        wheelToolList: $("#wheelToolList"),
        wheelToolWarning: $("#wheelToolWarning"),
        wheelWishSelector: $("#wheelWishSelector"),
        wheelWishGrid: $("#wheelWishGrid"),
        wheelToolConfirmBtn: $("#wheelToolConfirmBtn"),
        wheelToolBareBtn: $("#wheelToolBareBtn"),
        wheelToolCancelBtn: $("#wheelToolCancelBtn"),
        wheelDecisionLayer: $("#wheelDecisionLayer"),
        wheelDecisionIcon: $("#wheelDecisionIcon"),
        wheelDecisionTitle: $("#wheelDecisionTitle"),
        wheelDecisionPrize: $("#wheelDecisionPrize"),
        wheelDecisionMessage: $("#wheelDecisionMessage"),
        wheelDecisionOdds: $("#wheelDecisionOdds"),
        wheelDecisionRiskBtn: $("#wheelDecisionRiskBtn"),
        wheelDecisionAcceptBtn: $("#wheelDecisionAcceptBtn"),

        wheelPreviewLayer: $("#wheelPreviewLayer"),
        wheelPreviewMessage: $("#wheelPreviewMessage"),
        wheelPreviewConfirmBtn: $("#wheelPreviewConfirmBtn"),
        wheelPreviewCancelBtn: $("#wheelPreviewCancelBtn"),
        wheelAdjustLayer: $("#wheelAdjustLayer"),
        wheelAdjustCurrent: $("#wheelAdjustCurrent"),
        wheelAdjustNext: $("#wheelAdjustNext"),
        wheelAdjustPreview: $("#wheelAdjustPreview"),
        wheelAdjustMinusBtn: $("#wheelAdjustMinusBtn"),
        wheelAdjustPlusBtn: $("#wheelAdjustPlusBtn"),
        wheelAdjustConfirmBtn: $("#wheelAdjustConfirmBtn"),
        wheelAdjustCancelBtn: $("#wheelAdjustCancelBtn"),
        wheelResultLayer: $("#wheelResultLayer"),
        wheelResultIcon: $("#wheelResultIcon"),
        wheelResultTitle: $("#wheelResultTitle"),
        wheelResultPrize: $("#wheelResultPrize"),
        wheelResultMessage: $("#wheelResultMessage"),
        wheelDoubleResult: $("#wheelDoubleResult"),
        wheelDoubleCardA: $("#wheelDoubleCardA"),
        wheelDoubleCardB: $("#wheelDoubleCardB"),
        wheelDoublePrizeA: $("#wheelDoublePrizeA"),
        wheelDoublePrizeB: $("#wheelDoublePrizeB"),
        wheelDoubleChoice: $("#wheelDoubleChoice"),
        wheelResultDoneBtn: $("#wheelResultDoneBtn"),
        wheelResultExtra: $("#wheelResultExtra"),
        wheelWithdrawLayer: $("#wheelWithdrawLayer"),
        wheelWithdrawMessage: $("#wheelWithdrawMessage"),
        wheelWithdrawAmount: $("#wheelWithdrawAmount"),
        wheelWithdrawAllBtn: $("#wheelWithdrawAllBtn"),
        wheelWithdrawConfirmBtn: $("#wheelWithdrawConfirmBtn"),
        wheelWithdrawCancelBtn: $("#wheelWithdrawCancelBtn"),
        settleWithdrawalLayer: $("#settleWithdrawalLayer"),
        settleWithdrawalMessage: $("#settleWithdrawalMessage"),
        settleWithdrawalConfirmBtn: $("#settleWithdrawalConfirmBtn"),
        settleWithdrawalCancelBtn: $("#settleWithdrawalCancelBtn"),

        trendSegments: $("#trendSegments"),
        trendMonthBtn: $("#trendMonthBtn"),
        trendMonthLabel: $("#trendMonthLabel"),
        trendMonthMenu: $("#trendMonthMenu"),
        trendCanvas: $("#trendCanvas"),
        chartEmpty: $("#chartEmpty"),
        chartCaption: $("#chartCaption"),

        calendarMonth: $("#calendarMonth"),
        calendarGrid: $("#calendarGrid"),
        prevMonthBtn: $("#prevMonthBtn"),
        nextMonthBtn: $("#nextMonthBtn"),
        dayDetail: $("#dayDetail"),
        dayDetailTitle: $("#dayDetailTitle"),
        dayDetailList: $("#dayDetailList"),

        toast: $("#toast")
      };

      const state = {
        score: null,
        wheelChances: 0,
        wheelCashBalance: 0,
        wheelUpdatedAt: null,
        wheelRotation: 0,
        wheelSpinning: false,
        wheelAdminConfig: null,
        wheelProbabilitySelectedAmount: 10,
        wheelProbabilityHistory: [],
        shopAvailable: null,
        shopView: "products",
        shopSelectedCode: null,
        shopMysteryOpenCode: null,
        shopInventory: { shield30:0, upgrade:0, double_pick:0, lucky100:0, restart:0, wish:0, triple_challenge:0, no10:0, return10:0, heartbeat:0, mystery_box:0, free_mystery_box:0 },
        shopWeekly: {},
        shopWeeklyFeature: null,
        adminInventory: {},
        adminInventorySelectedCode: null,
        adminInventoryOriginalQty: 0,
        adminInventoryDraftQty: 0,
        unseenAdminGrants: [],
        shopFeaturedIndex: 0,
        shopEquipped: null,
        shopEquippedParam: null,
        shopLuckyRemaining: 0,
        shopChallengeActive: false,
        shopChallengeSpinsDone: 0,
        shopChallengeHits: 0,
        shopPendingSpin: null,
        shopLoadedAt: 0,
        wheelToolPromptMode: null,
        wheelToolSelectedCode: null,
        wheelToolWishTarget: 100,
        wheelToolUsePotion: false,
        wheelToolUseChallenge: false,
        wheelVisualProbabilities: null,
        wheelVisualSegments: null,
        wheelVisualProfileKey: "base",
        wheelVisualRestorePending: false,
        updatedAt: null,
        session: null,
        isAdmin: false,
        activeMetric: "score",
        changeDelta: null,
        changeSign: 1,
        changeMagnitude: 1,
        wheelAdjustDelta: 1,
        pendingSettlementId: null,
        trendRange: "today",
        trendMonthWeek: Math.min(4, Math.floor((new Date().getDate() - 1) / 7) + 1),
        calendarDate: startOfMonth(new Date()),
        selectedDayKey: null,
        overviewLogs: [],
        wheelLogs: [],
        withdrawals: [],
        wheelTotals: null,
        overviewLoadedAt: 0,
        refreshInFlight: false,
        lastRefreshAt: null,
        overviewMode: "closed",
        overviewSection: null,
        toastTimer: null
      };

      // -------------------- Date helpers --------------------
      function startOfDay(d) {
        const x = new Date(d);
        x.setHours(0,0,0,0);
        return x;
      }

      function startOfMonth(d) {
        return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
      }

      function endOfMonthExclusive(d) {
        return new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0);
      }

      function startOfWeekMonday(d) {
        const x = startOfDay(d);
        const day = x.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        x.setDate(x.getDate() + diff);
        return x;
      }

      function addDays(d, n) {
        const x = new Date(d);
        x.setDate(x.getDate() + n);
        return x;
      }

      function addMonths(d, n) {
        return new Date(d.getFullYear(), d.getMonth() + n, 1);
      }

      function dateKey(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth()+1).padStart(2,"0");
        const day = String(d.getDate()).padStart(2,"0");
        return `${y}-${m}-${day}`;
      }

      function sameDay(a, b) {
        return a.getFullYear() === b.getFullYear()
          && a.getMonth() === b.getMonth()
          && a.getDate() === b.getDate();
      }

      function formatTime(iso) {
        if (!Number.isFinite(Date.parse(iso))) return "时间待同步";
        return new Intl.DateTimeFormat("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        }).format(new Date(iso));
      }

      function formatDateShort(iso) {
        if (!Number.isFinite(Date.parse(iso))) return "日期待同步";
        return new Intl.DateTimeFormat("zh-CN", {
          month: "numeric",
          day: "numeric"
        }).format(new Date(iso));
      }

      function formatMonth(d) {
        return new Intl.DateTimeFormat("zh-CN", {
          year: "numeric",
          month: "long"
        }).format(d);
      }

      function formatDayTitle(d) {
        return new Intl.DateTimeFormat("zh-CN", {
          month: "long",
          day: "numeric",
          weekday: "short"
        }).format(d);
      }

      function signed(n) {
        return n > 0 ? `+${n}` : String(n);
      }

      // -------------------- UI utilities --------------------
      function vibrate(ms = 8) {
        try { if ("vibrate" in navigator) navigator.vibrate(ms); } catch (_) {}
      }

      function showToast(message) {
        clearTimeout(state.toastTimer);
        els.toast.textContent = message;
        els.toast.classList.add("show");
        state.toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2200);
      }

      function fitSettingsSheet() {
        const sheet = els.settingsSheet;
        if (!sheet) return;
        const viewportHeight = Math.round(window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 0);
        const maxHeight = Math.max(250, Math.min(viewportHeight - 120, Math.round(viewportHeight * 0.72)));
        sheet.style.height = "auto";
        sheet.style.maxHeight = "none";
        sheet.style.overflowY = "visible";
        const naturalHeight = Math.ceil(sheet.scrollHeight);
        const targetHeight = Math.min(naturalHeight, maxHeight);
        sheet.style.height = `${targetHeight}px`;
        sheet.style.maxHeight = `${maxHeight}px`;
        sheet.style.overflowY = naturalHeight > maxHeight ? "auto" : "hidden";
      }

      let settingsFitRaf = 0;
      function queueSettingsFit() {
        cancelAnimationFrame(settingsFitRaf);
        settingsFitRaf = requestAnimationFrame(() => {
          settingsFitRaf = 0;
          fitSettingsSheet();
        });
      }

      function setLayer(layer, open) {
        if (!layer) return;
        layer.classList.toggle("open", open);
        layer.setAttribute("aria-hidden", String(!open));
        if (open && layer === els.settingsLayer) queueSettingsFit();
      }

      function closeAllLayers() {
        [
          document.getElementById('pointsMessagesLayer'), els.settingsLayer, els.versionInfoLayer, els.releaseNotesLayer, els.loginLayer,
          els.changeLayer, els.redeemLayer, els.shopItemLayer, els.shopRevealLayer, els.wheelToolLayer, els.wheelDecisionLayer, els.wheelPreviewLayer, els.wheelResultLayer,
          els.wheelWithdrawLayer, els.settleWithdrawalLayer,
          els.wheelProbabilityLayer, els.wheelProbabilityHistoryLayer
        ].filter(Boolean).forEach(layer => setLayer(layer, false));
      }

      function setBusy(el, busy) {
        if (!el) return;
        el.classList.toggle("busy", busy);
        el.disabled = busy;
      }

      function escapeHTML(value) {
        return String(value ?? "")
          .replaceAll("&","&amp;")
          .replaceAll("<","&lt;")
          .replaceAll(">","&gt;")
          .replaceAll('"',"&quot;")
          .replaceAll("'","&#039;");
      }

      function renderAdminState() {
        els.home?.classList.toggle("admin-mode", state.isAdmin);
        els.adminControls.classList.toggle("hidden", !state.isAdmin);
        els.adminControls.setAttribute("aria-hidden", String(!state.isAdmin));
        els.guestAccountLabel.hidden = state.isAdmin;
        els.guestSettings.hidden = state.isAdmin;
        els.adminSettings.hidden = !state.isAdmin;
        els.adminSettings.inert = !state.isAdmin;
        els.adminSettings.setAttribute("aria-hidden", String(!state.isAdmin));

        if (!state.isAdmin) {
          if (els.wheelProbabilityLayer.classList.contains("open")) setLayer(els.wheelProbabilityLayer, false);
          if (els.wheelProbabilityHistoryLayer.classList.contains("open")) setLayer(els.wheelProbabilityHistoryLayer, false);
          if (els.settleWithdrawalLayer.classList.contains("open")) setLayer(els.settleWithdrawalLayer, false);
          if (els.wheelAdjustLayer.classList.contains("open")) setLayer(els.wheelAdjustLayer, false);
        }

        if (state.isAdmin) {
          if (els.redeemLayer?.classList.contains("open")) setLayer(els.redeemLayer, false);
          if (els.shopItemLayer?.classList.contains("open")) setLayer(els.shopItemLayer, false);
          if (els.shopRevealLayer?.classList.contains("open")) setLayer(els.shopRevealLayer, false);
          if (els.wheelToolLayer?.classList.contains("open")) setLayer(els.wheelToolLayer, false);
          if (els.wheelDecisionLayer?.classList.contains("open")) setLayer(els.wheelDecisionLayer, false);
          const email = state.session?.user?.email || "管理员";
          els.loginStateText.textContent = `管理员 · ${email}`;
          els.spinWheelActionBtn.querySelector("strong").textContent = "试玩";
          els.spinWheelActionBtn.querySelector("small").textContent = "不消耗机会";
          els.adjustWheelChancesBtn.hidden = false;
          els.adjustWheelChancesMeta.textContent = `当前 ${Math.max(0, Number(state.wheelChances ?? 0))} 次`;
          els.wheelActions.classList.add("admin-wheel-actions");
        } else {
          els.loginStateText.textContent = "访客模式";
          els.spinWheelActionBtn.querySelector("strong").textContent = "转动大转盘";
          els.spinWheelActionBtn.querySelector("small").textContent = "开始";
          els.adjustWheelChancesBtn.hidden = true;
          els.wheelActions.classList.remove("admin-wheel-actions");
        }

        renderPrimaryMetric();
        if (state.isAdmin) void loadAdminInventory({silent:true});
        if (state.overviewMode !== "closed") renderWheelOverview();
        if (els.settingsLayer.classList.contains("open")) queueSettingsFit();
      }

      if (!["score", "wheel"].includes(state.activeMetric)) state.activeMetric = "score";

      function activeMetricValue() {
        return state.activeMetric === "score" ? state.score : null;
      }

      function renderMetricSwitch() {
        const wheel = state.activeMetric === "wheel";
        els.metricSwitch.classList.remove("gift-active");
        els.home?.classList.remove("gift-active");
        els.metricSwitch.classList.toggle("wheel-active", wheel);
        els.home?.classList.toggle("wheel-active", wheel);

        els.metricSwitch.querySelectorAll("[data-metric]").forEach(btn => {
          const active = btn.dataset.metric === state.activeMetric;
          btn.classList.toggle("active", active);
          btn.setAttribute("aria-selected", String(active));
        });

        els.scoreRefreshBtn.setAttribute("aria-label", wheel ? "手动同步最新大转盘数据" : "手动刷新最新数据");

        const primary = document.createElement("span");
        const secondary = document.createElement("span");
        primary.className = "reward-line-primary";
        secondary.className = "reward-line-secondary";

        if (wheel) {
          const chances = Math.max(0, Number(state.wheelChances ?? 0));
          const cash = Math.max(0, Number(state.wheelCashBalance ?? 0));
          if (state.isAdmin) {
            primary.textContent = `₊˚🎠 游客的大转盘资产 ♡ 正式机会 ${chances} 次`;
            secondary.textContent = `可提现余额 ¥${cash} · 管理员可试玩或调整正式机会 ✨`;
          } else {
            primary.textContent = chances > 0
              ? `₊˚🎠 幸运大转盘准备好啦 ♡ 还有 ${chances} 次正式机会`
              : "₊˚🎠 幸运大转盘在等宝宝来转一转 ♡";
            secondary.textContent = chances > 0
              ? `当前可提现余额 ¥${cash} · 也可以去积分商城挑选幸运道具 ✨`
              : `当前可提现余额 ¥${cash} · 没有正式机会也可以先试玩哦 ♡`;
          }
          els.wheelActions.setAttribute("aria-hidden", "false");
        } else {
          const score = Number(state.score ?? 0);
          const redeemable = Math.max(0, Math.floor(score / 10));
          primary.textContent = state.isAdmin
            ? `₊˚🧁 游客当前 ${score} 分 ♡`
            : `₊˚🧁 现在已经 ${score} 分了哦 ♡`;
          secondary.textContent = redeemable > 0
            ? `积分商城已开放 · 当前积分足够兑换 ${redeemable} 份基础奖励 ✦`
            : `积分商城有 2 分起的小道具 · 慢慢攒也可以换幸运 ✦`;
          els.wheelActions.setAttribute("aria-hidden", "true");
        }

        els.metricEyebrow.replaceChildren(primary, secondary);
        els.metricEyebrow.hidden = false;
      }

      function renderPrimaryMetric({ animate = false } = {}) {
        renderMetricSwitch();
        renderWheelItemNotice();
        if (state.activeMetric === "wheel") {
          els.score.classList.remove("loading");
          return;
        }
        const value = activeMetricValue();
        if (typeof value !== "number") return;
        els.score.textContent = value;
        els.score.classList.remove("loading");
        if (animate) {
          els.score.classList.remove("metric-changing", "score-pop");
          void els.score.offsetWidth;
          els.score.classList.add("metric-changing");
        }
      }


      let metricSwitchTimer = 0;
      let metricSwitchInTimer = 0;
      let metricSwitchToken = 0;

      function previewMetricSwitch(nextMetric) {
        const wheel = nextMetric === "wheel";
        els.metricSwitch.classList.remove("gift-active");
        els.metricSwitch.classList.toggle("wheel-active", wheel);
        els.metricSwitch.querySelectorAll("[data-metric]").forEach(btn => {
          const active = btn.dataset.metric === nextMetric;
          btn.classList.toggle("active", active);
          btn.setAttribute("aria-selected", String(active));
        });
      }

      function switchMetric(nextMetric) {
        if (!["score", "wheel"].includes(nextMetric)) return;
        if (nextMetric === state.activeMetric && !els.home?.classList.contains("metric-fading-out")) return;
        if (state.wheelSpinning || state.wheelRequestInFlight) {
          showToast("🎠 转盘还在转呀，等它停稳一下 ♡");
          return;
        }

        const token = ++metricSwitchToken;
        clearTimeout(metricSwitchTimer);
        clearTimeout(metricSwitchInTimer);
        const home = els.home;
        home?.classList.remove("metric-switching", "metric-to-score", "metric-fading-in", "metric-fading-out");
        previewMetricSwitch(nextMetric);
        void home?.offsetWidth;
        home?.classList.add("metric-fading-out");

        metricSwitchTimer = window.setTimeout(() => {
          if (token !== metricSwitchToken) return;
          state.activeMetric = nextMetric;
          renderPrimaryMetric({ animate: false });
          renderOverviewContentMode();
          home?.classList.remove("metric-fading-out");
          void home?.offsetWidth;
          home?.classList.add("metric-fading-in");
          metricSwitchInTimer = window.setTimeout(() => {
            if (token !== metricSwitchToken) return;
            home?.classList.remove("metric-fading-in");
          }, 300);
        }, 155);
      }


      function renderOverviewSectionMode() {
        if (state.activeMetric !== "score") return;
        const selected = state.overviewSection;
        els.overviewQuickNav.closest(".overview-landing").hidden = !!selected;
        els.overviewContentSwitch.hidden = !selected;
        els.scoreTrendSection.hidden = selected !== "trend";
        els.scoreCalendarSection.hidden = selected !== "calendar";
        els.overviewContentSwitch.querySelectorAll("[data-overview-section]").forEach(btn => {
          const active = btn.dataset.overviewSection === selected;
          btn.classList.toggle("active", active);
          btn.setAttribute("aria-selected", String(active));
        });
        if (selected === "trend") requestAnimationFrame(() => drawTrend(buildTrendPoints(state.trendRange)));
        else if (selected === "calendar") renderCalendar();
      }

      function renderOverviewContentMode() {
        const wheel = state.activeMetric === "wheel";
        els.overview.classList.remove("gift-mode");
        els.overview.classList.toggle("wheel-mode", wheel);
        els.scoreOverviewContent.hidden = wheel;
        els.wheelOverviewContent.hidden = !wheel;
        els.overviewTitle.textContent = wheel
          ? (state.isAdmin ? "游客 · 大转盘资产" : "幸运大转盘")
          : "总览";
        els.overviewSubtitle.textContent = wheel
          ? (state.isAdmin ? "查看游客资产、提现待办与奖励历史" : "查看奖金、提现状态与每一次幸运记录")
          : "查看趋势与日历";
        if (wheel) renderWheelOverview();
        else renderOverviewSectionMode();
      }

      function markRefreshed() {
        state.lastRefreshAt = new Date();
        if (els.lastRefreshText) {
          els.lastRefreshText.textContent = new Intl.DateTimeFormat("zh-CN", {
            hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
          }).format(state.lastRefreshAt);
        }
      }

      // -------------------- Supabase read/auth --------------------
      let appReadPromise = null;
      async function loadAppState({ silent = false } = {}) {
        if (appReadPromise) return appReadPromise;
        state.refreshInFlight = true;
        appReadPromise = (async () => {
        try {
          const [scoreRes, wheelRes] = await Promise.all([
            db.rpc("points_get_state"),
            db.rpc("points_get_wheel_state")
          ]);
          const row = Array.isArray(scoreRes.data) ? scoreRes.data[0] : scoreRes.data;
          const wheelRow = Array.isArray(wheelRes.data) ? wheelRes.data[0] : wheelRes.data;
          if (!scoreRes.error && row && Number.isFinite(row.score)) {
          state.score = Number(row.score);
          state.updatedAt = row.updated_at ?? null;
          }
          if (!wheelRes.error && wheelRow) {
          state.wheelChances = Number(wheelRow?.spin_chances ?? 0);
          state.wheelCashBalance = Number(wheelRow?.cash_balance ?? 0);
          state.wheelUpdatedAt = wheelRow?.updated_at ?? null;
          }
          if (els.adjustWheelChancesMeta) els.adjustWheelChancesMeta.textContent = `当前 ${Math.max(0, state.wheelChances)} 次`;
          renderPrimaryMetric();
          if (scoreRes.error) throw scoreRes.error;
          if (wheelRes.error) throw wheelRes.error;
          if (!row || !Number.isFinite(row.score)) throw new Error("未读取到积分数据");
          markRefreshed();
          return true;
        } catch (err) {
          console.error("loadAppState:", err);
          if (!silent) showToast("读取数据失败");
          return false;
        } finally {
          state.refreshInFlight = false;
          appReadPromise = null;
        }
        })();
        return appReadPromise;
      }

      let authReadVersion = 0;
      async function refreshAuthState() {
        const version = ++authReadVersion;
        try {
          const { data, error } = await db.auth.getSession();
          if (version !== authReadVersion) return;
          if (error) throw error;
          let nextAdmin = false;
          if (data.session) {
            const { data: adminData, error: adminError } = await db.rpc("points_is_admin");
            if (version !== authReadVersion) return;
            if (adminError) throw adminError;
            nextAdmin = adminData === true;
          }
          state.session = data.session;
          state.isAdmin = nextAdmin;
          runtime.clear("auth:restore");
          renderAdminState();
          if (state.overviewMode !== "closed") await loadOverviewData(true);
        } catch (err) {
          if (version !== authReadVersion) return;
          console.error("refreshAuthState:", err);
          if (runtime.unknownWrite(err) || /^5/.test(String(err?.status || ""))) {
            runtime.report("auth:restore");
            return;
          }
          state.session = null;
          state.isAdmin = false;
          renderAdminState();
        }
      }

      async function login() {
        const email = els.emailInput.value.trim();
        const password = els.passwordInput.value;
        if (!email || !password) return showToast("请输入邮箱和密码");
        setBusy(els.loginBtn, true);
        try {
          const { data, error } = await db.auth.signInWithPassword({ email, password });
          if (error) throw error;
          state.session = data.session;
          const { data: adminData, error: adminError } = await db.rpc("points_is_admin");
          if (adminError) throw adminError;
          if (adminData !== true) {
            await db.auth.signOut();
            throw new Error("此账号不是管理员");
          }
          state.isAdmin = true;
          els.passwordInput.value = "";
          setLayer(els.loginLayer, false);
          renderAdminState();
          vibrate(12);
          showToast("管理员已登录");
        } catch (err) {
          console.error("login:", err);
          state.session = null;
          state.isAdmin = false;
          renderAdminState();
          showToast(err?.message === "此账号不是管理员" ? err.message : "登录失败，请检查账号密码");
        } finally {
          setBusy(els.loginBtn, false);
        }
      }

      async function logout() {
        try {
          const { error } = await db.auth.signOut();
          if (error) throw error;
          state.session = null;
          state.isAdmin = false;
          setLayer(els.settingsLayer, false);
          renderAdminState();
          if (state.overviewMode !== "closed") await loadOverviewData(true);
          showToast("已退出管理员");
        } catch (err) {
          console.error("logout:", err);
          showToast("退出失败");
        }
      }

      function closeChangeAmountMenu() {
        els.changeAmountMenu.hidden = true;
        els.changeAmountPickerBtn.setAttribute("aria-expanded", "false");
      }

      function renderChangeAmount() {
        const magnitude = Math.min(9, Math.max(1, Number(state.changeMagnitude || 1)));
        const sign = Number(state.changeSign) < 0 ? -1 : 1;
        const delta = sign * magnitude;
        state.changeMagnitude = magnitude;
        state.changeDelta = delta;
        const current = Number(state.score ?? 0);
        els.changeAmountCaption.textContent = sign > 0 ? "增加分数" : "减少分数";
        els.changeAmountValue.textContent = String(magnitude);
        els.changeTitle.textContent = sign > 0 ? "增加积分" : "减少积分";
        els.changeIcon.textContent = sign > 0 ? "✨" : "🌙";
        els.changePreview.textContent = `当前 ${current} 分  →  ${current + delta} 分`;
        els.confirmChangeBtn.textContent = `确认 ${delta > 0 ? "+" : "−"}${magnitude}`;
        els.changeAmountMenu.querySelectorAll("[data-change-amount]").forEach(btn => {
          const selected = Number(btn.dataset.changeAmount) === magnitude;
          btn.classList.toggle("selected", selected);
          btn.setAttribute("aria-selected", String(selected));
        });
      }

      function openWheelAdjustPrompt() {
        if (!state.isAdmin) return showToast("需要管理员权限");
        state.wheelAdjustDelta = 1;
        renderWheelAdjustPrompt();
        setLayer(els.wheelAdjustLayer, true);
        vibrate(8);
      }

      function renderWheelAdjustPrompt() {
        const current = Math.max(0, Number(state.wheelChances ?? 0));
        if (current <= 0 && Number(state.wheelAdjustDelta) < 0) state.wheelAdjustDelta = 1;
        const delta = Number(state.wheelAdjustDelta) < 0 ? -1 : 1;
        const next = Math.max(0, current + delta);
        els.wheelAdjustCurrent.textContent = `${current}`;
        if (els.wheelAdjustNext) els.wheelAdjustNext.textContent = `${next} 次`;
        els.wheelAdjustPreview.textContent = `${current} 次  →  ${next} 次`;
        els.wheelAdjustMinusBtn.disabled = current <= 0;
        els.wheelAdjustMinusBtn.classList.toggle("selected", delta < 0);
        els.wheelAdjustPlusBtn.classList.toggle("selected", delta > 0);
        els.wheelAdjustConfirmBtn.textContent = `确认调整 · ${delta > 0 ? "+1" : "−1"}`;
      }

      async function confirmWheelAdjust() {
        if (!state.isAdmin) return;
        const delta = Number(state.wheelAdjustDelta) < 0 ? -1 : 1;
        if (delta < 0 && Number(state.wheelChances ?? 0) <= 0) return showToast("正式机会已经是 0 次");
        setBusy(els.wheelAdjustConfirmBtn, true);
        try {
          const { data, error } = await db.rpc("points_admin_adjust_wheel_chances", { p_delta: delta });
          if (error) throw error;
          const row = Array.isArray(data) ? data[0] : data;
          state.wheelChances = Math.max(0, Number(row?.spin_chances ?? state.wheelChances));
          state.wheelCashBalance = Math.max(0, Number(row?.cash_balance ?? state.wheelCashBalance));
          state.wheelUpdatedAt = row?.updated_at ?? state.wheelUpdatedAt;
          setLayer(els.wheelAdjustLayer, false);
          state.overviewLoadedAt = 0;
          renderPrimaryMetric();
          renderAdminState();
          vibrate(14);
          showToast(delta > 0 ? "🎟️ 已增加 1 次正式机会" : "🎟️ 已减少 1 次正式机会");
          if (state.overviewMode !== "closed") await loadOverviewData(true);
        } catch (err) {
          if (runtime.unknownWrite(err)) { showToast(runtime.uncertainMessage); return; }
          console.error("confirmWheelAdjust:", err);
          const message = String(err?.message || "");
          if (/negative/i.test(message)) showToast("正式机会最低为 0 次");
          else if (/permission|admin/i.test(message)) showToast("管理员权限已失效");
          else if (/PGRST202|Could not find|points_admin_adjust_wheel_chances/i.test(message)) showToast("请先运行 v4 数据库迁移 SQL");
          else showToast("调整次数失败");
        } finally {
          setBusy(els.wheelAdjustConfirmBtn, false);
        }
      }

      // -------------------- Score writes / direct reward redemption --------------------
      function openChange(sign) {
        if (!state.isAdmin) return showToast("需要管理员权限");
        state.changeSign = Number(sign) < 0 ? -1 : 1;
        state.changeMagnitude = 1;
        els.changeLayer.dataset.theme = "score";
        els.changeSubtitle.textContent = "管理员操作 · 会立即写入积分历史";
        els.reasonInput.placeholder = "写下这次积分变化的原因 ♡（可留空）";
        els.reasonInput.value = "";
        closeChangeAmountMenu();
        renderChangeAmount();
        setLayer(els.changeLayer, true);
      }

      async function confirmChange() {
        const delta = Number(state.changeDelta);
        if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 9) return;
        setBusy(els.confirmChangeBtn, true);
        try {
          const reason = els.reasonInput.value.trim();
          const { data, error } = await db.rpc("points_change_score", {
            p_delta: delta,
            p_reason: reason === "" ? null : reason
          });
          if (error) throw error;
          const row = Array.isArray(data) ? data[0] : data;
          if (row && typeof row.score === "number") {
            state.score = Number(row.score);
            state.updatedAt = row.updated_at;
          } else {
            await loadAppState({ silent: true });
          }
          renderPrimaryMetric({ animate: true });
          markRefreshed();
          setLayer(els.changeLayer, false);
          closeChangeAmountMenu();
          state.overviewLoadedAt = 0;
          vibrate(14);
          showToast(delta > 0 ? `已增加 ${delta} 分` : `已减少 ${Math.abs(delta)} 分`);
          if (state.overviewMode !== "closed") await loadOverviewData(true);
        } catch (err) {
          if (runtime.unknownWrite(err)) { showToast(runtime.uncertainMessage); return; }
          console.error("confirmChange:", err);
          const message = String(err?.message || "");
          if (/permission|admin/i.test(message)) {
            await refreshAuthState();
            showToast("管理员权限已失效");
          } else if (/delta|between -9|PGRST202|Could not find/i.test(message)) {
            showToast("请先运行 v4 数据库迁移 SQL");
          } else showToast("积分修改失败");
        } finally {
          setBusy(els.confirmChangeBtn, false);
        }
      }

      const SHOP_ITEMS = {
        wheel_ticket: {
          code:"wheel_ticket", name:"正式转盘券", coverWord:"SPIN PASS", price:10, theme:"wheel",
          desc:"+1 次正式大转盘机会，正式中奖会进入可提现余额。", detail:"兑换后立即增加 1 次正式大转盘机会，不进入道具库存。", weeklyLimit:0, immediate:true
        },
        cash_box: {
          code:"cash_box", name:"30元小金库", coverWord:"CASH BOX", price:10, theme:"cash",
          desc:"直接获得 ¥30 可提现余额。", detail:"兑换后 ¥30 会立即进入可提现余额，不需要经过转盘。", weeklyLimit:0, immediate:true
        },
        shield30: {
          code:"shield30", name:"小幸运护盾", coverWord:"SAFE 30", price:3, theme:"shield",
          desc:"下一次正式抽奖最低 ¥30。", detail:"抽奖前选择使用。若本次原结果低于 ¥30，会自动提升到 ¥30；正式抽奖完成后消耗 1 个。", weeklyLimit:2
        },
        upgrade: {
          code:"upgrade", name:"奖励升级卡", coverWord:"LEVEL UP", price:3, theme:"upgrade",
          desc:"下一抽低档奖励自动升一档。", detail:"抽奖前选择使用：¥10→¥20、¥20→¥30、¥30→¥50；¥50 及以上保持原样。", weeklyLimit:1
        },
        double_pick: {
          code:"double_pick", name:"命运二选一", coverWord:"DOUBLE PICK", price:3, theme:"double",
          desc:"一次机会出现两个结果，自动留下更高的那个。", detail:"只扣 1 次正式机会，同时生成 A / B 两个结果并全部展示，最终只结算更高奖励。", weeklyLimit:1
        },
        lucky100: {
          code:"lucky100", name:"百元幸运药水", coverWord:"LUCKY +2%", price:2, theme:"potion",
          desc:"开启后连续 5 抽，¥100 概率 +2%。", detail:"从本次起连续 5 次正式抽奖把 ¥100 概率提高 2 个百分点，并从 ¥10 档转移同等概率。它属于持续层，可与 1 个普通单次道具叠加，但不能与十元退散同时生效。", weeklyLimit:1
        },
        restart: {
          code:"restart", name:"命运重启卡", coverWord:"REWRITE", price:3, theme:"restart",
          desc:"抽到 ¥10 / ¥20 / ¥30 时，可以决定是否重抽。", detail:"抽奖前选择使用。第一抽若为 ¥10、¥20 或 ¥30，系统会询问“稳稳收下”还是“重新抽一次”；若选择重抽，第二个结果必须接受，不能反悔。第一抽若 ≥¥50 则直接结算。", weeklyLimit:2
        },
        wish: {
          code:"wish", name:"许愿卡", coverWord:"MAKE A WISH", price:1, theme:"wish",
          desc:"指定一个奖项，正好命中时额外奖励该金额的 50%。", detail:"抽奖前先选择 ¥10 / ¥20 / ¥30 / ¥50 / ¥60 / ¥80 / ¥100 中的一个愿望。只有转盘正好落在许愿金额时才触发，额外奖励该金额的 50%。概率本身不会被改变。", weeklyLimit:2
        },
        triple_challenge: {
          code:"triple_challenge", name:"三连挑战卡", coverWord:"3 SPINS", price:2, theme:"challenge",
          desc:"接下来 3 抽至少 2 次达到 ¥50，额外 +¥20。", detail:"开启后会在大转盘首页持续显示进度。连续计算接下来 3 次正式抽奖的最终结算金额，其中至少 2 次达到 ¥50 即挑战成功并额外获得 ¥20。挑战属于任务层，可以和药水及 1 个单次道具同时存在。", weeklyLimit:1
        },
        no10: {
          code:"no10", name:"十元退散卡", coverWord:"NO ¥10", price:1, theme:"no10",
          desc:"下一抽移除最多 10% 的 ¥10 概率。", detail:"抽奖前选择使用。会把 ¥10 档最多 10 个百分点的概率按比例分给其它奖励；转盘会在抽奖前平滑缩小 ¥10 扇区。由于它和百元幸运药水都会直接改概率，两者不能同时使用。", weeklyLimit:2
        },
        return10: {
          code:"return10", name:"幸运返场卡", coverWord:"ONE MORE", price:1, theme:"return",
          desc:"下一抽若中 ¥10，¥10 照拿并返还 1 次正式机会。", detail:"抽奖前选择使用。无论结果如何都会消耗这张卡；如果本次正好抽到 ¥10，奖金照常进入小金库，同时正式机会返还 1 次。返还后的下一抽不会继续继承本卡。", weeklyLimit:2
        },
        heartbeat: {
          code:"heartbeat", name:"心跳翻倍卡", coverWord:"HEART BEAT", price:2, theme:"heartbeat",
          desc:"未使用其它单次卡且抽到 ≤¥30 时，自动询问要不要搏一把。", detail:"无需抽奖前手动选择。只要本次没有使用其它单次道具，且最终初始落点为 ¥10 / ¥20 / ¥30，系统会自动询问是否使用。选择心跳一搏后：50% 奖励翻倍，50% 奖励减半；只有真的选择搏一把才消耗卡。", weeklyLimit:2, reactive:true
        },
        mystery_box: {
          code:"mystery_box", name:"幸运盲盒", coverWord:"MYSTERY", price:2, theme:"mystery",
          desc:"2 分开启常规奖励池，正式转盘券是 1% 超稀有掉落。", detail:"商城兑换后会立即开启；每周最多兑换 5 次。管理员发放到背包里的常规盲盒则需要手动打开。¥30 小金库不会出现在盲盒中；正式转盘券以 1% 的超低概率出现，其余普通道具会直接进入“我的道具”。", weeklyLimit:5, instantOpen:true
        },
        free_mystery_box: {
          code:"free_mystery_box", name:"免费幸运盲盒", coverWord:"WEEKLY GIFT", price:0, theme:"mystery", purchasable:false,
          desc:"免费奖励池盲盒 · 弱道具权重更高，正式转盘券仍为 1%。", detail:"用于每周免费福利或管理员发放。进入背包后需要手动打开；开奖使用免费池：弱道具权重更高，但仍保留 1% 正式转盘券彩蛋。", weeklyLimit:0
        }
      };

      const SHOP_INVENTORY_CODES = ["shield30","upgrade","double_pick","lucky100","restart","wish","triple_challenge","no10","return10","heartbeat","mystery_box","free_mystery_box"];
      const SHOP_ONE_SHOT_CODES = ["shield30","upgrade","double_pick","restart","wish","no10","return10"];
      const SHOP_WHEEL_TOOL_CODES = [...SHOP_ONE_SHOT_CODES,"lucky100","triple_challenge","heartbeat"];
      const SHOP_FEATURE_ELIGIBLE_CODES = ["mystery_box"];

      function shopIconSVG(code) {
        const attrs = `fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.45" viewBox="0 0 64 64"`;
        const icons = {
          wheel_ticket: `<svg ${attrs}><path d="M12 18.5h40v9.3c-3.8.6-6.2 3-6.2 6.2s2.4 5.6 6.2 6.2v9.3H12v-9.3c3.8-.6 6.2-3 6.2-6.2s-2.4-5.6-6.2-6.2v-9.3Z"/><path d="M34 18.5v31" stroke-dasharray="2.6 4.2" opacity=".48"/><circle cx="26" cy="34" r="6.4"/><path d="m22.9 34.1 2 2 4.4-5"/></svg>`,
          cash_box: `<svg ${attrs}><rect x="12.5" y="20" width="39" height="28.5" rx="8"/><path d="M12.5 28.5h39" opacity=".55"/><path d="M39.5 34.6H52v9.1H39.5a4.55 4.55 0 1 1 0-9.1Z"/><circle cx="41.5" cy="39.15" r="1.4" fill="currentColor" stroke="none"/><path d="M22 20c1.1-5.4 4.6-8.2 10-8.2S40.9 14.6 42 20"/></svg>`,
          shield30: `<svg ${attrs}><path d="M32 8.5c6 4 11.2 5.5 17.4 7.3v13.1c0 12.3-6.9 21.2-17.4 26.5-10.5-5.3-17.4-14.2-17.4-26.5V15.8C20.8 14 26 12.5 32 8.5Z"/><path d="M21.8 27.7c2.7-5.4 6.1-8.1 10.2-8.1s7.5 2.7 10.2 8.1c-1.5 6.9-4.9 12-10.2 15.3-5.3-3.3-8.7-8.4-10.2-15.3Z" opacity=".22"/><path d="M24.5 34.2h15"/><path d="M27 29.5h10" opacity=".58"/><circle cx="32" cy="34.2" r="2.1" fill="currentColor" stroke="none"/></svg>`,
          upgrade: `<svg ${attrs}><path d="M14 45.5h13.5V34H39V22.5h11" opacity=".33"/><path d="M17 42.5h8V31h11.5V19.5H48"/><path d="m41.5 13 6.5 6.5-6.5 6.5"/><path d="M15 20.5h9M19.5 16v9" opacity=".5"/><circle cx="17" cy="43" r="4.7" opacity=".3"/><circle cx="35.5" cy="29.5" r="4.7" opacity=".48"/><circle cx="48" cy="19.5" r="5.2"/></svg>`,
          double_pick: `<svg ${attrs}><g transform="rotate(-6 23 33)"><rect x="10.5" y="17" width="27" height="32" rx="9"/><path d="M17 25.5h13M17 31h9" opacity=".34"/><circle cx="24" cy="40" r="4.2" opacity=".42"/></g><g transform="rotate(6 42 32)"><rect x="27.5" y="15.5" width="27" height="33" rx="9"/><path d="M34.5 24h12M34.5 29.5h8" opacity=".3"/><path d="m42 35 2 4.1 4.6.7-3.3 3.2.8 4.5-4.1-2.2-4.1 2.2.8-4.5-3.3-3.2 4.6-.7 2-4.1Z" fill="currentColor" stroke="none" opacity=".78"/></g></svg>`,
          lucky100: `<svg ${attrs}><path d="M25 10h14"/><path d="M28 10v13L17 42c-4 7 1 12 9 12h12c8 0 13-5 9-12L36 23V10"/><path d="M22 39h20"/><path d="M25 35c6 4 9-3 16 1" opacity=".65"/><path d="m45 13 2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4Z"/></svg>`,
          restart: `<svg ${attrs}><path d="M19 19.2A19 19 0 1 1 14.2 39"/><path d="M18.5 10.5v9.2h9.2"/><path d="M23.2 37.2c3.4 4 9.4 4.7 13.6 1.4 4.2-3.3 5-9.2 1.8-13.5" opacity=".28"/><path d="m32 23.5 2.2 4.5 5 .7-3.6 3.5.8 4.9-4.4-2.4-4.4 2.4.8-4.9-3.6-3.5 5-.7 2.2-4.5Z" fill="currentColor" stroke="none" opacity=".68"/></svg>`,
          wish: `<svg ${attrs}><ellipse cx="32" cy="32" rx="22" ry="10.5" transform="rotate(-18 32 32)" opacity=".28"/><path d="m32 12 4.5 9.2 10.2 1.5-7.4 7.2 1.8 10.1-9.1-4.8-9.1 4.8 1.8-10.1-7.4-7.2 10.2-1.5L32 12Z"/><circle cx="51" cy="17" r="2.2" fill="currentColor" stroke="none" opacity=".48"/><circle cx="14" cy="42" r="1.7" fill="currentColor" stroke="none" opacity=".34"/></svg>`,
          triple_challenge: `<svg ${attrs}><path d="M15 41.5 32 16l17 25.5" opacity=".28"/><circle cx="15" cy="41.5" r="6.5"/><circle cx="32" cy="16" r="6.5"/><circle cx="49" cy="41.5" r="6.5"/><path d="m32 12 1.4 2.8 3.1.5-2.2 2.2.5 3-2.8-1.5-2.8 1.5.5-3-2.2-2.2 3.1-.5L32 12Z" fill="currentColor" stroke="none" opacity=".65"/><path d="M21 41.5h22" stroke-dasharray="2.5 4" opacity=".36"/></svg>`,
          no10: `<svg ${attrs}><circle cx="32" cy="32" r="22"/><path d="M16.5 47.5 47.5 16.5"/><path d="M23 26v12M20.5 28.5 23 26l2.5 2.5" opacity=".58"/><ellipse cx="37.5" cy="32" rx="5.5" ry="7.5" opacity=".7"/></svg>`,
          return10: `<svg ${attrs}><path d="M17.5 24.5A18 18 0 1 1 17 40"/><path d="M18 15.5v9.5h9.5"/><path d="M25 29.5h14v12H25z" opacity=".36"/><path d="M28 33.5h8M28 37.5h5"/><path d="m14.5 38.5 2.5 2.5-2.5 2.5"/></svg>`,
          heartbeat: `<svg ${attrs}><path d="M32 51S13 40.5 13 25.8C13 18 18.2 13 24.5 13c3.6 0 6.1 1.7 7.5 4.5C33.4 14.7 35.9 13 39.5 13 45.8 13 51 18 51 25.8 51 40.5 32 51 32 51Z"/><path d="M18.5 32h7l3.2-7.5 5.2 15 3.2-7.5h8.4" opacity=".72"/></svg>`,
          mystery_box: `<svg ${attrs}><path d="M14 25h36v27H14z"/><path d="M11.5 18h41v10h-41z"/><path d="M32 18v34" opacity=".38"/><path d="M20 18c-3.8-4.7-.7-9 3.2-8.4 4.5.7 8.8 8.4 8.8 8.4S35.9 9.7 40.5 9.6c4.4-.1 6.2 5.4 2.2 8.4"/><path d="m49 35 1.8 3.7 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4-2.9-2.8 4-.6L49 35Z" fill="currentColor" stroke="none" opacity=".55"/></svg>`,
          free_mystery_box: `<svg ${attrs}><path d="M14 25h36v27H14z"/><path d="M11.5 18h41v10h-41z"/><path d="M32 18v34" opacity=".38"/><path d="M20 18c-3.8-4.7-.7-9 3.2-8.4 4.5.7 8.8 8.4 8.8 8.4S35.9 9.7 40.5 9.6c4.4-.1 6.2 5.4 2.2 8.4"/><path d="m48 34 2.2 4.4 4.8.7-3.5 3.4.8 4.8-4.3-2.3-4.3 2.3.8-4.8-3.5-3.4 4.8-.7L48 34Z" fill="currentColor" stroke="none" opacity=".72"/><circle cx="16.5" cy="17" r="3.2" fill="currentColor" stroke="none" opacity=".32"/></svg>`
        };
        return icons[code] || icons.wheel_ticket;
      }

      function shopMissingError(err) {
        return /^(PGRST202|42883)$/.test(err?.code || "") || /schema cache|Could not find|function .*does not exist/i.test(`${err?.message || ""} ${err?.details || ""}`);
      }

      function shopInventoryCount() {
        return SHOP_INVENTORY_CODES.reduce((sum, code) => sum + Math.max(0, Number(state.shopInventory?.[code] || 0)), 0);
      }

      function normalizeShopState(raw) {
        if (!raw) return;
        let row = Array.isArray(raw) ? raw[0] : raw;
        if (typeof row === "string") { try { row = JSON.parse(row); } catch (_) {} }
        if (row?.state && typeof row.state === "object") row = row.state;
        if (!row || typeof row !== "object") return;
        const inventory = row.inventory && typeof row.inventory === "object" ? row.inventory : {};
        const weekly = row.weekly_counts && typeof row.weekly_counts === "object" ? row.weekly_counts : {};
        state.shopInventory = Object.fromEntries(SHOP_INVENTORY_CODES.map(code => [code, Math.max(0, Number(inventory[code] || 0))]));
        state.shopWeekly = weekly;
        const feature = row.weekly_feature && typeof row.weekly_feature === "object" ? row.weekly_feature : null;
        state.shopWeeklyFeature = feature && SHOP_FEATURE_ELIGIBLE_CODES.includes(String(feature.code || "")) ? {
          code:String(feature.code),
          weekStart:String(feature.week_start || ""),
          claimed:feature.discount_claimed === true,
          originalPrice:Math.max(1,Number(feature.original_price || SHOP_ITEMS[String(feature.code)]?.price || 1)),
          discountPrice:Math.max(0,Number(feature.discount_price ?? Math.max(0,(SHOP_ITEMS[String(feature.code)]?.price || 1)-1)))
        } : null;
        state.shopEquipped = SHOP_ONE_SHOT_CODES.includes(String(row.equipped_one_shot || "")) ? String(row.equipped_one_shot) : null;
        state.shopEquippedParam = state.shopEquipped === "wish" ? Number(row.equipped_param || 100) : null;
        state.shopLuckyRemaining = Math.max(0, Number(row.lucky100_remaining || 0));
        state.shopChallengeActive = row.challenge_active === true;
        state.shopChallengeSpinsDone = Math.max(0, Math.min(2, Number(row.challenge_spins_done || 0)));
        state.shopChallengeHits = Math.max(0, Math.min(2, Number(row.challenge_hits || 0)));
        state.shopPendingSpin = row.pending_spin && typeof row.pending_spin === "object" ? row.pending_spin : null;
        if (typeof row.score === "number") state.score = Number(row.score);
        state.shopLoadedAt = Date.now();
        renderWheelChallengeProgress();
      }

      async function loadShopState({ silent = false } = {}) {
        els.shopInventoryPanel.dataset.pointsSynced = "false";
        try {
          const { data, error } = await db.rpc("points_shop_get_state_v2");
          if (error) throw error;
          normalizeShopState(data);
          state.shopAvailable = true;
          els.shopInventoryPanel.dataset.pointsSynced = "true";
          renderWheelItemNotice();
          renderWheelChallengeProgress();
          return true;
        } catch (err) {
          if (shopMissingError(err)) {
            state.shopAvailable = false;
            renderWheelItemNotice();
            renderWheelChallengeProgress();
            return false;
          }
          console.error("loadShopState:", err);
          if (!silent) showToast("读取积分商城失败");
          return false;
        }
      }

      function shopWeeklyCount(code) { return Math.max(0, Number(state.shopWeekly?.[code] || 0)); }
      function shopLimitText(item) { return !item.weeklyLimit ? "不限购" : `本周 ${Math.min(item.weeklyLimit, shopWeeklyCount(item.code))}/${item.weeklyLimit}`; }
      function shopWeeklyGiftAvailable() { return state.shopWeeklyFeature?.code === "mystery_box" && state.shopWeeklyFeature?.claimed !== true; }
      function shopFeatureAvailableFor(_code) { return false; }
      function shopEffectivePrice(item) { return Number(item?.price || 0); }
      function shopPriceMarkup(item, _featured=false) { return `${item.price} ✦`; }
      function shopCardStatus(item) {
        const price=shopEffectivePrice(item), score = Number(state.score || 0), count = shopWeeklyCount(item.code);
        if (item.weeklyLimit && count >= item.weeklyLimit) return "本周已兑换";
        if (score < price) return `还差 ${price - score} 分`;
        return item.weeklyLimit ? `${count}/${item.weeklyLimit} · 可兑换` : "可兑换";
      }

      function shopProductCardHTML(item) {
        const effective=shopEffectivePrice(item), promo=shopFeatureAvailableFor(item.code);
        const affordable = Number(state.score || 0) >= effective && (!item.weeklyLimit || shopWeeklyCount(item.code) < item.weeklyLimit);
        return `<button class="shop-product-card pressable${affordable ? " affordable" : ""}${promo?" weekly-special":""}${promo&&effective===0?" weekly-free":""}" data-shop-product="${item.code}" type="button">
          <span class="shop-product-cover shop-theme-${item.theme}">${shopIconSVG(item.code)}<span class="shop-cover-word">${escapeHTML(item.coverWord)}</span></span>
          <span class="shop-product-body"><strong class="shop-product-name">${escapeHTML(item.name)}</strong><small class="shop-product-desc">${escapeHTML(item.desc)}</small><span class="shop-product-footer"><b class="shop-product-price">${shopPriceMarkup(item,false)}</b><span class="shop-product-status">${escapeHTML(shopCardStatus(item))}</span></span></span>
        </button>`;
      }

      function renderShopFeatured() {
        const item = SHOP_ITEMS.free_mystery_box;
        const available = shopWeeklyGiftAvailable();
        const label = available ? "✦ WEEKLY GIFT · 本周免费" : "✦ WEEKLY GIFT · 本周已领取";
        const price = available ? `<span class="shop-featured-sale">免费</span>` : `下周一刷新`;
        els.shopFeatured.innerHTML = `<button class="shop-featured-card pressable" data-weekly-mystery-claim="1" type="button" ${available?"":"disabled"}><span class="shop-featured-copy"><span class="shop-featured-label special">${label}</span><h3>${escapeHTML(item.name)}</h3><p>${available?"每周免费领取 1 个 · 使用免费奖励池 · 领取后自动打开 ♡":"这周的小礼物已经收下啦 ♡"}</p><span class="shop-featured-price${available?" free":""}">${price}</span></span><span class="shop-featured-art shop-theme-${item.theme}">${shopIconSVG(item.code)}</span><span class="shop-featured-limit">${available?"点击领取 · 不占每周 5 次付费限购":"下周再来看看新的幸运 ✦"}</span></button>`;
      }

      function renderShopProducts() { renderShopFeatured(); els.shopGrid.innerHTML = Object.values(SHOP_ITEMS).filter(item=>item.purchasable!==false).map(shopProductCardHTML).join(""); }

      function renderShopInventory() {
        const rows = SHOP_INVENTORY_CODES.filter(code => Number(state.shopInventory?.[code] || 0) > 0 || (code === "lucky100" && state.shopLuckyRemaining > 0) || (code === "triple_challenge" && state.shopChallengeActive));
        els.shopInventoryEmpty.hidden = rows.length > 0;
        els.shopInventoryList.innerHTML = rows.map(code => {
          const item = SHOP_ITEMS[code], qty = Math.max(0, Number(state.shopInventory?.[code] || 0));
          const activePotion = code === "lucky100" && state.shopLuckyRemaining > 0;
          const activeChallenge = code === "triple_challenge" && state.shopChallengeActive;
          let copy = item.desc;
          if (activePotion) copy = `生效中 · 还剩 ${state.shopLuckyRemaining} 抽；每抽 ¥100 +2%`;
          if (activeChallenge) copy = `挑战进行中 · 已完成 ${state.shopChallengeSpinsDone}/3 抽 · ≥¥50 ${state.shopChallengeHits}/2`;
          if (code === "heartbeat" && qty > 0) copy = "无需提前选择 · 当本抽没有使用其它单次卡且结果≤¥30时自动询问";
          const isMysteryBox = code === "mystery_box" || code === "free_mystery_box";
          if (code === "mystery_box") copy = "常规奖励池 · 点击手动开启";
          if (code === "free_mystery_box") copy = "免费奖励池 · 弱道具权重更高 · 点击手动开启";
          const tag = isMysteryBox ? "button" : "div";
          const attrs = isMysteryBox ? ` type="button" data-open-mystery-box="${code}"` : "";
          return `<${tag} class="shop-inventory-row${isMysteryBox ? " openable pressable" : ""}"${attrs}><span class="shop-inventory-icon shop-theme-${item.theme}">${shopIconSVG(code)}</span><span class="shop-inventory-copy"><strong>${escapeHTML(item.name)}</strong><small>${escapeHTML(copy)}</small></span><span class="shop-inventory-count">${activePotion ? `剩 ${state.shopLuckyRemaining} 抽` : activeChallenge ? `${state.shopChallengeSpinsDone}/3` : `× ${qty}`}</span></${tag}>`;
        }).join("");
        const activeBits = [];
        if (state.shopLuckyRemaining > 0) activeBits.push(`${shopIconSVG("lucky100")}<div><strong>百元幸运药水正在生效</strong><small>¥100 +2% · 还剩 ${state.shopLuckyRemaining} 次正式抽奖</small></div>`);
        if (state.shopChallengeActive) activeBits.push(`${shopIconSVG("triple_challenge")}<div><strong>三连挑战进行中</strong><small>完成 ${state.shopChallengeSpinsDone}/3 · ≥¥50 ${state.shopChallengeHits}/2</small></div>`);
        els.shopActiveBuff.hidden = activeBits.length === 0;
        els.shopActiveBuff.innerHTML = activeBits.join(`<span style="width:1px;height:34px;background:rgba(120,100,90,.12)"></span>`);
      }

      function renderShop() {
        if (!els.shopBalanceValue) return;
        els.shopBalanceValue.textContent = String(Number(state.score ?? 0));
        els.shopBalanceHint.textContent = Number(state.score || 0) >= 10 ? "今天也攒了好多小幸运 ✦" : "1 分起就有可以兑换的小道具 ♡";
        els.shopDbNote.hidden = state.shopAvailable !== false;
        const count = shopInventoryCount() + (state.shopLuckyRemaining > 0 ? 1 : 0) + (state.shopChallengeActive ? 1 : 0);
        els.shopInventoryBadge.hidden = count <= 0; els.shopInventoryBadge.textContent = String(count);
        const products = state.shopView !== "inventory";
        els.shopProductsPanel.hidden = !products; els.shopInventoryPanel.hidden = products;
        els.shopTabs.querySelectorAll("[data-shop-view]").forEach(btn => { const active = btn.dataset.shopView === state.shopView; btn.classList.toggle("active",active); btn.setAttribute("aria-selected",String(active)); });
        renderShopProducts(); renderShopInventory();
      }

      function renderWheelChallengeProgress() {
        if (!els.wheelChallengeProgress) return;
        if (state.isAdmin || !state.shopChallengeActive) { els.wheelChallengeProgress.hidden = true; return; }
        els.wheelChallengeProgress.hidden = false;
        const done = Math.max(0, Math.min(2, Number(state.shopChallengeSpinsDone || 0))), hits = Math.max(0, Math.min(2, Number(state.shopChallengeHits || 0)));
        els.wheelChallengeProgressText.textContent = `已完成 ${done} / 3 抽`;
        els.wheelChallengeHitText.textContent = `≥¥50 · ${hits}/2`;
        els.wheelChallengeFoot.textContent = done === 2 ? (hits >= 2 ? "最后一抽已稳稳完成条件 · 等待挑战结算" : `最后一抽还需要达到 ¥50 · 成功额外 +¥20`) : `3 抽中至少 2 次达到 ¥50 · 成功额外 +¥20`;
        const dots = [...els.wheelChallengeProgress.querySelectorAll("[data-challenge-dot]")];
        dots.forEach((dot,i) => dot.classList.toggle("done", i < done));
        [...els.wheelChallengeProgress.querySelectorAll(".wheel-challenge-track span")].forEach((line,i) => line.classList.toggle("done", i < Math.max(0,done-1)));
      }

      function renderWheelItemNotice() {
        if (!els.wheelItemNotice) return;
        const inventoryCount = shopInventoryCount();
        if (state.isAdmin) { els.wheelItemNotice.hidden = true; return; }
        if (state.shopPendingSpin) {
          els.wheelItemNotice.hidden = false; els.wheelItemNoticeTitle.textContent = "上次抽奖等待决定";
          els.wheelItemNoticeMeta.textContent = state.shopPendingSpin.type === "restart" ? `当前 ¥${state.shopPendingSpin.initial_prize} · 点击继续决定是否重抽` : `当前 ¥${state.shopPendingSpin.initial_prize} · 点击继续心跳选择`;
          return;
        }
        if (inventoryCount <= 0 && state.shopLuckyRemaining <= 0 && !state.shopChallengeActive) { els.wheelItemNotice.hidden = true; return; }
        els.wheelItemNotice.hidden = false;
        els.wheelItemNoticeTitle.textContent = state.shopChallengeActive ? "三连挑战进行中" : state.shopLuckyRemaining > 0 ? "幸运药水生效中" : `我的道具 · ${inventoryCount}`;
        const extras=[]; if (inventoryCount>0) extras.push("开始抽奖时自动提醒"); if(state.shopLuckyRemaining>0) extras.push(`百元+2% · 剩${state.shopLuckyRemaining}抽`); if(state.shopChallengeActive) extras.push(`挑战 ${state.shopChallengeSpinsDone}/3 · 命中${state.shopChallengeHits}/2`);
        els.wheelItemNoticeMeta.textContent = extras.join(" · ");
      }

      function setShopView(view) { state.shopView = view === "inventory" ? "inventory" : "products"; renderShop(); }
      async function openShop(view="products") {
        if (state.isAdmin) return showToast("管理员模式不参与游客积分商城兑换");
        state.shopView = view === "inventory" ? "inventory" : "products";
        renderShop(); setLayer(els.redeemLayer,true);
        await Promise.all([loadAppState({silent:true}), loadShopState({silent:true})]);
        if (!state.isAdmin && els.redeemLayer.classList.contains("open")) renderShop();
      }

      function openShopItemDetail(code) {
        const item=SHOP_ITEMS[code]; if(!item) return; state.shopSelectedCode=code;
        els.shopItemCover.className=`shop-detail-cover shop-theme-${item.theme}`; els.shopItemCover.innerHTML=shopIconSVG(code);
        const effectivePrice=shopEffectivePrice(item), featuredPromo=false;
        els.shopItemTitle.textContent=item.name; els.shopItemDescription.textContent=item.detail; els.shopItemPrice.textContent=String(effectivePrice);
        const chips=[]; if(featuredPromo) chips.push(effectivePrice===0?"本周精选 · 免费领取 1 次":"本周精选 · 立减 1 分"); if(item.weeklyLimit) chips.push(shopLimitText(item)); if(item.reactive) chips.push("结果后自动询问"); if(item.instantOpen) chips.push("兑换后立即开启"); else if(!item.immediate) chips.push("兑换后进入道具系统");
        els.shopItemMeta.innerHTML=chips.map(x=>`<span class="shop-detail-chip">${escapeHTML(x)}</span>`).join("");
        const score=Number(state.score||0), exhausted=item.weeklyLimit&&shopWeeklyCount(code)>=item.weeklyLimit;
        els.shopItemConfirmBtn.disabled=exhausted||score<effectivePrice||(!item.immediate&&state.shopAvailable===false);
        els.shopItemConfirmBtn.textContent=exhausted?"本周已兑换":score<effectivePrice?`还差 ${effectivePrice-score} 分`:(!item.immediate&&state.shopAvailable===false)?"请先启用商城 v3 SQL":effectivePrice===0?"本周免费领取":item.instantOpen?`开启盲盒 · ${effectivePrice} ✦`:`确认兑换 · ${effectivePrice} ✦`;
        setLayer(els.shopItemLayer,true);
      }

      function openMysteryReveal(code) {
        const item=SHOP_ITEMS[code]; if(!item) return;
        els.shopRevealPrize.innerHTML=`<span class="shop-inventory-icon shop-theme-${item.theme}">${shopIconSVG(code)}</span><strong>${escapeHTML(item.name)}</strong>`;
        els.shopRevealMessage.textContent = code === "wheel_ticket" ? "正式大转盘机会 +1 已经到账啦 ♡" : "已经放进“我的道具”啦 ♡";
        setLayer(els.shopRevealLayer,true); vibrate([16,34,20]);
      }

      function openWeeklyMysteryGiftPrompt() {
        if (!shopWeeklyGiftAvailable()) return showToast("本周免费盲盒已经领取啦 ♡");
        setLayer(els.shopWeeklyGiftLayer, true); vibrate(8);
      }

      async function claimWeeklyMysteryGift() {
        setBusy(els.shopWeeklyGiftConfirmBtn, true);
        try {
          const {data,error}=await db.rpc("points_shop_claim_weekly_mystery_box");
          if(error) throw error;
          const result=Array.isArray(data)?data[0]:data;
          normalizeShopState(result||{});
          await loadAppState({silent:true}); await loadShopState({silent:true});
          setLayer(els.shopWeeklyGiftLayer,false); renderShop(); renderPrimaryMetric();
          const grant=String(result?.granted_item_code||"");
          if(grant) openMysteryReveal(grant); else showToast("本周免费盲盒已领取 ✦");
        } catch(err) {
          if (runtime.unknownWrite(err)) { showToast(runtime.uncertainMessage); return; }
          console.error("claimWeeklyMysteryGift:",err);
          const msg=String(err?.message||"");
          if(/already claimed/i.test(msg)) { await loadShopState({silent:true}); renderShop(); showToast("本周免费盲盒已经领取啦 ♡"); }
          else if(shopMissingError(err)) showToast("请先运行最新商城数据库更新 SQL");
          else showToast("领取失败，请稍后再试");
        } finally { setBusy(els.shopWeeklyGiftConfirmBtn,false); }
      }

      function openBackpackMysteryPrompt(code="mystery_box") {
        const boxCode = code === "free_mystery_box" ? "free_mystery_box" : "mystery_box";
        const item = SHOP_ITEMS[boxCode];
        const qty=Math.max(0,Number(state.shopInventory?.[boxCode]||0));
        if(qty<=0) return showToast(`背包里没有${item.name}`);
        state.shopMysteryOpenCode=boxCode;
        if(els.shopMysteryOpenCover){ els.shopMysteryOpenCover.className=`shop-detail-cover shop-theme-${item.theme}`; els.shopMysteryOpenCover.innerHTML=shopIconSVG(boxCode); }
        if(els.shopMysteryOpenTitle) els.shopMysteryOpenTitle.textContent=`打开${item.name}？`;
        els.shopMysteryOpenMessage.textContent=boxCode==="free_mystery_box"
          ? `当前有 ${qty} 个免费幸运盲盒。打开后会消耗 1 个，并按免费奖励池立即揭晓奖励。`
          : `当前有 ${qty} 个幸运盲盒。打开后会消耗 1 个，并按常规奖励池立即揭晓奖励。`;
        setLayer(els.shopMysteryOpenLayer,true); vibrate(7);
      }

      async function openBackpackMysteryBox() {
        const boxCode = state.shopMysteryOpenCode === "free_mystery_box" ? "free_mystery_box" : "mystery_box";
        const rpc = boxCode === "free_mystery_box" ? "points_shop_open_free_mystery_box" : "points_shop_open_mystery_box";
        setBusy(els.shopMysteryOpenConfirmBtn,true);
        try {
          const {data,error}=await db.rpc(rpc);
          if(error) throw error;
          const result=Array.isArray(data)?data[0]:data;
          normalizeShopState(result||{});
          await loadShopState({silent:true});
          setLayer(els.shopMysteryOpenLayer,false); state.shopMysteryOpenCode=null; renderShop(); renderWheelItemNotice();
          const grant=String(result?.granted_item_code||"");
          if(grant) openMysteryReveal(grant);
        } catch(err) {
          if (runtime.unknownWrite(err)) { showToast(runtime.uncertainMessage); return; }
          console.error("openBackpackMysteryBox:",err);
          if(shopMissingError(err)) showToast("请先运行最新商城数据库更新 SQL");
          else showToast(/No .*mystery box/i.test(String(err?.message||""))?"背包里已经没有这个盲盒啦":"盲盒开启失败，请稍后再试");
        } finally { setBusy(els.shopMysteryOpenConfirmBtn,false); }
      }

      function renderAdminInventory() {
        if(!els.adminInventoryList) return;
        const inv=state.adminInventory||{};
        const total=SHOP_INVENTORY_CODES.reduce((sum,code)=>sum+Math.max(0,Number(inv[code]||0)),0);
        if(els.adminInventorySettingsValue) els.adminInventorySettingsValue.textContent=`共 ${total} 个`;
        els.adminInventoryList.innerHTML=SHOP_INVENTORY_CODES.map(code=>{
          const item=SHOP_ITEMS[code],qty=Math.max(0,Number(inv[code]||0));
          const summary=code==="mystery_box"
            ? "常规奖励池 · 手动打开 · 正式转盘券 1%"
            : code==="free_mystery_box"
              ? "免费奖励池 · 弱道具权重更高 · 正式转盘券 1%"
              : item.desc;
          return `<button class="admin-inventory-row pressable" data-admin-inventory-code="${code}" type="button"><span class="shop-inventory-icon shop-theme-${item.theme}">${shopIconSVG(code)}</span><span class="admin-inventory-row-copy"><strong>${escapeHTML(item.name)}</strong><small>${escapeHTML(summary)}</small></span><span class="admin-inventory-row-count">× ${qty}　›</span></button>`;
        }).join("");
      }

      async function loadAdminInventory({open=false,silent=false}={}) {
        if(!state.isAdmin) return false;
        try {
          const {data,error}=await db.rpc("points_admin_get_shop_inventory");
          if(error) throw error;
          let row=Array.isArray(data)?data[0]:data;
          if(typeof row==="string"){try{row=JSON.parse(row)}catch(_){}}
          const inventory=row?.inventory&&typeof row.inventory==="object"?row.inventory:{};
          state.adminInventory=Object.fromEntries(SHOP_INVENTORY_CODES.map(code=>[code,Math.max(0,Number(inventory[code]||0))]));
          renderAdminInventory();
          if(open) { setLayer(els.settingsLayer,false); setLayer(els.adminInventoryLayer,true); }
          return true;
        } catch(err) {
          console.error("loadAdminInventory:",err);
          if(!silent) showToast(shopMissingError(err)?"请先运行最新商城数据库更新 SQL":"读取游客背包失败");
          return false;
        }
      }

      function openAdminInventoryAdjust(code) {
        if(!state.isAdmin||!SHOP_INVENTORY_CODES.includes(code)) return;
        const item=SHOP_ITEMS[code],qty=Math.max(0,Number(state.adminInventory?.[code]||0));
        state.adminInventorySelectedCode=code; state.adminInventoryOriginalQty=qty; state.adminInventoryDraftQty=qty;
        els.adminInventoryAdjustIcon.className=`shop-inventory-icon shop-theme-${item.theme}`; els.adminInventoryAdjustIcon.innerHTML=shopIconSVG(code);
        els.adminInventoryAdjustTitle.textContent=item.name; renderAdminInventoryAdjust();
        setLayer(els.adminInventoryAdjustLayer,true); vibrate(6);
      }

      function renderAdminInventoryAdjust() {
        const code=state.adminInventorySelectedCode,item=SHOP_ITEMS[code]; if(!item) return;
        const before=Math.max(0,Number(state.adminInventoryOriginalQty||0));
        const next=Math.max(0,Math.min(999,Number(state.adminInventoryDraftQty||0)));
        state.adminInventoryDraftQty=next; els.adminInventoryAdjustValue.textContent=String(next);
        const delta=next-before;
        els.adminInventoryMinusBtn.disabled=next<=0; els.adminInventoryPlusBtn.disabled=next>=999;
        els.adminInventoryAdjustMessage.textContent=delta>0?`将发放 ${delta} 个${item.name}给游客。`:delta<0?`将从游客背包回收 ${Math.abs(delta)} 个${item.name}。`:`当前背包里有 ${before} 个${item.name}。`;
        els.adminInventoryAdjustConfirmBtn.disabled=delta===0;
        els.adminInventoryAdjustConfirmBtn.textContent=delta>0?`确认发放 +${delta}`:delta<0?`确认回收 −${Math.abs(delta)}`:"数量未变化";
        els.adminInventoryAdjustConfirmBtn.classList.toggle("destructive",delta<0);
      }

      async function saveAdminInventoryAdjust() {
        const code=state.adminInventorySelectedCode,item=SHOP_ITEMS[code]; if(!state.isAdmin||!item)return;
        const delta=Number(state.adminInventoryDraftQty)-Number(state.adminInventoryOriginalQty); if(!delta)return;
        setBusy(els.adminInventoryAdjustConfirmBtn,true);
        try {
          const {data,error}=await db.rpc("points_admin_adjust_shop_inventory",{p_item_code:code,p_delta:delta});
          if(error) throw error;
          const row=Array.isArray(data)?data[0]:data;
          const inv=row?.inventory&&typeof row.inventory==="object"?row.inventory:{};
          state.adminInventory=Object.fromEntries(SHOP_INVENTORY_CODES.map(c=>[c,Math.max(0,Number(inv[c]||0))]));
          setLayer(els.adminInventoryAdjustLayer,false); renderAdminInventory(); vibrate(14);
          showToast(delta>0?`已发放 ${item.name} ×${delta}`:`已回收 ${item.name} ×${Math.abs(delta)}`);
        } catch(err) {
          if (runtime.unknownWrite(err)) { showToast(runtime.uncertainMessage); return; }
          console.error("saveAdminInventoryAdjust:",err);
          showToast(shopMissingError(err)?"请先运行最新商城数据库更新 SQL":"道具调整失败");
        } finally { setBusy(els.adminInventoryAdjustConfirmBtn,false); }
      }

      async function refreshGuestGrantNotice() {
        if(window.PointsNotifications) return;
        if(state.isAdmin) return;
        try {
          const {data,error}=await db.rpc("points_shop_get_unseen_admin_grants");
          if(error) { if(shopMissingError(error)) return; throw error; }
          const rows=Array.isArray(data)?data:[]; state.unseenAdminGrants=rows;
          if(!rows.length||els.adminGrantNoticeLayer.classList.contains("open")) return;
          const totals={}; rows.forEach(r=>{const c=String(r.item_code||"");if(SHOP_ITEMS[c])totals[c]=(totals[c]||0)+Math.max(0,Number(r.delta||0));});
          els.adminGrantNoticeList.innerHTML=Object.entries(totals).map(([code,qty])=>{const item=SHOP_ITEMS[code];return `<div class="admin-grant-notice-item"><span class="shop-inventory-icon shop-theme-${item.theme}">${shopIconSVG(code)}</span><strong>${escapeHTML(item.name)}</strong><b>× ${qty}</b></div>`;}).join("");
          if(Object.keys(totals).length) { setLayer(els.adminGrantNoticeLayer,true); vibrate([12,30,16]); }
        } catch(err) { console.error("refreshGuestGrantNotice:",err); }
      }

      async function ackGuestGrantNotice({openBag=false}={}) {
        try { await db.rpc("points_shop_ack_admin_grants"); } catch(err) { console.error("ackGuestGrantNotice:",err); }
        state.unseenAdminGrants=[]; setLayer(els.adminGrantNoticeLayer,false);
        if(openBag) { await loadShopState({silent:true}); void openShop("inventory"); }
      }

      async function purchaseShopItem() {
        const code=state.shopSelectedCode,item=SHOP_ITEMS[code]; if(!item||state.isAdmin)return;
        setBusy(els.shopItemConfirmBtn,true);
        try {
          let usedV2=false, result=null;
          if(state.shopAvailable!==false){
            const {data,error}=await db.rpc("points_shop_purchase_v2",{p_item_code:code});
            if(error){ if(!shopMissingError(error)) throw error; state.shopAvailable=false; }
            else { result=Array.isArray(data)?data[0]:data; normalizeShopState(result||{}); state.shopAvailable=true; usedV2=true; }
          }
          if(!usedV2){
            if(code!=="wheel_ticket"&&code!=="cash_box") throw new Error("SHOP_V2_SQL_REQUIRED");
            const rpc=code==="wheel_ticket"?"points_redeem_wheel_chance":"points_redeem_cash";
            const {data,error}=await db.rpc(rpc); if(error) throw error; const row=Array.isArray(data)?data[0]:data;
            state.score=Number(row?.score??Math.max(0,Number(state.score||0)-10)); state.wheelChances=Number(row?.spin_chances??state.wheelChances); state.wheelCashBalance=Number(row?.cash_balance??state.wheelCashBalance+(code==="cash_box"?30:0));
          }
          state.overviewLoadedAt=0; await loadAppState({silent:true}); await loadShopState({silent:true}); setLayer(els.shopItemLayer,false); renderPrimaryMetric({animate:true}); renderShop(); renderWheelItemNotice(); renderWheelChallengeProgress();
          const grant=result?.granted_item_code || null;
          if(code==="mystery_box"&&grant){ openMysteryReveal(String(grant)); }
          else { vibrate(18); showToast(item.immediate?`兑换成功 · ${item.name}已到账 ✦`:`兑换成功 · ${item.name}已加入我的道具 ✦`); }
          if(state.overviewMode!=="closed") await loadOverviewData(true);
        } catch(err){
          if (runtime.unknownWrite(err)) { showToast(runtime.uncertainMessage); return; }
          console.error("purchaseShopItem:",err); const msg=String(err?.message||"");
          if(/SHOP_V2_SQL_REQUIRED|points_shop_/i.test(msg)) showToast("请先运行积分商城 v3 数据库迁移 SQL");
          else if(/Insufficient score/i.test(msg)){await loadAppState({silent:true});renderShop();showToast("积分不够啦，再攒一点点 ♡");}
          else if(/Weekly limit/i.test(msg)){await loadShopState({silent:true});renderShop();showToast("这个商品本周已经达到限购啦");}
          else showToast("兑换失败，请稍后再试");
        } finally { setBusy(els.shopItemConfirmBtn,false); }
      }

      function ownedWheelToolCodes() {
        return SHOP_WHEEL_TOOL_CODES.filter(code => {
          if(code==="lucky100") return state.shopLuckyRemaining<=0 && Number(state.shopInventory?.lucky100||0)>0;
          if(code==="triple_challenge") return !state.shopChallengeActive && Number(state.shopInventory?.triple_challenge||0)>0;
          return Number(state.shopInventory?.[code]||0)>0;
        });
      }
      function affordableWheelToolCodes() {
        const score=Math.max(0,Number(state.score||0));
        return SHOP_WHEEL_TOOL_CODES.filter(code=>{const item=SHOP_ITEMS[code];if(!item||score<item.price)return false;if(code==="lucky100"&&state.shopLuckyRemaining>0)return false;if(code==="triple_challenge"&&state.shopChallengeActive)return false;return !item.weeklyLimit||shopWeeklyCount(code)<item.weeklyLimit;});
      }

      function renderWheelToolPrompt() {
        const owned=ownedWheelToolCodes(),activePotion=state.shopLuckyRemaining>0,activeChallenge=state.shopChallengeActive,mode=state.wheelToolPromptMode;
        const strips=[];
        if(activePotion) strips.push(`${shopIconSVG("lucky100")}<span>百元幸运药水生效中 · 本次 ¥100 +2% · 剩 ${state.shopLuckyRemaining} 抽</span>`);
        if(activeChallenge) strips.push(`${shopIconSVG("triple_challenge")}<span>三连挑战 · ${state.shopChallengeSpinsDone}/3 抽 · ≥¥50 ${state.shopChallengeHits}/2</span>`);
        els.wheelToolActiveBuff.hidden=strips.length===0; els.wheelToolActiveBuff.innerHTML=strips.join(`<span style="width:1px;height:24px;background:rgba(100,90,90,.13)"></span>`);
        els.wheelToolWarning.hidden=true; els.wheelToolList.innerHTML=""; els.wheelWishSelector.hidden=true;

        if(mode==="warning"){
          const affordable=affordableWheelToolCodes(),names=affordable.slice(0,3).map(code=>SHOP_ITEMS[code].name).join("、");
          els.wheelToolTitle.textContent="确定不用道具吗？"; els.wheelToolMessage.textContent="你目前没有已兑换的可选道具，但积分已经足够兑换转盘道具。";
          els.wheelToolWarning.hidden=false; els.wheelToolWarning.innerHTML=`当前有 <strong>${Math.max(0,Number(state.score||0))} ✦</strong>${names?`，可以兑换 ${escapeHTML(names)}${affordable.length>3?" 等":""}`:""}。如果继续，将不额外兑换新道具。`;
          els.wheelToolConfirmBtn.disabled=false; els.wheelToolConfirmBtn.textContent="去积分商城看看"; els.wheelToolBareBtn.textContent=activePotion?"保持当前状态 · 直接抽":"不用新道具，直接抽"; return;
        }

        els.wheelToolTitle.textContent="这次要带上哪一种幸运？";
        els.wheelToolMessage.textContent="三连挑战属于任务层、药水属于持续层；除此之外，一次正式抽奖最多使用 1 个单次道具。";
        const rows=[];
        for(const code of SHOP_ONE_SHOT_CODES){
          if(Number(state.shopInventory?.[code]||0)<=0) continue;
          const item=SHOP_ITEMS[code],selected=state.wheelToolSelectedCode===code,conflict=code==="no10"&&(activePotion||state.wheelToolUsePotion);
          rows.push(`<button class="wheel-tool-choice pressable${selected?" selected":""}${conflict?" disabled":""}" data-wheel-tool-code="${code}" type="button"${conflict?" disabled":""}><span class="wheel-tool-choice-icon shop-theme-${item.theme}">${shopIconSVG(code)}</span><span class="wheel-tool-choice-copy"><strong>${escapeHTML(item.name)}</strong><small>${escapeHTML(conflict?"百元幸运药水生效期间不能使用十元退散":item.desc)} · 库存 ×${Math.max(0,Number(state.shopInventory?.[code]||0))}</small></span><span class="wheel-tool-choice-mark">${selected?"已选择":conflict?"冲突":"选择"}</span></button>`);
        }
        if(Number(state.shopInventory?.heartbeat||0)>0){
          const item=SHOP_ITEMS.heartbeat;
          rows.push(`<div class="wheel-tool-choice auto-trigger"><span class="wheel-tool-choice-icon shop-theme-${item.theme}">${shopIconSVG("heartbeat")}</span><span class="wheel-tool-choice-copy"><strong>${escapeHTML(item.name)}</strong><small>不需要提前选择 · 本抽若没有使用其它单次卡且结果≤¥30，系统会自动询问 · 库存 ×${Math.max(0,Number(state.shopInventory?.heartbeat||0))}</small></span><span class="wheel-tool-choice-mark">自动询问</span></div>`);
        }
        if(Number(state.shopInventory?.lucky100||0)>0&&!activePotion){
          const item=SHOP_ITEMS.lucky100,selected=state.wheelToolUsePotion,conflict=state.wheelToolSelectedCode==="no10";
          rows.push(`<button class="wheel-tool-choice potion pressable${selected?" selected":""}${conflict?" disabled":""}" data-wheel-potion-toggle="1" type="button"${conflict?" disabled":""}><span class="wheel-tool-choice-icon shop-theme-${item.theme}">${shopIconSVG("lucky100")}</span><span class="wheel-tool-choice-copy"><strong>${escapeHTML(item.name)}</strong><small>${escapeHTML(conflict?"已选择十元退散，两种概率道具不能同时使用":item.desc)} · 库存 ×${Math.max(0,Number(state.shopInventory?.lucky100||0))}</small></span><span class="wheel-tool-choice-mark">${selected?"已开启":conflict?"冲突":"开启"}</span></button>`);
        }
        if(Number(state.shopInventory?.triple_challenge||0)>0&&!activeChallenge){
          const item=SHOP_ITEMS.triple_challenge,selected=state.wheelToolUseChallenge;
          rows.push(`<button class="wheel-tool-choice challenge pressable${selected?" selected":""}" data-wheel-challenge-toggle="1" type="button"><span class="wheel-tool-choice-icon shop-theme-${item.theme}">${shopIconSVG("triple_challenge")}</span><span class="wheel-tool-choice-copy"><strong>${escapeHTML(item.name)}</strong><small>${escapeHTML(item.desc)} · 可与药水和单次道具叠加 · 库存 ×${Math.max(0,Number(state.shopInventory?.triple_challenge||0))}</small></span><span class="wheel-tool-choice-mark">${selected?"已开启":"开启"}</span></button>`);
        }
        els.wheelToolList.innerHTML=rows.join("");
        if(state.wheelToolSelectedCode==="wish"){
          els.wheelWishSelector.hidden=false;
          els.wheelWishGrid.querySelectorAll("[data-wheel-wish]").forEach(btn=>btn.classList.toggle("selected",Number(btn.dataset.wheelWish)===Number(state.wheelToolWishTarget)));
        }
        const hasSelection=!!state.wheelToolSelectedCode||state.wheelToolUsePotion||state.wheelToolUseChallenge;
        els.wheelToolConfirmBtn.disabled=!hasSelection; els.wheelToolConfirmBtn.textContent=hasSelection?"确认并开始":"请选择道具";
        els.wheelToolBareBtn.textContent=Number(state.shopInventory?.heartbeat||0)>0?"先直接抽 · 低奖时再决定":"不用单次道具，直接抽";
      }

      function openWheelToolPrompt(mode="owned") {
        state.wheelToolPromptMode=mode; state.wheelToolSelectedCode=null; state.wheelToolWishTarget=100; state.wheelToolUsePotion=false; state.wheelToolUseChallenge=false; renderWheelToolPrompt(); setLayer(els.wheelToolLayer,true);
      }

      async function prepareSpinSelection({oneShot=null,wishTarget=null,usePotion=false,useChallenge=false}={}) {
        const {data,error}=await db.rpc("points_shop_prepare_spin_v2",{p_item_code:oneShot||null,p_param:oneShot==="wish"?Number(wishTarget||100):null,p_activate_potion:!!usePotion,p_activate_challenge:!!useChallenge});
        if(error) throw error; normalizeShopState(data); state.shopAvailable=true; return data;
      }

      async function clearLegacyEquippedTool() {
        if(state.shopAvailable!==true) return;
        try { await prepareSpinSelection({}); state.shopEquipped=null; state.shopEquippedParam=null; }
        catch(err){console.debug("clearSpinSelection:",err);}
      }

      async function spinWithoutNewTool() {
        setBusy(els.wheelToolBareBtn,true);
        try { if(state.shopAvailable===true) await prepareSpinSelection({}); setLayer(els.wheelToolLayer,false); await performFormalWheelSpin(); }
        finally { setBusy(els.wheelToolBareBtn,false); }
      }

      async function confirmWheelToolChoice() {
        if(state.wheelToolPromptMode==="warning"){setLayer(els.wheelToolLayer,false);return openShop("products");}
        const oneShot=state.wheelToolSelectedCode,usePotion=state.wheelToolUsePotion,useChallenge=state.wheelToolUseChallenge;
        if(!oneShot&&!usePotion&&!useChallenge) return;
        if(state.shopAvailable!==true) return showToast("商城 v3 数据库尚未启用");
        setBusy(els.wheelToolConfirmBtn,true);
        try {
          await prepareSpinSelection({oneShot,wishTarget:state.wheelToolWishTarget,usePotion,useChallenge});
          setLayer(els.wheelToolLayer,false); await loadShopState({silent:true}); await performFormalWheelSpin();
        } catch(err){
          if (runtime.unknownWrite(err)) { showToast(runtime.uncertainMessage); return; }
          console.error("confirmWheelToolChoice:",err); const msg=String(err?.message||"");
          if(/No10 cannot stack/i.test(msg)) showToast("十元退散和百元幸运药水不能同时使用");
          else showToast(shopMissingError(err)?"商城 v2 数据库尚未启用":"道具暂时没有准备好，请再试一次");
          await loadShopState({silent:true}); renderWheelToolPrompt();
        } finally {setBusy(els.wheelToolConfirmBtn,false);}
      }

      // -------------------- Lucky wheel --------------------
      const WHEEL_DEFAULT_PROBABILITIES = {
        10: 10,
        20: 30,
        30: 30,
        50: 12,
        60: 10,
        80: 5,
        100: 3
      };
      const WHEEL_PROBABILITY_AMOUNTS = [10, 20, 30, 50, 60, 80, 100];

      function wheelProbabilityInputs() {
        return [...els.wheelProbabilityGrid.querySelectorAll("[data-wheel-prob]")];
      }

      function normalizeWheelProbabilityIntegers(config) {
        const source = config || WHEEL_DEFAULT_PROBABILITIES;
        const rows = WHEEL_PROBABILITY_AMOUNTS.map(amount => {
          const raw = Math.max(0, Number(source[amount] ?? 0));
          const base = Math.floor(raw);
          return { amount, base, fraction: raw - base };
        });
        let remainder = 100 - rows.reduce((sum, row) => sum + row.base, 0);
        if (remainder > 0) {
          [...rows]
            .sort((a,b) => b.fraction - a.fraction || a.amount - b.amount)
            .forEach((row, i, arr) => {
              if (remainder <= 0) return;
              const add = Math.min(remainder, 1);
              row.base += add;
              remainder -= add;
            });
        } else if (remainder < 0) {
          let need = -remainder;
          const candidates = [...rows].sort((a,b) => a.fraction - b.fraction || b.base - a.base);
          let guard = 0;
          while (need > 0 && guard < 1000) {
            const row = candidates[guard % candidates.length];
            if (row.base > 0) { row.base -= 1; need -= 1; }
            guard++;
          }
        }
        return Object.fromEntries(rows.map(row => [row.amount, row.base]));
      }

      function setWheelProbabilityInputs(config) {
        const values = normalizeWheelProbabilityIntegers(config || WHEEL_DEFAULT_PROBABILITIES);
        wheelProbabilityInputs().forEach(input => {
          const amount = Number(input.dataset.wheelProb);
          input.value = String(Number(values[amount] ?? 0));
        });
        updateWheelProbabilityTotal();
        renderWheelProbabilityStudio();
      }

      function readWheelProbabilityInputs() {
        const result = {};
        wheelProbabilityInputs().forEach(input => {
          const amount = Number(input.dataset.wheelProb);
          const value = Math.round(Number(input.value));
          result[amount] = Number.isFinite(value) ? Math.max(0, value) : 0;
        });
        return result;
      }

      function writeWheelProbabilityValues(values) {
        wheelProbabilityInputs().forEach(input => {
          const amount = Number(input.dataset.wheelProb);
          input.value = String(Math.max(0, Math.round(Number(values[amount] ?? 0))));
        });
        updateWheelProbabilityTotal();
        renderWheelProbabilityStudio();
      }

      function updateWheelProbabilityTotal() {
        const values = readWheelProbabilityInputs();
        const total = Object.values(values).reduce((sum, value) => sum + Number(value || 0), 0);
        const valid = total === 100
          && Object.values(values).every(value => Number.isInteger(value) && value >= 0 && value <= 100);
        els.wheelProbabilityTotal.textContent = valid
          ? "总概率 100% ✓"
          : `当前总概率 ${total}% · 请调整到 100%`;
        els.wheelProbabilityTotal.classList.toggle("invalid", !valid);
        els.saveWheelProbabilityBtn.disabled = !valid;
        return valid;
      }

      function wheelProbabilityPartnerIndex(selectedIndex) {
        if (selectedIndex < WHEEL_PROBABILITY_AMOUNTS.length - 1) return selectedIndex + 1;
        return selectedIndex - 1;
      }

      function renderWheelProbabilityStudio() {
        if (!els.wheelProbabilityBar) return;
        const values = readWheelProbabilityInputs();
        const selectedAmount = WHEEL_PROBABILITY_AMOUNTS.includes(Number(state.wheelProbabilitySelectedAmount))
          ? Number(state.wheelProbabilitySelectedAmount)
          : WHEEL_PROBABILITY_AMOUNTS[0];
        state.wheelProbabilitySelectedAmount = selectedAmount;

        els.wheelProbabilityBar.innerHTML = WHEEL_PROBABILITY_AMOUNTS.map((amount, index) => {
          const value = Number(values[amount] || 0);
          return `<span class="wheel-probability-segment s${index}${amount === selectedAmount ? " selected" : ""}" style="width:${value}%" title="¥${amount} · ${value}%"></span>`;
        }).join("");

        let cumulative = 0;
        els.wheelProbabilityBoundaries.innerHTML = "";
        WHEEL_PROBABILITY_AMOUNTS.slice(0, -1).forEach((amount, index) => {
          cumulative += Number(values[amount] || 0);
          const handle = document.createElement("button");
          handle.type = "button";
          handle.className = "wheel-probability-boundary pressable";
          handle.dataset.probBoundaryIndex = String(index);
          handle.style.left = `${cumulative}%`;
          handle.setAttribute("aria-label", `调整 ¥${amount} 与 ¥${WHEEL_PROBABILITY_AMOUNTS[index+1]} 的分界线`);
          handle.innerHTML = "<span></span>";
          els.wheelProbabilityBoundaries.appendChild(handle);
        });

        els.wheelProbabilityLegend.innerHTML = WHEEL_PROBABILITY_AMOUNTS.map((amount, index) => {
          const value = Number(values[amount] || 0);
          return `<button class="wheel-probability-legend-item pressable s${index}${amount === selectedAmount ? " selected" : ""}" data-prob-select="${amount}" type="button"><span>¥${amount}</span><strong>${value}%</strong></button>`;
        }).join("");

        const selectedIndex = WHEEL_PROBABILITY_AMOUNTS.indexOf(selectedAmount);
        const partnerIndex = wheelProbabilityPartnerIndex(selectedIndex);
        const partnerAmount = WHEEL_PROBABILITY_AMOUNTS[partnerIndex];
        const selectedValue = Number(values[selectedAmount] || 0);
        const partnerValue = Number(values[partnerAmount] || 0);

        els.wheelProbabilitySelectedName.textContent = `¥${selectedAmount}`;
        els.wheelProbabilitySelectedValue.textContent = `${selectedValue}%`;
        els.wheelProbabilityBalanceHint.textContent = `与 ¥${partnerAmount} 自动平衡 · 每次 1%`;
        els.wheelProbabilityMinusBtn.disabled = selectedValue <= 0;
        els.wheelProbabilityPlusBtn.disabled = partnerValue <= 0;
      }

      function adjustSelectedWheelProbability(delta) {
        const values = readWheelProbabilityInputs();
        const selectedAmount = Number(state.wheelProbabilitySelectedAmount);
        const selectedIndex = WHEEL_PROBABILITY_AMOUNTS.indexOf(selectedAmount);
        if (selectedIndex < 0) return;
        const partnerIndex = wheelProbabilityPartnerIndex(selectedIndex);
        const partnerAmount = WHEEL_PROBABILITY_AMOUNTS[partnerIndex];

        if (delta > 0) {
          if (Number(values[partnerAmount] || 0) <= 0) return;
          values[selectedAmount] = Number(values[selectedAmount] || 0) + 1;
          values[partnerAmount] = Number(values[partnerAmount] || 0) - 1;
        } else {
          if (Number(values[selectedAmount] || 0) <= 0) return;
          values[selectedAmount] = Number(values[selectedAmount] || 0) - 1;
          values[partnerAmount] = Number(values[partnerAmount] || 0) + 1;
        }
        writeWheelProbabilityValues(values);
        vibrate(4);
      }

      let probabilityDragState = null;

      function beginWheelProbabilityBoundaryDrag(e) {
        const handle = e.target.closest("[data-prob-boundary-index]");
        if (!handle) return;
        const index = Number(handle.dataset.probBoundaryIndex);
        if (!Number.isInteger(index) || index < 0 || index >= WHEEL_PROBABILITY_AMOUNTS.length - 1) return;

        const values = readWheelProbabilityInputs();
        const barRect = els.wheelProbabilityBar.getBoundingClientRect();
        const prevTotal = WHEEL_PROBABILITY_AMOUNTS.slice(0, index)
          .reduce((sum, amount) => sum + Number(values[amount] || 0), 0);
        const leftAmount = WHEEL_PROBABILITY_AMOUNTS[index];
        const rightAmount = WHEEL_PROBABILITY_AMOUNTS[index + 1];
        const pairTotal = Number(values[leftAmount] || 0) + Number(values[rightAmount] || 0);

        probabilityDragState = {
          pointerId: e.pointerId,
          index,
          prevTotal,
          pairTotal,
          leftAmount,
          rightAmount,
          barRect,
          lastLeft: Number(values[leftAmount] || 0)
        };
        state.wheelProbabilitySelectedAmount = leftAmount;
        handle.classList.add("dragging");
        e.preventDefault();
      }

      function moveWheelProbabilityBoundaryDrag(e) {
        const drag = probabilityDragState;
        if (!drag || drag.pointerId !== e.pointerId) return;
        const width = Math.max(1, drag.barRect.width);
        const globalPercent = Math.round(((e.clientX - drag.barRect.left) / width) * 100);
        const leftValue = Math.min(drag.pairTotal, Math.max(0, globalPercent - drag.prevTotal));
        if (leftValue === drag.lastLeft) return;

        const values = readWheelProbabilityInputs();
        values[drag.leftAmount] = leftValue;
        values[drag.rightAmount] = drag.pairTotal - leftValue;
        drag.lastLeft = leftValue;
        writeWheelProbabilityValues(values);
        vibrate(2);
        e.preventDefault();
      }

      function endWheelProbabilityBoundaryDrag(e) {
        if (!probabilityDragState || probabilityDragState.pointerId !== e.pointerId) return;
        els.wheelProbabilityBoundaries.querySelectorAll(".dragging").forEach(el => el.classList.remove("dragging"));
        probabilityDragState = null;
      }

      async function loadAdminWheelProbability() {
        if (!state.isAdmin) {
          showToast("这个入口只有管理员可以使用");
          return false;
        }
        try {
          const { data, error } = await db.rpc("points_admin_get_wheel_probabilities_v2");
          if (error) throw error;
          const config = {};
          for (const row of (Array.isArray(data) ? data : [])) {
            config[Number(row.amount)] = Number(row.probability_bp) / 100;
          }
          state.wheelAdminConfig = config;
          setWheelProbabilityInputs(config);
          return true;
        } catch (err) {
          console.error("loadAdminWheelProbability:", err);
          showToast(/Admin only/i.test(String(err?.message || "")) ? "只有管理员可以查看概率" : "读取转盘概率失败");
          return false;
        }
      }

      async function openWheelProbabilitySettings() {
        if (!state.isAdmin) return showToast("这个入口只有管理员可以使用");
        setBusy(els.openWheelProbabilityBtn, true);
        try {
        const ok = await loadAdminWheelProbability();
        if (ok && state.isAdmin && els.settingsLayer.classList.contains("open")) {
          setLayer(els.settingsLayer, false); setLayer(els.wheelProbabilityLayer, true);
        }
        } finally { setBusy(els.openWheelProbabilityBtn, false); }
      }

      function buildWheelProbabilityBasisPoints(values) {
        // The UI works in percentages, while the database stores basis points (100% = 10000).
        // Decimal percentages can sum to 100% in the UI but independently rounding every item
        // may produce 9999/10001. Use a largest-remainder normalization so the submitted
        // payload is ALWAYS exactly 10000 without visibly changing the user's proportions.
        const rows = Object.entries(values).map(([amount, percent]) => {
          const raw = Math.max(0, Number(percent) || 0) * 100;
          const base = Math.floor(raw + 1e-9);
          return { amount: String(amount), base, fraction: raw - base };
        });

        let remaining = 10000 - rows.reduce((sum, row) => sum + row.base, 0);
        const byFraction = [...rows].sort((a, b) => b.fraction - a.fraction || Number(a.amount) - Number(b.amount));

        if (remaining > 0) {
          for (let i = 0; remaining > 0; i++, remaining--) {
            byFraction[i % byFraction.length].base += 1;
          }
        } else if (remaining < 0) {
          const reverse = [...rows].sort((a, b) => a.fraction - b.fraction || Number(b.amount) - Number(a.amount));
          for (let i = 0; remaining < 0; i++) {
            const row = reverse[i % reverse.length];
            if (row.base > 0) {
              row.base -= 1;
              remaining += 1;
            }
          }
        }

        const payload = Object.fromEntries(rows.map(row => [row.amount, row.base]));
        const total = Object.values(payload).reduce((sum, value) => sum + Number(value || 0), 0);
        if (total !== 10000) throw new Error(`Normalized probability sum is ${total}, expected 10000`);
        return payload;
      }

      async function saveWheelProbability() {
        if (!state.isAdmin) return showToast("这个入口只有管理员可以使用");
        if (!updateWheelProbabilityTotal()) return;
        const values = readWheelProbabilityInputs();
        let payload;
        try {
          payload = buildWheelProbabilityBasisPoints(values);
        } catch (err) {
          console.error("buildWheelProbabilityBasisPoints:", err);
          return showToast("概率格式异常，请重新检查后保存");
        }

        setBusy(els.saveWheelProbabilityBtn, true);
        try {
          const { data, error } = await db.rpc("points_admin_set_wheel_probabilities_v2", {
            p_config: payload
          });
          if (error) throw error;

          const config = {};
          for (const row of (Array.isArray(data) ? data : [])) {
            config[Number(row.amount)] = Number(row.probability_bp) / 100;
          }
          state.wheelAdminConfig = config;
          setWheelProbabilityInputs(config);
          vibrate(16);
          showToast("🎠 新概率已经保存并生效");
        } catch (err) {
          console.error("saveWheelProbabilityV2:", err);
          const message = String(err?.message || "");
          const details = String(err?.details || "");
          const hint = String(err?.hint || "");
          const code = String(err?.code || "");
          const diagnostic = `${code} ${message} ${details} ${hint}`;
          if (/PGRST202|schema cache|Could not find|function .*points_admin_set_wheel_probabilities_v2.*does not exist/i.test(diagnostic)) {
            showToast("数据库缺少 v2 概率函数，请运行 v2.4 数据库更新 SQL");
          } else if (/sum|10000|probability|config/i.test(diagnostic)) {
            showToast("数据库拒绝了概率配置，请确认已运行 v2.4 数据库更新 SQL");
          } else if (/Admin only|permission|not authorized|JWT/i.test(diagnostic)) {
            showToast("管理员权限校验失败，请重新登录管理员后再试");
          } else {
            showToast(`保存概率失败${code ? ` · ${code}` : ""}`);
          }
        } finally {
          setBusy(els.saveWheelProbabilityBtn, false);
          updateWheelProbabilityTotal();
        }
      }

      function formatProbabilityHistoryConfig(config) {
        const result = {};
        for (const amount of [10,20,30,50,60,80,100]) {
          result[amount] = Number(config?.[String(amount)] ?? config?.[amount] ?? 0) / 100;
        }
        return result;
      }

      function renderWheelProbabilityHistory() {
        const rows = Array.isArray(state.wheelProbabilityHistory) ? state.wheelProbabilityHistory : [];
        if (!rows.length) {
          els.wheelProbabilityHistoryList.innerHTML = '<div class="wheel-probability-history-empty">还没有修改记录 ♡</div>';
          return;
        }

        els.wheelProbabilityHistoryList.innerHTML = rows.map(row => {
          const before = formatProbabilityHistoryConfig(row.before_config);
          const after = formatProbabilityHistoryConfig(row.after_config);
          const chips = [10,20,30,50,60,80,100]
            .filter(amount => Math.abs(before[amount] - after[amount]) > .0001)
            .map(amount => `<span class="wheel-probability-history-chip">¥${amount}：${before[amount]}% → ${after[amount]}%</span>`)
            .join("");
          const time = new Intl.DateTimeFormat("zh-CN", {
            year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit", hour12: false
          }).format(new Date(row.created_at));
          return `<div class="wheel-probability-history-item">
            <div class="wheel-probability-history-time">${escapeHTML(time)} · 管理员修改</div>
            <div class="wheel-probability-history-changes">${chips || '<span class="wheel-probability-history-chip">保存了相同配置</span>'}</div>
          </div>`;
        }).join("");
      }

      async function openWheelProbabilityHistory() {
        if (!state.isAdmin) return showToast("这个入口只有管理员可以使用");
        setLayer(els.settingsLayer, false);
        els.wheelProbabilityHistoryList.innerHTML = '<div class="wheel-probability-history-empty">正在读取…</div>';
        setLayer(els.wheelProbabilityHistoryLayer, true);
        try {
          const { data, error } = await db.rpc("points_admin_get_wheel_probability_logs_v2", { p_limit: 100 });
          if (error) throw error;
          state.wheelProbabilityHistory = Array.isArray(data) ? data : [];
          renderWheelProbabilityHistory();
        } catch (err) {
          console.error("openWheelProbabilityHistory:", err);
          els.wheelProbabilityHistoryList.innerHTML = '<div class="wheel-probability-history-empty">读取记录失败</div>';
        }
      }

      function openWheelPreviewPrompt() {
        els.wheelPreviewMessage.textContent = state.isAdmin
          ? "管理员试玩使用当前真实概率，但不会消耗游客正式机会、不会产生可提现余额，也不会留下中奖记录。"
          : "宝宝现在还没有正式的大转盘机会哦～可以先试玩一次 ✨ 试玩不会加入可提现余额，也不会保存中奖记录 ♡";
        setLayer(els.wheelPreviewLayer, true);
      }

      // The wheel's ordinary visual profile is intentionally fixed.
      // Admin probability edits affect the real database odds only; they do NOT resize the wheel.
      // Only a temporary shop tool may morph the visible sectors for that spin.
      const WHEEL_VISUAL_BASE = Object.freeze({
        10: 10, 20: 30, 30: 30, 50: 12, 60: 10, 80: 5, 100: 3
      });
      const WHEEL_VISUAL_COLORS = Object.freeze({
        10: "#f7d2df", 20: "#ffe2a8", 30: "#cfe4fb", 50: "#f8d9bc",
        60: "#dfd3f5", 80: "#cfe9df", 100: "#f5bdcf"
      });
      const WHEEL_VISUAL_AMOUNTS = [10,20,30,50,60,80,100];
      const WHEEL_VISUAL_LABEL_RADIUS = 31;
      const WHEEL_LUCKY100_VISUAL_SHIFT = 2; // percentage points: 3% -> 5%, taken from ¥10

      function cloneWheelVisualProbabilities(source = WHEEL_VISUAL_BASE) {
        return Object.fromEntries(WHEEL_VISUAL_AMOUNTS.map(amount => [amount, Math.max(0, Number(source?.[amount] || 0))]));
      }

      function normalizeWheelVisualProbabilities(source) {
        const p = cloneWheelVisualProbabilities(source);
        const total = WHEEL_VISUAL_AMOUNTS.reduce((sum, amount) => sum + p[amount], 0);
        if (!(total > 0)) return cloneWheelVisualProbabilities(WHEEL_VISUAL_BASE);
        if (Math.abs(total - 100) > .0001) {
          WHEEL_VISUAL_AMOUNTS.forEach(amount => { p[amount] = p[amount] * 100 / total; });
        }
        return p;
      }

      function wheelVisualWithPotion(source) {
        const p = cloneWheelVisualProbabilities(source);
        const shift = Math.min(WHEEL_LUCKY100_VISUAL_SHIFT, p[10]);
        p[10] -= shift;
        p[100] += shift;
        return p;
      }

      function wheelVisualApplyOneShot(source, modifier) {
        const p = cloneWheelVisualProbabilities(source);
        if (modifier === "shield30") {
          p[30] += p[10] + p[20];
          p[10] = 0; p[20] = 0;
          return p;
        }
        if (modifier === "upgrade") {
          const out = Object.fromEntries(WHEEL_VISUAL_AMOUNTS.map(a => [a, 0]));
          const map = {10:20,20:30,30:50,50:50,60:60,80:80,100:100};
          WHEEL_VISUAL_AMOUNTS.forEach(amount => { out[map[amount]] += p[amount]; });
          return out;
        }
        if (modifier === "double_pick") {
          // Two independent draws, keeping the larger result: P(max=x)=F(x)^2-F(prev)^2.
          const out = Object.fromEntries(WHEEL_VISUAL_AMOUNTS.map(a => [a, 0]));
          let cumulative = 0;
          let previousSquared = 0;
          WHEEL_VISUAL_AMOUNTS.forEach(amount => {
            cumulative += p[amount] / 100;
            const squared = cumulative * cumulative;
            out[amount] = (squared - previousSquared) * 100;
            previousSquared = squared;
          });
          return out;
        }
        if (modifier === "no10") {
          const shift = Math.min(10, p[10]);
          p[10] -= shift;
          const others = WHEEL_VISUAL_AMOUNTS.filter(a => a !== 10);
          const totalOther = others.reduce((sum,a) => sum + p[a], 0);
          if (shift > 0 && totalOther > 0) others.forEach(a => { p[a] += shift * p[a] / totalOther; });
          return p;
        }
        return p;
      }

      function effectiveWheelVisualProbabilities(modifier = null, luckyActive = false) {
        let p = cloneWheelVisualProbabilities(WHEEL_VISUAL_BASE);
        if (luckyActive) p = wheelVisualWithPotion(p);
        p = wheelVisualApplyOneShot(p, modifier);
        return normalizeWheelVisualProbabilities(p);
      }

      function buildWheelVisualSegments(probabilities) {
        const p = normalizeWheelVisualProbabilities(probabilities);
        let cursor = 0;
        const segments = {};
        WHEEL_VISUAL_AMOUNTS.forEach((amount, index) => {
          const start = cursor;
          cursor += p[amount] * 3.6;
          const end = index === WHEEL_VISUAL_AMOUNTS.length - 1 ? 360 : cursor;
          segments[amount] = [start, end];
        });
        return segments;
      }

      function wheelVisualGradient(probabilities) {
        const p = normalizeWheelVisualProbabilities(probabilities);
        let cursor = 0;
        const stops = [];
        WHEEL_VISUAL_AMOUNTS.forEach((amount, index) => {
          const start = cursor;
          cursor += p[amount] * 3.6;
          const end = index === WHEEL_VISUAL_AMOUNTS.length - 1 ? 360 : cursor;
          if (end - start > .0001) stops.push(`${WHEEL_VISUAL_COLORS[amount]} ${start.toFixed(3)}deg ${end.toFixed(3)}deg`);
        });
        return `conic-gradient(from 0deg, ${stops.join(",")})`;
      }

      function wheelVisualLabelElement(amount) {
        return els.wheelDisk?.querySelector(`.wheel-prize-${amount}`) || null;
      }

      function renderWheelVisualFrame(probabilities) {
        if (!els.wheelDisk) return;
        const p = normalizeWheelVisualProbabilities(probabilities);
        const segments = buildWheelVisualSegments(p);
        els.wheelDisk.style.background = wheelVisualGradient(p);
        WHEEL_VISUAL_AMOUNTS.forEach(amount => {
          const el = wheelVisualLabelElement(amount);
          if (!el) return;
          const probability = p[amount];
          const [start, end] = segments[amount];
          const mid = (start + end) / 2;
          const rad = mid * Math.PI / 180;
          const radius = probability < 4 ? 29.7 : (probability < 7 ? 30.3 : WHEEL_VISUAL_LABEL_RADIUS);
          const left = 50 + Math.sin(rad) * radius;
          const top = 50 - Math.cos(rad) * radius;
          const font = Math.max(6.8, Math.min(13.5, 7 + probability * .22));
          el.style.left = `${left.toFixed(3)}%`;
          el.style.top = `${top.toFixed(3)}%`;
          el.style.fontSize = `${font.toFixed(2)}px`;
          el.style.opacity = probability <= .001 ? "0" : "1";
        });
        state.wheelVisualProbabilities = p;
        state.wheelVisualSegments = segments;
      }

      function wheelVisualProfilesEqual(a, b) {
        return WHEEL_VISUAL_AMOUNTS.every(amount => Math.abs(Number(a?.[amount] || 0) - Number(b?.[amount] || 0)) < .001);
      }

      async function animateWheelVisualProfile(target, { duration = 620 } = {}) {
        const targetP = normalizeWheelVisualProbabilities(target);
        const startP = normalizeWheelVisualProbabilities(state.wheelVisualProbabilities || WHEEL_VISUAL_BASE);
        if (wheelVisualProfilesEqual(startP, targetP)) {
          renderWheelVisualFrame(targetP);
          return;
        }
        const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
        const actualDuration = reduced ? 0 : duration;
        if (!actualDuration) { renderWheelVisualFrame(targetP); return; }
        els.wheelDisk?.classList.add("probability-morphing");
        let frameId = 0;
        try { await runtime.bounded(() => new Promise(resolve => {
          const started = performance.now();
          const frame = now => {
            const raw = Math.min(1, (now - started) / actualDuration);
            const t = 1 - Math.pow(1 - raw, 3);
            const current = {};
            WHEEL_VISUAL_AMOUNTS.forEach(amount => {
              current[amount] = startP[amount] + (targetP[amount] - startP[amount]) * t;
            });
            renderWheelVisualFrame(current);
            if (raw < 1) frameId = requestAnimationFrame(frame);
            else resolve();
          };
          frameId = requestAnimationFrame(frame);
        }), actualDuration + 1500); }
        catch (_) { cancelAnimationFrame(frameId); }
        els.wheelDisk?.classList.remove("probability-morphing");
        renderWheelVisualFrame(targetP);
      }

      function setWishVisualHighlight(target = null) {
        WHEEL_VISUAL_AMOUNTS.forEach(amount => wheelVisualLabelElement(amount)?.classList.toggle("wish-target", Number(target) === amount));
      }

      async function prepareWheelVisualForCurrentTool() {
        const modifier = ["shield30","upgrade","double_pick","no10"].includes(String(state.shopEquipped || "")) ? String(state.shopEquipped) : null;
        const luckyActive = Number(state.shopLuckyRemaining || 0) > 0;
        const wishTarget = state.shopEquipped === "wish" ? Number(state.shopEquippedParam || 100) : null;
        setWishVisualHighlight(wishTarget);
        const target = effectiveWheelVisualProbabilities(modifier, luckyActive);
        const hasTemporaryVisual = !!modifier || luckyActive;
        state.wheelVisualProfileKey = hasTemporaryVisual ? `${modifier || "none"}:${luckyActive ? "lucky2" : "plain"}` : "base";
        state.wheelVisualRestorePending = hasTemporaryVisual || !!wishTarget;
        await animateWheelVisualProfile(target);
      }

      function restoreWheelVisualProfile({ immediate = false } = {}) {
        state.wheelVisualProfileKey = "base";
        state.wheelVisualRestorePending = false;
        setWishVisualHighlight(null);
        if (immediate) renderWheelVisualFrame(WHEEL_VISUAL_BASE);
        else void animateWheelVisualProfile(WHEEL_VISUAL_BASE, { duration: 560 });
      }

      function wheelAngleForPrize(prize, roll) {
        const segments = state.wheelVisualSegments || buildWheelVisualSegments(WHEEL_VISUAL_BASE);
        let segment = segments[Number(prize)] || segments[10];
        // Defensive fallback for an impossible/zero-width visible sector.
        if (!segment || segment[1] - segment[0] < .0001) {
          segment = buildWheelVisualSegments(WHEEL_VISUAL_BASE)[Number(prize)] || [0,36];
        }
        const safeRoll = Math.abs(Number(roll) || 0);
        const fraction = .24 + ((safeRoll % 997) / 996) * .52;
        return segment[0] + (segment[1] - segment[0]) * fraction;
      }

      async function animateWheelToPrize(prize, roll) {
        if (state.wheelSpinning) return;
        state.wheelSpinning = true;
        els.home?.classList.add("wheel-spinning");
        setBusy(els.spinWheelActionBtn, true);

        const angle = wheelAngleForPrize(prize, roll);
        const current = Number(state.wheelRotation || 0);
        const currentMod = ((current % 360) + 360) % 360;
        const desiredMod = ((360 - angle) % 360 + 360) % 360;
        const deltaToTarget = (desiredMod - currentMod + 360) % 360;
        const turns = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? 2 : 7;
        const target = current + turns * 360 + deltaToTarget;
        const duration = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? 900 : 4700;

        try {
          const animation = els.wheelDisk.animate([
            { transform: `rotate(${current}deg)`, offset: 0 },
            { transform: `rotate(${current + (target-current)*.18}deg)`, offset: .18 },
            { transform: `rotate(${current + (target-current)*.72}deg)`, offset: .58 },
            { transform: `rotate(${target}deg)`, offset: 1 }
          ], {
            duration,
            easing: "cubic-bezier(.12,.66,.12,1)",
            fill: "forwards"
          });
          try { await runtime.bounded(() => animation.finished, duration + 2000); }
          catch (_) { /* Finish at the server's confirmed result after an interrupted animation. */ }
          els.wheelDisk.style.transform = `rotate(${target}deg)`;
          animation.cancel();
          state.wheelRotation = target;
          vibrate([18, 35, 22]);
        } finally {
          state.wheelSpinning = false;
          els.home?.classList.remove("wheel-spinning");
          setBusy(els.spinWheelActionBtn, false);
        }
      }

      function showWheelResult({ prize, preview, cashBefore = 0, cashAfter = 0, modifier = null, firstPrize = null, secondPrize = null, luckyRemaining = null, luckyApplied = false, spinPayout = null, bonusAmount = 0, wishTarget = null, chanceRefunded = false, decisionType = null, decisionChoice = null, challengeCompleted = false, challengeWon = false, challengeBonus = 0, challengeActive = false, challengeSpinsDone = 0, challengeHits = 0 }) {
        const credited = Number(prize || 0);
        const mainAmount = Number(spinPayout ?? credited);
        const first = Number(firstPrize ?? mainAmount);
        const second = secondPrize == null ? null : Number(secondPrize);
        els.wheelResultPrize.textContent = `¥${mainAmount}`;
        els.wheelDoubleResult.hidden = true;
        els.wheelDoubleCardA.classList.remove("selected");
        els.wheelDoubleCardB.classList.remove("selected");
        els.wheelResultExtra.hidden = true;
        els.wheelResultExtra.innerHTML = "";

        const luckyCopy = luckyApplied ? (Number(luckyRemaining) > 0 ? ` · 药水剩 ${Number(luckyRemaining)} 抽` : " · 本次后药水已用完") : "";

        if (preview) {
          els.wheelResultIcon.textContent = mainAmount >= 80 ? "✨" : "🎀";
          els.wheelResultTitle.textContent = `试玩转到了 ¥${mainAmount} ♡`;
          els.wheelResultMessage.textContent = "这次是快乐试玩，所以不会计入可提现余额，也不会留下中奖记录～下次用正式机会把好运带回家吧 ✨";
          els.wheelResultDoneBtn.textContent = "好耶，记住好运 ♡";
        } else if (modifier === "double_pick" && second != null) {
          els.wheelResultIcon.textContent = "✦";
          els.wheelResultTitle.textContent = "命运二选一结果 ♡";
          els.wheelDoubleResult.hidden = false;
          els.wheelDoublePrizeA.textContent = `¥${first}`;
          els.wheelDoublePrizeB.textContent = `¥${second}`;
          if (first >= second) els.wheelDoubleCardA.classList.add("selected");
          if (second >= first) els.wheelDoubleCardB.classList.add("selected");
          els.wheelDoubleChoice.textContent = `已自动选择更高奖励 ¥${mainAmount}`;
          els.wheelResultMessage.textContent = `一次正式机会产生两个结果，系统已经自动把更高的 ¥${mainAmount} 存进小金库。可提现余额 ¥${cashBefore} → ¥${cashAfter}${luckyCopy} ✨`;
          els.wheelResultDoneBtn.textContent = "收下更幸运的那个 ✦";
        } else if (modifier === "shield30") {
          els.wheelResultIcon.textContent = "✦";
          els.wheelResultTitle.textContent = "小幸运护盾生效 ♡";
          els.wheelResultMessage.textContent = first < 30 ? `原本抽到 ¥${first}，护盾已经自动保底到 ¥${mainAmount}。可提现余额 ¥${cashBefore} → ¥${cashAfter}${luckyCopy} ✨` : `这次原本就是 ¥${first}，护盾没有改动奖励。可提现余额 ¥${cashBefore} → ¥${cashAfter}${luckyCopy} ✨`;
          els.wheelResultDoneBtn.textContent = "开心收下 ✦";
        } else if (modifier === "upgrade") {
          els.wheelResultIcon.textContent = "↗";
          els.wheelResultTitle.textContent = "奖励升级成功 ♡";
          els.wheelResultMessage.textContent = mainAmount > first ? `原结果 ¥${first} 已自动升级为 ¥${mainAmount}。可提现余额 ¥${cashBefore} → ¥${cashAfter}${luckyCopy} ✨` : `这次抽到 ¥${first}，已经高于升级范围，奖励保持不变。可提现余额 ¥${cashBefore} → ¥${cashAfter}${luckyCopy} ✨`;
          els.wheelResultDoneBtn.textContent = "开心收下 ✦";
        } else if (modifier === "wish") {
          const hit = Number(bonusAmount || 0) > 0;
          els.wheelResultIcon.textContent = hit ? "✦" : "☆";
          els.wheelResultTitle.textContent = hit ? "愿望成真了 ♡" : "这次愿望擦肩而过";
          els.wheelResultMessage.textContent = hit ? `你许愿 ¥${wishTarget}，转盘真的正好命中！原奖励 ¥${first}，许愿额外 +¥${bonusAmount}，本次共获得 ¥${mainAmount}。可提现余额 ¥${cashBefore} → ¥${cashAfter}${luckyCopy} ✨` : `你许愿 ¥${wishTarget}，这次转到了 ¥${first}。许愿卡已经使用，但没有额外奖励。可提现余额 ¥${cashBefore} → ¥${cashAfter}${luckyCopy}。`;
          els.wheelResultDoneBtn.textContent = hit ? "收下愿望 ✦" : "下次一定会中 ✨";
        } else if (modifier === "no10") {
          els.wheelResultIcon.textContent = "✧";
          els.wheelResultTitle.textContent = "十元退散生效 ♡";
          els.wheelResultMessage.textContent = `本次抽奖已经移除了基础盘面中的 ¥10 档概率，最后获得 ¥${mainAmount}。可提现余额 ¥${cashBefore} → ¥${cashAfter} ✨`;
          els.wheelResultDoneBtn.textContent = "收下好运 ✦";
        } else if (modifier === "return10") {
          els.wheelResultIcon.textContent = chanceRefunded ? "↻" : "✦";
          els.wheelResultTitle.textContent = chanceRefunded ? "幸运返场触发！" : "幸运返场卡已使用";
          els.wheelResultMessage.textContent = chanceRefunded ? `本次抽到 ¥10，¥10 已正常到账，同时正式机会已经返还 1 次。可提现余额 ¥${cashBefore} → ¥${cashAfter} ✨` : `本次获得 ¥${mainAmount}，没有触发 ¥10 返场条件。可提现余额 ¥${cashBefore} → ¥${cashAfter}。`;
          els.wheelResultDoneBtn.textContent = chanceRefunded ? "再给好运一次机会 ♡" : "开心收下";
        } else if (modifier === "restart" || decisionType === "restart") {
          const rerolled = decisionChoice === "reroll" && second != null;
          els.wheelResultIcon.textContent = "↻";
          els.wheelResultTitle.textContent = rerolled ? "命运已经重写 ♡" : "稳稳收下这一次";
          els.wheelResultMessage.textContent = rerolled ? `第一次是 ¥${first}，你选择重启命运，第二次抽到 ¥${second}。第二个结果必须接受，本次最终获得 ¥${mainAmount}。可提现余额 ¥${cashBefore} → ¥${cashAfter}${luckyCopy}。` : `第一次是 ¥${first}，你决定不再重抽，稳稳收下 ¥${mainAmount}。可提现余额 ¥${cashBefore} → ¥${cashAfter}${luckyCopy}。`;
          els.wheelResultDoneBtn.textContent = "接受这次命运 ✦";
        } else if (decisionType === "heartbeat") {
          const risked = decisionChoice === "risk_win" || decisionChoice === "risk_lose";
          els.wheelResultIcon.textContent = risked ? "♡" : "✦";
          els.wheelResultTitle.textContent = decisionChoice === "risk_win" ? "心跳一搏 · 翻倍成功！" : decisionChoice === "risk_lose" ? "心跳一搏 · 这次回落" : "稳稳收下 ♡";
          els.wheelResultMessage.textContent = decisionChoice === "risk_win" ? `原结果 ¥${first}，心跳一搏成功翻倍，本次获得 ¥${mainAmount}！可提现余额 ¥${cashBefore} → ¥${cashAfter}${luckyCopy}。` : decisionChoice === "risk_lose" ? `原结果 ¥${first}，这次心跳一搏落在减半结果，本次获得 ¥${mainAmount}。可提现余额 ¥${cashBefore} → ¥${cashAfter}${luckyCopy}。` : `你选择不使用心跳翻倍卡，¥${mainAmount} 正常到账，道具没有消耗。可提现余额 ¥${cashBefore} → ¥${cashAfter}${luckyCopy}。`;
          els.wheelResultDoneBtn.textContent = "心跳结束 ♡";
        } else {
          els.wheelResultIcon.textContent = mainAmount >= 80 ? "🎉" : "💛";
          els.wheelResultTitle.textContent = "恭喜宝宝抽中啦 ♡";
          els.wheelResultMessage.textContent = `可提现余额 ¥${cashBefore} → ¥${cashAfter} ✨ 这次好运已经正式存进小金库啦！${luckyCopy}`;
          els.wheelResultDoneBtn.textContent = "开心收下 ✨";
        }

        if (challengeCompleted) {
          els.wheelResultExtra.hidden = false;
          els.wheelResultExtra.innerHTML = challengeWon ? `<strong>🔥 三连挑战完成</strong><br>3 抽里至少 2 次达到 ¥50，额外奖励 <b>+¥${Number(challengeBonus || 20)}</b> 已一起进入小金库。` : `<strong>三连挑战结束</strong><br>这组三抽没有达到 2 次 ¥50，不过下一张挑战卡还可以再来一次 ♡`;
        } else if (challengeActive) {
          els.wheelResultExtra.hidden = false;
          els.wheelResultExtra.innerHTML = `<strong>🔥 三连挑战继续</strong><br>已完成 ${Number(challengeSpinsDone || 0)}/3 抽 · ≥¥50 已命中 ${Number(challengeHits || 0)}/2。`;
        }
        setLayer(els.wheelResultLayer, true);
      }

      function openPendingDecision(pending) {
        if (!pending) return;
        const type = String(pending.type || pending.pending_type || ""), amount = Number(pending.initial_prize || pending.prize_amount || 0);
        state.shopPendingSpin = { type, initial_prize: amount, initial_roll: Number(pending.initial_roll || pending.roll || 0) };
        els.wheelDecisionPrize.textContent = `¥${amount}`;
        els.wheelDecisionOdds.hidden = true;
        if (type === "restart") {
          els.wheelDecisionIcon.textContent = "↻";
          els.wheelDecisionTitle.textContent = "命运重启 · 要改写结果吗？";
          els.wheelDecisionMessage.textContent = `这一抽是 ¥${amount}。你可以稳稳收下，也可以放弃它重新抽一次；一旦重抽，第二个结果必须接受，可能更高，也可能更低。`;
          els.wheelDecisionRiskBtn.textContent = "重新抽一次";
          els.wheelDecisionAcceptBtn.textContent = `稳稳收下 ¥${amount}`;
        } else {
          els.wheelDecisionIcon.textContent = "♡";
          els.wheelDecisionTitle.textContent = "心跳时刻 · 要搏一把吗？";
          els.wheelDecisionMessage.textContent = "你背包里的心跳翻倍卡现在可以使用。只有真的选择“心跳一搏”才会消耗这张卡。";
          els.wheelDecisionOdds.hidden = false;
          els.wheelDecisionOdds.innerHTML = `<strong>50%</strong> → ¥${amount * 2}<br><strong>50%</strong> → ¥${amount / 2}`;
          els.wheelDecisionRiskBtn.textContent = "心跳一搏";
          els.wheelDecisionAcceptBtn.textContent = `稳稳收下 ¥${amount}`;
        }
        setLayer(els.wheelDecisionLayer, true);
      }

      async function resolvePendingWheelDecision(choice) {
        if (!state.shopPendingSpin) return;
        const type = String(state.shopPendingSpin.type || ""), cashBefore = Number(state.wheelCashBalance || 0), firstPrize = Number(state.shopPendingSpin.initial_prize || 0);
        setBusy(els.wheelDecisionRiskBtn, true); setBusy(els.wheelDecisionAcceptBtn, true);
        try {
          const { data, error } = await db.rpc("points_shop_resolve_pending_spin_v2", { p_choice: choice });
          if (error) throw error;
          const row = Array.isArray(data) ? data[0] : data;
          setLayer(els.wheelDecisionLayer, false);
          if (type === "restart" && choice === "reroll" && row?.second_prize != null) {
            await animateWheelToPrize(Number(row.visual_prize ?? row.second_prize), Number(row.roll ?? row.second_roll));
          }
          state.wheelChances = Number(row?.spin_chances ?? state.wheelChances);
          state.wheelCashBalance = Number(row?.cash_balance ?? cashBefore + Number(row?.prize_amount || 0));
          state.wheelUpdatedAt = row?.wheel_updated_at ?? new Date().toISOString();
          state.overviewLoadedAt = 0; state.shopPendingSpin = null;
          renderPrimaryMetric(); await silentSyncAfterWheelSpin(); await loadShopState({ silent: true }); renderWheelItemNotice(); renderWheelChallengeProgress();
          showWheelResult({
            prize:Number(row?.prize_amount||0), spinPayout:Number(row?.spin_payout ?? row?.prize_amount ?? 0), preview:false, cashBefore, cashAfter:state.wheelCashBalance,
            modifier:String(row?.modifier||"")||null, firstPrize:Number(row?.first_prize??firstPrize), secondPrize:row?.second_prize==null?null:Number(row.second_prize),
            luckyRemaining:Number(row?.lucky100_remaining??state.shopLuckyRemaining), luckyApplied:row?.lucky100_applied===true,
            bonusAmount:Number(row?.bonus_amount||0), wishTarget:row?.wish_target, chanceRefunded:row?.chance_refunded===true,
            decisionType:String(row?.decision_type||type)||type, decisionChoice:String(row?.decision_choice||""),
            challengeCompleted:row?.challenge_completed===true, challengeWon:row?.challenge_won===true, challengeBonus:Number(row?.challenge_bonus||0),
            challengeActive:row?.challenge_active===true, challengeSpinsDone:Number(row?.challenge_spins_done||0), challengeHits:Number(row?.challenge_hits||0)
          });
          if (state.overviewMode !== "closed") await loadOverviewData(true);
        } catch (err) {
          if (runtime.unknownWrite(err)) { showToast(runtime.uncertainMessage); return; }
          console.error("resolvePendingWheelDecision:", err);
          showToast(shopMissingError(err) ? "请先运行积分商城 v2 数据库迁移 SQL" : "这次决定没有保存成功，请再试一次");
          await loadShopState({ silent: true });
        } finally { setBusy(els.wheelDecisionRiskBtn, false); setBusy(els.wheelDecisionAcceptBtn, false); }
      }

      async function silentSyncBeforeWheelSpin() {
        try {
          const [scoreRes, wheelRes] = await Promise.all([db.rpc("points_get_state"), db.rpc("points_get_wheel_state")]);
          if (!scoreRes.error) { const row = Array.isArray(scoreRes.data) ? scoreRes.data[0] : scoreRes.data; if (row && typeof row.score === "number") { state.score = Number(row.score); state.updatedAt = row.updated_at ?? state.updatedAt; } }
          if (!wheelRes.error) { const wheelRow = Array.isArray(wheelRes.data) ? wheelRes.data[0] : wheelRes.data; if (wheelRow) { state.wheelChances = Number(wheelRow.spin_chances ?? state.wheelChances ?? 0); state.wheelCashBalance = Number(wheelRow.cash_balance ?? state.wheelCashBalance ?? 0); state.wheelUpdatedAt = wheelRow.updated_at ?? state.wheelUpdatedAt ?? null; } }
          renderPrimaryMetric(); return true;
        } catch (err) { console.debug("silentSyncBeforeWheelSpin:", err); return false; }
      }

      async function silentSyncAfterWheelSpin() { try { await loadAppState({ silent: true }); } catch (err) { console.debug("silentSyncAfterWheelSpin:", err); } }

      async function performFormalWheelSpin() {
        if (state.wheelSpinning) return;
        if (state.isAdmin) return openWheelPreviewPrompt();
        if (state.shopPendingSpin) return openPendingDecision(state.shopPendingSpin);
        if (state.wheelChances <= 0) return openWheelPreviewPrompt();
        const cashBefore = Number(state.wheelCashBalance || 0);
        try {
          await prepareWheelVisualForCurrentTool();
          let row = null, usedV2 = false;
          if (state.shopAvailable !== false) {
            const { data, error } = await db.rpc("points_shop_spin_wheel_v2");
            if (error) { if (!shopMissingError(error)) throw error; state.shopAvailable = false; }
            else { row = Array.isArray(data) ? data[0] : data; state.shopAvailable = true; usedV2 = true; }
          }
          if (!row) {
            const { data, error } = await db.rpc("points_spin_wheel"); if (error) throw error; row = Array.isArray(data) ? data[0] : data;
          }

          const visualPrize = Number(row?.visual_prize ?? row?.prize_amount ?? 0), roll = Number(row?.roll);
          state.wheelChances = Number(row?.spin_chances ?? Math.max(0, state.wheelChances - 1));
          state.wheelCashBalance = Number(row?.cash_balance ?? state.wheelCashBalance);
          state.wheelUpdatedAt = row?.wheel_updated_at ?? new Date().toISOString();
          state.overviewLoadedAt = 0; renderPrimaryMetric();
          await animateWheelToPrize(visualPrize, roll); renderPrimaryMetric();

          if (usedV2 && String(row?.status || "") === "pending") {
            await loadShopState({ silent: true }); renderWheelItemNotice(); renderWheelChallengeProgress();
            openPendingDecision({ type: row.pending_type, initial_prize: visualPrize, initial_roll: roll });
            return;
          }

          await silentSyncAfterWheelSpin(); if (usedV2) await loadShopState({ silent: true }); renderWheelItemNotice(); renderWheelChallengeProgress();
          const modifier = usedV2 ? String(row?.modifier || "") || null : null;
          showWheelResult({
            prize:Number(row?.prize_amount||0), spinPayout:Number(row?.spin_payout ?? row?.prize_amount ?? 0), preview:false, cashBefore, cashAfter:state.wheelCashBalance,
            modifier, firstPrize:usedV2?Number(row?.first_prize??visualPrize):visualPrize, secondPrize:usedV2&&row?.second_prize!=null?Number(row.second_prize):null,
            luckyRemaining:usedV2?Number(row?.lucky100_remaining??state.shopLuckyRemaining):null, luckyApplied:usedV2&&row?.lucky100_applied===true,
            bonusAmount:usedV2?Number(row?.bonus_amount||0):0, wishTarget:usedV2?row?.wish_target:null, chanceRefunded:usedV2&&row?.chance_refunded===true,
            decisionType:usedV2?String(row?.decision_type||"")||null:null, decisionChoice:usedV2?String(row?.decision_choice||""):null,
            challengeCompleted:usedV2&&row?.challenge_completed===true, challengeWon:usedV2&&row?.challenge_won===true, challengeBonus:usedV2?Number(row?.challenge_bonus||0):0,
            challengeActive:usedV2&&row?.challenge_active===true, challengeSpinsDone:usedV2?Number(row?.challenge_spins_done||0):0, challengeHits:usedV2?Number(row?.challenge_hits||0):0
          });
          if (state.overviewMode !== "closed") await loadOverviewData(true);
        } catch (err) {
          if (runtime.unknownWrite(err)) { showToast(runtime.uncertainMessage); return; }
          if (state.wheelVisualRestorePending) restoreWheelVisualProfile();
          console.error("performFormalWheelSpin:", err); const message = String(err?.message || "");
          if (/Pending spin/i.test(message)) { await loadShopState({ silent: true }); if (state.shopPendingSpin) openPendingDecision(state.shopPendingSpin); }
          else if (/No wheel chance/i.test(message)) { await loadAppState({ silent: true }); openWheelPreviewPrompt(); }
          else if (/Guest mode required|permission/i.test(message)) { await refreshAuthState(); openWheelPreviewPrompt(); }
          else if (/PGRST202|schema cache|Could not find/i.test(message)) showToast("请先运行积分商城 v3 数据库迁移 SQL");
          else showToast("转盘暂时没有转起来，再试一次吧");
        }
      }

      async function performPreviewWheelSpin() {
        if (state.wheelSpinning) return;
        setBusy(els.wheelPreviewConfirmBtn, true);
        try {
          if (state.wheelVisualProfileKey !== "base") restoreWheelVisualProfile({ immediate: true });
          const { data, error } = await db.rpc("points_preview_wheel");
          if (error) throw error;
          const row = Array.isArray(data) ? data[0] : data;
          const prize = Number(row?.prize_amount || 0);
          const roll = Number(row?.roll);
          setLayer(els.wheelPreviewLayer, false);
          await animateWheelToPrize(prize, roll);
          await silentSyncAfterWheelSpin();
          showWheelResult({ prize, preview: true });
        } catch (err) {
          if (runtime.unknownWrite(err)) { showToast(runtime.uncertainMessage); return; }
          console.error("performPreviewWheelSpin:", err);
          showToast(/PGRST202|schema cache|Could not find/i.test(String(err?.message || ""))
            ? "请先运行 v2.0 数据库迁移 SQL"
            : "试玩转盘暂时没有转起来");
        } finally {
          setBusy(els.wheelPreviewConfirmBtn, false);
        }
      }

      function openWheelWithdrawPrompt() {
        if (state.isAdmin) return showToast("管理员不能替游客申请提现");
        const cash = Math.max(0, Number(state.wheelCashBalance ?? 0));
        if (cash <= 0) return showToast("💰 目前还没有可提现余额哦 ♡");
        els.wheelWithdrawMessage.textContent = `当前可提现余额 ¥${cash} ♡ 提交后金额会立即从可提现余额中扣除，并进入“等待管理员兑现”。`;
        els.wheelWithdrawAmount.value = "";
        els.wheelWithdrawAmount.max = String(cash);
        setLayer(els.wheelWithdrawLayer, true);
        setTimeout(() => els.wheelWithdrawAmount.focus(), 220);
      }

      async function performWheelWithdraw() {
        if (state.isAdmin) return showToast("管理员不能替游客申请提现");
        const amount = Number(els.wheelWithdrawAmount.value);
        const cashBefore = Math.max(0, Number(state.wheelCashBalance ?? 0));
        if (!Number.isInteger(amount) || amount <= 0) return showToast("请输入正确的提现金额");
        if (amount > cashBefore) return showToast(`最多可以申请 ¥${cashBefore}`);
        setBusy(els.wheelWithdrawConfirmBtn, true);
        try {
          const { data, error } = await db.rpc("points_request_withdrawal", { p_amount: amount });
          if (error) throw error;
          const row = Array.isArray(data) ? data[0] : data;
          state.wheelChances = Number(row?.spin_chances ?? state.wheelChances);
          state.wheelCashBalance = Number(row?.cash_balance ?? cashBefore - amount);
          state.wheelUpdatedAt = row?.wheel_updated_at ?? new Date().toISOString();
          state.overviewLoadedAt = 0;
          setLayer(els.wheelWithdrawLayer, false);
          renderPrimaryMetric();
          vibrate(18);
          showToast(`💰 已提交 ¥${amount} 提现申请，等待管理员兑现`);
          await loadOverviewData(true);
        } catch (err) {
          if (runtime.unknownWrite(err)) { showToast(runtime.uncertainMessage); return; }
          console.error("performWheelWithdraw:", err);
          const message = String(err?.message || "");
          if (/exceeds cash balance/i.test(message)) {
            await loadAppState({ silent: true });
            showToast("余额刚刚发生变化，请重新输入");
          } else if (/Guest mode required|permission/i.test(message)) {
            await refreshAuthState();
            showToast("当前不是游客模式，不能申请提现");
          } else if (/PGRST202|schema cache|Could not find/i.test(message)) {
            showToast("请先运行 v2.0 数据库迁移 SQL");
          } else showToast("提现申请提交失败");
        } finally {
          setBusy(els.wheelWithdrawConfirmBtn, false);
        }
      }

      function openSettlementPrompt(id) {
        if (!state.isAdmin) return showToast("只有管理员可以确认兑现");
        const row = state.withdrawals.find(item => Number(item.id) === Number(id));
        if (!row || row.status !== "pending") return showToast("这笔提现已经处理或不存在");
        state.pendingSettlementId = Number(row.id);
        els.settleWithdrawalMessage.textContent = `游客申请提现 ¥${Number(row.amount)}。请确认你已经实际完成兑现；确认后该申请会从待办消失，并在双方历史中显示“管理员已经兑现提现申请。请查收。”`;
        els.settleWithdrawalConfirmBtn.textContent = `已经兑现 ¥${Number(row.amount)}`;
        setLayer(els.settleWithdrawalLayer, true);
      }

      async function settleWithdrawal() {
        if (!state.isAdmin || !state.pendingSettlementId) return;
        setBusy(els.settleWithdrawalConfirmBtn, true);
        try {
          const { error } = await db.rpc("points_admin_settle_withdrawal", {
            p_withdrawal_id: state.pendingSettlementId
          });
          if (error) throw error;
          setLayer(els.settleWithdrawalLayer, false);
          state.pendingSettlementId = null;
          state.overviewLoadedAt = 0;
          vibrate(18);
          showToast("✅ 已确认兑现，游客会在历史中看到到账提醒");
          await loadOverviewData(true);
        } catch (err) {
          if (runtime.unknownWrite(err)) { showToast(runtime.uncertainMessage); return; }
          console.error("settleWithdrawal:", err);
          const message = String(err?.message || "");
          if (/already settled/i.test(message)) showToast("这笔提现已经兑现");
          else if (/Admin permission|required|permission/i.test(message)) {
            await refreshAuthState();
            showToast("管理员权限已失效");
          } else showToast("确认兑现失败");
        } finally {
          setBusy(els.settleWithdrawalConfirmBtn, false);
        }
      }

      // -------------------- Overview data --------------------
      function getOverviewStart() {
        const now = new Date();
        const sixMonthsAgo = addMonths(startOfMonth(now), -6);
        const calendarStart = addMonths(startOfMonth(state.calendarDate), -1);
        return sixMonthsAgo < calendarStart ? sixMonthsAgo : calendarStart;
      }

      async function loadOverviewData(force = false) {
        const now = Date.now();
        if (!force && state.overviewLoadedAt && now - state.overviewLoadedAt < 30 * 60 * 1000) {
          renderOverview();
          return;
        }
        els.scoreOverviewContent.dataset.pointsSynced = "false";
        els.wheelOverviewContent.dataset.pointsSynced = "false";
        try {
          const [scoreRes, wheelRes, withdrawalRes] = await Promise.all([
            db.rpc("points_get_logs", { p_from: null, p_to: null, p_limit: 10000 }),
            db.rpc("points_get_wheel_logs", { p_from: null, p_to: null, p_limit: 10000 }),
            db.rpc("points_get_withdrawals", { p_limit: 10000 })
          ]);
          if (scoreRes.error) throw scoreRes.error;
          if (wheelRes.error) throw wheelRes.error;
          if (withdrawalRes.error) throw withdrawalRes.error;
          state.overviewLogs = Array.isArray(scoreRes.data) ? scoreRes.data : [];
          state.wheelLogs = Array.isArray(wheelRes.data) ? wheelRes.data : [];
          state.withdrawals = Array.isArray(withdrawalRes.data) ? withdrawalRes.data : [];
          try {
            const totalsRes = await db.rpc("points_get_wheel_totals");
            if (!totalsRes.error) {
              const totalsRow = Array.isArray(totalsRes.data) ? totalsRes.data[0] : totalsRes.data;
              state.wheelTotals = totalsRow ? {
                total_won: Number(totalsRow.total_won ?? 0),
                total_settled: Number(totalsRow.total_settled ?? 0)
              } : null;
            } else {
              state.wheelTotals = null;
            }
          } catch (_) {
            state.wheelTotals = null;
          }
          state.overviewLoadedAt = Date.now();
          els.scoreOverviewContent.dataset.pointsSynced = "true";
          els.wheelOverviewContent.dataset.pointsSynced = "true";
          markRefreshed();
          renderOverview();
        } catch (err) {
          console.error("loadOverviewData:", err);
          showToast(/points_get_withdrawals|PGRST202|schema cache|Could not find/i.test(String(err?.message || ""))
            ? "请先运行 v2.0 数据库迁移 SQL"
            : "读取总览失败");
        }
      }

      function logsAscending() {
        return [...state.overviewLogs].sort((a,b) => {
          const t = new Date(a.created_at) - new Date(b.created_at);
          return t || Number(a.id) - Number(b.id);
        });
      }

      function logsDescending() {
        return [...state.overviewLogs].sort((a,b) => {
          const t = new Date(b.created_at) - new Date(a.created_at);
          return t || Number(b.id) - Number(a.id);
        });
      }

      function renderOverview() {
        renderTrend();
        renderCalendar();
        renderWheelOverview();
        renderOverviewContentMode();
      }

      // -------------------- Trend --------------------
      function scoreAtRangeStart(rangeStart, logs) {
        const firstAtOrAfter = logs.find(log => new Date(log.created_at) >= rangeStart);
        if (firstAtOrAfter) return Number(firstAtOrAfter.score_before);

        const latestBefore = [...logs].filter(log => new Date(log.created_at) < rangeStart).at(-1);
        if (latestBefore) return Number(latestBefore.score_after);

        return Number(state.score ?? 5);
      }

      function trendMonthWeekName(week) {
        return ["", "第一周", "第二周", "第三周", "第四周"][Number(week)] || "第一周";
      }

      function getMonthTrendWindow(date = new Date(), week = state.trendMonthWeek) {
        const year = date.getFullYear();
        const month = date.getMonth();
        const selectedWeek = Math.min(4, Math.max(1, Number(week) || 1));
        const lastDay = new Date(year, month + 1, 0).getDate();
        const startDay = selectedWeek === 1 ? 1
          : selectedWeek === 2 ? 8
            : selectedWeek === 3 ? 15
              : 22;
        const endDayExclusive = selectedWeek === 1 ? 8
          : selectedWeek === 2 ? 15
            : selectedWeek === 3 ? 22
              : lastDay + 1;

        return {
          week: selectedWeek,
          start: new Date(year, month, startDay),
          end: new Date(year, month, endDayExclusive),
          startDay,
          endDay: selectedWeek === 4 ? lastDay : endDayExclusive - 1,
          label: `本月${trendMonthWeekName(selectedWeek)}`
        };
      }

      function syncTrendControls() {
        const monthActive = state.trendRange === "month";
        els.trendSegments.querySelectorAll(".segment[data-range]").forEach(btn => {
          btn.classList.toggle("active", btn.dataset.range === state.trendRange);
        });
        els.trendMonthBtn.classList.toggle("active", monthActive);
        els.trendMonthLabel.textContent = monthActive
          ? trendMonthWeekName(state.trendMonthWeek)
          : "本月";

        els.trendMonthMenu.querySelectorAll("[data-month-week]").forEach(btn => {
          btn.classList.toggle("active", Number(btn.dataset.monthWeek) === Number(state.trendMonthWeek));
        });
      }

      function setTrendMonthMenu(open) {
        const shouldOpen = Boolean(open);
        els.trendMonthMenu.hidden = !shouldOpen;
        els.trendMonthBtn.setAttribute("aria-expanded", String(shouldOpen));
        els.trendMonthBtn.closest(".trend-month-control")?.classList.toggle("menu-open", shouldOpen);
      }

      function buildTrendPoints(range) {
        const now = new Date();
        const logs = logsAscending();

        if (range === "today") {
          const start = startOfDay(now);
          let running = scoreAtRangeStart(start, logs);
          const todayLogs = logs.filter(log => {
            const t = new Date(log.created_at);
            return t >= start && t <= now;
          });

          const points = [{ label: "00:00", value: running, date: start }];
          for (const log of todayLogs) {
            running = Number(log.score_after);
            points.push({
              label: formatTime(log.created_at),
              value: running,
              date: new Date(log.created_at)
            });
          }

          const nowLabel = new Intl.DateTimeFormat("zh-CN", {
            hour: "2-digit", minute: "2-digit", hour12: false
          }).format(now);
          if (points.length === 1 || Number(points.at(-1).date) < Number(now)) {
            points.push({
              label: nowLabel,
              value: Number(state.score ?? running),
              date: now
            });
          }
          return points;
        }

        let start;
        let end;
        let totalDays;
        let labels;

        if (range === "week") {
          start = startOfWeekMonday(now);
          end = addDays(start, 7);
          totalDays = 7;
          labels = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
        } else {
          const window = getMonthTrendWindow(now);
          start = window.start;
          end = window.end;
          totalDays = Math.round((end - start) / 86400000);
          labels = Array.from({ length: totalDays }, (_, i) => `${addDays(start, i).getDate()}日`);
        }

        let running = scoreAtRangeStart(start, logs);
        const points = [];

        for (let i = 0; i < totalDays; i++) {
          const dayStart = addDays(start, i);
          const dayEnd = addDays(dayStart, 1);
          const isFuture = dayStart > now;

          if (!isFuture) {
            const bucketLogs = logs.filter(log => {
              const t = new Date(log.created_at);
              return t >= dayStart && t < dayEnd && t <= now;
            });
            for (const log of bucketLogs) running = Number(log.score_after);
          }

          points.push({
            label: labels[i],
            value: isFuture ? null : running,
            date: dayEnd
          });
        }

        return points;
      }

      function renderTrend() {
        syncTrendControls();
        const points = buildTrendPoints(state.trendRange);
        drawTrend(points);

        const now = new Date();
        let start;
        let end;
        let rangeLabel;

        if (state.trendRange === "today") {
          start = startOfDay(now);
          end = now;
          rangeLabel = "今天";
        } else if (state.trendRange === "week") {
          start = startOfWeekMonday(now);
          end = now;
          rangeLabel = "本周";
        } else {
          const window = getMonthTrendWindow(now);
          start = window.start;
          end = window.end < now ? window.end : now;
          rangeLabel = window.label;
        }

        const visibleLogs = state.overviewLogs.filter(log => {
          const t = new Date(log.created_at);
          return t >= start && t < end;
        });

        els.chartCaption.textContent = visibleLogs.length
          ? `${rangeLabel} ${visibleLogs.length} 次变更`
          : `${rangeLabel}暂无变更`;
      }

      function drawTrend(points) {
        const canvas = els.trendCanvas;
        const rect = canvas.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));

        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);

        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.setTransform(dpr,0,0,dpr,0,0);
        ctx.clearRect(0,0,rect.width,rect.height);

        const valid = points.map((point,index) => ({ point,index }))
          .filter(item => item.point.value !== null && Number.isFinite(Number(item.point.value)));

        if (!points.length || !valid.length) {
          els.chartEmpty.hidden = false;
          return;
        }
        els.chartEmpty.hidden = true;

        const values = valid.map(item => Number(item.point.value));
        let min = Math.min(...values);
        let max = Math.max(...values);
        if (min === max) {
          min -= 1;
          max += 1;
        } else {
          const valuePad = Math.max(1, (max - min) * .22);
          min -= valuePad;
          max += valuePad;
        }

        // Extra top room is reserved for the permanent value label above each blue point.
        const pad = { l: 13, r: 13, t: 38, b: 31 };
        const w = rect.width - pad.l - pad.r;
        const h = rect.height - pad.t - pad.b;
        const styles = getComputedStyle(document.documentElement);
        const tertiary = styles.getPropertyValue("--tertiary").trim();
        const hairline = styles.getPropertyValue("--hairline").trim();
        const blue = styles.getPropertyValue("--blue").trim();

        ctx.lineWidth = 1;
        ctx.strokeStyle = hairline;
        for (let i = 0; i < 3; i++) {
          const y = pad.t + (h * i / 2);
          ctx.beginPath();
          ctx.moveTo(pad.l, y + .5);
          ctx.lineTo(rect.width - pad.r, y + .5);
          ctx.stroke();
        }

        const xFor = index => points.length === 1
          ? pad.l + w / 2
          : pad.l + (w * index / (points.length - 1));
        const yFor = value => pad.t + h - ((value - min) / (max - min)) * h;

        if (valid.length >= 2) {
          const gradient = ctx.createLinearGradient(0, pad.t, 0, pad.t + h);
          gradient.addColorStop(0, "rgba(10,132,255,.20)");
          gradient.addColorStop(1, "rgba(10,132,255,0)");

          ctx.beginPath();
          valid.forEach(({point,index},i) => {
            const x = xFor(index), y = yFor(Number(point.value));
            if (i === 0) ctx.moveTo(x,y);
            else ctx.lineTo(x,y);
          });
          ctx.lineTo(xFor(valid.at(-1).index), pad.t + h);
          ctx.lineTo(xFor(valid[0].index), pad.t + h);
          ctx.closePath();
          ctx.fillStyle = gradient;
          ctx.fill();

          ctx.beginPath();
          valid.forEach(({point,index},i) => {
            const x = xFor(index), y = yFor(Number(point.value));
            if (i === 0) ctx.moveTo(x,y);
            else ctx.lineTo(x,y);
          });
          ctx.strokeStyle = blue;
          ctx.lineWidth = 2.5;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.stroke();
        }

        // Blue points. The latest visible point is slightly larger for orientation.
        valid.forEach(({point,index}, validIndex) => {
          const x = xFor(index), y = yFor(Number(point.value));
          const radius = validIndex === valid.length - 1 ? 4.1 : 3.25;
          ctx.beginPath();
          ctx.arc(x,y,radius,0,Math.PI*2);
          ctx.fillStyle = blue;
          ctx.fill();
        });

        // Permanent score number above every visible blue point.
        // Dense "today" data alternates between two small heights, but all labels stay above their point.
        const dense = valid.length >= 9;
        const veryDense = valid.length >= 14;
        ctx.fillStyle = blue;
        ctx.font = `${veryDense ? 600 : 650} ${veryDense ? 10 : dense ? 10.5 : 11.5}px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";

        valid.forEach(({point,index}, validIndex) => {
          const x = xFor(index);
          const y = yFor(Number(point.value));
          const stagger = dense && validIndex % 2 ? 10 : 0;
          ctx.fillText(String(point.value), x, Math.max(12, y - 7 - stagger));
        });

        // X-axis labels: weekly / month-week views show every date.
        // Only a very busy "today" timeline thins the time labels.
        ctx.fillStyle = tertiary;
        ctx.font = '11px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const showEvery = points.length > 14 ? 3 : points.length > 10 ? 2 : 1;
        points.forEach((point,index) => {
          if (index % showEvery === 0 || index === points.length - 1) {
            ctx.fillText(point.label, xFor(index), rect.height - 18);
          }
        });
      }

      // -------------------- Calendar --------------------
      function renderCalendar() {
        const month = state.calendarDate;
        els.calendarMonth.textContent = formatMonth(month);
        els.calendarGrid.innerHTML = "";

        const first = startOfMonth(month);
        const next = endOfMonthExclusive(month);
        const firstWeekday = first.getDay();
        const daysInMonth = Math.round((next - first) / 86400000);
        const movementByDay = new Map();
        const blankMovement = () => ({ up: 0, down: 0, rewardChance: 0, rewardCash: 0, wheelWin: 0, withdrawal: 0 });

        for (const log of state.overviewLogs) {
          const t = new Date(log.created_at);
          if (t < first || t >= next) continue;
          const k = dateKey(t);
          const movement = movementByDay.get(k) || blankMovement();
          const delta = Number(log.delta) || 0;
          if (delta > 0) movement.up += delta;
          if (delta < 0) movement.down += Math.abs(delta);
          movementByDay.set(k, movement);
        }

        for (const log of state.wheelLogs) {
          const t = new Date(log.created_at);
          if (t < first || t >= next) continue;
          const k = dateKey(t);
          const movement = movementByDay.get(k) || blankMovement();
          const action = String(log.action || "");
          if (action === "spin_win") movement.wheelWin += Math.max(0, Number(log.prize_amount ?? 0));
          if (action === "chance_redeem") movement.rewardChance += Math.max(0, Number(log.chance_delta ?? 0));
          if (action === "cash_redeem") movement.rewardCash += Math.max(0, Number(log.cash_delta ?? 0));
          movementByDay.set(k, movement);
        }

        for (const row of state.withdrawals) {
          const t = new Date(row.requested_at);
          if (t < first || t >= next) continue;
          const k = dateKey(t);
          const movement = movementByDay.get(k) || blankMovement();
          movement.withdrawal += Math.max(0, Number(row.amount ?? 0));
          movementByDay.set(k, movement);
        }

        for (let i = 0; i < firstWeekday; i++) {
          const blank = document.createElement("div");
          blank.className = "day placeholder";
          els.calendarGrid.appendChild(blank);
        }

        const today = new Date();
        const arrowUp = `<svg class="movement-arrow" viewBox="0 0 10 12" aria-hidden="true"><path d="M5 10.5V1.7M1.8 4.8 5 1.5l3.2 3.3" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        const arrowDown = `<svg class="movement-arrow" viewBox="0 0 10 12" aria-hidden="true"><path d="M5 1.5v8.8M1.8 7.2 5 10.5l3.2-3.3" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

        for (let day = 1; day <= daysInMonth; day++) {
          const d = new Date(month.getFullYear(), month.getMonth(), day);
          const key = dateKey(d);
          const movement = movementByDay.get(key) || blankMovement();
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "day pressable";
          btn.dataset.dateKey = key;
          btn.setAttribute("aria-label", `${month.getMonth()+1}月${day}日，加分 ${movement.up}，扣分 ${movement.down}，兑换转盘机会 ${movement.rewardChance} 次，直接兑换现金 ${movement.rewardCash} 元，转盘中奖 ${movement.wheelWin} 元，提现申请 ${movement.withdrawal} 元`);
          if (sameDay(d, today)) btn.classList.add("today");
          if (state.selectedDayKey === key) btn.classList.add("selected");

          const upHTML = movement.up > 0 ? `<span class="movement up">${arrowUp}<b>${movement.up}</b></span>` : "";
          const downHTML = movement.down > 0 ? `<span class="movement down">${arrowDown}<b>${movement.down}</b></span>` : "";
          const chanceHTML = movement.rewardChance > 0 ? `<span class="movement reward-chance-day">🎟️<b>+${movement.rewardChance}</b></span>` : "";
          const cashHTML = movement.rewardCash > 0 ? `<span class="movement reward-cash-day">💰<b>+¥${movement.rewardCash}</b></span>` : "";
          const wheelHTML = movement.wheelWin > 0 ? `<span class="movement wheel-win-day">🎠<b>+¥${movement.wheelWin}</b></span>` : "";
          const withdrawHTML = movement.withdrawal > 0 ? `<span class="movement withdrawal-day">💸<b>¥${movement.withdrawal}</b></span>` : "";
          btn.innerHTML = `<span class="day-number">${day}</span><span class="day-movements">${upHTML}${downHTML}${chanceHTML}${cashHTML}${wheelHTML}${withdrawHTML}</span>`;
          btn.addEventListener("click", () => selectCalendarDay(d));
          els.calendarGrid.appendChild(btn);
        }

        const usedCells = firstWeekday + daysInMonth;
        const trailing = (7 - (usedCells % 7)) % 7;
        for (let i = 0; i < trailing; i++) {
          const blank = document.createElement("div");
          blank.className = "day placeholder";
          els.calendarGrid.appendChild(blank);
        }
        renderSelectedDayDetail();
      }

      function selectCalendarDay(d) {
        const key = dateKey(d);
        state.selectedDayKey = state.selectedDayKey === key ? null : key;
        renderCalendar();
      }

      function renderSelectedDayDetail() {
        if (!state.selectedDayKey) {
          els.dayDetail.classList.add("hidden");
          return;
        }
        const [y,m,d] = state.selectedDayKey.split("-").map(Number);
        const selected = new Date(y, m-1, d);
        const start = startOfDay(selected);
        const end = addDays(start, 1);
        const scoreDayLogs = logsAscending().filter(l => {
          const t = new Date(l.created_at); return t >= start && t < end;
        });
        const wheelDayLogs = state.wheelLogs.filter(l => {
          const t = new Date(l.created_at); return t >= start && t < end;
        });
        const withdrawalDayLogs = state.withdrawals.filter(l => {
          const t = new Date(l.requested_at); return t >= start && t < end;
        });
        const timeline = [
          ...scoreDayLogs.map(log => ({ created_at: log.created_at, html: logRowHTML(log, false) })),
          ...wheelDayLogs.map(log => ({ created_at: log.created_at, html: wheelLogRowHTML(log) })),
          ...withdrawalDayLogs.map(log => ({ created_at: log.requested_at, html: withdrawalLogRowHTML(log) }))
        ].sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
        els.dayDetail.classList.remove("hidden");
        els.dayDetailTitle.textContent = formatDayTitle(selected);
        els.dayDetailList.innerHTML = timeline.length
          ? timeline.map(item => item.html).join("")
          : `<li class="empty-state">当天还没有积分、奖励或提现记录</li>`;
      }

      // -------------------- Log row helpers --------------------
      function movementIconHTML(delta) {
        if (delta > 0) return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M6.5 10.5 12 5l5.5 5.5"/></svg>`;
        if (delta < 0) return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M6.5 13.5 12 19l5.5-5.5"/></svg>`;
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/></svg>`;
      }

      function logRowHTML(log, showDate) {
        const delta = Number(log.delta);
        const deltaClass = delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral";
        const action = String(log.action || "");
        const reason = String(log.reason ?? "").trim() || "未填写原因";
        const actionMeta = action === "reset"
          ? "重置"
          : action === "wheel_chance_redeem"
            ? `10 分兑换转盘机会 · ${log.score_before} → ${log.score_after}`
            : action === "cash_redeem"
              ? `10 分兑换 ¥30 · ${log.score_before} → ${log.score_after}`
              : action === "legacy_redeem"
                ? `旧版兑换记录 · ${log.score_before} → ${log.score_after}`
                : `${log.score_before} → ${log.score_after}`;
        const timeMeta = `${showDate ? formatDateShort(log.created_at) + " · " : ""}${formatTime(log.created_at)} · ${actionMeta}`;
        return `<li class="log-row"><div class="log-icon ${deltaClass}">${movementIconHTML(delta)}</div><div class="log-copy"><div class="log-reason">${escapeHTML(reason)}</div><span class="log-meta">${escapeHTML(timeMeta)}</span></div><div class="log-delta ${deltaClass}">${escapeHTML(signed(delta))}</div></li>`;
      }

      function wheelLogsDescending() {
        return [...state.wheelLogs].sort((a,b) => {
          const t = new Date(b.created_at) - new Date(a.created_at);
          return t || Number(b.id) - Number(a.id);
        });
      }

      function wheelHistoryRowShell({ recordType, recordId, amount = 0, pending = false, content }) {
        const numericId = Number(recordId);
        const inner = `<div class="log-row wheel-log-row wheel-history-content">${content}</div>`;
        if (!state.isAdmin || !Number.isFinite(numericId)) {
          return `<li class="wheel-history-static">${inner}</li>`;
        }
        const cancelWithdrawal = recordType === "withdrawal" && pending;
        const actionLabel = cancelWithdrawal ? "取消提现" : "删除";
        const actionClass = cancelWithdrawal ? " cancel" : "";
        return `<li class="wheel-history-swipe" data-record-type="${escapeHTML(recordType)}" data-record-id="${escapeHTML(numericId)}" data-record-amount="${escapeHTML(amount)}">
          <button aria-label="${escapeHTML(actionLabel)}" class="wheel-history-action${actionClass}" data-wheel-history-manage type="button">${escapeHTML(actionLabel)}</button>
          ${inner}
        </li>`;
      }

      function wheelLogRowHTML(log) {
        const action = String(log.action || "");
        const chanceBefore = Number(log.chance_before ?? 0);
        const chanceAfter = Number(log.chance_after ?? chanceBefore);
        const cashBefore = Number(log.cash_before ?? 0);
        const cashAfter = Number(log.cash_after ?? cashBefore);
        const prize = Number(log.prize_amount ?? 0);
        const cashDelta = Number(log.cash_delta ?? 0);
        let content = "";

        if (action === "spin_win") {
          const paid = Math.max(0, cashDelta || prize);
          const reason = String(log.reason || "").trim();
          const title = reason && reason !== "正式转动大转盘" ? reason : `转动大转盘 · 抽中 ¥${prize}`;
          content = `<div class="log-icon wheel-win">🎠</div><div class="log-copy"><div class="log-reason">${escapeHTML(title)}</div><span class="log-meta">${escapeHTML(formatDateShort(log.created_at))} · ${escapeHTML(formatTime(log.created_at))} · 落点 ¥${escapeHTML(prize)} · 机会 ${chanceBefore} → ${chanceAfter} · 余额 ¥${cashBefore} → ¥${cashAfter}</span></div><div class="log-delta wheel-cash-positive">+¥${escapeHTML(paid)}</div>`;
        } else if (action === "cash_redeem") {
          content = `<div class="log-icon wheel-chance">💰</div><div class="log-copy"><div class="log-reason">10 分兑换 ¥30 可提现余额</div><span class="log-meta">${escapeHTML(formatDateShort(log.created_at))} · ${escapeHTML(formatTime(log.created_at))} · 可提现 ¥${cashBefore} → ¥${cashAfter}</span></div><div class="log-delta wheel-cash-positive">+¥${escapeHTML(Math.max(0, cashDelta))}</div>`;
        } else if (action === "chance_redeem") {
          content = `<div class="log-icon wheel-chance">🎟️</div><div class="log-copy"><div class="log-reason">10 分兑换 1 次正式大转盘机会</div><span class="log-meta">${escapeHTML(formatDateShort(log.created_at))} · ${escapeHTML(formatTime(log.created_at))} · 机会 ${chanceBefore} → ${chanceAfter}</span></div><div class="log-delta wheel-chance-positive">+${Math.max(0, Number(log.chance_delta ?? 1))}</div>`;
        } else if (action === "admin_chance_adjust") {
          const delta = Number(log.chance_delta ?? 0);
          const deltaText = delta > 0 ? `+${delta}` : `${delta}`;
          content = `<div class="log-icon wheel-chance">↕</div><div class="log-copy"><div class="log-reason">${escapeHTML(String(log.reason || "管理员调整正式机会"))}</div><span class="log-meta">${escapeHTML(formatDateShort(log.created_at))} · ${escapeHTML(formatTime(log.created_at))} · 机会 ${chanceBefore} → ${chanceAfter}</span></div><div class="log-delta ${delta >= 0 ? "wheel-chance-positive" : "negative"}">${escapeHTML(deltaText)}</div>`;
        } else if (action === "legacy_balance_migration") {
          content = `<div class="log-icon wheel-chance">✨</div><div class="log-copy"><div class="log-reason">旧版奖励余额已迁移为正式转盘机会</div><span class="log-meta">${escapeHTML(formatDateShort(log.created_at))} · ${escapeHTML(formatTime(log.created_at))} · 机会 ${chanceBefore} → ${chanceAfter}</span></div><div class="log-delta wheel-chance-positive">+${Math.max(0, Number(log.chance_delta ?? 0))}</div>`;
        } else {
          content = `<div class="log-icon wheel-chance">🎟️</div><div class="log-copy"><div class="log-reason">旧版奖励兑换大转盘机会</div><span class="log-meta">${escapeHTML(formatDateShort(log.created_at))} · ${escapeHTML(formatTime(log.created_at))} · 机会 ${chanceBefore} → ${chanceAfter}</span></div><div class="log-delta wheel-chance-positive">+${Math.max(0, Number(log.chance_delta ?? 1))}</div>`;
        }
        return wheelHistoryRowShell({ recordType: "wheel_log", recordId: log.id, content });
      }

      function withdrawalLogRowHTML(row) {
        const amount = Math.max(0, Number(row.amount ?? 0));
        const pending = String(row.status) === "pending";
        const requested = `${formatDateShort(row.requested_at)} · ${formatTime(row.requested_at)}`;
        const settled = row.settled_at ? `${formatDateShort(row.settled_at)} · ${formatTime(row.settled_at)}` : "";
        const content = `<div class="log-icon wheel-withdraw">${pending ? "⏳" : "✅"}</div><div class="log-copy"><div class="log-reason">提现 ¥${escapeHTML(amount)}</div><span class="withdrawal-status-line ${pending ? "pending" : "settled"}">${pending ? "等待管理员兑现" : "管理员已经兑现提现申请。请查收。"}</span><span class="log-meta">申请 ${escapeHTML(requested)}${pending ? "" : ` · 兑现 ${escapeHTML(settled)}`}</span></div><div class="log-delta wheel-cash-negative">−¥${escapeHTML(amount)}</div>`;
        return wheelHistoryRowShell({ recordType: "withdrawal", recordId: row.id, amount, pending, content });
      }

      function renderWheelOverview() {
        if (!els.wheelOverviewContent) return;
        const logs = wheelLogsDescending();
        const withdrawals = [...state.withdrawals];
        const visibleWon = logs.filter(log => String(log.action) === "spin_win")
          .reduce((sum, log) => sum + Math.max(0, Number(log.cash_delta ?? log.prize_amount ?? 0)), 0);
        const pendingRows = withdrawals.filter(row => String(row.status) === "pending");
        const settledRows = withdrawals.filter(row => String(row.status) === "settled");
        const pendingAmount = pendingRows.reduce((sum, row) => sum + Math.max(0, Number(row.amount ?? 0)), 0);
        const visibleSettledAmount = settledRows.reduce((sum, row) => sum + Math.max(0, Number(row.amount ?? 0)), 0);
        // 累计中奖 / 已兑现与当前可见历史保持同一数据源。
        // 管理员软删除历史后，loadOverviewData(true) 会刷新列表，这两个统计同步变化。
        const won = visibleWon;
        const settledAmount = visibleSettledAmount;

        els.wheelAssetsTitle.textContent = state.isAdmin ? "游客 · 大转盘资产" : "大转盘资产";
        els.wheelOverviewCash.textContent = `¥${Math.max(0, Number(state.wheelCashBalance ?? 0))}`;
        els.wheelOverviewChance.textContent = `当前 ${Math.max(0, Number(state.wheelChances ?? 0))} 次正式机会`;
        els.wheelOverviewPending.textContent = `¥${pendingAmount}`;
        els.wheelOverviewWon.textContent = `¥${won}`;
        els.wheelOverviewSettled.textContent = `¥${settledAmount}`;
        if (els.wheelHistoryAdminHint) els.wheelHistoryAdminHint.hidden = !state.isAdmin;

        els.withdrawWheelBtn.hidden = state.isAdmin;
        els.withdrawWheelBtn.disabled = state.isAdmin || Number(state.wheelCashBalance ?? 0) <= 0;

        els.withdrawalNotice.hidden = pendingRows.length === 0;
        els.withdrawalNotice.classList.toggle("admin-pending", state.isAdmin && pendingRows.length > 0);
        if (pendingRows.length) {
          if (state.isAdmin) {
            els.withdrawalNoticeTitle.textContent = `🔔 游客有 ${pendingRows.length} 笔提现待兑现 · 共 ¥${pendingAmount}`;
            els.withdrawalNoticeCopy.textContent = "请及时实际完成兑现；点击“已经兑现”后，这笔申请才会从待办移除。";
            els.pendingWithdrawalList.innerHTML = pendingRows.map(row => `<div class="pending-withdrawal-item"><span><strong>提现 ¥${escapeHTML(row.amount)}</strong><small>${escapeHTML(formatDateShort(row.requested_at))} · ${escapeHTML(formatTime(row.requested_at))}</small></span><button class="settle-withdrawal-button pressable" type="button" data-settle-withdrawal="${escapeHTML(row.id)}">已经兑现</button></div>`).join("");
          } else {
            els.withdrawalNoticeTitle.textContent = `⏳ 已有 ${pendingRows.length} 笔提现申请等待兑现 · 共 ¥${pendingAmount}`;
            els.withdrawalNoticeCopy.textContent = "管理员兑现后，这里会自动取消待处理状态，并在历史中提示你查收。";
            els.pendingWithdrawalList.innerHTML = "";
          }
        } else {
          els.pendingWithdrawalList.innerHTML = "";
        }

        const history = [
          ...logs.map(log => ({ time: log.created_at, html: wheelLogRowHTML(log) })),
          ...withdrawals.map(row => ({ time: row.requested_at, html: withdrawalLogRowHTML(row) }))
        ].sort((a,b) => new Date(b.time) - new Date(a.time));
        els.wheelRecordList.innerHTML = history.length
          ? history.map(item => item.html).join("")
          : `<li class="empty-state">还没有正式奖励或提现记录哦 ♡<br><small>试玩结果不会出现在这里</small></li>`;
      }

      const WHEEL_HISTORY_ACTION_WIDTH = 94;
      let wheelHistorySwipeState = null;

      function closeWheelHistorySwipe(exceptRow = null) {
        els.wheelRecordList?.querySelectorAll(".wheel-history-swipe.open").forEach(row => {
          if (row === exceptRow) return;
          row.classList.remove("open");
          const content = row.querySelector(".wheel-history-content");
          if (content) {
            content.style.transition = "";
            content.style.transform = "";
          }
        });
      }

      function beginWheelHistorySwipe(e) {
        if (!state.isAdmin || e.button > 0) return;
        const content = e.target.closest(".wheel-history-content");
        const row = content?.closest(".wheel-history-swipe");
        if (!content || !row) return;
        closeWheelHistorySwipe(row);
        wheelHistorySwipeState = {
          pointerId: e.pointerId,
          row,
          content,
          startX: e.clientX,
          startY: e.clientY,
          startOffset: row.classList.contains("open") ? -WHEEL_HISTORY_ACTION_WIDTH : 0,
          horizontal: false,
          ignored: false
        };
        content.setPointerCapture?.(e.pointerId);
      }

      function moveWheelHistorySwipe(e) {
        const drag = wheelHistorySwipeState;
        if (!drag || drag.pointerId !== e.pointerId || drag.ignored) return;
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        if (!drag.horizontal) {
          if (Math.abs(dx) < 7 && Math.abs(dy) < 7) return;
          if (Math.abs(dy) >= Math.abs(dx)) {
            drag.ignored = true;
            return;
          }
          drag.horizontal = true;
        }
        const offset = Math.max(-WHEEL_HISTORY_ACTION_WIDTH, Math.min(0, drag.startOffset + dx));
        drag.content.style.transition = "none";
        drag.content.style.transform = `translate3d(${offset}px,0,0)`;
        drag.currentOffset = offset;
        e.preventDefault();
      }

      function endWheelHistorySwipe(e) {
        const drag = wheelHistorySwipeState;
        if (!drag || drag.pointerId !== e.pointerId) return;
        wheelHistorySwipeState = null;
        if (drag.ignored || !drag.horizontal) return;
        const offset = Number(drag.currentOffset ?? drag.startOffset);
        const open = offset <= -(WHEEL_HISTORY_ACTION_WIDTH * .46);
        drag.content.style.transition = "";
        drag.content.style.transform = "";
        drag.row.classList.toggle("open", open);
        vibrate(open ? 4 : 2);
      }

      async function manageWheelHistoryRecord(row) {
        if (!state.isAdmin || !row) return showToast("只有管理员可以管理历史记录");
        const recordType = String(row.dataset.recordType || "");
        const recordId = Number(row.dataset.recordId);
        const amount = Math.max(0, Number(row.dataset.recordAmount || 0));
        if (!recordType || !Number.isInteger(recordId)) return;
        const button = row.querySelector("[data-wheel-history-manage]");
        setBusy(button, true);
        try {
          const { data, error } = await db.rpc("points_admin_manage_wheel_record", {
            p_record_type: recordType,
            p_record_id: recordId
          });
          if (error) throw error;
          const result = Array.isArray(data) ? data[0] : data;
          const operation = String(result?.operation || "hidden");
          row.classList.remove("open");
          row.classList.add("removing");
          await new Promise(resolve => setTimeout(resolve, 220));
          state.overviewLoadedAt = 0;
          await loadAppState({ silent: true });
          await loadOverviewData(true);
          vibrate(14);
          showToast(operation === "withdrawal_cancelled"
            ? `↩️ 已取消 ¥${amount} 提现，金额已退回可提现余额`
            : "记录已删除");
        } catch (err) {
          if (runtime.unknownWrite(err)) { showToast(runtime.uncertainMessage); return; }
          console.error("manageWheelHistoryRecord:", err);
          const diagnostic = `${err?.code || ""} ${err?.message || ""} ${err?.details || ""}`;
          if (/PGRST202|schema cache|Could not find|points_admin_manage_wheel_record/i.test(diagnostic)) {
            showToast("请先运行 v2.3 历史记录管理 SQL");
          } else if (/Admin permission|required|permission/i.test(diagnostic)) {
            await refreshAuthState();
            showToast("管理员权限已失效");
          } else if (/not found|already hidden/i.test(diagnostic)) {
            state.overviewLoadedAt = 0;
            await loadOverviewData(true);
            showToast("这条记录已经不存在了");
          } else {
            showToast("记录处理失败");
          }
        } finally {
          setBusy(button, false);
        }
      }

      // -------------------- Overview sheet --------------------
      const SCORE_OVERVIEW_PEEK_FALLBACK = 300;
      const SCORE_OVERVIEW_PEEK_BOTTOM_GAP = 12;
      const WHEEL_OVERVIEW_PEEK_HEIGHT = 455;
      let overviewDrag = null;

      function scoreOverviewPeekHeight() {
        const nav = els.overviewQuickNav;
        if (!nav) return SCORE_OVERVIEW_PEEK_FALLBACK;
        const bottom = nav.offsetTop + nav.offsetHeight + SCORE_OVERVIEW_PEEK_BOTTOM_GAP;
        return Number.isFinite(bottom) && bottom > 0 ? Math.ceil(bottom) : SCORE_OVERVIEW_PEEK_FALLBACK;
      }

      function currentOverviewPeekHeight() {
        const desired = state.activeMetric === "wheel"
          ? WHEEL_OVERVIEW_PEEK_HEIGHT
          : scoreOverviewPeekHeight();
        const actual = Math.ceil(els.overviewShell.scrollHeight || desired);
        return Math.max(0, Math.min(desired, actual));
      }
      let suppressOverviewClickUntil = 0;

      function setOverviewMode(mode) {
        const valid = ["closed", "peek", "full"];
        state.overviewMode = valid.includes(mode) ? mode : "closed";

        els.overview.classList.remove("open", "peek", "full", "dragging");
        els.overviewShell.style.transform = "";
        els.overviewShell.style.removeProperty("--peek-height");

        if (state.overviewMode === "closed") {
          els.overview.setAttribute("aria-hidden", "true");
          document.body.classList.remove("overview-visible");
          els.overviewShell.scrollTop = 0;
          return;
        }

        els.overview.classList.add("open", state.overviewMode);
        els.overview.setAttribute("aria-hidden", "false");
        els.overviewShell.style.setProperty("--peek-height", `${currentOverviewPeekHeight()}px`);
        document.body.classList.add("overview-visible");

        if (state.overviewMode === "peek") {
          els.overviewShell.scrollTop = 0;
        }

        requestAnimationFrame(() => {
          drawTrend(buildTrendPoints(state.trendRange));
        });
      }

      function openOverviewSheet() {
        state.overviewSection = null;
        renderOverviewContentMode();
        setOverviewMode("peek");
      }

      function expandOverviewSheet() {
        if (state.overviewMode !== "closed") {
          setOverviewMode("full");
        }
      }

      function closeOverviewSheet() {
        setOverviewMode("closed");
        state.overviewSection = null;
      }

      function openOverviewSection(target) {
        if (state.activeMetric !== "score") return;
        if (target !== "trend" && target !== "calendar") return;
        state.overviewSection = target;
        renderOverviewSectionMode();
        expandOverviewSheet();
        requestAnimationFrame(() => {
          els.overviewShell.scrollTo({ top: 0, behavior: "smooth" });
          if (target === "trend") drawTrend(buildTrendPoints(state.trendRange));
        });
      }

      function overviewPeekTranslate() {
        const height = els.overviewShell.getBoundingClientRect().height;
        return Math.max(0, height - currentOverviewPeekHeight());
      }

      function beginOverviewDrag(e) {
        if (state.overviewMode === "closed") return;

        const startedOnHandle = !!e.target.closest("#overviewGrabberHitbox");
        // Capturing a pointer on a button retargets its release click to the sheet.
        // Let interactive controls handle taps; blank areas and the grabber still drag.
        if (!startedOnHandle && e.target.closest("button,input,select,textarea,a,[role='button']")) return;

        // When fully open, the body is a normal scroll view.
        // Only the grabber may move/close the entire sheet.
        if (state.overviewMode === "full" && !startedOnHandle) return;

        const shellHeight = els.overviewShell.getBoundingClientRect().height;
        overviewDrag = {
          pointerId: e.pointerId,
          startY: e.clientY,
          lastY: e.clientY,
          pendingY: e.clientY,
          startTime: performance.now(),
          lastTime: performance.now(),
          startedOnHandle,
          startMode: state.overviewMode,
          shellHeight,
          peekY: Math.max(0, shellHeight - currentOverviewPeekHeight()),
          dragging: false,
          raf: 0
        };

        try { els.overviewShell.setPointerCapture(e.pointerId); } catch (_) {}
      }

      function moveOverviewDrag(e) {
        if (!overviewDrag || e.pointerId !== overviewDrag.pointerId) return;

        overviewDrag.pendingY = e.clientY;
        const dy = e.clientY - overviewDrag.startY;
        if (!overviewDrag.dragging && Math.abs(dy) < 7) return;

        const upwardFromPeek = overviewDrag.startMode === "peek" && dy < 0;
        const downwardFromHandle = overviewDrag.startedOnHandle && dy > 0;
        if (!upwardFromPeek && !downwardFromHandle) return;

        overviewDrag.dragging = true;
        els.overview.classList.add("dragging");
        e.preventDefault();

        if (overviewDrag.raf) return;
        overviewDrag.raf = requestAnimationFrame(() => {
          if (!overviewDrag) return;
          overviewDrag.raf = 0;
          const currentY = overviewDrag.pendingY;
          const dragDy = currentY - overviewDrag.startY;
          const shellHeight = overviewDrag.shellHeight;
          let translateY = 0;

          if (overviewDrag.startMode === "peek") {
            const peekY = overviewDrag.peekY;
            if (dragDy < 0) {
              const raw = peekY + dragDy;
              translateY = raw < 0 ? raw * .18 : raw;
            } else {
              const raw = peekY + dragDy;
              translateY = Math.min(shellHeight, raw);
            }
          } else {
            translateY = dragDy > 0 ? Math.min(shellHeight, dragDy * .96) : dragDy * .14;
          }

          els.overviewShell.style.transform = `translate3d(-50%, ${translateY}px, 0)`;
          overviewDrag.lastY = currentY;
          overviewDrag.lastTime = performance.now();
        });
      }

      function endOverviewDrag(e) {
        if (!overviewDrag || e.pointerId !== overviewDrag.pointerId) return;

        const drag = overviewDrag;
        if (drag.raf) cancelAnimationFrame(drag.raf);
        overviewDrag = null;

        try { els.overviewShell.releasePointerCapture(e.pointerId); } catch (_) {}

        els.overview.classList.remove("dragging");
        els.overviewShell.style.transform = "";

        if (!drag.dragging) return;

        suppressOverviewClickUntil = performance.now() + 260;

        const totalDy = e.clientY - drag.startY;
        const dt = Math.max(1, performance.now() - drag.startTime);
        const velocityY = totalDy / dt; // px/ms

        if (drag.startMode === "peek") {
          if (drag.startedOnHandle && totalDy > 0) {
            if (totalDy > 72 || velocityY > .42) {
              closeOverviewSheet();
            } else {
              setOverviewMode("peek");
            }
            return;
          }

          if (totalDy < 0 && (-totalDy > 64 || velocityY < -.34)) {
            if (state.activeMetric === "score" && !state.overviewSection) {
              state.overviewSection = "trend";
              renderOverviewSectionMode();
            }
            expandOverviewSheet();
          } else {
            setOverviewMode("peek");
          }
          return;
        }

        // Full mode starts only from the grabber.
        if (totalDy > 74 || velocityY > .42) {
          closeOverviewSheet();
        } else {
          setOverviewMode("full");
        }
      }

      // -------------------- Settings sheet drag --------------------
      let settingsDrag = null;
      let suppressSettingsClickUntil = 0;

      function beginSettingsDrag(e) {
        if (!els.settingsLayer.classList.contains("open")) return;
        if (!e.target.closest("#settingsGrabberHitbox")) return;

        settingsDrag = {
          pointerId: e.pointerId,
          startY: e.clientY,
          startTime: performance.now(),
          pendingY: e.clientY,
          sheetHeight: els.settingsSheet.getBoundingClientRect().height,
          dragging: false,
          raf: 0
        };

        try { els.settingsSheet.setPointerCapture(e.pointerId); } catch (_) {}
      }

      function moveSettingsDrag(e) {
        if (!settingsDrag || e.pointerId !== settingsDrag.pointerId) return;
        const dy = e.clientY - settingsDrag.startY;
        if (!settingsDrag.dragging && Math.abs(dy) < 7) return;
        if (dy <= 0) return;

        settingsDrag.pendingY = e.clientY;
        settingsDrag.dragging = true;
        els.settingsLayer.classList.add("dragging");
        e.preventDefault();

        if (settingsDrag.raf) return;
        settingsDrag.raf = requestAnimationFrame(() => {
          if (!settingsDrag) return;
          settingsDrag.raf = 0;
          const dragDy = settingsDrag.pendingY - settingsDrag.startY;
          const translateY = Math.min(settingsDrag.sheetHeight, dragDy * .96);
          els.settingsSheet.style.transform = `translate3d(0, ${translateY}px, 0)`;
        });
      }

      function endSettingsDrag(e) {
        if (!settingsDrag || e.pointerId !== settingsDrag.pointerId) return;

        const drag = settingsDrag;
        if (drag.raf) cancelAnimationFrame(drag.raf);
        settingsDrag = null;

        try { els.settingsSheet.releasePointerCapture(e.pointerId); } catch (_) {}

        els.settingsLayer.classList.remove("dragging");
        els.settingsSheet.style.transform = "";

        if (!drag.dragging) return;

        suppressSettingsClickUntil = performance.now() + 240;

        const totalDy = e.clientY - drag.startY;
        const dt = Math.max(1, performance.now() - drag.startTime);
        const velocityY = totalDy / dt;

        if (totalDy > 76 || velocityY > .42) {
          setLayer(els.settingsLayer, false);
        }
      }

      // -------------------- Login sheet drag --------------------
      let loginDrag = null;
      let suppressLoginClickUntil = 0;

      function beginLoginDrag(e) {
        if (!els.loginLayer.classList.contains("open")) return;
        if (!e.target.closest("#loginGrabberHitbox")) return;

        loginDrag = {
          pointerId: e.pointerId,
          startY: e.clientY,
          startTime: performance.now(),
          pendingY: e.clientY,
          sheetHeight: els.loginSheet.getBoundingClientRect().height,
          dragging: false,
          raf: 0
        };

        try { els.loginSheet.setPointerCapture(e.pointerId); } catch (_) {}
      }

      function moveLoginDrag(e) {
        if (!loginDrag || e.pointerId !== loginDrag.pointerId) return;
        const dy = e.clientY - loginDrag.startY;
        if (!loginDrag.dragging && Math.abs(dy) < 7) return;
        if (dy <= 0) return;

        loginDrag.pendingY = e.clientY;
        loginDrag.dragging = true;
        els.loginLayer.classList.add("dragging");
        e.preventDefault();

        if (loginDrag.raf) return;
        loginDrag.raf = requestAnimationFrame(() => {
          if (!loginDrag) return;
          loginDrag.raf = 0;
          const dragDy = loginDrag.pendingY - loginDrag.startY;
          const translateY = Math.min(loginDrag.sheetHeight, dragDy * .96);
          els.loginSheet.style.transform = `translate3d(0, ${translateY}px, 0)`;
        });
      }

      function endLoginDrag(e) {
        if (!loginDrag || e.pointerId !== loginDrag.pointerId) return;

        const drag = loginDrag;
        if (drag.raf) cancelAnimationFrame(drag.raf);
        loginDrag = null;

        try { els.loginSheet.releasePointerCapture(e.pointerId); } catch (_) {}

        els.loginLayer.classList.remove("dragging");
        els.loginSheet.style.transform = "";

        if (!drag.dragging) return;

        suppressLoginClickUntil = performance.now() + 240;

        const totalDy = e.clientY - drag.startY;
        const dt = Math.max(1, performance.now() - drag.startTime);
        const velocityY = totalDy / dt;

        if (totalDy > 72 || velocityY > .42) {
          setLayer(els.loginLayer, false);
        }
      }

      // -------------------- Events --------------------
      const runningActions = new Set();
      let wheelRequests = 0;
      function guardAction(action, key, wheel = false) {
        return async (...args) => {
          if (runningActions.has(key)) return;
          runningActions.add(key);
          if (wheel) { wheelRequests++; state.wheelRequestInFlight = true; setBusy(els.spinWheelActionBtn, true); }
          try { return await action(...args); }
          catch (error) {
            console.error("actionFailed:", key, error?.code || error?.name || "Error");
            showToast("操作未完成，请检查网络后重试");
          } finally {
            runningActions.delete(key);
            if (wheel) { wheelRequests--; state.wheelRequestInFlight = wheelRequests > 0; setBusy(els.spinWheelActionBtn, state.wheelRequestInFlight); }
          }
        };
      }
      login = guardAction(login, "login");
      logout = guardAction(logout, "logout");
      confirmChange = guardAction(confirmChange, "score-change");
      confirmWheelAdjust = guardAction(confirmWheelAdjust, "wheel-adjust");
      purchaseShopItem = guardAction(purchaseShopItem, "shop-purchase");
      claimWeeklyMysteryGift = guardAction(claimWeeklyMysteryGift, "weekly-gift");
      openBackpackMysteryBox = guardAction(openBackpackMysteryBox, "mystery-open");
      saveAdminInventoryAdjust = guardAction(saveAdminInventoryAdjust, "inventory-adjust");
      resolvePendingWheelDecision = guardAction(resolvePendingWheelDecision, "wheel-decision", true);
      performFormalWheelSpin = guardAction(performFormalWheelSpin, "wheel-spin", true);
      performPreviewWheelSpin = guardAction(performPreviewWheelSpin, "wheel-spin", true);
      spinWithoutNewTool = guardAction(spinWithoutNewTool, "wheel-preparation", true);
      confirmWheelToolChoice = guardAction(confirmWheelToolChoice, "wheel-preparation", true);
      triggerWheelFromActionButton = guardAction(triggerWheelFromActionButton, "wheel-trigger", true);
      performWheelWithdraw = guardAction(performWheelWithdraw, "withdrawal");
      settleWithdrawal = guardAction(settleWithdrawal, "settlement");
      manageWheelHistoryRecord = guardAction(manageWheelHistoryRecord, "history-manage");
      saveWheelProbability = guardAction(saveWheelProbability, "probability-save");
      openWheelProbabilitySettings = guardAction(openWheelProbabilitySettings, "probability-open");
      els.settingsBtn.addEventListener("click", () => {
        vibrate();
        setLayer(els.settingsLayer, true);
      });
      els.settingsLayer.addEventListener("click", (e) => {
        if (performance.now() < suppressSettingsClickUntil) { e.preventDefault(); e.stopPropagation(); return; }
        if (e.target === els.settingsLayer) setLayer(els.settingsLayer, false);
      });
      els.settingsGrabberHitbox.addEventListener("pointerdown", beginSettingsDrag);
      els.settingsSheet.addEventListener("pointermove", moveSettingsDrag, { passive: false });
      els.settingsSheet.addEventListener("pointerup", endSettingsDrag);
      els.settingsSheet.addEventListener("pointercancel", endSettingsDrag);

      els.openVersionInfoBtn.addEventListener("click", () => { setLayer(els.settingsLayer, false); setLayer(els.versionInfoLayer, true); });
      els.openWheelProbabilityBtn.addEventListener("click", openWheelProbabilitySettings);
      els.openWheelProbabilityHistoryBtn.addEventListener("click", openWheelProbabilityHistory);
      els.wheelProbabilityGrid.addEventListener("input", () => { updateWheelProbabilityTotal(); renderWheelProbabilityStudio(); });
      els.wheelProbabilityLegend?.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-prob-select]");
        if (!btn) return;
        state.wheelProbabilitySelectedAmount = Number(btn.dataset.probSelect);
        renderWheelProbabilityStudio();
        vibrate(4);
      });
      els.wheelProbabilityMinusBtn?.addEventListener("click", () => adjustSelectedWheelProbability(-1));
      els.wheelProbabilityPlusBtn?.addEventListener("click", () => adjustSelectedWheelProbability(1));
      els.wheelProbabilityBoundaries?.addEventListener("pointerdown", beginWheelProbabilityBoundaryDrag);
      window.addEventListener("pointermove", moveWheelProbabilityBoundaryDrag, { passive:false });
      window.addEventListener("pointerup", endWheelProbabilityBoundaryDrag);
      window.addEventListener("pointercancel", endWheelProbabilityBoundaryDrag);
      els.resetWheelProbabilityDefaultBtn.addEventListener("click", () => { setWheelProbabilityInputs(WHEEL_DEFAULT_PROBABILITIES); vibrate(8); });
      els.saveWheelProbabilityBtn.addEventListener("click", saveWheelProbability);
      els.closeWheelProbabilityBtn.addEventListener("click", () => setLayer(els.wheelProbabilityLayer, false));
      els.wheelProbabilityLayer.addEventListener("click", (e) => { if (e.target === els.wheelProbabilityLayer) setLayer(els.wheelProbabilityLayer, false); });
      els.closeWheelProbabilityHistoryBtn.addEventListener("click", () => setLayer(els.wheelProbabilityHistoryLayer, false));
      els.wheelProbabilityHistoryLayer.addEventListener("click", (e) => { if (e.target === els.wheelProbabilityHistoryLayer) setLayer(els.wheelProbabilityHistoryLayer, false); });
      els.versionInfoLayer.addEventListener("click", (e) => { if (e.target === els.versionInfoLayer) setLayer(els.versionInfoLayer, false); });
      els.closeVersionInfoBtn.addEventListener("click", () => setLayer(els.versionInfoLayer, false));
      els.openReleaseNotesBtn.addEventListener("click", () => { setLayer(els.versionInfoLayer, false); setLayer(els.releaseNotesLayer, true); });
      els.releaseNotesLayer.addEventListener("click", (e) => { if (e.target === els.releaseNotesLayer) setLayer(els.releaseNotesLayer, false); });
      els.closeReleaseNotesBtn.addEventListener("click", () => setLayer(els.releaseNotesLayer, false));

      els.openLoginBtn.addEventListener("click", () => {
        setLayer(els.settingsLayer, false); setLayer(els.loginLayer, true);
        setTimeout(() => els.emailInput.focus(), 280);
      });
      els.loginLayer.addEventListener("click", (e) => {
        if (performance.now() < suppressLoginClickUntil) { e.preventDefault(); e.stopPropagation(); return; }
        if (e.target === els.loginLayer) setLayer(els.loginLayer, false);
      });
      els.loginGrabberHitbox.addEventListener("pointerdown", beginLoginDrag);
      els.loginSheet.addEventListener("pointermove", moveLoginDrag, { passive: false });
      els.loginSheet.addEventListener("pointerup", endLoginDrag);
      els.loginSheet.addEventListener("pointercancel", endLoginDrag);
      els.cancelLoginBtn.addEventListener("click", () => setLayer(els.loginLayer, false));
      els.loginBtn.addEventListener("click", login);
      els.passwordInput.addEventListener("keydown", (e) => { if (e.key === "Enter") login(); });
      els.logoutBtn.addEventListener("click", logout);

      async function manualRefreshApp() {
        if (state.refreshInFlight) return;
        vibrate(10);
        els.scoreRefreshBtn.classList.add("refreshing");
        try {
          const synced = await loadAppState({ silent: false });
          if (state.overviewMode !== "closed") await loadOverviewData(true);
          if (synced) showToast("已同步最新数据");
        } finally {
          setTimeout(() => els.scoreRefreshBtn.classList.remove("refreshing"), 650);
        }
      }

      els.scoreRefreshBtn.addEventListener("click", () => void manualRefreshApp());
      els.scoreRefreshBtn.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          void manualRefreshApp();
        }
      });

      els.metricSwitch.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-metric]");
        if (!btn) return;
        vibrate(7); switchMetric(btn.dataset.metric);
      });

      if (typeof bindCompactSheetDrag === "function") bindCompactSheetDrag(els.redeemLayer);
      els.redeemRewardBtn.addEventListener("click", () => { vibrate(8); void openShop("products"); });
      els.redeemLayer.addEventListener("click", (e) => {
        const weeklyGift = e.target.closest("[data-weekly-mystery-claim]");
        const mysteryOpen = e.target.closest("[data-open-mystery-box]");
        const product = e.target.closest("[data-shop-product]");
        const tab = e.target.closest("[data-shop-view]");
        if (weeklyGift) { vibrate(5); openWeeklyMysteryGiftPrompt(); return; }
        if (mysteryOpen) { vibrate(5); openBackpackMysteryPrompt(mysteryOpen.dataset.openMysteryBox); return; }
        if (product) { vibrate(5); openShopItemDetail(product.dataset.shopProduct); return; }
        if (tab) { vibrate(4); setShopView(tab.dataset.shopView); return; }
        if (e.target === els.redeemLayer) setLayer(els.redeemLayer, false);
      });
      els.shopItemLayer.addEventListener("click", (e) => { if (e.target === els.shopItemLayer) setLayer(els.shopItemLayer, false); });
      els.cancelRedeemBtn.addEventListener("click", () => setLayer(els.shopItemLayer, false));
      els.shopItemConfirmBtn.addEventListener("click", () => void purchaseShopItem());
      els.shopWeeklyGiftLayer.addEventListener("click", e => { if(e.target===els.shopWeeklyGiftLayer) setLayer(els.shopWeeklyGiftLayer,false); });
      els.shopWeeklyGiftCancelBtn.addEventListener("click",()=>setLayer(els.shopWeeklyGiftLayer,false));
      els.shopWeeklyGiftConfirmBtn.addEventListener("click",()=>void claimWeeklyMysteryGift());
      els.shopMysteryOpenLayer.addEventListener("click",e=>{if(e.target===els.shopMysteryOpenLayer)setLayer(els.shopMysteryOpenLayer,false);});
      els.shopMysteryOpenCancelBtn.addEventListener("click",()=>setLayer(els.shopMysteryOpenLayer,false));
      els.shopMysteryOpenConfirmBtn.addEventListener("click",()=>void openBackpackMysteryBox());
      els.openAdminInventoryBtn?.addEventListener("click",()=>void loadAdminInventory({open:true}));
      els.adminInventoryCloseBtn?.addEventListener("click",()=>setLayer(els.adminInventoryLayer,false));
      els.adminInventoryLayer?.addEventListener("click",e=>{const row=e.target.closest("[data-admin-inventory-code]");if(row)return openAdminInventoryAdjust(row.dataset.adminInventoryCode);if(e.target===els.adminInventoryLayer)setLayer(els.adminInventoryLayer,false);});
      els.adminInventoryMinusBtn?.addEventListener("click",()=>{state.adminInventoryDraftQty=Math.max(0,Number(state.adminInventoryDraftQty||0)-1);renderAdminInventoryAdjust();vibrate(3);});
      els.adminInventoryPlusBtn?.addEventListener("click",()=>{state.adminInventoryDraftQty=Math.min(999,Number(state.adminInventoryDraftQty||0)+1);renderAdminInventoryAdjust();vibrate(3);});
      els.adminInventoryAdjustCancelBtn?.addEventListener("click",()=>setLayer(els.adminInventoryAdjustLayer,false));
      els.adminInventoryAdjustConfirmBtn?.addEventListener("click",()=>void saveAdminInventoryAdjust());
      els.adminGrantNoticeDoneBtn?.addEventListener("click",()=>void ackGuestGrantNotice());
      els.adminGrantNoticeOpenBagBtn?.addEventListener("click",()=>void ackGuestGrantNotice({openBag:true}));
      els.shopRevealLayer.addEventListener("click", (e) => { if (e.target === els.shopRevealLayer) setLayer(els.shopRevealLayer, false); });
      els.shopRevealDoneBtn.addEventListener("click", () => setLayer(els.shopRevealLayer, false));
      els.wheelItemNotice.addEventListener("click", () => {
        vibrate(6);
        if (state.shopPendingSpin) return openPendingDecision(state.shopPendingSpin);
        void openShop("inventory");
      });

      // Normalize the initial wheel to the fixed design profile once.
      if (!state.wheelVisualProbabilities) renderWheelVisualFrame(WHEEL_VISUAL_BASE);

      async function triggerWheelFromActionButton() {
        if (state.wheelSpinning) return;
        vibrate(8);
        await silentSyncBeforeWheelSpin();
        if (state.isAdmin) return openWheelPreviewPrompt();
        const shopReady = await loadShopState({ silent: true });
        if (shopReady && state.shopPendingSpin) return openPendingDecision(state.shopPendingSpin);
        if (state.wheelChances <= 0) return openWheelPreviewPrompt();
        if (shopReady) {
          if (ownedWheelToolCodes().length > 0) return openWheelToolPrompt("owned");
          if (affordableWheelToolCodes().length > 0) return openWheelToolPrompt("warning");
          await clearLegacyEquippedTool();
        }
        await performFormalWheelSpin();
      }
      els.spinWheelActionBtn.addEventListener("click", () => void triggerWheelFromActionButton());
      els.wheelToolLayer.addEventListener("click", (e) => {
        const choice = e.target.closest("[data-wheel-tool-code]");
        const potion = e.target.closest("[data-wheel-potion-toggle]");
        const challenge = e.target.closest("[data-wheel-challenge-toggle]");
        const wish = e.target.closest("[data-wheel-wish]");
        if (choice) {
          const code = choice.dataset.wheelToolCode;
          if (code === "no10" && (state.shopLuckyRemaining > 0 || state.wheelToolUsePotion)) return showToast("十元退散和百元幸运药水不能同时使用");
          state.wheelToolSelectedCode = state.wheelToolSelectedCode === code ? null : code;
          if (state.wheelToolSelectedCode === "wish" && !WHEEL_VISUAL_AMOUNTS.includes(Number(state.wheelToolWishTarget))) state.wheelToolWishTarget = 100;
          vibrate(5); renderWheelToolPrompt(); return;
        }
        if (potion) {
          if (state.wheelToolSelectedCode === "no10") return showToast("十元退散和百元幸运药水不能同时使用");
          state.wheelToolUsePotion = !state.wheelToolUsePotion;
          vibrate(5); renderWheelToolPrompt(); return;
        }
        if (challenge) {
          state.wheelToolUseChallenge = !state.wheelToolUseChallenge;
          vibrate(5); renderWheelToolPrompt(); return;
        }
        if (wish) {
          state.wheelToolWishTarget = Number(wish.dataset.wheelWish);
          vibrate(4); renderWheelToolPrompt(); return;
        }
        if (e.target === els.wheelToolLayer) setLayer(els.wheelToolLayer, false);
      });
      els.wheelToolCancelBtn.addEventListener("click", () => setLayer(els.wheelToolLayer, false));
      els.wheelToolBareBtn.addEventListener("click", () => void spinWithoutNewTool());
      els.wheelToolConfirmBtn.addEventListener("click", () => void confirmWheelToolChoice());

      els.wheelDecisionLayer.addEventListener("click", (e) => {
        // Pending decisions deliberately do not close on backdrop tap: the reserved formal spin must be resolved.
        if (e.target === els.wheelDecisionLayer) vibrate(3);
      });
      els.wheelDecisionRiskBtn.addEventListener("click", () => {
        const type = String(state.shopPendingSpin?.type || "");
        void resolvePendingWheelDecision(type === "restart" ? "reroll" : "risk");
      });
      els.wheelDecisionAcceptBtn.addEventListener("click", () => void resolvePendingWheelDecision("accept"));

      els.adjustWheelChancesBtn.addEventListener("click", openWheelAdjustPrompt);
      [els.wheelAdjustMinusBtn, els.wheelAdjustPlusBtn].forEach(btn => btn.addEventListener("click", () => {
        state.wheelAdjustDelta = Number(btn.dataset.wheelAdjust) < 0 ? -1 : 1;
        renderWheelAdjustPrompt();
        vibrate(5);
      }));
      els.wheelAdjustLayer.addEventListener("click", (e) => { if (e.target === els.wheelAdjustLayer) setLayer(els.wheelAdjustLayer, false); });
      els.wheelAdjustCancelBtn.addEventListener("click", () => setLayer(els.wheelAdjustLayer, false));
      els.wheelAdjustConfirmBtn.addEventListener("click", confirmWheelAdjust);

      els.wheelPreviewLayer.addEventListener("click", (e) => { if (e.target === els.wheelPreviewLayer) setLayer(els.wheelPreviewLayer, false); });
      els.wheelPreviewCancelBtn.addEventListener("click", () => setLayer(els.wheelPreviewLayer, false));
      els.wheelPreviewConfirmBtn.addEventListener("click", performPreviewWheelSpin);
      function closeWheelResultAndRestoreVisual() {
        setLayer(els.wheelResultLayer, false);
        if (state.wheelVisualRestorePending || state.wheelVisualProfileKey !== "base") restoreWheelVisualProfile();
      }
      els.wheelResultLayer.addEventListener("click", (e) => { if (e.target === els.wheelResultLayer) closeWheelResultAndRestoreVisual(); });
      els.wheelResultDoneBtn.addEventListener("click", closeWheelResultAndRestoreVisual);

      els.withdrawWheelBtn.addEventListener("click", openWheelWithdrawPrompt);
      els.wheelWithdrawLayer.addEventListener("click", (e) => { if (e.target === els.wheelWithdrawLayer) setLayer(els.wheelWithdrawLayer, false); });
      els.wheelWithdrawCancelBtn.addEventListener("click", () => setLayer(els.wheelWithdrawLayer, false));
      els.wheelWithdrawAllBtn.addEventListener("click", () => { els.wheelWithdrawAmount.value = String(Math.max(0, Number(state.wheelCashBalance ?? 0))); });
      els.wheelWithdrawConfirmBtn.addEventListener("click", performWheelWithdraw);
      els.wheelWithdrawAmount.addEventListener("keydown", (e) => { if (e.key === "Enter") performWheelWithdraw(); });

      els.pendingWithdrawalList.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-settle-withdrawal]");
        if (!btn) return;
        openSettlementPrompt(Number(btn.dataset.settleWithdrawal));
      });

      els.wheelRecordList.addEventListener("pointerdown", beginWheelHistorySwipe);
      els.wheelRecordList.addEventListener("pointermove", moveWheelHistorySwipe, { passive: false });
      els.wheelRecordList.addEventListener("pointerup", endWheelHistorySwipe);
      els.wheelRecordList.addEventListener("pointercancel", endWheelHistorySwipe);
      els.wheelRecordList.addEventListener("click", (e) => {
        const manageBtn = e.target.closest("[data-wheel-history-manage]");
        if (manageBtn) {
          e.preventDefault();
          e.stopPropagation();
          void manageWheelHistoryRecord(manageBtn.closest(".wheel-history-swipe"));
          return;
        }
        const openRow = e.target.closest(".wheel-history-swipe.open");
        if (openRow && e.target.closest(".wheel-history-content")) {
          openRow.classList.remove("open");
        }
      });
      document.addEventListener("pointerdown", (e) => {
        if (!e.target.closest(".wheel-history-swipe")) closeWheelHistorySwipe();
      }, true);
      els.settleWithdrawalLayer.addEventListener("click", (e) => { if (e.target === els.settleWithdrawalLayer) setLayer(els.settleWithdrawalLayer, false); });
      els.settleWithdrawalCancelBtn.addEventListener("click", () => { state.pendingSettlementId = null; setLayer(els.settleWithdrawalLayer, false); });
      els.settleWithdrawalConfirmBtn.addEventListener("click", settleWithdrawal);

      $$(".score-button").forEach(btn => btn.addEventListener("click", () => { vibrate(); openChange(Number(btn.dataset.sign)); }));
      els.changeAmountPickerBtn.addEventListener("click", () => {
        const opening = els.changeAmountMenu.hidden;
        els.changeAmountMenu.hidden = !opening;
        els.changeAmountPickerBtn.setAttribute("aria-expanded", String(opening));
      });
      els.changeAmountMenu.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-change-amount]");
        if (!btn) return;
        state.changeMagnitude = Number(btn.dataset.changeAmount);
        renderChangeAmount();
        closeChangeAmountMenu();
        vibrate(4);
      });
      els.changeLayer.addEventListener("click", (e) => { if (e.target === els.changeLayer) { closeChangeAmountMenu(); setLayer(els.changeLayer, false); } });
      els.cancelChangeBtn.addEventListener("click", () => { closeChangeAmountMenu(); setLayer(els.changeLayer, false); });
      els.confirmChangeBtn.addEventListener("click", confirmChange);

      window.addEventListener("resize", () => { if (els.settingsLayer.classList.contains("open")) queueSettingsFit(); }, { passive: true });
      window.visualViewport?.addEventListener("resize", () => { if (els.settingsLayer.classList.contains("open")) queueSettingsFit(); }, { passive: true });

      els.overviewBtn.addEventListener("click", async () => {
        vibrate(); openOverviewSheet(); renderOverview();
        requestAnimationFrame(() => drawTrend(buildTrendPoints(state.trendRange)));
        await loadOverviewData(false);
      });
      els.overviewQuickNav.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-overview-target]"); if (!btn) return;
        vibrate(6); openOverviewSection(btn.dataset.overviewTarget);
      });
      els.overviewContentSwitch.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-overview-section]");
        if (!btn || btn.dataset.overviewSection === state.overviewSection) return;
        vibrate(6); openOverviewSection(btn.dataset.overviewSection);
      });
      els.overviewBackdrop.addEventListener("click", () => { if (performance.now() >= suppressOverviewClickUntil) closeOverviewSheet(); });
      els.overviewShell.addEventListener("pointerdown", beginOverviewDrag);
      els.overviewShell.addEventListener("pointermove", moveOverviewDrag, { passive: false });
      els.overviewShell.addEventListener("pointerup", endOverviewDrag);
      els.overviewShell.addEventListener("pointercancel", endOverviewDrag);
      els.overview.addEventListener("click", (e) => {
        if (performance.now() < suppressOverviewClickUntil) { e.preventDefault(); e.stopPropagation(); }
      }, true);

      els.trendSegments.addEventListener("click", (e) => {
        const monthOption = e.target.closest("[data-month-week]");
        if (monthOption) {
          state.trendMonthWeek = Number(monthOption.dataset.monthWeek);
          state.trendRange = "month";
          setTrendMonthMenu(false); renderTrend(); return;
        }
        if (e.target.closest("#trendMonthBtn")) { setTrendMonthMenu(els.trendMonthMenu.hidden); return; }
        const btn = e.target.closest(".segment[data-range]"); if (!btn) return;
        state.trendRange = btn.dataset.range; setTrendMonthMenu(false); renderTrend();
      });
      document.addEventListener("click", (e) => {
        if (!els.changeAmountMenu.hidden && !e.target.closest(".change-amount-picker-wrap")) closeChangeAmountMenu();
        if (els.trendMonthMenu.hidden || e.target.closest(".trend-month-control")) return;
        setTrendMonthMenu(false);
      });
      els.prevMonthBtn.addEventListener("click", () => { state.calendarDate = addMonths(state.calendarDate, -1); state.selectedDayKey = null; renderCalendar(); });
      els.nextMonthBtn.addEventListener("click", () => { state.calendarDate = addMonths(state.calendarDate, 1); state.selectedDayKey = null; renderCalendar(); });

      document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        if (!els.trendMonthMenu.hidden) return setTrendMonthMenu(false);
        if (els.wheelProbabilityHistoryLayer.classList.contains("open")) return setLayer(els.wheelProbabilityHistoryLayer, false);
        if (els.wheelProbabilityLayer.classList.contains("open")) return setLayer(els.wheelProbabilityLayer, false);
        if (els.settleWithdrawalLayer.classList.contains("open")) return setLayer(els.settleWithdrawalLayer, false);
        if (els.releaseNotesLayer.classList.contains("open")) return setLayer(els.releaseNotesLayer, false);
        if (els.versionInfoLayer.classList.contains("open")) return setLayer(els.versionInfoLayer, false);
        if (els.wheelAdjustLayer.classList.contains("open")) return setLayer(els.wheelAdjustLayer, false);
        if (els.changeLayer.classList.contains("open")) { closeChangeAmountMenu(); return setLayer(els.changeLayer, false); }
        if (els.wheelResultLayer.classList.contains("open")) return setLayer(els.wheelResultLayer, false);
        if (els.wheelWithdrawLayer.classList.contains("open")) return setLayer(els.wheelWithdrawLayer, false);
        if (els.wheelPreviewLayer.classList.contains("open")) return setLayer(els.wheelPreviewLayer, false);
        if (els.adminGrantNoticeLayer?.classList.contains("open")) return setLayer(els.adminGrantNoticeLayer, false);
        if (els.adminInventoryAdjustLayer?.classList.contains("open")) return setLayer(els.adminInventoryAdjustLayer, false);
        if (els.adminInventoryLayer?.classList.contains("open")) return setLayer(els.adminInventoryLayer, false);
        if (els.shopMysteryOpenLayer?.classList.contains("open")) return setLayer(els.shopMysteryOpenLayer, false);
        if (els.shopWeeklyGiftLayer?.classList.contains("open")) return setLayer(els.shopWeeklyGiftLayer, false);
        if (els.shopRevealLayer.classList.contains("open")) return setLayer(els.shopRevealLayer, false);
        if (els.shopItemLayer.classList.contains("open")) return setLayer(els.shopItemLayer, false);
        if (els.wheelDecisionLayer.classList.contains("open")) { vibrate(3); return; }
        if (els.wheelToolLayer.classList.contains("open")) return setLayer(els.wheelToolLayer, false);
        if (els.redeemLayer.classList.contains("open")) return setLayer(els.redeemLayer, false);
        if (els.loginLayer.classList.contains("open")) return setLayer(els.loginLayer, false);
        if (els.settingsLayer.classList.contains("open")) return setLayer(els.settingsLayer, false);
        if (state.overviewMode !== "closed") closeOverviewSheet();
      });

      window.addEventListener("resize", () => {
        if (els.overview.classList.contains("open")) drawTrend(buildTrendPoints(state.trendRange));
      });
      db.auth.onAuthStateChange((_event, session) => {
        const previous = state.session?.user?.id || null;
        state.session = session;
        if (_event !== "INITIAL_SESSION" && previous !== (session?.user?.id || null)) {
          authReadVersion++;
          state.isAdmin = false;
          renderAdminState();
          // Auth callbacks run under the SDK lock; verify only after the callback returns.
          setTimeout(() => void refreshAuthState(), 0);
        }
      });

      // -------------------- Boot --------------------

      async function periodicDatabaseRefresh() {
        await Promise.all([loadAppState({silent:true}), loadShopState({silent:true}), refreshAuthState()]);
        if (!state.isAdmin) await refreshGuestGrantNotice();
        if (els.overview.classList.contains("open")) {
          await loadOverviewData(true);
        }
      }

      async function boot() {
        await Promise.allSettled([
          loadAppState(),
          refreshAuthState(),
          loadShopState({ silent: true })
        ]);
        renderPrimaryMetric();
        if (state.isAdmin) await loadAdminInventory({silent:true});
        else await refreshGuestGrantNotice();

      }

        let resumePromise = null;
        function resumeDatabaseRefresh() {
          if (document.hidden || resumePromise) return resumePromise;
          resumePromise = periodicDatabaseRefresh().catch(() => runtime.report("recovery")).finally(() => {resumePromise = null;});
          return resumePromise;
        }
        setInterval(resumeDatabaseRefresh, 30 * 60 * 1000);

        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState !== "visible") return;
          const last = state.lastRefreshAt instanceof Date ? state.lastRefreshAt.getTime() : 0;
          const elapsed = Date.now() - last;
          if (!last || elapsed >= 60 * 1000) void resumeDatabaseRefresh();
        });

        window.addEventListener("pageshow", event => {
          const last = state.lastRefreshAt instanceof Date ? state.lastRefreshAt.getTime() : 0;
          const elapsed = Date.now() - last;
          if (event.persisted || !last || elapsed >= 60 * 1000) void resumeDatabaseRefresh();
        });
        window.addEventListener("online", () => void resumeDatabaseRefresh());


      // Additive adapter: preserve the original implementations and extend their results.
      let notificationFat=null;
      if (window.PointsFatLoss) {
        try {
        const fatModule = window.PointsFatLoss.attach({
          db, state, els,
          ui: {
            setLayer, showToast, vibrate, setBusy,
            renderPrimaryMetric: (...args) => renderPrimaryMetric(...args),
            renderOverviewContentMode: () => renderOverviewContentMode(),
            openOverviewSheet: () => openOverviewSheet(),
            setOverviewMode: mode => setOverviewMode(mode)
          }
        });
        notificationFat=fatModule;
        const originalPrimaryMetric = renderPrimaryMetric;
        renderPrimaryMetric = (...args) => { originalPrimaryMetric(...args); fatModule.renderHome(); };
        const originalAdminState = renderAdminState;
        renderAdminState = (...args) => { originalAdminState(...args); fatModule.adminRendered(); };
        const originalOverviewContent = renderOverviewContentMode;
        renderOverviewContentMode = (...args) => { originalOverviewContent(...args); fatModule.renderOverview(); };
        const originalOverviewPeekHeight = currentOverviewPeekHeight;
        currentOverviewPeekHeight = () => state.activeMetric === "fat" ? fatModule.peekHeight() : originalOverviewPeekHeight();
        const originalOverviewMode = setOverviewMode;
        setOverviewMode = (...args) => { originalOverviewMode(...args); fatModule.draw(); };
        const originalExpandOverview = expandOverviewSheet;
        expandOverviewSheet = () => {
          if (state.activeMetric === "fat" && !state.overviewSection) fatModule.chooseSection("trend",false);
          originalExpandOverview();
        };
        const originalSwitchMetric = switchMetric;
        switchMetric = nextMetric => {
          if (nextMetric !== "fat") return originalSwitchMetric(nextMetric);
          if (state.wheelSpinning || state.wheelRequestInFlight) return showToast("转盘正在处理，请稍后再切换");
          ++metricSwitchToken; clearTimeout(metricSwitchTimer); clearTimeout(metricSwitchInTimer);
          els.home?.classList.remove("metric-fading-out","metric-fading-in");
          fatModule.activate();
        };
        const originalLoadAppState = loadAppState;
        loadAppState = async options => {
          void fatModule.refresh({silent:options?.silent ?? true});
          if (state.activeMetric === "fat" && state.overviewMode !== "closed") void fatModule.loadLogs(true);
          return originalLoadAppState(options);
        };
        } catch (error) {
          console.error("fatModuleInitialization:", error?.name || "Error");
          runtime.report("fat");
          // Keep the original modules usable if this optional module cannot initialize.
          document.querySelector('[data-metric="fat"]')?.remove();
          document.querySelector('.fat-home-content')?.remove();
          document.querySelector('#fatOverviewContent')?.remove();
          document.querySelector('#fatAdminSettings')?.remove();
          document.querySelector('#fatUnitSettings')?.remove();
          document.querySelector('#fatWeightLayer')?.remove();
          els.home?.classList.remove("fat-active");
          els.metricSwitch?.classList.remove("fat-switch-active");
        }
      } else runtime.report("fat");

      if (window.PointsKitchen) {
        try {
          const kitchen = window.PointsKitchen.attach({db,state,els,ui:{
            setLayer,showToast,closeAllLayers,closeOverviewSheet,
            renderScore:()=>renderPrimaryMetric(),
            refreshScore:async()=>{if(appReadPromise)await appReadPromise;return loadAppState({silent:true});}
          }});
          const previousAdminRender=renderAdminState;
          renderAdminState=(...args)=>{previousAdminRender(...args);kitchen.roleChanged();};
          const previousAuthRead=refreshAuthState;
          refreshAuthState=async (...args)=>{await previousAuthRead(...args);kitchen.roleChanged(true);};
        } catch(error) {console.error('kitchenInitialization:',error?.name);runtime.report('kitchen');}
      } else runtime.report('kitchen');
      if (window.PointsWebPush) {
        try {
          const push=window.PointsWebPush.attach({db,state,els,ui:{closeAllLayers},
            backendUrl:SUPABASE_URL+'/functions/v1/points-web-push',apiKey:SUPABASE_PUBLISHABLE_KEY});
          const previousAuthRead=refreshAuthState;
          refreshAuthState=async (...args)=>{await previousAuthRead(...args);push.roleChanged();};
        } catch(error) {console.error('pushInitialization:',error?.name);}
      }
      if(window.PointsNotifications) {
        try {
        const notices=window.PointsNotifications.attach({db,state,els,ui:{setLayer,closeAllLayers,closeOverviewSheet},navigate:route=>{
          closeAllLayers();closeOverviewSheet();
          document.querySelector('.app-nav [data-value="'+(route==='kitchen'?'kitchen':'world')+'"]')?.click();
          if(route==='kitchen'){document.querySelector('[data-kitchen-action="tab"][data-value="orders"]')?.click();return;}
          if(route==='devices'){els.settingsBtn.click();document.getElementById('pointsAccessDevices')?.click();setTimeout(()=>document.getElementById('pointsAccessSettings')?.scrollIntoView({block:'start',behavior:'smooth'}),100);return;}
          if(route==='services'){switchMetric('fat');void notificationFat?.openServices();return;}
          if(route==='fat'){switchMetric('fat');void notificationFat?.openSettlement();return;}
          if(route==='assets'){void openShop('inventory');return;}
          switchMetric(['wheel','withdrawals'].includes(route)?'wheel':'score');
          setTimeout(()=>{openOverviewSheet();void loadOverviewData(true);},220);
        }});
        const previousNoticeAuth=refreshAuthState;
        refreshAuthState=async(...args)=>{await previousNoticeAuth(...args);notices.roleChanged();};
        }catch(error){console.error('notificationsInitialization:',error?.name);runtime.report('notifications');}
      }
      const access=window.PointsDeviceAccess.attach({db,state,els,ui:{setLayer,closeAllLayers,renderAdminState:()=>renderAdminState()},
        apiOrigin:SUPABASE_URL,readAuth:()=>refreshAuthState(),onUnlocked:()=>void boot().catch(()=>runtime.report('startup'))});
      const previousAccessRender=renderAdminState;
      renderAdminState=(...args)=>{previousAccessRender(...args);access.authChanged();};
      window.PointsHomeGestures?.attach({state,els,switchMetric:next=>switchMetric(next)});
      runtime.ready(() => resumeDatabaseRefresh());
      void access.start().catch(() => access.lock('暂时无法确认权限，请检查网络后重试。'));
    })();
