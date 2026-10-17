import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {validatePaths,obsoleteSourceReferences,validateSqlPair} from '../scripts/check-repo.mjs';
const current=JSON.parse(await fs.readFile(new URL('../version.json',import.meta.url),'utf8'));
const retained=JSON.parse(await fs.readFile(new URL('../scripts/retained-releases.json',import.meta.url),'utf8'));
const base=['.gitignore','AGENTS.md','README.md','index.html','sw.js','version.json','manifest.webmanifest','schema-full.sql','schema-increment.sql','scripts/build.mjs','scripts/build-sql-backup.py','scripts/check-repo.mjs','scripts/retained-releases.json','src/index.source.html','src/sw.source.js','docs/DEVELOPMENT.md','docs/PRODUCT.md'].map(n=>'points/'+n);
let checks=0;
assert.deepEqual(validatePaths(base,current,retained),[]);checks++;
for(const name of ['EDITION-20261012.md','docs/NEW-REPORT.md','src/index.html','tests/screenshot.png','tests/gallery.html','extra.sql','scripts/old.sql','.env.local','tests/output.zip','assets/fake.js','scratch/file.js','images/kitchen/generated-manifest.json','sql-backup/state.json','tests/preview-server.mjs']){
 assert.ok(validatePaths([...base,'points/'+name],current,retained).length,name+' rejected');checks++;
}
assert.deepEqual(validatePaths([...base,'points/'+current.assets[0].url,'points/'+retained.releases[0].shell.url,'points/src/family.js','points/tests/fixtures/browser-sdk.js'],current,retained),[]);checks++;
assert.ok(validatePaths(base.filter(n=>!n.endsWith('schema-increment.sql')),current,retained).length);checks++;
assert.deepEqual(obsoleteSourceReferences("new URL('../"+"app.js',import.meta.url)",['app.js']),['app.js']);checks++;
assert.deepEqual(obsoleteSourceReferences("new URL('../src/app.js',import.meta.url)",['app.js']),[]);checks++;
assert.deepEqual(obsoleteSourceReferences("git show f8d3825:points/ui-theme.css",['ui-theme.css']),[]);checks++;
assert.deepEqual(validateSqlPair(['points/src/app.js']),[]);checks++;
assert.deepEqual(validateSqlPair(['points/schema-full.sql','points/schema-increment.sql']),[]);checks++;
assert.equal(validateSqlPair(['points/schema-full.sql']).length,1);checks++;
assert.equal(validateSqlPair(['points/schema-increment.sql']).length,1);checks++;
console.log(checks+' repository allowlist, paired SQL changes, screenshots, secrets and asset registration checks passed.');
