/* Isolated legacy migration test only; never connects to Supabase. */
window.supabase={createClient:()=>({
 auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),getSession:async()=>({data:{session:null},error:null}),signOut:async()=>({error:null})},
 rpc:async()=>({data:null,error:{code:'42501',message:'Isolated migration fixture'}})
})};
