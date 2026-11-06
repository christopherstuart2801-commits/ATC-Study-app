#!/usr/bin/env node
// Tower-only regression and on-disk publication evidence checks. No network required.
const fs=require('fs'), path=require('path'), vm=require('vm'), assert=require('assert/strict');
const {execFileSync}=require('child_process');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'site/index.html'),'utf8');
assert.equal(html,fs.readFileSync(path.join(root,'index.html'),'utf8'),'root/site mirror');
assert(html.includes('v0.8.36 · tower paper'));
const el=()=>({innerHTML:'',value:'',style:{},classList:{add(){},remove(){},contains(){return false;}},addEventListener(){},focus(){},select(){},closest(){return null;}});
const ctx={console,document:{getElementById:el,querySelector:el,querySelectorAll:()=>[],addEventListener(){}},localStorage:{getItem(){return null;},setItem(){},removeItem(){},length:0},setTimeout(){},clearTimeout(){},requestAnimationFrame(){},navigator:{},location:{},history:{}};
ctx.window=ctx;vm.createContext(ctx);
let code=html.match(/<script>([\s\S]*)<\/script>\s*<\/body>/)[1];
const exported='TOWER_PAPER,TOWER_CITES,TOWER_PAPER_CARDS,SYLLABUS,FC_POS,FC_UC,FC_SETS,S,syllabusFor,rfcLearn,citePubAndSec,pageForCite,fcCiteStr,tstBody,tstStart,tstCards,acadRefKey,acadTopicRefs,learnView';
const end=/document\.getElementById\('vatc'\)\.addEventListener\('click'[\s\S]*render\(\);\s*\}\)\(\);/;
assert(end.test(code),'runtime instrumentation point');
code=code.replace(end,`globalThis.V={${exported}};})();`);vm.runInContext(code,ctx);
const V=ctx.V;
const norm=s=>String(s).replace(/[−–—]/g,'-').replace(/\s+/g,' ').trim();
const pages={};for(const [key,file] of [['jo','JO-7110.65BB.pdf'],['facman','NFG-FACMAN-July-2026.pdf']]){
  pages[key]=execFileSync('pdftotext',['-layout',path.join(root,'site/docs',file),'-'],{maxBuffer:15e6,encoding:'utf8'}).split('\f');
}
let checks=0;const check=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
check('CD alone gets the Clearance Delivery / Flight Data tower packet; radar packets untouched',()=>{
 assert.equal(V.syllabusFor('cd').list,V.TOWER_PAPER);V.S.pos='cd';V.S.rfcTopic=0;const view=V.rfcLearn();
 assert.match(view,/Clearance Delivery \/ Flight Data/);assert.doesNotMatch(view,/No ACAD packet|Shared Tower|CD \/ GND \/ LCL|SAMPLE/);
 assert.equal(V.FC_UC.cd['uc-test'].filter(c=>c.id.startsWith('tower-paper-')).length,22);
 for(const pos of ['fin','rfd','arr']) assert(!V.syllabusFor(pos).list.some(t=>t.towerPaper));
});
check('GND and LCL keep the exact pre-change empty Learn/test state',()=>{
 for(const pos of ['gnd','lcl']){
  assert.equal(V.syllabusFor(pos).list.length,0,pos+' syllabus');
  assert(!V.syllabusFor(pos).list.some(t=>t.towerPaper));
  V.S.pos=pos;V.S.rfcTopic=0;V.S.learnMode='acad';V.S.pub=null;const view=V.learnView();
  assert.match(view,/No ACAD packet for this position yet\./);assert.doesNotMatch(view,/Tower packet|Shared Tower|tower-paper/);
  V.S.tst=null;assert.equal(V.tstBody(),'<div class="explain">No ACAD packet for this position yet.</div>');
  const deck=(V.FC_UC[pos]||{})['uc-test']||[];assert.equal(deck.length,0,pos+' FC_UC uc-test');
  assert(!(V.FC_POS[pos]||[]).some(c=>String(c.id).startsWith('tower-paper-')),pos+' FC_POS');
 }
});
check('paper ACAD-0520/0521/0522/0523 refs are present with no radar-only Topic 1 extras',()=>{
 const all=V.TOWER_PAPER.flatMap(t=>t.ids);for(const code of ['ACAD-0520','ACAD-0521','ACAD-0522','ACAD-0523'])assert(all.includes(code));
 const expected=['2-1-7','2-1-10','2-1-18','2-1-23','2-1-26','2-3-5','2-4-1','2-4-2','2-4-3','2-4-5','2-4-6','2-4-8','2-4-9','2-4-10','2-4-11','2-4-12','2-4-13','2-4-14','2-4-15','2-4-16','2-4-17','2-4-18','2-4-19','2-4-20','2-4-21','2-6-2','2-9-1'];
 assert.deepEqual(Array.from(V.TOWER_PAPER[0].refs.filter(r=>r[0].startsWith('7110.65 ')),r=>r[0].slice(8)),expected);
 assert(!V.TOWER_PAPER[0].refs.some(r=>/NITEX|2-4-4$|2-4-7$/.test(r.join(' '))));
 const t2=V.TOWER_PAPER[1];for(const cite of ['FACMAN 5-1-11','FACMAN TBL 5-6','FACMAN TBL 5-7','FACMAN 6-2-8','FACMAN TBL 6-3','FACMAN TBL C-2','FACMAN TBL C-3','7110.65 TBL 2-3-10','7110.65 FIG 2-3-7'])assert(t2.refs.some(r=>r[0]===cite),cite);
});
check('all available refs land on a verified body page; no page-one fallback',()=>{
 V.S.pos='cd';
 for(const [cite,m] of Object.entries(V.TOWER_CITES)){
  const info=V.citePubAndSec(cite);
  if(m.blocked){assert.equal(info.pub,null,cite);continue;}
  assert.equal(info.pub,m.pub,cite);assert.equal(V.pageForCite(info.pub,info.sec),m.page,cite);assert(!info.book?.missing,cite);
  if(pages[m.pub]){assert(m.page>17,cite);const text=norm(pages[m.pub][m.page-1]);assert(text.includes(norm(m.section))||m.section==='Appendix D'&&text.includes('Tower IFR Flight Strips'),`${cite}: page ${m.page}`);}
  else assert.match(m.pub,/^knfg-(quntn2|corri4|munn4|bldg3)$/);
 }
});
check('22 LQs have full src, real source highlights and matching uniquely defined flashcards',()=>{
 const qs=V.TOWER_PAPER.flatMap(t=>t.test),cards=V.TOWER_PAPER_CARDS;
 assert.equal(qs.length,22);assert.equal(cards.length,22);assert.equal(new Set(cards.map(c=>c.id)).size,22);
 for(const q of qs){
  for(const k of ['doc','pg','pa','hl'])assert(q.src[k]?.trim(),`${q.id}: src.${k}`);
  const pub=q.src.doc.includes('FACMAN')?'facman':'jo',info=V.citePubAndSec(V.fcCiteStr(q.src));
  const page=V.pageForCite(info.pub,info.sec);assert.equal(info.pub,pub);
  assert(norm(pages[pub].slice(page-1,page+1).join(' ')).includes(norm(q.src.hl)),`${q.id}: excerpt on cited page`);
  const c=cards.find(c=>c.id===q.id);assert.equal(c.src,q.src);assert.equal(c.a,q.a);assert(['cd','gnd','lcl','any'].includes(c.pos));
  for(const old of Object.values(V.FC_SETS).flat())assert.notEqual(old.id,c.id,'new ID collides with old source card');
 }
 assert.deepEqual(Array.from(V.TOWER_PAPER,t=>t.test.length),[6,10,6,0]);
});
check('SOCAL LOA / CNAF / NAVAIR / SAN TEC refs visibly blocked, not clickable or PDF-step targets',()=>{
 V.S.pos='cd';V.S.rfcChk={};
 const families=new Set();
 for(const T of V.TOWER_PAPER){
  V.S.rfcTopic=T.n;const view=V.rfcLearn();
  for(const r of T.refs.filter(r=>r[2]==='blocked')){
   const meta=V.TOWER_CITES[r[0]];assert(meta.blocked);assert(!meta.pub);assert.equal(V.citePubAndSec(r[0]).pub,null);
   families.add(r[0].split(' ')[0]);
   assert(view.includes(`disabled>BLOCKED / PUB NEEDED · ${r[0]}`));
   const row=view.split('<div class="rfc-item tower-blocked"').find(x=>x.includes(r[0])&&x.includes('role="status"'));
   assert(row);assert(!row.split('</div>')[0].includes('data-action='));
  }
  const nav=V.acadTopicRefs('cd',T.n);assert(!nav||nav.refs.every(r=>r[2]!=='blocked'));
 }
 for(const f of ['SOCAL','CNAF','NAVAIR','FAA'])assert(families.has(f));
 V.S.rfcTopic=4;const weather=V.rfcLearn();assert.match(weather,/No sourced LQs yet/);assert.doesNotMatch(weather,/data-action="rfctest"|Strip learning/);
});
check('Tower LQs always use written input; new Practice cards stay accessible',()=>{
 for(const pos of ['cd']){V.S.pos=pos;for(const T of V.TOWER_PAPER.filter(t=>t.test.length)){
  V.S.tst=V.tstStart(pos,T.n,'lqs');const out=V.tstBody();assert.match(out,/<textarea/);assert.doesNotMatch(out,/data-action="tstmc"/);
  const added=V.tstCards(pos,T).filter(c=>c.id.startsWith('tower-paper-'));assert.equal(added.length,T.test.length);
 }}
});
check('Tower checkoffs cannot complete radar refs; new answers contain no inferred LOA/minima/visibility facts',()=>{
 const T=V.TOWER_PAPER[0];assert.equal(V.acadRefKey(T,'7110.65 2-4-1'),'tower-paper:1:7110.65 2-4-1');
 assert.equal(V.acadRefKey({n:1},'7110.65 2-4-1'),'1:7110.65 2-4-1');
 const answers=V.TOWER_PAPER.flatMap(t=>t.test).map(q=>q.a).join(' ');
 assert.doesNotMatch(answers,/North Island|Miramar|Imperial Beach|SOCAL|visibility|takeoff minimum|squawk \d/i);
 assert.equal(V.TOWER_PAPER[3].test.length,0);
});
console.log(`${checks} tower checks passed; 22 verified LQs / 22 matching cards.`);
