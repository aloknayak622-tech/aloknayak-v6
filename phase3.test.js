const assert=require('assert'),fs=require('fs'),vm=require('vm'),{execSync}=require('child_process'),start=require('../dev');
(async()=>{
  const html=fs.readFileSync('public/index.html','utf8'),legal=fs.readFileSync('public/legal.html','utf8');
  new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);                                   // page script compiles
  for(const t of['div','section','details','main','label'])assert.equal((html.match(new RegExp('<'+t+'[ >]','g'))||[]).length,(html.match(new RegExp('</'+t+'>','g'))||[]).length,'unbalanced <'+t+'>');
  assert(!/National K-12|Directorate|Council|Accredited|100% inspection|Legal Shield|guarantee|bilingual/i.test(html+legal),'wording the product cannot back up');
  assert.throws(()=>execSync('node scripts/check.js',{stdio:'pipe'}),'go-live guard must block unfilled placeholders');
  const srv=await start(0),B='http://localhost:'+srv.address().port,j=async(p,o)=>{const r=await fetch(B+p,o);return{s:r.status,b:await r.json().catch(()=>null)}};
  assert.equal((await fetch(B+'/')).status,200);assert.equal((await fetch(B+'/legal.html')).status,200);assert.notEqual((await fetch(B+'/%2e%2e/package.json')).status,200);
  const keys=b=>b.sections.flatMap(s=>s.items).filter(i=>i.key!==undefined).length,post=(p,b)=>j(p,{method:'POST',body:JSON.stringify(b)});
  const o=await post('/api/create-order',{sku:'pass99'});assert.equal(o.s,200);const pay=(await j('/dev/pay?order='+o.b.orderId)).b;
  const v=await post('/api/verify',{orderId:pay.razorpay_order_id,paymentId:pay.razorpay_payment_id,signature:pay.razorpay_signature});assert.equal(v.s,200);
  assert.equal(keys((await j('/api/paper?subject=maths&seed=7')).b),2);
  const paid=await fetch(B+'/api/paper?subject=maths&seed=7',{headers:{Authorization:'Bearer '+v.b.token}}).then(r=>r.json());assert(paid.keysUnlocked&&keys(paid)>2);
  srv.close();console.log('PHASE 3: ALL CHECKS PASSED');process.exit(0);
})().catch(e=>{console.error('PHASE 3 FAILED:',e.message);process.exit(1)});
