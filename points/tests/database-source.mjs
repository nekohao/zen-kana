// Test-only historical inputs. Current full/increment SQL always read from live files.
import nativeFs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
let fixture;
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
