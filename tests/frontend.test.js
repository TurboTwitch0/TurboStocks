const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const {harness}=require('./frontend-harness.cjs');
test('homepage showcase is illustrative, responsive, and keeps real learning actions',()=>{
    const html=fs.readFileSync('public/index.html','utf8'),css=fs.readFileSync('public/styles.css','utf8');
    assert.match(html,/Illustrative chart · not market data/);assert.match(html,/aria-label="Illustration of the Turbo Stocks learning dashboard/);
    for(const page of ['learn','markets','portfolio'])assert.match(html,new RegExp(`showPage\\('${page}'\\)`));
    assert.match(css,/\.showcase-window[^}]*perspective|\.showcase-stage[^}]*perspective/);assert.match(css,/@media \(max-width:760px\)[\s\S]*?\.showcase-stage/);assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
    assert.doesNotMatch(css,/showcase-[^}]*animation:\s*[^;]+infinite/);
});
test('home daily briefing is on demand, labels its source and separates live data from sample trading',()=>{
    const html=fs.readFileSync('public/index.html','utf8'),app=fs.readFileSync('public/app.js','utf8'),css=fs.readFileSync('public/styles.css','utf8');
    assert.match(html,/onclick="openDailyBriefing\(\)"/);assert.match(html,/id="dailyBriefModal" class="modal" role="dialog" aria-modal="true"/);assert.match(html,/cautious 30-minute scenario from recent 5-, 15-, and 30-minute trends/);
    assert.match(html,/src="\/icons\/turbo-mark\.svg"/);assert.match(html,/id="workflowPreviewTitle"/);assert.match(html,/Explore learning paths/);
    assert.match(app,/fetch\("\/api\/trending-stocks"/);assert.match(app,/fetch\("\/api\/search\?q=stock%20market"/);
    assert.match(app,/createTextNode|textContent = article\.title/);assert.match(app,/quote\.priceChange/);assert.match(app,/quote\.previousPrice/);assert.match(app,/estimate30m/);assert.match(app,/movePercent/);assert.match(app,/directionalAgreement/);assert.match(app,/recent-volatility range/);assert.match(app,/formatQuoteMoney/);assert.match(app,/quotes may be delayed/i);assert.match(app,/fixed sample prices/i);
    assert.match(app,/function closeDailyBriefing\(\)/);assert.match(css,/\.daily-brief-modal/);
});
test('daily briefing reports quote and headline availability independently',async()=>{
    const quote={symbol:'AAPL',name:'Apple',price:101,previousPrice:100,priceChange:1,change:1,marketTime:new Date().toISOString(),currency:'USD',estimate30m:null};
    const withQuotes=harness(new Map(),{boot:true});withQuotes.context.fetch=async url=>url.includes('/api/trending-stocks')
        ?Response.json({quotes:[quote],fetchedAt:new Date().toISOString(),source:'Test quote provider',expectedSymbols:1})
        :new Response('',{status:503});
    await withQuotes.run('openDailyBriefing()');
    assert.match(withQuotes.element('dailyBriefStatus').textContent,/Quotes: 1 tracked symbols returned/);assert.match(withQuotes.element('dailyBriefStatus').textContent,/Headlines: unavailable/);
    const withNews=harness(new Map(),{boot:true});withNews.context.fetch=async url=>url.includes('/api/trending-stocks')
        ?new Response('',{status:503})
        :Response.json({articles:[{title:'Test headline',link:'https://news.example/story',publishedAt:'',summary:''}],source:'Test News'});
    await withNews.run('openDailyBriefing()');
    assert.match(withNews.element('dailyBriefStatus').textContent,/Quotes: unavailable/);assert.match(withNews.element('dailyBriefStatus').textContent,/Headlines: 1 returned/);
});
async function signup(h,email='student@example.com') {
    h.element('profileName').value='Student';h.element('profileEmail').value=email;h.element('profilePassword').value='unique-demo-pass';h.element('profilePassword2').value='unique-demo-pass';h.run('authMode="signup"');await h.run('submitAuth()');
    assert.equal(h.store.get('novaSession'),email,h.element('authError').textContent);
}
test('full DOMContentLoaded initialization finishes with all expected assets and controls',()=>{
    const h=harness(new Map(),{boot:true});assert.equal(h.context.location.hash,'#home');assert.equal(h.element('orderSymbol').children.length,h.run('Object.keys(stocks).length'));assert.match(h.element('portfolioValue').textContent,/100,000/);
});
test('signup, wrong password, signin, signout and restored session',async()=>{
    const h=harness(new Map(),{boot:true});await signup(h);
    assert.match(JSON.parse(h.store.get('novaUsers'))['student@example.com'].passwordHash,/^pbkdf2\$/);
    h.run('signOut()');assert.equal(h.store.has('novaSession'),false);
    h.run('authMode="signin"');h.element('profilePassword').value='wrong-password';await h.run('submitAuth()');assert.equal(h.element('authError').textContent,'Incorrect password.');
    h.element('profilePassword').value='unique-demo-pass';await h.run('submitAuth()');assert.equal(h.store.get('novaSession'),'student@example.com');assert.equal(harness(h.store).run('profile.email'),'student@example.com');
});
test('sign-in uses a native form and local sign-out never claims success after storage failure',async()=>{
    const h=harness(new Map(),{boot:true}),html=fs.readFileSync('public/index.html','utf8');
    assert.match(html,/<form id="localAuthForm">[\s\S]*id="profileEmail"[\s\S]*id="profilePassword"[\s\S]*id="authSubmit"[\s\S]*type="submit"/);
    h.run('setAuthMode("signin")');assert.equal(h.element('profileName').required,false);assert.equal(h.element('profilePassword2').required,false);
    await signup(h);h.storage.removeItem=()=>{throw new Error('Blocked')};h.run('signOut()');
    assert.equal(h.store.get('novaSession'),'student@example.com');assert.equal(h.run('profile.email'),'student@example.com');assert.match(h.element('storageStatus').textContent,/still active/);
});
test('password visibility is accessible, reset on mode change and close, and sign-in shows progress',async()=>{
    const h=harness(new Map(),{boot:true});
    h.run('setAuthMode("signin")');h.element('profilePassword').type='password';
    h.run('toggleAuthPasswordVisibility("profilePassword")');assert.equal(h.element('profilePassword').type,'text');assert.equal(h.element('authPasswordToggle').textContent,'Hide');
    h.run('setAuthMode("signup")');assert.equal(h.element('profilePassword').type,'password');assert.equal(h.element('confirmPasswordField').hidden,false);assert.equal(h.element('authPasswordConfirmToggle').hidden,false);
    h.element('profilePassword2').type='password';h.run('toggleAuthPasswordVisibility("profilePassword2")');assert.equal(h.element('profilePassword2').type,'text');
    h.element('profilePassword').value='sensitive-demo-value';h.element('profilePassword2').value='sensitive-demo-value';h.run('closeAuth()');assert.equal(h.element('profilePassword').value,'');assert.equal(h.element('profilePassword2').value,'');assert.equal(h.element('profilePassword2').type,'password');
    await signup(h);h.run('signOut()');h.run('setAuthMode("signin")');h.element('profileEmail').value='student@example.com';h.element('profilePassword').value='unique-demo-pass';
    const pending=h.run('submitAuth()');assert.equal(h.element('authSubmit').disabled,true);assert.equal(h.element('authSubmit').textContent,'Signing in…');await pending;
    assert.equal(h.element('authSubmit').disabled,false);assert.equal(h.element('authSubmit').textContent,'Sign in');assert.equal(h.store.get('novaSession'),'student@example.com');
});
test('blocked storage no longer crashes startup or tutor',async()=>{
    const h=harness(new Map(),{blocked:true,boot:true});assert.equal(h.run('storageUnavailable'),true);assert.equal(h.element('storageStatus').hidden,false);
    h.element('rememberTutorChat').checked=true;await h.run('sendAI("Explain dividends")');assert.equal(h.run('tutorIsGenerating'),false);assert.equal(h.element('aiSend').disabled,false);assert.match(h.run('chatHistory.at(-1).content'),/Dividends/);
});
test('damaged stored account is preserved and ordinary saves blocked until explicit reset',()=>{
    const store=new Map([['novaGuestAccount',JSON.stringify({cash:-100,positions:{},history:[],watchlist:[]})]]);const h=harness(store,{boot:true});assert.equal(h.run('portfolioRecovery'),true);
    assert.throws(()=>h.run('saveEverything()'),/damaged/);assert.equal(JSON.parse(store.get('novaGuestAccount')).cash,-100);
    h.run('resetPaperAccount()');assert.equal(h.run('portfolioRecovery'),false);assert.equal(JSON.parse(store.get('turboGuestStateV2')).account.cash,100000);
});
test('guest order saves atomically and failed write rolls back memory',()=>{
    const h=harness(new Map(),{boot:true});h.element('orderSymbol').value='AAPL';h.element('orderSide').value='BUY';h.element('orderShares').value='1';
    h.run('submitPaperOrder({preventDefault(){}})');assert.equal(JSON.parse(h.store.get('turboGuestStateV2')).account.cash,99745);assert.equal(h.store.has('novaGuestAccount'),false);
    h.storage.setItem=()=>{throw new Error('Quota exceeded');};h.run('submitPaperOrder({preventDefault(){}})');assert.equal(h.run('account.cash'),99745);assert.match(h.element('orderStatus').textContent,/not placed/);
});
test('stale tab cannot overwrite portfolio changes or switch the active profile',async()=>{
    const store=new Map();const first=harness(store);const second=harness(store);
    first.run('account=PaperEngine.execute(account,"AAPL","BUY",1,255);saveEverything()');
    assert.throws(()=>second.run('saveEverything()'),/another tab/);
    await signup(first);assert.throws(()=>second.run('saveEverything()'),/another tab/);
    const saved=store.get('novaUsers');second.run('saveBeforeTabCloses()');assert.equal(store.get('novaUsers'),saved);
});
test('switching profiles clears old chat and uses separate tutor/note keys',async()=>{
    const h=harness(new Map(),{boot:true});await signup(h,'first@example.com');h.element('rememberTutorChat').checked=true;h.run('setTutorHistoryPreference()');await h.run('sendAI("Explain dividends")');
    h.run('communityNotes=[{id:"note-1",symbol:"AAPL",source:"Other",tone:"unverified",claim:"first profile",createdAt:new Date().toISOString()}];setLocal(workspaceKey("turboCommunityNotes"),JSON.stringify(communityNotes))');
    await signup(h,'second@example.com');assert.equal(h.run('chatHistory.length'),0);assert.equal(h.run('communityNotes.length'),0);assert.equal(h.run('account.history.length'),0);
    assert.ok(h.store.has('turboTutorHistory:first%40example.com'));assert.equal(h.store.has('turboTutorHistory:second%40example.com'),false);
});
test('corrupt chat/note shapes are ignored without startup crash',()=>{
    const store=new Map([['turboRememberTutor','true'],['turboTutorHistory','{}'],['turboCommunityNotes','{}']]);const h=harness(store,{boot:true});assert.equal(h.run('chatHistory.length'),0);assert.equal(h.run('communityNotes.length'),0);
});
test('auth validation and unavailable crypto errors remain actionable',async()=>{
    const h=harness();h.element('profileEmail').value='invalid';await h.run('submitAuth()');assert.match(h.element('authError').textContent,/valid email/);
    h.element('profileEmail').value='student@example.com';h.element('profilePassword').value='unique-demo-pass';h.context.crypto={};await h.run('submitAuth()');assert.match(h.element('authError').textContent,/HTTPS/);assert.equal(h.element('authSubmit').disabled,false);
});
test('quiz scoring persists and failed save rolls back completion',()=>{
    const h=harness();h.run('openLesson(lessons[0].id)');h.context.document.querySelector=selector=>({value:h.run(`selectedLesson.quiz[${selector.match(/quiz(\d+)/)[1]}].answer`)});
    h.run('submitQuiz()');assert.equal(h.run('lessonProgress[lessons[0].id].percent'),100);assert.ok(JSON.parse(h.store.get('turboGuestStateV2')).lessonProgress);
    h.run('openLesson(lessons[1].id)');h.storage.setItem=()=>{throw new Error('Full');};h.run('submitQuiz()');assert.equal(h.run('lessonProgress[lessons[1].id]'),undefined);assert.match(h.element('quizResult').textContent,/storage/);
});
test('tutor provider failures restore controls and identify absence of current sources',async()=>{
    const h=harness();await h.run('sendAI("What is the stock price today?")');assert.equal(h.element('aiSend').disabled,false);assert.match(h.run('chatHistory.at(-1).content'),/No current news sources/);
    h.run('addChatMessage=()=>{throw new Error("UI failed")};');await h.run('sendAI("Explain dividends")');assert.equal(h.run('tutorIsGenerating'),false);assert.match(h.element('tutorStatus').textContent,/try again/);
});
test('unsupported GPU visibly preserves built-in tutoring',async()=>{
    const h=harness();await h.run('enableLocalAI()');assert.match(h.element('tutorStatus').textContent,/built-in tutor still works/);
});
test('page navigation and all inline handlers refer to defined functions',()=>{
    const h=harness(),html=fs.readFileSync('public/index.html','utf8');const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
    for(const match of html.matchAll(/(?:onclick|oninput|onchange|onkeydown|onsubmit)="([\s\S]*?)"/g))for(const f of match[1].matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g))if(!['if'].includes(f[1]))assert.equal(h.run(`typeof ${f[1]}`),'function',f[1]);
    for(const page of ['home','markets','trending','portfolio','learn','news','other','community','copyright','ai']){h.run(`showPage("${page}")`);assert.equal(h.context.location.hash,`#${page}`);assert.equal(h.element(`${page}-page`).classList.contains('active'),true);}
    h.run('showPage("unknown")');assert.equal(h.context.location.hash,'#home');
});
test('signup preserves unrelated profiles created while hashing and locks auth mode',async()=>{
    const h=harness();h.element('profileName').value='Student';h.element('profileEmail').value='student@example.com';h.element('profilePassword').value='unique-demo-pass';h.element('profilePassword2').value='unique-demo-pass';
    h.run('authMode="signup";hashPassword=()=>new Promise(resolve=>{authRelease=resolve});');const pending=h.run('submitAuth()');
    h.run('setAuthMode("signin")');assert.equal(h.run('authMode'),'signup');
    const other={name:'Other',email:'other@example.com',passwordHash:'demo-other-hash',account:{cash:100000,positions:{},history:[],watchlist:[]},lessonProgress:{}};
    h.store.set('novaUsers',JSON.stringify({'other@example.com':other}));h.run('authRelease("demo-test-hash")');await pending;
    const users=JSON.parse(h.store.get('novaUsers'));assert.ok(users['other@example.com']);assert.ok(users['student@example.com']);
});
test('malformed profile records cannot be silently discarded by subsequent writes',()=>{
    const store=new Map([['novaUsers',JSON.stringify({'damaged@example.com':null})]]);const h=harness(store);
    assert.equal(h.run('usersRecovery'),true);assert.throws(()=>h.run('saveUsers({})'),/damaged/);assert.equal(store.get('novaUsers'),'{"damaged@example.com":null}');
});
test('profile switch discards pending tutor reply instead of saving it to another profile',async()=>{
    const h=harness();h.run('searchTutorWeb=()=>new Promise(resolve=>{finishNews=resolve});');const pending=h.run('sendAI("What happened in markets today?")');
    h.run('generationEpoch++;chatHistory=[];finishNews({articles:[],fetchedAt:""})');await pending;
    assert.equal(h.run('chatHistory.length'),0);assert.equal(h.element('aiSend').disabled,false);assert.equal(h.run('tutorIsGenerating'),false);
});
test('legacy SHA-256 profile upgrades its hash on successful signin',async()=>{
    const h=harness();const hash=await h.run('hashPassword("unique-demo-pass","legacy@example.com","legacy")');
    h.store.set('novaUsers',JSON.stringify({'legacy@example.com':{name:'Legacy',email:'legacy@example.com',passwordHash:hash,account:{cash:100000,positions:{},history:[],watchlist:[]},lessonProgress:{}}}));
    h.element('profileEmail').value='legacy@example.com';h.element('profilePassword').value='unique-demo-pass';await h.run('submitAuth()');assert.match(JSON.parse(h.store.get('novaUsers'))['legacy@example.com'].passwordHash,/^pbkdf2\$/);
});
test('passed lesson stays completed after a later failed practice attempt',()=>{
    const h=harness();h.run('openLesson(lessons[0].id)');h.context.document.querySelector=selector=>({value:h.run(`selectedLesson.quiz[${selector.match(/quiz(\d+)/)[1]}].answer`)});h.run('submitQuiz()');
    h.context.document.querySelector=()=>null;h.run('submitQuiz()');assert.equal(h.run('lessonProgress[lessons[0].id].completed'),true);assert.equal(h.run('lessonProgress[lessons[0].id].percent'),0);
});

test('backup import validates, previews, replaces only app keys and preserves unrelated storage',async()=>{
    const store=new Map([['novaTheme','dark'],['otherAppKey','keep']]);const h=harness(store,{boot:true});
    const state={account:{cash:81234,positions:{},history:[],watchlist:[]},lessonProgress:{}};
    const payload={product:'Turbo Stocks',formatVersion:1,data:{turboGuestStateV2:JSON.stringify(state)}};
    h.element('backupImportFile').files=[{size:100,text:async()=>JSON.stringify(payload)}];
    await h.run('importLocalBackup(document.getElementById("backupImportFile"))');
    assert.equal(store.has('novaTheme'),false);assert.equal(store.get('otherAppKey'),'keep');assert.equal(h.run('account.cash'),81234);
    assert.match(h.element('backupStatus').textContent,/Backup imported/);
});

test('invalid backup does not change saved browser data',async()=>{
    const store=new Map([['novaSession','keep@example.com'],['turboGuestStateV2','unchanged']]);const h=harness(store);
    h.element('backupImportFile').files=[{size:30,text:async()=>JSON.stringify({product:'Wrong',formatVersion:1,data:{novaSession:'x'}})}];
    await h.run('importLocalBackup(document.getElementById("backupImportFile"))');
    assert.equal(store.get('novaSession'),'keep@example.com');assert.equal(store.get('turboGuestStateV2'),'unchanged');assert.match(h.element('backupStatus').textContent,/Import failed/);
});

test('backup import reports failed writes and verifies restoration of the previous data',async()=>{
    const store=new Map([['novaTheme','dark']]);const h=harness(store);
    const payload={product:'Turbo Stocks',formatVersion:1,data:{novaTheme:'light'}};
    h.element('backupImportFile').files=[{size:50,text:async()=>JSON.stringify(payload)}];
    const originalSet=h.storage.setItem;let failed=false;h.storage.setItem=(key,value)=>{if(key==='novaTheme'&&!failed){failed=true;throw new Error('Quota exceeded');}return originalSet(key,value);};
    await h.run('importLocalBackup(document.getElementById("backupImportFile"))');
    assert.equal(store.get('novaTheme'),'dark');assert.match(h.element('backupStatus').textContent,/restored and verified/);
});

test('backup import rejects unknown prefixed keys, unsafe properties and bad cross references',()=>{
    const h=harness();
    for(const data of [
        {turboMalicious:'{}'},
        {novaUsers:'{"__proto__":{"email":"attacker@example.com"}}'},
        {novaSession:'missing@example.com'}
    ]) assert.throws(()=>h.run(`validateBackup(JSON.parse(${JSON.stringify(JSON.stringify({product:'Turbo Stocks',formatVersion:1,data}))}))`));
});

test('backup import rejects unsupported portfolio symbols and malformed profile hashes',()=>{
    const h=harness();
    const unknownSymbol={product:'Turbo Stocks',formatVersion:1,data:{turboGuestStateV2:JSON.stringify({account:{cash:1,positions:{FAKE:{shares:1,averagePrice:1}},history:[],watchlist:[]},lessonProgress:{}})}};
    assert.throws(()=>h.run(`validateBackup(JSON.parse(${JSON.stringify(JSON.stringify(unknownSymbol))}))`),/unsupported sample symbol/);
    const user={name:'Student',email:'student@example.com',passwordHash:'not-a-hash',account:{cash:100000,positions:{},history:[],watchlist:[]},lessonProgress:{}};
    const badHash={product:'Turbo Stocks',formatVersion:1,data:{novaUsers:JSON.stringify({'student@example.com':user})}};
    assert.throws(()=>h.run(`validateBackup(JSON.parse(${JSON.stringify(JSON.stringify(badHash))}))`),/password data/);
});

test('other tabs cannot save while an import lock is active',()=>{
    const h=harness(new Map(),{boot:true});
    h.store.set('__turboStocksBackupImport',JSON.stringify({token:'importing',expiresAt:Date.now()+60000}));
    assert.throws(()=>h.run('saveEverything()'),/backup import is running/);
});

test('watchlist detail and full-position close update saved simulated records',()=>{
    const h=harness(new Map(),{boot:true});h.run('account.watchlist=[];saveEverything();toggleWatchlist("AAPL")');assert.ok(JSON.parse(h.store.get('turboGuestStateV2')).account.watchlist.includes('AAPL'));
    h.run('openStock("AAPL")');assert.match(h.element('stockDetail').innerHTML,/Apple/);
    h.run('account=PaperEngine.execute(account,"AAPL","BUY",2,stocks.AAPL.price);saveEverything();renderPortfolio();closePosition("AAPL")');
    const saved=JSON.parse(h.store.get('turboGuestStateV2')).account;assert.equal(saved.positions.AAPL,undefined);assert.equal(saved.history[0].side,'SELL');assert.equal(saved.history[0].shares,2);
});

test('portfolio presents sample-price cost basis, P/L and textual cash-inclusive allocation',()=>{
    const h=harness(new Map(),{boot:true});
    h.run('account=PaperEngine.execute(account,"AAPL","BUY",2,250);renderPortfolio()');
    assert.equal(h.element('portfolioValue').textContent,'$100,010.00');
    assert.equal(h.element('holdingsCostBasis').textContent,'$500.00');
    assert.equal(h.element('unrealizedPnl').textContent,'+$10.00');
    assert.equal(h.element('allocationLegend').children.length,2);
    assert.match(h.element('positions').innerHTML,/Fixed sample/);
    assert.match(h.element('portfolioPerformance').textContent,/fixed educational sample prices/);
});

test('learning paths preserve existing ids and every lesson has an objective and explanation',()=>{
    const h=harness(new Map(),{boot:true});
    assert.equal(h.run('["stocks101","marketcap","pe","candlesticks","rsi","orders","risk"].every(id=>lessons.some(lesson=>lesson.id===id))'),true);
    assert.equal(h.run('lessons.every(lesson=>lessonDetails[lesson.id]?.objective && lessonDetails[lesson.id]?.explanation)'),true);
    assert.equal(h.run('learningPaths.length'),4);
    h.run('startLearningPath("charts")');
    assert.equal(h.run('selectedLesson.id'),'candlesticks');
    assert.match(h.element('lessonObjective').textContent,/open, high, low, and close/i);
});

test('new tutor topics use verified guide handling and assistant mode labels are exposed',()=>{
    const h=harness();
    assert.equal(h.run('shouldUseVerifiedGuide("Quiz me about moving averages")'),true);
    assert.equal(h.run('shouldUseVerifiedGuide("Explain slippage and fees")'),true);
    assert.equal(h.run('shouldUseVerifiedGuide("How should I use AI safely?")'),true);
    const bubble=h.run('addChatMessage("assistant","Example answer",[],"Built-in study guide")');
    assert.equal(bubble.children.at(-1).textContent,'Built-in study guide');
});

test('device preview controls are only placed in the Other page',()=>{
    const html=fs.readFileSync('public/index.html','utf8');
    const toolbar=html.match(/<div class="device-toolbar"[\s\S]*?<\/div>\s*<\/section>/);
    assert.ok(toolbar);
    const other=html.indexOf('<section id="other-page"');
    const community=html.indexOf('<section id="community-page"');
    assert.ok(toolbar.index>other && toolbar.index<community);
    assert.equal((html.match(/class="device-toolbar"/g)||[]).length,1);
    const h=harness(new Map(),{boot:true});
    h.run('setDevicePreview("phone",document.querySelector(".device-options button[data-device=phone]"))');
    assert.equal(h.run('document.body.classList.contains("preview-phone")'),true);
});

test('watchlist can sort without changing its saved symbol order',()=>{
    const h=harness(new Map(),{boot:true});
    h.run('account.watchlist=["TSLA","AAPL","NVDA"];saveEverything()');
    h.element('watchlistSort').value='symbol';h.run('renderWatchlist()');
    const markup=h.element('homeWatchlist').innerHTML;
    assert.ok(markup.indexOf('AAPL')<markup.indexOf('NVDA')&&markup.indexOf('NVDA')<markup.indexOf('TSLA'));
    assert.deepEqual(Array.from(h.run('account.watchlist')),['TSLA','AAPL','NVDA']);
    h.element('watchlistSort').value='change-desc';h.run('renderWatchlist()');
    assert.ok(h.element('homeWatchlist').innerHTML.indexOf('TSLA')<h.element('homeWatchlist').innerHTML.indexOf('NVDA'));
});

test('trade history filters by symbol, side and inclusive date range, and clears',()=>{
    const h=harness(new Map(),{boot:true});
    h.run('account.history=[{symbol:"AAPL",side:"BUY",shares:1,price:250,total:250,timestamp:"2026-04-03T18:00:00.000Z"},{symbol:"AAPL",side:"SELL",shares:1,price:255,total:255,timestamp:"2026-04-03T19:00:00.000Z"},{symbol:"NVDA",side:"BUY",shares:1,price:140,total:140,timestamp:"2026-04-02T18:00:00.000Z"}];renderTradeHistory()');
    h.element('historyFilter').value='aapl';h.element('historySideFilter').value='BUY';h.element('historyFromFilter').value='2026-04-03';h.element('historyToFilter').value='2026-04-03';h.run('renderTradeHistory()');
    assert.equal(h.run('getFilteredTradeHistory().length'),1);assert.match(h.element('tradeHistorySummary').textContent,/Showing 1 of 3/);assert.match(h.element('tradeHistory').innerHTML,/AAPL/);assert.doesNotMatch(h.element('tradeHistory').innerHTML,/NVDA|SELL/);
    h.run('clearTradeHistoryFilters()');assert.equal(h.run('getFilteredTradeHistory().length'),3);assert.equal(h.element('historySideFilter').value,'all');
});

test('CSV export contains only filtered trades and neutralizes spreadsheet formulas',()=>{
    const h=harness(new Map(),{boot:true});let csv='';
    h.context.Blob=class {constructor(parts){csv=parts.join('');}};
    h.context.URL={createObjectURL:()=>"blob:test",revokeObjectURL(){}};
    h.element('historyFilter').value='AAPL';h.run('account.history=[{symbol:"AAPL",side:"BUY",shares:1,price:250,total:250,timestamp:"2026-04-03T18:00:00.000Z"},{symbol:"NVDA",side:"SELL",shares:1,price:180,total:180,timestamp:"2026-04-02T18:00:00.000Z"}];renderTradeHistory();exportTradeHistoryCsv()');
    assert.match(csv,/AAPL/);assert.doesNotMatch(csv,/NVDA/);assert.match(h.element('historyExportStatus').textContent,/Exported 1 matching trades/);
    assert.equal(h.run('csvCell("=SUM(A1:A2)")'),"\"'=SUM(A1:A2)\"");
});

test('stock details set up a paper order without placing it',()=>{
    const h=harness(new Map(),{boot:true});h.run('openStock("AAPL");prepareStockOrder("AAPL","BUY")');
    assert.equal(h.element('orderSymbol').value,'AAPL');assert.equal(h.element('orderSide').value,'BUY');assert.equal(h.element('orderShares').value,'1');assert.equal(h.element('portfolio-page').classList.contains('active'),true);assert.match(h.element('orderStatus').textContent,/Review the order/);assert.equal(h.run('account.history.length'),0);
    h.run('account=PaperEngine.execute(account,"AAPL","BUY",0.25,stocks.AAPL.price);renderStockDetail();prepareStockOrder("AAPL","SELL")');
    assert.equal(h.element('orderSide').value,'SELL');assert.equal(h.element('orderShares').value,'0.25');assert.equal(h.run('account.history.length'),1);
});

test('portfolio info popovers open on click, not hover or focus',()=>{
    const h=harness(new Map(),{boot:true});let expanded='false';
    const trigger={getAttribute:()=>expanded,setAttribute:(name,value)=>{if(name==='aria-expanded')expanded=value;}};
    h.context.document.querySelectorAll=selector=>selector===".help-trigger[aria-expanded='true']"&&expanded==='true'?[trigger]:[];
    const click=h.events.get('click').at(-1);click({target:{closest:()=>trigger}});assert.equal(expanded,'true');
    click({target:{closest:()=>null}});assert.equal(expanded,'false');
    const css=fs.readFileSync('public/styles.css','utf8');assert.match(css,/\.help-trigger\[aria-expanded="true"\] \.help-content\s*\{\s*display:block\s*!important;/);assert.doesNotMatch(css,/\.help-trigger:(?:hover|focus-visible) \.help-content/);
    h.context.document.querySelectorAll=selector=>selector==='.help-trigger'?[trigger]:[];expanded='true';h.windowEvents.get('pageshow').at(-1)();assert.equal(expanded,'false');
});

test('mobile navigation and home dashboard expose compact, accessible destinations',()=>{
    const html=fs.readFileSync('public/index.html','utf8');
    const css=fs.readFileSync('public/styles.css','utf8');
    const app=fs.readFileSync('public/app.js','utf8');
    const bar=html.match(/<nav class="bottom-nav"[\s\S]*?<\/nav>/)?.[0]||'';
    assert.equal((bar.match(/<button\b/g)||[]).length,5);
    for(const page of ['home','markets','portfolio','learn'])assert.match(bar,new RegExp(`data-page="${page}"`));
    assert.match(bar,/id="mobileMoreButton"/);
    for(const page of ['trending','news','ai','community','other','copyright'])assert.match(html,new RegExp(`data-page="${page}"`));
    for(const id of ['homeAccountValue','homeBuyingPower','homeInvestedValue','homeOpenPositions'])assert.match(html,new RegExp(`id="${id}"`));
    assert.match(css,/grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/);
    assert.match(css,/env\(safe-area-inset-bottom\)/);
    assert.match(css,/body\.keyboard-open \.bottom-nav\s*\{\s*display:\s*none;/);
    assert.doesNotMatch(css,/overflow-x:\s*hidden/);
    assert.match(app,/function toggleMobileMore\(force\)/);
    assert.match(app,/homeInvestedValue/);
});

