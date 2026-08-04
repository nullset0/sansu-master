/* =========================================================
   算数マスター v3 — 適応学習エンジン (mastery.js)

   考え方:
     ・単元は【理解 → 定着 → 応用】の3段で評価する
     ・3段そろって はじめて「済」。済になると前提が満たされた
       上の単元が【学年に関係なく】自動でひらく
     ・上でつまずいたら、前提をさかのぼって「穴」を特定し、
       下の学年の問題でも遠慮なく戻って埋める
     ・ときどき抜き打ちチェック。落とした単元は【格下げ】して
       もう一度やり直す（できたつもりを潰す）
   ========================================================= */
const Mastery = (() => {
'use strict';

const BASIC = q => (q.lv || 1) <= 2;
const APPLY = q => (q.lv || 1) >= 4;

const MAX_ACTIVE   = 3;     // 同時に進める単元の数（散らかさない）
const DONE_U = 0.90, DONE_A = 0.70, DONE_R = 0.55;
const OPEN_U = 0.80, OPEN_R = 0.40;

const st = () => Store.state;
const qsOf = id => DATA.byUnit(id);

/* ---------- 単元の状態 ----------
   104単元 × 問題数 を毎回なめると重いので、状態が変わるまでは結果を使い回す */
let _cache = {}, _cacheRev = -1;
function unitState(id) {
  if (Store.rev !== _cacheRev) { _cache = {}; _cacheRev = Store.rev; }
  if (_cache[id]) return _cache[id];
  return (_cache[id] = computeUnitState(id));
}
function computeUnitState(id) {
  const qs = qsOf(id);
  if (!qs.length) return {understand:0, retain:0, apply:0, done:false, started:false, open:false, seen:0};
  const cards = st().cards;
  const everOK = q => { const c = cards[q.id]; return !!(c && c.ok > 0); };

  const basics = qs.filter(BASIC);
  const applies = qs.filter(APPLY);
  const stds = qs.filter(q => !BASIC(q) && !APPLY(q));

  const uSet = basics.length ? basics : (stds.length ? stds : qs);
  const aSet = applies.length ? applies : (stds.length ? stds : []);

  const understand = uSet.length ? uSet.filter(everOK).length / uSet.length : 1;
  const apply      = aSet.length ? aSet.filter(everOK).length / aSet.length : understand;
  let sum = 0;
  qs.forEach(q => { const c = cards[q.id]; if (c && c.box) sum += Math.min(1, c.box / 5); });
  const retain = sum / qs.length;

  const seen = qs.filter(q => cards[q.id] && cards[q.id].seen).length;
  const done = understand >= DONE_U && apply >= DONE_A && retain >= DONE_R;
  if (done) markDone(id);
  return { understand, retain, apply, done, started: seen > 0, seen, total: qs.length,
           open: isOpen(id) };
}

function isOpen(id) {
  const ps = Graph.pre(id);
  if (!ps.length) return true;
  const cards = st().cards, U = st().units;
  return ps.every(p => {
    const qs = qsOf(p);
    if (!qs.length) return true;
    const basics = qs.filter(BASIC).length ? qs.filter(BASIC) : qs;
    const u = basics.filter(q => { const c = cards[q.id]; return c && c.ok > 0; }).length / basics.length;
    let sum = 0; qs.forEach(q => { const c = cards[q.id]; if (c && c.box) sum += Math.min(1, c.box/5); });
    const r = sum / qs.length;
    // 一度クリアしたことがある前提は、少しくずれても開いたままにする。
    // （これが無いと、チェックで1問落とすたびに下の学年まで全部閉じて先へ進めなくなる）
    if (U[p] && U[p].everDone) return u >= 0.6;
    return u >= OPEN_U && r >= OPEN_R;
  });
}

// クリアしたことを記録しておく（開放のヒステリシス用）
function markDone(id) {
  const U = st().units, e = U[id] || (U[id] = { seen:0, ok:0 });
  let dirty = false;
  if (!e.everDone) { e.everDone = true; e.doneAt = Store.today(); dirty = true; }
  // 3層そろって「済」になったら、測定でついた重点印(focus)は下ろす＝直り終わり。
  // 下ろさないと、直った単元が毎日の弱点枠（1日1問）を占領しつづけ、ほかの穴が待たされる。
  // ★ shaky（チェックで落とした回数）はここでは触らない。あれは格下げの根拠で、
  //   勝手に消すと「できたつもり」を潰す仕組みが効かなくなる。
  if (e.focus) { e.focus = 0; dirty = true; }
  if (dirty) Store.save();
}

/* ---------- いま取り組む単元（フロンティア） ---------- */
function areaOrder(id) { const u = DATA.unit(id); return (DATA.AREAS[u && u.area] || {}).order || 99; }

function frontier(k = MAX_ACTIVE) {
  const cand = DATA.units
    .map(u => ({ u, s: unitState(u.id), d: Graph.depthOf(u.id) }))
    .filter(x => x.s.open && !x.s.done)
    // ① やりかけを優先 ② 前提の浅い（＝準備ができている）順
    // ③ 同じ深さなら 学年・分野の順 ④ やさしいレベルから
    // 学年ではなく「前提が満たされたか」で並ぶので、自然に上の学年へ入っていく
    .sort((a,b) => (b.s.started - a.s.started) || (a.d - b.d)
                || (areaOrder(a.u.id) - areaOrder(b.u.id)) || (a.u.lv - b.u.lv));
  // 同じ分野ばかりにならないよう、できるだけ分野を散らす
  const out = [], seenArea = new Set();
  cand.forEach(x => { if (out.length < k && !seenArea.has(x.u.area)) { out.push(x); seenArea.add(x.u.area); } });
  cand.forEach(x => { if (out.length < k && out.indexOf(x) < 0) out.push(x); });
  return out;
}

/* ---------- 弱点（穴）の特定 ---------- */
// その単元でつまずいたとき、原因になっていそうな前提を近い順に返す
function weakSpots(id, max = 3) {
  return Graph.ancestors(id)
    .map(a => ({ id: a, s: unitState(a), d: Graph.depthOf(a) }))
    .filter(x => x.s.started && (x.s.understand < OPEN_U || x.s.retain < 0.35))
    .sort((a,b) => a.d - b.d)      // 土台に近いほうから直す
    .slice(0, max);
}
// 全体の弱点（正答率が低い単元）
function weakUnits(max = 5) {
  const U = st().units;
  return Object.entries(U)
    .filter(([id,u]) => DATA.unit(id) &&
      ((u.seen >= 4 && u.ok / u.seen < 0.62) || (u.shaky || 0) >= 1 || (u.focus || 0) >= 1))
    .map(([id,u]) => ({ id, rate: u.seen ? u.ok/u.seen : 0, seen:u.seen,
                        shaky:u.shaky||0, focus:u.focus||0, d: Graph.depthOf(id) }))
    // ①チェックで落としたもの ②測定で見つけた穴（土台に近い順） ③正答率の低い順
    .sort((a,b) => (b.shaky - a.shaky) || (b.focus - a.focus)
                || (a.focus && b.focus ? a.d - b.d : 0) || (a.rate - b.rate))
    .slice(0, max);
}

/* ---------- きょうの出題プラン ----------------------------
   ① 期限のきた復習（忘れかけ）        …最大 45%
   ② 弱点・格下げされた単元            …最大 25%
   ③ フロンティアの「次のフェーズ」    …残り
   それぞれに理由タグをつけて返す
------------------------------------------------------------ */
function plan(count) {
  Store.rollDay();
  const cards = st().cards, today = Store.today();
  const out = [], used = new Set();
  const push = (q, why, cap) => {
    if (!q || used.has(q.id) || out.length >= (cap != null ? cap : count)) return false;
    used.add(q.id); out.push(Object.assign({}, q, { _why: why })); return true;
  };
  const all = DATA.all();

  // 枠を先に決める。復習と弱点で全部うまってしまい、
  // 「新しいことに進む枠」が無くなる（＝いつまでも先へ行けない）のを防ぐ。
  const nFix  = Math.min(st().wrong.length, Math.ceil(count * 0.2));
  const nDue  = Math.floor(count * 0.3);
  const nWeak = Math.max(1, Math.floor(count * 0.15));

  // ① まちがいノート（その日のうちに直す）
  let cap = nFix;
  st().wrong.forEach(id => push(all.find(q => q.id === id), 'なおし', cap));

  // ② 期限のきた復習（古い順＝いちばん忘れかけている順）
  cap = out.length + nDue;
  all.filter(q => { const c = cards[q.id]; return c && c.box > 0 && c.due <= today && !used.has(q.id); })
     .sort((a,b) => cards[a.id].due < cards[b.id].due ? -1 : 1)
     .forEach(q => push(q, 'ふくしゅう', cap));

  // ③ 弱点：あやしい単元・正答率の低い単元・フロンティアの前提の穴
  const fr = frontier();
  const holes = [];
  weakUnits().forEach(w => holes.push(w.id));
  fr.forEach(f => weakSpots(f.u.id).forEach(w => holes.push(w.id)));
  cap = out.length + nWeak;
  [...new Set(holes)].forEach(uid => {
    const qs = qsOf(uid).filter(q => !used.has(q.id));
    const target = qs.find(q => BASIC(q) && !(cards[q.id] && cards[q.id].ok))
                || qs.slice().sort((a,b) => (cards[a.id]?.box ?? 0) - (cards[b.id]?.box ?? 0))[0];
    push(target, 'よわいところ', cap);
  });

  // ④ フロンティア：残りは全部「先へ進むため」に使う（ここが痩せると前進が止まる）
  let guard = 0;
  while (out.length < count && guard++ < 60) {
    let added = false;
    for (const f of fr) {
      if (out.length >= count) break;
      const q = nextInUnit(f.u.id, used);
      if (q && push(q, phaseOf(f.s))) added = true;
    }
    if (!added) break;
  }

  // ⑤ まだ空いていれば、復習をもっと積む → それも無ければ開いている単元から
  if (out.length < count) {
    all.filter(q => { const c = cards[q.id]; return c && c.box > 0 && c.due <= today && !used.has(q.id); })
       .forEach(q => push(q, 'ふくしゅう'));
  }
  if (out.length < count) {
    all.filter(q => !used.has(q.id) && isOpen(q.unit))
       .sort((a,b) => (cards[a.id]?.box ?? 0) - (cards[b.id]?.box ?? 0))
       .forEach(q => push(q, 'ふくしゅう'));
  }
  return interleave(out);
}

function phaseOf(s) {
  if (s.understand < DONE_U) return 'あたらしい';
  if (s.apply < DONE_A) return 'おうよう';
  return 'しあげ';
}

// その単元で次に出すべき1問
function nextInUnit(id, used) {
  const cards = st().cards, qs = qsOf(id).filter(q => !used.has(q.id));
  if (!qs.length) return null;
  const s = unitState(id);
  const unsolved = f => qs.filter(q => f(q) && !(cards[q.id] && cards[q.id].ok));
  if (s.understand < DONE_U) {
    const t = unsolved(BASIC); if (t.length) return t[0];
  }
  if (s.apply < DONE_A) {
    const t = unsolved(APPLY); if (t.length) return t[0];
    const t2 = unsolved(q => (q.lv||1) === 3); if (t2.length) return t2[0];
  }
  const un = qs.filter(q => !(cards[q.id] && cards[q.id].ok));
  if (un.length) return un[0];
  return qs.slice().sort((a,b) => (cards[a.id]?.box ?? 0) - (cards[b.id]?.box ?? 0))[0];
}

function interleave(list) {
  const out = [], rest = Store.shuffle(list);
  while (rest.length) {
    let i = rest.findIndex(q => !out.length || q.unit !== out[out.length-1].unit);
    if (i < 0) i = 0;
    out.push(rest.splice(i,1)[0]);
  }
  return out;
}

/* ---------- ときどきチェック ------------------------------
   「できたつもり」を潰すための抜き打ち。
   ・済にした単元から、時間をおいて・ヒント無しで出す
   ・落とした単元は格下げして、もう一度フロンティアに戻す
------------------------------------------------------------ */
function doneUnits() { return DATA.units.filter(u => unitState(u.id).done).map(u => u.id); }

function checkDue() {
  const s = st();
  if (!s.check) s.check = { last: null, lastDone: 0, count: 0 };
  const done = doneUnits().length;
  if (done < 4) return null;
  const days = s.check.last ? Store.daysBetween(s.check.last, Store.today()) : 99;
  if (days < 7) return null;                                  // 中5日はあける
  if (done - (s.check.lastDone || 0) >= 4) return 'unit';     // 4単元すすんだ
  if (days >= 14) return 'weekly';
  return null;
}

function buildCheck(n = 10) {
  const cards = st().cards;
  const dus = doneUnits();
  const pick = [];
  // 済単元から、時間がたっているものを優先して 応用中心に
  const byOld = dus.map(id => {
    const qs = qsOf(id);
    const last = Math.max(...qs.map(q => cards[q.id]?.last ? Date.parse(cards[q.id].last) : 0));
    return { id, last };
  }).sort((a,b) => a.last - b.last);
  byOld.forEach(({id}) => {
    if (pick.length >= n) return;
    const qs = qsOf(id);
    const a = qs.filter(APPLY);
    const cand = (a.length ? a : qs);
    const q = Store.shuffle(cand)[0];
    if (q) pick.push(q);
  });
  // 足りなければ済単元からランダムに足す
  while (pick.length < n && dus.length) {
    const id = dus[Math.floor(Math.random()*dus.length)];
    const q = Store.shuffle(qsOf(id))[0];
    if (q && !pick.find(x => x.id === q.id)) pick.push(q); else break;
  }
  return pick.filter(Boolean).slice(0, n);
}

function finishCheck(results) {
  const s = st();
  if (!s.check) s.check = { last:null, lastDone:0, count:0 };
  const U = s.units;
  const miss = {}, hit = {};
  results.forEach(r => { (r.ok ? hit : miss)[r.unit] = ((r.ok ? hit : miss)[r.unit] || 0) + 1; });
  // 当たった単元は「あやしい」カウントをリセット
  Object.keys(hit).forEach(id => { if (U[id]) U[id].shaky = 0; });

  const demoted = [], shaky = [];
  Object.keys(miss)
    .map(id => { const e = U[id] || (U[id] = { seen:0, ok:0 }); e.shaky = (e.shaky || 0) + miss[id]; return { id, n:e.shaky }; })
    .sort((a,b) => b.n - a.n)
    .forEach(x => {
      // 1回目は「あやしい」印だけ。2回目でようやく格下げ（1回で最大2単元まで）
      const u = DATA.unit(x.id);
      if (!u) return;
      if (x.n >= 2 && demoted.length < 2) {
        if (demote(x.id)) { demoted.push(u); U[x.id].shaky = 0; }
      } else shaky.push(u);   // 1回目は「あやしい」印だけ（出題には混ざる）
    });
  s.check.last = Store.today();
  s.check.lastDone = doneUnits().length;
  s.check.count = (s.check.count || 0) + 1;
  s.checkLog = (s.checkLog || []).concat([{ d: Store.today(),
    n: results.length, ok: results.filter(r=>r.ok).length, demoted: demoted.map(u=>u.id) }]).slice(-40);
  Store.save();
  return { demoted, shaky };
}

// 単元を格下げ（箱を2段さげて、もう一度フロンティアに戻す）
function demote(unitId) {
  const qs = qsOf(unitId); if (!qs.length) return false;
  const cards = st().cards;
  qs.forEach(q => {
    const c = cards[q.id];
    if (c && c.box > 1) { c.box = Math.max(1, c.box - 1); c.due = Store.today(); }
  });
  Store.save();
  return true;
}

/* ---------- とくべつ練習の自動わりふり ----------------------
   子どもに「今日はどれをやる？」と選ばせない。
   間があいたもの・条件がそろったものを、アプリ側から出す。
------------------------------------------------------------ */
const TRAINING = [
  { mode:'time',    emoji:'⏱', name:'タイムアタック', every:3,
    why:'計算のスピードは 使わないとすぐ落ちる。3日に1回みておく',
    ready: () => DATA.all().filter(q =>
      ['jk-gyakusan','jk-bunsu-keisan','jk-kufu','g2-九九','g2-ひっさん','g3-わり算',
       'g3-小数','g4-小数','g4-計算順序','g5-分数'].indexOf(q.unit) >= 0 &&
      st().cards[q.id] && st().cards[q.id].ok > 0).length >= 10 },
  { mode:'pattern', emoji:'🔧', name:'道具えらび', every:7,
    why:'型がたまってきた。問題を見た瞬間に見ぬけるか ためす',
    ready: () => DATA.all().filter(q => q.pattern && q.unit.indexOf('jk-') === 0 &&
      st().cards[q.id] && st().cards[q.id].seen).length >= 12 },
  { mode:'steps',   emoji:'🪜', name:'手順ならべかえ', every:10,
    why:'答えより先に「どう考えるか」を組み立てる練習',
    ready: () => DATA.all().filter(q => q.steps && q.steps.length >= 3 &&
      st().cards[q.id] && st().cards[q.id].seen).length >= 8 },
];

function trainingDue() {
  const r = st().records || {};
  const cand = TRAINING
    .filter(t => t.ready())
    .map(t => {
      const last = r[t.mode] && r[t.mode].lastDate;
      const days = last ? Store.daysBetween(last, Store.today()) : 999;
      return { ...t, days, over: days - t.every };
    })
    .filter(t => t.over >= 0)
    .sort((a,b) => b.over - a.over);
  return cand[0] || null;
}

/* ---------- 最初のレベル診断（学年を決めうちしない） ------
   下の学年から3問ずつ出し、全問正解なら「その学年は分かっている」
   とみなして次へ。落ちたところが学習の開始地点になる。
------------------------------------------------------------ */
const GRADES = ['g1','g2','g3','g4','g5','g6'];

function ladderFor(grade, n = 3) {
  const qs = DATA.byArea(grade).flatMap(u => qsOf(u.id)).filter(q => (q.lv||1) <= 2);
  return Store.shuffle(qs).slice(0, n);
}
// その学年を「だいたい分かっている」ことにする（箱3＝3日後）
// skip に単元idを渡すと、その単元だけは飛ばさない。
// （くわしく測るで落とした単元用。学年は飛ばしても、落とした単元は
//   「分かっていること」にしてしまうと二度と出てこなくなる）
function assumeGrade(grade, skip) {
  const cards = st().cards;
  const skipSet = skip instanceof Set ? skip : new Set(skip || []);
  DATA.byArea(grade).filter(u => !skipSet.has(u.id)).forEach(u => qsOf(u.id).forEach(q => {
    const c = cards[q.id] || (cards[q.id] = { box:0, due:Store.today(), seen:0, ok:0, ng:0, last:null, run:0 });
    if (c.box < 3) { c.box = 3; c.ok = Math.max(1, c.ok); c.seen = Math.max(1, c.seen);
                     c.due = Store.addDays(Store.today(), 3); }
  }));
  const u = st().units;
  DATA.byArea(grade).filter(x => !skipSet.has(x.id)).forEach(x => {
    const e = u[x.id] || (u[x.id] = { seen:0, ok:0 });
    e.seen = Math.max(e.seen, qsOf(x.id).length); e.ok = Math.max(e.ok, Math.round(qsOf(x.id).length*0.9));
  });
  st().placed = grade;
  Store.save();
}
const placementDone = () => !!st().placed || Object.keys(st().cards).length > 20;

/* ---------- 進み具合のまとめ（ホーム・保護者むけ） ---------- */
function summary() {
  const rows = DATA.units.map(u => ({ u, s: unitState(u.id), d: Graph.depthOf(u.id) }));
  const done = rows.filter(r => r.s.done);
  const open = rows.filter(r => r.s.open && !r.s.done);
  const jkDone = done.filter(r => r.u.area.indexOf('jk') === 0).length;
  const jkTotal = rows.filter(r => r.u.area.indexOf('jk') === 0).length;
  // いちばん深いところまで到達しているか＝どこまで先に進んだか
  const reach = done.length ? Math.max(...done.map(r => r.d)) : 0;
  return { done: done.length, total: rows.length, open: open.length,
           jkDone, jkTotal, reach, frontier: frontier() };
}

return { unitState, isOpen, frontier, weakSpots, weakUnits, plan, phaseOf,
         checkDue, buildCheck, finishCheck, demote, doneUnits,
         GRADES, ladderFor, assumeGrade, placementDone, summary, markDone, trainingDue, TRAINING,
         BASIC, APPLY };
})();
if (typeof window !== 'undefined') window.Mastery = Mastery;
