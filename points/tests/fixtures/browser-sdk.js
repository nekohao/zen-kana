/* Served only by preview-server.mjs instead of the SDK. Never ship as app code. */
(() => {
  const legacy=new URLSearchParams(location.search).get('legacy')==='1';
  const role=new URLSearchParams(location.search).get('role')==='admin'?'admin':'guest';
  const session=role==='admin'?{user:{id:'00000000-0000-0000-0000-000000000001',email:'preview@example.invalid'}}:null;
  const demoReady=role==='guest'&&new URLSearchParams(location.search).get('demo')==='1'?new Promise((resolve,reject)=>{
    const request=indexedDB.open('points-device-access-v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('credential');
    request.onsuccess=()=>{const storage=request.result,tx=storage.transaction('credential','readwrite');tx.objectStore('credential').put({id:'00000000-0000-0000-0000-000000000003',token:'e'.repeat(64),authorized:true},'installation');tx.oncomplete=()=>{storage.close();resolve();};tx.onerror=()=>reject(tx.error);};request.onerror=()=>reject(request.error);
  }):Promise.resolve();
  const db={
    auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),getSession:async()=>{await demoReady;return {data:{session},error:null};},signOut:async()=>({error:null})},
    async rpc(name,args={}){
      try{const credential=window.PointsDeviceAccess?.credential();const res=await fetch('/__demo/rpc',{method:'POST',headers:{'Content-Type':'application/json','x-client-info':'preview'+(credential?';points-device='+credential:'')},body:JSON.stringify({role,name,args,legacy})});return await res.json();}
      catch(e){return {data:null,error:{code:'08006',message:e.message}};}
    }
  };
  window.supabase={createClient:()=>db};
  (()=>{
    const tag=document.createElement('div');tag.className='preview-label';
    tag.style.cssText='position:fixed;z-index:30000;top:0;left:0;right:0;background:#faf7f2;color:#937958;font:10px/20px system-ui;text-align:center';
    tag.innerHTML=`本地体验 · ${role==='admin'?'哥哥':'宝宝'} · 数据为演示数据　<a href="?role=${role==='admin'?'guest':'admin'}" style="color:inherit">切换身份</a>`;
    document.body.append(tag);
  })();
})();
