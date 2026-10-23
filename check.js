// Go-live guard: fails while any {{placeholder}} is still in the public pages.
const fs=require('fs'),p=require('path'),bad=[];
for(const f of fs.readdirSync('public').filter(f=>f.endsWith('.html')))for(const m of fs.readFileSync(p.join('public',f),'utf8').match(/\{\{[^}]*\}\}/g)||[])bad.push(f+': '+m);
if(bad.length){console.error('Fill these in before going live:\n'+[...new Set(bad)].join('\n'));process.exit(1)}console.log('No placeholders left.');
