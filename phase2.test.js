const assert=require('assert'),crypto=require('crypto'),{Readable}=require('stream');
const {makeApp}=require('../lib/core'),{memory}=require('../lib/store'),engine=require('../lib/engine');
const H=(k,m)=>crypto.createHmac('sha256',k).update(m).digest('hex');
const env={TOKEN_SECRET:'t'.repeat(40),RAZORPAY_KEY_ID:'rzp_test_x',RAZORPAY_KEY_SECRET:'ks_test',RAZORPAY_WEBHOOK_SECRET:'wh_test'};
let t=1.7e12,n=0;const calls=[],now=()=>t;
const mk=()=>makeApp({store:memory(now),rzp:{async createOrder(b){calls.push(b);return{id:'order_T'+(++n)}}},env,engine,now});
const nKeys=b=>b.sections.flatMap(s=>s.items).filter(i=>i.key!==undefined).length;
const ev=(a,event,pe,extra={},id)=>{const raw=JSON.stringify({event,payload:{payment:{entity:pe},...extra}});
  return a.webhook({raw,headers:{'x-razorpay-signature':H(env.RAZORPAY_WEBHOOK_SECRET,raw),...(id&&{'x-razorpay-event-id':id})}})};
(async()=>{
  const a=mk(),ip='9.9.9.9',paper=(tok,subject='maths',seed='5')=>a.paper({query:{subject,seed},headers:tok?{authorization:'Bearer '+tok}:{},ip});
  // fails closed when secrets are missing
  assert.throws(()=>makeApp({store:memory(),rzp:{},env:{},engine}));
  assert.throws(()=>makeApp({store:memory(),rzp:{},env:{...env,RAZORPAY_WEBHOOK_SECRET:''},engine}));
  // orders: the server decides price and availability
  let r=await a.createOrder({body:{sku:'pass99',amount:1},ip});assert.equal(r.status,200);assert.equal(calls[0].amount,9900);
  for(const sku of['vault999','__proto__','constructor',undefined])assert.equal((await a.createOrder({body:{sku},ip})).status,400);
  const oid=r.body.orderId;
  // verify needs a genuine signature for an order we created
  assert.equal((await a.verify({body:{orderId:oid,paymentId:'pay_A1',signature:'bad'},ip})).status,400);
  assert.equal((await a.verify({body:{orderId:'order_X',paymentId:'pay_A1',signature:H('ks_test','order_X|pay_A1')},ip})).status,404);
  const good={orderId:oid,paymentId:'pay_A1',signature:H('ks_test',oid+'|pay_A1')};
  r=await a.verify({body:good,ip});assert.equal(r.status,200);const tok=r.body.token;
  assert.equal((await a.verify({body:good,ip})).status,200);
  // answer keys: only after payment, never leaked
  const total=engine.build('maths',5).sections.flatMap(s=>s.items).length;
  const free=(await paper()).body,paid=(await paper(tok)).body;
  assert.equal(nKeys(free),2);assert.equal(free.keysUnlocked,false);assert.equal(nKeys(paid),total);assert.equal(paid.keysUnlocked,true);
  assert(!/"ans"|"correct"|"ok"|"svgK"/.test(JSON.stringify(free)),'free response leaks answers');
  assert.equal(nKeys((await paper(tok.replace(/^./,c=>c==='A'?'B':'A'))).body),2,'tampered token');
  assert.equal(nKeys((await paper('garbage')).body),2);
  // diagrams: the question never shows the answer, the key does
  const lens=b=>b.sections.flatMap(s=>s.items).find(i=>i.svg);
  const sf=lens((await paper(null,'science','1')).body),sp=lens((await paper(tok,'science','1')).body);
  assert(sf&&!/v =/.test(sf.svg)&&sf.svgKey===undefined);assert(/v = \+/.test(sp.svgKey));
  // 7-day pass expires
  t+=8*86400e3;assert.equal(nKeys((await paper(tok)).body),2,'pass must expire');t-=8*86400e3;
  // input validation
  for(const q of[{subject:'chem'},{subject:'maths',seed:'abc'},{subject:'maths',seed:'0'}])assert.equal((await a.paper({query:q,headers:{},ip})).status,400);
  // webhook: signature, amount, duplicates, recovery, refund
  assert.equal((await a.webhook({raw:'{}',headers:{'x-razorpay-signature':'nope'}})).status,401);
  const o2=(await a.createOrder({body:{sku:'pro199'},ip})).body.orderId;
  await ev(a,'payment.captured',{id:'pay_B1',order_id:o2,amount:100,email:'Teacher@Example.com',contact:'+919876543210'});
  assert.equal((await a.recover({body:{paymentId:'pay_B1',contact:'teacher@example.com'},ip:'1.1.1.1'})).status,403,'wrong amount must not unlock');
  assert.equal((await ev(a,'payment.captured',{id:'pay_B2',order_id:o2,amount:19900,email:'Teacher@Example.com',contact:'+919876543210'},{},'evt1')).status,200);
  assert.equal((await ev(a,'payment.captured',{id:'pay_B2',order_id:o2,amount:19900},{},'evt1')).body.duplicate,true);
  r=await a.recover({body:{paymentId:'pay_B2',contact:'9876543210'},ip:'1.1.1.1'});assert.equal(r.status,200);const tok2=r.body.token;
  assert.equal(nKeys((await paper(tok2)).body),total);
  assert.equal((await a.recover({body:{paymentId:'pay_B2',contact:'wrong@x.com'},ip:'2.2.2.2'})).status,403);
  await ev(a,'refund.processed',{id:'pay_B2'},{refund:{entity:{payment_id:'pay_B2'}}},'evt2');
  assert.equal(nKeys((await paper(tok2)).body),2,'refund must revoke access');
  assert.equal((await a.recover({body:{paymentId:'pay_B2',contact:'9876543210'},ip:'3.3.3.3'})).status,403);
  // rate limits
  let last;for(let i=0;i<7;i++)last=await a.recover({body:{paymentId:'pay_C9',contact:'x'+i},ip:'4.4.4.'+i});assert.equal(last.status,429);
  for(let i=0;i<125;i++)last=await a.paper({query:{subject:'maths',seed:'1'},headers:{},ip:'5.5.5.5'});assert.equal(last.status,429);
  // the real HTTP adapter: raw body must reach the signature check untouched
  Object.assign(process.env,env);const handler=require('../api/[route].js');
  const call=(route,method,raw,headers={},q={})=>new Promise(res=>{const req=Object.assign(Readable.from([Buffer.from(raw)]),{method,headers,query:{route,...q},socket:{}});
    handler(req,{setHeader(){},status(c){this.code=c;return this},json(b){res({status:this.code,body:b})}})});
  const raw='{"event":"payment.captured","payload":{}}',sig=H(env.RAZORPAY_WEBHOOK_SECRET,raw);
  assert.equal((await call('webhook','POST',raw,{'x-razorpay-signature':sig})).status,200);
  assert.equal((await call('webhook','POST',raw+' ',{'x-razorpay-signature':sig})).status,401);
  assert.equal((await call('nope','GET','')).status,404);assert.equal((await call('constructor','GET','')).status,404);
  assert.equal((await call('paper','POST','{}')).status,405);
  const g=await call('paper','GET','',{},{subject:'maths',seed:'3'});assert.equal(g.status,200);assert.equal(nKeys(g.body),2);
  console.log('PHASE 2: ALL CHECKS PASSED');
})().catch(e=>{console.error('PHASE 2 FAILED:',e.message);process.exit(1)});
