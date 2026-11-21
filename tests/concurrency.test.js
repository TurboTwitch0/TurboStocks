const {test}=require('node:test');
const assert=require('node:assert/strict');
const {harness}=require('./frontend-harness.cjs');

function delayedLock(h) {
    let request;
    h.context.navigator.locks={request:(name,options,callback)=>new Promise((resolve,reject)=>{
        request={name,options,grant(){try{resolve(callback({name}));}catch(error){reject(error);}},reject};
    })};
    return ()=>request;
}
async function signup(h,email='fixture@example.test') {
    h.run('setAuthMode("signup")');h.element('profileName').value='Fixture';h.element('profileEmail').value=email;
    h.element('profilePassword').value='fixture-password';h.element('profilePassword2').value='fixture-password';
    await h.run('submitAuth()');assert.equal(h.run('profile.email'),email);
}
function saved(store){return JSON.stringify([...store]);}

test('paper orders wait before previewing and retain the requested symbol and shares',async()=>{
    const h=harness(new Map(),{boot:true}),requested=delayedLock(h);let previews=0;
    h.context.confirm=()=>{previews++;assert.equal(h.run('appDataLockHeld'),true);return true;};
    const pending=h.run('placePaperOrder("AAPL","BUY",0.5)');
    assert.equal(previews,0);assert.equal(h.store.has('turboGuestStateV2'),false);assert.equal(h.run('paperOrderPending'),true);
    assert.match(h.element('orderStatus').textContent,/Waiting.*BUY 0.5 AAPL/);
    h.element('orderSymbol').value='MSFT';h.element('orderShares').value='12';
    requested().grant();await pending;
    const account=JSON.parse(h.store.get('turboGuestStateV2')).account;
    assert.equal(account.positions.AAPL.shares,.5);assert.equal(account.cash,99872.5);assert.equal(previews,1);
    assert.equal(h.run('paperOrderPending'),false);assert.equal(h.run('appDataLockHeld'),false);
});

test('a queued stale order cannot replace another tab’s completed trade',async()=>{
    const store=new Map(),first=harness(store,{boot:true}),second=harness(store,{boot:true}),requested=delayedLock(second);
    let previews=0;second.context.confirm=()=>{previews++;return true;};
    const pending=second.run('placePaperOrder("AAPL","BUY",1)');
    await first.run('placePaperOrder("MSFT","BUY",1)');const before=saved(store);
    requested().grant();await pending;
    assert.equal(saved(store),before);assert.equal(previews,0);assert.equal(second.run('account.positions.MSFT.shares'),1);
    assert.match(second.element('orderStatus').textContent,/not placed.*changed while this action was waiting/);
    assert.equal(second.run('paperOrderPending'),false);
});

test('a queued action cannot move a guest order into a newly active profile',async()=>{
    const store=new Map(),first=harness(store,{boot:true}),second=harness(store,{boot:true}),requested=delayedLock(second);
    const pending=second.run('placePaperOrder("AAPL","BUY",1)');
    await signup(first);const before=saved(store);
    requested().grant();await pending;
    assert.equal(saved(store),before);assert.equal(JSON.parse(store.get('novaUsers'))['fixture@example.test'].account.history.length,0);
    assert.match(second.element('orderStatus').textContent,/not placed.*changed/);
});

test('authoritative CAS rejects a competing commit made while confirmation was open',async()=>{
    const store=new Map(),h=harness(store,{boot:true}),outside=harness(store,{boot:true});
    h.context.confirm=()=>{
        outside.authority.commit(outside.authority.load().revision,{turboGuestStateV2:JSON.stringify({account:{cash:99490,positions:{MSFT:{shares:1,averagePrice:510}},history:[],watchlist:[]},lessonProgress:{}})});
        return true;
    };
    await h.run('placePaperOrder("AAPL","BUY",1)');
    await h.run('syncAuthoritativeWorkspace()');
    assert.equal(JSON.parse(h.store.get('turboGuestStateV2')).account.positions.MSFT.shares,1);
    assert.equal(h.run('account.positions.MSFT.shares'),1);assert.equal(h.run('account.positions.AAPL'),undefined);
    assert.match(h.element('orderStatus').textContent,/not placed/);
});

test('cancelled and failed orders release the transaction and retain the saved account',async()=>{
    const h=harness(new Map(),{boot:true});await h.run('placePaperOrder("AAPL","BUY",1)');
    const before=saved(h.store);h.context.confirm=()=>false;
    await h.run('placePaperOrder("MSFT","BUY",1)');assert.equal(saved(h.store),before);assert.match(h.element('orderStatus').textContent,/cancelled/);
    h.context.confirm=()=>true;const set=h.storage.setItem;h.storage.setItem=()=>{throw new Error('Quota exceeded');};
    await h.run('placePaperOrder("MSFT","BUY",1)');assert.equal(saved(h.store),before);
    assert.equal(h.run('account.positions.AAPL.shares'),1);assert.equal(h.run('appDataLockHeld'),false);assert.equal(h.run('paperOrderPending'),false);
    h.storage.setItem=set;await h.run('placePaperOrder("MSFT","BUY",1)');
    assert.equal(JSON.parse(h.store.get('turboGuestStateV2')).account.history.length,2);
});

test('unsupported coordination preserves data and drafts while study, tutor, themes and export remain usable',async()=>{
    const h=harness(new Map(),{boot:true});await h.run('placePaperOrder("AAPL","BUY",1)');await signup(h);
    const before=saved(h.store);delete h.context.navigator.locks;
    h.element('aiInput').value='Keep this unsent question';h.element('miniTutorInput').value='Keep this quick draft';
    h.run('openLesson(lessons[0].id)');
    for(const action of ['placePaperOrder("MSFT","BUY",1)','resetPaperAccount()','toggleWatchlist("MSFT")','submitQuiz()','signOut()'])await h.run(action);
    assert.equal(saved(h.store),before);assert.equal(h.run('profile.email'),'fixture@example.test');
    assert.equal(h.element('aiInput').value,'Keep this unsent question');assert.equal(h.element('miniTutorInput').value,'Keep this quick draft');
    assert.match(h.element('storageStatus').textContent,/Safe saving is unavailable/);
    await h.run('toggleTheme()');assert.equal(h.context.document.body.classList.contains('light'),true);assert.equal(saved(h.store),before);
    h.run('downloadJSON=payload=>{exportedBackup=payload;}');await h.run('exportLocalBackup()');
    assert.equal(h.run('exportedBackup.product'),'Turbo Stocks');assert.equal(h.run('exportedBackup.data.novaUsers'),h.store.get('novaUsers'));
    h.element('backupImportFile').files=[{size:60,text:async()=>JSON.stringify({product:'Turbo Stocks',formatVersion:1,data:{novaTheme:'light'}})}];
    await h.run('importLocalBackup(document.getElementById("backupImportFile"))');assert.equal(saved(h.store),before);
    assert.match(h.element('backupStatus').textContent,/Safe saving is unavailable/);
    await h.run('sendAI("Explain dividends")');assert.match(h.run('chatHistory.at(-1).content'),/Dividends/);assert.equal(saved(h.store),before);
});

test('denied or rejected locks cannot save or clear data and still allow a read-only backup',async()=>{
    for(const synchronous of [false,true]) {
        const h=harness(new Map(),{boot:true});await h.run('placePaperOrder("AAPL","BUY",1)');const before=saved(h.store);
        h.context.navigator.locks.request=()=>{const error=Object.assign(new Error('Denied'),{name:'SecurityError'});if(synchronous)throw error;return Promise.reject(error);};
        await h.run('placePaperOrder("MSFT","BUY",1)');await h.run('resetPaperAccount()');
        assert.equal(saved(h.store),before);assert.equal(h.run('paperOrderPending'),false);assert.equal(h.run('appDataLockHeld'),false);
        assert.match(h.element('orderStatus').textContent,/Safe saving is unavailable/);
        h.run('downloadJSON=payload=>{exportedBackup=payload;}');await h.run('exportLocalBackup()');assert.equal(h.run('exportedBackup.product'),'Turbo Stocks');
        h.element('backupImportFile').files=[{size:60,text:async()=>JSON.stringify({product:'Turbo Stocks',formatVersion:1,data:{novaTheme:'light'}})}];
        await h.run('importLocalBackup(document.getElementById("backupImportFile"))');assert.equal(saved(h.store),before);
        assert.match(h.element('backupStatus').textContent,/Safe saving is unavailable/);
    }
});

test('account and backup operations share the same origin-wide lock',async()=>{
    const h=harness(new Map(),{boot:true}),names=[];
    h.context.navigator.locks.request=(name,options,callback)=>{names.push(name);return Promise.resolve(callback({name}));};
    await h.run('placePaperOrder("AAPL","BUY",1)');await h.run('toggleWatchlist("MSFT")');await h.run('resetPaperAccount()');
    h.element('backupImportFile').files=[{size:60,text:async()=>JSON.stringify({product:'Turbo Stocks',formatVersion:1,data:{novaTheme:'light'}})}];
    await h.run('importLocalBackup(document.getElementById("backupImportFile"))');
    assert.equal(names.length,4);assert.ok(names.every(name=>name==='turbo-stocks-browser-data'));
    assert.equal(h.store.get('novaTheme'),'light');assert.equal(h.store.has('__turboStocksBackupImport'),false);
});

test('legacy migration waits for coordinated storage and retains original records',async()=>{
    const account={cash:81234,positions:{},history:[],watchlist:['AAPL']};
    const store=new Map([['novaProfile',JSON.stringify({name:'Legacy',email:'legacy@example.test'})],['novaAccount',JSON.stringify(account)],['novaLessonProgress','{}']]);
    const h=harness(store,{boot:true}),requested=delayedLock(h),before=saved(store);
    await Promise.resolve();assert.equal(saved(store),before);assert.ok(requested());
    requested().grant();await Promise.resolve();await Promise.resolve();
    assert.equal(h.run('profile.email'),'legacy@example.test');assert.equal(h.run('account.cash'),81234);
    assert.equal(store.get('novaAccount'),JSON.stringify(account));assert.equal(JSON.parse(store.get('novaUsers'))['legacy@example.test'].account.cash,81234);
});

test('queued quiz grading uses the submitted lesson and answers rather than a newly opened lesson',async()=>{
    const h=harness(new Map(),{boot:true});h.run('openLesson(lessons[0].id)');
    const id=h.run('selectedLesson.id'),answers=h.run('selectedLesson.quiz.map(question=>question.answer)'),originalQuery=h.context.document.querySelector;
    h.context.document.querySelector=selector=>selector.startsWith('input[name="quiz')?{value:answers[Number(selector.match(/quiz(\d+)/)[1])]}:originalQuery(selector);
    const requested=delayedLock(h),pending=h.run('submitQuiz()');h.run('openLesson(lessons[1].id)');
    requested().grant();await pending;
    const progress=JSON.parse(h.store.get('turboGuestStateV2')).lessonProgress;
    assert.equal(progress[id].percent,100);assert.equal(h.run('lessonProgress[lessons[1].id]'),undefined);
    assert.equal(h.element('quizResult').innerHTML,'');
});

test('queued signup retains the explicitly submitted identity',async()=>{
    const h=harness(new Map(),{boot:true}),requested=delayedLock(h);
    h.run('setAuthMode("signup")');h.element('profileName').value='Original';h.element('profileEmail').value='original@example.test';
    h.element('profilePassword').value='fixture-password';h.element('profilePassword2').value='fixture-password';
    const pending=h.run('submitAuth()');h.element('profileName').value='New draft';h.element('profileEmail').value='new-draft@example.test';
    requested().grant();await pending;
    const users=JSON.parse(h.store.get('novaUsers'));assert.equal(users['original@example.test'].name,'Original');assert.equal(users['new-draft@example.test'],undefined);
});

test('notes merge the latest scoped records inside the shared transaction',async()=>{
    const store=new Map(),first=harness(store,{boot:true}),second=harness(store,{boot:true});
    for(const [h,claim] of [[first,'First tab observation'],[second,'Second tab observation']]) {
        h.element('communityClaimSymbol').value='AAPL';h.element('communityClaim').value=claim;
        h.element('communitySource').value='Other';h.element('communityTone').value='unverified';
        await h.run('saveCommunityNote({preventDefault(){}})');
    }
    const notes=JSON.parse(store.get('turboCommunityNotes:guest'));assert.equal(notes.length,2);
    assert.deepEqual(notes.map(note=>note.claim).sort(),['First tab observation','Second tab observation']);
});

test('an old chat snapshot cannot overwrite a newer conversation on save or unload',async()=>{
    const store=new Map([['turboRememberTutor:guest','true'],['turboTutorHistory:guest','[]']]);
    const first=harness(store,{boot:true}),second=harness(store,{boot:true});
    await first.run('sendAI("Explain dividends")');const current=store.get('turboTutorHistory:guest');
    second.run('chatHistory=[{role:"user",content:"Old unsaved conversation"}]');await second.run('persistTutorHistory()');
    second.run('saveBeforeTabCloses()');assert.equal(store.get('turboTutorHistory:guest'),current);
    assert.equal(second.run('chatHistory[0].content'),'Old unsaved conversation');assert.match(second.element('storageStatus').textContent,/could not be saved/);
});

test('backup status remains visible after removing an earlier recovery link',()=>{
    const h=harness();h.context.fixtureStatus={textContent:'Old recovery link',replaceChildren(){this.textContent='';}};
    h.run('statusText(fixtureStatus,"Import failed: another tab is updating data.")');
    assert.equal(h.context.fixtureStatus.textContent,'Import failed: another tab is updating data.');
});

test('legacy portfolios remain readable without permitting an uncoordinated migration',async()=>{
    const account={cash:81234,positions:{AAPL:{shares:1,averagePrice:200}},history:[],watchlist:['AAPL']};
    const store=new Map([['novaProfile',JSON.stringify({name:'Legacy',email:'legacy@example.test'})],['novaAccount',JSON.stringify(account)]]);
    const before=saved(store),h=harness(store,{boot:true});delete h.context.navigator.locks;
    await Promise.resolve();await Promise.resolve();await Promise.resolve();
    assert.equal(h.run('profile.email'),'legacy@example.test');assert.equal(h.run('account.cash'),81234);assert.equal(h.run('account.positions.AAPL.shares'),1);
    assert.equal(saved(store),before);assert.match(h.element('storageStatus').textContent,/Safe saving is unavailable/);
});

test('a failed legacy migration retains its original portfolio and readable profile',async()=>{
    const store=new Map([['novaProfile',JSON.stringify({name:'Legacy',email:'legacy@example.test'})],['novaAccount',JSON.stringify({cash:81234,positions:{},history:[],watchlist:[]})]]);
    const before=saved(store),h=harness(store,{boot:true});h.storage.setItem=()=>{throw new Error('Storage full');};
    await Promise.resolve();await Promise.resolve();await Promise.resolve();
    assert.equal(saved(store),before);assert.equal(h.run('profile.email'),'legacy@example.test');assert.equal(h.run('account.cash'),81234);
});

function rememberedTutor() {
    return harness(new Map([['turboRememberTutor:guest','true'],['turboTutorHistory:guest','[]']]),{boot:true});
}

test('cancelling a tutor send waiting on storage preserves a newly typed main draft',async()=>{
    const h=rememberedTutor(),locks=h.context.navigator.locks,requested=delayedLock(h);
    h.element('aiInput').value='Explain dividends';const pending=h.run('sendAI()');
    h.run('cancelAI()');h.element('aiInput').value='New unsent question';
    h.context.navigator.locks=locks;requested().grant();await pending;
    assert.equal(h.element('aiInput').value,'New unsent question');assert.equal(h.run('chatHistory.some(item=>item.role==="assistant")'),false);
    assert.equal(h.run('tutorIsGenerating'),false);assert.equal(h.element('aiSend').disabled,false);
});

test('a tutor send waiting on storage preserves the next profile’s draft and conversation',async()=>{
    const h=rememberedTutor(),locks=h.context.navigator.locks,requested=delayedLock(h);
    h.element('aiInput').value='Explain dividends';const pending=h.run('sendAI()');
    const user={name:'Other',email:'other@example.test',passwordHash:null,account:{cash:50000,positions:{},history:[],watchlist:[]},lessonProgress:{}};
    h.store.set('novaUsers',JSON.stringify({'other@example.test':user}));h.store.set('novaSession','other@example.test');h.run('refreshWorkspaceFromStorage()');
    h.element('aiInput').value='New profile unsent question';
    h.context.navigator.locks=locks;requested().grant();await pending;
    assert.equal(h.element('aiInput').value,'New profile unsent question');assert.equal(h.run('chatHistory.length'),0);
    assert.equal(h.store.has('turboTutorHistory:other%40example.test'),false);
});

test('main tutor sends clear only the unchanged submitted draft after delayed storage',async()=>{
    for(const edit of [false,true]) {
        const h=rememberedTutor(),locks=h.context.navigator.locks,requested=delayedLock(h);
        h.element('aiInput').value='Explain dividends';const pending=h.run('sendAI()');
        if(edit)h.element('aiInput').value='Next unsent question';
        h.context.navigator.locks=locks;requested().grant();await pending;
        assert.equal(h.element('aiInput').value,edit?'Next unsent question':'');
        assert.equal(h.run('chatHistory[0].content'),'Explain dividends');assert.match(h.run('chatHistory.at(-1).content'),/Dividends/);
    }
});

test('optional-message sends preserve the main draft while their storage is delayed',async()=>{
    const h=rememberedTutor(),locks=h.context.navigator.locks,requested=delayedLock(h);
    h.element('aiInput').value='Unsent main draft';const pending=h.run('sendAI("Explain dividends")');
    h.element('aiInput').value='Edited main draft';
    h.context.navigator.locks=locks;requested().grant();await pending;
    assert.equal(h.element('aiInput').value,'Edited main draft');assert.match(h.run('chatHistory.at(-1).content'),/Dividends/);
});

test('the quick tutor does not restore an old main draft after its delayed optional send',async()=>{
    const h=rememberedTutor(),locks=h.context.navigator.locks,requested=delayedLock(h);
    h.element('aiInput').value='Original main draft';h.element('miniTutorInput').value='Explain dividends';
    const pending=h.run('submitMiniTutor({preventDefault(){}})');h.element('aiInput').value='Edited main draft';
    h.context.navigator.locks=locks;requested().grant();await pending;
    assert.equal(h.element('aiInput').value,'Edited main draft');assert.equal(h.element('miniTutorSend').disabled,false);
});

function answerLesson(h) {
    h.run('openLesson(lessons[0].id)');
    let chosen=h.run('selectedLesson.quiz.map(question=>String(question.answer))');
    const query=h.context.document.querySelector;
    h.context.document.querySelector=selector=>selector.startsWith('input[name="quiz')
        ?(chosen[Number(selector.match(/quiz(\d+)/)[1])]===undefined?null:{value:chosen[Number(selector.match(/quiz(\d+)/)[1])]})
        :query(selector);
    return {id:h.run('selectedLesson.id'),choose:values=>{chosen=values;}};
}

test('old quiz success saves progress without populating a freshly reopened same-lesson dialog',async()=>{
    const h=harness(new Map(),{boot:true}),lesson=answerLesson(h),requested=delayedLock(h);
    const pending=h.run('submitQuiz()');h.run(`closeLesson();openLesson(${JSON.stringify(lesson.id)})`);lesson.choose([]);
    requested().grant();await pending;
    assert.equal(h.run(`lessonProgress[${JSON.stringify(lesson.id)}].percent`),100);
    assert.equal(h.element('quizResult').innerHTML,'');assert.equal(h.element('quizResult').textContent,'');
    assert.equal(h.element('quizSubmit').disabled,false);
});

test('old quiz storage failure cannot replace a new same-lesson dialog with its error',async()=>{
    const h=harness(new Map(),{boot:true}),lesson=answerLesson(h),requested=delayedLock(h);
    const pending=h.run('submitQuiz()');h.run(`closeLesson();openLesson(${JSON.stringify(lesson.id)})`);lesson.choose(['0']);
    h.storage.setItem=()=>{throw new Error('Quota exceeded');};requested().grant();await pending;
    assert.equal(h.element('quizResult').textContent,'');assert.equal(h.element('quizResult').innerHTML,'');
    assert.match(h.element('storageStatus').textContent,/earlier quiz.*could not be saved/);
    assert.equal(h.run(`lessonProgress[${JSON.stringify(lesson.id)}]`),undefined);assert.equal(h.element('quizSubmit').disabled,false);
});

test('rapid repeated quiz submits queue one save and disable only its pending submit',async()=>{
    const h=harness(new Map(),{boot:true});answerLesson(h);const requested=delayedLock(h),request=h.context.navigator.locks.request;let count=0;
    h.context.navigator.locks.request=(...args)=>{count++;return request(...args);};
    const first=h.run('submitQuiz()'),second=h.run('submitQuiz()');assert.equal(count,1);
    assert.equal(h.element('quizSubmit').disabled,true);requested().grant();await Promise.all([first,second]);
    assert.equal(h.element('quizSubmit').disabled,false);assert.equal(h.element('quizSubmit').textContent,'Submit Quiz');
    assert.match(h.element('quizResult').innerHTML,/Lesson complete/);
});

test('an old quiz completion cannot release a newer presentation’s pending submit',async()=>{
    const h=harness(new Map(),{boot:true}),lesson=answerLesson(h),requests=[];
    h.context.navigator.locks.request=(name,options,callback)=>new Promise((resolve,reject)=>requests.push({grant(){try{resolve(callback({name}));}catch(error){reject(error);}}}));
    const old=h.run('submitQuiz()');h.run(`closeLesson();openLesson(${JSON.stringify(lesson.id)})`);lesson.choose(['0']);const next=h.run('submitQuiz()');
    assert.equal(requests.length,2);requests[0].grant();await old;
    assert.equal(h.element('quizResult').innerHTML,'');assert.equal(h.element('quizSubmit').disabled,true);
    requests[1].grant();await next;
    assert.equal(h.element('quizSubmit').disabled,false);assert.match(h.element('quizResult').textContent,/Saved progress changed/);
    assert.equal(h.run(`lessonProgress[${JSON.stringify(lesson.id)}].percent`),100);
});
