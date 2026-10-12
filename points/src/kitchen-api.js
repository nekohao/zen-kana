/* Allow existing kitchens to remain readable while the incremental SQL is pending. */
(() => {
  'use strict';
  const readNames=new Set(['get_state','get_order','get_reviews']);
  window.PointsKitchenApi={create(db){
    const api={legacy:false,async rpc(name,args={}){
      if(/^points_kitchen_v3_get_(state|order)$/.test(name)){
        const next=await db.rpc(name,args);
        const missing=next.error && /PGRST202|42883|Could not find.*function|schema cache/i.test(`${next.error.code} ${next.error.message}`);
        if(!next.error && name==='points_kitchen_v3_get_state')api.legacy=false;
        return missing?api.rpc(name.replace('_v3_','_v2_'),args):next;
      }
      let result=await db.rpc(name,args);
      const suffix=name.replace(/^points_kitchen_v2_/,'');
      const missing=result.error && /PGRST202|42883|Could not find.*function|schema cache/i.test(`${result.error.code} ${result.error.message}`);
      if(missing && readNames.has(suffix)){
        result=await db.rpc(`points_kitchen_${suffix}`,args);
        if(!result.error && suffix==='get_state')api.legacy=true;
      }else if(!result.error && suffix==='get_state')api.legacy=false;
      return result;
    }};
    return api;
  }};
})();
