// Local test server: `npm run dev`, then open http://localhost:3000. Uses a FAKE Razorpay and in-memory storage. Not part of the deployed site.
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
Object.assign(process.env,{TOKEN_SECRET:'dev-secret-'.repeat(4),RAZORPAY_KEY_ID:'rzp_test_dev',RAZORPAY_KEY_SECRET:'dev_secret',RAZORPAY_WEBHOOK_SECRET:'dev_wh',REVIEWERS:'Dev:dev-reviewer-key-1234567890'});
let n=0;const real=global.fetch;global.fetch=(u,o)=>String(u).startsWith('https://api.razorpay.com')?Promise.resolve(new Response(JSON.stringify({id:'order_dev'+(++n)}))):real(u,o);
const handler=require('./api/[route].js'),ROOT=path.join(__dirname,'public');
const h=async(req,res)=>{const u=new URL(req.url,'http://x'),p=u.pathname;
  res.status=c=>(res.statusCode=c,res);res.json=b=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(b))};
  if(p.startsWith('/api/')){req.query={route:p.slice(5),...Object.fromEntries(u.searchParams)};return handler(req,res)}
  if(p==='/dev/pay'){const o=u.searchParams.get('order'),id='pay_dev'+crypto.randomBytes(4).toString('hex');return res.json({razorpay_order_id:o,razorpay_payment_id:id,razorpay_signature:crypto.createHmac('sha256','dev_secret').update(o+'|'+id).digest('hex')})}
  if(p==='/dev/checkout.js'){res.setHeader('Content-Type','text/javascript');return res.end("window.Razorpay=function(o){this.open=async()=>o.handler(await(await fetch('/dev/pay?order='+o.order_id)).json())}")}
  let f;try{f=path.join(ROOT,p==='/'?'index.html':decodeURIComponent(p))}catch{f=''}
  if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.statusCode=404;return res.end('Not found')}
  res.setHeader('Content-Type',{'.html':'text/html;charset=utf-8','.js':'text/javascript'}[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f))};
const start=port=>new Promise(r=>{const s=http.createServer(h).listen(port,()=>r(s))});
module.exports=start;if(require.main===module)start(3000).then(()=>console.log('Open http://localhost:3000'));
