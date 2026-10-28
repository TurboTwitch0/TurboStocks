const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
test('service worker caches shell only, bypasses APIs and external requests',async () => {
 const handlers={},added=[],put=[];
 const context=vm.createContext({URL,Promise,self:{location:{origin:'https://turbo.test'},addEventListener:(name,handler)=>handlers[name]=handler},
 caches:{open:async()=>({addAll:async files=>added.push(...files),put:async request=>put.push(request.url)}),keys:async()=>[],match:async()=>({offline:true})},fetch:async()=>({ok:true,clone(){return {};}})});
 vm.runInContext(fs.readFileSync('public/sw.js','utf8'),context);
 let pending;handlers.install({waitUntil:promise=>pending=promise});await pending;
 assert.ok(added.includes('/'));assert.ok(added.includes('/icons/turbo-mark.svg'));assert.ok(!added.some(path=>path.startsWith('/api')));
 for (const url of ['https://turbo.test/api/trending-stocks','https://external.test/model.wasm','https://turbo.test/health']) {
  let handled=false;handlers.fetch({request:{method:'GET',url},respondWith:()=>handled=true});assert.equal(handled,false,url);
 }
 let response;handlers.fetch({request:{method:'GET',url:'https://turbo.test/styles.css'},respondWith:p=>response=p,waitUntil:p=>pending=p});await response;await pending;assert.equal(put.length,1);
 context.fetch=async()=>{throw new Error('Offline');};
 handlers.fetch({request:{method:'GET',url:'https://turbo.test/'},respondWith:p=>response=p});assert.equal((await response).offline,true);
});
test('manifest icons are actual PNG files with declared sizes', () => {
 const manifest=JSON.parse(fs.readFileSync('public/manifest.webmanifest','utf8'));
 for(const icon of manifest.icons) {
  const bytes=fs.readFileSync('public'+icon.src),size=Number(icon.sizes.split('x')[0]);
  assert.equal(bytes.subarray(1,4).toString(),'PNG');
  assert.equal(bytes.readUInt32BE(16),size);assert.equal(bytes.readUInt32BE(20),size);
 }
});
test('release service worker uses a fresh cache and removes prior Turbo Stocks shell caches', async () => {
 const handlers={},deleted=[];
 const context=vm.createContext({URL,Promise,self:{location:{origin:'https://turbo.test'},addEventListener:(name,handler)=>handlers[name]=handler},
  caches:{keys:async()=>['turbo-shell-v1.3.1','turbo-shell-v1.3.2','other-app-cache','turbo-shell-v1.3.3'],delete:async key=>deleted.push(key)}});
 vm.runInContext(fs.readFileSync('public/sw.js','utf8'),context);
 let pending;handlers.activate({waitUntil:promise=>pending=promise});await pending;
 assert.deepEqual(deleted,['turbo-shell-v1.3.1','turbo-shell-v1.3.2','turbo-shell-v1.3.3']);
});

