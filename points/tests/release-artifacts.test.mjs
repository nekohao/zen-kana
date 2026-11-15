import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {bundle} from '../scripts/build.mjs';
process.env.TZ='UTC';
const release=JSON.parse(await fs.readFile(new URL('../version.json',import.meta.url),'utf8'));
const result=await bundle(release);let checks=0;
for(const [file,text] of [...result.files,['index.html',result.html],['sw.js',result.worker]]){
 const bytes=await fs.readFile(new URL('../'+file,import.meta.url));
 assert.equal(bytes.toString('utf8'),text,file+' matches sources');checks++;
 const entry=[...release.assets,release.shell].find(entry=>entry.url===file);
 if(entry){assert.equal(bytes.length,entry.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256);checks+=2;}
 if(file.endsWith('.js'))new vm.Script(text,{filename:file});
}
for(const match of result.html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
assert.deepEqual(result.release,release);checks++;
const legacy=await bundle({build:release.build,updatedAt:'11/14/2026 14:55:26'});
const explicit=await bundle({build:release.build,updatedAt:'2026-11-14T06:55:26Z'});
assert.equal(legacy.html,explicit.html,'legacy timestamp uses Shanghai time on a UTC runner');checks++;
assert.equal(legacy.release.updatedAt,'11/14/2026 14:55:26','published metadata is preserved for reproducible builds');checks++;
await assert.rejects(bundle({build:release.build,updatedAt:'2026-11-14T14:55:26'}),/Invalid release metadata/);checks++;
console.log(`${checks} generated artifact bytes, hashes, manifest, worker and inline syntax checks passed.`);
