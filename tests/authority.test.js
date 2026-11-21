const {test}=require('node:test');
const assert=require('node:assert/strict');
const {harness}=require('./frontend-harness.cjs');

const saved=h=>JSON.stringify([...h.store].sort(([a],[b])=>a.localeCompare(b)));
const memory=h=>h.run('JSON.stringify({profile,account,lessonProgress,communityNotes,savedSnapshot,tutorHistorySnapshot})');

function deferredCommit(h) {
    const authority=h.context.workspaceAuthority,original=authority.commit.bind(authority);
    let resolveObserved,pending;
    const observed=new Promise(resolve=>{resolveObserved=resolve;});
    authority.commit=(revision,nextData)=>new Promise((resolve,reject)=>{
        assert.equal(pending,undefined,'A second commit was started before the first settled');
        pending={revision,nextData,resolve,reject};resolveObserved();
    });
    return {
        async wait(){
            let timer;
            try{await Promise.race([observed,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Action did not reach authoritative commit')),5000);})]);}
            finally{clearTimeout(timer);}
        },
        grant(){authority.commit=original;pending.resolve(original(pending.revision,pending.nextData));},
        fail(message='IndexedDB transaction aborted'){authority.commit=original;pending.reject(new Error(message));}
    };
}

async function signup(h,email='fixture@example.test') {
    h.run('setAuthMode("signup")');h.element('profileName').value='Fixture';h.element('profileEmail').value=email;
    h.element('profilePassword').value='fixture-password';h.element('profilePassword2').value='fixture-password';
    await h.run('submitAuth()');assert.equal(h.run('profile.email'),email);
}

function answerLesson(h,index=0) {
    h.run(`openLesson(lessons[${index}].id)`);
    const answers=h.run('selectedLesson.quiz.map(question=>String(question.answer))'),query=h.context.document.querySelector;
    h.context.document.querySelector=selector=>selector.startsWith('input[name="quiz')
        ?{value:answers[Number(selector.match(/quiz(\d+)/)[1])]}
        :query(selector);
    return h.run('selectedLesson.id');
}

test('orders retain committed account and pending controls until authoritative commit completes',async()=>{
    const h=harness(new Map(),{boot:true}),beforeSaved=saved(h),beforeMemory=memory(h),commit=deferredCommit(h);
    const pending=h.run('placePaperOrder("AAPL","BUY",1)');await commit.wait();
    assert.equal(saved(h),beforeSaved);assert.equal(memory(h),beforeMemory);
    assert.equal(h.run('paperOrderPending'),true);assert.equal(h.run('appDataLockHeld'),true);
    assert.doesNotMatch(h.element('orderStatus').textContent,/BUY completed/);
    commit.grant();await pending;
    assert.equal(h.run('account.positions.AAPL.shares'),1);assert.match(h.element('orderStatus').textContent,/BUY completed/);
    assert.equal(h.run('paperOrderPending'),false);assert.equal(h.run('appDataLockHeld'),false);
    assert.equal(JSON.parse(h.store.get('turboGuestStateV2')).account.history.length,1);
});

test('an authoritative order abort restores account and saved signature without reporting completion',async()=>{
    const h=harness(new Map(),{boot:true});await h.run('placePaperOrder("AAPL","BUY",1)');
    const beforeSaved=saved(h),beforeMemory=memory(h),commit=deferredCommit(h);
    const pending=h.run('placePaperOrder("MSFT","BUY",1)');await commit.wait();commit.fail();await pending;
    assert.equal(saved(h),beforeSaved);assert.equal(memory(h),beforeMemory);
    assert.match(h.element('orderStatus').textContent,/not placed|could not|failed/i);
    assert.equal(h.run('paperOrderPending'),false);assert.equal(h.run('appDataLockHeld'),false);
});

test('an authoritative reset abort retains existing trades and lesson progress',async()=>{
    const h=harness(new Map(),{boot:true});await h.run('placePaperOrder("AAPL","BUY",1)');answerLesson(h);await h.run('submitQuiz()');
    const beforeSaved=saved(h),beforeMemory=memory(h),commit=deferredCommit(h);
    const pending=h.run('resetPaperAccount()');await commit.wait();assert.equal(memory(h),beforeMemory);
    commit.fail();await pending;
    assert.equal(saved(h),beforeSaved);assert.equal(memory(h),beforeMemory);
    assert.match(h.element('orderStatus').textContent,/not reset|could not|failed/i);
});

test('signup publishes its profile and clears retry fields and tutor drafts after commit',async()=>{
    const h=harness(new Map(),{boot:true});h.element('aiInput').value='Main unsent draft';h.element('miniTutorInput').value='Quick unsent draft';
    h.run('setAuthMode("signup")');h.element('profileName').value='Fixture';h.element('profileEmail').value='fixture@example.test';
    h.element('profilePassword').value='fixture-password';h.element('profilePassword2').value='fixture-password';
    const beforeSaved=saved(h),commit=deferredCommit(h),pending=h.run('submitAuth()');await commit.wait();
    assert.equal(saved(h),beforeSaved);assert.equal(h.run('profile'),null);assert.equal(h.run('authPending'),true);
    assert.equal(h.element('aiInput').value,'Main unsent draft');assert.equal(h.element('miniTutorInput').value,'Quick unsent draft');
    assert.equal(h.element('profilePassword').value,'fixture-password');assert.equal(h.element('profilePassword2').value,'fixture-password');
    commit.grant();await pending;
    assert.equal(h.run('profile.email'),'fixture@example.test');assert.equal(h.element('aiInput').value,'');assert.equal(h.element('miniTutorInput').value,'');
    assert.equal(h.element('profilePassword').value,'');assert.equal(h.element('profilePassword2').value,'');assert.equal(h.run('authPending'),false);
});

test('failed signup retains the guest and newer tutor drafts for retry',async()=>{
    const h=harness(new Map(),{boot:true});await h.run('placePaperOrder("AAPL","BUY",1)');
    h.run('setAuthMode("signup")');h.element('profileName').value='Fixture';h.element('profileEmail').value='fixture@example.test';
    h.element('profilePassword').value='fixture-password';h.element('profilePassword2').value='fixture-password';
    const beforeSaved=saved(h),beforeMemory=memory(h),commit=deferredCommit(h),pending=h.run('submitAuth()');await commit.wait();
    h.element('aiInput').value='New main draft while saving';h.element('miniTutorInput').value='New quick draft while saving';
    commit.fail();await pending;
    assert.equal(saved(h),beforeSaved);assert.equal(memory(h),beforeMemory);
    assert.equal(h.element('aiInput').value,'New main draft while saving');assert.equal(h.element('miniTutorInput').value,'New quick draft while saving');
    assert.equal(h.element('profilePassword').value,'fixture-password');assert.match(h.element('authError').textContent,/aborted/);
});

test('an old successful signup preserves a reopened auth dialog and its new retry fields',async()=>{
    const h=harness(new Map(),{boot:true});h.run('openAuth();setAuthMode("signup")');
    h.element('profileName').value='Original';h.element('profileEmail').value='original@example.test';
    h.element('profilePassword').value='original-password';h.element('profilePassword2').value='original-password';
    const commit=deferredCommit(h),pending=h.run('submitAuth()');await commit.wait();
    h.run('closeAuth();openAuth();setAuthMode("signin")');
    h.element('profileName').value='New retry';h.element('profileEmail').value='retry@example.test';
    h.element('profilePassword').value='new-retry-password';h.element('profilePassword2').value='new-retry-confirmation';
    commit.grant();await pending;
    assert.equal(h.run('profile.email'),'original@example.test');assert.equal(h.element('authModal').classList.contains('open'),true);
    assert.equal(h.element('profileName').value,'New retry');assert.equal(h.element('profileEmail').value,'retry@example.test');
    assert.equal(h.element('profilePassword').value,'new-retry-password');assert.equal(h.element('profilePassword2').value,'new-retry-confirmation');
    assert.equal(h.element('authError').textContent,'');assert.equal(h.run('authPending'),false);assert.equal(h.element('authSubmit').disabled,false);
});

test('an old signup abort cannot replace a reopened auth dialog with its late error',async()=>{
    const h=harness(new Map(),{boot:true});h.run('openAuth();setAuthMode("signup")');
    h.element('profileName').value='Original';h.element('profileEmail').value='original@example.test';
    h.element('profilePassword').value='original-password';h.element('profilePassword2').value='original-password';
    const beforeSaved=saved(h),beforeMemory=memory(h),commit=deferredCommit(h),pending=h.run('submitAuth()');await commit.wait();
    h.run('closeAuth();openAuth();setAuthMode("signin")');
    h.element('profileEmail').value='retry@example.test';h.element('profilePassword').value='new-retry-password';
    h.element('authError').textContent='New dialog feedback';commit.fail();await pending;
    assert.equal(saved(h),beforeSaved);assert.equal(memory(h),beforeMemory);assert.equal(h.element('authModal').classList.contains('open'),true);
    assert.equal(h.element('profileEmail').value,'retry@example.test');assert.equal(h.element('profilePassword').value,'new-retry-password');
    assert.equal(h.element('authError').textContent,'New dialog feedback');assert.match(h.element('storageStatus').textContent,/earlier profile request was not saved/);
    assert.equal(h.run('authPending'),false);assert.equal(h.element('authSubmit').disabled,false);
});

test('failed signout retains active profile, account and unsent tutor drafts',async()=>{
    const h=harness(new Map(),{boot:true});await signup(h);h.element('aiInput').value='Profile main draft';h.element('miniTutorInput').value='Profile quick draft';
    const beforeSaved=saved(h),beforeMemory=memory(h),commit=deferredCommit(h),pending=h.run('signOut()');await commit.wait();
    assert.equal(memory(h),beforeMemory);commit.fail();await pending;
    assert.equal(saved(h),beforeSaved);assert.equal(memory(h),beforeMemory);
    assert.equal(h.element('aiInput').value,'Profile main draft');assert.equal(h.element('miniTutorInput').value,'Profile quick draft');
    assert.match(h.element('storageStatus').textContent,/still active/);
});

test('failed signin retains guest workspace and password retry fields',async()=>{
    const h=harness(new Map(),{boot:true});await signup(h);await h.run('signOut()');
    h.run('setAuthMode("signin")');h.element('profileEmail').value='fixture@example.test';h.element('profilePassword').value='fixture-password';
    h.element('aiInput').value='Guest main draft';h.element('miniTutorInput').value='Guest quick draft';
    const beforeSaved=saved(h),beforeMemory=memory(h),commit=deferredCommit(h),pending=h.run('submitAuth()');await commit.wait();
    assert.equal(memory(h),beforeMemory);commit.fail();await pending;
    assert.equal(saved(h),beforeSaved);assert.equal(memory(h),beforeMemory);assert.equal(h.element('profilePassword').value,'fixture-password');
    assert.equal(h.element('aiInput').value,'Guest main draft');assert.equal(h.element('miniTutorInput').value,'Guest quick draft');
    assert.match(h.element('authError').textContent,/aborted/);
});

test('quiz progress, completion feedback and submit release await authoritative commit',async()=>{
    const h=harness(new Map(),{boot:true}),id=answerLesson(h),beforeSaved=saved(h),beforeMemory=memory(h),commit=deferredCommit(h);
    const pending=h.run('submitQuiz()');await commit.wait();
    assert.equal(saved(h),beforeSaved);assert.equal(memory(h),beforeMemory);assert.equal(h.element('quizSubmit').disabled,true);
    assert.doesNotMatch(h.element('quizResult').innerHTML,/Lesson complete/);
    commit.grant();await pending;
    assert.equal(h.run(`lessonProgress[${JSON.stringify(id)}].percent`),100);assert.match(h.element('quizResult').innerHTML,/Lesson complete/);
    assert.equal(h.element('quizSubmit').disabled,false);
});

test('old quiz commit failure preserves a newly opened lesson presentation',async()=>{
    const h=harness(new Map(),{boot:true}),id=answerLesson(h),beforeSaved=saved(h),commit=deferredCommit(h);
    const pending=h.run('submitQuiz()');await commit.wait();h.run(`closeLesson();openLesson(${JSON.stringify(id)})`);
    commit.fail();await pending;
    assert.equal(saved(h),beforeSaved);assert.equal(h.run(`lessonProgress[${JSON.stringify(id)}]`),undefined);
    assert.equal(h.element('quizResult').innerHTML,'');assert.equal(h.element('quizResult').textContent,'');assert.equal(h.element('quizSubmit').disabled,false);
    assert.match(h.element('storageStatus').textContent,/earlier quiz.*could not be saved/);
});

test('notes keep their form draft and committed list when authoritative commit aborts',async()=>{
    const h=harness(new Map(),{boot:true});let resets=0;h.element('communityNoteForm').reset=()=>{resets++;};
    h.element('communityClaimSymbol').value='AAPL';h.element('communityClaim').value='Keep this observation';
    h.element('communitySource').value='Other';h.element('communityTone').value='unverified';
    const beforeSaved=saved(h),beforeMemory=memory(h),commit=deferredCommit(h),pending=h.run('saveCommunityNote({preventDefault(){}})');await commit.wait();
    assert.equal(resets,0);assert.equal(memory(h),beforeMemory);commit.fail();await pending;
    assert.equal(saved(h),beforeSaved);assert.equal(memory(h),beforeMemory);assert.equal(resets,0);assert.equal(h.element('communityClaim').value,'Keep this observation');
});

test('tutor preference and history snapshot remain atomic when authoritative commit aborts',async()=>{
    const h=harness(new Map(),{boot:true});h.run('chatHistory=[{role:"user",content:"A question"}]');h.element('rememberTutorChat').checked=true;
    const beforeSaved=saved(h),beforeMemory=memory(h),commit=deferredCommit(h),pending=h.run('setTutorHistoryPreference()');await commit.wait();
    commit.fail();await pending;
    assert.equal(saved(h),beforeSaved);assert.equal(memory(h),beforeMemory);assert.equal(h.element('rememberTutorChat').checked,false);
    assert.match(h.element('storageStatus').textContent,/preference was not saved/);
});

test('failed remembered tutor sends preserve main and quick drafts and saved history',async()=>{
    for(const mini of [false,true]) {
        const h=harness(new Map([['turboRememberTutor:guest','true'],['turboTutorHistory:guest','[]']]),{boot:true}),beforeSaved=saved(h);
        h.context.workspaceAuthority.commit=()=>Promise.reject(new Error('IndexedDB transaction aborted'));
        h.element(mini?'miniTutorInput':'aiInput').value='Explain dividends';
        await h.run(mini?'submitMiniTutor({preventDefault(){}})':'sendAI()');
        assert.equal(saved(h),beforeSaved);assert.equal(h.run('tutorHistorySnapshot'),'[]');
        assert.equal(h.element(mini?'miniTutorInput':'aiInput').value,'Explain dividends');assert.equal(h.run('tutorIsGenerating'),false);
        assert.equal(h.element(mini?'miniTutorSend':'aiSend').disabled,false);
    }
});

test('aborted authoritative import retains all saved data and unsent drafts',async()=>{
    const h=harness(new Map([['other-app','untouched']]),{boot:true});await signup(h);await h.run('placePaperOrder("AAPL","BUY",1)');
    h.element('aiInput').value='Main import draft';h.element('miniTutorInput').value='Quick import draft';
    h.element('backupImportFile').files=[{size:100,text:async()=>JSON.stringify({product:'Turbo Stocks',formatVersion:1,data:{novaTheme:'light'}})}];
    const beforeSaved=saved(h),beforeMemory=memory(h),commit=deferredCommit(h),pending=h.run('importLocalBackup(document.getElementById("backupImportFile"))');await commit.wait();
    assert.equal(memory(h),beforeMemory);assert.equal(h.element('aiInput').value,'Main import draft');assert.doesNotMatch(h.element('backupStatus').textContent,/Backup imported/);
    commit.fail();await pending;
    assert.equal(saved(h),beforeSaved);assert.equal(memory(h),beforeMemory);assert.equal(h.element('aiInput').value,'Main import draft');assert.equal(h.element('miniTutorInput').value,'Quick import draft');
    assert.doesNotMatch(h.element('backupStatus').textContent,/Backup imported/);assert.match(h.element('backupStatus').textContent,/failed/i);
});

test('theme, export and note actions refresh adopted account state while preserving unsent work',async()=>{
    for(const action of ['toggleTheme()','exportLocalBackup()','saveCommunityNote({preventDefault(){}})']) {
        const store=new Map(),first=harness(store,{boot:true}),second=harness(store,{boot:true});
        await first.run('placePaperOrder("AAPL","BUY",1)');assert.equal(second.run('account.history.length'),0);
        second.element('aiInput').value='Main draft while stale';second.element('miniTutorInput').value='Quick draft while stale';
        second.element('communityClaimSymbol').value='AAPL';second.element('communityClaim').value='A scoped observation';
        second.element('communitySource').value='Other';second.element('communityTone').value='unverified';
        second.run('chatHistory=[{role:"user",content:"In-tab unsaved chat"}];downloadJSON=payload=>{exportedBackup=payload;}');
        await second.run(action);await second.run('syncAuthoritativeWorkspace()');
        assert.equal(second.run('account.positions.AAPL?.shares'),1,`${action} left the portfolio stale after adopting its authority revision`);
        assert.equal(second.run('savedSnapshot===persistedSignature()'),true);
        assert.equal(second.element('aiInput').value,'Main draft while stale');assert.equal(second.element('miniTutorInput').value,'Quick draft while stale');
        assert.equal(second.run('chatHistory[0].content'),'In-tab unsaved chat');
        if(action==='exportLocalBackup()')assert.equal(JSON.parse(second.run('exportedBackup.data.turboGuestStateV2')).account.positions.AAPL.shares,1);
        if(action.startsWith('saveCommunityNote'))assert.equal(JSON.parse(store.get('turboCommunityNotes:guest'))[0].claim,'A scoped observation');
    }
});

test('same-guest import restores remembered history into an empty clean conversation',async()=>{
    const h=harness(new Map(),{boot:true}),history=[{role:'user',content:'Imported conversation'}];
    h.element('aiInput').value='Keep main draft';h.element('miniTutorInput').value='Keep quick draft';
    const data={'turboRememberTutor:guest':'true','turboTutorHistory:guest':JSON.stringify(history)};
    h.element('backupImportFile').files=[{size:200,text:async()=>JSON.stringify({product:'Turbo Stocks',formatVersion:1,data})}];
    await h.run('importLocalBackup(document.getElementById("backupImportFile"))');
    assert.match(h.element('backupStatus').textContent,/Backup imported/);assert.equal(h.element('rememberTutorChat').checked,true);
    assert.equal(h.run('JSON.stringify(chatHistory)'),JSON.stringify(history));assert.equal(h.run('tutorHistorySnapshot'),JSON.stringify(history));
    assert.equal(h.element('aiInput').value,'Keep main draft');assert.equal(h.element('miniTutorInput').value,'Keep quick draft');
});
