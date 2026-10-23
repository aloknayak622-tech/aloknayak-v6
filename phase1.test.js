const {build}=require('../lib/engine');let papers=0,items=0,svgs=0;const fail=[];
for(const sub of ['maths','science'])for(let seed=1;seed<=2000;seed++){
  let p;try{p=build(sub,seed)}catch(e){fail.push(`${sub}#${seed} threw ${e.message}`);continue}
  papers++;if(p.total!==40)fail.push(`${sub}#${seed} total=${p.total}`);
  for(const s of p.sections)for(const i of s.items){items++;
    if(!i.ok)fail.push(`${sub}#${seed} math check failed: ${i.q}`);
    if(i.opts&&(new Set(i.opts).size!==4||i.opts['abcd'.indexOf(i.ans)]!==i.correct))fail.push(`${sub}#${seed} bad options: ${i.q}`);
    if(i.svgK){svgs++;if(!i.svgNums.every(n=>i.svgK.includes(String(n)))||/v =/.test(i.svgQ)||!i.svgQ.includes('u = −'))fail.push(`${sub}#${seed} diagram mismatch or answer leak`)}
    if(/\ba (8\d*|11|18)\b/.test(i.q))fail.push(`${sub}#${seed} grammar: ${i.q}`);if(/NaN|undefined|Infinity/.test(i.q+i.key))fail.push(`${sub}#${seed} bad text: ${i.q}`)}
  if(JSON.stringify(build(sub,seed))!==JSON.stringify(p))fail.push(`${sub}#${seed} not deterministic`)}
const uniq=new Set(Array.from({length:300},(_,i)=>JSON.stringify(build('maths',i+1)))).size;
if(uniq<295)fail.push(`low variety: ${uniq}/300 distinct`);
console.log(`${papers} papers, ${items} items, ${svgs} diagrams checked; variety ${uniq}/300`);
console.log(fail.length?`FAILED (${fail.length}):\n`+fail.slice(0,10).join('\n'):'ALL CHECKS PASSED');
process.exit(fail.length?1:0);
