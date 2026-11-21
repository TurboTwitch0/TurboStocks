(function(root){
'use strict';
const KEYS=new Set(['novaUsers','novaSession','novaGuestAccount','novaGuestLessons','novaAccount','novaLessonProgress','novaProfile','novaTheme','turboGuestStateV2','turboRememberTutor','turboTutorHistory','turboCommunityNotes']);
const supported=key=>KEYS.has(key)||/^(turboRememberTutor|turboTutorHistory|turboCommunityNotes):.+$/.test(key);
const signature=data=>JSON.stringify(Object.entries(data).sort(([a],[b])=>a.localeCompare(b)));
const message='Safe saving requires browser IndexedDB storage. Existing available data remains readable and exportable; allow site storage and reload to edit.';
function validData(data){return data!==null&&typeof data==='object'&&!Array.isArray(data)&&Object.entries(data).every(([key,value])=>supported(key)&&typeof value==='string');}
function validate(record){if(!record||!Number.isSafeInteger(record.revision)||record.revision<0||!validData(record.data))throw new Error('The authoritative workspace is damaged. Original records were retained; export recovery copies before repairing storage.');return record;}
class WorkspaceAuthority {
 constructor(){this.ready=false;this.available=false;this.data={};this.revision=-1;this.warning='';this.db=null;this.listeners=[];
  try{this.channel=new BroadcastChannel('turbo-stocks-authority-v1');this.channel.onmessage=event=>{if(event.data?.revision>this.revision)this.listeners.forEach(fn=>fn());};}catch{}
 }
 legacySnapshot(){const data={};for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(supported(key)){const value=localStorage.getItem(key);if(value!==null)data[key]=value;}}return data;}
 read(key){return Object.hasOwn(this.data,key)?this.data[key]:null;}
 snapshot(){return {...this.data};}
 adopt(record){validate(record);this.data={...record.data};this.revision=record.revision;}
 subscribe(listener){this.listeners.push(listener);}
 async digest(data){const bytes=new TextEncoder().encode(signature(data));const hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(n=>n.toString(16).padStart(2,'0')).join('');}
 open(){return new Promise((resolve,reject)=>{
  if(!root.indexedDB){reject(new Error(message));return;}
  const request=indexedDB.open('turbo-stocks-workspace',1);let settled=false;
  const fail=()=>{if(!settled){settled=true;reject(new Error(message));}};
  request.onupgradeneeded=()=>request.result.createObjectStore('records',{keyPath:'key'});
  request.onerror=fail;request.onblocked=fail;
  request.onsuccess=()=>{if(settled){request.result.close();return;}settled=true;this.db=request.result;this.db.onversionchange=()=>{this.db.close();this.available=false;this.warning='Storage was changed in another tab. Reload before saving.';};resolve(this.db);};
 });}
 transaction(mode,prepare){return new Promise((resolve,reject)=>{
  let tx,result,problem;
  try{tx=this.db.transaction('records',mode);}catch{reject(new Error(message));return;}
  tx.oncomplete=()=>resolve(result);
  tx.onabort=()=>reject(problem||new Error('Authoritative browser storage did not commit. Existing saved data is unchanged.'));
  tx.onerror=()=>{};
  try{prepare(tx.objectStore('records'),value=>{result=value;},error=>{problem=error;tx.abort();});}catch(error){problem=error;try{tx.abort();}catch{reject(error);}}
 });}
 async initialize(){
  let legacy={},legacyReadable=true;try{legacy=this.legacySnapshot();}catch{legacyReadable=false;this.warning='Legacy browser storage is unavailable; no legacy values were removed.';}
  this.data={...legacy};let loaded,divergent=false;
  try{
   await this.open();const fingerprint=await this.digest(legacy);
   const record=await this.transaction('readwrite',(store,done,fail)=>{
    const request=store.get('current');request.onsuccess=()=>{try{
     loaded=request.result;
     if(!loaded){if(!legacyReadable)throw new Error('Legacy data could not be read. Allow browser storage before migrating saved data.');loaded={key:'current',revision:0,data:legacy,mirrors:[fingerprint]};store.put(loaded);}
     else{validate(loaded);if(Object.keys(legacy).length && !(loaded.mirrors||[]).includes(fingerprint)){divergent=true;store.put({key:'recovery:'+fingerprint,data:legacy,createdAt:new Date().toISOString(),reason:'Divergent legacy browser copy'});}}
     done(loaded);
    }catch(error){this.invalidRecord=loaded;fail(error);}
    };
   });this.adopt(record);this.available=true;if(divergent)this.warning="A differing legacy browser copy was preserved. Export a backup to download preserved copies; older running versions are not authoritative.";
  }catch(error){if(loaded&&validData(loaded.data))this.data={...loaded.data};this.warning=error.message||message;this.available=false;}
  this.ready=true;return this;
 }
 load(){if(!this.available)return Promise.reject(new Error(this.warning||message));return this.transaction('readonly',(store,done,fail)=>{const request=store.get('current');request.onsuccess=()=>{try{done(validate(request.result));}catch(error){this.invalidRecord=request.result;fail(error);}};});}
 async preserve(data,reason){if(!Object.keys(data).length)return;const fingerprint=await this.digest(data);await this.transaction('readwrite',(store,done)=>{store.put({key:'recovery:'+fingerprint,data:{...data},createdAt:new Date().toISOString(),reason});done(true);});}
 async commit(revision,data){
  if(!this.available)throw new Error(this.warning||message);
  if(!validData(data))throw new Error('The proposed browser data has an unsupported storage envelope. Nothing was saved.');
  const next={...data},fingerprint=await this.digest(next);let legacy=null,legacyFingerprint;
  try{legacy=this.legacySnapshot();legacyFingerprint=await this.digest(legacy);}catch{}
  const record=await this.transaction('readwrite',(store,done,fail)=>{
   const request=store.get('current');request.onsuccess=()=>{try{
    const current=request.result;
    validate(current);
    if(!current||current.revision!==revision){fail(new Error('Saved progress changed before commit. Refresh this tab and retry; nothing was replaced.'));return;}
    if(legacy&&Object.keys(legacy).length&&!(current.mirrors||[]).includes(legacyFingerprint))store.put({key:'recovery:'+legacyFingerprint,data:legacy,createdAt:new Date().toISOString(),reason:'Legacy copy retained before authoritative save'});
    const updated={key:'current',revision:revision+1,data:next,previousData:current.data,mirrors:[...new Set([fingerprint,...(current.mirrors||[])])].slice(0,100)};
    store.put(updated);done(updated);
   }catch(error){fail(error);}
   };
  });
  // From here the authoritative transaction is durable. Mirror failures must never
  // reject this save or roll it back.
  this.adopt(record);let warning='';
  try{
   const latestLegacy=this.legacySnapshot(),latestFingerprint=await this.digest(latestLegacy);
   if(Object.keys(latestLegacy).length&&!(record.mirrors||[]).includes(latestFingerprint)&&latestFingerprint!==legacyFingerprint)await this.preserve(latestLegacy,'Legacy copy retained before cache mirroring');
   for(const key of Object.keys(latestLegacy))if(!Object.hasOwn(next,key))localStorage.removeItem(key);
   for(const [key,value]of Object.entries(next))localStorage.setItem(key,value);
  }catch{warning='Saved in authoritative browser storage. A legacy cache copy could not be updated and was left available for recovery.';}
  record.warning=warning;this.warning=warning;
  try{this.channel?.postMessage({revision:record.revision});}catch{}
  return record;
 }
 async getRecoveries(){
  let rows=[];
  if(this.db)try{rows=await this.transaction('readonly',(store,done)=>{const request=store.getAll();request.onsuccess=()=>{const records=request.result,rows=records.filter(row=>row.key.startsWith('recovery:'));const current=records.find(row=>row.key==='current');if(validData(current?.previousData))rows.push({key:'previous-authority',data:current.previousData,reason:'Previous authoritative snapshot'});done(rows);};});}catch{}
  if(this.invalidRecord)rows.push({key:"original-authority",rawRecord:this.invalidRecord,reason:"Original authoritative record retained"});
  try{const legacy=this.legacySnapshot();if(Object.keys(legacy).length&&signature(legacy)!==signature(this.data)&&!rows.some(row=>validData(row.data)&&signature(row.data)===signature(legacy)))rows.push({key:'accessible-legacy',data:legacy,reason:'Accessible legacy copy'});}catch{}
  return rows;
 }
}
root.WorkspaceAuthority=WorkspaceAuthority;
if(typeof module==='object'&&module.exports)module.exports={WorkspaceAuthority,supported,signature};
})(typeof window==='object'?window:globalThis);
