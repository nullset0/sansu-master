/* =========================================================
   算数マスター — 学習記録をサーバへ送る (sync.js)

   目的: 端末の中にしかなかった記録を貯めて、苦手・遅い・同じまちがいを
   見つけ、出題を直していくため。ログインは使わない。
     ・1問ごと: 問題ID / 単元 / 正誤 / かかった時間 / ヒント / 答えた値
     ・全体: Store.state のまるごと（10分に1回まで）。設定・志望校・塾テストの記録も入る
   名前や連絡先は持っていないので送らない。端末はランダムなIDで区別する。
   送れなかった分は localStorage に貯めておき、次に開いたときに送る。
   本番のドメイン以外（開発・シミュレーション）では何も送らない。
   ========================================================= */
(() => {
'use strict';
if (typeof window === 'undefined' || !window.Store || !window.location) return;
const LIVE = location.hostname === 'sansu.ecaiclub.com'
  || (() => { try { return localStorage.getItem('sync:force') === '1'; } catch (e) { return false; } })();   // 手元の確認用
const URL_ = '/api/log';
const QKEY = 'sync:q', DKEY = 'sync:dev', SKEY = 'sync:stateAt';
const STATE_EVERY = 10 * 60 * 1000;
const QMAX = 3000;

const ls = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};

// 端末ID（ランダム）
let dev = ls.get(DKEY, null);
if (!dev || !/^[a-z0-9]{8,40}$/.test(dev)) {
  dev = (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)).toLowerCase();
  ls.set(DKEY, dev);
}

const page = () => (location.pathname.split('/').pop() || 'index.html') + location.search;

// 1件ごとに一意のIDをつける。送れたものはIDで消す（数で消すと、送信中に
// beacon が先頭を消していた場合に未送信の分まで消える）。二重に届いても週報はIDで1件にまとめる
let seq = 0;
const newId = () => Date.now().toString(36) + (seq++).toString(36) + Math.random().toString(36).slice(2, 6);
function dropSent(events) {
  const sent = new Set(events.map(e => e.id));
  ls.set(QKEY, ls.get(QKEY, []).filter(e => !sent.has(e.id)));
}
function push(ev) {
  if (!LIVE) return;   // 送らない環境では貯めない（localStorage を食って本体の保存が落ちるのを防ぐ）
  const q = ls.get(QKEY, []);
  q.push(Object.assign({ id: newId(), t: new Date().toISOString(), p: page() }, ev));
  ls.set(QKEY, q.length > QMAX ? q.slice(-QMAX) : q);
  schedule();
}

// Store の記録関数を包む（中身は変えない）
const g0 = Store.grade, n0 = Store.note;
Store.grade = function (qid, correct, unitId, opts = {}) {
  const r = g0.apply(this, arguments);
  try {
    push({ k: 'g', q: qid, u: unitId || null, ok: !!correct,
           ms: Math.min(Number(opts.ms) || 0, 300000) || null,
           h: opts.usedHint ? 1 : 0,
           a: opts.given == null ? null : String(opts.given).slice(0, 40),
           box: r && r.box });
  } catch (e) {}
  return r;
};
Store.note = function (unitId, correct) {
  const r = n0.apply(this, arguments);
  try { push({ k: 'n', u: unitId || null, ok: !!correct }); } catch (e) {}
  return r;
};

let timer = null, busy = false;
function schedule(ms = 4000) { if (!LIVE) return; clearTimeout(timer); timer = setTimeout(flush, ms); }

async function flush() {
  if (!LIVE || busy) return;
  const q = ls.get(QKEY, []);
  const wantState = Date.now() - ls.get(SKEY, 0) > STATE_EVERY;
  if (!q.length && !wantState) return;
  const events = q.slice(0, 500);
  const body = { dev, v: 1, events };
  if (wantState) body.state = Store.state;
  busy = true;
  try {
    const res = await fetch(URL_, { method: 'POST', headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(body), keepalive: false });
    if (res.ok) {
      dropSent(events);
      if (wantState) ls.set(SKEY, Date.now());
      if (ls.get(QKEY, []).length) schedule(1000);
    }
  } catch (e) { /* 圏外など。次の機会に送る */ }
  busy = false;
}

// 閉じる・裏に回るときは小さく送る（全体は送らない＝sendBeacon の上限64KB対策）
function beacon() {
  if (!LIVE || busy) return;   // 送信中なら任せる（同じ記録を二重に送らない）
  const q = ls.get(QKEY, []);
  if (!q.length || !navigator.sendBeacon) return;
  const events = q.slice(0, 200);
  const ok = navigator.sendBeacon(URL_, new Blob([JSON.stringify({ dev, v: 1, events })], { type: 'application/json' }));
  if (ok) dropSent(events);
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') beacon(); else schedule(500); });
window.addEventListener('pagehide', beacon);
window.addEventListener('online', () => schedule(500));
schedule(1500);   // 開いたときに、前回送れなかった分と全体を送る

window.Sync = { flush, dev: () => dev, pending: () => ls.get(QKEY, []).length };
})();
