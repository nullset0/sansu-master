/* =========================================================
   算数マスター v2 — データ登録所 (core.js)
   単元 = { id, name, area, emoji, lv, tag, teach, qs }
   ========================================================= */
window.DATA = (() => {
'use strict';
const units = [], byId = new Map(), qAll = [], qByUnit = new Map();

const AREAS = {
  'g1': {name:'1年生', emoji:'🍎', kind:'grade', order:1},
  'g2': {name:'2年生', emoji:'🐣', kind:'grade', order:2},
  'g3': {name:'3年生', emoji:'🐬', kind:'grade', order:3},
  'g4': {name:'4年生', emoji:'🚀', kind:'grade', order:4},
  'g5': {name:'5年生', emoji:'🔭', kind:'grade', order:5},
  'g6': {name:'6年生', emoji:'🎓', kind:'grade', order:6},
  'jk-num':   {name:'数の性質と規則', emoji:'🔢', kind:'juken', order:11},
  'jk-ratio': {name:'割合と比',       emoji:'⚖️', kind:'juken', order:12},
  'jk-toku':  {name:'特殊算',         emoji:'🧩', kind:'juken', order:13},
  'jk-speed': {name:'速さ',           emoji:'🏃', kind:'juken', order:14},
  'jk-geo':   {name:'図形',           emoji:'📐', kind:'juken', order:15},
  'jk-calc':  {name:'計算の力',        emoji:'🧮', kind:'juken', order:10},
  'jk-hard':  {name:'難関チャレンジ',  emoji:'🏔️', kind:'juken', order:16},
};

function addUnit(u) {
  if (byId.has(u.id)) return;
  units.push(u); byId.set(u.id, u);
  const base = (u.qs || []).map((q,i) => Object.assign({
    unit: u.id, lv: q.lv || u.lv || 1, tag: q.tag || u.name,
    pattern: q.pattern !== undefined ? q.pattern : (u.area.startsWith('jk') ? u.name : null),
  }, q, { id: q.id || `${u.id}-${i+1}` }));

  // 誘導つきの大問（parts）は、小問1つずつを独立した問題に展開する。
  // (2) だけを単独で練習できるように、前の小問の答えは「わかっていること」として渡す。
  const list = [];
  base.forEach(q => {
    if (!Array.isArray(q.parts)) { list.push(q); return; }
    q.parts.forEach((p, pi) => {
      const given = q.parts.slice(0, pi)
        .map((pp, k) => `(${k+1}) ${pp.label || 'こたえ'} ＝ ${pp.ans}${pp.unitLabel || ''}`);
      list.push(Object.assign({}, q, p, {
        id: `${q.id}-p${pi+1}`,
        parts: undefined,
        lead: q.q, leadFig: q.fig,
        fig: p.fig || null,
        partIndex: pi + 1, partTotal: q.parts.length,
        given: given.length ? given : null,
        lv: p.lv || q.lv,
        q: p.q,
      }));
    });
  });
  qByUnit.set(u.id, list);
  list.forEach(q => qAll.push(q));
  u.qs = list;
}
function addUnits(arr) { arr.forEach(addUnit); }

/* 既存の単元に問題を足す（増量用）。id が無いものは連番を振り直す */
function extendUnit(id, qs) {
  const u = byId.get(id);
  if (!u || !qs || !qs.length) return;
  const cur = qByUnit.get(id) || [];
  const start = cur.length;
  const add = qs.map((q,i) => Object.assign({
    unit: id, lv: q.lv || u.lv || 1, tag: q.tag || u.name,
    pattern: q.pattern !== undefined ? q.pattern : (u.area.startsWith('jk') ? u.name : null),
  }, q, { id: q.id || `${id}-x${start+i+1}` }));
  add.forEach(q => { cur.push(q); qAll.push(q); });
  qByUnit.set(id, cur);
  u.qs = cur;
}
function extendUnits(map) { Object.entries(map).forEach(([id, qs]) => extendUnit(id, qs)); }

const byUnit  = id => qByUnit.get(id) || [];
const unit    = id => byId.get(id);
const byArea  = a  => units.filter(u => u.area === a);
const areasOf = kind => Object.entries(AREAS).filter(([,v]) => !kind || v.kind === kind)
  .sort((a,b)=>a[1].order-b[1].order).map(([id,v]) => ({id, ...v}));
const qsOfArea = a => byArea(a).flatMap(u => byUnit(u.id));
const all = () => qAll;
const unitsMap = () => Object.fromEntries(units.map(u=>[u.id,u]));

return { AREAS, addUnit, addUnits, extendUnit, extendUnits, units, unit, byUnit, byArea, areasOf, qsOfArea, all, unitsMap,
  get count(){ return qAll.length; } };
})();
