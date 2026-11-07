/* 算数マスター 学習記録の週報（Node・deploy対象外）

   使い方:
     node tools/report.js <dataディレクトリ> [日数=7]
   dataディレクトリは VPS の /root/sansu-master/data を rsync したもの（tools/report.sh が取ってくる）。
     events/<dev>/<日>.jsonl  1問ごと
     state/<dev>.json         端末の全体状態（最新）
   出すもの（改善の手がかりになる順）:
     ① ペース: 何日やったか・何問・正答率・時間 / 志望校の目安までの見立て
     ② 苦手な単元（正答率が低い）
     ③ 遅い単元（1問の時間が長い）
     ④ 同じ問題を2回以上まちがえたもの＋答えた値（考え違いの手がかり）
     ⑤ ヒントに頼っている単元
*/
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const APP = path.join(__dirname, '..');
const DIR = process.argv[2];
const DAYS = Number(process.argv[3] || 7);
if (!DIR) { console.error('usage: node tools/report.js <data> [days]'); process.exit(2); }

const ls = {};
const sandbox = {
  console, JSON, Math, Object, Array, Number, String, Boolean, Set, Map, Date,
  structuredClone, parseFloat, parseInt, isNaN, setTimeout, clearTimeout,
  localStorage: { getItem: k => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); }, removeItem: k => { delete ls[k]; } },
};
sandbox.window = sandbox; sandbox.globalThis = sandbox;

// いちばん新しく全体状態を送ってきた端末を主にする（複数端末なら全部の1問記録は合算）
const stDir = path.join(DIR, 'state');
const devs = fs.existsSync(stDir) ? fs.readdirSync(stDir).filter(f => f.endsWith('.json'))
  .map(f => ({ dev: f.slice(0, -5), m: fs.statSync(path.join(stDir, f)).mtimeMs })).sort((a, b) => b.m - a.m) : [];
if (devs.length) ls['sansu-v2'] = fs.readFileSync(path.join(stDir, devs[0].dev + '.json'), 'utf8');

vm.createContext(sandbox);
['app/store.js', 'data/core.js',
 'questions/g1.js','questions/g2.js','questions/g3.js','questions/g4.js','questions/g5.js','questions/g6.js',
 'data/elem.js','data/jk-num.js','data/jk-ratio.js','data/jk-toku.js','data/jk-speed.js','data/jk-geo.js',
 'data/jk-calc.js','data/jk-speed2.js','data/jk-geo2.js','data/jk-num2.js','data/jk-drill.js','data/hard.js',
 'data/graph.js','app/mastery.js','app/goal.js']
  .forEach(f => vm.runInContext(fs.readFileSync(path.join(APP, f), 'utf8'), sandbox, { filename: f }));
const { Store, DATA, Mastery, Goal } = sandbox;
const ALL = DATA.all();
const QBY = Object.fromEntries(ALL.map(q => [q.id, q]));
const uname = id => { const u = DATA.unit(id); return u ? u.name : id; };
const aname = id => { const u = DATA.unit(id); return u ? ((DATA.AREAS[u.area] || {}).name || u.area) : ''; };

// ---- 1問ごとの記録（直近 DAYS 日・日本時間の日付）
const jstDay = iso => new Date(new Date(iso).getTime() + 9 * 3600e3).toISOString().slice(0, 10);
const since = jstDay(new Date(Date.now() - (DAYS - 1) * 86400e3).toISOString());
const evs = [];
const evDir = path.join(DIR, 'events');
if (fs.existsSync(evDir)) for (const dev of fs.readdirSync(evDir)) {
  for (const f of fs.readdirSync(path.join(evDir, dev))) {
    for (const line of fs.readFileSync(path.join(evDir, dev, f), 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try { const e = JSON.parse(line); e.dev = dev; e.day = jstDay(e.t || e.rt); if (e.day >= since) evs.push(e); } catch (_) {}
    }
  }
}
evs.sort((a, b) => (a.t < b.t ? -1 : 1));
const g = evs.filter(e => e.k === 'g');

const pct = (a, b) => (b ? Math.round(a / b * 100) + '%' : '-');
const sec = ms => (ms == null ? '-' : Math.round(ms / 1000) + '秒');
const out = [];
const P = s => out.push(s);

P(`# 算数マスター 週報（${since} 〜 ${jstDay(new Date().toISOString())}・${DAYS}日）`);
P('');
if (!devs.length && !evs.length) { P('記録がまだ届いていません。'); console.log(out.join('\n')); process.exit(0); }

// ① ペース
const days = [...new Set(evs.map(e => e.day))];
const ok = g.filter(e => e.ok).length;
const msAll = g.map(e => e.ms).filter(Boolean);
const msSum = msAll.reduce((a, b) => a + b, 0);
P('## ① ペース');
P(`- やった日: ${days.length}/${DAYS}日・解いた数: ${g.length}問（ほか道具えらび等 ${evs.length - g.length}）・正答率: ${pct(ok, g.length)}`);
P(`- 学習時間: 合計 ${Math.round(msSum / 60000)}分・1問平均 ${sec(msAll.length ? msSum / msAll.length : null)}`);
const byDay = {};
evs.forEach(e => { const d = byDay[e.day] || (byDay[e.day] = { n: 0, ok: 0 }); d.n++; if (e.ok) d.ok++; });
P(`- 日ごと: ${Object.entries(byDay).map(([d, x]) => `${d.slice(5)} ${x.n}問(${pct(x.ok, x.n)})`).join(' / ') || 'なし'}`);
if (devs.length) {
  const sm = Mastery.summary();
  P(`- 進み具合: 済 ${sm.done}/${sm.total}単元・中受 ${sm.jkDone}/${sm.jkTotal}単元・1日の設定 ${Store.get('dailyGoal')}問`);
  const gs = Goal.state && Goal.state();
  if (gs) {
    const v = { ok: '間に合う', tight: 'ぎりぎり', behind: '遅れる' }[gs.verdict] || gs.verdict;
    P(`- 目安までの見立て: 残り${gs.left}単元・入試まで${gs.daysLeft}日・いまのペース ${gs.perDayNow}問/日・必要 ${gs.perDayNeeded}問/日 → **${v}**`);
    P(`- 分野べつ: ${gs.areaRows.map(a => `${a.name} ${a.done}/${a.total}`).join('・')}`);
  }
  const h = Store.state.history.slice(-28);
  if (h.length) P(`- 直近の済単元数の推移: ${h.filter((_, i) => i % 7 === 6 || i === h.length - 1).map(x => `${x.d.slice(5)} ${x.units}`).join(' → ')}`);
}
P('');

// 単元ごとに集計
const U = {};
g.forEach(e => {
  const id = e.u || (QBY[e.q] || {}).unit; if (!id) return;
  const u = U[id] || (U[id] = { id, n: 0, ok: 0, ms: [], h: 0 });
  u.n++; if (e.ok) u.ok++; if (e.ms) u.ms.push(e.ms); if (e.h) u.h++;
});
const rows = Object.values(U).map(u => Object.assign(u, {
  rate: u.ok / u.n, avg: u.ms.length ? u.ms.reduce((a, b) => a + b, 0) / u.ms.length : null,
}));

P('## ② 苦手な単元（3問以上・正答率の低い順）');
const weak = rows.filter(r => r.n >= 3 && r.rate < 0.7).sort((a, b) => a.rate - b.rate).slice(0, 8);
P(weak.length ? weak.map(r => `- ${uname(r.id)}（${aname(r.id)}）: ${r.ok}/${r.n} = ${pct(r.ok, r.n)}`).join('\n') : '- なし');
P('');

P('## ③ 時間がかかっている単元（3問以上・1問の平均）');
const allAvg = msAll.length ? msSum / msAll.length : 0;
const slow = rows.filter(r => r.avg && r.ms.length >= 3 && r.avg > Math.max(allAvg * 1.5, 40000)).sort((a, b) => b.avg - a.avg).slice(0, 8);
P(slow.length ? slow.map(r => `- ${uname(r.id)}: 平均 ${sec(r.avg)}（全体 ${sec(allAvg)}）`).join('\n') : '- なし（全体平均の1.5倍・40秒を超える単元なし）');
P('');

P('## ④ 同じ問題を2回以上まちがえた（答えた値つき）');
const miss = {};
g.filter(e => !e.ok).forEach(e => { (miss[e.q] = miss[e.q] || []).push(e.a); });
const rep = Object.entries(miss).filter(([, a]) => a.length >= 2).slice(0, 12);
P(rep.length ? rep.map(([qid, a]) => {
  const q = QBY[qid] || {};
  const mc = Array.isArray(q.opts) && q.a != null;
  const ans = mc ? q.opts[q.a] : `${q.ans}${q.unitLabel || ''}`;
  const given = a.map(x => (mc && x != null && /^\d+$/.test(x) ? q.opts[+x] : x)).join(' / ');
  return `- ${uname(q.unit)}「${String(q.q || qid).replace(/\s+/g, ' ').slice(0, 50)}」 正解 ${ans} ／ 答えた ${given}`;
}).join('\n') : '- なし');
P('');

P('## ⑤ ヒントに頼っている単元（ヒント率40%以上）');
const hint = rows.filter(r => r.n >= 3 && r.h / r.n >= 0.4).sort((a, b) => b.h / b.n - a.h / a.n).slice(0, 6);
P(hint.length ? hint.map(r => `- ${uname(r.id)}: ${r.h}/${r.n}`).join('\n') : '- なし');

console.log(out.join('\n'));
