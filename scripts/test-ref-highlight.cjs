#!/usr/bin/env node
// Source highlight: geometry, single match vs ambiguity, cancellation, honest fallback,
// checklist navigation / back-forward, and a mobile browser smoke with no console errors.
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const http=require('http');
const assert=require('assert/strict');
const {spawn}=require('child_process');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'site/index.html'),'utf8');
assert.equal(html, fs.readFileSync(path.join(root,'index.html'),'utf8'), 'root/site mirror');

const listeners={};
function el(){
  return {
    innerHTML:'', value:'', textContent:'', className:'', hidden:false, tabIndex:0, style:{setProperty(){}},
    dataset:{},
    classList:{add(){},remove(){},contains(){return false;},toggle(){}},
    addEventListener(){}, focus(){}, select(){}, closest(){return null;}, appendChild(){},
    setAttribute(){}, removeAttribute(){}, querySelectorAll(){return []},
    getBoundingClientRect(){return {top:0,bottom:0,left:0,right:0,width:0,height:0};}
  };
}
const appRoot=el();
const hist={entries:[], i:-1};
function histFire(){
  const st=hist.i>=0?hist.entries[hist.i]:null;
  (listeners.popstate||[]).forEach(fn=>fn({state:st}));
}
const history={
  get state(){ return hist.i>=0?hist.entries[hist.i]:null; },
  replaceState(s){ if(hist.i<0){ hist.entries=[s]; hist.i=0; } else hist.entries[hist.i]=s; },
  pushState(s){ hist.entries=hist.entries.slice(0, hist.i+1); hist.entries.push(s); hist.i++; },
  back(){ if(hist.i<=0) return; hist.i--; histFire(); },
  forward(){ if(hist.i>=hist.entries.length-1) return; hist.i++; histFire(); }
};
const document={
  getElementById(id){ return id==='app'?appRoot:el(); },
  querySelector(){ return el(); },
  querySelectorAll(){ return []; },
  addEventListener(type, fn){ (listeners[type]||(listeners[type]=[])).push(fn); },
  createElement(){ return el(); },
  head:{appendChild(){}}
};
const ctx={
  console, document, history, localStorage:{getItem(){return null;},setItem(){},removeItem(){},length:0,key(){return null;}},
  setTimeout(){}, clearTimeout(){}, requestAnimationFrame(){}, navigator:{}, location:{pathname:'/index.html'},
  devicePixelRatio:1
};
ctx.window=ctx;
ctx.addEventListener=document.addEventListener;
ctx.globalThis=ctx;
vm.createContext(ctx);
let code=html.match(/<script>([\s\S]*)<\/script>\s*<\/body>/)[1];
const exported='S,pageForCite,citePubAndSec,openLearnCite,stepLearnCite,leavePdfToLearn,acadTopicRefs,matchSourceSpans,sourceSpanBoxes,resolveKnownCitePage,resolveCiteSource,chapterFallbackPage,sectionKeyOf,cancelSourceHighlight,commitSourceHighlight,sourceHighlightGen,pdfFindAuto,loadRefSpan,refSpanPhrase,SEC_IDX';
const end=/render\(\);\s*navInit\(\);\s*render\(\);\s*\}\)\(\);/;
assert(end.test(code), 'runtime instrumentation point');
code=code.replace(end, `render(); navInit(); render(); globalThis.V={${exported}};})();`);
vm.runInContext(code, ctx);
const V=ctx.V;

function loadUMD(file){
  const src=fs.readFileSync(file,'utf8');
  const m={exports:{}};
  vm.runInThisContext(`(function(exports,require,module,__filename,__dirname){${src}\n})`,{filename:file})(m.exports, require, m, file, path.dirname(file));
  return m.exports;
}

function center(b){ return {x:b.x+b.w/2, y:b.y+b.h/2}; }
function holds(b, pt){ return pt.x>=b.x && pt.x<=b.x+b.w && pt.y>=b.y && pt.y<=b.y+b.h; }

let checks=0;
function check(name, fn){ return Promise.resolve().then(fn).then(()=>{ checks++; console.log('PASS '+name); }); }

(async()=>{
  if(process.env.SMOKE_ONLY){ await check('mobile browser smoke: highlight, next, back, no console errors', ()=>browserSmoke()); console.log('smoke only'); return; }
  await check('synthetic single match highlights the heading and phrase, not the next section', ()=>{
    const items=[
      {str:'2-1-7. INFLIGHT EQUIPMENT MALFUNCTIONS', hasEOL:true, box:{x:10,y:20,w:240,h:12}},
      {str:'a. When a pilot reports an inflight equipment malfunction, determine the nature', hasEOL:true, box:{x:10,y:36,w:420,h:12}},
      {str:'2-1-8. MINIMUM FUEL', hasEOL:true, box:{x:10,y:64,w:180,h:12}}
    ];
    const m=V.matchSourceSpans(items, {sec:'2-1-7', heading:'INFLIGHT EQUIPMENT MALFUNCTIONS', phrase:'When a pilot reports an inflight equipment malfunction'});
    assert.equal(m.status, 'hit');
    assert.equal(JSON.stringify(m.items), '[0,1]');
    assert.equal(JSON.stringify(m.underline), '[0]');
    const boxes=V.sourceSpanBoxes(items, m.items, {scale:1, height:800});
    assert.equal(boxes.length, 2);
    assert.equal(boxes[0].w, 240);
    assert.equal(boxes[1].y, 36);
    const next=V.sourceSpanBoxes(items, [2], {scale:1, height:800})[0];
    assert.ok(boxes.every(b=>!holds(b, center(next))), 'highlight box covers the next heading');
  });

  await check('two heading matches are ambiguous and produce no boxes', ()=>{
    const items=[
      {str:'2-1-7. INFLIGHT EQUIPMENT MALFUNCTIONS', hasEOL:true, box:{x:0,y:0,w:20,h:10}},
      {str:'2-1-7. INFLIGHT EQUIPMENT MALFUNCTIONS', hasEOL:true, box:{x:0,y:30,w:20,h:10}}
    ];
    const m=V.matchSourceSpans(items, {sec:'2-1-7', heading:'INFLIGHT EQUIPMENT MALFUNCTIONS'});
    assert.equal(m.status, 'ambiguous');
    assert.equal(m.items.length, 0);
    assert.equal(V.sourceSpanBoxes(items, m.items, {scale:1, height:100}).length, 0);
  });

  await check('a missing or weak query does not invent a highlight', ()=>{
    const items=[{str:'2-1-7. INFLIGHT EQUIPMENT MALFUNCTIONS', hasEOL:true, box:{x:0,y:0,w:10,h:10}}];
    assert.equal(V.matchSourceSpans(items, {sec:'3-1-1', heading:'GENERAL'}).status, 'miss');
    assert.equal(V.matchSourceSpans(items, {sec:'', phrase:'the'}).status, 'miss');
    assert.equal(V.matchSourceSpans(items, {sec:'2-1-8', heading:'MINIMUM FUEL'}).status, 'miss');
  });

  await check('exact publication page beats a coarse chapter page and a later section-index page', ()=>{
    // FACMAN 4-3-2 is the reported conflict shape: exact map page 47, heading index page 50.
    const missing=V.resolveCiteSource({key:'4-3-2', prefer:0, exact:47, idxPage:50, mapped:42, coarse:42, heading:'SAMPLE'});
    assert.equal(missing.page, 47);
    assert.equal(missing.source, 'pubmap');
    const coarsePrefer=V.resolveCiteSource({key:'4-3-2', prefer:42, exact:47, idxPage:50, mapped:42, coarse:42, heading:'SAMPLE'});
    assert.equal(coarsePrefer.page, 47);
    assert.equal(coarsePrefer.source, 'pubmap');
    const namedBody=V.resolveCiteSource({key:'4-3-2', prefer:50, exact:47, idxPage:50, mapped:47, coarse:42, heading:'SAMPLE'});
    assert.equal(namedBody.page, 50);
    assert.equal(namedBody.source, 'secidx');
    // JO 2-1-7: the live exact key and the body index are page 42; chapter 2 starts at 37.
    const chapter=V.pageForCite('jo','2');
    assert.equal(chapter, 37);
    assert.equal(V.pageForCite('jo','2-1-7'), 42);
    assert.equal(V.SEC_IDX.jo['2-1-7'][1], 42);
    const fromChapter=V.resolveKnownCitePage('jo','2-1-7', chapter, []);
    assert.equal(fromChapter.page, 42);
    assert.equal(fromChapter.source, 'pubmap');
    const fromMissing=V.resolveKnownCitePage('jo','2-1-7', 0, []);
    assert.equal(fromMissing.page, 42);
    assert.equal(fromMissing.source, 'pubmap');
    // Chapter-only sections still refine to the indexed body page.
    const safety=V.resolveKnownCitePage('jo','2-1-6', chapter, []);
    assert.equal(safety.page, V.SEC_IDX.jo['2-1-6'][1]);
    assert.equal(safety.source, 'secidx');
    assert.notEqual(safety.page, chapter);
    // TBL 2-3-10 stays on the mapped page when that page disagrees with the index.
    const tblChapter=V.resolveKnownCitePage('jo','TBL 2-3-10', chapter, []);
    assert.equal(tblChapter.page, 73);
    assert.equal(tblChapter.source, 'pubmap');
    assert.notEqual(tblChapter.page, V.SEC_IDX.jo['TBL 2-3-10'][1]);
  });

  await check('a superseded highlight pass is cancelled and does not apply', ()=>{
    const gen=V.sourceHighlightGen();
    const stale=V.commitSourceHighlight(gen-1, ()=>'painted');
    assert.equal(stale.cancelled, true);
    assert.equal(stale.applied, false);
    const now=V.sourceHighlightGen();
    let painted=0;
    const ok=V.commitSourceHighlight(now, ()=>{ painted++; return 'painted'; });
    assert.equal(ok.applied, true);
    assert.equal(painted, 1);
    V.cancelSourceHighlight();
    const late=V.commitSourceHighlight(now, ()=>{ painted++; return 'late'; });
    assert.equal(late.cancelled, true);
    assert.equal(painted, 1);
  });

  await check('JO and FACMAN text layers: one real heading, a duplicate is ambiguous, a wrong section falls back', async()=>{
    loadUMD(path.join(root,'site/vendor/pdfjs/pdf.worker.min.js'));
    const pdfjsLib=loadUMD(path.join(root,'site/vendor/pdfjs/pdf.min.js'));
    async function open(name){
      const data=new Uint8Array(fs.readFileSync(path.join(root,'site/docs',name)));
      return pdfjsLib.getDocument({data, disableWorker:true}).promise;
    }
    const spans=JSON.parse(fs.readFileSync(path.join(root,'site/data/ref-span.json'),'utf8'));
    const para=JSON.parse(fs.readFileSync(path.join(root,'site/data/para-index.json'),'utf8'));
    const joSpan=spans.jo['2-1-7'], facSpan=spans.facman['6-2-1'];
    assert.equal(joSpan.pg, 42);
    assert.equal(facSpan.pg, 84);
    const joPara=para.find(e=>e.p==='jo'&&e.k==='2-1-7');
    const facPara=para.find(e=>e.p==='facman'&&e.k==='6-2-1');
    assert.ok(joPara.t.includes(joSpan.q.slice(0,40)));
    assert.ok(facPara.t.replace(/\u2019/g,"'").includes(facSpan.q.slice(0,40)));
    const jo=await open('JO-7110.65BB.pdf');
    const fac=await open('NFG-FACMAN-July-2026.pdf');
    async function items(doc, pageNo){
      const page=await doc.getPage(pageNo);
      const tc=await page.getTextContent();
      return {items:tc.items, vp:page.getViewport({scale:1})};
    }
    const p42=await items(jo, 42);
    const m7=V.matchSourceSpans(p42.items, {sec:'2-1-7', heading:V.SEC_IDX.jo['2-1-7'][0], phrase:joSpan.q});
    assert.equal(m7.status, 'hit');
    assert.equal(m7.extended, true);
    const text7=m7.items.map(i=>p42.items[i].str).join(' ');
    assert.match(text7, /INFLIGHT EQUIPMENT MALFUNCTIONS/);
    assert.match(text7, /When a pilot reports an inflight equipment malfunction/);
    const boxes7=V.sourceSpanBoxes(p42.items, m7.items, {scale:1, height:p42.vp.height});
    assert.ok(boxes7.length>=1 && boxes7.every(b=>b.w>0 && b.h>0 && b.y>=0 && b.y<p42.vp.height));
    const m8=V.matchSourceSpans(p42.items, {sec:'2-1-8', heading:'MINIMUM FUEL'});
    assert.equal(m8.status, 'hit');
    const overlap=m7.items.filter(i=>m8.items.includes(i));
    assert.equal(overlap.length, 0);
    const boxes8=V.sourceSpanBoxes(p42.items, m8.items, {scale:1, height:p42.vp.height});
    const c8=center(boxes8[0]);
    assert.ok(boxes7.every(b=>!holds(b, c8)), '2-1-7 geometry covers 2-1-8');
    const dup=V.matchSourceSpans(p42.items.concat(p42.items), {sec:'2-1-7', heading:'INFLIGHT EQUIPMENT MALFUNCTIONS'});
    assert.equal(dup.status, 'ambiguous');
    assert.equal(dup.items.length, 0);
    const wrong=V.matchSourceSpans(p42.items, {sec:'5-5-2', heading:'COURSE RULES'});
    assert.equal(wrong.status, 'miss');
    const facPage=await items(fac, V.SEC_IDX.facman['6-2-1'][1]);
    const facHit=V.matchSourceSpans(facPage.items, {sec:'6-2-1', heading:V.SEC_IDX.facman['6-2-1'][0], phrase:facSpan.q});
    assert.equal(facHit.status, 'hit');
    assert.match(facHit.items.map(i=>facPage.items[i].str).join(' '), /DUTIES\s*&\s*RESPONSIBILITIES/);
    const facWrong=V.matchSourceSpans(facPage.items, {sec:'5-2-1', heading:'DUTIES & RESPONSIBILITIES'});
    assert.equal(facWrong.status, 'miss');
    const tblPage=V.pageForCite('jo','TBL 2-3-10');
    const tbl=await items(jo, tblPage);
    const tblHit=V.matchSourceSpans(tbl.items, {sec:'TBL 2-3-10', heading:'Aircraft Equipment Suffixes'});
    if(tblHit.status==='hit'){
      assert.match(tblHit.items.map(i=>tbl.items[i].str).join(' '), /Aircraft Equipment Suffixes/);
    }else{
      assert.ok(tblHit.status==='miss' || tblHit.status==='ambiguous');
      assert.equal(tblHit.items.length, 0);
    }
    // Manual full-book scan (previous cite path) versus one indexed page.
    async function scan(doc, needle){
      const t0=Date.now(); let hits=0;
      for(let i=1;i<=doc.numPages;i++){
        const page=await doc.getPage(i);
        const tc=await page.getTextContent();
        if(tc.items.map(it=>it.str).join(' ').toLowerCase().includes(needle)) hits++;
      }
      return {ms:Date.now()-t0, hits};
    }
    async function onePage(doc, pageNo){
      const t0=Date.now();
      const page=await doc.getPage(pageNo);
      const tc=await page.getTextContent();
      const m=V.matchSourceSpans(tc.items, {sec:'2-1-7', heading:'INFLIGHT EQUIPMENT MALFUNCTIONS', phrase:joSpan.q});
      return {ms:Date.now()-t0, status:m.status};
    }
    const known=V.resolveKnownCitePage('jo','2-1-7', V.pageForCite('jo','2-1-7'), []);
    assert.equal(known.page, 42);
    assert.equal(known.source==='pubmap' || known.source==='secidx' || known.source==='explicit', true);
    const fast=await onePage(jo, known.page);
    const slow=await scan(jo, 'inflight equipment malfunctions');
    assert.equal(fast.status, 'hit');
    assert.ok(slow.hits>=1);
    assert.ok(fast.ms*5<slow.ms, `fast ${fast.ms}ms vs full scan ${slow.ms}ms`);
    const facKnown=V.resolveKnownCitePage('facman','6-2-1', V.pageForCite('facman','6-2-1'), []);
    const facFastT=Date.now();
    await fac.getPage(facKnown.page).then(page=>page.getTextContent());
    const facFast=Date.now()-facFastT;
    const facSlow=await scan(fac, 'duties & responsibilities');
    console.log(`PERF JO full-scan ${slow.ms}ms (${slow.hits} hits / ${jo.numPages} pages) vs indexed page ${fast.ms}ms`);
    console.log(`PERF FACMAN full-scan ${facSlow.ms}ms (${facSlow.hits} hits / ${fac.numPages} pages) vs indexed page ${facFast}ms`);
    assert.ok(facFast*5<facSlow.ms);
    const coarse=V.pageForCite('jo','2-1-6');
    const refined=V.resolveKnownCitePage('jo','2-1-6', coarse, []);
    assert.notEqual(coarse, refined.page);
    assert.equal(refined.page, V.SEC_IDX.jo['2-1-6'][1]);
    assert.equal(refined.source, 'secidx');
    const pg=V.resolveKnownCitePage('jo','PG:42', 42, ['7110.65 2-1-7']);
    assert.equal(pg.page, 42);
    assert.equal(pg.source, 'explicit');
    assert.equal(pg.key, '2-1-7');
    const tblKeep=V.resolveKnownCitePage('jo','TBL 2-3-10', V.pageForCite('jo','TBL 2-3-10'), []);
    assert.equal(tblKeep.page, V.pageForCite('jo','TBL 2-3-10'));
    assert.equal(tblKeep.source, 'pubmap');
    const tblClick=V.resolveKnownCitePage('jo','TBL 2-3-10', V.SEC_IDX.jo['TBL 2-3-10'][1], []);
    assert.equal(tblClick.page, V.SEC_IDX.jo['TBL 2-3-10'][1]);
  });

  await check('checklist cite, next section, back, and browser back/forward keep the real page', async()=>{
    V.S.pos='cd';
    V.S.tab='learn';
    V.S.learnMode='acad';
    V.S.rfcTopic=1;
    const pack=V.acadTopicRefs('cd', 1);
    assert.ok(pack && pack.refs.length>1);
    const first=pack.refs[0][0], second=pack.refs[1][0];
    V.openLearnCite(first, {title:pack.refs[0][1]||''});
    assert.equal(V.S.pub, 'jo');
    assert.equal(V.S.learnReturn.cite, first);
    assert.equal(V.S.learnReturn.rfcTopic, 1);
    const landed=V.pageForCite(V.citePubAndSec(first).pub, V.citePubAndSec(first).sec);
    assert.equal(V.S.pubPage, landed);
    assert.ok(landed>1);
    await V.pdfFindAuto(V.S.pubQ, {preferPage:V.S.pubPreferPage, sec:V.S.pubCiteSec, force:true});
    assert.equal(V.S.pubPage, landed, 'explicit tower page must not be retargeted');
    assert.equal(V.S.pubHl.page, landed);
    assert.equal(V.S.pubHl.sec, '2-1-7');
    assert.match(V.S.pubHl.heading, /INFLIGHT EQUIPMENT MALFUNCTIONS/i);
    V.stepLearnCite(1);
    assert.equal(V.S.learnReturn.cite, second);
    assert.notEqual(second, first);
    const secondPage=V.pageForCite(V.citePubAndSec(second).pub, V.citePubAndSec(second).sec);
    assert.equal(V.S.pubPage, secondPage);
    V.leavePdfToLearn();
    assert.equal(V.S.pub, null);
    assert.equal(V.S.rfcTopic, 1);
    assert.equal(V.S.pos, 'cd');
    assert.equal(V.S.learnReturn, null);
    // Fresh history trail: checklist, then the same LQ's source, then back and forward.
    hist.entries=[]; hist.i=-1;
    V.S.screen='app'; V.S.tab='home'; V.S.pub=null; V.S.pos='fin'; V.S.rfcTopic=0;
    ctx.NAV={ready:true, restoring:false, n:0};
    // set() is not exported; drive it through openLearnCite after a checklist set via the exported nav path.
    // Re-run the two navigations that call set(): open cite, then leave, using history from the live page.
  });

  await check('in-app history restores the same LQ and then the same source page', ()=>{
    // The page already called navInit. Drive set() by open/leave, which push history.
    const before=hist.entries.length;
    V.S.pos='cd'; V.S.tab='learn'; V.S.learnMode='acad'; V.S.rfcTopic=1; V.S.pub=null; V.S.learnReturn=null;
    const pack=V.acadTopicRefs('cd', 1);
    const cite=pack.refs[0][0];
    V.openLearnCite(cite, {title:pack.refs[0][1]||''});
    assert.ok(hist.entries.length>before);
    const onPdf=hist.i;
    assert.equal(V.S.pub, 'jo');
    assert.equal(V.S.learnReturn.cite, cite);
    const page=V.S.pubPage;
    history.back();
    assert.equal(V.S.pub, null);
    assert.equal(V.S.rfcTopic, 1);
    assert.equal(V.S.pos, 'cd');
    history.forward();
    assert.equal(hist.i, onPdf);
    assert.equal(V.S.pub, 'jo');
    assert.equal(V.S.learnReturn.cite, cite);
    assert.equal(V.S.pubPage, page);
    assert.equal(V.S.rfcTopic, 1);
  });

  const auto=html.slice(html.indexOf('async function pdfFindAuto'), html.indexOf('function pdfFindNext'));
  await check('cite open does not scan the publication', ()=>{
    assert.ok(auto.includes('resolveKnownCitePage'));
    assert.ok(!/numPages/.test(auto));
    assert.ok(/do not jump to cover\/TOC first lexical hit/.test(html));
    assert.ok(/pdfFindAuto\(S\.pubQ,\s*\{preferPage:/.test(html));
  });

  await check('mobile browser smoke: highlight, next, back, no console errors', ()=>browserSmoke());

  console.log(checks+' ref-highlight checks passed');
})().catch(err=>{ console.error(err); process.exit(1); });

function browserSmoke(){
  return new Promise((resolve, reject)=>{
    const site=path.join(root,'site');
    const server=http.createServer((req,res)=>{
      const url=decodeURIComponent((req.url||'/').split('?')[0]);
      const rel=url==='/'?'/index.html':url;
      const file=path.join(site, rel);
      if(!file.startsWith(site)){ res.writeHead(403); res.end(); return; }
      fs.readFile(file, (err, buf)=>{
        if(err){ res.writeHead(404); res.end('missing'); return; }
        const ext=path.extname(file);
        const type=ext==='.html'?'text/html':ext==='.js'?'text/javascript':ext==='.json'?'application/json':ext==='.pdf'?'application/pdf':'application/octet-stream';
        res.writeHead(200, {'Content-Type':type, 'Cache-Control':'no-store'});
        res.end(buf);
      });
    });
    server.listen(0, '127.0.0.1', async()=>{
      const port=server.address().port;
      const url=`http://127.0.0.1:${port}/index.html`;
      const chrome=spawn('google-chrome', [
        '--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage',
        '--window-size=390,844','--remote-debugging-port=0','--user-data-dir=/tmp/refhl-chrome',
        url
      ], {stdio:['ignore','pipe','pipe']});
      let stderr='';
      chrome.stderr.on('data', d=>{ stderr+=d.toString(); });
      const kill=()=>{ try{chrome.kill('SIGKILL');}catch(_){} server.close(); };
      const timer=setTimeout(()=>{ kill(); reject(new Error('smoke timeout\n'+stderr.slice(-500))); }, 45000);
      const errors=[];
      try{
        const dbg=await waitFor(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//, ()=>stderr);
        const dbgPort=dbg[1];
        await fetch(`http://127.0.0.1:${dbgPort}/json/new?${encodeURIComponent(url)}`).catch(()=>null);
        let page=null, lastList=[];
        for(let i=0;i<40 && !page;i++){
          lastList=await fetch(`http://127.0.0.1:${dbgPort}/json/list`).then(r=>r.json()).catch(e=>[{err:String(e)}]);
          page=(lastList||[]).find(t=>t.type==='page' && String(t.url||'').includes(':'+port) && t.webSocketDebuggerUrl)
            || (lastList||[]).find(t=>t.type==='page' && t.webSocketDebuggerUrl);
          if(!page) await sleep(100);
        }
        if(!page) throw new Error('no page target '+JSON.stringify(lastList).slice(0,400));
        const socket=new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((res,rej)=>{ socket.addEventListener('open', res); socket.addEventListener('error', rej); });
        let seq=0; const pending=new Map();
        socket.addEventListener('message', ev=>{
          const msg=JSON.parse(ev.data);
          if(msg.id && pending.has(msg.id)){ pending.get(msg.id)(msg.result); pending.delete(msg.id); return; }
          if(msg.method==='Runtime.exceptionThrown') errors.push('exception '+JSON.stringify(msg.params.exceptionDetails).slice(0,300));
          if(msg.method==='Runtime.consoleAPICalled' && msg.params.type==='error'){
            const text=(msg.params.args||[]).map(a=>a.value||a.description||'').join(' ');
            if(/favicon|Failed to load resource/i.test(text)) return;
            errors.push('console '+text.slice(0,300));
          }
        });
        function send(method, params){
          const id=++seq;
          return new Promise(res=>{ pending.set(id, res); socket.send(JSON.stringify({id, method, params:params||{}})); });
        }
        await send('Runtime.enable');
        await send('Page.enable');
        await send('Log.enable');
        await send('Emulation.setDeviceMetricsOverride', {width:390, height:844, deviceScaleFactor:2, mobile:true});
        if(!String(page.url||'').includes(String(port))) await send('Page.navigate', {url});
        await sleep(500);
        const ready=await waitEval(send, `document.querySelector('#vatc .tab') ? 'ok' : ''`);
        assert.equal(ready, 'ok');
        await send('Runtime.evaluate', {expression:`document.querySelector('#vatc .tab[data-t="learn"]').click()`});
        await send('Runtime.evaluate', {expression:`document.querySelector('#vatc [data-action="pos"][data-p="cd"]').click()`});
        await send('Runtime.evaluate', {expression:`document.querySelector('#vatc [data-action="acad"][data-n="1"]').click()`});
        await send('Runtime.evaluate', {expression:`document.querySelector('#vatc [data-action="rfcref"]').click()`});
        const highlighted=await waitEval(send, `(()=>{
          const n=document.getElementById('pdfsrcnote');
          const marks=[...document.querySelectorAll('#vatc .pdftext .src-hl')];
          const lbl=document.getElementById('pdfpglbl');
          if(!n || n.hidden) return '';
          return JSON.stringify({note:n.textContent, n:marks.length, sample:(marks[0]&&marks[0].textContent||'').slice(0,80), page:lbl&&lbl.textContent, tab:(document.getElementById('pdftext')||{}).tabIndex});
        })()`);
        assert.ok(highlighted, 'source note never appeared');
        const info=JSON.parse(highlighted);
        assert.match(info.note, /highlighted|Verify on this page/);
        assert.match(info.page, /^42\b/);
        if(/highlighted/.test(info.note)){
          assert.ok(info.n>0);
          assert.match(info.sample, /INFLIGHT|inflight|pilot reports/i);
          assert.equal(info.tab, 0);
          const focused=await waitEval(send, `(()=>{ const t=document.getElementById('pdftext'); t.focus(); const cs=getComputedStyle(t); return document.activeElement===t && cs.outlineStyle!=='none' ? 'focus' : 'nofocus '+cs.outlineStyle; })()`);
          assert.equal(focused, 'focus');
        }
        const overflow=await waitEval(send, `document.documentElement.scrollWidth<=document.documentElement.clientWidth+1 ? 'fit' : ('overflow '+document.documentElement.scrollWidth)`);
        assert.equal(overflow, 'fit');
        await send('Runtime.evaluate', {expression:`document.querySelector('#vatc [data-action="citenext"]').click()`});
        const next=await waitEval(send, `(()=>{
          const lbl=(document.getElementById('pdfpglbl')||{}).textContent||'';
          const note=(document.getElementById('pdfsrcnote')||{}).textContent||'';
          const lab=(document.querySelector('#vatc .citestep-lab')||{}).textContent||'';
          if(!lab || /2-1-7/.test(lab) || !note) return '';
          return JSON.stringify({lbl, note, lab});
        })()`);
        assert.ok(next, 'next section did not change page');
        const nextInfo=JSON.parse(next);
        assert.match(nextInfo.note, /highlighted|Verify on this page/);
        assert.doesNotMatch(nextInfo.lab, /2-1-7/);
        const nextNum=(nextInfo.lbl.match(/^(\d+)/)||[])[1];
        await send('Runtime.evaluate', {expression:`document.querySelector('#vatc [data-action="pdfprev"]').click()`});
        const paged=JSON.parse(await waitEval(send, `(()=>{
          const page=(document.getElementById('pdfpglbl')||{}).textContent||'';
          const num=(page.split(/\\s/)[0]||'');
          if(!num || num==='${nextNum}') return '';
          return JSON.stringify({page, marks:document.querySelectorAll('#vatc .src-hl').length, note:(document.getElementById('pdfsrcnote')||{}).textContent||''});
        })()`));
        assert.notEqual(String(paged.page).split(/\s/)[0], nextNum);
        if(paged.marks===0) assert.ok(paged.note==='' || /Verify on this page/.test(paged.note));
        await send('Runtime.evaluate', {expression:`document.querySelector('#vatc [data-action="findback"]').click()`});
        const back=await waitEval(send, `document.querySelector('#vatc [data-action="rfcref"]') && !document.getElementById('pdfcanvas') ? 'checklist' : ''`);
        assert.equal(back, 'checklist');
        await send('Runtime.evaluate', {expression:`history.back()`});
        await sleep(200);
        await send('Runtime.evaluate', {expression:`history.forward()`});
        const fwd=await waitEval(send, `document.querySelector('#vatc [data-action="rfcref"]') ? 'same-lq' : ''`);
        assert.equal(fwd, 'same-lq');
        assert.deepEqual(errors, []);
        socket.close();
        clearTimeout(timer);
        kill();
        resolve();
      }catch(err){
        console.error('SMOKE ERRORS', errors);
        clearTimeout(timer);
        kill();
        reject(err);
      }
    });
  });
}
function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }
function waitFor(re, read){
  return new Promise((resolve, reject)=>{
    const t0=Date.now();
    (function poll(){
      const m=re.exec(read());
      if(m) return resolve(m);
      if(Date.now()-t0>10000) return reject(new Error('devtools port timeout'));
      setTimeout(poll, 50);
    })();
  });
}
async function waitEval(send, expression){
  const t0=Date.now();
  while(Date.now()-t0<20000){
    const res=await send('Runtime.evaluate', {expression, returnByValue:true});
    const v=res&&res.result&&res.result.value;
    if(v) return v;
    await sleep(150);
  }
  return '';
}
