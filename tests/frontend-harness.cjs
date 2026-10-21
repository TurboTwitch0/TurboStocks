const vm=require('node:vm');
const fs=require('node:fs');
const {webcrypto}=require('node:crypto');
const PaperEngine=require('../public/paper-engine');
function harness(store=new Map(),{blocked=false,boot=false}={}) {
    const html=fs.readFileSync('public/index.html','utf8');
    const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]));
    const nodes=new Map(),events=new Map(),windowEvents=new Map(),timers=new Map();let document,timer=0;
    function node(id='') {
        const classes=new Set();
        const el={id,value:'',checked:false,hidden:false,disabled:false,textContent:'',style:{},dataset:{},children:[],parentNode:null,
            classList:{add:name=>classes.add(name),remove:name=>classes.delete(name),contains:name=>classes.has(name),toggle(name,force){if(force??!classes.has(name))classes.add(name);else classes.delete(name);return classes.has(name);}},
            setAttribute(){},getClientRects(){return [1];},addEventListener(){},focus(){document.activeElement=el;},select(){},click(){},reset(){},
            appendChild(child){el.children.push(child);child.parentNode=el;return child;},append(...children){children.forEach(child=>el.appendChild(child));},replaceChildren(...children){el.children=[];children.forEach(child=>el.appendChild(child));},remove(){if(el.parentNode)el.parentNode.children=el.parentNode.children.filter(child=>child!==el);},
            querySelector(){return node();},querySelectorAll(){return [];},closest(){return null;}};
        let inner='';
        Object.defineProperty(el,'innerHTML',{get:()=>inner,set(value){inner=value;for(const match of String(value).matchAll(/\bid=["']([^"']+)["']/g)){ids.add(match[1]);if(!nodes.has(match[1]))nodes.set(match[1],node(match[1]));}}});
        return el;
    }
    for(const id of ids)nodes.set(id,node(id));
    const element=id=>nodes.get(id)||null;
    document={body:node('body'),activeElement:null,visibilityState:'visible',getElementById:element,createElement:()=>node(),addEventListener(name,fn){if(!events.has(name))events.set(name,[]);events.get(name).push(fn);},querySelector(selector){const match=selector.match(/^#([\w-]+)\.active$/);return match&&element(match[1])?.classList.contains('active')?element(match[1]):null;},querySelectorAll(selector){if(selector==='.page')return [...nodes.values()].filter(el=>el.id.endsWith('-page'));if(selector==='.modal')return ['authModal','lessonModal'].map(element);if(selector==='.modal.open')return ['authModal','lessonModal'].map(element).filter(el=>el.classList.contains('open'));return [];}};
    const storage={getItem:key=>{if(blocked)throw new Error('Blocked');return store.get(key)??null;},setItem:(key,value)=>{if(blocked)throw new Error('Blocked');store.set(key,String(value));},removeItem:key=>{if(blocked)throw new Error('Blocked');store.delete(key);},key:i=>[...store.keys()][i],get length(){return store.size;}};
    const context=vm.createContext({console,TextEncoder,crypto:webcrypto,URL,Blob,Date,AbortSignal,Response,PaperEngine,document,localStorage:storage,location:{hash:'',origin:'http://localhost:3000',hostname:'localhost'},navigator:{onLine:true},MutationObserver:class{constructor(){}observe(){}},requestAnimationFrame:fn=>fn(),setTimeout:(fn,ms)=>{const id=++timer;if(ms<100)fn();else timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id),setInterval:()=>++timer,clearInterval(){},scrollTo(){},confirm:()=>true,fetch:async()=>new Response('',{status:503}),addEventListener(name,fn){if(!windowEvents.has(name))windowEvents.set(name,[]);windowEvents.get(name).push(fn);}});
    context.window=context;context.isSecureContext=true;context.history={replaceState:(a,b,hash)=>context.location.hash=hash};
    vm.runInContext(fs.readFileSync('public/app.js','utf8'),context);vm.runInContext(fs.readFileSync('public/ui.js','utf8'),context);
    const run=code=>vm.runInContext(code,context);
    if(boot)for(const fn of events.get('DOMContentLoaded')||[])fn();
    return {context,element,store,run,events,windowEvents,timers,storage};
}
module.exports={harness};
