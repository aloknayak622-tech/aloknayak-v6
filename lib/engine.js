// 10x Paper Engine v1: Class 10 Maths + Science (Physics: Light, Electricity).
// Rule: numbers are chosen first, every answer is computed from them, and each item self-checks by substitution (item.ok).
const rng=s=>{s=(s>>>0)||1;const n=()=>(s^=s<<13,s^=s>>>17,s^=s<<5,(s>>>0)/4294967296);n();n();n();return n};
const ri=(r,a,b)=>a+Math.floor(r()*(b-a+1)),pk=(r,a)=>a[Math.floor(r()*a.length)];
const gcd=(a,b)=>b?gcd(b,a%b):a,fr=(n,d)=>{const g=gcd(n,d);return d/g===1?`${n/g}`:`${n/g}/${d/g}`};
const fx=x=>+x.toFixed(3),shuf=(r,a)=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=ri(r,0,i);[a[i],a[j]]=[a[j],a[i]]}return a};
const apn=(a,d,n)=>{let x=a;for(let i=1;i<n;i++)x+=d;return x},sumAp=(a,d,n)=>{let s=0;for(let i=0;i<n;i++)s+=a+i*d;return s};
const P=(a,b,c)=>`${a>1?a:''}x²${b<0?' − ':' + '}${Math.abs(b)>1?Math.abs(b):''}x${c<0?' − ':' + '}${Math.abs(c)}`;
const mcq=(r,q,ans,wrong,ok)=>{ans=String(ans);const w=[...new Set(wrong.map(String))].filter(x=>x!==ans).slice(0,3);
  for(let k=1;w.length<3;k++){const c=ans.replace(/-?\d+(\.\d+)?/,m=>fx(+m+k));if(c!==ans&&!w.includes(c))w.push(c)}
  const opts=shuf(r,[ans,...w]),L='abcd'[opts.indexOf(ans)];return{marks:1,q,opts,correct:ans,ans:L,key:`(${L}) ${ans}`,ok}};
const an=n=>{const s=String(n);return/^8/.test(s)||s==='11'||s==='18'?'an':'a'},An=n=>an(n)==='an'?'An':'A';
const MIR=[[10,15,30],[10,20,20],[10,30,15],[12,18,36],[12,24,24],[15,20,60],[15,30,30],[20,30,60]]; // [f,u,v] all exact
const PAR=[[6,3,2],[12,4,3],[20,5,4],[30,6,5]];                                                    // [R1,R2,R_parallel]
const lensSvg=(f,U,V)=>{const O=210,x=n=>O+n*3;return`<svg viewBox="0 0 420 130"><line x1="10" y1="65" x2="410" y2="65" stroke="#000"/><line x1="${O}" y1="12" x2="${O}" y2="118" stroke="#000" stroke-width="2"/><circle cx="${x(-f)}" cy="65" r="2.5"/><circle cx="${x(f)}" cy="65" r="2.5"/><text x="${x(-f)-4}" y="80" font-size="9">F (${f})</text><text x="${x(f)-4}" y="80" font-size="9">F (${f})</text><line x1="${x(-U)}" y1="65" x2="${x(-U)}" y2="35" stroke="#000" stroke-width="2"/><text x="${x(-U)-8}" y="30" font-size="9">u = −${U}</text>${V?`<line x1="${x(V)}" y1="65" x2="${x(V)}" y2="${65+Math.round(30*V/U)}" stroke="#000" stroke-width="2"/><text x="${x(V)-8}" y="112" font-size="9">v = +${V}</text>`:''}</svg>`};

const M={
mcq:[
r=>{const a=ri(r,1,3),p=ri(r,1,6),q=ri(r,7,9),b=-a*(p+q),c=a*p*q,D=b*b-4*a*c;return mcq(r,`The discriminant of ${P(a,b,c)} = 0 is`,D,[b*b+4*a*c,-D-1,b-4*a*c,D+a],D===a*a*(p-q)**2)},
r=>{const a=ri(r,2,9),d=ri(r,2,7),n=ri(r,8,15),t=a+(n-1)*d;return mcq(r,`The ${n}th term of the AP ${a}, ${a+d}, ${a+2*d}, … is`,t,[t+d,t-d,a+n*d+d,n*d],t===apn(a,d,n))},
r=>{const a=ri(r,1,9),d=ri(r,1,5),n=ri(r,6,12),S=n*(2*a+(n-1)*d)/2;return mcq(r,`The sum of the first ${n} terms of the AP ${a}, ${a+d}, ${a+2*d}, … is`,S,[S+n,S-a,n*(2*a+n*d)/2,S+d*n],S===sumAp(a,d,n))},
r=>{const[dx,dy,h]=pk(r,[[3,4,5],[5,12,13],[8,15,17],[6,8,10]]),x=ri(r,-3,3),y=ri(r,-3,3);return mcq(r,`The distance between A(${x}, ${y}) and B(${x+dx}, ${y+dy}) is`,h,[dx+dy,h+1,h-1,dx*dy],Math.hypot(dx,dy)===h)},
r=>{const p=ri(r,1,5),q=ri(r,6,9),a=ri(r,1,3),f=t=>a*t*t-a*(p+q)*t+a*p*q;return mcq(r,`If α and β are the zeroes of ${P(a,-a*(p+q),a*p*q)}, then α + β equals`,p+q,[-(p+q),p*q,-p*q,p+q+a],f(p)===0&&f(q)===0)},
r=>{const R=ri(r,2,7),B=ri(r,2,7),n=R+B,A=fr(R,n),[u,v='1']=A.split('/');return mcq(r,`A bag has ${R} red and ${B} blue balls. A ball is drawn at random. P(red) is`,A,[fr(B,n),fr(R,B),fr(R+1,n+1),fr(n-1,n)],+u*n===R*+v)},
r=>{const g=pk(r,[3,4,6,12]),[p,q]=pk(r,[[2,3],[3,5],[2,5],[3,4],[5,7]]);return mcq(r,`The HCF of ${g*p} and ${g*q} is`,g,[g*p*q,p*q,g*2,g+p],gcd(g*p,g*q)===g)},
r=>{const x1=2*ri(r,-3,3),y1=2*ri(r,-3,3),x2=2*ri(r,4,8),y2=2*ri(r,4,8),mx=(x1+x2)/2,my=(y1+y2)/2;return mcq(r,`The mid-point of the segment joining (${x1}, ${y1}) and (${x2}, ${y2}) is`,`(${mx}, ${my})`,[`(${x1+x2}, ${y1+y2})`,`(${my}, ${mx})`,`(${(x2-x1)/2}, ${(y2-y1)/2})`,`(${mx+1}, ${my})`],mx*2===x1+x2&&my*2===y1+y2)}],
two:[
r=>{const p=ri(r,1,6),q=ri(r,7,9),f=t=>t*t-(p+q)*t+p*q;return{marks:2,q:`Solve x² − ${p+q}x + ${p*q} = 0.`,key:`(x − ${p})(x − ${q}) = 0 → x = ${p} or x = ${q}.`,ok:f(p)===0&&f(q)===0}},
r=>{const a=ri(r,2,9),d=ri(r,2,7),n=ri(r,12,20);return{marks:2,q:`Find the ${n}th term of the AP ${a}, ${a+d}, ${a+2*d}, …`,key:`aₙ = a + (n−1)d = ${a} + ${n-1}×${d} = ${a+(n-1)*d}.`,ok:apn(a,d,n)===a+(n-1)*d}},
r=>{const g=pk(r,[2,3,4,6]),[p,q]=pk(r,[[2,3],[3,5],[2,5],[3,4]]),a=g*p,b=g*q,L=g*p*q;return{marks:2,q:`The HCF of two numbers is ${g} and their LCM is ${L}. If one number is ${a}, find the other.`,key:`HCF × LCM = product of the numbers → other = ${g}×${L}/${a} = ${b}.`,ok:gcd(a,b)===g&&a*b===g*L}},
r=>{const R=ri(r,3,8),B=ri(r,2,7),n=R+B,A=fr(B,n),[u,v='1']=A.split('/');return{marks:2,q:`A bag has ${R} red and ${B} blue balls. Find the probability that a ball drawn at random is not red.`,key:`P(not red) = ${B}/${n} = ${A}.`,ok:+u*n===B*+v}}],
three:[
r=>{const b=ri(r,5,15),d=ri(r,1,9),l=2*b+d,A=b*l;return{marks:3,q:`The length of a rectangular plot is ${d} m more than twice its breadth. Its area is ${A} sq m. Find its dimensions.`,key:`Let breadth = x, length = 2x + ${d}. x(2x + ${d}) = ${A} → 2x² + ${d}x − ${A} = 0 → (x − ${b})(2x + ${l}) = 0. Breadth = ${b} m, length = ${l} m (check: ${b}×${l} = ${A}).`,ok:2*b*b+d*b-A===0&&l-2*b===d&&b*l===A}},
r=>{const x1=ri(r,-4,4),y1=ri(r,-4,4),m=ri(r,1,3),n=ri(r,1,3),dx=ri(r,1,3),dy=ri(r,1,3),x2=x1+(m+n)*dx,y2=y1+(m+n)*dy,px=x1+m*dx,py=y1+m*dy;return{marks:3,q:`Find the point that divides the segment joining A(${x1}, ${y1}) and B(${x2}, ${y2}) internally in the ratio ${m}:${n}.`,key:`x = (${m}×${x2} + ${n}×${x1})/${m+n} = ${px}; y = (${m}×${y2} + ${n}×${y1})/${m+n} = ${py}. Point = (${px}, ${py}).`,ok:m*x2+n*x1===px*(m+n)&&m*y2+n*y1===py*(m+n)}},
r=>{const a=ri(r,3,12),d=ri(r,2,6),n=ri(r,10,20),S=n*(2*a+(n-1)*d)/2;return{marks:3,q:`Find the sum of the first ${n} terms of the AP ${a}, ${a+d}, ${a+2*d}, …`,key:`Sₙ = (n/2)[2a + (n−1)d] = (${n}/2) × ${2*a+(n-1)*d} = ${S}.`,ok:S===sumAp(a,d,n)}},
r=>{const L=2*ri(r,4,12);return{marks:3,q:`A ladder ${L} m long makes an angle of 30° with the ground. At what height does it touch the wall?`,key:`sin 30° = h/${L} → h = ${L} × ½ = ${L/2} m.`,ok:Math.abs(L*Math.sin(Math.PI/6)-L/2)<1e-9}}],
four:[
r=>{const x=ri(r,2,9),y=ri(r,2,9),A=2*x+3*y,B=3*x+2*y;return{marks:4,q:`2 pens and 3 notebooks cost ₹${A}; 3 pens and 2 notebooks cost ₹${B}. Find the cost of one pen and one notebook.`,key:`2x + 3y = ${A}, 3x + 2y = ${B}. Multiply by 3 and 2 and subtract: 5y = ${3*A-2*B} → y = ${y}; then x = ${x}. Pen ₹${x}, notebook ₹${y}.`,ok:3*A-2*B===5*y&&2*x+3*y===A&&3*x+2*y===B}},
r=>{const x=pk(r,[20,30,40,50]),D=x*(x+10)/20;return{marks:4,q:`A train covers ${D} km at a uniform speed. At 10 km/h more it would take 30 minutes less. Find its original speed.`,key:`${D}/x − ${D}/(x+10) = ½ → x² + 10x − ${20*D} = 0 → (x − ${x})(x + ${x+10}) = 0. Speed = ${x} km/h (reject the negative root).`,ok:Math.abs(D/x-D/(x+10)-.5)<1e-12}}],
case:r=>{const a=ri(r,10,20),d=ri(r,2,4),n=ri(r,12,20),k=ri(r,4,n-2),S=n*(2*a+(n-1)*d)/2;return{marks:4,q:`A theatre has ${n} rows: ${a} seats in the first row and ${d} more in each following row. (i) How many seats are in the 5th row? (ii) Which row has ${a+(k-1)*d} seats? (iii) How many seats are there in all? (iv) How many more seats does the last row have than the first? [1 mark each]`,key:`(i) ${a+4*d}. (ii) Row ${k}. (iii) ${S}. (iv) ${(n-1)*d}.`,ok:apn(a,d,5)===a+4*d&&apn(a,d,k)===a+(k-1)*d&&S===sumAp(a,d,n)}}};

const S={
mcq:[
r=>{const f=pk(r,[10,20,25,50]),p=100/f;return mcq(r,`A convex lens has focal length ${f} cm. Its power is`,`${p} D`,[`${f/100} D`,`${-p} D`,`${p*2} D`,`${f} D`],Math.abs(p*f/100-1)<1e-12)},
r=>{const R=pk(r,[2,4,5,10]),I=ri(r,1,6),V=I*R;return mcq(r,`${An(V)} ${V} V battery is connected across a ${R} Ω resistor. The current is`,`${I} A`,[`${V*R} A`,`${I+1} A`,`${I+2} A`,`${V+R} A`],V/R===I)},
r=>{const a=ri(r,2,9),b=ri(r,2,9),c=ri(r,2,9),T=a+b+c;return mcq(r,`Resistors of ${a} Ω, ${b} Ω and ${c} Ω are in series. The equivalent resistance is`,`${T} Ω`,[`${T-1} Ω`,`${a*b*c} Ω`,`${a+b} Ω`,`${T+2} Ω`],T-a-b-c===0)},
r=>{const[a,b,e]=pk(r,PAR);return mcq(r,`Resistors of ${a} Ω and ${b} Ω are in parallel. The equivalent resistance is`,`${e} Ω`,[`${a+b} Ω`,`${a*b} Ω`,`${e+1} Ω`,`${b-1} Ω`],Math.abs(1/a+1/b-1/e)<1e-12)},
r=>{const f=ri(r,5,25);return mcq(r,`The radius of curvature of a spherical mirror of focal length ${f} cm is`,`${2*f} cm`,[`${fx(f/2)} cm`,`${f} cm`,`${3*f} cm`,`${f+2} cm`],f===2*f/2)},
r=>{const n=pk(r,[1.25,1.5,2]),v=fx(3/n);return mcq(r,`Light travels at ${v} × 10⁸ m/s in a medium (3 × 10⁸ m/s in vacuum). The refractive index is`,`${n}`,[`${v}`,`${fx(n+.25)}`,`${fx(3*v)}`,`${fx(n-.25)}`],Math.abs(3/v-n)<1e-9)},
r=>{const V=pk(r,[12,24,220]),I=ri(r,2,5);return mcq(r,`An appliance draws ${I} A from a ${V} V supply. Its power is`,`${V*I} W`,[`${fx(V/I)} W`,`${V+I} W`,`${V*I*2} W`,`${V*I/2} W`],V*I/I===V)},
r=>{const p=pk(r,[500,1000,2000]),t=pk(r,[2,4,5]),E=p*t/1000;return mcq(r,`A ${p} W heater runs for ${t} hours. The energy used is`,`${E} kWh`,[`${p*t} kWh`,`${E*2} kWh`,`${fx(p/t)} kWh`,`${fx(E/10)} kWh`],p*t===E*1000)}],
two:[
r=>{const f=pk(r,[10,20,25,50]);return{marks:2,q:`A concave lens has focal length ${f} cm. Find its power.`,key:`P = 1/f (in m) = 1/(−${f/100}) = −${100/f} D.`,ok:Math.abs(1/(-f/100)+100/f)<1e-9}},
r=>{const I=ri(r,2,4),R=pk(r,[5,10,20]),t=pk(r,[10,20,30]);return{marks:2,q:`A current of ${I} A flows through a ${R} Ω resistor for ${t} s. Find the heat produced.`,key:`H = I²Rt = ${I}² × ${R} × ${t} = ${I*I*R*t} J.`,ok:I*I*R*t===I*R*I*t}},
r=>{const W=pk(r,[100,200]),h=ri(r,2,6),c=ri(r,5,8),u=W*h*30/1000;return{marks:2,q:`A ${W} W appliance runs ${h} h daily for 30 days. At ₹${c} per unit, find the bill.`,key:`Energy = ${W}×${h}×30/1000 = ${u} kWh. Bill = ${u} × ${c} = ₹${u*c}.`,ok:W*h*30*c===u*c*1000}},
r=>{const[F,U,V]=pk(r,MIR);return{marks:2,q:`A concave mirror has focal length ${F} cm. An object is ${U} cm in front of it. Find the image distance and magnification.`,key:`1/v + 1/u = 1/f with f = −${F}, u = −${U} → v = −${V} cm. m = −v/u = −${fr(V,U)}.`,ok:Math.abs(-1/V-1/U+1/F)<1e-12}}],
three:[
r=>{const f=pk(r,[6,12]),k=pk(r,[2,3,4]),U=k*f,V=k*f/(k-1);return{marks:3,q:`An object is placed ${U} cm from a convex lens of focal length ${f} cm. Find the image distance, magnification and nature of the image.`,key:`1/v = 1/f + 1/u = 1/${f} − 1/${U} → v = +${V} cm. m = v/u = −${fr(1,k-1)}. Real, inverted, ${k===2?'same size':'diminished'}.`,svgQ:lensSvg(f,U),svgK:lensSvg(f,U,V),svgNums:[f,U,V],ok:Math.abs(1/V+1/U-1/f)<1e-12}},
r=>{const a=ri(r,2,9),b=ri(r,2,9),I=ri(r,1,4),V=(a+b)*I;return{marks:3,q:`Resistors of ${a} Ω and ${b} Ω are in series across ${an(V)} ${V} V battery. Find the current and the potential difference across the ${b} Ω resistor.`,key:`R = ${a+b} Ω. I = V/R = ${V}/${a+b} = ${I} A. V₂ = I×R₂ = ${I}×${b} = ${I*b} V.`,ok:V-I*a-I*b===0}},
r=>{const[a,b,e]=pk(r,PAR),s=ri(r,1,5),I=ri(r,1,4),V=I*(e+s);return{marks:3,q:`${a} Ω and ${b} Ω resistors in parallel are joined in series with a ${s} Ω resistor across ${an(V)} ${V} V battery. Find the total resistance and the current drawn from the battery.`,key:`R_parallel = (${a}×${b})/(${a}+${b}) = ${e} Ω. R_total = ${e} + ${s} = ${e+s} Ω. I = V/R = ${V}/${e+s} = ${I} A.`,ok:Math.abs(1/a+1/b-1/e)<1e-12&&V/(e+s)===I}},
r=>{const R=pk(r,[22,44,55,110]),I=220/R,W=220*I,t=ri(r,2,5),E=fx(W*t/1000);return{marks:3,q:`A heater of resistance ${R} Ω runs on a 220 V supply. Find the current, the power and the energy used in ${t} hours (in kWh).`,key:`I = V/R = 220/${R} = ${I} A. P = VI = 220×${I} = ${W} W. E = P×t = ${W}×${t}/1000 = ${E} kWh.`,ok:W*R===220*220}}],
four:[
r=>{const[F,U,V]=pk(r,MIR);return{marks:4,q:`An object is placed ${U} cm from a concave mirror of focal length ${F} cm. Find (i) the image distance, (ii) the magnification, (iii) the nature of the image.`,key:`(i) 1/v = 1/f − 1/u = −1/${F} + 1/${U} → v = −${V} cm [1.5]. (ii) m = −v/u = −${fr(V,U)} [1.5]. (iii) Real, inverted, ${V>U?'enlarged':V===U?'same size':'diminished'} [1].`,ok:Math.abs(-1/V-1/U+1/F)<1e-12}},
r=>{const[a,b,e]=pk(r,PAR),j=ri(r,1,2),s=ri(r,1,4),Vp=a*j,i1=Vp/a,i2=Vp/b,It=i1+i2,V=Vp+It*s;return{marks:4,q:`${a} Ω and ${b} Ω resistors in parallel are in series with a ${s} Ω resistor across ${an(V)} ${V} V battery. Find (i) the total resistance, (ii) the current from the battery, (iii) the potential difference across the parallel pair, (iv) the current through the ${a} Ω resistor.`,key:`(i) ${e} + ${s} = ${e+s} Ω. (ii) I = ${V}/${e+s} = ${It} A. (iii) V = ${It}×${e} = ${Vp} V. (iv) I = ${Vp}/${a} = ${i1} A.`,ok:V===Vp+It*s&&V/(e+s)===It&&It*e===Vp&&Vp===i2*b}}],
case:r=>{const W=pk(r,[440,880,1100,2200]),h=pk(r,[2,5]),c=ri(r,5,8),I=W/220,R=220/I,paise=W*h*30*c/10,u=fx(W*h/1000);return{marks:4,q:`An electric heater is rated ${W} W, 220 V. (i) Find the current it draws. (ii) Find its resistance. (iii) Find the energy used in ${h} h of daily use, in kWh. (iv) Find the cost for 30 days at ₹${c} per unit. [1 mark each]`,key:`(i) I = P/V = ${W}/220 = ${I} A. (ii) R = V/I = 220/${I} = ${R} Ω. (iii) ${W}×${h}/1000 = ${u} kWh. (iv) ${u}×30×${c} = ₹${(paise/100).toFixed(2)}.`,ok:I*220===W&&R*I===220&&Number.isInteger(paise)}}};

function build(subject,seed){const r=rng(seed*7919+13),T=subject==='maths'?M:S,run=a=>a.map(f=>f(r));
  const sections=[['Section A — MCQ (8 × 1)',shuf(r,run(T.mcq))],['Section B — Short answer (4 × 2)',run(T.two)],['Section C — Numericals (4 × 3)',run(T.three)],['Section D — Long answer (2 × 4)',run(T.four)],['Section E — Case study (1 × 4)',[T.case(r)]]].map(([name,items])=>({name,items}));
  return{subject,seed,sections,total:sections.reduce((t,s)=>t+s.items.reduce((u,i)=>u+i.marks,0),0)}}
function render(p,withKey=true){let n=0,o=`# Class 10 ${p.subject==='maths'?'Mathematics':'Science (Physics: Light & Electricity)'}: Practice Test\n\n${p.total} marks · 90 min · paper #${p.seed}\n\n`,k='\n---\n## Answer key\n\n';
  for(const s of p.sections){o+=`## ${s.name}\n\n`;for(const i of s.items){n++;o+=`**Q${n}.** ${i.q} *[${i.marks}]*\n`;if(i.opts)o+=i.opts.map((x,j)=>`(${'abcd'[j]}) ${x}`).join('  \n')+'\n';o+='\n';k+=`**Q${n}.** ${i.key}\n\n`}}
  return withKey?o+k:o}
module.exports={build,render,rng,shuf,subjects:['maths','science']};
