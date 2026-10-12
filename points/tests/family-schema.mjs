// Apply the actual migration locally, export only affected metadata, never connect to production.
import fs from './database-source.mjs';
import {createFamilyDatabase} from './family-db.mjs';
const {db}=await createFamilyDatabase();
const root=new URL('../',import.meta.url);
async function write(file,text){const h=await fs.open(new URL(file,root),'w');try{const lines=text.split('\n');for(let i=0;i<lines.length;i+=200)await h.write(lines.slice(i,i+200).join('\n')+(i+200<lines.length?'\n':''));}finally{await h.close();}}
try{
 const base=JSON.parse(await fs.readFile(new URL('sql-backup/current-schema.json',root),'utf8'));
 const exported=(await db.query(await fs.readFile(new URL('schema-export-readonly.sql',root),'utf8'))).rows[0].schema_export;
 const fresh=typeof exported==='string'?JSON.parse(exported):exported;
 const affected=o=>o.schema==='public'&&o.name.startsWith('points_family_');
 for(const key of ['relations','sequences','functions']){
  const objects=fresh[key].filter(affected);
  for(const object of objects){const index=base[key].findIndex(old=>old.schema===object.schema&&old.name===object.name&&old.identity_arguments===object.identity_arguments);if(index<0)base[key].push(object);else base[key][index]=object;}
 }
 for(const f of base.functions.filter(f=>f.schema==='public'&&/^points_kitchen_(v[23]_)?(admin_save|admin_review|guest_save|guest_resolve)$/.test(f.name))){f.acl=fresh.functions.find(x=>x.schema===f.schema&&x.name===f.name&&x.identity_arguments===f.identity_arguments).acl;}
 const migration=await fs.readFile(new URL('schema-increment.sql',root),'utf8');
 base.initialization_sql=[migration.slice(migration.indexOf('INSERT INTO public.points_family_types('),migration.indexOf('DO NOTHING;',migration.indexOf('INSERT INTO public.points_family_types('))+11)];
 const oldMeal=base.relations.find(r=>r.name==='points_kitchen_orders');
 oldMeal.triggers=(oldMeal.triggers||[]).filter(t=>t.name!=='points_family_guard_legacy').concat(fresh.relations.find(r=>r.name==='points_kitchen_orders').triggers.filter(t=>t.name==='points_family_guard_legacy'));
 const notice=base.functions.find(f=>f.schema==='points_notice'&&f.name==='business_event');
 notice.definition=fresh.functions.find(f=>f.schema==='points_notice'&&f.name==='business_event').definition;
 await write('sql-backup/current-schema.json',JSON.stringify(base,null,2)+'\n');
 console.log(`Maintained schema: ${base.relations.length} relations / ${base.functions.length} functions; unrelated definitions preserved.`);
}finally{await db.close();}
