// Vercel adapter: turns an HTTP request into a call on lib/core.js. Routes: /api/create-order, verify, webhook, recover, paper.
const {makeApp}=require('../lib/core'),{makeBank}=require('../lib/bank'),{memory,upstash}=require('../lib/store');
let app;
const boot=()=>{const env=process.env;
  if(!env.UPSTASH_REDIS_REST_URL&&env.VERCEL_ENV==='production')throw new Error('UPSTASH_REDIS_REST_URL is required in production');
  const store=env.UPSTASH_REDIS_REST_URL?upstash(env.UPSTASH_REDIS_REST_URL,env.UPSTASH_REDIS_REST_TOKEN):memory();
  const auth='Basic '+Buffer.from(env.RAZORPAY_KEY_ID+':'+env.RAZORPAY_KEY_SECRET).toString('base64');
  const rzp={async createOrder(b){const r=await fetch('https://api.razorpay.com/v1/orders',{method:'POST',headers:{'Content-Type':'application/json',Authorization:auth},body:JSON.stringify(b)});if(!r.ok)throw new Error('razorpay '+r.status);return r.json()}};
  const engine=require('../lib/engine'),llm=env.GEMINI_API_KEY&&env.GEMINI_MODEL?require('../lib/llm')(env):{async complete(){throw new Error('AI is not configured')}};
  return makeApp({store,rzp,env,engine,bank:makeBank({store,llm,env,engine})})};
const ROUTES={'create-order':['createOrder','POST'],verify:['verify','POST'],webhook:['webhook','POST'],recover:['recover','POST'],paper:['paper','GET'],subjects:['subjects','GET'],'admin-generate':['adminGenerate','POST'],'admin-list':['adminList','GET'],'admin-review':['adminReview','POST']};
const readRaw=async req=>{const c=[];for await(const x of req)c.push(Buffer.from(x));return Buffer.concat(c).toString('utf8')}; // raw bytes: needed to check webhook signatures
module.exports=async(req,res)=>{res.setHeader('Cache-Control','no-store');const send=(s,b)=>res.status(s).json(b);
  try{const k=req.query&&req.query.route,r=Object.hasOwn(ROUTES,k)?ROUTES[k]:null;if(!r)return send(404,{error:'not found'});
    if(req.method!==r[1])return send(405,{error:'method not allowed'});
    app=app||boot();const raw=r[1]==='POST'?await readRaw(req):'';let body={};
    if(raw&&r[0]!=='webhook'){try{body=JSON.parse(raw)}catch{return send(400,{error:'bad json'})}}
    const ip=String(req.headers['x-forwarded-for']||'').split(',')[0].trim()||(req.socket&&req.socket.remoteAddress)||'unknown';
    const out=await app[r[0]]({headers:req.headers,query:req.query,raw,body,ip});send(out.status,out.body)}
  catch(e){console.error('api error',e.message);send(500,{error:'server error'})}};
module.exports.config={api:{bodyParser:false}};
