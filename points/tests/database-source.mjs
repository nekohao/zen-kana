// Test-only historical inputs. Current full/increment SQL always read from live files.
import nativeFs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));
let fixture;
let incrementBase;
export async function readIncrementBase(){
 if(!incrementBase)incrementBase=(async()=>{
  const data=JSON.parse(await nativeFs.readFile(new URL('../sql-backup/current-schema.json',import.meta.url),'utf8'));
  let commit=data.increment?.base_commit;
  if(!/^[a-f0-9]{40}$/.test(commit||''))throw Error('Current increment needs a reviewed Git baseline');
  const read=name=>execFileSync('git',['show',commit+':points/'+name],{cwd:root,encoding:'utf8',maxBuffer:4000000});
  const schema=JSON.parse(read('sql-backup/current-schema.json')),steps=[],seen=new Set();
  let cursor=schema;
  while(commit){
   if(seen.has(commit)||!/^[a-f0-9]{40}$/.test(commit))throw Error('Invalid historical increment chain');
   seen.add(commit);steps.unshift(read('schema-increment.sql'));
   commit=cursor.increment?.base_commit;
   if(commit)cursor=JSON.parse(read('sql-backup/current-schema.json'));
  }
  return {schema,sql:steps.join('\n')};
 })();
 return incrementBase;
}
async function readFile(file,options){
 const full=file instanceof URL?fileURLToPath(file):path.resolve(file);
 const key=path.relative(root,full).replaceAll('\\','/');
 if(key.endsWith('.sql')&&!['schema-full.sql','schema-increment.sql'].includes(key)){
  fixture ||= nativeFs.readFile(new URL('database-fixtures.json',import.meta.url),'utf8').then(JSON.parse);
  const lines=(await fixture).sources[key];
  if(!lines)throw Error('Unknown historical SQL fixture: '+key);
  const text=lines.join('\n'),encoding=typeof options==='string'?options:options?.encoding;
  return encoding?Buffer.from(text).toString(encoding):Buffer.from(text);
 }
 return nativeFs.readFile(file,options);
}
export default {...nativeFs,readFile};
