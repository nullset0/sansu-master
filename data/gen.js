/* =========================================================
   算数マスター — 数字を変えた問題の生成器 (gen.js)

   ねらい: 決まった問題を何度も解くと「答えの数字」を覚えてしまう。
   2回以上正解した問題が復習で出てきたら、同じ単元・同じレベルの問題を
   新しい数字で作って出す（quiz.js の normalize から呼ぶ）。
   採点は元の問題のカードにつく＝単元の済の判定・毎日の進み方は変わらない。

   生成器の中身は「香里算数道場」(2026-11-04) の 56本をそのまま移した。
   出力はHTMLなので、最後に算数マスターの形（ふつうの文字・分数は a/b）に直す。
   ========================================================= */
window.Gen = (() => {
'use strict';
/* ===================== 数学ユーティリティ ===================== */
const R=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const gcd=(a,b)=>{a=Math.abs(a);b=Math.abs(b);while(b){[a,b]=[b,a%b]}return a};
const lcm=(a,b)=>a/gcd(a,b)*b;
function Q(n,d){d=d===undefined?1:d;if(d<0){n=-n;d=-d}const g=gcd(n,d)||1;return{n:n/g,d:d/g}}
const qa=(x,y)=>Q(x.n*y.d+y.n*x.d,x.d*y.d),qs=(x,y)=>Q(x.n*y.d-y.n*x.d,x.d*y.d),qm=(x,y)=>Q(x.n*y.n,x.d*y.d),qd=(x,y)=>Q(x.n*y.d,x.d*y.n);
const qeq=(x,y)=>x.n*y.d===y.n*x.d, qv=x=>x.n/x.d;
function isTerm(q){let d=q.d;while(d%2===0)d/=2;while(d%5===0)d/=5;return d===1}
function D(q){ // 有限小数なら小数の文字列、そうでなければ分数の文字列
  if(q.d===1)return String(q.n);
  if(!isTerm(q))return frTxt(q);
  let d=q.d,k2=0,k5=0;while(d%2===0){d/=2;k2++}while(d%5===0){d/=5;k5++}
  const k=Math.max(k2,k5),m=Math.pow(10,k),whole=Math.round(q.n*m/q.d);
  let s=String(Math.abs(whole)).padStart(k+1,'0');if(k>0)s=s.slice(0,-k)+'.'+s.slice(-k);
  return(whole<0?'-':'')+s;
}
function frRaw(n,d){return`<span class="frac"><span>${n}</span><span>${d}</span></span>`}
function fr(q,mixed){ // 既約分数をHTMLで。mixed=true なら帯分数
  if(mixed===undefined)mixed=true;
  if(q.d===1)return`<span class="num">${q.n}</span>`;
  const neg=q.n<0,n=Math.abs(q.n);
  if(mixed&&n>q.d){const w=Math.floor(n/q.d);return`${neg?'-':''}<span class="mixed">${w}</span>${frRaw(n%q.d,q.d)}`}
  return(neg?'-':'')+frRaw(n,q.d);
}
function frTxt(q){if(q.d===1)return String(q.n);const neg=q.n<0,n=Math.abs(q.n);if(n>q.d){const w=Math.floor(n/q.d);return`${neg?'-':''}${w}と${n%q.d}/${q.d}`}return`${neg?'-':''}${n}/${q.d}`}
function ansTxt(a,fmt){ if(typeof a==='string')return a; if(fmt==='dec')return D(a); if(fmt==='frac')return frTxt(a); if(fmt==='any'){return isTerm(a)&&a.d!==1?`${frTxt(a)}（${D(a)}）`:frTxt(a)} return a.d===1?String(a.n):(isTerm(a)?D(a):frTxt(a)); }
const divisors=n=>{const r=[];for(let i=1;i<=n;i++)if(n%i===0)r.push(i);return r};
const C=(n,k)=>{let r=1;for(let i=1;i<=k;i++)r=r*(n-k+i)/i;return Math.round(r)};
const calc=t=>`次の計算をしなさい。<br><span class="num" style="font-size:1.15em">${t}</span>`;
const dn=q=>`<span class="num">${D(q)}</span>`;
const WD=['日','月','火','水','木','金','土'];

/* ===================== 問題生成器 ===================== */
const G={};
G.c1=l=>{let t,v,st;
  if(l===1){const k=R(0,2);
    if(k===0){const a=R(10,60),b=R(2,9),c=R(2,9);t=`${a}＋${b}×${c}`;v=a+b*c;st=[`かけ算を先に：${b}×${c}＝${b*c}`,`${a}＋${b*c}＝${v}`]}
    else if(k===1){const b=R(2,9),c=R(2,9),a=b*c+R(5,40);t=`${a}－${b}×${c}`;v=a-b*c;st=[`かけ算を先に：${b}×${c}＝${b*c}`,`${a}－${b*c}＝${v}`]}
    else{const b=R(2,9),k2=R(3,12),a=b*k2,c=R(5,30);t=`${a}÷${b}＋${c}`;v=k2+c;st=[`わり算を先に：${a}÷${b}＝${k2}`,`${k2}＋${c}＝${v}`]}
  }else if(l===2){const k=R(0,2);
    if(k===0){const a=R(3,20),b=R(3,20),c=R(2,9),s=a+b,d=R(1,s*c-1);t=`(${a}＋${b})×${c}－${d}`;v=s*c-d;st=[`かっこの中を先に：${a}＋${b}＝${s}`,`${s}×${c}＝${s*c}`,`${s*c}－${d}＝${v}`]}
    else if(k===1){const b=R(10,30),c=R(2,b-2),a=R(3,9),d=R(2,40),s=b-c;t=`${a}×(${b}－${c})＋${d}`;v=a*s+d;st=[`かっこの中を先に：${b}－${c}＝${s}`,`${a}×${s}＝${a*s}`,`${a*s}＋${d}＝${v}`]}
    else{const c=R(2,9),k2=R(2,9),b=c*k2,d=R(2,9),a=k2*d+R(3,30);t=`${a}－${b}÷${c}×${d}`;v=a-k2*d;st=[`わり算・かけ算は左から：${b}÷${c}＝${k2}`,`${k2}×${d}＝${k2*d}`,`${a}－${k2*d}＝${v}`]}
  }else{const k=R(0,1);
    if(k===0){const e=R(2,9),k2=R(2,9),cd=e*k2,c=R(1,cd-1),d=cd-c,a=R(3,12),b=R(3,12);t=`${a}×${b}－(${c}＋${d})÷${e}`;v=a*b-k2;st=[`かっこの中：${c}＋${d}＝${cd}`,`${cd}÷${e}＝${k2}、${a}×${b}＝${a*b}`,`${a*b}－${k2}＝${v}`]}
    else{const b=R(2,9),k2=R(2,9),a=b*k2,c=R(2,9),d=R(1,k2*c-1),e=R(2,30);t=`${a}÷${b}×${c}－${d}＋${e}`;v=k2*c-d+e;st=[`左から順に：${a}÷${b}＝${k2}`,`${k2}×${c}＝${k2*c}`,`${k2*c}－${d}＋${e}＝${v}`]}
  }
  return{q:calc(t),a:Q(v),fmt:'int',steps:st}};
G.c2=l=>{
  if(l===1){
    if(R(0,1)){const a=Q(R(11,99),10),b=R(2,9),p=qm(a,Q(b));return{q:calc(`${D(a)}×${b}`),a:p,fmt:'dec',steps:[`小数点を無視して ${a.n}×${b}＝${a.n*b}`,`小数点以下は1けた → ${D(p)}`]}}
    const b=R(2,9),q=Q(R(11,99),10),a=qm(q,Q(b));return{q:calc(`${D(a)}÷${b}`),a:q,fmt:'dec',steps:[`${D(a)}÷${b} を筆算。商の小数点はわられる数と同じ位置`,`答え ${D(q)}`]};
  }
  if(l===2){const a=Q(R(11,99),10),b=Q(R(11,99),10),p=qm(a,b);return{q:calc(`${D(a)}×${D(b)}`),a:p,fmt:'dec',steps:[`小数点を無視して ${a.n}×${b.n}＝${a.n*b.n}`,`小数点以下は 1＋1＝2けた → ${D(p)}`]}}
  const dv=pick([Q(R(2,9),10),Q(R(12,48),10)]),q=Q(R(11,99),10),a=qm(q,dv);
  return{q:calc(`${D(a)}÷${D(dv)}`),a:q,fmt:'dec',steps:[`わる数を整数にする：小数点を1つ右へ → ${D(qm(a,Q(10)))}÷${D(qm(dv,Q(10)))}`,`筆算して ${D(q)}`]}};
G.c3=l=>{const ds=[2,3,4,5,6,8,9,10,12];let d1=pick(ds),d2=pick(ds);if(d1===d2)d2=d1===12?8:12;
  let a=Q(R(1,d1-1),d1),b=Q(R(1,d2-1),d2);if(a.d===1)a=Q(1,d1);if(b.d===1)b=Q(1,d2);
  if(l===3){a=qa(a,Q(R(1,3)));b=qa(b,Q(R(1,2)))}
  const add=l===1?true:R(0,1)===1;let r;if(add)r=qa(a,b);else{if(qv(a)<qv(b))[a,b]=[b,a];r=qs(a,b)}
  const L=lcm(a.d,b.d),an=a.n*L/a.d,bn=b.n*L/b.d;const st=[];
  if(l===3)st.push(`帯分数は仮分数に直す：${fr(a,false)}、${fr(b,false)}`);
  st.push(`通分する（分母を ${L} に）：${frRaw(an,L)}${add?'＋':'－'}${frRaw(bn,L)}`,`分子を計算：${frRaw(add?an+bn:an-bn,L)}`,`約分・帯分数に直して ${fr(r)}`);
  return{q:calc(`${fr(a)}${add?'＋':'－'}${fr(b)}`),a:r,fmt:'frac',steps:st}};
G.c4=l=>{const mk=()=>{let d=pick([2,3,4,5,6,7,8,9,10]),n=R(1,8);while(n%d===0)n=R(1,8);return Q(n,d)};
  let a=mk(),b=mk();if(l===3)a=qa(a,Q(R(1,3)));const mul=l===1||R(0,1)===1;const r=mul?qm(a,b):qd(a,b);const st=[];
  if(l===3)st.push(`帯分数は仮分数に：${fr(a,false)}`);
  if(mul)st.push(`分子どうし、分母どうしをかける：${frRaw(a.n*b.n,a.d*b.d)}`);else st.push(`わる数の逆数をかける：${fr(a,false)}×${fr(Q(b.d,b.n),false)}`,`分子どうし、分母どうし：${frRaw(a.n*b.d,a.d*b.n)}`);
  st.push(`約分して ${fr(r)}`);
  return{q:calc(`${fr(a)}${mul?'×':'÷'}${fr(b)}`),a:r,fmt:'frac',steps:st}};
G.c5=l=>{const decs=[[Q(1,2),'0.5'],[Q(1,4),'0.25'],[Q(3,4),'0.75'],[Q(1,5),'0.2'],[Q(2,5),'0.4'],[Q(3,5),'0.6'],[Q(4,5),'0.8'],[Q(1,8),'0.125'],[Q(3,2),'1.5'],[Q(5,4),'1.25']];
  const [dq,ds]=pick(decs);let f=Q(R(1,5),pick([3,4,6,8,5]));while(f.d===1)f=Q(R(1,5),pick([3,4,6,8,5]));
  if(l===1){const r=qa(dq,f);return{q:calc(`${ds}＋${fr(f)}`),a:r,fmt:'any',steps:[`小数を分数に直す：${ds}＝${fr(dq,false)}`,`${fr(dq,false)}＋${fr(f)}＝${fr(r)}`]}}
  if(l===2){const r=qm(dq,f);return{q:calc(`${ds}×${fr(f)}`),a:r,fmt:'any',steps:[`小数を分数に直す：${ds}＝${fr(dq,false)}`,`${fr(dq,false)}×${fr(f)}＝${frRaw(dq.n*f.n,dq.d*f.d)}＝${fr(r)}`]}}
  const r=qd(f,dq);return{q:calc(`${fr(f)}÷${ds}`),a:r,fmt:'any',steps:[`小数を分数に直す：${ds}＝${fr(dq,false)}`,`逆数をかける：${fr(f)}×${fr(Q(dq.d,dq.n),false)}＝${fr(r)}`]}};
G.c6=l=>{const x=R(2,30);
  if(l===1){if(R(0,1)){const a=R(2,20),b=R(2,9),c=(x+a)*b;return{q:`□にあてはまる数を求めなさい。<br><span class="num" style="font-size:1.15em">(□＋${a})×${b}＝${c}</span>`,a:Q(x),fmt:'int',steps:[`×${b} の逆は ÷${b}：${c}÷${b}＝${x+a}`,`＋${a} の逆は －${a}：${x+a}－${a}＝${x}`]}}
    const a=R(2,9),b=R(1,x*a-1),c=x*a-b;return{q:`□にあてはまる数を求めなさい。<br><span class="num" style="font-size:1.15em">□×${a}－${b}＝${c}</span>`,a:Q(x),fmt:'int',steps:[`－${b} の逆は ＋${b}：${c}＋${b}＝${x*a}`,`×${a} の逆は ÷${a}：${x*a}÷${a}＝${x}`]}}
  if(l===2){if(R(0,1)){const b=R(2,9),c=R(2,9),a=x+b*c;return{q:`□にあてはまる数を求めなさい。<br><span class="num" style="font-size:1.15em">(${a}－□)÷${b}＝${c}</span>`,a:Q(x),fmt:'int',steps:[`÷${b} の逆は ×${b}：${c}×${b}＝${b*c}`,`${a}－□＝${b*c} なので □＝${a}－${b*c}＝${x}`]}}
    const b=R(2,9),c=R(1,40),a=x*b+c;return{q:`□にあてはまる数を求めなさい。<br><span class="num" style="font-size:1.15em">${a}－□×${b}＝${c}</span>`,a:Q(x),fmt:'int',steps:[`□×${b} のかたまりは ${a}－${c}＝${x*b}`,`${x*b}÷${b}＝${x}`]}}
  const x3=R(2,9),a=R(2,5),c=R(2,9),k=R(Math.ceil(x3*a/c)+1,Math.ceil(x3*a/c)+6),b=c*k-x3*a;
  return{q:`□にあてはまる数を求めなさい。<br><span class="num" style="font-size:1.15em">(□×${a}＋${b})÷${c}＝${k}</span>`,a:Q(x3),fmt:'int',steps:[`÷${c} の逆：${k}×${c}＝${c*k}`,`＋${b} の逆：${c*k}－${b}＝${x3*a}`,`×${a} の逆：${x3*a}÷${a}＝${x3}`]}};
G.c7=l=>{
  if(l===1){if(R(0,1)){const k=R(3,12)*4,a=25;return{q:calc(`${a}×${k}`),a:Q(a*k),fmt:'int',steps:[`25×4＝100 を作る：${k}＝4×${k/4}`,`25×4×${k/4}＝100×${k/4}＝${a*k}`]}}
    const a=R(12,89);return{q:calc(`99×${a}`),a:Q(99*a),fmt:'int',steps:[`99＝100－1 と考える`,`100×${a}－${a}＝${100*a}－${a}＝${99*a}`]}}
  if(l===2){const a=R(12,99),b=R(13,87),c=100-b;if(R(0,1))return{q:calc(`${a}×${b}＋${a}×${c}`),a:Q(100*a),fmt:'int',steps:[`分配法則：${a}×(${b}＋${c})`,`${a}×100＝${100*a}`]};
    const d=R(2,9)*10,b2=R(d+5,d+40);return{q:calc(`${a}×${b2}－${a}×${b2-d}`),a:Q(a*d),fmt:'int',steps:[`分配法則：${a}×(${b2}－${b2-d})`,`${a}×${d}＝${a*d}`]}}
  const s=pick([10,20,50,100]),a=R(2,s-2),b=R(1,s-a),c=s-a-b;let t,sum,st;
  if(c>0){t=`3.14×${a}＋3.14×${b}＋3.14×${c}`;sum=s;st=[`3.14 でまとめる：3.14×(${a}＋${b}＋${c})`,`3.14×${s}＝${D(Q(314*s,100))}`]}
  else{const e=R(1,a-1);t=`3.14×${a+e}－3.14×${e}＋3.14×${b}`;sum=a+b;st=[`3.14 でまとめる：3.14×(${a+e}－${e}＋${b})`,`3.14×${sum}＝${D(Q(314*sum,100))}`]}
  return{q:calc(t),a:Q(314*sum,100),fmt:'dec',steps:st}};
G.c8=l=>{const T1=[['km','m',1000],['m','cm',100],['cm','mm',10],['L','mL',1000],['L','dL',10],['kg','g',1000],['t','kg',1000],['時間','分',60],['分','秒',60]];
  const T3=[['ha','m²',10000],['m²','cm²',10000],['km²','ha',100],['a','m²',100],['m³','L',1000],['L','cm³',1000],['m³','cm³',1000000]];
  const [big,small,k]=pick(l===3?T3:T1);
  if(l===2){const v=Q(R(11,99),10),vs=qm(v,Q(k));return{q:`${D(vs)} ${small} は何 ${big} ですか。`,a:v,fmt:'dec',unit:big,steps:[`1 ${big}＝${k} ${small} だから ${small}→${big} は ÷${k}`,`${D(vs)}÷${k}＝${D(v)}`]}}
  const v=pick([Q(R(2,9)),Q(R(11,99),10),Q(R(1,9),4)]);const r=qm(v,Q(k));
  return{q:`${D(v)} ${big} は何 ${small} ですか。`,a:r,fmt:'dec',unit:small,steps:[`1 ${big}＝${k} ${small}`,`${D(v)}×${k}＝${D(r)}`]}};
G.n1=l=>{const g=pick([4,6,8,9,12,15,18,24]);let x=R(2,9),y=R(2,9);while(gcd(x,y)!==1||x===y){x=R(2,9);y=R(2,9)}const a=g*x,b=g*y;
  if(l===1)return{q:`${a} と ${b} の最大公約数を求めなさい。`,a:Q(g),fmt:'int',steps:[`${a}＝${g}×${x}、${b}＝${g}×${y}（連除法で共通の数で割っていく）`,`共通にふくまれる最大の数は ${g}`]};
  if(l===2){const dv=divisors(g);return{q:`${a} と ${b} の公約数は全部で何個ありますか。`,a:Q(dv.length),fmt:'int',unit:'個',steps:[`公約数は最大公約数の約数`,`最大公約数は ${g}`,`${g} の約数は ${dv.join('、')} の ${dv.length} 個`]}}
  return{q:`りんご ${a} 個とみかん ${b} 個を、あまりが出ないように同じ数ずつ、できるだけ多くの子どもに配ります。何人に配れますか。`,a:Q(g),fmt:'int',unit:'人',steps:[`「あまりなく・できるだけ多く」→ 最大公約数`,`${a} と ${b} の最大公約数は ${g}`]}};
G.n2=l=>{const [a,b]=pick([[4,6],[6,8],[6,9],[8,12],[9,12],[10,15],[12,18],[8,10],[12,16],[15,20],[14,21]]);const L=lcm(a,b);
  if(l===1)return{q:`${a} と ${b} の最小公倍数を求めなさい。`,a:Q(L),fmt:'int',steps:[`連除法：共通に割れる数で割り、L字にかける`,`最小公倍数は ${L}`]};
  if(l===2){const r=L*Math.ceil(100/L);return{q:`${a} でも ${b} でも割り切れる整数のうち、いちばん小さい3けたの数を求めなさい。`,a:Q(r),fmt:'int',steps:[`${a} と ${b} の公倍数＝${L} の倍数`,`${L} の倍数で 100 以上の最小は ${r}`]}}
  return{q:`駅から A 行きのバスは ${a} 分おき、B 行きのバスは ${b} 分おきに出ます。午前9時に同時に出たあと、次に同時に出るのは何分後ですか。`,a:Q(L),fmt:'int',unit:'分後',steps:[`同時に出る → ${a} と ${b} の公倍数`,`最小公倍数 ${L} 分後`]}};
G.n3=l=>{const N=pick([100,200,300]),a=pick([3,4,6,7,8,9]);let b=pick([4,5,6,8]);while(b===a)b=pick([4,5,6,8]);const L=lcm(a,b);
  if(l===1)return{q:`1 から ${N} までの整数のうち、${a} の倍数は何個ありますか。`,a:Q(Math.floor(N/a)),fmt:'int',unit:'個',steps:[`${N}÷${a}＝${Math.floor(N/a)} あまり ${N%a}`,`商の ${Math.floor(N/a)} 個`]};
  if(l===2)return{q:`1 から ${N} までの整数のうち、${a} の倍数でも ${b} の倍数でもある数は何個ありますか。`,a:Q(Math.floor(N/L)),fmt:'int',unit:'個',steps:[`${a} と ${b} の公倍数＝最小公倍数 ${L} の倍数`,`${N}÷${L}＝${Math.floor(N/L)} あまり ${N%L} → ${Math.floor(N/L)} 個`]};
  const r=Math.floor(N/a)-Math.floor(N/L);return{q:`1 から ${N} までの整数のうち、${a} の倍数だが ${b} の倍数ではない数は何個ありますか。`,a:Q(r),fmt:'int',unit:'個',steps:[`${a} の倍数：${Math.floor(N/a)} 個`,`${a} と ${b} の公倍数（${L} の倍数）：${Math.floor(N/L)} 個`,`${Math.floor(N/a)}－${Math.floor(N/L)}＝${r} 個`]}};
const roundSig=(x,s)=>{const p=Math.pow(10,Math.floor(Math.log10(x))-s+1);return Math.round(x/p)*p};
G.n4=l=>{const x=R(1234,98765);
  if(l===1){const r=roundSig(x,2);return{q:`${x} を四捨五入して、上から2けたのがい数にしなさい。`,a:Q(r),fmt:'int',steps:[`上から3けた目を四捨五入する`,`${x} → ${r}`]}}
  if(l===2){const r=Math.round(x/1000)*1000;return{q:`${x} を百の位で四捨五入しなさい。`,a:Q(r),fmt:'int',steps:[`百の位の数字 ${Math.floor(x/100)%10} を四捨五入 → 千の位までのがい数`,`${x} → ${r}`]}}
  const base=R(12,98)*100,hi=R(0,1);const r=hi?base+49:base-50;
  return{q:`四捨五入して上から2けたのがい数にすると ${base} になる整数のうち、${hi?'いちばん大きい':'いちばん小さい'}数を求めなさい。`,a:Q(r),fmt:'int',steps:[`${base} になる範囲は ${base-50} 以上 ${base+49} 以下（${base+50} は切り上がる）`,`${hi?'最大':'最小'}は ${r}`]}};
G.n5=l=>{const [a,b]=pick([[3,4],[4,5],[3,5],[5,6],[4,7],[6,7],[5,8],[7,8],[3,7]]);const L=lcm(a,b);
  if(l===1){const r=R(1,Math.min(a,b)-1);return{q:`${a} で割っても ${b} で割っても ${r} あまる整数のうち、いちばん小さい数を求めなさい。`,a:Q(L+r),fmt:'int',steps:[`${r} を引くと ${a} でも ${b} でも割り切れる → ${L} の倍数`,`最小は ${L}＋${r}＝${L+r}`]}}
  if(l===2){const r=R(1,Math.min(a,b)-1);let v=L*Math.floor((99-r)/L)+r;return{q:`${a} で割っても ${b} で割っても ${r} あまる整数のうち、いちばん大きい2けたの数を求めなさい。`,a:Q(v),fmt:'int',steps:[`${L} の倍数＋${r} の形`,`99 以下で最大：${L}×${(v-r)/L}＋${r}＝${v}`]}}
  return{q:`${a} で割ると ${a-1} あまり、${b} で割ると ${b-1} あまる整数のうち、いちばん小さい数を求めなさい。`,a:Q(L-1),fmt:'int',steps:[`あと 1 あれば割り切れる → 公倍数 －1`,`${L}－1＝${L-1}`]}};
G.r1=l=>{const a=R(2,30)*20,p=pick([5,10,15,20,25,30,40,45,50,60,75,80]),b=a*p/100;
  if(l===1)return{q:`${a} 人の ${p}% は何人ですか。`,a:Q(b),fmt:'int',unit:'人',steps:[`くらべる量＝もとにする量×割合`,`${a}×${p/100}＝${b}`]};
  if(l===2)return{q:`${b} は ${a} の何%ですか。`,a:Q(p),fmt:'int',unit:'%',steps:[`割合＝くらべる量÷もとにする量`,`${b}÷${a}＝${p/100} → ${p}%`]};
  return{q:`ある数の ${p}% が ${b} です。ある数を求めなさい。`,a:Q(a),fmt:'int',steps:[`もとにする量＝くらべる量÷割合`,`${b}÷${p/100}＝${a}`]}};
G.r2=l=>{
  if(l===1){const a=R(5,50)*100,w=R(1,4);return{q:`定価 ${a} 円の品物を ${w} 割引きで買います。代金はいくらですか。`,a:Q(a*(10-w)/10),fmt:'int',unit:'円',steps:[`${w} 割引き＝定価の ${10-w} 割`,`${a}×${(10-w)/10}＝${a*(10-w)/10}`]}}
  if(l===2){const a=R(2,90)*100;return{q:`税ぬき ${a} 円の品物に 10% の消費税がかかります。税こみの代金はいくらですか。`,a:Q(a*11/10),fmt:'int',unit:'円',steps:[`税こみは 110%＝1.1 倍`,`${a}×1.1＝${a*11/10}`]}}
  const a=R(4,20)*500,p=pick([10,20,30,50]),q=pick([10,20,30]);const r=a*(100-p)*(100-q)/10000;
  return{q:`定価 ${a} 円の品物を ${p}% 引きにし、さらにその値段から ${q}% 引きにしました。売り値はいくらですか。`,a:Q(r),fmt:'int',unit:'円',steps:[`${p}% 引き：${a}×${(100-p)/100}＝${a*(100-p)/100}`,`さらに ${q}% 引き：${a*(100-p)/100}×${(100-q)/100}＝${r}（${p+q}% 引きではない）`]}};
G.r3=l=>{
  if(l===1){const g=pick([2,3,4,5,6,10,12]);let x=R(2,9),y=R(2,9);while(gcd(x,y)!==1||x===y){x=R(2,9);y=R(2,9)}return{q:`${g*x}：${g*y} を、もっとも簡単な整数の比にしなさい。`,a:`${x}:${y}`,fmt:'ratio',steps:[`両方を最大公約数 ${g} で割る`,`${x}：${y}`]}}
  if(l===2){const a=R(1,5),b=R(a+1,8),k=R(10,100)*10,S=(a+b)*k;return{q:`${S} 円を兄と弟で ${b}：${a} に分けます。兄はいくらもらえますか。`,a:Q(b*k),fmt:'int',unit:'円',steps:[`全体を ${a+b} 等分：${S}÷${a+b}＝${k}`,`兄は ${b} 個分：${k}×${b}＝${b*k}`]}}
  const a=R(3,9),b=R(1,a-1),k=R(5,60)*10,d=(a-b)*k;return{q:`兄と弟の持っているお金の比は ${a}：${b} で、兄は弟より ${d} 円多く持っています。兄はいくら持っていますか。`,a:Q(a*k),fmt:'int',unit:'円',steps:[`比の差 ${a}－${b}＝${a-b} が ${d} 円`,`1 にあたる量：${d}÷${a-b}＝${k}`,`兄：${k}×${a}＝${a*k}`]}};
G.r4=l=>{
  if(l===1){let c=R(1,7),d=R(2,9);while(gcd(c,d)!==1||c===d){c=R(1,7);d=R(2,9)}const k=R(2,8);return{q:`□にあてはまる数を求めなさい。<br><span class="num" style="font-size:1.15em">□：${d*k}＝${c}：${d}</span>`,a:Q(c*k),fmt:'int',steps:[`${d}→${d*k} は ×${k}`,`${c}×${k}＝${c*k}`]}}
  if(l===2){let a=R(2,12),b=R(2,12);while(a===b){b=R(2,12)}return{q:`${a}：${b} の比の値を求めなさい。`,a:Q(a,b),fmt:'frac',steps:[`比の値＝前の数÷後の数`,`${a}÷${b}＝${frTxt(Q(a,b))}`]}}
  const a=R(1,5),b=R(2,6),c=R(2,6),d=R(1,5);const L=lcm(b,c);const A=a*L/b,B=L,Cc=d*L/c;const g=gcd(gcd(A,B),Cc);
  return{q:`A：B＝${a}：${b}、B：C＝${c}：${d} のとき、A：B：C をもっとも簡単な整数の比で表しなさい。`,a:`${A/g}:${B/g}:${Cc/g}`,fmt:'ratio',steps:[`B をそろえる：${b} と ${c} の最小公倍数 ${L}`,`A：B＝${A}：${L}、B：C＝${L}：${Cc}`,`A：B：C＝${A/g}：${B/g}：${Cc/g}`]}};
G.s1=l=>{
  if(l===1){if(R(0,1)){const v=pick([40,50,60,70,80,90]),t=R(5,30);return{q:`分速 ${v} m で ${t} 分歩くと、何 m 進みますか。`,a:Q(v*t),fmt:'int',unit:'m',steps:[`道のり＝速さ×時間`,`${v}×${t}＝${v*t}`]}}
    const v=pick([30,40,45,60,80]),t=R(2,5);return{q:`時速 ${v} km の車で ${t} 時間走ると、何 km 進みますか。`,a:Q(v*t),fmt:'int',unit:'km',steps:[`道のり＝速さ×時間`,`${v}×${t}＝${v*t}`]}}
  if(l===2){if(R(0,1)){const v=pick([50,60,75,80]),t=R(4,25),d=v*t;return{q:`${d} m の道のりを分速 ${v} m で歩くと、何分かかりますか。`,a:Q(t),fmt:'int',unit:'分',steps:[`時間＝道のり÷速さ`,`${d}÷${v}＝${t}`]}}
    const t=R(2,6),v=pick([35,40,45,55,60,65]),d=v*t;return{q:`${d} km を ${t} 時間で走る電車の速さは、時速何 km ですか。`,a:Q(v),fmt:'int',unit:'km',steps:[`速さ＝道のり÷時間`,`${d}÷${t}＝${v}`]}}
  const x=pick([5,10,15,20,25]),y=pick([2,4,5,8,10]);const r=Q(x*y*60,1000);
  return{q:`秒速 ${x} m で ${y} 分走ると、何 km 進みますか。`,a:r,fmt:'dec',unit:'km',steps:[`${y} 分＝${y*60} 秒`,`${x}×${y*60}＝${x*y*60} m`,`${x*y*60} m＝${D(r)} km`]}};
G.s2=l=>{
  if(l===1){if(R(0,1)){const a=pick([36,54,72,90,108,144]);return{q:`時速 ${a} km は秒速何 m ですか。`,a:Q(a*1000/3600),fmt:'int',unit:'m',steps:[`${a} km＝${a*1000} m、1 時間＝3600 秒`,`${a*1000}÷3600＝${a*1000/3600}`]}}
    const b=pick([5,10,15,20,25]);return{q:`秒速 ${b} m は時速何 km ですか。`,a:Q(b*3600/1000),fmt:'dec',unit:'km',steps:[`1 時間＝3600 秒 → ${b}×3600＝${b*3600} m`,`${b*3600} m＝${b*3.6} km`]}}
  if(l===2){const v=R(5,30)*10;const r=Q(v*60,1000);return{q:`分速 ${v} m は時速何 km ですか。`,a:r,fmt:'dec',unit:'km',steps:[`1 時間＝60 分 → ${v}×60＝${v*60} m`,`${v*60} m＝${D(r)} km`]}}
  const a=pick([30,36,42,48,54,60,66,72,90]);return{q:`時速 ${a} km は分速何 m ですか。`,a:Q(a*1000/60),fmt:'int',unit:'m',steps:[`${a} km＝${a*1000} m`,`${a*1000}÷60＝${a*1000/60}`]}};
G.g1=l=>{
  if(l===1){const a=R(25,80),b=R(25,80);return{q:`三角形の2つの角が ${a}° と ${b}° のとき、残りの角は何度ですか。`,a:Q(180-a-b),fmt:'int',unit:'°',steps:[`三角形の内角の和は 180°`,`180－${a}－${b}＝${180-a-b}`]}}
  if(l===2){if(R(0,1)){const a=R(30,80),b=R(30,80);return{q:`三角形の2つの内角が ${a}° と ${b}° のとき、残りの角の外角は何度ですか。`,a:Q(a+b),fmt:'int',unit:'°',steps:[`外角＝となり合わない2つの内角の和`,`${a}＋${b}＝${a+b}`]}}
    const a=R(10,70)*2;return{q:`頂角が ${a}° の二等辺三角形の底角は何度ですか。`,a:Q((180-a)/2),fmt:'int',unit:'°',steps:[`底角は2つとも等しい`,`(180－${a})÷2＝${(180-a)/2}`]}}
  if(R(0,1)){const b=R(30,85);return{q:`底角が ${b}° の二等辺三角形の頂角は何度ですか。`,a:Q(180-2*b),fmt:'int',unit:'°',steps:[`底角が2つ：${b}×2＝${2*b}`,`180－${2*b}＝${180-2*b}`]}}
  const a=R(20,70),b=R(20,60);return{q:`三角形 ABC で、角 A は ${a}°、角 B は ${b}° です。辺 BC を C の先までのばした直線上に点 D をとるとき、角 ACD は何度ですか。`,a:Q(a+b),fmt:'int',unit:'°',steps:[`角 ACD は三角形 ABC の角 C の外角`,`外角＝となり合わない 2 つの内角の和＝${a}＋${b}＝${a+b}`]}};
G.g2=l=>{
  if(l===1){const n=R(5,10);return{q:`${n} 角形の内角の和は何度ですか。`,a:Q((n-2)*180),fmt:'int',unit:'°',steps:[`${n} 角形は三角形 ${n-2} 個に分けられる`,`180×${n-2}＝${(n-2)*180}`]}}
  if(l===2){const n=pick([5,6,8,9,10,12]);return{q:`正 ${n} 角形の1つの内角は何度ですか。`,a:Q((n-2)*180/n),fmt:'int',unit:'°',steps:[`内角の和：180×(${n}－2)＝${(n-2)*180}`,`${(n-2)*180}÷${n}＝${(n-2)*180/n}`]}}
  if(R(0,1)){const n=pick([5,6,8,9,10,12,15,18,20]);return{q:`正 ${n} 角形の1つの外角は何度ですか。`,a:Q(360/n),fmt:'int',unit:'°',steps:[`外角の和はどんな多角形でも 360°`,`360÷${n}＝${360/n}`]}}
  const n=R(5,12);return{q:`内角の和が ${(n-2)*180}° になる多角形は何角形ですか。`,a:Q(n),fmt:'int',unit:'角形',steps:[`${(n-2)*180}÷180＝${n-2}（三角形の数）`,`${n-2}＋2＝${n} 角形`]}};
G.g3=l=>{
  if(l===1){if(R(0,1)){const a=R(4,20),b=R(3,16);const r=Q(a*b,2);return{q:`底辺 ${a} cm、高さ ${b} cm の三角形の面積を求めなさい。`,a:r,fmt:'dec',unit:'cm²',steps:[`三角形の面積＝底辺×高さ÷2`,`${a}×${b}÷2＝${D(r)}`]}}
    const a=R(4,20),b=R(3,16);return{q:`底辺 ${a} cm、高さ ${b} cm の平行四辺形の面積を求めなさい。`,a:Q(a*b),fmt:'int',unit:'cm²',steps:[`平行四辺形の面積＝底辺×高さ`,`${a}×${b}＝${a*b}`]}}
  if(l===2){const a=R(3,12),b=R(a+1,20),h=R(3,12);const r=Q((a+b)*h,2);return{q:`上底 ${a} cm、下底 ${b} cm、高さ ${h} cm の台形の面積を求めなさい。`,a:r,fmt:'dec',unit:'cm²',steps:[`台形の面積＝(上底＋下底)×高さ÷2`,`(${a}＋${b})×${h}÷2＝${D(r)}`]}}
  const d1=R(4,20),d2=R(4,20);const r=Q(d1*d2,2);return{q:`対角線の長さが ${d1} cm と ${d2} cm のひし形の面積を求めなさい。`,a:r,fmt:'dec',unit:'cm²',steps:[`ひし形の面積＝対角線×対角線÷2`,`${d1}×${d2}÷2＝${D(r)}`]}};
G.g4=l=>{const r=pick([2,3,4,5,6,10]);
  if(l===1){if(R(0,1)){const A=Q(r*r*314,100);return{q:`半径 ${r} cm の円の面積を求めなさい。（円周率は 3.14）`,a:A,fmt:'dec',unit:'cm²',steps:[`円の面積＝半径×半径×3.14`,`${r}×${r}×3.14＝${D(A)}`]}}
    const Cc=Q(2*r*314,100);return{q:`直径 ${2*r} cm の円の円周の長さを求めなさい。（円周率は 3.14）`,a:Cc,fmt:'dec',unit:'cm',steps:[`円周＝直径×3.14`,`${2*r}×3.14＝${D(Cc)}`]}}
  if(l===2){if(R(0,1)){const A=Q(r*r*314,200);return{q:`半径 ${r} cm の半円の面積を求めなさい。（円周率は 3.14）`,a:A,fmt:'dec',unit:'cm²',steps:[`円の面積の半分`,`${r}×${r}×3.14÷2＝${D(A)}`]}}
    const P=qa(Q(r*314,100),Q(2*r));return{q:`半径 ${r} cm の半円の、まわりの長さを求めなさい。（円周率は 3.14）`,a:P,fmt:'dec',unit:'cm',steps:[`曲線部分：${2*r}×3.14÷2＝${D(Q(r*314,100))}`,`直径 ${2*r} を足す：${D(P)}`]}}
  let th,A;for(let i=0;i<50;i++){th=pick([45,60,90,120,270]);A=Q(r*r*314*th,100*360);if(isTerm(A))break}
  return{q:`半径 ${r} cm、中心角 ${th}° のおうぎ形の面積を求めなさい。（円周率は 3.14）`,a:A,fmt:'dec',unit:'cm²',steps:[`おうぎ形＝円×（中心角÷360）`,`${r}×${r}×3.14×${frTxt(Q(th,360))}＝${D(A)}`]}};
G.g5=l=>{
  if(l===1){if(R(0,1)){const a=R(3,12),b=R(3,12),c=R(3,12);return{q:`たて ${a} cm、横 ${b} cm、高さ ${c} cm の直方体の体積を求めなさい。`,a:Q(a*b*c),fmt:'int',unit:'cm³',steps:[`直方体の体積＝たて×横×高さ`,`${a}×${b}×${c}＝${a*b*c}`]}}
    const a=R(3,12);return{q:`1辺が ${a} cm の立方体の体積を求めなさい。`,a:Q(a*a*a),fmt:'int',unit:'cm³',steps:[`${a}×${a}×${a}＝${a*a*a}`]}}
  if(l===2){if(R(0,1)){const a=R(4,12),b=R(3,10),h=R(5,15);const r=Q(a*b*h,2);return{q:`底面が底辺 ${a} cm、高さ ${b} cm の三角形で、高さが ${h} cm の三角柱の体積を求めなさい。`,a:r,fmt:'dec',unit:'cm³',steps:[`角柱の体積＝底面積×高さ`,`底面積：${a}×${b}÷2＝${D(Q(a*b,2))}`,`${D(Q(a*b,2))}×${h}＝${D(r)}`]}}
    const r=pick([2,3,4,5,10]),h=R(3,12);const V=Q(r*r*314*h,100);return{q:`底面の半径 ${r} cm、高さ ${h} cm の円柱の体積を求めなさい。（円周率は 3.14）`,a:V,fmt:'dec',unit:'cm³',steps:[`底面積：${r}×${r}×3.14＝${D(Q(r*r*314,100))}`,`×高さ ${h}＝${D(V)}`]}}
  const a=pick([20,25,40,50]),b=pick([20,30,40]),h=R(5,30);const VL=Q(a*b*h,1000);
  return{q:`たて ${a} cm、横 ${b} cm の直方体の水そうに、水を ${D(VL)} L 入れました。水の深さは何 cm になりますか。`,a:Q(h),fmt:'int',unit:'cm',steps:[`1 L＝1000 cm³ → ${D(VL)} L＝${a*b*h} cm³`,`深さ＝体積÷底面積＝${a*b*h}÷${a*b}＝${h}`]}};
G.g6=l=>{
  if(l===1){const a=R(10,20),b=R(8,16),c=R(3,a-4),d=R(3,b-3);return{q:`たて ${b} cm、横 ${a} cm の長方形から、角の部分をたて ${d} cm、横 ${c} cm の長方形の形に切り取りました。残った図形（L字形）の面積を求めなさい。`,a:Q(a*b-c*d),fmt:'int',unit:'cm²',steps:[`大きい長方形：${a}×${b}＝${a*b}`,`切り取った分：${c}×${d}＝${c*d}`,`${a*b}－${c*d}＝${a*b-c*d}`]}}
  if(l===2){const a=R(12,30),b=R(10,25),w=R(1,3);return{q:`たて ${b} m、横 ${a} m の長方形の畑に、幅 ${w} m の道をたてと横に1本ずつまっすぐ通しました。道をのぞいた畑の面積を求めなさい。`,a:Q((a-w)*(b-w)),fmt:'int',unit:'m²',steps:[`道を端に寄せて考える`,`(${a}－${w})×(${b}－${w})＝${(a-w)*(b-w)}`]}}
  const a=pick([4,6,8,10,12,20]);const A=qs(Q(a*a),Q(a*a*314,400));
  return{q:`1辺 ${a} cm の正方形の中に、ぴったり入る円をかきました。正方形の、円の外側の部分の面積を求めなさい。（円周率は 3.14）`,a:A,fmt:'dec',unit:'cm²',steps:[`円の半径は ${a/2} cm`,`正方形 ${a*a} － 円 ${D(Q(a*a*314,400))}＝${D(A)}`]}};
G.g7=l=>{
  if(l===1){const N=pick([1000,2000,5000]),a=R(2,9);return{q:`縮尺 1/${N} の地図で ${a} cm の長さは、実際には何 m ですか。`,a:Q(a*N,100),fmt:'dec',unit:'m',steps:[`実際＝地図×${N}：${a}×${N}＝${a*N} cm`,`${a*N} cm＝${D(Q(a*N,100))} m`]}}
  if(l===2){const a=pick([2,4,6,8,10,12]);const r=Q(a*25000,100000);return{q:`縮尺 1/25000 の地図で ${a} cm の道のりは、実際には何 km ですか。`,a:r,fmt:'dec',unit:'km',steps:[`${a}×25000＝${a*25000} cm`,`cm→km は ÷100000：${D(r)} km`]}}
  const Dk=R(1,6);return{q:`実際の道のり ${Dk} km は、縮尺 1/50000 の地図では何 cm ですか。`,a:Q(Dk*100000,50000),fmt:'int',unit:'cm',steps:[`${Dk} km＝${Dk*100000} cm`,`${Dk*100000}÷50000＝${Dk*100000/50000}`]}};
G.d1=l=>{
  if(l===1){const n=R(4,5),m=R(60,90);const devs=[];let s=0;for(let i=0;i<n-1;i++){const d=R(-12,12);devs.push(d);s+=d}devs.push(-s);const xs=devs.map(d=>m+d);return{q:`次の ${n} 回のテストの点数の平均を求めなさい。<br><span class="num">${xs.join('点、')}点</span>`,a:Q(m),fmt:'int',unit:'点',steps:[`合計：${xs.join('＋')}＝${m*n}`,`${m*n}÷${n}＝${m}`]}}
  if(l===2){const n=R(3,5),m=R(60,90),m2=m+pick([-2,-1,1,2,3]);const x=(n+1)*m2-n*m;return{q:`${n} 回のテストの平均は ${m} 点でした。次のテストで何点取ると、${n+1} 回の平均が ${m2} 点になりますか。`,a:Q(x),fmt:'int',unit:'点',steps:[`${n+1} 回の合計：${m2}×${n+1}＝${m2*(n+1)}`,`${n} 回の合計：${m}×${n}＝${m*n}`,`${m2*(n+1)}－${m*n}＝${x}`]}}
  const n1=20,n2=30;let m1=R(60,90),m2=R(60,90);while((n1*m1+n2*m2)%50!==0)m2=R(60,90);const r=(n1*m1+n2*m2)/50;
  return{q:`A組 ${n1} 人の平均点は ${m1} 点、B組 ${n2} 人の平均点は ${m2} 点です。2組合わせた ${n1+n2} 人の平均点を求めなさい。`,a:Q(r),fmt:'int',unit:'点',steps:[`合計：${m1}×${n1}＋${m2}×${n2}＝${n1*m1+n2*m2}`,`${n1*m1+n2*m2}÷${n1+n2}＝${r}（平均の平均ではない）`]}};
G.d2=l=>{
  if(l===1){const n=R(4,6);const cards=Array.from({length:n},(_,i)=>i+1).join('、');return{q:`${cards} の ${n} 枚のカードから2枚を選んでならべ、2けたの整数を作ります。整数は全部で何個できますか。`,a:Q(n*(n-1)),fmt:'int',unit:'個',steps:[`十の位：${n} 通り、一の位：残りの ${n-1} 通り`,`${n}×${n-1}＝${n*(n-1)}`]}}
  if(l===2){if(R(0,1)){const n=R(4,5);const r=n*(n-1)*(n-2);return{q:`1 から ${n} までの ${n} 枚のカードから3枚をならべて3けたの整数を作ります。全部で何個できますか。`,a:Q(r),fmt:'int',unit:'個',steps:[`${n}×${n-1}×${n-2}＝${r}`]}}
    const n=R(4,5);const r=(n-1)*(n-1)*(n-2);return{q:`0 から ${n-1} までの ${n} 枚のカードから3枚をならべて3けたの整数を作ります。全部で何個できますか。`,a:Q(r),fmt:'int',unit:'個',steps:[`百の位に 0 は置けない：${n-1} 通り`,`十の位：残り ${n-1} 通り（0 も使える）、一の位：${n-2} 通り`,`${n-1}×${n-1}×${n-2}＝${r}`]}}
  if(R(0,1)){const n=R(4,8);return{q:`${n} 人の中から2人の委員を選びます。選び方は何通りありますか。`,a:Q(C(n,2)),fmt:'int',unit:'通り',steps:[`ならべ方 ${n}×${n-1}＝${n*(n-1)} を、順番の入れかえ 2 で割る`,`${n*(n-1)}÷2＝${C(n,2)}`]}}
  const n=R(4,6);return{q:`${n} 人の中から3人を選びます。選び方は何通りありますか。`,a:Q(C(n,3)),fmt:'int',unit:'通り',steps:[`ならべ方 ${n}×${n-1}×${n-2}＝${n*(n-1)*(n-2)} を、3人のならべかえ 6 で割る`,`${n*(n-1)*(n-2)}÷6＝${C(n,3)}`]}};
/* ---- 特殊算 ---- */
G.t1=l=>{
  if(l===1){const s=R(5,40),d=R(2,20),b=s+d;return{q:`2つの数の和は ${s+b}、差は ${d} です。大きい方の数を求めなさい。`,a:Q(b),fmt:'int',steps:[`大＝(和＋差)÷2`,`(${s+b}＋${d})÷2＝${b}`]}}
  if(l===2){const s=R(5,40),d=R(2,20),b=s+d;return{q:`姉と妹の持っているシールは合わせて ${s+b} 枚で、姉は妹より ${d} 枚多いです。妹は何枚持っていますか。`,a:Q(s),fmt:'int',unit:'枚',steps:[`小＝(和－差)÷2`,`(${s+b}－${d})÷2＝${s}`]}}
  const c=R(5,30),d2=R(2,10),d1=R(2,10),b=c+d2,a=b+d1;return{q:`A、B、C の3人が持っているお金は合わせて ${a+b+c} 円です。A は B より ${d1} 円多く、B は C より ${d2} 円多いです。C はいくら持っていますか。`,a:Q(c),fmt:'int',unit:'円',steps:[`全員を C にそろえる：A＝C＋${d1+d2}、B＝C＋${d2}`,`${a+b+c}－${d1+d2}－${d2}＝${3*c}`,`${3*c}÷3＝${c}`]}};
G.t2=l=>{
  if(l===1){const cr=R(2,12),tu=R(2,12),h=cr+tu,L=2*cr+4*tu;return{q:`つるとかめが合わせて ${h} 匹いて、足の数は合わせて ${L} 本です。つるは何羽いますか。`,a:Q(cr),fmt:'int',unit:'羽',steps:[`全部かめだと足は 4×${h}＝${4*h} 本`,`実際より ${4*h-L} 本多い。つる1羽と入れかえるごとに 2 本減る`,`${4*h-L}÷2＝${cr} 羽`]}}
  if(l===2){const n5=R(3,15),n8=R(3,15),n=n5+n8,M=50*n5+80*n8;return{q:`50 円切手と 80 円切手を合わせて ${n} 枚買い、代金は ${M} 円でした。80 円切手は何枚買いましたか。`,a:Q(n8),fmt:'int',unit:'枚',steps:[`全部 50 円なら 50×${n}＝${50*n} 円`,`実際との差 ${M-50*n} 円。1枚入れかえると 30 円増える`,`${M-50*n}÷30＝${n8} 枚`]}}
  const n=R(10,25),k=R(Math.ceil(n*0.5),n),P=5*k-3*(n-k);return{q:`${n} 問のクイズで、正解すると 5 点もらえ、まちがえると 3 点引かれます。得点が ${P} 点のとき、正解は何問ですか。`,a:Q(k),fmt:'int',unit:'問',steps:[`全問正解なら 5×${n}＝${5*n} 点`,`1問まちがえるごとに 5＋3＝8 点減る`,`(${5*n}－${P})÷8＝${n-k} 問まちがい → 正解 ${k} 問`]}};
G.t3=l=>{const d=pick([3,4,5,6,8,10]),n=R(6,30);
  if(l===1)return{q:`長さ ${d*(n-1)} m の道に、${d} m おきに木を植えます。両端にも植えるとき、木は何本必要ですか。`,a:Q(n),fmt:'int',unit:'本',steps:[`間の数：${d*(n-1)}÷${d}＝${n-1}`,`両端ありは 間の数＋1：${n}`]};
  if(l===2){if(R(0,1))return{q:`長さ ${d*(n+1)} m の道に、${d} m おきに木を植えます。両端には植えないとき、木は何本必要ですか。`,a:Q(n),fmt:'int',unit:'本',steps:[`間の数：${d*(n+1)}÷${d}＝${n+1}`,`両端なしは 間の数－1：${n}`]};
    return{q:`道に ${d} m おきに木を ${n} 本植えました。両端にも木があります。道の長さは何 m ですか。`,a:Q(d*(n-1)),fmt:'int',unit:'m',steps:[`間の数＝本数－1＝${n-1}`,`${d}×${n-1}＝${d*(n-1)}`]}}
  return{q:`まわりの長さが ${d*n} m の池のまわりに、${d} m おきに木を植えます。木は何本必要ですか。`,a:Q(n),fmt:'int',unit:'本',steps:[`輪になっているときは 間の数＝本数`,`${d*n}÷${d}＝${n}`]}};
G.t4=l=>{
  if(l===1){const pat=pick(['○△□','○○△','●○○△','○△△□']);const N=R(20,80),p=pat.length;const idx=(N-1)%p;return{q:`${pat}${pat}${pat}… のように、記号をくり返してならべます。${N} 番目の記号は何ですか。`,a:pat[idx],fmt:'choice',choices:[...new Set(pat.split(''))],steps:[`${p} 個でひと組。${N}÷${p}＝${Math.floor(N/p)} あまり ${N%p}`,N%p===0?`あまり 0 → 組の最後の「${pat[p-1]}」`:`あまり ${N%p} → 組の ${N%p} 番目「${pat[idx]}」`]}}
  if(l===2){const pat=pick(['○△□','○○△','●○○△','○△△□','○□']);const N=R(30,120),p=pat.length,sym='○';const per=pat.split('').filter(c=>c===sym).length;const full=Math.floor(N/p),rem=N%p;const cnt=full*per+pat.slice(0,rem).split('').filter(c=>c===sym).length;return{q:`${pat}${pat}${pat}… のように記号をくり返してならべます。1 番目から ${N} 番目までに ○ は何個ありますか。`,a:Q(cnt),fmt:'int',unit:'個',steps:[`ひと組 ${p} 個に ○ は ${per} 個`,`${N}÷${p}＝${full} 組 あまり ${rem}`,`${per}×${full}＋あまり部分の ${cnt-full*per}＝${cnt}`]}}
  const w=R(0,6),N=R(30,200);const r=(w+N)%7;return{q:`今日は${WD[w]}曜日です。${N} 日後は何曜日ですか。`,a:WD[r],fmt:'choice',choices:WD,steps:[`7 日で同じ曜日にもどる：${N}÷7＝${Math.floor(N/7)} あまり ${N%7}`,`${WD[w]}曜日の ${N%7} 日後 → ${WD[r]}曜日`]}};
G.t5=l=>{const n=R(5,20),a=R(3,8),b=a+R(1,3);
  if(l===1){const r=R(1,(b-a)*n-1),s=(b-a)*n-r;return{q:`あめを子どもに 1 人 ${a} 個ずつ配ると ${r} 個あまり、1 人 ${b} 個ずつ配ると ${s} 個たりません。子どもは何人いますか。`,a:Q(n),fmt:'int',unit:'人',steps:[`配り方の差は 1 人あたり ${b}－${a}＝${b-a} 個`,`全体の差は ${r}＋${s}＝${r+s} 個（あまり＋不足）`,`${r+s}÷${b-a}＝${n} 人`]}}
  if(l===2){const r=R(1,(b-a)*n-1),s=(b-a)*n-r;return{q:`あめを子どもに 1 人 ${a} 個ずつ配ると ${r} 個あまり、1 人 ${b} 個ずつ配ると ${s} 個たりません。あめは全部で何個ありますか。`,a:Q(a*n+r),fmt:'int',unit:'個',steps:[`人数：(${r}＋${s})÷(${b}－${a})＝${n} 人`,`あめ：${a}×${n}＋${r}＝${a*n+r} 個`]}}
  const s=R(1,10),r=s+(b-a)*n;return{q:`えんぴつを 1 人 ${a} 本ずつ配ると ${r} 本あまり、1 人 ${b} 本ずつ配ると ${s} 本あまります。人数は何人ですか。`,a:Q(n),fmt:'int',unit:'人',steps:[`どちらもあまる → 差は ${r}－${s}＝${r-s} 本`,`1 人あたりの差 ${b-a} 本`,`${r-s}÷${b-a}＝${n} 人`]}};
G.t6=l=>{
  if(l===1){const n=R(3,5),m=R(60,90),m2=m+pick([1,2,3,4]);const x=(n+1)*m2-n*m;return{q:`これまで ${n} 回の算数テストの平均点は ${m} 点です。次のテストで何点取れば、平均が ${m2} 点になりますか。`,a:Q(x),fmt:'int',unit:'点',steps:[`平均が ${m2-m} 点上がる → これまでの ${n} 回分を ${m2-m}×${n}＝${(m2-m)*n} 点引き上げる`,`${m2}＋${(m2-m)*n}＝${x} 点`]}}
  if(l===2){const n=R(4,9),m=R(30,50),m2=m+pick([1,2,3]);const x=(n+1)*m2-n*m;return{q:`${n} 人の体重の平均は ${m} kg です。もう 1 人加わると平均が ${m2} kg になりました。加わった人の体重は何 kg ですか。`,a:Q(x),fmt:'int',unit:'kg',steps:[`${n+1} 人の合計：${m2}×${n+1}＝${m2*(n+1)}`,`${n} 人の合計：${m}×${n}＝${m*n}`,`差 ${x} kg`]}}
  const n1=R(2,6)*5,n2=R(2,6)*5;let m1=R(60,90),m2=R(60,90);let tries=0;while((n1*m1+n2*m2)%(n1+n2)!==0&&tries++<200){m2=R(60,90)}const r=(n1*m1+n2*m2)/(n1+n2);
  return{q:`男子 ${n1} 人の平均点は ${m1} 点、女子 ${n2} 人の平均点は ${m2} 点です。クラス全体の平均点を求めなさい。`,a:Q(n1*m1+n2*m2,n1+n2),fmt:'any',unit:'点',steps:[`合計＝${m1}×${n1}＋${m2}×${n2}＝${n1*m1+n2*m2}`,`÷${n1+n2}＝${ansTxt(Q(n1*m1+n2*m2,n1+n2),'any')}`]}};
G.t7=l=>{
  if(l===1){let c,x,k,f;do{c=R(5,12);x=R(2,12);k=pick([2,3]);f=k*(c+x)-x}while(f-c<22||f-c>40);return{q:`父は ${f} 才、子どもは ${c} 才です。父の年令が子どもの年令の ${k} 倍になるのは何年後ですか。`,a:Q(x),fmt:'int',unit:'年後',steps:[`2 人の年令の差 ${f-c} 才は変わらない`,`${k} 倍のとき、差は子どもの (${k}－1) 倍 → 子どもは ${f-c}÷${k-1}＝${(f-c)/(k-1)} 才`,`${(f-c)/(k-1)}－${c}＝${x} 年後`]}}
  if(l===2){let c,x,k,f;do{c=R(10,16);x=R(2,8);k=pick([3,4,5]);f=k*(c-x)+x}while(f-c<22||f-c>45);return{q:`母は ${f} 才、子どもは ${c} 才です。母の年令が子どもの年令の ${k} 倍だったのは何年前ですか。`,a:Q(x),fmt:'int',unit:'年前',steps:[`年令の差 ${f-c} 才は変わらない`,`${k} 倍のとき子どもは ${f-c}÷${k-1}＝${(f-c)/(k-1)} 才`,`${c}－${(f-c)/(k-1)}＝${x} 年前`]}}
  const a=R(5,12),b=R(2,a-1),x=R(2,10),m=a+b+x;return{q:`母は ${m} 才、子どもは ${a} 才と ${b} 才です。母の年令が子ども 2 人の年令の和と等しくなるのは何年後ですか。`,a:Q(x),fmt:'int',unit:'年後',steps:[`1 年で母は 1 才、子ども 2 人の和は 2 才増える → 差が 1 才ずつ縮まる`,`今の差：${m}－(${a}＋${b})＝${x}`,`${x} 年後`]}};
G.t8=l=>{
  if(l===1){let a,b,c,d,u,p;let tries=0;do{a=R(2,7);b=R(2,7);c=R(1,5);d=R(1,5);const L=lcm(b,d);u=L*R(100,400);p=u*a/b-u*c/d;tries++}while((gcd(a,b)!==1||gcd(c,d)!==1||p<=0||a*d===b*c||p%10!==0)&&tries<500);const A=u*a/b;return{q:`A と B の持っているお金の比は ${a}：${b} でした。A が ${p} 円使ったので、2 人のお金の比は ${c}：${d} になりました。A は初めいくら持っていましたか。`,a:Q(A),fmt:'int',unit:'円',steps:[`変わらない B をそろえる：B を ${b} と ${d} の最小公倍数 ${lcm(b,d)} にする`,`A：${a*lcm(b,d)/b} → ${c*lcm(b,d)/d}、差 ${a*lcm(b,d)/b-c*lcm(b,d)/d} が ${p} 円`,`1 にあたる量 ${p/(a*lcm(b,d)/b-c*lcm(b,d)/d)} 円 → A は ${A} 円`]}}
  let a,b,k,p,A,B,g;do{a=R(2,6);b=R(1,a-1);k=R(10,60)*10;p=R(5,40)*10;A=a*k;B=b*k;g=gcd(A+p,B+p)}while(gcd(a,b)!==1);const c=(A+p)/g,d=(B+p)/g;
  if(l===2)return{q:`兄と弟のお金の比は ${a}：${b} でした。2 人とも ${p} 円ずつもらったので、比は ${c}：${d} になりました。兄は初めいくら持っていましたか。`,a:Q(A),fmt:'int',unit:'円',steps:[`同じ額をもらっても差は変わらない`,`差の比：初め ${a-b}、あと ${c-d} → 差を ${lcm(a-b,c-d)} にそろえる`,`増えた分 ${p} 円から 1 にあたる量を求めて 兄＝${A} 円`]};
  return{q:`兄と弟のお金の比は ${c}：${d} でした。2 人とも ${p} 円ずつ使ったので、比は ${a}：${b} になりました。兄は初めいくら持っていましたか。`,a:Q(A+p),fmt:'int',unit:'円',steps:[`同じ額を使っても差は変わらない`,`差の比をそろえ、減った ${p} 円から 1 にあたる量を求める`,`兄＝${A+p} 円`]}};
G.t9=l=>{
  if(l===1){const d=pick([3,4,5,6,8]),p=R(1,d-1),W=d*R(20,120)*10,r=W*(d-p)/d;return{q:`持っていたお金の ${frTxt(Q(p,d))} を使ったところ、${r} 円残りました。初めに持っていたお金はいくらですか。`,a:Q(W),fmt:'int',unit:'円',steps:[`残りは全体の 1－${frTxt(Q(p,d))}＝${frTxt(Q(d-p,d))}`,`${r}÷${frTxt(Q(d-p,d))}＝${W}`]}}
  const d1=pick([3,4,5]),p1=R(1,d1-1),d2=pick([2,3,4]),p2=R(1,d2-1);const W=d1*d2*R(5,30)*10;const R1=W*(d1-p1)/d1;
  if(l===2){const R2=R1*(d2-p2)/d2;return{q:`本を 1 日目に全体の ${frTxt(Q(p1,d1))}、2 日目に残りの ${frTxt(Q(p2,d2))} を読んだところ、${R2} ページ残りました。本は全部で何ページですか。`,a:Q(W),fmt:'int',unit:'ページ',steps:[`後ろから戻る：2 日目の前の残りは ${R2}÷${frTxt(Q(d2-p2,d2))}＝${R1}`,`1 日目の前（全体）は ${R1}÷${frTxt(Q(d1-p1,d1))}＝${W}`]}}
  const e=R(1,5)*10,R2=R1*(d2-p2)/d2-e;return{q:`本を 1 日目に全体の ${frTxt(Q(p1,d1))}、2 日目に残りの ${frTxt(Q(p2,d2))} より ${e} ページ多く読んだところ、${R2} ページ残りました。本は全部で何ページですか。`,a:Q(W),fmt:'int',unit:'ページ',steps:[`2 日目の前の残り：(${R2}＋${e})÷${frTxt(Q(d2-p2,d2))}＝${R1}`,`全体：${R1}÷${frTxt(Q(d1-p1,d1))}＝${W}`]}};
G.t10=l=>{const x=R(8,15)*10,y=R(3,9)*10;
  if(l===1){const a=R(2,4),b1=R(1,4),b2=b1+R(1,3);const P1=a*x+b1*y,P2=a*x+b2*y;return{q:`りんご ${a} 個とみかん ${b1} 個で ${P1} 円、りんご ${a} 個とみかん ${b2} 個で ${P2} 円です。みかん 1 個の値段を求めなさい。`,a:Q(y),fmt:'int',unit:'円',steps:[`りんごの数が同じ → 差はみかん ${b2-b1} 個分`,`(${P2}－${P1})÷${b2-b1}＝${y}`]}}
  if(l===2){const a1=R(1,3),b1=R(1,3),a2=a1*2,b2=R(1,5);const P1=a1*x+b1*y,P2=a2*x+b2*y;if(b1*2===b2)return G.t10(2);
    return{q:`りんご ${a1} 個とみかん ${b1} 個で ${P1} 円、りんご ${a2} 個とみかん ${b2} 個で ${P2} 円です。りんご 1 個の値段を求めなさい。`,a:Q(x),fmt:'int',unit:'円',steps:[`1 つ目を 2 倍：りんご ${a2} 個とみかん ${b1*2} 個で ${2*P1} 円`,`2 つ目との差：みかん ${Math.abs(b1*2-b2)} 個分が ${Math.abs(2*P1-P2)} 円 → みかん ${y} 円`,`りんご：(${P1}－${y}×${b1})÷${a1}＝${x}`]}}
  const a=R(2,5),b=R(2,6),d=x-y,P=a*x+b*y;return{q:`りんご 1 個はみかん 1 個より ${d} 円高いです。りんご ${a} 個とみかん ${b} 個で ${P} 円のとき、みかん 1 個の値段を求めなさい。`,a:Q(y),fmt:'int',unit:'円',steps:[`りんごをみかんに置きかえる：りんご ${a} 個＝みかん ${a} 個＋${d}×${a}＝${d*a} 円`,`みかん ${a+b} 個で ${P}－${d*a}＝${P-d*a} 円`,`${P-d*a}÷${a+b}＝${y}`]}};
G.t11=l=>{const [a,b]=pick([[6,3],[12,6],[10,15],[12,24],[20,30],[15,10],[18,9],[12,4],[20,5],[30,15],[24,8],[8,8]]);const t=a*b/(a+b);
  if(l===1)return{q:`ある仕事を A は 1 人で ${a} 日、B は 1 人で ${b} 日で仕上げます。2 人でいっしょにすると何日で仕上がりますか。`,a:Q(t),fmt:'int',unit:'日',steps:[`全体を ${lcm(a,b)} とおく（${a} と ${b} の最小公倍数）`,`A は 1 日 ${lcm(a,b)/a}、B は 1 日 ${lcm(a,b)/b}、2 人で ${lcm(a,b)/a+lcm(a,b)/b}`,`${lcm(a,b)}÷${lcm(a,b)/a+lcm(a,b)/b}＝${t} 日`]};
  if(l===2)return{q:`ある仕事を A は 1 人で ${a} 日で仕上げ、A と B の 2 人ですると ${t} 日で仕上がります。B が 1 人ですると何日かかりますか。`,a:Q(b),fmt:'int',unit:'日',steps:[`全体を ${lcm(a,t)} とおく`,`2 人で 1 日 ${lcm(a,t)/t}、A は 1 日 ${lcm(a,t)/a} → B は 1 日 ${lcm(a,t)/t-lcm(a,t)/a}`,`${lcm(a,t)}÷${lcm(a,t)/t-lcm(a,t)/a}＝${b} 日`]};
  let x;const cands=[];for(let i=1;i<a;i++){if((b*(a-i))%a===0)cands.push(i)}x=cands.length?pick(cands):1;const rest=b*(a-x)/a;
  return{q:`ある仕事を A は 1 人で ${a} 日、B は 1 人で ${b} 日で仕上げます。A が ${x} 日働いたあと、残りを B が 1 人でしました。B は何日働きましたか。`,a:Q(rest),fmt:'any',unit:'日',steps:[`全体を ${lcm(a,b)} とおく。A は 1 日 ${lcm(a,b)/a} → ${x} 日で ${lcm(a,b)/a*x}`,`残り ${lcm(a,b)-lcm(a,b)/a*x} を B（1 日 ${lcm(a,b)/b}）が → ${ansTxt(Q(rest),'any')} 日`]}};
G.t12=l=>{
  if(l===1){const a=R(2,6),b=a+R(2,6),k=pick([1,2]),t=R(4,15),N=t*(k*b-a);return{q:`開場のとき ${N} 人の行列があり、その後も毎分 ${a} 人ずつ並びます。入口 1 つで毎分 ${b} 人入場できるとき、入口を ${k} つ開けると何分で行列がなくなりますか。`,a:Q(t),fmt:'int',unit:'分',steps:[`1 分で減る人数：${k}×${b}－${a}＝${k*b-a} 人`,`${N}÷${k*b-a}＝${t} 分`]}}
  const g=R(2,5),Gm=R(2,6)*12;const dv=divisors(Gm).filter(x=>x>=2&&x<=30);const d1=pick(dv);let d2=pick(dv);while(d2===d1)d2=pick(dv);const n1=g+Gm/d1,n2=g+Gm/d2;
  if(l===2){return{q:`ある牧場では草が毎日一定の量だけ生え、牛は 1 頭が 1 日に同じ量を食べます。牛 ${n1} 頭なら ${d1} 日、${n2} 頭なら ${d2} 日で草がなくなります。1 日に生える草は牛何頭分ですか。`,a:Q(g),fmt:'int',unit:'頭分',steps:[`${n1} 頭×${d1} 日＝${n1*d1}、${n2} 頭×${d2} 日＝${n2*d2}（初めの草＋生えた草）`,`差 ${Math.abs(n1*d1-n2*d2)} は ${Math.abs(d1-d2)} 日分の生える草`,`${Math.abs(n1*d1-n2*d2)}÷${Math.abs(d1-d2)}＝${g} 頭分`]}}
  let d3=pick(dv);while(d3===d1||d3===d2)d3=pick(dv);const n3=g+Gm/d3;
  return{q:`ある牧場では草が毎日一定の量だけ生え、牛は 1 頭が 1 日に同じ量を食べます。牛 ${n1} 頭なら ${d1} 日、${n2} 頭なら ${d2} 日で草がなくなります。牛 ${n3} 頭なら何日でなくなりますか。`,a:Q(d3),fmt:'int',unit:'日',steps:[`1 日に生える草：(${n1}×${d1}－${n2}×${d2})÷(${d1}－${d2})＝${g} 頭分`,`初めの草：${n1}×${d1}－${g}×${d1}＝${Gm}`,`${n3} 頭なら 1 日に ${n3}－${g}＝${n3-g} 減る → ${Gm}÷${n3-g}＝${d3} 日`]}};
G.t13=l=>{
  if(l===1){const v1=pick([60,70,80]),v2=pick([40,50,60]),t=R(5,20),D2=(v1+v2)*t;return{q:`${D2} m はなれた A さんと B さんが、同時に向かい合って歩き出しました。A さんは分速 ${v1} m、B さんは分速 ${v2} m です。2 人が出会うのは何分後ですか。`,a:Q(t),fmt:'int',unit:'分後',steps:[`出会い：1 分で ${v1}＋${v2}＝${v1+v2} m 近づく`,`${D2}÷${v1+v2}＝${t} 分`]}}
  if(l===2){const v2=pick([50,60,70]),v1=v2+pick([10,20,30]),t=R(5,20),d=(v1-v2)*t;return{q:`弟が分速 ${v2} m で家を出てから、兄が分速 ${v1} m で追いかけました。兄が出発したとき、弟は ${d} m 先にいました。兄が弟に追いつくのは何分後ですか。`,a:Q(t),fmt:'int',unit:'分後',steps:[`追いつき：1 分で ${v1}－${v2}＝${v1-v2} m 縮まる`,`${d}÷${v1-v2}＝${t} 分`]}}
  const v1=pick([70,80,90]),v2=pick([40,50,60]),t=R(4,12),L=(v1+v2)*t;const t2=L/(v1-v2);
  return{q:`1 周 ${L} m の池のまわりを、A は分速 ${v1} m、B は分速 ${v2} m で同じ地点から同時に同じ向きに歩き出しました。A が B にはじめて追いつくのは何分後ですか。`,a:Q(L,v1-v2),fmt:'any',unit:'分後',steps:[`同じ向き → 1 周分の差がつくと追いつく`,`1 分で ${v1-v2} m 差がつく → ${L}÷${v1-v2}＝${ansTxt(Q(L,v1-v2),'any')} 分`]}};
G.t14=l=>{
  if(l===1){const ln=pick([100,120,150,180,200]),v=pick([20,25,30]),t=R(10,40),b=v*t-ln;if(b<=0)return G.t14(1);return{q:`長さ ${ln} m の電車が秒速 ${v} m で走っています。長さ ${b} m の鉄橋をわたり始めてからわたり終わるまでに何秒かかりますか。`,a:Q(t),fmt:'int',unit:'秒',steps:[`進む道のり＝鉄橋＋電車の長さ＝${b}＋${ln}＝${b+ln} m`,`${b+ln}÷${v}＝${t} 秒`]}}
  if(l===2){const v=pick([20,25,30]),s=R(4,10),ln=v*s,tb=R(15,40),b=v*(tb-s);return{q:`ある電車が電柱の前を通過するのに ${s} 秒、長さ ${b} m の鉄橋をわたり終わるのに ${tb} 秒かかりました。この電車の長さは何 m ですか。`,a:Q(ln),fmt:'int',unit:'m',steps:[`鉄橋と電柱の差 ${tb}－${s}＝${tb-s} 秒で鉄橋 ${b} m 進む → 秒速 ${v} m`,`電柱 ${s} 秒分＝電車の長さ：${v}×${s}＝${ln} m`]}}
  const l1=pick([100,120,150]),l2=pick([80,100,180]),v1=pick([20,25]),v2=pick([15,20,30]);const t=Q(l1+l2,v1+v2);
  return{q:`長さ ${l1} m で秒速 ${v1} m の電車と、長さ ${l2} m で秒速 ${v2} m の電車が反対向きに走っています。出会ってからすれちがい終わるまでに何秒かかりますか。`,a:t,fmt:'any',unit:'秒',steps:[`進む道のりの合計＝${l1}＋${l2}＝${l1+l2} m`,`1 秒で ${v1}＋${v2}＝${v1+v2} m 近づく → ${l1+l2}÷${v1+v2}＝${ansTxt(t,'any')} 秒`]}};
G.t15=l=>{const c=R(1,4),s=c+R(4,12);const u=s-c,d=s+c;
  if(l===1)return{q:`ある船は川を上るときは時速 ${u} km、下るときは時速 ${d} km です。静水時の船の速さは時速何 km ですか。`,a:Q(s),fmt:'int',unit:'km',steps:[`上り＝静水－流れ、下り＝静水＋流れ`,`静水＝(上り＋下り)÷2＝(${u}＋${d})÷2＝${s}`]};
  if(l===2)return{q:`ある船は川を上るときは時速 ${u} km、下るときは時速 ${d} km です。川の流れの速さは時速何 km ですか。`,a:Q(c),fmt:'int',unit:'km',steps:[`流れ＝(下り－上り)÷2`,`(${d}－${u})÷2＝${c}`]};
  const Dk=lcm(u,d)*R(1,2);const tt=Dk/u+Dk/d;return{q:`静水時の速さが時速 ${s} km の船で、流れの速さが時速 ${c} km の川を ${Dk} km 上ってから同じ道を下ります。往復で何時間かかりますか。`,a:Q(tt),fmt:'int',unit:'時間',steps:[`上り 時速 ${u} km：${Dk}÷${u}＝${Dk/u} 時間`,`下り 時速 ${d} km：${Dk}÷${d}＝${Dk/d} 時間`,`合計 ${tt} 時間`]}};
G.t16=l=>{const h=l===1?R(1,5):R(1,11);
  if(l===1){const t=Q(60*h,11);return{q:`${h} 時ちょうどから、長針と短針が次に重なるのは ${h} 時何分ですか。`,a:t,fmt:'frac',unit:'分',steps:[`${h} 時ちょうどの 2 針の角度：30×${h}＝${30*h}°`,`長針は 1 分に 6°、短針は 0.5° → 1 分で 5.5° 縮まる`,`${30*h}÷5.5＝${frTxt(t)} 分`]}}
  if(l===2){let deg=30*h,tdeg;if(deg>90)tdeg=deg-90;else tdeg=deg+90;if(deg===90)tdeg=180;const t=Q(tdeg*2,11);return{q:`${h} 時ちょうどのあと、長針と短針がはじめて直角になるのは ${h} 時何分ですか。${deg===90?'（ちょうど '+h+' 時は除く）':''}`,a:t,fmt:'frac',unit:'分',steps:[`${h} 時の角度は ${deg}°。直角（90°）になるまでに長針が短針より ${tdeg}° 多く進む`,`1 分で 5.5° 差がつく → ${tdeg}÷5.5＝${frTxt(t)} 分`]}}
  const deg=30*h;const tdeg=deg<180?deg+180:deg-180;const t=Q(tdeg*2,11);return{q:`${h} 時ちょうどのあと、長針と短針がはじめて一直線（180°）になるのは ${h} 時何分ですか。${deg===180?'（ちょうど '+h+' 時は除く）':''}`,a:t,fmt:'frac',unit:'分',steps:[`${h} 時の角度は ${deg}°。一直線になるまでの差 ${tdeg}°`,`${tdeg}÷5.5＝${frTxt(t)} 分`]}};
G.t17=l=>{
  if(l===1){let W,p;do{W=pick([100,150,200,250,300,400,500]);p=pick([2,4,5,6,8,10,12,15,20])}while((W*p)%100!==0);return{q:`${p}% の食塩水 ${W} g には、食塩が何 g とけていますか。`,a:Q(W*p/100),fmt:'int',unit:'g',steps:[`食塩＝食塩水×濃度`,`${W}×${p/100}＝${W*p/100}`]}}
  if(l===2){let W1,p1,W2,p2,tr=0;do{W1=pick([100,200,300]);W2=pick([100,200,300,400]);p1=pick([4,5,6,8,10]);p2=pick([10,12,15,20]);tr++}while(((W1*p1+W2*p2)%(W1+W2)!==0||p1===p2)&&tr<300);const r=(W1*p1+W2*p2)/(W1+W2);return{q:`${p1}% の食塩水 ${W1} g と ${p2}% の食塩水 ${W2} g を混ぜると、何% の食塩水になりますか。`,a:Q(W1*p1+W2*p2,W1+W2),fmt:'any',unit:'%',steps:[`食塩：${W1}×${p1/100}＋${W2}×${p2/100}＝${(W1*p1+W2*p2)/100} g`,`食塩水：${W1+W2} g → ${(W1*p1+W2*p2)/100}÷${W1+W2}＝${ansTxt(Q(W1*p1+W2*p2,W1+W2),'any')}%`]}}
  let W,p1,p2,salt,W2;do{W=pick([100,200,300,400]);p1=pick([10,12,15,20]);p2=pick([4,5,6,8,10]);salt=W*p1/100;W2=salt*100/p2}while(p2>=p1||W2%1!==0||salt%1!==0);
  return{q:`${p1}% の食塩水 ${W} g に水を加えて ${p2}% にします。水を何 g 加えればよいですか。`,a:Q(W2-W),fmt:'int',unit:'g',steps:[`食塩の量は変わらない：${W}×${p1/100}＝${salt} g`,`${p2}% で食塩 ${salt} g → 食塩水は ${salt}÷${p2/100}＝${W2} g`,`${W2}－${W}＝${W2-W} g`]}};
G.t18=l=>{
  if(l===1){const c=R(5,50)*100,p=pick([10,20,25,30,40,50]);return{q:`原価 ${c} 円の品物に ${p}% の利益を見こんで定価をつけます。定価はいくらですか。`,a:Q(c*(100+p)/100),fmt:'int',unit:'円',steps:[`定価＝原価×(1＋${p/100})`,`${c}×${(100+p)/100}＝${c*(100+p)/100}`]}}
  if(l===2){const c=R(5,40)*100,p=pick([10,20,30,40,50]),q=pick([10,20,30]);const t=c*(100+p)/100,s=t*(100-q)/100;return{q:`原価 ${c} 円の品物に ${p}% の利益を見こんで定価をつけましたが、売れないので定価の ${q}% 引きで売りました。利益はいくらですか。${s-c<0?'（損をした場合は負の数で答える）':''}`,a:Q(s-c),fmt:'int',unit:'円',steps:[`定価：${c}×${(100+p)/100}＝${t}`,`売り値：${t}×${(100-q)/100}＝${s}`,`利益：${s}－${c}＝${s-c}`]}}
  const t=R(5,30)*100,q=pick([10,20,30]),s=t*(100-q)/100,c=s-R(1,8)*50,z=s-c;return{q:`ある品物を定価の ${q}% 引きで売ったところ、${z} 円の利益がありました。原価が ${c} 円のとき、定価はいくらですか。`,a:Q(t),fmt:'int',unit:'円',steps:[`売り値＝原価＋利益＝${c}＋${z}＝${s}`,`売り値は定価の ${100-q}% → ${s}÷${(100-q)/100}＝${t}`]}};
G.t19=l=>{const N=R(30,45),a=R(15,N-5),b=R(12,N-5);let c=R(Math.max(1,a+b-N+1),Math.min(a,b)-1);if(c<1)c=1;const none=N-(a+b-c);
  if(l===1)return{q:`${N} 人のクラスで、犬を飼っている人は ${a} 人、ねこを飼っている人は ${b} 人、両方飼っている人は ${c} 人です。どちらも飼っていない人は何人ですか。`,a:Q(none),fmt:'int',unit:'人',steps:[`どちらかを飼っている人＝${a}＋${b}－${c}＝${a+b-c}（両方の人を 2 回数えないように引く）`,`${N}－${a+b-c}＝${none}`]};
  if(l===2)return{q:`${N} 人のクラスで、犬を飼っている人は ${a} 人、ねこを飼っている人は ${b} 人、どちらも飼っていない人は ${none} 人です。両方飼っている人は何人ですか。`,a:Q(c),fmt:'int',unit:'人',steps:[`どちらかを飼っている人：${N}－${none}＝${N-none}`,`${a}＋${b}－${N-none}＝${c}`]};
  return{q:`${N} 人のクラスで、国語が好きな人は ${a} 人、算数が好きな人は ${b} 人、両方好きな人は ${c} 人です。国語だけが好きな人は何人ですか。`,a:Q(a-c),fmt:'int',unit:'人',steps:[`国語が好き ${a} 人のうち、両方好きな ${c} 人を除く`,`${a}－${c}＝${a-c}`]}};
G.t20=l=>{
  if(l===1){const n=R(5,12);return{q:`おはじきを 1 辺 ${n} 個の正方形にすき間なくならべました。いちばん外側の 1 周には何個ありますか。`,a:Q(4*n-4),fmt:'int',unit:'個',steps:[`(1 辺－1)×4 で数える（角を 2 回数えない）`,`(${n}－1)×4＝${4*n-4}`]}}
  if(l===2){const n=R(5,12),k=4*n-4;return{q:`おはじきを正方形にすき間なくならべたところ、いちばん外側の 1 周は ${k} 個でした。おはじきは全部で何個ありますか。`,a:Q(n*n),fmt:'int',unit:'個',steps:[`1 辺の個数：${k}÷4＋1＝${n}`,`${n}×${n}＝${n*n}`]}}
  const n=R(7,14),w=R(1,3),m=n-2*w;return{q:`1 辺 ${n} 個の正方形の形におはじきをならべ、中を 1 辺 ${m} 個の正方形の形に空けました（中空方陣）。おはじきは全部で何個ありますか。`,a:Q(n*n-m*m),fmt:'int',unit:'個',steps:[`外側の正方形 ${n}×${n}＝${n*n}`,`中の空き ${m}×${m}＝${m*m}`,`${n*n}－${m*m}＝${n*n-m*m}`]}};
const MD=[31,28,31,30,31,30,31,31,30,31,30,31];
const doy=(m,d)=>{let s=0;for(let i=0;i<m-1;i++)s+=MD[i];return s+d};
G.t21=l=>{const m1=R(1,10),d1=R(1,MD[m1-1]),w1=R(0,6);
  if(l===1){let d2=R(1,MD[m1-1]);while(d2===d1)d2=R(1,MD[m1-1]);const diff=d2-d1;const w2=((w1+diff)%7+7)%7;return{q:`ある年の ${m1} 月 ${d1} 日は${WD[w1]}曜日です。同じ年の ${m1} 月 ${d2} 日は何曜日ですか。`,a:WD[w2],fmt:'choice',choices:WD,steps:[`${d2}－${d1}＝${diff} 日${diff<0?'前':'後'}`,`${Math.abs(diff)}÷7＝${Math.floor(Math.abs(diff)/7)} あまり ${Math.abs(diff)%7} → ${WD[w2]}曜日`]}}
  const m2=R(m1+1,12),d2=R(1,MD[m2-1]);const diff=doy(m2,d2)-doy(m1,d1);const w2=(w1+diff)%7;
  if(l===2)return{q:`ある年（平年）の ${m1} 月 ${d1} 日は${WD[w1]}曜日です。同じ年の ${m2} 月 ${d2} 日は何曜日ですか。`,a:WD[w2],fmt:'choice',choices:WD,steps:[`${m1} 月 ${d1} 日から ${m2} 月 ${d2} 日までは ${diff} 日後（各月の日数を足していく）`,`${diff}÷7＝${Math.floor(diff/7)} あまり ${diff%7} → ${WD[w2]}曜日`]};
  return{q:`ある年（平年）の ${m1} 月 ${d1} 日は${WD[w1]}曜日です。同じ年の ${m2} 月 ${d2} 日は、${m1} 月 ${d1} 日から数えて何日後ですか。`,a:Q(diff),fmt:'int',unit:'日後',steps:[`${m1} 月の残り：${MD[m1-1]}－${d1}＝${MD[m1-1]-d1} 日`,`間の月の日数を足し、最後に ${d2} 日を足す → ${diff} 日後`]}};
G.t22=l=>{
  if(l===1){const a=R(1,9),d=R(2,7),n=R(10,30);return{q:`${a}, ${a+d}, ${a+2*d}, ${a+3*d}, … のように同じ数ずつ増える数の列があります。${n} 番目の数を求めなさい。`,a:Q(a+(n-1)*d),fmt:'int',steps:[`${d} ずつ増える。${n} 番目は初めの数に ${d} を (${n}－1) 回足す`,`${a}＋${d}×${n-1}＝${a+(n-1)*d}`]}}
  if(l===2){const a=R(1,9),d=R(2,7),n=R(10,25),last=a+(n-1)*d;return{q:`${a}, ${a+d}, ${a+2*d}, … , ${last} の和を求めなさい。`,a:Q((a+last)*n/2),fmt:'int',steps:[`個数：(${last}－${a})÷${d}＋1＝${n} 個`,`和＝(初め＋終わり)×個数÷2＝(${a}＋${last})×${n}÷2＝${(a+last)*n/2}`]}}
  if(R(0,1)){const n=R(8,20);return{q:`1, 3, 6, 10, 15, … のように増える数の列があります。${n} 番目の数を求めなさい。`,a:Q(n*(n+1)/2),fmt:'int',steps:[`増え方が 2, 3, 4, 5, … と 1 ずつ増える（三角数）`,`${n} 番目＝1＋2＋…＋${n}＝${n}×${n+1}÷2＝${n*(n+1)/2}`]}}
  const n=R(8,20);return{q:`1, 4, 9, 16, 25, … のように増える数の列があります。${n} 番目の数を求めなさい。`,a:Q(n*n),fmt:'int',steps:[`1×1, 2×2, 3×3, … の形（平方数）`,`${n}×${n}＝${n*n}`]}};
G.t23=l=>{
  if(l<=2){const m=l===1?R(2,3):R(3,5),n=l===1?R(2,3):R(3,5);return{q:`たてに ${m} 区画、横に ${n} 区画の碁盤の目の道があります。左下の A から右上の B まで、遠回りをせずに行く道順は何通りありますか。`,a:Q(C(m+n,m)),fmt:'int',unit:'通り',steps:[`各交差点まで来る道順の数を足していく（左と下の数の和）`,`または ${m+n} 回の移動のうち上に行く ${m} 回の選び方：${C(m+n,m)} 通り`]}}
  const m=R(3,4),n=R(3,5),a=R(1,m-1),b=R(1,n-1);const r=C(a+b,a)*C(m-a+n-b,m-a);return{q:`たてに ${m} 区画、横に ${n} 区画の碁盤の目の道があります。左下の A から右上の B まで、A から上に ${a} 区画・右に ${b} 区画の地点 P を通って遠回りせずに行く道順は何通りありますか。`,a:Q(r),fmt:'int',unit:'通り',steps:[`A→P：${C(a+b,a)} 通り、P→B：${C(m-a+n-b,m-a)} 通り`,`かけ算：${C(a+b,a)}×${C(m-a+n-b,m-a)}＝${r}`]}};
G.t24=l=>{
  if(l===1){const a=R(1,4),b=R(1,4),S=(a+b)*R(3,12);return{q:`三角形 ABC の面積は ${S} cm² です。辺 BC 上に点 D を BD：DC＝${a}：${b} になるようにとるとき、三角形 ABD の面積を求めなさい。`,a:Q(S*a,a+b),fmt:'any',unit:'cm²',steps:[`高さが同じ三角形の面積の比＝底辺の比`,`${S}×${frTxt(Q(a,a+b))}＝${ansTxt(Q(S*a,a+b),'any')}`]}}
  if(l===2){const r=pick([2,3,4,5]),h=R(3,10);const V=Q(r*r*314*h,100);return{q:`たて ${h} cm、横 ${r} cm の長方形を、たての辺を軸にして 1 回転させてできる立体の体積を求めなさい。（円周率は 3.14）`,a:V,fmt:'dec',unit:'cm³',steps:[`できる立体は底面の半径 ${r} cm、高さ ${h} cm の円柱`,`${r}×${r}×3.14×${h}＝${D(V)}`]}}
  const a=pick([Q(1),Q(3,2),Q(2),Q(1,2)]),b=R(3,12);const H=qd(Q(b),a);const Hs=isTerm(H)?H:null;if(!Hs)return G.t24(3);
  return{q:`高さ 1 m の棒のかげの長さが ${D(a)} m のとき、かげの長さが ${b} m の木の高さは何 m ですか。`,a:H,fmt:'dec',unit:'m',steps:[`同じ時刻なら 高さ：かげ の比は同じ（相似）`,`1：${D(a)}＝□：${b} → ${b}÷${D(a)}＝${D(H)}`]}};
G.t25=l=>{
  if(l===1){const [a,b]=pick([[60,30],[40,60],[30,20],[60,40],[12,6],[36,18],[45,30],[20,30]]);const v=2*a*b/(a+b);const Dk=lcm(a,b);return{q:`A 町と B 町の間を、行きは時速 ${a} km、帰りは時速 ${b} km で往復しました。往復の平均の速さは時速何 km ですか。`,a:Q(v),fmt:'int',unit:'km',steps:[`道のりを ${Dk} km とおく：行き ${Dk/a} 時間、帰り ${Dk/b} 時間`,`往復 ${2*Dk} km ÷ ${Dk/a+Dk/b} 時間＝${v}（速さの平均 ${(a+b)/2} ではない）`]}}
  if(l===2){const v1=pick([60,70,80]),v2=pick([120,150,200]),t1=R(5,20),t2=R(3,10);return{q:`家から分速 ${v1} m で ${t1} 分歩き、そのあと分速 ${v2} m で ${t2} 分走って駅に着きました。家から駅まで何 m ありますか。`,a:Q(v1*t1+v2*t2),fmt:'int',unit:'m',steps:[`歩いた道のり ${v1}×${t1}＝${v1*t1} m`,`走った道のり ${v2}×${t2}＝${v2*t2} m`,`合計 ${v1*t1+v2*t2} m`]}}
  const [v1,v2]=pick([[60,80],[50,75],[60,90],[40,60],[80,100]]);const late=R(1,4),early=R(1,4),d=late+early;const Dm=d*v1*v2/(v2-v1);const L=lcm(v1,v2),dd=L/v1-L/v2;
  return{q:`家から学校まで、分速 ${v1} m で歩くと始業に ${late} 分おくれ、分速 ${v2} m で歩くと始業の ${early} 分前に着きます。家から学校までの道のりは何 m ありますか。`,a:Q(Dm),fmt:'int',unit:'m',steps:[`2 つの歩き方でかかる時間の差は ${late}＋${early}＝${d} 分`,`道のりを ${v1} と ${v2} の最小公倍数 ${L} m とおくと、時間の差は ${L/v1}－${L/v2}＝${dd} 分`,`実際の差は ${d} 分なので ${L}×${d}÷${dd}＝${Dm} m`]}};
G.t26=l=>{let a,b,s,h,r,tr=0;do{[a,b]=pick([[20,20],[20,30],[20,40],[25,40],[30,40]]);s=pick([50,100,200,300,400]);const ab=a*b;if(s>=ab){tr++;continue}const g=gcd(ab,ab-s);const unit=(ab-s)/g;h=unit*R(1,Math.max(1,Math.floor(25/unit)));r=ab*h/(ab-s);tr++}while((!(h>=3&&h<=30)||s>=a*b)&&tr<200);
  if(l===1)return{q:`たて ${a} cm、横 ${b} cm の直方体の水そうに、深さ ${h} cm まで水が入っています。底面積 ${s} cm² の角柱を底までまっすぐ沈めると、水の深さは何 cm になりますか。（水はあふれない）`,a:Q(r),fmt:'int',unit:'cm',steps:[`水の体積は変わらない：${a}×${b}×${h}＝${a*b*h} cm³`,`水が入る底面積は ${a*b}－${s}＝${a*b-s} cm²`,`${a*b*h}÷${a*b-s}＝${r} cm`]};
  if(l===2){const up=r-h;return{q:`たて ${a} cm、横 ${b} cm の直方体の水そうに、深さ ${h} cm まで水が入っています。底面積 ${s} cm² の角柱を底までまっすぐ沈めると、水面は何 cm 上がりますか。`,a:Q(up),fmt:'int',unit:'cm',steps:[`沈めたあとの深さ：${a*b*h}÷(${a*b}－${s})＝${r} cm`,`${r}－${h}＝${up} cm 上がる`]}}
  const rate=pick([100,200,250,500]),t=a*b*h/rate;if(t%1!==0)return G.t26(3);
  return{q:`たて ${a} cm、横 ${b} cm の直方体の水そうに、毎分 ${rate} cm³ の割合で水を入れます。深さ ${h} cm になるのは何分後ですか。`,a:Q(t),fmt:'int',unit:'分後',steps:[`必要な水：${a}×${b}×${h}＝${a*b*h} cm³`,`${a*b*h}÷${rate}＝${t} 分`]}};


/* ---------- 道場の生成器 → 算数マスターの単元 ---------- */
const MAP = {
  c1:'g4-計算順序', c2:'jk-bunsu-keisan', c3:'g5-分数', c4:'g6-分数かけ割り', c5:'jk-bunsu-keisan',
  c6:'jk-gyakusan', c7:'jk-kufu', c8:'g4-単位',
  n1:'g5-倍数約数', n2:'jk-baisu', n3:'jk-baisu', n4:'g4-がい数', n5:'jk-amari',
  r1:'jk-wariai', r2:'jk-wariai', r3:'jk-hi', r4:'jk-hi',
  s1:'jk-hayasa', s2:'jk-hayasa',
  g1:'jk-kakudo', g2:'jk-kakudo', g3:'jk-menseki', g4:'jk-en', g5:'jk-taiseki', g6:'jk-fukugou', g7:'g6-拡大縮小',
  d1:'jk-heikin', d2:'jk-baai',
  t1:'jk-wasa', t2:'jk-tsurukame', t3:'jk-ueki', t4:'jk-amari', t5:'jk-kabusoku', t6:'jk-heikin',
  t7:'jk-nenrei', t8:'jk-baisuu-zan', t9:'jk-soutou', t10:'jk-shoukyo', t11:'jk-shigoto', t12:'jk-newton',
  t13:'jk-tabibito', t14:'jk-tsuuka', t15:'jk-ryuusui', t16:'jk-tokei', t17:'jk-noudo', t18:'jk-songi',
  t20:'jk-houjin', t21:'jk-amari', t22:'jk-suuretsu', t23:'jk-michi', t24:'jk-souji', t25:'jk-hayasa-hi',
  t26:'jk-suisou',
};
const BY_UNIT = {};
Object.entries(MAP).forEach(([k, u]) => { if (G[k]) (BY_UNIT[u] = BY_UNIT[u] || []).push(k); });

/* ---------- HTML → 文字 ---------- */
function text(h) {
  return String(h == null ? '' : h)
    // 分数を先に文字にする（中に </span> があると、計算式のかこみが途中で切れる）
    .replace(/<span class="mixed">(\d+)<\/span>/g, '$1と')
    .replace(/<span class="frac"><span>([^<]*)<\/span><span>([^<]*)<\/span><\/span>/g, '$1/$2')
    .replace(/<span class="num" style="[^"]*">([\s\S]*?)<\/span>/g, '【$1】')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

/* ---------- 答えの形 ---------- */
const fracOpts = (r, unit) => {
  const cands = [Q(r.n + 1, r.d), Q(r.n, r.d + 1), Q(r.d, r.n), qa(r, Q(1)), Q(Math.max(1, r.n - 1), r.d), Q(r.n, r.d + 2)]
    .filter(x => x.n > 0 && !qeq(x, r));
  const seen = new Set([frTxt(r)]), out = [frTxt(r)];
  cands.forEach(x => { const t = frTxt(x); if (out.length < 4 && !seen.has(t)) { seen.add(t); out.push(t); } });
  return out.map(t => t + (unit || ''));
};
const ratioOpts = s => {
  const p = s.split(':').map(Number);
  const red = a => { const g = a.reduce((x, y) => gcd(x, y)); return a.map(x => x / g).join(':'); };
  const cands = [p.slice().reverse(), p.map((x, i) => i === 0 ? x + 1 : x), p.map((x, i) => i === p.length - 1 ? x + 1 : x),
                 p.map((x, i) => i === 1 ? x + 1 : x)].map(red);
  const out = [s];
  cands.forEach(c => { if (out.length < 4 && !out.includes(c)) out.push(c); });
  return out.map(x => x.replace(/:/g, '：'));
};
const finite = q => q && typeof q === 'object' && isFinite(q.n / q.d);

function toQuestion(o) {
  const unit = o.unit || '';
  const base = { q: text(o.q), steps: (o.steps || []).map(text) };
  const a = o.a;
  if (o.fmt === 'choice') {
    // 選択肢は4つまで（正解＋ほかから3つ）
    const ch = (o.choices || []).map(String), ok = String(a);
    const rest = shuffle(ch.filter(c => c !== ok)).slice(0, 3);
    return Object.assign(base, { opts: [ok].concat(rest), a: 0 });
  }
  if (o.fmt === 'ratio') return Object.assign(base, { opts: ratioOpts(String(a)), a: 0 });
  if (!finite(a)) return null;
  const numOK = a.d === 1 || ((o.fmt === 'int' || o.fmt === 'dec' || o.fmt === 'any') && isTerm(a));
  if (numOK) return Object.assign(base, { ans: a.n / a.d, tol: 1e-6, unitLabel: unit });
  return Object.assign(base, { opts: fracOpts(a, unit), a: 0 });
}

// 道場のレベル(1〜3) ← 算数マスターの問題のレベル(1〜5)
const levelOf = lv => (lv || 1) <= 1 ? 1 : (lv <= 2 ? 2 : 3);

function make(key, lv) {
  for (let i = 0; i < 8; i++) {          // まれに条件を満たさない数が出るので作り直す
    let o = null;
    try { o = G[key](levelOf(lv)); } catch (e) { o = null; }
    const q = o && toQuestion(o);
    if (q && q.q && !/undefined|NaN|Infinity/.test(q.q + (q.opts || []).join() + (q.ans == null ? '' : q.ans))
        && (q.ans != null ? isFinite(q.ans) : (q.opts.length >= 2 && q.a >= 0))) {
      return Object.assign(q, { _gen: key });
    }
  }
  return null;
}

const has = unitId => !!BY_UNIT[unitId];
const forUnit = unitId => BY_UNIT[unitId] || [];
function variant(unitId, lv) {
  const ks = forUnit(unitId);
  if (!ks.length) return null;
  return make(pick(ks), lv);
}

return { make, variant, has, forUnit, MAP, keys: () => Object.keys(G), text };
})();
