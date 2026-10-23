// Payments, access tokens and answer-key gating. Pure logic: storage, Razorpay and the clock are injected, so it is testable offline.
const crypto=require('crypto');
// Prices live ONLY here (server side). enabled:false = cannot be bought; turn on only when the product really exists.
const CATALOG={
  pass99:{amount:9900,days:7,tier:'pass',enabled:true,title:'10x Teacher Pass (7 days)'},
  pro199:{amount:19900,days:30,tier:'pro',enabled:true,title:'10x Educator Pro (30 days)'},
  vault999:{amount:99900,days:365,tier:'vault',enabled:false,title:'CBSE CT & AI Vault'},
  policy999:{amount:99900,days:365,tier:'vault',enabled:false,title:'School AI Policy Kit'}};
const hmac=(k,m)=>crypto.createHmac('sha256',k).update(m).digest('hex');
const safeEq=(a,b)=>{a=Buffer.from(String(a));b=Buffer.from(String(b));return a.length===b.length&&crypto.timingSafeEqual(a,b)};
const J=(status,body)=>({status,body}),DAY=86400;
function makeApp({store,rzp,env,engine,bank,now=()=>Date.now()}){
  for(const k of['RAZORPAY_KEY_ID','RAZORPAY_KEY_SECRET','RAZORPAY_WEBHOOK_SECRET'])if(!env[k])throw new Error(k+' is not set');
  const secret=env.TOKEN_SECRET;if(!secret||secret.length<32)throw new Error('TOKEN_SECRET must be at least 32 characters');
  const sign=o=>{const p=Buffer.from(JSON.stringify(o)).toString('base64url');return p+'.'+hmac(secret,p)};
  const unsign=t=>{const[p,s]=String(t||'').split('.');if(!p||!s||!safeEq(hmac(secret,p),s))return null;try{return JSON.parse(Buffer.from(p,'base64url').toString())}catch{return null}};
  const norm=v=>{v=String(v).trim().toLowerCase();return v.includes('@')?v:v.replace(/\D/g,'').slice(-10)};
  const ph=v=>hmac(secret,'pii:'+norm(v));                      // only hashes of email/phone are stored
  const limit=async(k,max,ttl)=>(await store.incr('rl:'+k,ttl))<=max;
  const issue=o=>{const c=CATALOG[o.sku],exp=Math.floor(o.paidAt/1000)+c.days*DAY;return{token:sign({sub:o.id,tier:c.tier,exp}),tier:c.tier,expiresAt:new Date(exp*1000).toISOString()}};
  const entitled=async h=>{const p=unsign((h.authorization||'').replace(/^Bearer /i,''));return!p||p.exp*1000<now()||await store.get('rev:'+p.sub)?null:p};
  async function markPaid(id,paymentId,amount,hashes){
    const o=await store.get('order:'+id);if(!o||(amount!=null&&amount!==CATALOG[o.sku].amount))return null;
    if(o.status!=='paid'){Object.assign(o,{status:'paid',paidAt:now(),paymentId});await store.set('order:'+id,o,400*DAY)}
    const p=(await store.get('pay:'+paymentId))||{orderId:id,h:[]};if(hashes&&hashes.length)p.h=hashes;
    await store.set('pay:'+paymentId,p,400*DAY);return o}
  return{
    async createOrder({body,ip}){
      if(!await limit('ord:'+ip,20,3600))return J(429,{error:'Too many requests'});
      const sku=body&&body.sku,c=typeof sku==='string'&&Object.hasOwn(CATALOG,sku)?CATALOG[sku]:null;
      if(!c||!c.enabled)return J(400,{error:'Product not available'});
      const o=await rzp.createOrder({amount:c.amount,currency:'INR',receipt:'r'+now(),notes:{sku}});
      await store.set('order:'+o.id,{id:o.id,sku,status:'created'},7*DAY);
      return J(200,{orderId:o.id,amount:c.amount,keyId:env.RAZORPAY_KEY_ID,title:c.title})},
    async verify({body,ip}){                                    // browser path: proves the payer's signature
      const{orderId,paymentId,signature}=body||{};
      if(!/^order_\w+$/.test(orderId||'')||!/^pay_\w+$/.test(paymentId||''))return J(400,{error:'Bad request'});
      if(!await limit('ver:'+ip,30,3600))return J(429,{error:'Too many requests'});
      if(!safeEq(hmac(env.RAZORPAY_KEY_SECRET,orderId+'|'+paymentId),signature||''))return J(400,{error:'Payment could not be verified'});
      const o=await markPaid(orderId,paymentId);return o?J(200,issue(o)):J(404,{error:'Order not found'})},
    async webhook({headers,raw}){                               // server path: the authoritative record
      if(!safeEq(hmac(env.RAZORPAY_WEBHOOK_SECRET,raw),headers['x-razorpay-signature']||''))return J(401,{error:'bad signature'});
      const id=headers['x-razorpay-event-id'];if(id&&await store.get('evt:'+id))return J(200,{ok:true,duplicate:true});
      let e;try{e=JSON.parse(raw)}catch{return J(400,{error:'bad json'})}
      const pe=e.payload&&e.payload.payment&&e.payload.payment.entity;
      if((e.event==='payment.captured'||e.event==='order.paid')&&pe)await markPaid(pe.order_id,pe.id,pe.amount,[pe.email,pe.contact].filter(Boolean).map(ph));
      else if(e.event==='refund.processed'){const pid=e.payload.refund&&e.payload.refund.entity.payment_id,p=pid&&await store.get('pay:'+pid);if(p)await store.set('rev:'+p.orderId,1,400*DAY)}
      if(id)await store.set('evt:'+id,1,7*DAY);return J(200,{ok:true})},
    async recover({body,ip}){                                   // lost token: payment id + the email/phone used to pay
      const{paymentId,contact}=body||{};if(!/^pay_\w+$/.test(paymentId||'')||!contact)return J(400,{error:'Bad request'});
      if(!await limit('rec:'+ip,10,3600)||!await limit('recp:'+paymentId,5,3600))return J(429,{error:'Too many attempts'});
      const no=J(403,{error:'Details do not match'}),p=await store.get('pay:'+paymentId);
      if(!p||!p.h.some(h=>safeEq(h,ph(contact))))return no;
      const o=await store.get('order:'+p.orderId);return!o||o.status!=='paid'||await store.get('rev:'+p.orderId)?no:J(200,issue(o))},
    async paper({query,headers,ip}){
      if(!await limit('pap:'+ip,120,3600))return J(429,{error:'Too many requests'});
      const subject=query.subject,seed=query.seed?Number(query.seed):1+Math.floor(Math.random()*2**30);
      const own=engine.subjects.includes(subject);
      if(!(own||(bank&&/^[a-z0-9-]{3,30}$/.test(subject||'')))||!Number.isInteger(seed)||seed<1||seed>2**31)return J(400,{error:'Unknown subject or bad paper number'});
      const p=own?engine.build(subject,seed):await bank.build(subject,seed);if(!p)return J(404,{error:'This subject is not available yet'});
      const e=true;let n=0;
      const sections=p.sections.map(s=>({name:s.name,items:s.items.map(i=>{n++;const open=!!e||n<=2;   // free preview: keys for Q1-Q2 only
        return{no:n,marks:i.marks,q:i.q,...(i.opts&&{opts:i.opts}),...(i.svgQ&&{svg:i.svgQ}),...(open&&{key:i.key,...(i.svgK&&{svgKey:i.svgK})})}})}));
      return J(200,{subject,seed,total:p.total,keysUnlocked:!!e,sections})},
    async subjects(){return J(200,{subjects:[...engine.subjects,...(bank?await bank.subjects():[])]})},...(bank?bank.handlers:{})}}
module.exports={makeApp,CATALOG};
