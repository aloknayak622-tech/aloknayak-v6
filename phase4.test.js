const assert=require('assert'),{Readable}=require('stream'),{makeBank}=require('../lib/bank'),{makeApp}=require('../lib/core'),{memory}=require('../lib/store'),engine=require('../lib/engine');
const KEY='priya-secret-key-1234567890',H={authorization:'Bearer '+KEY},ip='7.7.7.7';
const env={TOKEN_SECRET:'t'.repeat(40),RAZORPAY_KEY_ID:'k',RAZORPAY_KEY_SECRET:'s',RAZORPAY_WEBHOOK_SECRET:'w',REVIEWERS:'Priya:'+KEY+',Weak:short'};
const good={marks:1,q:'Which gas is released when zinc reacts with dilute sulphuric acid?',opts:['Oxygen','Hydrogen','Carbon dioxide','Nitrogen'],ans:'b',key:'Zinc displaces hydrogen from the acid.'};
const wrong={...good,q:'Which gas turns lime water milky?',ans:'b'};                         // key says b, the fake solver will say c
const bad={...good,q:'A malformed question with only three options',opts:['a','b','c']};
const truth={[good.q]:'b',[wrong.q]:'c'};let calls=0,out;
const llm={async complete(p){calls++;if(/Solve this exam question/.test(p))return JSON.stringify({final:truth[p.split('Question: ')[1].split('\n')[0]]||'a'});if(out==='garbage')return'not json at all';return JSON.stringify({items:out})}};
const mk=(e={})=>{const store=memory(),bank=makeBank({store,llm,env:{...env,...e},engine});return{store,bank,app:makeApp({store,rzp:{},env,engine,bank})}};
const gen=(a,b={})=>a.adminGenerate({headers:H,ip,body:{subject:'class10-chemistry',grade:10,chapter:'Acids, Bases and Salts',marks:1,count:4,...b}});
(async()=>{
  let{store,bank,app}=mk();
  for(const h of[{},{authorization:'Bearer wrong'},{authorization:'Bearer short'}])assert.equal((await app.adminList({headers:h,ip,query:{}})).status,401);
  assert.equal((await gen(app,{subject:'maths'})).status,400);assert.equal((await gen(app,{marks:9})).status,400);
  out=[good,wrong,bad,good];let r=await gen(app);assert.equal(r.status,200);assert.deepEqual(r.body,{added:2,flagged:1,rejected:1,duplicate:1});
  assert.equal((await store.smembers('bank:ok:class10-chemistry')).length,0,'generation must never publish');
  const pend=(await app.adminList({headers:H,ip,query:{}})).body.items;assert.equal(pend.length,2);assert.equal(pend[0].auto.solve,'disagree','flagged first');
  assert.equal(await bank.build('class10-chemistry',1),null);assert.equal((await app.paper({query:{subject:'class10-chemistry',seed:'1'},headers:{},ip})).status,404,'pending items must not reach buyers');
  const rv=(id,b)=>app.adminReview({headers:H,ip,body:{id,...b}}),f=pend[0],g=pend[1];
  assert.equal((await rv(f.id,{action:'approve'})).status,409);assert.equal((await rv(f.id,{action:'approve',confirmFlagged:true,edits:{opts:['x','y']}})).status,400);
  assert.equal((await rv(g.id,{action:'approve'})).status,200);assert.equal((await rv(g.id,{action:'approve'})).body.already,true);
  assert.equal((await rv(f.id,{action:'reject'})).status,200);assert.equal((await app.adminList({headers:H,ip,query:{}})).body.items.length,0);
  const done=await store.get('item:'+g.id);assert.equal(done.status,'approved');assert.equal(done.prov.reviewer,'Priya');
  assert.equal((await rv('q_zzzzzzzzzzzz',{action:'approve'})).status,404);
  // cost cap and unusable AI output
  ({app}=mk({AI_DAILY_CALLS:'2'}));calls=0;out=[good,wrong];r=await gen(app);assert.equal(r.status,429);assert(calls<=2,'cap must stop AI calls');
  ({app,store}=mk());out='garbage';r=await gen(app);assert.equal(r.status,502);assert.equal((await app.adminList({headers:H,ip,query:{}})).body.items.length,0);
  // a full approved bank becomes a normal 40-mark paper with the usual gating
  ({app,store,bank}=mk());let n=0;const put=async(marks,kind)=>{const id='q_'+String(++n).padStart(12,'a');
    await store.set('item:'+id,{id,subject:'class10-chemistry',grade:10,chapter:'x',marks,kind:kind||(marks===1?'mcq':'written'),q:'Question number '+n+' text',...(marks===1&&{opts:['p','q','r','s'],ans:'c'}),key:'worked answer '+n,final:'f',status:'approved',auto:{solve:'agree'},prov:{}});
    await store.sadd('bank:ok:class10-chemistry',id);await store.sadd('bank:subjects','class10-chemistry')};
  for(const[m,c]of Object.entries({1:8,2:4,3:4,4:3}))for(let i=0;i<c;i++)await put(+m,m==='4'&&i===0?'case':undefined);
  const p=await app.paper({query:{subject:'class10-chemistry',seed:'3'},headers:{},ip});assert.equal(p.status,200);assert.equal(p.body.total,40);
  const items=p.body.sections.flatMap(s=>s.items);assert.equal(items.filter(i=>i.key!==undefined).length,2);assert(!/"ans"|"correct"|"final"/.test(JSON.stringify(p.body)));
  assert((await app.paper({query:{subject:'class10-chemistry',seed:'3'},headers:{},ip})).body.sections.flatMap(s=>s.items).every((x,i)=>x.q===items[i].q),'same seed, same paper');
  assert((await app.subjects()).body.subjects.includes('class10-chemistry'));assert.equal((await app.paper({query:{subject:'nonsense',seed:'1'},headers:{},ip})).status,404);
  // defence in depth: an unapproved item sitting in the live set is still ignored
  {const x=mk();let m=0;for(const[mm,c]of Object.entries({1:8,2:4,3:4,4:3}))for(let i=0;i<c;i++){const id='q_'+String(++m).padStart(12,'b');
    await x.store.set('item:'+id,{id,subject:'s-test',marks:+mm,kind:mm==='1'?'mcq':'written',q:'Q '+m+' text here',...(mm==='1'&&{opts:['p','q','r','s'],ans:'a'}),key:'k',final:'f',status:mm==='1'&&i===0?'pending':'approved'});
    await x.store.sadd('bank:ok:s-test',id)}
   assert.equal(await x.bank.build('s-test',1),null,'unapproved item must not count')}
  // real adapter wiring
  Object.assign(process.env,env);const handler=require('../api/[route].js');
  const call=(route,method,headers={},q={})=>new Promise(res=>handler(Object.assign(Readable.from([]),{method,headers,query:{route,...q},socket:{}}),{setHeader(){},status(c){this.code=c;return this},json(b){res({status:this.code,body:b})}}));
  assert.equal((await call('admin-list','GET')).status,401);assert.equal((await call('admin-list','GET',H,{status:'pending'})).status,200);
  assert.equal((await call('subjects','GET')).body.subjects[0],'maths');
  console.log('PHASE 4: ALL CHECKS PASSED');process.exit(0);
})().catch(e=>{console.error('PHASE 4 FAILED:',e.message);process.exit(1)});
