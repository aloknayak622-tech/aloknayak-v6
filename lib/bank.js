// AI-assisted question bank. Rule: nothing AI-written reaches a buyer until a named human approves it.
const crypto=require('crypto');
const J=(status,body)=>({status,body}),SUB=/^[a-z0-9-]{3,30}$/,NEED={1:8,2:4,3:4,4:3};
const safeEq=(a,b)=>{a=Buffer.from(String(a));b=Buffer.from(String(b));return a.length===b.length&&crypto.timingSafeEqual(a,b)};
const sha=s=>crypto.createHash('sha1').update(s).digest('hex'),parse=t=>{try{return JSON.parse(String(t).replace(/^\s*```(?:json)?\s*|\s*```\s*$/g,''))}catch{return null}};
const nums=s=>(String(s).replace(/[−–]/g,'-').match(/-?\d+(\.\d+)?/g)||[]).map(Number),norm=s=>String(s).toLowerCase().replace(/[−–]/g,'-').replace(/[^a-z0-9.\-\/]/g,'');
const agree=(a,b)=>{const x=nums(a),y=nums(b);return x.length&&y.length?x.length===y.length&&x.every((v,i)=>Math.abs(v-y[i])<=1e-6*Math.max(1,Math.abs(v))):norm(a)===norm(b)};
const letter=x=>String(x).trim().toLowerCase().replace(/[^a-d]/g,'')[0],str=(s,a,b)=>typeof s==='string'&&s.trim().length>=a&&s.length<=b;
const clean=(c,marks)=>{c=c||{};const m=marks===1;return{marks,kind:m?'mcq':c.kind==='case'&&marks===4?'case':'written',q:String(c.q||'').trim(),
  ...(m?{opts:Array.isArray(c.opts)?c.opts.map(o=>String(o).trim()):c.opts,ans:String(c.ans||'').trim().toLowerCase()}:c.opts?{opts:c.opts}:{}),
  key:String(c.key||'').trim(),final:m?String(c.ans||'').trim().toLowerCase():String(c.final||'').trim()}};
function validate(c){
  if(![1,2,3,4].includes(c.marks))return'marks must be 1-4';if(!str(c.q,10,700))return'question text length';if(!str(c.key,3,1500))return'key length';if(!str(c.final,1,80))return'final answer missing';
  if(c.marks===1){if(!Array.isArray(c.opts)||c.opts.length!==4||c.opts.some(o=>!str(o,1,200))||new Set(c.opts.map(o=>o.toLowerCase())).size!==4)return'MCQ needs 4 distinct options';if(!/^[a-d]$/.test(c.ans))return'MCQ needs ans a-d'}
  else if(c.opts)return'only 1-mark items have options';return null}
const genPrompt=b=>`You write original CBSE-style exam questions. Class ${b.grade}, subject ${b.subject}, chapter: ${b.chapter}. Write ${b.count} different questions worth ${b.marks} mark(s) each.
Rules: original wording (never copy textbook or past-paper text); no diagrams or images; exactly one correct answer that can be fully worked out from the text; ${b.marks===1?'4 options and "ans" as one letter a-d':'no options'}; "key" is the worked solution${b.marks>1?' with the marks split':''}; "final" is the short final answer only.
Reply only with JSON: {"items":[{"q":"...",${b.marks===1?'"opts":["","","",""],"ans":"a",':''}"key":"...","final":"..."}]}`;
const solvePrompt=c=>`Solve this exam question independently. Reply only with JSON {"final":"..."} where final is ${c.marks===1?'the letter (a-d) of the correct option':'the short final answer only'}.\n\nQuestion: ${c.q.replace(/\n/g,' ')}\n${(c.opts||[]).map((o,i)=>'('+'abcd'[i]+') '+o).join('\n')}`;
function makeBank({store,llm,env,engine,now=()=>Date.now()}){
  const limit=async(k,max,ttl)=>(await store.incr('rl:'+k,ttl))<=max;
  const ask=async(p,o)=>{if(await store.incr('llm:'+new Date(now()).toISOString().slice(0,10),90000)>(+env.AI_DAILY_CALLS||200))throw new Error('Daily AI call limit reached');return llm.complete(p,o)};
  const who=h=>{const t=(h.authorization||'').replace(/^Bearer /i,'');for(const p of String(env.REVIEWERS||'').split(',')){const i=p.indexOf(':'),k=p.slice(i+1);if(i>0&&k.length>=20&&safeEq(t,k))return p.slice(0,i).trim()}return null};
  async function generate(b,by){const{grade,subject,chapter,marks,count}=b||{};
    if(engine.subjects.includes(subject))return J(400,{error:'That subject is built in; choose another id'});
    if(!SUB.test(subject||'')||![1,2,3,4].includes(marks)||!(count>=1&&count<=8)||!(grade>=3&&grade<=12)||!/^[\w &,().'-]{2,80}$/.test(chapter||''))return J(400,{error:'Check: subject id (a-z, 0-9, -), class 3-12, chapter, marks 1-4, count 1-8'});
    try{const items=(parse(await ask(genPrompt(b),{temperature:.5}))||{}).items;if(!Array.isArray(items))return J(502,{error:'The AI reply was not usable. Nothing was saved.'});
      const r={added:0,flagged:0,rejected:0,duplicate:0};
      for(const raw of items.slice(0,count)){const c=clean(raw,marks);if(validate(c)){r.rejected++;continue}
        const h=sha(norm(c.q));if(await store.get('qh:'+h)){r.duplicate++;continue}
        let solve='unchecked';try{const s=parse(await ask(solvePrompt(c),{temperature:0}));if(s&&s.final!=null)solve=(c.marks===1?letter(s.final)===c.ans:agree(s.final,c.final))?'agree':'disagree'}catch(e){if(/limit/i.test(e.message))throw e}
        const id='q_'+crypto.randomBytes(6).toString('hex');
        await store.set('item:'+id,{id,subject,grade,chapter,...c,status:'pending',auto:{solve},prov:{model:env.GEMINI_MODEL||'unknown',generatedAt:new Date(now()).toISOString(),by}});
        await store.set('qh:'+h,id);await store.sadd('bank:pending',id);r.added++;if(solve==='disagree')r.flagged++}
      return J(200,r)}catch(e){return J(/limit/i.test(e.message)?429:502,{error:e.message})}}
  async function review(b,by){const{id,action,edits={},confirmFlagged}=b||{};
    const it=typeof id==='string'&&/^q_[a-f0-9]{12}$/.test(id)?await store.get('item:'+id):null;if(!it)return J(404,{error:'Item not found'});
    if(action==='reject'){it.status='rejected';it.prov.reviewer=by;await store.set('item:'+id,it);await store.srem('bank:pending',id);await store.srem('bank:ok:'+it.subject,id);return J(200,{ok:true})}
    if(action!=='approve')return J(400,{error:'action must be approve or reject'});
    if(it.status==='approved'&&!Object.keys(edits).length)return J(200,{ok:true,already:true});
    if(it.auto.solve==='disagree'&&!confirmFlagged)return J(409,{error:'The AI solver disagreed with this key. Work it out yourself, then tick the confirmation box.'});
    const n={...it};for(const k of['q','opts','ans','key','final','marks','kind'])if(k in edits)n[k]=edits[k];
    const c=clean(n,n.marks),bad=validate(c);if(bad)return J(400,{error:'Cannot approve: '+bad});
    Object.assign(n,c,{status:'approved',prov:{...it.prov,reviewer:by,reviewedAt:new Date(now()).toISOString()}});
    await store.set('item:'+id,n);await store.srem('bank:pending',id);await store.sadd('bank:ok:'+n.subject,id);await store.sadd('bank:subjects',n.subject);return J(200,{ok:true})}
  async function list(q){let ids;if(q.status==='approved'){if(!SUB.test(q.subject||''))return J(400,{error:'subject required'});ids=await store.smembers('bank:ok:'+q.subject)}else ids=await store.smembers('bank:pending');
    const items=(await Promise.all(ids.slice(0,100).map(i=>store.get('item:'+i)))).filter(Boolean).sort((a,b)=>(b.auto.solve==='disagree')-(a.auto.solve==='disagree'));return J(200,{items})}
  async function pool(s){const g={1:[],2:[],3:[],4:[]};for(const i of await Promise.all((await store.smembers('bank:ok:'+s)).map(i=>store.get('item:'+i))))if(i&&i.status==='approved')g[i.marks].push(i);return g}
  const ready=g=>Object.entries(NEED).every(([m,n])=>g[m].length>=n);
  async function build(subject,seed){if(!SUB.test(subject||''))return null;const g=await pool(subject);if(!ready(g))return null;
    const r=engine.rng(seed*7919+13),pick=(a,n)=>engine.shuf(r,a).slice(0,n),four=engine.shuf(r,g[4]),cs=four.find(i=>i.kind==='case')||four[0];
    const pub=i=>({marks:i.marks,q:i.q,...(i.opts&&{opts:i.opts}),key:i.marks===1?`(${i.ans}) ${i.opts['abcd'.indexOf(i.ans)]}. ${i.key}`:i.key,ok:true});
    const sections=[['Section A — MCQ (8 × 1)',pick(g[1],8)],['Section B — Short answer (4 × 2)',pick(g[2],4)],['Section C — (4 × 3)',pick(g[3],4)],['Section D — Long answer (2 × 4)',four.filter(i=>i!==cs).slice(0,2)],['Section E — Case study (1 × 4)',[cs]]].map(([name,items])=>({name,items:items.map(pub)}));
    return{subject,seed,sections,total:sections.reduce((t,s)=>t+s.items.reduce((u,i)=>u+i.marks,0),0)}}
  const gate=fn=>async a=>{if(!await limit('adm:'+a.ip,120,3600))return J(429,{error:'Too many requests'});const w=who(a.headers||{});return w?fn(a,w):J(401,{error:'Not authorised'})};
  return{build,async subjects(){const o=[];for(const s of await store.smembers('bank:subjects'))if(ready(await pool(s)))o.push(s);return o},
    handlers:{adminGenerate:gate((a,w)=>generate(a.body,w)),adminList:gate(a=>list(a.query||{})),adminReview:gate((a,w)=>review(a.body,w))}}}
module.exports={makeBank};
