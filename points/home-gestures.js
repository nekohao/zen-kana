/* A deliberate shortcut on the overview card, never a page-wide swipe. */
(() => {
  'use strict';
  window.PointsHomeGestures = { attach };
  function attach({state,els,switchMetric}) {
    const card=els.overviewBtn, app=document.getElementById('pointsApp');
    const metrics=['score','wheel','fat'];
    let drag=null, suppressUntil=0, frame=0;
    card.insertAdjacentHTML('beforeend','<span class="overview-swipe-hint" aria-hidden="true">左右滑动切换</span>');
    card.querySelector('svg')?.before(card.querySelector('.overview-swipe-hint'));
    card.setAttribute('aria-description','点击查看总览；在此处左右滑动可切换分数、大转盘和减脂。');
    function blocked() {
      return app.dataset.page==='kitchen' || app.inert || state.overviewMode!=='closed'
        || state.wheelSpinning || state.wheelRequestInFlight
        || !!document.querySelector('.modal-layer.open,.kitchen-critical-layer:not([hidden])');
    }
    function clearFeedback() {
      card.classList.remove('swipe-dragging','swipe-ready');
      card.style.removeProperty('--swipe-x');card.querySelector('.overview-swipe-hint').textContent='左右滑动切换';
    }
    function reset() {
      if(drag)try{card.releasePointerCapture(drag.id);}catch(_){}
      drag=null;clearFeedback();
    }
    card.addEventListener('pointerdown',e=>{
      if(blocked() || drag || e.button!==0 || e.isPrimary===false)return;
      drag={id:e.pointerId,x:e.clientX,y:e.clientY,dx:0,dy:0,moved:false,horizontal:false,
        metric:state.activeMetric,threshold:Math.max(64,card.getBoundingClientRect().width*.2)};
      try{card.setPointerCapture(e.pointerId);}catch(_){}
    });
    card.addEventListener('pointermove',e=>{
      if(!drag || drag.id!==e.pointerId)return;
      if(blocked() || drag.metric!==state.activeMetric){suppressUntil=performance.now()+400;reset();return;}
      drag.dx=e.clientX-drag.x;drag.dy=e.clientY-drag.y;
      if(Math.hypot(drag.dx,drag.dy)<10){clearFeedback();return;}
      drag.moved=true;drag.horizontal=Math.abs(drag.dx)>Math.abs(drag.dy)*1.5;
      if(!drag.horizontal){clearFeedback();return;}
      e.preventDefault();card.classList.add('swipe-dragging');
      const index=metrics.indexOf(drag.metric), next=index+(drag.dx<0?1:-1);
      const available=metrics[next] && document.querySelector(`[data-metric="${metrics[next]}"]`);
      const ready=available && Math.abs(drag.dx)>=drag.threshold;
      card.classList.toggle('swipe-ready',!!ready);
      card.style.setProperty('--swipe-x',`${Math.max(-18,Math.min(18,drag.dx*.12))}px`);
      card.querySelector('.overview-swipe-hint').textContent=ready?`松开切换${['分数','大转盘','减脂'][next]}`:'左右滑动切换';
    },{passive:false});
    const end=e=>{
      if(!drag || e.pointerId!==drag.id)return;
      const d=drag, next=metrics.indexOf(d.metric)+(d.dx<0?1:-1);
      const commit=e.type==='pointerup' && !blocked() && d.metric===state.activeMetric
        && d.horizontal && Math.abs(d.dx)>=d.threshold && metrics[next]
        && document.querySelector(`[data-metric="${metrics[next]}"]`);
      if(d.moved)suppressUntil=performance.now()+400;
      reset();if(commit){navigator.vibrate?.(8);switchMetric(metrics[next]);}
    };
    card.addEventListener('pointerup',end);card.addEventListener('pointercancel',end);
    card.addEventListener('lostpointercapture',()=>{if(drag){if(drag.moved)suppressUntil=performance.now()+400;reset();}});
    card.addEventListener('click',e=>{
      if(e.detail!==0 && performance.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();}
    },true);
    // Fat loss has an earlier capture listener on this button. Intercept at the
    // document first, so the release click cannot open the newly selected overview.
    document.addEventListener('click',e=>{
      if(card.contains(e.target) && e.detail!==0 && performance.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();}
    },true);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
    function fitViewport() {
      cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
        if(document.activeElement?.matches('input,textarea,select'))return;
        const height=window.visualViewport?.height || window.innerHeight;
        if(height>0)app.style.setProperty('--app-height',`${Math.round(height)}px`);
      });
    }
    window.addEventListener('resize',fitViewport);window.addEventListener('pageshow',fitViewport);
    window.visualViewport?.addEventListener('resize',fitViewport);
    document.addEventListener('focusout',fitViewport);fitViewport();
  }
})();
