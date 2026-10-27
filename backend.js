"use strict";
const path = require('node:path');
const express = require('express');
const Parser = require('rss-parser');
const SYMBOLS = [['AAPL','Apple'],['MSFT','Microsoft'],['NVDA','NVIDIA'],['AMD','AMD'],['TSLA','Tesla'],['AMZN','Amazon'],['GOOGL','Alphabet'],['META','Meta Platforms'],['NFLX','Netflix'],['AVGO','Broadcom'],['PLTR','Palantir'],['JPM','JPMorgan']];
function safeHttpUrl(value) {
    try {const url = new URL(String(value || '')); return ['https:','http:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';} catch {return '';}
}
function estimateNext30Minutes(closes, timestamps, currentPrice) {
    if (!Array.isArray(closes) || !Array.isArray(timestamps) || closes.length !== timestamps.length) return null;
    const points = closes.map((close, index) => ({close:Number(close),time:Number(timestamps[index])}))
        .filter(point => Number.isFinite(point.close) && point.close > 0 && Number.isFinite(point.time))
        .slice(-40);
    if (points.length < 15) return null;
    const lastTime = points[points.length - 1].time;
    const recent = points.filter(point => lastTime - point.time <= 30 * 60 && lastTime >= point.time);
    if (recent.length < 15 || lastTime - recent[0].time < 14 * 60) return null;
    const latest = recent[recent.length - 1];
    const windowRates = [5, 15, 30].map(windowMinutes => {
        const cutoff = latest.time - windowMinutes * 60;
        let start = null;
        for (const point of recent) {
            if (point.time <= cutoff) start = point;
            else break;
        }
        if (!start) return null;
        const elapsedMinutes = (latest.time - start.time) / 60;
        if (elapsedMinutes < windowMinutes * 0.75 || elapsedMinutes > windowMinutes * 1.25) return null;
        return Math.log(latest.close / start.close) / elapsedMinutes;
    });
    if (windowRates.some(rate => !Number.isFinite(rate))) return null;
    // Blend short and longer momentum, then shrink it heavily: short-term prices are noisy.
    const trendRate = windowRates[0] * 0.5 + windowRates[1] * 0.3 + windowRates[2] * 0.2;
    const direction = Math.sign(trendRate);
    const directionalAgreement = direction === 0 ? 0 : windowRates.filter(rate => Math.sign(rate) === direction).length;
    const totalMinutes = (latest.time - recent[0].time) / 60;
    const squaredReturns = recent.slice(1).reduce((sum,point,index)=>{
        const previous=recent[index], minutes=(point.time-previous.time)/60;
        const change=Math.log(point.close/previous.close);
        return minutes>0 ? sum+change*change : sum;
    },0);
    // Estimate per-minute variance using elapsed time (rather than bar count), so gaps
    // in provider data do not make volatility look artificially small.
    const realizedVariance = squaredReturns / Math.max(1,totalMinutes);
    const volatilityPerMinute = Math.sqrt(Math.max(0,realizedVariance));
    const horizon=30;
    const rawScenarioReturn=trendRate*horizon;
    const shrink=directionalAgreement===3 ? 0.2 : directionalAgreement===2 ? 0.1 : 0.04;
    const horizonVolatility=volatilityPerMinute*Math.sqrt(horizon);
    const scenarioReturn=Math.max(-horizonVolatility*0.5,Math.min(horizonVolatility*0.5,rawScenarioReturn*shrink));
    const move=Number(currentPrice)*Math.expm1(scenarioReturn);
    const low=Number(currentPrice)*Math.expm1(scenarioReturn-horizonVolatility*1.96);
    const high=Number(currentPrice)*Math.expm1(scenarioReturn+horizonVolatility*1.96);
    if (![move,low,high,totalMinutes,horizonVolatility].every(Number.isFinite)) return null;
    return {horizonMinutes:horizon,move,movePercent:Math.expm1(scenarioReturn)*100,low,lowPercent:(Math.expm1(scenarioReturn-horizonVolatility*1.96))*100,high,highPercent:(Math.expm1(scenarioReturn+horizonVolatility*1.96))*100,directionalAgreement,sampleBars:recent.length,observedMinutes:totalMinutes};
}
async function readLimited(response, limit = 1024 * 1024) {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Provider response has no body.');
    const chunks = []; let size = 0;
    try {
        while (true) {
            const {done,value} = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > limit) {await reader.cancel(); throw new Error('Provider response exceeded the size limit.');}
            chunks.push(Buffer.from(value));
        }
    } finally {reader.releaseLock();}
    return Buffer.concat(chunks).toString('utf8');
}
function createApp({fetchImpl = globalThis.fetch, liveData = process.env.LIVE_DATA !== 'false'} = {}) {
    const app = express();
    const parser = new Parser();
    const newsCache = new Map(), pendingNews = new Map(), rates = new Map();
    let quoteCache = null, pendingQuotes = null;
    app.disable('x-powered-by'); app.set('query parser','simple');
    app.use((req,res,next) => {
        res.set({'X-Content-Type-Options':'nosniff','X-Frame-Options':'SAMEORIGIN','Referrer-Policy':'strict-origin-when-cross-origin','Permissions-Policy':'camera=(), microphone=(), geolocation=()', 'Content-Security-Policy':"frame-ancestors 'self'; object-src 'none'; base-uri 'self'"});
        if (req.path.startsWith('/api/')) res.set('Cache-Control','no-store');
        next();
    });
    app.use('/api',(req,res,next) => {
        const now = Date.now(), key = req.ip;
        for (const [ip,bucket] of rates) if (now - bucket.start >= 60000) rates.delete(ip);
        const bucket = rates.get(key);
        if (!bucket) {
            if (rates.size >= 10000) return res.status(429).set('Retry-After','60').json({error:'Server is busy. Retry later.'});
            rates.set(key,{start:now,count:1});
        } else if (++bucket.count > 40) return res.status(429).set('Retry-After','60').json({error:'Too many requests. Wait a minute.'});
        next();
    });
    app.get('/health',(req,res)=>res.json({status:'online',service:'Turbo Stocks',tutor:'Built-in study guide and optional on-device model',accounts:'Browser-local demo profiles'}));
    async function requestText(url) {
        const response = await fetchImpl(url,{signal:AbortSignal.timeout(8000),headers:{'User-Agent':'TurboStocks/1.2'}});
        if (!response.ok) throw new Error(`Provider HTTP ${response.status}`);
        return readLimited(response);
    }
    app.get('/api/search',async (req,res) => {
        const query = typeof req.query.q === 'string' ? req.query.q.trim().replace(/\s+/g,' ').slice(0,180) : '';
        if (!query) return res.status(400).json({error:'A search query is required.'});
        if (!liveData) return res.status(503).json({error:'External data is disabled on this server.'});
        const key = query.toLowerCase(), cached = newsCache.get(key);
        if (cached && Date.now() - cached.at < 60000) return res.json({...cached.data,query,cached:true});
        try {
            if (!pendingNews.has(key)) {
                if (pendingNews.size >= 100) return res.status(503).json({error:'News search is busy. Retry later.'});
                const promise = (async () => {
                    const url = new URL('https://news.google.com/rss/search');
                    for (const [name,value] of Object.entries({q:query,hl:'en-US',gl:'US',ceid:'US:en'})) url.searchParams.set(name,value);
                    const feed = await parser.parseString(await requestText(url));
                    const articles = (feed.items || []).slice(0,5).map(item=>({title:String(item.title || 'Untitled article').slice(0,240),link:safeHttpUrl(item.link),publishedAt:item.isoDate || item.pubDate || '',summary:String(item.contentSnippet || '').slice(0,300)}));
                    const data = {query,fetchedAt:new Date().toISOString(),source:'Google News RSS',articles};
                    if (newsCache.size >= 100) newsCache.delete(newsCache.keys().next().value);
                    newsCache.set(key,{at:Date.now(),data}); return data;
                })().finally(()=>pendingNews.delete(key));
                pendingNews.set(key,promise);
            }
            res.json({...await pendingNews.get(key),query});
        } catch (error) {
            console.warn('News provider failed:', error.name); res.status(502).json({error:'Could not retrieve news. Try again later.'});
        }
    });
    async function loadQuotes() {
        const results = await Promise.all(SYMBOLS.map(async ([symbol,name])=>{
            try {
                const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`);url.searchParams.set('range','1d');url.searchParams.set('interval','1m');
                const payload = JSON.parse(await requestText(url));
                const meta = payload.chart?.result?.[0]?.meta;
                const price = Number(meta?.regularMarketPrice), previous = Number(meta?.chartPreviousClose ?? meta?.previousClose);
                if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(previous) || previous <= 0) return null;
                const change=((price-previous)/previous)*100;
                if(!Number.isFinite(change))return null;
                const timestamp = Number(meta?.regularMarketTime);
                const date = new Date(timestamp * 1000);
                const series=payload.chart?.result?.[0], closes=series?.indicators?.quote?.[0]?.close;
                const quoteIsFresh=Number.isFinite(timestamp) && Math.abs(Date.now()/1000-timestamp)<=300;
                const estimate=quoteIsFresh ? estimateNext30Minutes(closes,series?.timestamp,price) : null;
                return {symbol,name,price,previousPrice:previous,priceChange:price-previous,change,estimate30m:estimate,marketTime:Number.isFinite(timestamp) && !Number.isNaN(date.getTime()) ? date.toISOString() : '',currency:String(meta?.currency || 'Unknown')};
            } catch {return null;}
        }));
        const quotes = results.filter(Boolean);
        if (!quotes.length) throw new Error('Quotes unavailable');
        const data = {source:'Yahoo Finance · experimental unofficial integration',fetchedAt:new Date().toISOString(),expectedSymbols:SYMBOLS.length,quotes};
        quoteCache = {at:Date.now(),data};return data;
    }
    app.get('/api/trending-stocks',async (req,res)=>{
        if (!liveData) return res.status(503).json({error:'External data is disabled on this server.'});
        if (quoteCache && Date.now() - quoteCache.at < 45000) return res.json({...quoteCache.data,cached:true});
        try {
            if (!pendingQuotes) pendingQuotes = loadQuotes().finally(()=>pendingQuotes=null);
            res.json(await pendingQuotes);
        } catch (error) {res.status(502).json({error:'Could not retrieve provider quotes. Sample trading is separate.'});}
    });
    app.get(['/css','/style.css'],(req,res)=>res.redirect(308,'/styles.css'));
    app.get('/java',(req,res)=>res.redirect(308,'/app.js'));
    app.use(express.static(path.join(__dirname,'public'),{index:'index.html',maxAge:0}));
    app.use('/api',(req,res)=>res.status(404).json({error:'Unknown API endpoint.'}));
    app.use((req,res)=>res.status(404).type('text').send('Page not found.'));
    app.use((error,req,res,next)=>{console.error('Request failed:', error.name);res.status(500).json({error:'Request could not be completed.'});});
    return app;
}
const app = createApp();
if (require.main === module) {
    const port = Number(process.env.PORT || 3000);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer between 1 and 65535.');
    app.listen(port,()=>console.log(`Turbo Stocks running on http://localhost:${port}`));
}
module.exports = app;
module.exports.createApp = createApp;

