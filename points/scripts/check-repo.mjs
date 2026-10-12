// Read-only repository checks. Never stage, delete, or upload files.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const entries=['.gitignore','AGENTS.md','README.md','index.html','sw.js','version.json','manifest.webmanifest','schema-full.sql','schema-increment.sql'];
const directories=new Set(['src','scripts','docs','tests','assets','ICON','images','sql-backup','vendor']);
const documents=new Set(['AGENTS.md','README.md','docs/DEVELOPMENT.md','docs/PRODUCT.md','vendor/README.md','images/kitchen/IMAGE-PROMPTS.md']);
const required=[...entries,'scripts/build.mjs','scripts/build-sql-backup.py','scripts/check-repo.mjs','scripts/retained-releases.json','src/index.source.html','src/sw.source.js','docs/DEVELOPMENT.md','docs/PRODUCT.md'];
export function validatePaths(files,release,compatibility){
 const paths=files.filter(f=>f.startsWith('points/')).map(f=>f.slice(7));
 const errors=[];
 const assets=new Set([release,...compatibility.releases].flatMap(r=>[r.shell,...r.assets].map(a=>a.url)));
 for(const name of required)if(!paths.includes(name))errors.push('Missing required entry: points/'+name);
 for(const name of paths){
  const directory=name.split('/')[0],label='points/'+name;
  if(!name.includes('/')&&!entries.includes(name))errors.push('Unexpected root file: '+label);
  if(name.includes('/')&&!directories.has(directory))errors.push('Unexpected directory: '+label);
  if(/\.md$/i.test(name)&&!documents.has(name))errors.push('Update existing documentation instead of adding a report: '+label);
  if(/\.sql$/i.test(name)&&!['schema-full.sql','schema-increment.sql'].includes(name))errors.push('Only two SQL entry points allowed: '+label);
  if(/(?:^|\/)(?:\.env[^/]*|node_modules|__pycache__|\.cache|tmp|reports)(?:\/|$)|\.(?:zip|log|pyc|secrets\.json)$/i.test(name))errors.push('Local or generated material cannot be committed: '+label);
  if(name.startsWith('tests/')&&/\.(?:png|jpe?g|webp|html)$/i.test(name))errors.push('Preview output stays local: '+label);
  if(name.startsWith('assets/')&&name!=='assets/.gitattributes'&&!assets.has(name))errors.push('Asset absent from current/retained manifests: '+label);
  if(name.startsWith('src/')&&!/\.(?:js|css)$/.test(name)&&!['src/index.source.html','src/.gitattributes'].includes(name))errors.push('Unexpected source file: '+label);
  if(['src/sw.js','src/index.html'].includes(name))errors.push('Publish output belongs at points root: '+label);
  if(name.startsWith('scripts/')&&!/\.(?:mjs|py|json)$/.test(name)&&name!=='scripts/hooks/pre-commit')errors.push('Unexpected maintenance tool: '+label);
  if(name.startsWith('docs/')&&!documents.has(name))errors.push('Keep two current documents: '+label);
  if(name.startsWith('tests/')&&!/\.(?:mjs|js|json)$/.test(name))errors.push('Only reproducible test sources/fixtures allowed: '+label);
  if(name.startsWith('images/')&&!/\.(?:jpe?g|png|webp|svg)$/.test(name)&&name!=='images/kitchen/IMAGE-PROMPTS.md')errors.push('Image generation outputs stay local: '+label);
  if(name.startsWith('sql-backup/')&&!['sql-backup/current-schema.json','sql-backup/online-confirmed.json'].includes(name))errors.push('Only maintained/original structural metadata allowed: '+label);
  if(/^tests\/(?:preview-server|release-preview|ui-consistency-preview|preview-fixture)\./.test(name))errors.push('Use the maintained family preview and shared fixtures: '+label);
 }
 return [...new Set(errors)];
}
function git(args){return execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:4000000});}
export function obsoleteSourceReferences(text,sources){
 const references=sources.filter(name=>["new URL('../"+name+"'",'new URL("../'+name+'"',"'points/"+name+"'",'"points/'+name+'"'].some(fragment=>text.includes(fragment)));
 if(/from ['"]\.\.\/build\.mjs['"]/.test(text))references.push('build.mjs');
 if(text.includes('points/build-sql-backup.py'))references.push('build-sql-backup.py');
 return references;
}
export function checkRepository({staged=false}={}){
 const files=git(staged?['ls-files','--cached']:['ls-tree','-r','--name-only','HEAD']).trim().split(/\r?\n/);
 const read=name=>git(['show',(staged?':':'HEAD:')+name]);
 const errors=validatePaths(files,JSON.parse(read('points/version.json')),JSON.parse(read('points/scripts/retained-releases.json')));
 const sources=files.filter(n=>n.startsWith('points/src/')).map(n=>n.slice('points/src/'.length));
 for(const file of files.filter(n=>/^points\/tests\/.*\.mjs$/.test(n))){
  const obsolete=obsoleteSourceReferences(read(file),sources);
  if(obsolete.length)errors.push('Update moved source references in '+file+': '+obsolete.join(', '));
 }
 const expected=execFileSync('python',['-X','utf8','-c',"import runpy,json,sys; tool=runpy.run_path('points/scripts/build-sql-backup.py'); print(tool['render'](json.load(sys.stdin)),end='')"],{cwd:root,input:read('points/sql-backup/current-schema.json'),encoding:'utf8',maxBuffer:4000000});
 if(expected.replace(/\r\n?/g,'\n')!==read('points/schema-full.sql').replace(/\r\n?/g,'\n'))errors.push('Full SQL and maintained metadata differ in the '+(staged?'staged':'committed')+' tree.');
 return errors;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const flags=process.argv.slice(2);
 if(flags.some(f=>!['--staged','--if-points-staged'].includes(f)))throw Error('Usage: node points/scripts/check-repo.mjs [--staged] [--if-points-staged]');
 if(flags.includes('--if-points-staged')&&!git(['diff','--cached','--name-only']).split(/\r?\n/).some(n=>n.startsWith('points/')||n==='AGENTS.md'))process.exit(0);
 try{
  const errors=checkRepository({staged:flags.includes('--staged')});
  if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
  else console.log('Repository layout, six current documents, two SQL entries and published asset boundaries verified.');
 }catch(error){console.error(error.message);process.exitCode=1;}
}
