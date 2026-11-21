(async function(){
'use strict';
window.workspaceAuthority=new WorkspaceAuthority();
await window.workspaceAuthority.initialize();
const load=src=>new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>reject(new Error('Could not load '+src));document.body.appendChild(script);});
try{for(const src of ['/paper-engine.js','/app.js','/ui.js'])await load(src);}
catch(error){const status=document.getElementById('storageStatus');if(status){status.hidden=false;status.textContent=error.message+'. Reload to retry; saved data was not changed.';}}
finally{document.body.inert=false;}
})();
