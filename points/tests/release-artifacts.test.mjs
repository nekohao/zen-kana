import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {bundle} from '../build.mjs';
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
console.log(`${checks} generated artifact bytes, hashes, manifest, worker and inline syntax checks passed.`);
