const {test}=require('node:test');const assert=require('node:assert/strict');const {createApp}=require('../backend');
async function serve(t,options={}) {
    const app=createApp(options);const server=app.listen(0);await new Promise(resolve=>server.once('listening',resolve));
    t.after(()=>new Promise(resolve=>server.close(resolve)));
    return `http://127.0.0.1:${server.address().port}`;
}
const rss='<rss version="2.0"><channel><title>Study news</title><link>https://publisher.test</link><description>Feed</description><item><title>Source headline</title><link>https://publisher.test/story</link><pubDate>Mon, 12 Oct 2026 12:00:00 GMT</pubDate><description>Educational summary</description></item></channel></rss>';
test('serve all assets, redirects and headers without exposing project internals',async t=>{
    const base=await serve(t,{liveData:false});
    for(const path of ['/','/styles.css','/app.js','/paper-engine.js','/ui.js','/sw.js','/manifest.webmanifest','/icons/icon-192.png','/icons/icon-512.png']){
        const response=await fetch(base+path);assert.equal(response.status,200,path);assert.equal(response.headers.get('x-content-type-options'),'nosniff');assert.equal(response.headers.get('x-frame-options'),'SAMEORIGIN');
    }
    for(const path of ['/css','/style.css','/java'])assert.equal((await fetch(base+path,{redirect:'manual'})).status,308);
    for(const path of ['/backend.js','/package.json','/node_modules/express/index.js','/tests/frontend.test.js'])assert.equal((await fetch(base+path)).status,404,path);
});
test('missing and repeated query values, unknown endpoints and disabled feeds',async t=>{
    const base=await serve(t,{liveData:false});
    for(const path of ['/api/search','/api/search?q=','/api/search?q=a&q=b'])assert.equal((await fetch(base+path)).status,400);
    assert.equal((await fetch(base+'/api/search?q=test')).status,503);assert.equal((await fetch(base+'/api/trending-stocks')).status,503);
    assert.equal((await fetch(base+'/api/movers/kalshi')).status,404);assert.equal((await fetch(base+'/api/missing')).status,404);
});
test('news cache and concurrent searches coalesce upstream requests',async t=>{
    let calls=0;const base=await serve(t,{fetchImpl:async()=>{calls++;await new Promise(resolve=>setTimeout(resolve,10));return new Response(rss);}});
    const results=await Promise.all(Array.from({length:4},()=>fetch(base+'/api/search?q=education').then(r=>r.json())));
    assert.equal(calls,1);assert.equal(results[0].articles[0].title,'Source headline');assert.ok(results[0].articles[0].publishedAt);
    const response=await fetch(base+'/api/search?q=EDUCATION');assert.equal(response.headers.get('cache-control'),'no-store');assert.equal((await response.json()).cached,true);assert.equal(calls,1);
});
test('news provider HTTP errors, timeouts, malformed XML and oversized bodies return 502',async t=>{
    const variants=[async()=>new Response('',{status:503}),async()=>{throw new Error('Timeout');},async()=>new Response('not XML'),async()=>new Response('x'.repeat(1024*1024+1))];
    for(const fetchImpl of variants){const base=await serve(t,{fetchImpl});const response=await fetch(base+'/api/search?q=provider-failure');assert.equal(response.status,502);assert.equal((await response.json()).error,'Could not retrieve news. Try again later.');}
});
test('unsafe article links are removed',async t=>{
    const base=await serve(t,{fetchImpl:async()=>new Response(rss.replace('https://publisher.test/story','javascript:alert(1)'))});
    const data=await (await fetch(base+'/api/search?q=links')).json();assert.equal(data.articles[0].link,'');
});
test('quotes coalesce concurrent loads and preserve provider time/source',async t=>{
    let calls=0;const base=await serve(t,{fetchImpl:async()=>{calls++;await new Promise(resolve=>setTimeout(resolve,10));return Response.json({chart:{result:[{meta:{regularMarketPrice:120,chartPreviousClose:100,regularMarketTime:1791806400,currency:'USD'}}]}});}});
    const data=await Promise.all(Array.from({length:4},()=>fetch(base+'/api/trending-stocks').then(r=>r.json())));
    assert.equal(calls,12);assert.equal(data[0].quotes.length,12);assert.equal(data[0].quotes[0].change,20);assert.equal(data[0].quotes[0].previousPrice,100);assert.equal(data[0].quotes[0].priceChange,20);assert.ok(data[0].quotes[0].marketTime);assert.match(data[0].source,/unofficial/);
    const cached=await(await fetch(base+'/api/trending-stocks')).json();assert.equal(cached.cached,true);assert.equal(calls,12);
});
test('quotes reject zero/negative/malformed prices and unavailable providers',async t=>{
    for(const price of [0,-1,null]){
        const base=await serve(t,{fetchImpl:async()=>Response.json({chart:{result:[{meta:{regularMarketPrice:price,chartPreviousClose:100}}]}})});
        assert.equal((await fetch(base+'/api/trending-stocks')).status,502);
    }
    const base=await serve(t,{fetchImpl:async()=>{throw new Error('Timeout');}});assert.equal((await fetch(base+'/api/trending-stocks')).status,502);
});
test('API rate limit supplies Retry-After while health stays available',async t=>{
    const base=await serve(t,{liveData:false});for(let i=0;i<40;i++)assert.equal((await fetch(base+'/api/missing')).status,404);
    const response=await fetch(base+'/api/missing');assert.equal(response.status,429);assert.equal(response.headers.get('retry-after'),'60');assert.equal((await fetch(base+'/health')).status,200);
});
