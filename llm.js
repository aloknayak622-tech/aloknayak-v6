// Gemini REST adapter (Google's documented v1beta generateContent shape; not yet run against the live service). Swap this file to change provider.
module.exports=env=>({async complete(prompt,o={}){
  const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':env.GEMINI_API_KEY},
    body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{temperature:o.temperature??.4,responseMimeType:'application/json'}})});
  if(!r.ok)throw new Error('AI service error '+r.status);const j=await r.json();
  const t=(((j.candidates||[])[0]||{}).content||{}).parts;const s=t&&t.map(p=>p.text||'').join('');if(!s)throw new Error('AI returned nothing');return s}});
