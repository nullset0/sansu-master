/* 算数マスターの進度シミュレーション（Node版・ヘッドレス）
   ブラウザ版 _simtest.html と同じモデル。1日の問題数を振って比較する。 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const APP = path.join(__dirname, '..');   // このファイルは <アプリ>/tools/ に置く

// ---- 日付を偽装（Store.today() を動かす）
let DAY = 0;
const RealDate = Date;
const BASE = RealDate.parse('2026-04-06T09:00:00Z');
function FakeDate(...a) {
  if (!(this instanceof FakeDate)) return new FakeDate(...a).toString();
  return a.length ? new RealDate(...a) : new RealDate(BASE + DAY * 86400000);
}
FakeDate.prototype = RealDate.prototype;
FakeDate.now = () => BASE + DAY * 86400000;
FakeDate.parse = RealDate.parse; FakeDate.UTC = RealDate.UTC;

// ---- 最小のブラウザ環境
const store = {};
const sandbox = {
  console, JSON, Math, Object, Array, Number, String, Boolean, Set, Map, Date: FakeDate,
  structuredClone, parseFloat, parseInt, isNaN, setTimeout, clearTimeout,
  localStorage: {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
  },
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const SRC = ['app/store.js', 'data/core.js',
  'questions/g1.js','questions/g2.js','questions/g3.js','questions/g4.js','questions/g5.js','questions/g6.js',
  'data/elem.js','data/jk-num.js','data/jk-ratio.js','data/jk-toku.js','data/jk-speed.js','data/jk-geo.js',
  'data/jk-calc.js','data/jk-speed2.js','data/jk-geo2.js','data/jk-num2.js','data/jk-drill.js','data/hard.js',
  'data/graph.js','app/mastery.js'];
SRC.forEach(f => vm.runInContext(fs.readFileSync(path.join(APP, f), 'utf8'), sandbox, { filename: f }));

const { Store, DATA, Graph, Mastery } = sandbox;

// ---- 生徒モデル（_simtest.html と同一）
const rng = seed => { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
const preDone = id => Graph.pre(id).every(p => Store.state.units[p] && Store.state.units[p].everDone);
function pOf(q, p0) {
  const c = Store.state.cards[q.id];
  const rep = c ? Math.min(3, c.seen) : 0;
  let p = p0 - 0.06 * ((q.lv || 1) - 1);
  if (!preDone(q.unit)) p -= 0.25;
  p += 0.13 * rep;
  return Math.max(0.05, Math.min(0.97, p));
}

function run({ days = 365, perDay = 5, p0 = 0.80, seed = 7, placeAt = 'g3' } = {}) {
  const rnd = rng(seed);
  Object.keys(store).forEach(k => delete store[k]);
  DAY = 0;
  Store.importJSON('{}');
  Store.state.settings.dailyGoal = perDay;
  if (placeAt) Mastery.GRADES.slice(0, Mastery.GRADES.indexOf(placeAt) + 1).forEach(g => Mastery.assumeGrade(g));
  Store.save();

  const daily = [];   // 毎日の到達点
  let stall = 0, checks = 0, demotes = 0;
  for (let d = 0; d < days; d++) {
    DAY = d;
    Store.rollDay();
    if (Mastery.checkDue()) {
      const list = Mastery.buildCheck(10);
      const res = list.map(q => {
        const ok = rnd() < pOf(q, p0) - 0.08;
        Store.grade(q.id, ok, q.unit, {});
        return { id: q.id, unit: q.unit, ok };
      });
      if (res.length >= 3) { const r = Mastery.finishCheck(res); checks++; demotes += r.demoted.length; }
    }
    const plan = Mastery.plan(perDay);
    if (!plan.length) stall++;
    plan.forEach(q => Store.grade(q.id, rnd() < pOf(q, p0), q.unit, {}));
    const s = Mastery.summary();
    daily.push({ done: s.done, jk: s.jkDone });
  }
  const first = f => { const i = daily.findIndex(f); return i < 0 ? null : +( (i+1) / 30.4 ).toFixed(1); };
  const s = Mastery.summary();
  return { perDay, p0, days,
    done: s.done, total: s.total, jk: s.jkDone, jkTotal: s.jkTotal,
    y1_done: (daily[364] || daily[daily.length-1]).done,
    y1_jk:   (daily[364] || daily[daily.length-1]).jk,
    mo_jk30: first(x => x.jk >= 30), mo_jk60: first(x => x.jk >= 60), mo_all: first(x => x.done >= s.total),
    stall, checks, demotes };
}

/* 使い方: node tools/sim.js <1日の問題数,…> <日数> <素の正答率> <開始学年>
   例:    node tools/sim.js 5,10,20 1080 0.65 g2                       */
const rows = [];
const P0 = Number(process.argv[4] || 0.80);
const PLACE = process.argv[5] || 'g3';
for (const perDay of (process.argv[2] || '3,5,8,10,15').split(',').map(Number)) {
  const r = run({ days: Number(process.argv[3] || 1080), perDay, p0: P0, placeAt: PLACE });
  rows.push(r);
  console.log(JSON.stringify(r));
}
console.log(`\n素の正答率 ${P0} ・ 開始 ${PLACE}`);
console.log('\n1日の問題数 | ' + (Number(process.argv[3] || 1080) >= 365 ? '1年後' : '最終日') + 'の中受単元 | 中受30単元まで | 中受60/60まで | 全115単元まで | 停滞日');
rows.forEach(r => console.log(
  `${String(r.perDay).padStart(2)}問 | ${String(r.y1_jk).padStart(2)}/60 | ` +
  `${r.mo_jk30 ? r.mo_jk30 + 'ヶ月' : '未達'} | ${r.mo_jk60 ? r.mo_jk60 + 'ヶ月' : '未達'} | ` +
  `${r.mo_all ? r.mo_all + 'ヶ月' : '未達'} | ${r.stall}日`));
