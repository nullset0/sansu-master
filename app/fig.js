/* =========================================================
   算数マスター v2 — 図形エンジン (fig.js)
   すべての図は「与えられた数値から座標を計算して」描く。
   目分量で置いた点は 1 つも無い（＝図が数値と必ず一致する）。
   使い方: Fig.render({type:'poly', ...}) -> SVG文字列
   ========================================================= */
const Fig = (() => {
'use strict';

// ---- パレット --------------------------------------------------
const INK = '#2b3245';
const SUB = '#64748b';
const C  = { a:'#ff8a3d', b:'#38bdf8', c:'#5cc85c', d:'#ff6f91', e:'#fbbf24', f:'#a78bfa', g:'#94a3b8', w:'#ffffff' };
const CL = { a:'#ffe6d1', b:'#ddf2ff', c:'#dcf5d6', d:'#ffdde6', e:'#fff2cc', f:'#eae3ff', g:'#e8edf3', w:'#ffffff' };
const col  = k => C[k]  || k || C.b;
const coll = k => CL[k] || (C[k] ? CL[k] : k) || CL.b;

const VW = 640;            // すべての図の viewBox 幅
const SW = 2.4;            // 標準の線幅

// ---- 小道具 ----------------------------------------------------
const esc = s => String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const n = v => Math.round(v * 100) / 100;
const P = (x,y) => `${n(x)},${n(y)}`;

function txt(x, y, s, o = {}) {
  if (s == null || s === '') return '';
  const size = o.size || 17, anchor = o.anchor || 'middle';
  const fill = o.fill || INK, w = o.weight || 700;
  const dy = o.baseline === 'middle' ? '0.35em' : (o.dy || 0);
  const halo = o.halo === false ? '' :
    `<text x="${n(x)}" y="${n(y)}" dy="${dy}" text-anchor="${anchor}" font-size="${size}" font-weight="${w}"
       stroke="${PAPERBG}" stroke-width="${o.haloW || 5}" stroke-linejoin="round" paint-order="stroke">${esc(s)}</text>`;
  const t = `<text x="${n(x)}" y="${n(y)}" dy="${dy}" text-anchor="${anchor}" font-size="${size}" font-weight="${w}" fill="${fill}">${esc(s)}</text>`;
  return `<g class="fig-t">${halo}${t}</g>`;
}
let PAPERBG = '#fffdf7';

function line(x1,y1,x2,y2,o={}) {
  return `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${o.stroke||INK}"
    stroke-width="${o.w||SW}" stroke-linecap="${o.cap||'round'}" ${o.dash?`stroke-dasharray="${o.dash}"`:''} ${o.opacity?`opacity="${o.opacity}"`:''}/>`;
}
function path(d,o={}) {
  return `<path d="${d}" fill="${o.fill||'none'}" stroke="${o.stroke||INK}" stroke-width="${o.w==null?SW:o.w}"
    stroke-linejoin="round" stroke-linecap="${o.cap||'round'}" ${o.dash?`stroke-dasharray="${o.dash}"`:''} ${o.opacity!=null?`opacity="${o.opacity}"`:''}/>`;
}
function rect(x,y,w,h,o={}) {
  return `<rect x="${n(x)}" y="${n(y)}" width="${n(Math.max(0,w))}" height="${n(Math.max(0,h))}" rx="${o.r||0}"
    fill="${o.fill||'none'}" stroke="${o.stroke||'none'}" stroke-width="${o.w||SW}" ${o.dash?`stroke-dasharray="${o.dash}"`:''} ${o.opacity!=null?`opacity="${o.opacity}"`:''}/>`;
}
function circ(cx,cy,r,o={}) {
  return `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${o.fill||'none'}" stroke="${o.stroke||'none'}"
    stroke-width="${o.w||SW}" ${o.dash?`stroke-dasharray="${o.dash}"`:''}/>`;
}
function poly(pts,o={}) {
  return `<polygon points="${pts.map(p=>P(p[0],p[1])).join(' ')}" fill="${o.fill||'none'}"
    stroke="${o.stroke||INK}" stroke-width="${o.w==null?SW:o.w}" stroke-linejoin="round" ${o.dash?`stroke-dasharray="${o.dash}"`:''} ${o.opacity!=null?`opacity="${o.opacity}"`:''}/>`;
}

// 矢印つきの寸法線
function dim(x1,y1,x2,y2,label,o={}) {
  const dx=x2-x1, dy=y2-y1, L=Math.hypot(dx,dy) || 1;
  const ux=dx/L, uy=dy/L, nx=-uy, ny=ux;
  const h = 7;
  const head = (px,py,sx,sy) =>
    path(`M ${P(px,py)} L ${P(px+sx*h*1.6+nx*h*0.6, py+sy*h*1.6+ny*h*0.6)} L ${P(px+sx*h*1.6-nx*h*0.6, py+sy*h*1.6-ny*h*0.6)} Z`,
      {fill:o.stroke||SUB, stroke:o.stroke||SUB, w:1});
  const mx=(x1+x2)/2, my=(y1+y2)/2;
  const off = o.off == null ? 13 : o.off;
  return line(x1,y1,x2,y2,{stroke:o.stroke||SUB,w:1.6})
    + head(x1,y1,ux,uy) + head(x2,y2,-ux,-uy)
    + txt(mx + nx*off, my + ny*off, label, {size:o.size||16, fill:o.stroke||SUB, baseline:'middle'});
}

// 中カッコ（線分図の「まとめ」用）p1→p2 に沿って depth ぶんふくらむ
function brace(x1,y1,x2,y2,depth,label,o={}) {
  const dx=x2-x1, dy=y2-y1, L=Math.hypot(dx,dy)||1;
  const ux=dx/L, uy=dy/L, nx=-uy, ny=ux;
  const p = (t,off) => [x1+ux*L*t+nx*off, y1+uy*L*t+ny*off];
  const d = depth, s = o.stroke || SUB;
  const A=p(0,0), a1=p(0.03,d*0.85), a2=p(0.20,d*0.85), a3=p(0.44,d*0.85),
        t1=p(0.48,d*0.85), TIP=p(0.5,d*1.6), t2=p(0.52,d*0.85),
        b1=p(0.56,d*0.85), b2=p(0.80,d*0.85), b3=p(0.97,d*0.85), B=p(1,0);
  const dpath = `M ${P(...A)} Q ${P(...a1)} ${P(...a2)} L ${P(...a3)} Q ${P(...t1)} ${P(...TIP)}
                 Q ${P(...t2)} ${P(...b1)} L ${P(...b2)} Q ${P(...b3)} ${P(...B)}`;
  const lp = p(0.5, d*1.6 + (d>0?1:-1)*14);
  return path(dpath,{stroke:s,w:1.8}) + txt(lp[0], lp[1], label, {size:o.size||16, fill:o.labelFill||INK, baseline:'middle'});
}

// 直角記号
function rightAngle(vx,vy,p1,p2,size=13) {
  const u1=norm(p1[0]-vx,p1[1]-vy), u2=norm(p2[0]-vx,p2[1]-vy);
  const a=[vx+u1[0]*size, vy+u1[1]*size], b=[vx+u2[0]*size, vy+u2[1]*size];
  const c=[a[0]+u2[0]*size, a[1]+u2[1]*size];
  return path(`M ${P(...a)} L ${P(...c)} L ${P(...b)}`, {stroke:INK, w:1.8});
}
function norm(x,y){ const L=Math.hypot(x,y)||1; return [x/L,y/L]; }

// 角の弧（頂点 v、2辺の向き p1,p2）＋ラベル
function angleArc(vx,vy,p1,p2,label,o={}) {
  const a1=Math.atan2(p1[1]-vy,p1[0]-vx), a2=Math.atan2(p2[1]-vy,p2[0]-vx);
  let da=a2-a1; while(da<=-Math.PI) da+=2*Math.PI; while(da>Math.PI) da-=2*Math.PI;
  const r=o.r||26, sweep = da>0?1:0;
  const s=[vx+Math.cos(a1)*r, vy+Math.sin(a1)*r], e=[vx+Math.cos(a2)*r, vy+Math.sin(a2)*r];
  const mid=a1+da/2;
  return path(`M ${P(...s)} A ${r} ${r} 0 0 ${sweep} ${P(...e)}`, {stroke:o.stroke||C.d, w:2})
    + txt(vx+Math.cos(mid)*(r+18), vy+Math.sin(mid)*(r+18), label, {size:o.size||16, fill:o.stroke||C.d, baseline:'middle'});
}

// 辺の等長マーク（|, ||, |||）
function tickMark(x1,y1,x2,y2,count=1,o={}) {
  const mx=(x1+x2)/2, my=(y1+y2)/2;
  const [ux,uy]=norm(x2-x1,y2-y1), nx=-uy, ny=ux, g=4.5, h=7;
  let out='';
  for (let i=0;i<count;i++){
    const t=(i-(count-1)/2)*g;
    out += line(mx+ux*t+nx*h, my+uy*t+ny*h, mx+ux*t-nx*h, my+uy*t-ny*h, {stroke:o.stroke||INK, w:2});
  }
  return out;
}

// 数値ラベルを見やすく（1/2 → 分数表示）
function fracText(x,y,num,den,o={}) {
  const size=o.size||17, w=Math.max(String(num).length,String(den).length)*size*0.6;
  return txt(x, y-size*0.42, num, {size:size*0.92, fill:o.fill})
    + line(x-w/2, y, x+w/2, y, {stroke:o.fill||INK, w:1.8})
    + txt(x, y+size*0.98, den, {size:size*0.92, fill:o.fill});
}

// 座標フレーム（数学座標→画面座標）。等倍でフィットさせる
function frame(pts, W, H, pad) {
  const xs=pts.map(p=>p[0]), ys=pts.map(p=>p[1]);
  const x0=Math.min(...xs), x1=Math.max(...xs), y0=Math.min(...ys), y1=Math.max(...ys);
  const w=(x1-x0)||1, h=(y1-y0)||1;
  const s=Math.min((W-pad*2)/w, (H-pad*2)/h);
  const ox=(W-w*s)/2 - x0*s, oy=(H-h*s)/2 + y1*s;
  return { s, X:x=>ox+x*s, Y:y=>oy-y*s, pt:p=>[ox+p[0]*s, oy-p[1]*s] };
}

function wrap(h, inner, spec) {
  const cap = spec && spec.caption
    ? `<div class="fig-cap">${esc(spec.caption)}</div>` : '';
  return `<figure class="fig${spec && spec.tone ? ' tone-'+spec.tone : ''}">
    <svg viewBox="0 0 ${VW} ${n(h)}" class="fig-svg" role="img" aria-label="${esc((spec&&spec.alt)||(spec&&spec.caption)||'図')}">
      ${inner}
    </svg>${cap}</figure>`;
}

/* =========================================================
   1. 線分図 — 和差算 / 分配算 / 相当算 / 年齢算 / 倍数算
   {type:'segment', rows:[{label, parts:[{v, text, fill, dashed}], tail}], braces:[...], unit}
   ========================================================= */
function segment(sp) {
  const rows = sp.rows || [];
  const L = 96;                       // 左のラベル欄
  const W = VW - L - 46;
  const totals = rows.map(r => (r.parts||[]).reduce((a,p)=>a+(p.v||0),0));
  const max = sp.max || Math.max(...totals, 1);
  const rowH = sp.rowH || 46, gap = sp.gap || 30;
  const hasTop = !!sp.topBrace || (sp.braces||[]).some(b => b.side === 'top');
  const topPad = hasTop ? 58 : 18;
  let y = topPad, out = '';
  const geo = [];

  rows.forEach((r,ri) => {
    let x = L;
    const barY = y, bh = 26;
    out += txt(L-14, barY+bh/2, r.label, {anchor:'end', baseline:'middle', size:17});
    (r.parts||[]).forEach((p,pi) => {
      const w = (p.v/max)*W;
      const fill = p.fill === 'none' ? 'none' : coll(p.fill || (pi%2 ? 'b' : 'a'));
      const st   = col(p.fill || (pi%2 ? 'b' : 'a'));
      out += rect(x, barY, w, bh, {fill, stroke:p.dashed?st:INK, w:2.2, r:4, dash:p.dashed?'6 5':null});
      if (p.text) out += txt(x+w/2, barY+bh/2, p.text, {baseline:'middle', size:16});
      geo.push({ri, pi, x0:x, x1:x+w, y:barY, h:bh});
      x += w;
    });
    if (r.tail) out += txt(x+10, barY+bh/2, r.tail, {anchor:'start', baseline:'middle', size:16, fill:SUB});
    // 行の右端そろえの点線
    if (r.guide) out += line(x, barY-6, x, y+rowH+gap-10, {stroke:SUB, w:1.2, dash:'4 4'});
    y += rowH;
  });

  const bottom = y;
  // まとめカッコ
  (sp.braces||[]).forEach(b => {
    const seg = geo.filter(g => g.ri === (b.row==null?0:b.row));
    const from = seg[b.from==null?0:b.from], to = seg[b.to==null?seg.length-1:b.to];
    if (!from || !to) return;
    if (b.side === 'top') {
      out += brace(from.x0, from.y-10, to.x1, from.y-10, -13, b.text, {labelFill: b.color?col(b.color):INK});
    } else {
      out += brace(from.x0, to.y+to.h+8, to.x1, to.y+to.h+8, 14, b.text, {labelFill: b.color?col(b.color):INK});
    }
  });
  // 行をまたぐ差分の矢印
  (sp.diffs||[]).forEach(d => {
    const a = geo.filter(g=>g.ri===d.rowA).slice(-1)[0];
    const b = geo.filter(g=>g.ri===d.rowB).slice(-1)[0];
    if (!a || !b) return;
    const yy = Math.max(a.y+a.h, b.y+b.h) + 4;
    out += line(a.x1, a.y, a.x1, yy+8, {stroke:C.d, w:1.4, dash:'4 4'});
    out += line(b.x1, b.y, b.x1, yy+8, {stroke:C.d, w:1.4, dash:'4 4'});
    out += dim(Math.min(a.x1,b.x1), yy+8, Math.max(a.x1,b.x1), yy+8, d.text, {stroke:C.d, off:-14});
  });
  const h = bottom + (sp.braces&&sp.braces.some(b=>b.side!=='top') ? 52 : 16) + (sp.diffs?34:0);
  if (sp.topBrace) {
    const g0 = geo.filter(g=>g.ri===0);
    out += brace(g0[0].x0, topPad-10, g0[g0.length-1].x1, topPad-10, -16, sp.topBrace);
  }
  return wrap(h, out, sp);
}

/* =========================================================
   2. 面積図 — つるかめ算 / 平均算 / 食塩水 / 速さ
   {type:'areaModel', blocks:[{w,h,label,fill,dashed}], xLabel, yLabel, notes:[]}
   ========================================================= */
function areaModel(sp) {
  const blocks = sp.blocks || [];
  const PADL = 62, PADR = 40, PADT = 34, PADB = 66;
  const H = sp.height || 300;
  const totW = blocks.reduce((a,b)=>a+b.w, 0) || 1;
  const maxH = Math.max(...blocks.map(b=>Math.max(b.h, b.h2||0)), 1);
  const W = VW - PADL - PADR, PH = H - PADT - PADB;
  const sx = W/totW, sy = PH/maxH;
  const y0 = PADT + PH;
  let out = '', x = PADL;

  // 目盛り軸
  out += line(PADL, PADT-8, PADL, y0, {stroke:SUB, w:1.8});
  out += line(PADL, y0, PADL+W+8, y0, {stroke:SUB, w:1.8});

  blocks.forEach((b,i) => {
    const w = b.w*sx, h = b.h*sy;
    out += rect(x, y0-h, w, h, {fill:coll(b.fill||(i%2?'b':'a')), stroke:INK, w:2.2, dash:b.dashed?'6 5':null});
    if (b.h2 != null) { // 差の部分（つるかめの「はみ出し」）
      const h2 = b.h2*sy;
      out += rect(x, y0-h2, w, h2-h, {fill:coll('d'), stroke:C.d, w:2, dash:'6 5'});
      if (b.label2) out += txt(x+w/2, y0-(h+h2)/2, b.label2, {baseline:'middle', size:15, fill:C.d});
    }
    if (b.label) out += txt(x+w/2, y0-h/2, b.label, {baseline:'middle', size:16});
    if (b.wLabel) out += txt(x+w/2, y0+24, b.wLabel, {size:16, fill:SUB});
    if (b.hLabel) out += txt(x - 10, y0-h/2, b.hLabel, {anchor:'end', baseline:'middle', size:15, fill:SUB});
    if (i>0) out += line(x, y0, x, y0-Math.max(h, blocks[i-1].h*sy), {stroke:INK, w:1.4, dash:'4 4'});
    x += w;
  });
  // 全体の横幅寸法
  if (sp.totalLabel) out += dim(PADL, y0+54, PADL+W, y0+54, sp.totalLabel, {off:-13});
  // 補助の水平点線
  (sp.hLines||[]).forEach(hl => {
    const yy = y0 - hl.v*sy;
    out += line(PADL, yy, PADL+W+8, yy, {stroke:hl.color?col(hl.color):C.f, w:1.6, dash:'6 4'});
    out += txt(PADL+W+10, yy, hl.label, {anchor:'end', size:14, fill:hl.color?col(hl.color):C.f, dy:-6});
  });
  out += txt(PADL-4, PADT-16, sp.yLabel||'', {anchor:'start', size:15, fill:SUB});
  out += txt(PADL+W+8, y0+22, sp.xLabel||'', {anchor:'end', size:15, fill:SUB});
  return wrap(H, out, sp);
}

/* =========================================================
   3. てんびん図 — 濃度算 / 平均算
   {type:'balance', points:[{x, w, label}], fulcrum:数値, xLabel}
   腕の長さは x の差そのもの（＝正しくつり合う位置に支点が来る）
   ========================================================= */
function balance(sp) {
  const pts = sp.points || [];
  const PADL = 70, PADR = 70, H = sp.height || 300;
  const xs = pts.map(p=>p.x).concat([sp.fulcrum]);
  const lo = Math.min(...xs), hi = Math.max(...xs), span = (hi-lo)||1;
  const W = VW-PADL-PADR;
  const X = v => PADL + (v-lo)/span*W;
  const beamY = sp.beamY || 200;
  let out = '';
  out += line(PADL-24, beamY, PADL+W+24, beamY, {stroke:INK, w:5});
  // 支点
  const fx = X(sp.fulcrum);
  out += poly([[fx,beamY+4],[fx-20,beamY+50],[fx+20,beamY+50]], {fill:coll('e'), stroke:INK, w:2.4});
  out += txt(fx, beamY+72, sp.fulcrumLabel!=null?sp.fulcrumLabel:sp.fulcrum, {size:18, fill:C.a});
  // おもり
  const maxw = Math.max(...pts.map(p=>p.w||1),1);
  pts.forEach(p => {
    const px = X(p.x);
    const bw = 30 + 34*Math.sqrt((p.w||1)/maxw), bh = 26 + 26*Math.sqrt((p.w||1)/maxw);
    out += line(px, beamY, px, beamY-26, {stroke:INK, w:2});
    out += rect(px-bw/2, beamY-26-bh, bw, bh, {fill:coll(p.fill||'b'), stroke:INK, w:2.4, r:5});
    out += txt(px, beamY-26-bh/2, p.w!=null?p.w:'', {baseline:'middle', size:15});
    out += txt(px, beamY-26-bh-12, p.label||'', {size:16});
    out += txt(px, beamY+26, p.x, {size:17, fill:col(p.fill||'b')});
  });
  // 腕の長さ
  if (pts.length === 2) {
    const [p1,p2] = pts;
    const maxw2 = Math.max(...pts.map(p=>p.w||1),1);
    const topY = pts.reduce((m,p) => Math.min(m, beamY-26-(26+26*Math.sqrt((p.w||1)/maxw2))), beamY);
    const yy = topY - 34;
    out += dim(X(p1.x), yy, fx, yy, sp.armLeft || n(Math.abs(sp.fulcrum-p1.x)), {stroke:C.d});
    out += dim(fx, yy, X(p2.x), yy, sp.armRight || n(Math.abs(p2.x-sp.fulcrum)), {stroke:C.d});
    out += line(X(p1.x), beamY-4, X(p1.x), yy, {stroke:C.d, w:1, dash:'3 4', opacity:0.5});
    out += line(fx, beamY-4, fx, yy, {stroke:C.d, w:1, dash:'3 4', opacity:0.5});
    out += line(X(p2.x), beamY-4, X(p2.x), yy, {stroke:C.d, w:1, dash:'3 4', opacity:0.5});
  }
  out += txt(VW-16, H-10, sp.xLabel||'', {anchor:'end', size:15, fill:SUB});
  return wrap(H, out, sp);
}

/* =========================================================
   4. ダイヤグラム（進行グラフ） — 旅人算 / 速さとグラフ / 水量変化
   {type:'travel', xMax, yMax, xLabel, yLabel, xStep, yStep,
    lines:[{pts:[[x,y],..], label, color, dashed}], marks:[{x,y,label}], areas:[]}
   ========================================================= */
function travel(sp) {
  const PADL = 66, PADR = 40, PADT = 40, PADB = 66;
  const H = sp.height || 330;
  const W = VW-PADL-PADR, PH = H-PADT-PADB;
  const xMax = sp.xMax, yMax = sp.yMax, xMin = sp.xMin||0, yMin = sp.yMin||0;
  const X = v => PADL + (v-xMin)/(xMax-xMin)*W;
  const Y = v => PADT + PH - (v-yMin)/(yMax-yMin)*PH;
  let out = '';
  // グリッド
  const xs = sp.xStep || (xMax-xMin)/6, ys = sp.yStep || (yMax-yMin)/5;
  for (let v=xMin; v<=xMax+1e-9; v+=xs) {
    out += line(X(v), PADT, X(v), PADT+PH, {stroke:'#e3e9f0', w:1});
    out += txt(X(v), PADT+PH+22, sp.xFmt?sp.xFmt(v):n(v), {size:14, fill:SUB, weight:600});
  }
  for (let v=yMin; v<=yMax+1e-9; v+=ys) {
    out += line(PADL, Y(v), PADL+W, Y(v), {stroke:'#e3e9f0', w:1});
    out += txt(PADL-10, Y(v), sp.yFmt?sp.yFmt(v):n(v), {anchor:'end', baseline:'middle', size:14, fill:SUB, weight:600});
  }
  out += line(PADL, PADT, PADL, PADT+PH, {stroke:SUB, w:2});
  out += line(PADL, PADT+PH, PADL+W, PADT+PH, {stroke:SUB, w:2});
  // 折れ線
  (sp.lines||[]).forEach((ln,i) => {
    const c = col(ln.color || ['a','b','c','f'][i%4]);
    const d = ln.pts.map((p,j)=>`${j?'L':'M'} ${P(X(p[0]),Y(p[1]))}`).join(' ');
    out += path(d, {stroke:c, w:3.2, dash: ln.dashed?'8 5':null});
    ln.pts.forEach(p => { out += circ(X(p[0]),Y(p[1]),4.5,{fill:c}); });
    if (ln.label) {
      const last = ln.pts[ln.labelAt!=null?ln.labelAt:ln.pts.length-1];
      out += txt(X(last[0]) + (ln.dx||-6), Y(last[1]) + (ln.dy||-14), ln.label, {size:16, fill:c, anchor:ln.anchor||'end'});
    }
  });
  // 交点など
  (sp.marks||[]).forEach(m => {
    out += circ(X(m.x), Y(m.y), 7, {fill:'#fff', stroke:C.d, w:3});
    out += line(X(m.x), Y(m.y), X(m.x), PADT+PH, {stroke:C.d, w:1.2, dash:'4 4'});
    out += line(X(m.x), Y(m.y), PADL, Y(m.y), {stroke:C.d, w:1.2, dash:'4 4'});
    if (m.label) out += txt(X(m.x)+(m.dx||10), Y(m.y)+(m.dy||-14), m.label, {size:15, fill:C.d, anchor:m.anchor||'start'});
  });
  out += txt(PADL-54, PADT-16, sp.yLabel||'', {anchor:'start', size:14, fill:SUB});
  out += txt(VW-12, PADT+PH+46, sp.xLabel||'', {anchor:'end', size:14, fill:SUB});
  return wrap(H, out, sp);
}

/* =========================================================
   5. 数直線
   {type:'numline', min, max, step, subStep, ticks:[{v,label,color}], spans:[{from,to,label}]}
   ========================================================= */
function numline(sp) {
  const PADL = 46, PADR = 46;
  const W = VW-PADL-PADR;
  const min=sp.min, max=sp.max;
  const X = v => PADL + (v-min)/(max-min)*W;
  const spans = sp.spans || [];
  const yAxis = 60 + (sp.spansAbove ? 0 : 0);
  const H = sp.height || (110 + spans.length*36);
  let out = line(PADL-16, yAxis, PADL+W+16, yAxis, {stroke:INK, w:2.4});
  out += path(`M ${P(PADL+W+16,yAxis)} l -11,-6 l 0,12 Z`, {fill:INK, stroke:INK, w:1});
  const step = sp.step || (max-min)/5;
  const sub = sp.subStep;
  if (sub) for (let v=min; v<=max+1e-9; v+=sub) out += line(X(v), yAxis-5, X(v), yAxis+5, {stroke:SUB, w:1.4});
  for (let v=min; v<=max+1e-9; v+=step) {
    out += line(X(v), yAxis-10, X(v), yAxis+10, {stroke:INK, w:2});
    out += txt(X(v), yAxis+32, sp.fmt?sp.fmt(v):n(v), {size:16, fill:SUB});
  }
  (sp.ticks||[]).forEach(t => {
    const c = col(t.color||'d');
    out += line(X(t.v), yAxis-30, X(t.v), yAxis+12, {stroke:c, w:2.6});
    out += circ(X(t.v), yAxis, 6, {fill:c});
    out += txt(X(t.v), yAxis-40, t.label, {size:17, fill:c});
  });
  spans.forEach((s,i) => {
    const yy = yAxis + 64 + i*34;
    out += dim(X(s.from), yy, X(s.to), yy, s.label, {stroke:col(s.color||'b'), off:-14});
    out += line(X(s.from), yAxis+10, X(s.from), yy, {stroke:col(s.color||'b'), w:1, dash:'3 4'});
    out += line(X(s.to), yAxis+10, X(s.to), yy, {stroke:col(s.color||'b'), w:1, dash:'3 4'});
  });
  return wrap(H, out, sp);
}

/* =========================================================
   6. 割合の帯（2段：割合と実際の量）
   {type:'ratioBar', parts:[{v, top, bottom, fill}], topTotal, bottomTotal}
   ========================================================= */
function ratioBar(sp) {
  const PADL = 30, PADR = 30, W = VW-PADL-PADR, bh = 54;
  const y = sp.topTotal ? 96 : 56;
  const parts = sp.parts||[];
  const tot = parts.reduce((a,p)=>a+p.v,0)||1;
  let x = PADL, out = '';
  parts.forEach((p,i) => {
    const w = p.v/tot*W;
    out += rect(x, y, w, bh, {fill:coll(p.fill||['a','b','c','f','e'][i%5]), stroke:INK, w:2.2});
    if (p.top)    out += txt(x+w/2, y-12, p.top, {size:16, fill:col(p.fill||['a','b','c','f','e'][i%5])});
    if (p.label)  out += txt(x+w/2, y+bh/2, p.label, {baseline:'middle', size:16});
    if (p.bottom) out += txt(x+w/2, y+bh+26, p.bottom, {size:16});
    x += w;
  });
  let h = y+bh+ (parts.some(p=>p.bottom)?44:20);
  if (sp.topTotal)    { out += brace(PADL, y-38, PADL+W, y-38, -13, sp.topTotal); }
  if (sp.bottomTotal) { out += brace(PADL, h+4, PADL+W, h+4, 14, sp.bottomTotal); h += 52; }
  return wrap(h, out, sp);
}

/* =========================================================
   7. 多角形（座標そのままで描くので寸法が必ず正しい）
   {type:'poly', pts:[[x,y],..], names:'ABCD', sides:[{i,label,ticks}],
    angles:[{i,label,right}], fillC, inner:[{pts,fill,dashed}], segs:[[[x,y],[x,y]]],
    dots:[{p,label}], hatch:[i,..]}
   ========================================================= */
function polyFig(sp) {
  const H = sp.height || 300;
  const all = [...sp.pts];
  (sp.inner||[]).forEach(o => o.pts.forEach(p=>all.push(p)));
  // segs は [始点, 終点, 色?, 実線?] の形。座標だけを拾う（色や真偽値を混ぜると座標がNaNになる）
  (sp.segs||[]).forEach(s => s.slice(0,2).forEach(p=>all.push(p)));
  (sp.dots||[]).forEach(d => all.push(d.p));
  const f = frame(all, VW, H, sp.pad || 46);
  const S = sp.pts.map(f.pt);
  const cx = S.reduce((a,p)=>a+p[0],0)/S.length, cy = S.reduce((a,p)=>a+p[1],0)/S.length;
  let out = '';
  // 塗り
  out += poly(S, {fill: sp.fillC===false?'none':coll(sp.fillC||'b'), stroke:'none'});
  (sp.inner||[]).forEach(o => {
    out += poly(o.pts.map(f.pt), {fill:o.fill?coll(o.fill):'none', stroke:o.stroke?col(o.stroke):INK, w:o.w||2, dash:o.dashed?'7 5':null});
  });
  out += poly(S, {stroke:INK, w:2.8});
  // 補助線
  (sp.segs||[]).forEach(s => {
    const a=f.pt(s[0]), b=f.pt(s[1]);
    out += line(a[0],a[1],b[0],b[1], {stroke:s[2]?col(s[2]):SUB, w:2, dash: s[3]===false?null:'7 5'});
  });
  // 辺のラベル・等長マーク
  (sp.sides||[]).forEach(sd => {
    const a=S[sd.i], b=S[(sd.i+1)%S.length];
    const mx=(a[0]+b[0])/2, my=(a[1]+b[1])/2;
    const [ux,uy]=norm(mx-cx, my-cy);
    if (sd.label) out += txt(mx+ux*(sd.off||20), my+uy*(sd.off||20), sd.label, {size:16, baseline:'middle', fill:sd.color?col(sd.color):INK});
    if (sd.ticks) out += tickMark(a[0],a[1],b[0],b[1],sd.ticks,{stroke:sd.color?col(sd.color):INK});
  });
  // 角
  (sp.angles||[]).forEach(an => {
    const v=S[an.i], p1=S[(an.i-1+S.length)%S.length], p2=S[(an.i+1)%S.length];
    if (an.right) out += rightAngle(v[0],v[1],p1,p2, an.size||14);
    else out += angleArc(v[0],v[1],p1,p2, an.label, {r:an.r||26, stroke:an.color?col(an.color):C.d});
    if (an.right && an.label) {
      const [ux,uy]=norm((p1[0]+p2[0])/2-v[0], (p1[1]+p2[1])/2-v[1]);
      out += txt(v[0]+ux*40, v[1]+uy*40, an.label, {size:15, fill:C.d, baseline:'middle'});
    }
  });
  // 頂点の名前
  if (sp.names) {
    S.forEach((p,i) => {
      const [ux,uy]=norm(p[0]-cx, p[1]-cy);
      out += txt(p[0]+ux*22, p[1]+uy*22, sp.names[i]||'', {size:18, baseline:'middle', fill:INK});
      out += circ(p[0],p[1],3.6,{fill:INK});
    });
  }
  (sp.dots||[]).forEach(d => {
    const p=f.pt(d.p);
    out += circ(p[0],p[1], d.r||5, {fill: d.fill?col(d.fill):C.d});
    if (d.label) out += txt(p[0]+(d.dx||0), p[1]+(d.dy||-16), d.label, {size:16, fill:d.fill?col(d.fill):C.d});
  });
  (sp.texts||[]).forEach(t => { const p=f.pt(t.p); out += txt(p[0],p[1],t.text,{size:t.size||17, baseline:'middle', fill:t.color?col(t.color):INK}); });
  return wrap(H, out, sp);
}

/* =========================================================
   8. 円・おうぎ形（中心角は本物の角度で描く）
   {type:'circle', r, sector:[from,to], rLabel, angleLabel, chord, marks, inner:{r}}
   ========================================================= */
function circleFig(sp) {
  const H = sp.height || 280;
  const cx = VW/2, cy = H/2;
  const R = sp.R || Math.min(H/2-44, 108);
  const a0 = sp.sector ? sp.sector[0] : 0, a1 = sp.sector ? sp.sector[1] : 360;
  const rad = d => (-d) * Math.PI/180;      // 反時計まわり・0°=右
  const pt = (deg,r) => [cx + Math.cos(rad(deg))*r, cy + Math.sin(rad(deg))*r];
  let out = '';
  const full = (a1-a0) >= 360;
  const large = (a1-a0) > 180 ? 1 : 0;
  const s = pt(a0,R), e = pt(a1,R);
  if (full) {
    out += circ(cx,cy,R,{fill: sp.fillC===false?'none':coll(sp.fillC||'b'), stroke:INK, w:2.8});
  } else {
    out += path(`M ${P(cx,cy)} L ${P(...s)} A ${R} ${R} 0 ${large} 0 ${P(...e)} Z`,
      {fill: sp.fillC===false?'none':coll(sp.fillC||'b'), stroke:INK, w:2.8});
    if (sp.ghost !== false) out += circ(cx,cy,R,{stroke:'#cbd5e1', w:1.4, dash:'6 6'});
  }
  if (sp.innerR) {
    out += circ(cx,cy,R*sp.innerR/sp.r, {fill:PAPERBG, stroke:INK, w:2.4});
    if (sp.innerLabel) out += txt(cx, cy+ R*sp.innerR/sp.r/2, sp.innerLabel, {size:15, fill:SUB, baseline:'middle'});
  }
  out += circ(cx,cy,3.6,{fill:INK});
  if (sp.centerLabel) out += txt(cx-12, cy+16, sp.centerLabel, {size:16});
  // 半径の寸法
  if (sp.rLabel) {
    const deg = sp.rAt!=null ? sp.rAt : (full ? -60 : (a0+a1)/2);
    const m = pt(deg, R);
    out += line(cx,cy,m[0],m[1], {stroke:SUB, w:1.8, dash:'6 4'});
    // 線に対して垂直にずらして重なりを避ける
    const ux=(m[0]-cx)/R, uy=(m[1]-cy)/R;
    const away = full ? 1 : ((a1-a0) > 0 ? 1 : -1);
    out += txt((cx+m[0])/2 + uy*16*away, (cy+m[1])/2 - ux*16*away, sp.rLabel,
      {size:16, fill:SUB, baseline:'middle'});
  }
  if (sp.dLabel) {
    const l = pt(180,R), r2 = pt(0,R);
    out += dim(l[0], cy, r2[0], cy, sp.dLabel, {off:-14});
  }
  // 中心角
  if (sp.angleLabel) {
    out += angleArc(cx,cy, pt(a0,R), pt(a1,R), sp.angleLabel, {r:sp.angleR||42, stroke:C.d});
  }
  if (sp.chord) { out += line(s[0],s[1],e[0],e[1], {stroke:C.a, w:2.4}); }
  (sp.points||[]).forEach(p => {
    const q = pt(p.deg, R);
    out += circ(q[0],q[1],4.5,{fill:col(p.color||'d')});
    const u = norm(q[0]-cx, q[1]-cy);
    out += txt(q[0]+u[0]*20, q[1]+u[1]*20, p.label, {size:17, baseline:'middle'});
  });
  if (sp.arcLabel) {
    const m = pt((a0+a1)/2, R);
    const u = norm(m[0]-cx, m[1]-cy);
    out += txt(m[0]+u[0]*26, m[1]+u[1]*26, sp.arcLabel, {size:16, fill:C.a, baseline:'middle'});
  }
  return wrap(H, out, sp);
}

/* =========================================================
   9. 方眼（面積・点の移動・図形の合成）
   {type:'grid', w, h, shapes:[{pts,fill,dashed}], dots:[{x,y,label}], path:[[x,y]..], labels:[]}
   ========================================================= */
function gridFig(sp) {
  const gw=sp.w, gh=sp.h;
  const H = sp.height || 300;
  const pad = sp.pad || 34;
  const cell = Math.min((VW-pad*2)/gw, (H-pad*2)/gh);
  const ox = (VW-cell*gw)/2, oy = (H-cell*gh)/2 + cell*gh;
  const X = x => ox + x*cell, Y = y => oy - y*cell;
  let out = '';
  for (let i=0;i<=gw;i++) out += line(X(i), Y(0), X(i), Y(gh), {stroke: i%(sp.major||gw+1)===0?'#c3ccd8':'#e3e9f0', w:1});
  for (let j=0;j<=gh;j++) out += line(X(0), Y(j), X(gw), Y(j), {stroke: j%(sp.major||gh+1)===0?'#c3ccd8':'#e3e9f0', w:1});
  out += rect(X(0), Y(gh), cell*gw, cell*gh, {stroke:'#94a3b8', w:1.6});
  (sp.shapes||[]).forEach((s,i) => {
    out += poly(s.pts.map(p=>[X(p[0]),Y(p[1])]),
      {fill: s.fill===false?'none':coll(s.fill||['a','b','c'][i%3]), stroke: s.stroke?col(s.stroke):INK, w:2.6, dash:s.dashed?'7 5':null, opacity:s.opacity});
  });
  (sp.path||[]).length && (out += path(sp.path.map((p,i)=>`${i?'L':'M'} ${P(X(p[0]),Y(p[1]))}`).join(' '), {stroke:C.d, w:3, dash:'8 5'}));
  (sp.dots||[]).forEach(d => {
    out += circ(X(d.x), Y(d.y), 6, {fill:col(d.color||'d')});
    if (d.label) out += txt(X(d.x), Y(d.y)-16, d.label, {size:16, fill:col(d.color||'d')});
  });
  (sp.labels||[]).forEach(l => out += txt(X(l.x), Y(l.y), l.text, {size:l.size||16, baseline:'middle'}));
  if (sp.cellLabel) out += txt(X(0)+cell/2, Y(gh)-14, sp.cellLabel, {size:14, fill:SUB});
  return wrap(H, out, sp);
}

/* =========================================================
   10. 立体（等角投影）— 直方体 / 立方体 / 円柱 / 三角柱 / 角すい / 円すい
   {type:'solid', shape:'cuboid', w,d,h, labels:{w,d,h}, cut:{...}}
   ========================================================= */
function solid(sp) {
  const H = sp.height || 300;
  const shape = sp.shape || 'cuboid';
  // 斜投影（キャビネット図法）＝日本の教科書の「見取図」と同じ描き方
  //   +x → 右（実寸）／ +z → 上（実寸）／ +y（奥行き）→ 右上45°に 0.5倍
  // 正面は本物の長方形になるので、たて・よこの寸法がそのまま読める
  const DX = 0.38, DY = 0.34;                 // 奥行きの見え方
  const p3 = (x,y,z) => [ x + y*DX, z + y*DY ];
  const W=sp.w||4, D=sp.d||3, Hh=sp.h||3, R=sp.r||2;
  let raw = [], draw = [];
  const collect = pts => { pts.forEach(p=>raw.push(p)); return pts; };

  if (shape==='cuboid' || shape==='cube') {
    const w = shape==='cube' ? (sp.a||3) : W, d = shape==='cube' ? (sp.a||3) : D, h = shape==='cube' ? (sp.a||3) : Hh;
    const v = {
      A:p3(0,0,0), B:p3(w,0,0), C:p3(w,d,0), D:p3(0,d,0),
      E:p3(0,0,h), F:p3(w,0,h), G:p3(w,d,h), Hh:p3(0,d,h)
    };
    collect(Object.values(v));
    draw.push({kind:'shape', v});
  } else if (shape==='cylinder' || shape==='cone') {
    const rx = R, ry = R*0.34;
    raw = [[-rx,-ry],[rx,-ry],[-rx,Hh+ry],[rx,Hh+ry]];
    draw.push({kind:shape, rx, ry, h:Hh});
  } else if (shape==='prism') {  // 三角柱
    const base = sp.base || [[0,0],[W,0],[W*0.8,D]];
    const bot = base.map(b=>p3(b[0],b[1],0)), top = base.map(b=>p3(b[0],b[1],Hh));
    collect(bot.concat(top));
    draw.push({kind:'prism', bot, top});
  } else if (shape==='pyramid') {
    const base = sp.base || [[0,0],[W,0],[W,D],[0,D]];
    const bot = base.map(b=>p3(b[0],b[1],0));
    const apexXY = sp.apex || [W/2, D/2];
    const apex = p3(apexXY[0], apexXY[1], Hh);
    collect(bot.concat([apex]));
    draw.push({kind:'pyramid', bot, apex});
  }

  const f = frame(raw, VW, H, sp.pad||64);
  const T = p => f.pt(p);
  let out = '';
  const face = (pts, fill, o={}) => poly(pts.map(T), {fill: coll(fill), stroke:INK, w:2.6, opacity:o.opacity});
  const edge = (a,b,dash) => { const A=T(a),B=T(b); return line(A[0],A[1],B[0],B[1], {stroke:INK, w:2.4, dash: dash?'7 5':null, opacity: dash?0.55:1}); };

  draw.forEach(g => {
    if (g.kind==='shape') {
      const v=g.v;
      out += face([v.A,v.B,v.F,v.E], sp.frontC||'a');   // 正面 y=0
      out += face([v.B,v.C,v.G,v.F], sp.sideC||'e');    // 右 x=w
      out += face([v.E,v.F,v.G,v.Hh], sp.topC||'b');    // 上面
      // 見えない奥の辺（頂点D まわり）は点線で上に重ねる＝教科書の見取図と同じ
      out += edge(v.A,v.D,true) + edge(v.D,v.C,true) + edge(v.D,v.Hh,true);
      const L = sp.labels||{};
      if (L.w) { const a=T(v.A), b=T(v.B); out += dim(a[0]-6,a[1]+16,b[0]-6,b[1]+16, L.w, {off:14}); }
      if (L.d) { const a=T(v.B), b=T(v.C); out += dim(a[0]+16,a[1]+10,b[0]+16,b[1]+10, L.d, {off:12}); }
      if (L.h) { const a=T(v.A), b=T(v.E); out += dim(a[0]-24,a[1],b[0]-24,b[1], L.h, {off:-16}); }
    }
    if (g.kind==='cylinder') {
      const {rx,ry,h}=g;
      const bc=T([0,0]), tc=T([0,h]);
      const RX = rx*f.s, RY = ry*f.s;
      // 底面（見えない後ろ半分は破線）
      out += path(`M ${P(bc[0]-RX,bc[1])} A ${n(RX)} ${n(RY)} 0 0 0 ${P(bc[0]+RX,bc[1])}`, {stroke:INK, w:2, dash:'7 5', opacity:0.5});
      out += rect(bc[0]-RX, tc[1], RX*2, bc[1]-tc[1], {fill:coll(sp.fillC||'b'), stroke:'none'});
      out += path(`M ${P(bc[0]-RX,bc[1])} A ${n(RX)} ${n(RY)} 0 0 1 ${P(bc[0]+RX,bc[1])}`, {stroke:INK, w:2.6});
      out += line(bc[0]-RX, bc[1], tc[0]-RX, tc[1], {stroke:INK, w:2.6});
      out += line(bc[0]+RX, bc[1], tc[0]+RX, tc[1], {stroke:INK, w:2.6});
      out += `<ellipse cx="${n(tc[0])}" cy="${n(tc[1])}" rx="${n(RX)}" ry="${n(RY)}" fill="${coll(sp.topC||sp.fillC||'b')}" stroke="${INK}" stroke-width="2.6"/>`;
      const L=sp.labels||{};
      if (L.r) { out += line(tc[0],tc[1],tc[0]+RX,tc[1],{stroke:SUB,w:1.8,dash:'5 4'}); out += circ(tc[0],tc[1],3,{fill:SUB}); out += txt(tc[0]+RX/2, tc[1]-10, L.r, {size:16, fill:SUB}); }
      if (L.h) out += dim(bc[0]+RX+30, bc[1], tc[0]+RX+30, tc[1], L.h, {off:16});
    }
    if (g.kind==='cone') {
      const {rx,ry,h}=g;
      const bc=T([0,0]), ap=T([0,h]);
      const RX=rx*f.s, RY=ry*f.s;
      out += path(`M ${P(bc[0]-RX,bc[1])} A ${n(RX)} ${n(RY)} 0 0 0 ${P(bc[0]+RX,bc[1])}`, {stroke:INK, w:2, dash:'7 5', opacity:0.5});
      out += path(`M ${P(bc[0]-RX,bc[1])} L ${P(ap[0],ap[1])} L ${P(bc[0]+RX,bc[1])} A ${n(RX)} ${n(RY)} 0 0 1 ${P(bc[0]-RX,bc[1])} Z`,
        {fill:coll(sp.fillC||'a'), stroke:INK, w:2.6});
      const L=sp.labels||{};
      if (L.h) out += dim(bc[0]+RX+30, bc[1], ap[0]+RX+30, ap[1], L.h, {off:16});
      if (L.r) { out += line(bc[0],bc[1],bc[0]+RX,bc[1],{stroke:SUB,w:1.8,dash:'5 4'}); out += circ(bc[0],bc[1],3,{fill:SUB}); out += txt(bc[0]+RX/2, bc[1]-10, L.r, {size:16, fill:SUB}); }
    }
    if (g.kind==='prism') {
      const {bot,top}=g;
      // 底面は隠れるので破線だけ
      for (let i=0;i<bot.length;i++) out += edge(bot[i], bot[(i+1)%bot.length], true);
      // 手前の面から奥へ描く（画面下にある辺ほど手前）
      const idx = bot.map((p,i)=>i).sort((a,b) => (bot[b][1]+bot[(b+1)%bot.length][1]) - (bot[a][1]+bot[(a+1)%bot.length][1]));
      idx.forEach((i,k) => {
        const j=(i+1)%bot.length;
        out += face([bot[i],bot[j],top[j],top[i]], ['e','f','b','a'][k%4]);
      });
      out += poly(top.map(T), {fill:coll(sp.topC||'c'), stroke:INK, w:2.6});
      const L=sp.labels||{};
      if (L.h) { const a=T(bot[0]), b=T(top[0]); out += dim(a[0]-24,a[1],b[0]-24,b[1], L.h, {off:-16}); }
    }
    if (g.kind==='pyramid') {
      const {bot,apex}=g;
      for (let i=0;i<bot.length;i++) out += edge(bot[i], bot[(i+1)%bot.length], true);
      // 手前（画面下）の面を後に描く
      const idx = bot.map((p,i)=>i).sort((a,b) => (bot[b][1]+bot[(b+1)%bot.length][1]) - (bot[a][1]+bot[(a+1)%bot.length][1]));
      idx.forEach((i,k) => {
        const j=(i+1)%bot.length;
        out += face([bot[i],bot[j],apex], ['b','e','a','c'][k%4]);
      });
      const L=sp.labels||{};
      if (L.h) {
        const c = bot.reduce((a,p)=>[a[0]+p[0]/bot.length, a[1]+p[1]/bot.length],[0,0]);
        const A=T(c), B=T(apex);
        out += line(A[0],A[1],B[0],B[1], {stroke:C.d, w:1.8, dash:'6 4'});
        out += txt((A[0]+B[0])/2+18, (A[1]+B[1])/2, L.h, {size:16, fill:C.d, baseline:'middle'});
      }
    }
  });
  return wrap(H, out, sp);
}

/* =========================================================
   11. 展開図
   {type:'net', kind:'cube', cells:[[c,r,label,fill]], w,h}
   ========================================================= */
function net(sp) {
  const gw = sp.gw || 4, gh = sp.gh || 3;
  const H = sp.height || 260;
  const cell = Math.min((VW-90)/gw, (H-60)/gh);
  const ox = (VW-cell*gw)/2, oy = (H-cell*gh)/2;
  let out = '';
  (sp.cells||[]).forEach(c => {
    const x = ox + c[0]*cell, y = oy + c[1]*cell;
    const cw = (c[4]||1)*cell, ch = (c[5]||1)*cell;
    out += rect(x, y, cw, ch, {fill:coll(c[3]||'b'), stroke:INK, w:2.4});
    if (c[2]) out += txt(x+cw/2, y+ch/2, c[2], {baseline:'middle', size:c[6]||20});
  });
  if (sp.dimLabel) out += txt(VW/2, H-8, sp.dimLabel, {size:15, fill:SUB});
  return wrap(H, out, sp);
}

/* =========================================================
   12. 時計（時計算：長針・短針の角度を計算して描く）
   {type:'clock', h, m, showAngle, angleLabel}
   ========================================================= */
function clockFig(sp) {
  const H = sp.height || 260;
  const cx=VW/2, cy=H/2, R=Math.min(H/2-24, 104);
  const hAng = ((sp.h%12) + (sp.m||0)/60) * 30;   // 度（12時=0、時計まわり）
  const mAng = ((sp.m||0) + (sp.s||0)/60) * 6;
  const pt = (deg,r) => [cx + Math.sin(deg*Math.PI/180)*r, cy - Math.cos(deg*Math.PI/180)*r];
  let out = circ(cx,cy,R,{fill:'#ffffff', stroke:INK, w:3.4});
  out += circ(cx,cy,R-9,{stroke:'#e2e8f0', w:1.5});
  for (let i=0;i<60;i++) {
    const big = i%5===0;
    const a=pt(i*6, R-6), b=pt(i*6, R-(big?16:11));
    out += line(a[0],a[1],b[0],b[1], {stroke: big?INK:'#b6c2d1', w: big?2.6:1.4});
  }
  for (let i=1;i<=12;i++) {
    const p = pt(i*30, R-38);
    out += txt(p[0],p[1], i, {size:19, baseline:'middle', fill:INK, halo:false});
  }
  if (sp.showAngle) {
    const r=R*0.42;
    let d = mAng - hAng; while(d<0) d+=360;
    const useAng = sp.reflex ? d : (d>180 ? 360-d : d);
    const from = sp.reflex ? hAng : (d>180 ? mAng : hAng);
    const sweep = sp.reflex ? d : useAng;
    const s = pt(from, r), e = pt(from+sweep, r);
    out += path(`M ${P(cx,cy)} L ${P(...s)} A ${n(r)} ${n(r)} 0 ${sweep>180?1:0} 1 ${P(...e)} Z`,
      {fill:'rgba(255,111,145,0.22)', stroke:C.d, w:2});
    const mp = pt(from+sweep/2, r+26);
    out += txt(mp[0], mp[1], sp.angleLabel!=null?sp.angleLabel:`${n(useAng)}°`, {size:17, fill:C.d, baseline:'middle'});
  }
  const hp = pt(hAng, R*0.45), mp2 = pt(mAng, R*0.66);
  out += line(cx,cy,hp[0],hp[1], {stroke:INK, w:7});
  out += line(cx,cy,mp2[0],mp2[1], {stroke:C.b, w:5});
  out += circ(cx,cy,7,{fill:INK});
  if (sp.timeLabel !== false)
    out += txt(cx, cy+R+22, sp.timeLabel || `${sp.h}時${String(sp.m).padStart(2,'0')}分`, {size:18});
  return wrap(H + 26, out, sp);
}

/* =========================================================
   13. 分数図（帯 / 円 / 数直線）— 比べられるように複数段
   {type:'frac', kind:'bar'|'pie', rows:[{den, num, label}]}
   ========================================================= */
function fracFig(sp) {
  const rows = sp.rows || [{den:sp.den, num:sp.num, label:sp.label}];
  if ((sp.kind||'bar') === 'pie') {
    const H = 200;
    const R = 68, gap = VW/rows.length;
    let out = '';
    rows.forEach((r,i) => {
      const cx = gap*(i+0.5), cy = 92;
      const step = 360/r.den;
      for (let k=0;k<r.den;k++) {
        const a0=-90+k*step, a1=-90+(k+1)*step;
        const s=[cx+Math.cos(a0*Math.PI/180)*R, cy+Math.sin(a0*Math.PI/180)*R];
        const e=[cx+Math.cos(a1*Math.PI/180)*R, cy+Math.sin(a1*Math.PI/180)*R];
        out += path(`M ${P(cx,cy)} L ${P(...s)} A ${R} ${R} 0 ${step>180?1:0} 1 ${P(...e)} Z`,
          {fill: k<r.num ? coll(r.fill||'a') : '#ffffff', stroke:INK, w:2});
      }
      out += circ(cx,cy,R,{stroke:INK,w:2.6});
      out += txt(cx, cy+R+28, r.label || `${r.num}/${r.den}`, {size:18});
    });
    return wrap(H, out, sp);
  }
  const PADL=64, W=VW-PADL-40, bh=40, gap=22;
  let out='', y=18;
  rows.forEach(r => {
    const cw = W/r.den;
    for (let k=0;k<r.den;k++)
      out += rect(PADL+k*cw, y, cw, bh, {fill: k<r.num ? coll(r.fill||'a') : '#ffffff', stroke:INK, w:2});
    out += rect(PADL, y, W, bh, {stroke:INK, w:2.6});
    out += fracText(PADL-30, y+bh/2, r.num, r.den, {size:16});
    if (r.label) out += txt(PADL+W+10, y+bh/2, r.label, {anchor:'start', baseline:'middle', size:15, fill:SUB});
    y += bh+gap;
  });
  return wrap(y+8, out, sp);
}

/* =========================================================
   14. 樹形図
   {type:'tree', levels:[{label, items:[..]}], leafLabel}
   ========================================================= */
function treeFig(sp) {
  const levels = sp.levels || [];
  const H = sp.height || 300;
  const colW = (VW-80)/(levels.length+0.4);
  let leaves = 1; levels.forEach(l => leaves *= l.items.length);
  const rowH = (H-56)/Math.max(leaves,1);
  let out = '';
  const startX = 44;
  function rec(depth, y0, y1, px, py) {
    if (depth >= levels.length) return;
    const items = levels[depth].items;
    const h = (y1-y0)/items.length;
    items.forEach((it,i) => {
      const cy = y0 + h*(i+0.5), cx = startX + colW*(depth+1);
      out += path(`M ${P(px,py)} C ${P(px+colW*0.45,py)} ${P(cx-colW*0.45,cy)} ${P(cx,cy)}`, {stroke:'#94a3b8', w:1.8});
      out += rect(cx-24, cy-14, 48, 28, {fill:coll(['a','b','c','f'][depth%4]), stroke:INK, w:2, r:8});
      out += txt(cx, cy, it, {baseline:'middle', size:15});
      rec(depth+1, cy-h/2, cy+h/2, cx+24, cy);
    });
  }
  out += circ(startX, H/2, 6, {fill:INK});
  rec(0, 28, H-28, startX+6, H/2);
  levels.forEach((l,i) => out += txt(startX+colW*(i+1), 18, l.label||'', {size:14, fill:SUB}));
  return wrap(H, out, sp);
}

/* =========================================================
   15. ベン図
   {type:'venn', a:{label,n}, b:{label,n}, both, outside, total}
   ========================================================= */
function vennFig(sp) {
  const H = sp.height || 300;
  const R = 84, cx = VW/2, cy = H/2 + 16, d = 104;
  let out = rect(cx-190, cy-110, 380, 220, {stroke:INK, w:2, r:10, fill:'#ffffff'});
  out += `<g style="mix-blend-mode:multiply">`
    + circ(cx-d/2, cy, R, {fill:coll('b'), stroke:col('b'), w:2.6})
    + circ(cx+d/2, cy, R, {fill:coll('a'), stroke:col('a'), w:2.6}) + `</g>`;
  out += txt(cx-d/2-30, cy, sp.a && sp.a.n!=null ? sp.a.n : '', {size:20, baseline:'middle'});
  out += txt(cx+d/2+30, cy, sp.b && sp.b.n!=null ? sp.b.n : '', {size:20, baseline:'middle'});
  out += txt(cx, cy, sp.both!=null?sp.both:'', {size:20, baseline:'middle'});
  out += txt(cx-d/2-30, cy-R-40, sp.a && sp.a.label || '', {size:16, fill:col('b')});
  out += txt(cx+d/2+30, cy-R-40, sp.b && sp.b.label || '', {size:16, fill:col('a')});
  if (sp.outside!=null) out += txt(cx+180, cy+92, sp.outside, {anchor:'end', size:16, fill:SUB});
  if (sp.total!=null && sp.total!=='') out += txt(cx-180, cy-88, `全体 ${sp.total}`, {anchor:'start', size:15, fill:SUB});
  return wrap(H, out, sp);
}

/* =========================================================
   16. 水そう（仕切りあり）＋水位
   {type:'tank', w, h, level, parts:[{w,h,label,fill}], labels}
   ========================================================= */
function tank(sp) {
  const H = sp.height || 280;
  const gw = sp.w, gh = sp.h;
  const pad=52;
  const s = Math.min((VW-pad*2)/gw, (H-pad*2)/gh);
  const ox=(VW-gw*s)/2, oy=(H-gh*s)/2 + gh*s;
  const X=x=>ox+x*s, Y=y=>oy-y*s;
  let out = '';
  // 水
  (sp.water||[]).forEach(w => {
    out += rect(X(w.x0), Y(w.y1), (w.x1-w.x0)*s, (w.y1-w.y0)*s, {fill:'#bfe9ff', stroke:'none'});
    out += line(X(w.x0), Y(w.y1), X(w.x1), Y(w.y1), {stroke:'#38bdf8', w:2.6});
  });
  // 容器（コの字）
  out += path(`M ${P(X(0),Y(gh))} L ${P(X(0),Y(0))} L ${P(X(gw),Y(0))} L ${P(X(gw),Y(gh))}`, {stroke:INK, w:3.4});
  // 仕切り
  (sp.walls||[]).forEach(w => out += line(X(w.x), Y(0), X(w.x), Y(w.h), {stroke:INK, w:3.4}));
  (sp.dims||[]).forEach(d => {
    if (d.dir==='h') out += dim(X(d.from), Y(d.at)+ (d.off||24), X(d.to), Y(d.at)+(d.off||24), d.label, {off:-13});
    else out += dim(X(d.at)-(d.off||24), Y(d.from), X(d.at)-(d.off||24), Y(d.to), d.label, {off:-15});
  });
  (sp.labels||[]).forEach(l => out += txt(X(l.x), Y(l.y), l.text, {size:l.size||16, baseline:'middle'}));
  return wrap(H, out, sp);
}

/* =========================================================
   17. 表（規則性・周期・比例）
   {type:'table', head:[..], rows:[[..]], highlight:[[r,c]], note}
   ========================================================= */
function tableFig(sp) {
  const head = sp.head||[], rows = sp.rows||[];
  const cols = Math.max(head.length, ...rows.map(r=>r.length));
  const cw = (VW-40)/cols, rh = 44;
  const H = (rows.length + (head.length?1:0))*rh + 34;
  let out = '', y = 14;
  const cellText = (t,x,yy,bold) => txt(x+cw/2, yy+rh/2, t, {baseline:'middle', size:17, weight:bold?800:600});
  if (head.length) {
    head.forEach((h,i) => { out += rect(20+i*cw, y, cw, rh, {fill:coll('b'), stroke:INK, w:2}); out += cellText(h, 20+i*cw, y, true); });
    y += rh;
  }
  rows.forEach((r,ri) => {
    r.forEach((c,ci) => {
      const hi = (sp.highlight||[]).some(h=>h[0]===ri&&h[1]===ci);
      out += rect(20+ci*cw, y, cw, rh, {fill: hi?coll('e'):'#ffffff', stroke:INK, w:2});
      out += cellText(c, 20+ci*cw, y, hi);
    });
    y += rh;
  });
  if (sp.note) out += txt(VW/2, y+22, sp.note, {size:15, fill:SUB});
  return wrap(H + (sp.note?18:0), out, sp);
}

/* =========================================================
   18. 棒グラフ / 折れ線
   ========================================================= */
function chart(sp) {
  const PADL=58, PADR=24, PADT=38, PADB=54, H=sp.height||290;
  const W=VW-PADL-PADR, PH=H-PADT-PADB;
  const vals = sp.values||[], cats = sp.cats||[];
  const max = sp.yMax || Math.max(...vals)*1.15;
  const Y = v => PADT+PH - v/max*PH;
  let out = line(PADL,PADT,PADL,PADT+PH,{stroke:SUB,w:2}) + line(PADL,PADT+PH,PADL+W,PADT+PH,{stroke:SUB,w:2});
  const step = sp.yStep || max/5;
  for (let v=0; v<=max+1e-9; v+=step) {
    out += line(PADL, Y(v), PADL+W, Y(v), {stroke:'#e3e9f0', w:1});
    out += txt(PADL-8, Y(v), n(v), {anchor:'end', baseline:'middle', size:14, fill:SUB});
  }
  const bw = W/vals.length;
  if ((sp.kind||'bar')==='bar') {
    vals.forEach((v,i) => {
      out += rect(PADL+bw*i+bw*0.18, Y(v), bw*0.64, PADT+PH-Y(v), {fill:coll(sp.color||'b'), stroke:INK, w:2.2, r:5});
      out += txt(PADL+bw*(i+0.5), Y(v)-10, v, {size:15});
    });
  } else {
    out += path(vals.map((v,i)=>`${i?'L':'M'} ${P(PADL+bw*(i+0.5),Y(v))}`).join(' '), {stroke:col(sp.color||'a'), w:3.2});
    vals.forEach((v,i)=> out += circ(PADL+bw*(i+0.5), Y(v), 5, {fill:col(sp.color||'a')}));
  }
  cats.forEach((c,i)=> out += txt(PADL+bw*(i+0.5), PADT+PH+24, c, {size:15, fill:SUB}));
  out += txt(PADL-50, PADT-16, sp.yLabel||'', {anchor:'start', size:14, fill:SUB});
  return wrap(H, out, sp);
}

/* =========================================================
   19. ドット（低学年：具体物）
   ========================================================= */
function dots(sp) {
  const total = sp.n, cols = sp.cols || 5;
  const rows = Math.ceil(total/cols);
  const cell = 46, H = rows*cell + 40;
  const ox = (VW - cols*cell)/2;
  const icons = sp.icon ? [sp.icon] : null;
  let out = '';
  for (let i=0;i<total;i++) {
    const r=Math.floor(i/cols), c=i%cols;
    const x=ox+c*cell+cell/2, y=24+r*cell+cell/2;
    const gi = (sp.groups||[]).findIndex(g => i < g.upto);
    const fill = coll(sp.groups && sp.groups[gi] ? sp.groups[gi].fill : (sp.fill||'a'));
    if (icons) out += txt(x, y, icons[0], {size:30, baseline:'middle', halo:false});
    else out += circ(x,y,16,{fill, stroke:INK, w:2.4});
  }
  (sp.rings||[]).forEach(g => {
    const r0=Math.floor(g.from/cols), c0=g.from%cols, r1=Math.floor((g.to-1)/cols), c1=(g.to-1)%cols;
    if (r0===r1) out += rect(ox+c0*cell+3, 24+r0*cell+3, (c1-c0+1)*cell-6, cell-6, {stroke:col(g.color||'d'), w:2.6, r:20, dash:'7 5'});
  });
  return wrap(H, out, sp);
}

/* =========================================================
   20. 消去算・式の並べ替えなど「式の図」
   {type:'eqs', rows:[{terms:[{c,label,fill}], eq:'=', right:'1200'}]}
   ========================================================= */
function eqs(sp) {
  const rows = sp.rows||[];
  const rh = 54, H = rows.length*rh + 26;
  let out = '';
  rows.forEach((r,ri) => {
    const y = 16 + ri*rh;
    let x = 34;
    (r.terms||[]).forEach((t,i) => {
      const w = 46 + String(t.label).length*10;
      if (i>0) { out += txt(x+10, y+rh/2-8, t.op||'＋', {size:20, baseline:'middle'}); x += 30; }
      out += rect(x, y, w, rh-16, {fill:coll(t.fill||['a','b','c'][i%3]), stroke:INK, w:2.2, r:8});
      out += txt(x+w/2, y+(rh-16)/2, t.label, {baseline:'middle', size:17});
      x += w;
    });
    out += txt(x+22, y+(rh-16)/2, '＝', {size:20, baseline:'middle'});
    out += txt(x+56, y+(rh-16)/2, r.right, {anchor:'start', baseline:'middle', size:18, fill:C.d});
    if (r.tag) out += txt(20, y+(rh-16)/2, r.tag, {anchor:'end', baseline:'middle', size:15, fill:SUB});
  });
  return wrap(H, out, sp);
}

/* =========================================================
   ルーター
   ========================================================= */
const R = {
  segment, seg: segment,
  areaModel, area: areaModel,
  balance,
  travel, diagram: travel, graph: travel,
  numline, numberline: numline,
  ratioBar, ratio: ratioBar,
  poly: polyFig, polygon: polyFig, shape: polyFig,
  circle: circleFig, sector: circleFig,
  grid: gridFig,
  solid,
  net,
  clock: clockFig,
  frac: fracFig, fraction: fracFig,
  tree: treeFig,
  venn: vennFig,
  tank,
  table: tableFig,
  chart, bar: chart, linechart: chart,
  dots,
  eqs,
};

function render(spec) {
  if (!spec) return '';
  if (Array.isArray(spec)) return spec.map(render).join('');
  const fn = R[spec.type];
  if (!fn) return `<div class="fig-err">図の種類「${esc(spec.type)}」は未対応</div>`;
  try { return fn(spec); }
  catch (e) { return `<div class="fig-err">図を描けませんでした（${esc(spec.type)}）</div>`; }
}

return { render, types: Object.keys(R), C, CL, _: {frame, brace, dim, txt, path, line} };
})();
if (typeof window !== 'undefined') window.Fig = Fig;
