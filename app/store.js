/* =========================================================
   算数マスター v2 — 記憶と進捗 (store.js)
   定着のしくみ:
     ① 間隔反復（Leitner 6箱：当日 / 1 / 3 / 7 / 16 / 35日）
     ② 想起テスト（4択だけでなく数値入力を混ぜる）
     ③ 失敗は必ず翌日に戻す（まちがいノート）
     ④ インターリービング（同じ単元を続けて出さない）
   ========================================================= */
const Store = (() => {
'use strict';
const KEY = 'sansu-v2';
const BOX_DAYS = [0, 0, 1, 3, 7, 16, 35];   // index = box(1..6)
const MAX_BOX = 6;

const clone = o => (typeof structuredClone === 'function'
  ? structuredClone(o) : JSON.parse(JSON.stringify(o)));   // 古いiOS Safari対策
const today = () => new Date().toISOString().slice(0,10);
const addDays = (iso, d) => { const t = new Date(iso+'T00:00:00'); t.setDate(t.getDate()+d); return t.toISOString().slice(0,10); };
const daysBetween = (a,b) => Math.round((new Date(b+'T00:00:00') - new Date(a+'T00:00:00'))/86400000);

const DEFAULTS = {
  v: 2,
  settings: { dailyGoal:5, sound:true, speak:false, autoRead:false, numpad:true, hardMode:false, home:'g4' },
  cards: {}, units: {}, badges: {},
  day: { date: today(), done:0, correct:0, coins:0 },
  streak: { n:0, last:null, best:0 },
  coins: 0, xp: 0,
  wrong: [],          // まちがいノート（qid の配列・新しい順）
  history: [],        // [{d, done, correct}]
  chara: 'pika',
  unlocked: ['pika'],
};

let S = load();

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!raw) return migrate(clone(DEFAULTS));
    return Object.assign(clone(DEFAULTS), raw, {
      settings: Object.assign({}, DEFAULTS.settings, raw.settings||{}),
    });
  } catch(e) { return clone(DEFAULTS); }
}
// v1（学年ごとの sansu-master-* キー）から連続日数だけ引き継ぐ
function migrate(fresh) {
  try {
    let best = 0;
    for (const g of ['g1','g2','g3','g4','g5','g6']) {
      const o = JSON.parse(localStorage.getItem('sansu-master-'+g) || 'null');
      if (o && o.streak && o.streak > best) best = o.streak;
    }
    if (best) { fresh.streak.n = best; fresh.streak.best = best; fresh.streak.last = addDays(today(), -1); }
  } catch(e){}
  return fresh;
}
let REV = 0;   // 状態が変わるたびに増える。習熟度の計算結果をキャッシュするのに使う
function save() { REV++; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){} }

/* ---------- 日付まわり ---------- */
function rollDay() {
  const t = today();
  if (S.day.date !== t) {
    if (S.day.done > 0) {
      S.history.push({ d:S.day.date, done:S.day.done, correct:S.day.correct });
      if (S.history.length > 400) S.history = S.history.slice(-400);
    }
    S.day = { date:t, done:0, correct:0, coins:0 };
    save();
  }
}
rollDay();

/* ---------- カード（1問ぶんの記憶状態） ---------- */
function card(qid) {
  if (!S.cards[qid]) S.cards[qid] = { box:0, due:today(), seen:0, ok:0, ng:0, last:null, run:0 };
  return S.cards[qid];
}
const isDue = qid => { const c = S.cards[qid]; return !c || c.box === 0 || c.due <= today(); };
const isNew = qid => !S.cards[qid] || S.cards[qid].seen === 0;

/* ---------- 採点を記録 ---------- */
function grade(qid, correct, unitId, opts = {}) {
  rollDay();
  const c = card(qid);
  c.seen++; c.last = today();
  const usedHint = !!opts.usedHint;
  if (correct) {
    c.ok++; c.run++;
    // ヒントを使ったときは進みを止める（間隔をのばしすぎない）
    const step = usedHint ? (c.box >= 2 ? 0 : 1) : 1;
    // 箱1は「まちがえて今日もう一度」専用。正解したら必ず箱2以上（＝1日後）へ
    c.box = Math.min(MAX_BOX, Math.max(2, c.box + step));
    c.due = addDays(today(), BOX_DAYS[c.box] || 1);
    S.wrong = S.wrong.filter(w => w !== qid);
  } else {
    c.ng++; c.run = 0;
    c.box = 1;                       // 失敗は必ず最初の箱へ
    c.due = today();                 // その日のうちにもう一度
    S.wrong = [qid].concat(S.wrong.filter(w => w !== qid)).slice(0, 120);
  }
  if (unitId) {
    const u = S.units[unitId] || (S.units[unitId] = { seen:0, ok:0, mastered:0 });
    u.seen++; if (correct) u.ok++;
  }
  S.day.done++; if (correct) S.day.correct++;
  const gain = correct ? (usedHint ? 4 : (c.box >= 4 ? 12 : 8)) : 1;
  S.coins += gain; S.day.coins += gain; S.xp += correct ? 10 : 3;
  save();
  return { box:c.box, next:c.due, gain };
}

/* ---------- 軽い記録（道具えらび・手順ならべかえ用）----------
   間隔反復のカードは汚さず、単元の正答率と きょうの記録だけ動かす */
function note(unitId, correct) {
  rollDay();
  if (unitId) {
    const u = S.units[unitId] || (S.units[unitId] = { seen:0, ok:0 });
    u.seen++; if (correct) u.ok++;
  }
  S.day.done++; if (correct) S.day.correct++;
  const gain = correct ? 5 : 1;
  S.coins += gain; S.day.coins += gain;
  save();
}

/* ---------- 単元の習熟度（0〜1） ---------- */
function unitMastery(unitId, qids) {
  if (!qids || !qids.length) return 0;
  let sum = 0;
  qids.forEach(q => {
    const c = S.cards[q];
    if (!c || !c.box) return;
    sum += Math.min(1, c.box / 5);      // 箱5＝「おぼえた」。ずかんの表示と同じ基準
  });
  return sum / qids.length;
}
function unitStats(unitId, qids) {
  const m = unitMastery(unitId, qids);
  const touched = qids.filter(q => S.cards[q] && S.cards[q].seen).length;
  return { mastery:m, touched, total:qids.length, done: m >= 0.8 };
}

/* ---------- 連続日数 ---------- */
function touchStreak() {
  rollDay();
  const t = today();
  if (S.streak.last === t) return S.streak.n;
  if (S.streak.last === addDays(t,-1)) S.streak.n++;
  else S.streak.n = 1;
  S.streak.last = t;
  S.streak.best = Math.max(S.streak.best||0, S.streak.n);
  save();
  return S.streak.n;
}

/* ---------- 出題の組み立て --------------------------------
   pool: [{id, unit, ...}]
   ① まちがいノート（最優先・最大3問）
   ② 期限がきた復習カード
   ③ まだ見ていない新規カード
   ④ 同じ単元が続かないように並べ替え
------------------------------------------------------------ */
function buildSession(pool, count, opts = {}) {
  rollDay();
  const byId = new Map(pool.map(q => [q.id, q]));
  const picked = [], used = new Set();
  const push = q => { if (q && !used.has(q.id)) { used.add(q.id); picked.push(q); } };

  if (opts.only === 'wrong') {
    S.wrong.forEach(id => picked.length < count && push(byId.get(id)));
  } else if (opts.only === 'new') {
    pool.filter(q => isNew(q.id)).forEach(q => picked.length < count && push(q));
  } else {
    // ① まちがいノート
    const wrongCap = Math.min(3, Math.ceil(count*0.5));
    S.wrong.forEach(id => { if (picked.length < wrongCap) push(byId.get(id)); });
    // ② 期限のきた復習（期限が古い順＝忘れかけている順）
    const due = pool
      .filter(q => S.cards[q.id] && S.cards[q.id].box > 0 && S.cards[q.id].due <= today() && !used.has(q.id))
      .sort((a,b) => (S.cards[a.id].due < S.cards[b.id].due ? -1 : 1));
    const dueCap = Math.ceil(count * 0.65);
    due.forEach(q => { if (picked.length < dueCap) push(q); });
    // ③ 新規
    const fresh = pool.filter(q => isNew(q.id) && !used.has(q.id));
    shuffle(fresh).forEach(q => { if (picked.length < count) push(q); });
    // ④ それでも足りなければ、箱の低いものから
    if (picked.length < count) {
      pool.filter(q => !used.has(q.id))
        .sort((a,b) => (S.cards[a.id]?.box||9) - (S.cards[b.id]?.box||9))
        .forEach(q => { if (picked.length < count) push(q); });
    }
  }
  return interleave(picked.slice(0, count));
}

function shuffle(a) { const r=a.slice(); for (let i=r.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[r[i],r[j]]=[r[j],r[i]];} return r; }

// 同じ単元が2連続しないように並べかえ（インターリービング）
function interleave(list) {
  const out = [], rest = shuffle(list);
  while (rest.length) {
    let i = rest.findIndex(q => !out.length || q.unit !== out[out.length-1].unit);
    if (i < 0) i = 0;
    out.push(rest.splice(i,1)[0]);
  }
  return out;
}

/* ---------- 箱の分布（おぼえ箱の表示用） ---------- */
function boxCounts(pool) {
  const c = [0,0,0,0,0,0,0];
  (pool||[]).forEach(q => { const k = S.cards[q.id]; if (k && k.box) c[k.box]++; });
  return { b1:c[1], b2:c[2], b3:c[3], b4:c[4], b5:c[5]+c[6], mastered:c[5]+c[6] };
}
function masteredCount() { return Object.values(S.cards).filter(c => c.box >= 5).length; }
function totalCorrect() { return Object.values(S.cards).reduce((a,c)=>a+c.ok,0); }

/* ---------- バッジ ---------- */
const BADGES = [
  {id:'first',  e:'🌱', n:'はじめの一歩', d:'はじめて1問せいかい', test:s=>totalCorrect()>=1},
  {id:'d3',     e:'🔥', n:'3日れんぞく',  d:'3日つづけた', test:s=>s.streak.n>=3},
  {id:'d7',     e:'🔥', n:'1週間れんぞく',d:'7日つづけた', test:s=>s.streak.n>=7},
  {id:'d30',    e:'🏆', n:'1か月れんぞく',d:'30日つづけた', test:s=>s.streak.n>=30},
  {id:'c50',    e:'⭐', n:'50問クリア',   d:'せいかい50問', test:s=>totalCorrect()>=50},
  {id:'c200',   e:'🌟', n:'200問クリア',  d:'せいかい200問', test:s=>totalCorrect()>=200},
  {id:'c500',   e:'💫', n:'500問クリア',  d:'せいかい500問', test:s=>totalCorrect()>=500},
  {id:'m20',    e:'📦', n:'おぼえ箱20',   d:'20問をマスター', test:s=>masteredCount()>=20},
  {id:'m100',   e:'🎁', n:'おぼえ箱100',  d:'100問をマスター', test:s=>masteredCount()>=100},
  {id:'combo5', e:'⚡', n:'5れんぞく',    d:'1回で5問れんぞく正解', test:(s,ctx)=>ctx.combo>=5},
  {id:'combo10',e:'💥', n:'10れんぞく',   d:'10問れんぞく正解', test:(s,ctx)=>ctx.combo>=10},
  {id:'perfect',e:'💯', n:'ぜんもん正解', d:'1セット全問せいかい', test:(s,ctx)=>ctx.perfect},
  {id:'nohint', e:'🧠', n:'ノーヒント',   d:'ヒントなしで1セット', test:(s,ctx)=>ctx.perfect&&ctx.noHint},
  {id:'night',  e:'🌙', n:'ねる前の子',   d:'20時〜23時にやった', test:()=>{const h=new Date().getHours();return h>=20&&h<24;}},
  {id:'morning',e:'🌅', n:'あさ活',       d:'6時〜8時にやった', test:()=>{const h=new Date().getHours();return h>=6&&h<9;}},
  {id:'jk1',    e:'🎓', n:'受験の入口',   d:'中学受験の問題をはじめた', test:s=>Object.keys(s.units).some(u=>u.startsWith('jk-'))},
  {id:'jk5',    e:'📐', n:'特殊算マスター',d:'中受の単元を5つクリア', test:(s,ctx)=>ctx.jkCleared>=5},
  {id:'jk15',   e:'👑', n:'受験生',       d:'中受の単元を15クリア', test:(s,ctx)=>ctx.jkCleared>=15},
  {id:'coin500',e:'🪙', n:'コイン500',    d:'コインを500あつめた', test:s=>s.coins>=500},
  {id:'fix10',  e:'🔧', n:'なおし名人',   d:'まちがいを10問リベンジ成功', test:s=>(s.fixed||0)>=10},
];
function checkBadges(ctx = {}) {
  const won = [];
  BADGES.forEach(b => {
    if (S.badges[b.id]) return;
    let ok = false; try { ok = b.test(S, ctx); } catch(e){}
    if (ok) { S.badges[b.id] = today(); won.push(b); }
  });
  if (won.length) save();
  return won;
}

/* ---------- キャラのアンロック ---------- */
const UNLOCKS = [
  {who:'marumo',  need:{coins:150},  label:'コイン150'},
  {who:'kakuta',  need:{mastered:30},label:'30問マスター'},
  {who:'tongari', need:{streak:7},   label:'7日れんぞく'},
  {who:'fukurou', need:{jk:3},       label:'中受の単元3つクリア'},
];
function checkUnlocks(ctx = {}) {
  const got = [];
  UNLOCKS.forEach(u => {
    if (S.unlocked.includes(u.who)) return;
    const n = u.need;
    const ok = (n.coins!=null && S.coins>=n.coins)
            || (n.mastered!=null && masteredCount()>=n.mastered)
            || (n.streak!=null && S.streak.n>=n.streak)
            || (n.jk!=null && (ctx.jkCleared||0)>=n.jk);
    if (ok) { S.unlocked.push(u.who); got.push(u); }
  });
  if (got.length) save();
  return got;
}

/* ---------- 設定 ---------- */
function set(k, v) { S.settings[k] = v; save(); }
const get = k => S.settings[k];

/* ---------- ふりかえり（おうちの人むけ） ---------- */
function last14() {
  const out = [];
  for (let i=13;i>=0;i--) {
    const d = addDays(today(), -i);
    if (d === today()) out.push({d, done:S.day.done, correct:S.day.correct});
    else { const h = S.history.find(x=>x.d===d); out.push(h || {d, done:0, correct:0}); }
  }
  return out;
}
function weakUnits(units) {
  return Object.entries(S.units)
    .map(([id,u]) => ({ id, ...u, rate: u.seen ? u.ok/u.seen : 1, name:(units[id]||{}).name||id }))
    .filter(u => u.seen >= 3 && u.rate < 0.7)
    .sort((a,b) => a.rate - b.rate);
}

function reset() { localStorage.removeItem(KEY); S = clone(DEFAULTS); save(); }
function exportJSON() { return JSON.stringify(S); }
function importJSON(t) { try { S = Object.assign(clone(DEFAULTS), JSON.parse(t)); save(); return true; } catch(e){ return false; } }

return {
  get state(){ return S; },
  save, rollDay, card, isDue, isNew, grade, buildSession, boxCounts,
  masteredCount, totalCorrect, touchStreak, unitStats, unitMastery,
  BADGES, checkBadges, UNLOCKS, checkUnlocks, set, get, last14, weakUnits,
  reset, exportJSON, importJSON, today, addDays, daysBetween, shuffle, note,
  get rev(){ return REV; },
  markFixed(){ S.fixed = (S.fixed||0)+1; save(); },
};
})();
if (typeof window !== 'undefined') window.Store = Store;

/* =========================================================
   効果音（Web Audio・ファイル不要）
   ========================================================= */
const SFX = (() => {
'use strict';
let ctx = null;
const on = () => Store.get('sound') !== false;
function ac(){ if(!ctx){ const C = window.AudioContext||window.webkitAudioContext; if(!C) return null; ctx=new C(); } if(ctx.state==='suspended') ctx.resume(); return ctx; }
function tone(f, dur, type='sine', vol=.16, delay=0, slide=null) {
  const a = ac(); if (!a || !on()) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, a.currentTime+delay);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, a.currentTime+delay+dur);
  g.gain.setValueAtTime(0, a.currentTime+delay);
  g.gain.linearRampToValueAtTime(vol, a.currentTime+delay+0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime+delay+dur);
  o.connect(g); g.connect(a.destination);
  o.start(a.currentTime+delay); o.stop(a.currentTime+delay+dur+0.03);
}
return {
  tap(){ tone(760,.05,'triangle',.07); },
  correct(){ [[784,0],[988,.07],[1319,.14]].forEach(([f,d])=>tone(f,.16,'triangle',.15,d)); },
  wrong(){ tone(300,.16,'sine',.13); tone(220,.2,'sine',.12,.1); },
  combo(n){ const base=660+Math.min(n,8)*55; tone(base,.1,'square',.1); tone(base*1.5,.12,'square',.08,.06); },
  clear(){ [523,659,784,1047,1319].forEach((f,i)=>tone(f,.24,'triangle',.14,i*.09)); },
  badge(){ [1047,1319,1568,2093].forEach((f,i)=>tone(f,.3,'sine',.13,i*.1)); },
  levelup(){ [392,523,659,784,1047].forEach((f,i)=>tone(f,.3,'square',.09,i*.08)); },
  coin(){ tone(1319,.06,'square',.09); tone(1976,.12,'square',.07,.05); },
};
})();
if (typeof window !== 'undefined') window.SFX = SFX;
