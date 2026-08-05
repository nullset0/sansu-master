/* =========================================================
   算数マスター — おうちの人からのひとこと (notice.js)

   サーバに置いた notice.json を見にいって、新しいものが来ていたら
   画面に1回だけ出す。端末（iPad / iPhone / PC）を問わず届く。
   出したかどうかは端末ごとに localStorage で覚える。
   ========================================================= */
(() => {
'use strict';
const KEY = 'notice:seen';
const EVERY = 20000;                     // 20秒おきに見にいく

const seen = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } };
const markSeen = id => {
  try { localStorage.setItem(KEY, JSON.stringify(seen().concat([id]).slice(-30))); } catch (e) {}
};

function show(n) {
  if (document.getElementById('notice-pop')) return;
  const w = document.createElement('div');
  w.id = 'notice-pop';
  w.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(15,10,5,.62);' +
    'display:flex;align-items:center;justify-content:center;padding:20px;font-family:inherit';
  const accent = n.color || '#f0a500';
  const body = String(n.text || '').split('\n')
    .map(line => `<div>${line.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</div>`).join('');
  w.innerHTML = `
    <style>
      @keyframes ntcPop { 0%{transform:scale(.7);opacity:0} 60%{transform:scale(1.04)} 100%{transform:scale(1);opacity:1} }
      @keyframes ntcShake { 0%,100%{transform:rotate(0)} 20%{transform:rotate(-5deg)} 40%{transform:rotate(5deg)}
                            60%{transform:rotate(-4deg)} 80%{transform:rotate(4deg)} }
    </style>
    <div style="background:#fff;border:6px solid ${accent};border-radius:26px;max-width:620px;width:100%;
                padding:30px 24px 22px;box-shadow:0 26px 70px rgba(0,0,0,.4);text-align:center;
                animation:ntcPop .35s ease-out">
      <div style="font-size:4rem;line-height:1;animation:ntcShake .6s ease-in-out 2">${n.emoji || '📣'}</div>
      <div style="font-size:.78rem;font-weight:900;color:#9a8e7e;letter-spacing:.08em;margin:10px 0 4px">
        おうちの人より</div>
      <div style="font-weight:900;font-size:1.9rem;line-height:1.5;margin:8px 0 22px;color:#1f1a14">${body}</div>
      <button id="notice-close" style="width:100%;padding:15px;border:0;border-radius:14px;
              background:${accent};color:#fff;font-weight:900;font-size:1.1rem;cursor:pointer;
              filter:saturate(1.1)">はーい</button>
    </div>`;
  document.body.appendChild(w);
  document.getElementById('notice-close').onclick = () => { w.remove(); };
  if (window.SFX && SFX.badge) { try { SFX.badge(); } catch (e) {} }
}

async function check(force) {
  // 読みこんだ直後は必ず見にいく。裏で開かれた画面（画面オフ・別タブ）でも
  // 取りこぼさないため。定期の見にいきだけ、表に出ているときに限る。
  if (!force && document.hidden) return;
  try {
    const r = await fetch('notice.json', { cache: 'no-store' });
    if (!r.ok) return;
    const n = await r.json();
    if (!n || !n.id || !n.text) return;
    if (n.until && Store.today() > n.until) return;      // 期限ぎれは出さない
    if (seen().indexOf(n.id) >= 0) return;               // この端末ではもう出した
    markSeen(n.id);
    show(n);
  } catch (e) { /* オフラインなら黙って何もしない */ }
}

check(true);
setInterval(() => check(false), EVERY);
document.addEventListener('visibilitychange', () => { if (!document.hidden) check(true); });
})();
