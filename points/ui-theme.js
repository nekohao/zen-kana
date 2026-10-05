/* Presentation adapter: observes UI state; no RPCs, account changes or stored data. */
(() => {
  "use strict";
  function attach() {
    const app=document.getElementById("pointsApp"), switcher=document.getElementById("metricSwitch");
    if (!app || !switcher) return;
    const fixedThemes={
      score:["changeLayer","redeemLayer","shopItemLayer","shopWeeklyGiftLayer","shopMysteryOpenLayer","adminInventoryLayer","adminInventoryAdjustLayer","adminGrantNoticeLayer","shopRevealLayer"],
      wheel:["wheelProbabilityLayer","wheelProbabilityHistoryLayer","wheelToolLayer","wheelPreviewLayer","wheelAdjustLayer","wheelDecisionLayer","wheelResultLayer","wheelWithdrawLayer","settleWithdrawalLayer"],
      fat:["fatWeightLayer","fatRewardLayer"]
    };
    const themeById=new Map(Object.entries(fixedThemes).flatMap(([theme,ids])=>ids.map(id=>[id,theme])));
    const layers=new Set(); let theme="score", queued=0, blurBase=null;
    const sync=()=>{
      queued=0;
      const selected=switcher.querySelector('[data-metric][aria-selected="true"]')?.dataset.metric;
      if (["score","wheel","fat"].includes(selected)) theme=selected;
      if (app.dataset.uiTheme!==theme) app.dataset.uiTheme=theme;
      for (const layer of layers) {
        const next=themeById.get(layer.id)||theme;
        if (layer.dataset.uiTheme!==next) layer.dataset.uiTheme=next;
      }
      const overview=document.getElementById("overview");
      const open=[...layers,overview].filter(layer=>layer?.classList.contains("open"));
      // The lowest visible window owns the blur, including when a dialog covers a sheet.
      const nextBase=open.reduce((base,layer)=>!base || Number(getComputedStyle(layer).zIndex)<Number(getComputedStyle(base).zIndex) ? layer : base,null);
      if (nextBase && nextBase!==blurBase) {
        blurBase?.classList.remove("ui-blur-base");
        blurBase=nextBase; blurBase.classList.add("ui-blur-base");
      }
      // Retain the last blur during fade-out; the closed layer becomes hidden afterward.
      document.body.classList.toggle("ui-window-open",open.length>0);
    };
    const schedule=()=>{ if (!queued) queued=requestAnimationFrame(sync); };
    const layerObserver=new MutationObserver(schedule);
    function addHandle(layer,panel) {
      const header=panel.querySelector(".unified-sheet-header"), grabber=header?.querySelector(".grabber");
      if (!grabber) return;
      const handle=document.createElement("div"); handle.className="ui-grabber-hitbox";
      handle.setAttribute("role","button"); handle.tabIndex=0; handle.setAttribute("aria-label","下拉关闭窗口");
      grabber.before(handle); handle.append(grabber);
      let drag=null, raf=0, suppressUntil=0;
      const reset=()=>{
        const previous=drag; drag=null; cancelAnimationFrame(raf); raf=0;
        layer.classList.remove("ui-dragging"); panel.style.transform="";
        if (previous) { try { handle.releasePointerCapture(previous.id); } catch (_) {} }
      };
      const close=()=>{ reset(); layer.classList.remove("open"); layer.setAttribute("aria-hidden","true"); };
      handle.addEventListener("keydown",event=>{ if (["Enter"," "].includes(event.key)) { event.preventDefault(); close(); } });
      handle.addEventListener("pointerdown",event=>{
        if (!layer.classList.contains("open") || drag || event.button!==0 || event.isPrimary===false) return;
        drag={id:event.pointerId,y:event.clientY,pending:event.clientY,time:performance.now(),height:panel.getBoundingClientRect().height,moving:false};
        try { handle.setPointerCapture(event.pointerId); } catch (_) {}
      });
      handle.addEventListener("pointermove",event=>{
        if (!drag || drag.id!==event.pointerId) return;
        const dy=event.clientY-drag.y; if (!drag.moving && dy<7) return;
        if (!drag.moving) { drag.moving=true; layer.classList.add("ui-dragging"); }
        drag.pending=event.clientY; event.preventDefault();
        if (!raf) raf=requestAnimationFrame(()=>{
          raf=0; if (drag) panel.style.transform=`translate3d(0,${Math.min(drag.height,Math.max(0,drag.pending-drag.y)*.96)}px,0)`;
        });
      },{passive:false});
      const end=event=>{
        if (!drag || drag.id!==event.pointerId) return;
        const previous=drag, dy=event.clientY-previous.y;
        reset(); if (!previous.moving) return;
        suppressUntil=performance.now()+240;
        if (event.type==="pointerup" && (dy>76 || (dy>24 && dy/Math.max(1,performance.now()-previous.time)>.42))) close();
      };
      handle.addEventListener("pointerup",end); handle.addEventListener("pointercancel",end);
      handle.addEventListener("lostpointercapture",()=>{ if (drag) reset(); });
      handle.addEventListener("click",event=>{ if (performance.now()<suppressUntil) { event.preventDefault(); event.stopPropagation(); } });
      layer.addEventListener("transitionend",()=>{ if (!layer.classList.contains("open")) reset(); });
    }
    function decorate(layer) {
      if (layers.has(layer)) return;
      const panel=layer.querySelector('[role="dialog"],[role="alertdialog"]'); if (!panel) return;
      layers.add(layer); layer.classList.add("ui-themed","ui-surface"); panel.classList.add("ui-panel");
      layerObserver.observe(layer,{attributes:true,attributeFilter:["class"]});
      if (["redeemLayer","versionInfoLayer","releaseNotesLayer"].includes(layer.id)) addHandle(layer,panel);
    }
    const scan=()=>{ app.querySelectorAll(".modal-layer").forEach(decorate); schedule(); };
    new MutationObserver(scan).observe(app,{childList:true});
    new MutationObserver(schedule).observe(switcher,{attributes:true,subtree:true,attributeFilter:["aria-selected"]});
    const overview=document.getElementById("overview"); if (overview) layerObserver.observe(overview,{attributes:true,attributeFilter:["class"]});
    scan(); sync();
  }
  if (document.readyState==="loading") document.addEventListener("DOMContentLoaded",attach,{once:true}); else attach();
})();
