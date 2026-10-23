// Tiny key-value store. memory() for tests/dev; upstash() for production (REST API, no dependencies).
const memory=(now=()=>Date.now())=>{const m=new Map(),sets=new Map();
  const live=k=>{const e=m.get(k);if(e&&e.x&&e.x<now()){m.delete(k);return null}return e||null};
  return{async sadd(k,v){(sets.get(k)||sets.set(k,new Set()).get(k)).add(v)},async srem(k,v){sets.has(k)&&sets.get(k).delete(v)},async smembers(k){return[...(sets.get(k)||[])]},
    async get(k){const e=live(k);return e?JSON.parse(e.v):null},
    async set(k,v,ttl){m.set(k,{v:JSON.stringify(v),x:ttl?now()+ttl*1000:0})},
    async incr(k,ttl){const e=live(k),n=(e?JSON.parse(e.v):0)+1;m.set(k,{v:JSON.stringify(n),x:e?e.x:now()+ttl*1000});return n}}};
const upstash=(url,token)=>{const cmd=async c=>{const r=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`},body:JSON.stringify(c)});if(!r.ok)throw new Error('store '+r.status);return(await r.json()).result};
  return{async sadd(k,v){await cmd(['SADD',k,v])},async srem(k,v){await cmd(['SREM',k,v])},async smembers(k){return(await cmd(['SMEMBERS',k]))||[]},
    async get(k){const v=await cmd(['GET',k]);return v==null?null:JSON.parse(v)},
    async set(k,v,ttl){await cmd(ttl?['SET',k,JSON.stringify(v),'EX',ttl]:['SET',k,JSON.stringify(v)])},
    async incr(k,ttl){const n=await cmd(['INCR',k]);if(n===1)await cmd(['EXPIRE',k,ttl]);return n}}};
module.exports={memory,upstash};
