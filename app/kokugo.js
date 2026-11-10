/* =========================================================
   国語（漢字・語句）  — 算数と同じ「思い出す × 間隔をあける」で回す
   ・カードは3種類:  ky:字 = 読み（ひらがなで打つ）
                    kw:字 = 書き（指で書いて、答えと見くらべて自分で○×）
                    go:ことば = 語句（意味／反対の言葉を4つから選ぶ）
   ・新しい字は まず読み。読みが1回できた字（箱2以上）から書きが出る（読めない字は書けない）
   ・まちがえた問題は、そのセッションの最後にもう1回だけ出す（その日のうちに1回は正しく思い出す）
   ・記録は Store.state.kokugo に置く。算数の きょうの数・正答率・3段の流れ には入れない
   ========================================================= */
const Kokugo = (() => {
const K = () => {
  const s = Store.state;
  if (!s.kokugo) s.kokugo = { cards: {}, day: { date: null, done: 0, correct: 0 }, hist: [], daily: 10 };
  const k = s.kokugo, t = Store.today();
  if (k.day.date !== t) {
    if (k.day.date && k.day.done) k.hist.push({ d: k.day.date, done: k.day.done, correct: k.day.correct });
    if (k.hist.length > 400) k.hist = k.hist.slice(-400);
    k.day = { date: t, done: 0, correct: 0 };
  }
  return k;
};
const DATA_ = () => window.KOKUGO || { kanji: [], goku: [] };
let _ix = null;
const ix = () => _ix || (_ix = { k: new Map(DATA_().kanji.map(x => [x.k, x])), g: new Map(DATA_().goku.map(x => [x.w, x])) });
const kanjiOf = ch => ix().k.get(ch);
const gokuOf = w => ix().g.get(w);

// 出題の順番: 小4 → 小5 → 小6 の配当表の順。語句は漢字3つに1つの割合で混ぜる
function items() {
  const out = [];
  DATA_().kanji.forEach(x => out.push({ id: 'ky:' + x.k, kind: 'ky', x }));
  return out;
}
function writeIds() { return DATA_().kanji.map(x => ({ id: 'kw:' + x.k, kind: 'kw', x })); }
function gokuIds() { return DATA_().goku.map(x => ({ id: 'go:' + x.w, kind: 'go', x })); }
function itemById(id) {
  const [kind, key] = [id.slice(0, 2), id.slice(3)];
  const x = kind === 'go' ? gokuOf(key) : kanjiOf(key);
  return x ? { id, kind, x } : null;
}

function plan(n) {
  const k = K(), cards = k.cards, today = Store.today(), used = new Set(), out = [];
  const push = it => { if (it && !used.has(it.id) && out.length < n) { used.add(it.id); out.push(it); } };
  // ① 期限のきた復習（いちばん忘れかけている順）。全体の6割まで
  const due = Object.keys(cards).filter(id => cards[id].box > 0 && cards[id].due <= today)
    .sort((a, b) => (cards[a].due < cards[b].due ? -1 : 1));
  // 期日のきた復習は ふだん6割まで。たまっているときは新しい問題を2問まで減らして復習を先に消す
  //（新しい問題ばかり足すと、期日をすぎた字が何週間も出ずに忘れられる）
  const nDue = Math.max(Math.ceil(n * 0.6), n - 2);
  due.slice(0, nDue).forEach(id => push(itemById(id)));
  // ② 書き: 読みができた字のうち、まだ書きをやっていない字
  const newW = writeIds().filter(it => !cards[it.id] && (cards['ky:' + it.x.k] || {}).box >= 2 && !used.has('ky:' + it.x.k));
  // ③ 新しい読み・語句
  const newR = items().filter(it => !cards[it.id]);
  const newG = gokuIds().filter(it => !cards[it.id]);
  let i = 0;
  while (out.length < n && (newW.length || newR.length || newG.length || due.length > nDue)) {
    const r = i++ % 4;
    if (r === 3 && newG.length) push(newG.shift());
    else if (r % 2 === 1 && newW.length) push(newW.shift());
    else if (newR.length) push(newR.shift());
    else if (newW.length) push(newW.shift());
    else if (newG.length) push(newG.shift());
    else if (due.length > nDue) push(itemById(due.splice(nDue, 1)[0]));
    if (i > n * 6) break;
  }
  // 同じ種類が続かないように並べる（交互練習）
  const rest = Store.shuffle(out), mix = [];
  while (rest.length) {
    let j = rest.findIndex(q => !mix.length || q.kind !== mix[mix.length - 1].kind);
    if (j < 0) j = 0;
    mix.push(rest.splice(j, 1)[0]);
  }
  return mix;
}

// 記録（算数の Store.grade と同じ箱の動き。箱1＝まちがえて今日もう一度）
function grade(id, ok, retry) {
  const k = K();
  if (retry) {   // その回の最後のもう1回: 箱はもう1（今日もう一度）なので動かさず、きょうの数にも入れない
    const g = ok ? 2 : 0;
    Store.state.coins += g; Store.save();
    try { window.Sync && Sync.push && Sync.push({ k: 'k', q: id, ok: !!ok, r: 1 }); } catch (e) {}
    return g;
  }
  const c = k.cards[id] || (k.cards[id] = { box: 0, due: null, seen: 0, ok: 0, ng: 0 });
  c.seen++; c.last = Store.today();
  if (ok) { c.ok++; c.box = Math.min(6, Math.max(2, c.box + 1)); c.due = Store.addDays(Store.today(), Store.BOX_DAYS[c.box] || 1); }
  else { c.ng++; c.box = 1; c.due = Store.today(); }
  k.day.done++; if (ok) k.day.correct++;
  const gain = ok ? 6 : 1;
  Store.rollDay(); Store.state.coins += gain; Store.state.day.coins += gain;
  Store.save();
  // 1問ごとにVPSへ（算数の Store.grade と同じ待ち行列。週報で国語も見られるように）
  try { window.Sync && Sync.push && Sync.push({ k: 'k', q: id, ok: !!ok, box: c.box }); } catch (e) {}
  return gain;
}

const kana = s => String(s || '').trim().replace(/\s/g, '')
  .replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
const kata = s => s.replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const LABEL = { ky: ['📗', 'よみ'], kw: ['✍️', 'かき'], go: ['💬', 'ことば'] };
const TYPE = { 慣: '慣用句', こ: 'ことわざ', 四: '四字熟語', 対: '反対の言葉' };

function start(host, opts = {}) {
  const n = opts.n || K().daily || 10;
  const S = { list: plan(n), i: 0, ok: 0, again: new Set(), host };
  if (!S.list.length) { host.innerHTML = `<div class="card"><h2>きょうの国語は おわり</h2><p class="muted">出す問題がありません。</p></div>`; return; }
  render(S);
}

function head(S, it) {
  const [ico, name] = LABEL[it.kind];
  const sub = it.kind === 'go' ? TYPE[it.x.t] : `小${it.x.g}の漢字`;
  return `<div class="q-progress" style="margin-bottom:10px"><i style="width:${S.i / S.list.length * 100}%"></i></div>
    <div style="display:flex;gap:6px;margin-bottom:8px"><span class="chip">${ico} ${name}</span><span class="chip lv">${sub}</span>
    ${S.again.has(it.id) && it._again ? '<span class="chip d">🔁 もう1回</span>' : ''}</div>`;
}

function render(S) {
  const it = S.list[S.i], h = S.host;
  if (!it) return finish(S);
  const x = it.x;
  if (it.kind === 'ky') {
    const sent = esc(x.s).replace('＿＿', `<b style="font-size:1.5em;border-bottom:3px solid var(--a)">${esc(x.w)}</b>`);
    h.innerHTML = `<div class="card">${head(S, it)}
      <p style="font-size:1.15rem;line-height:2">${sent}</p>
      <p class="muted">太字のことばの読みを、ひらがなで書こう。</p>
      <input id="kin" autocomplete="off" autocapitalize="off" spellcheck="false" lang="ja"
        style="width:100%;font-size:1.3rem;padding:12px;border:2px solid var(--line);border-radius:12px;margin:8px 0">
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:8px">
        <button class="btn" id="kgo">こたえる</button><button class="btn ghost" id="kno">わからない</button></div>
      <div id="kv"></div></div>`;
    const inp = h.querySelector('#kin'); setTimeout(() => inp.focus(), 50);
    const done = given => {
      const ok = given != null && kana(given) === x.y;
      verdict(S, it, ok, `<div style="font-size:1.6rem;font-weight:900">${esc(x.w)}<span style="font-size:1rem;color:var(--sub)">（${esc(x.y)}）</span></div>
        ${given != null && !ok ? `<div class="muted">あなたの答え: ${esc(given) || '（なし）'}</div>` : ''}`);
    };
    h.querySelector('#kgo').onclick = () => done(inp.value);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) done(inp.value); });
    h.querySelector('#kno').onclick = () => done(null);
  } else if (it.kind === 'kw') {
    const sent = esc(x.s).replace('＿＿', `<b style="font-size:1.3em;border-bottom:3px solid var(--a)">${esc(kata(x.y))}</b>`);
    h.innerHTML = `<div class="card">${head(S, it)}
      <p style="font-size:1.15rem;line-height:2">${sent}</p>
      <p class="muted">カタカナのところを漢字で書こう（送りがなも）。書けたら「こたえを見る」。</p>
      ${Quiz.memoHTML.replace('class="memo"', 'class="memo open"')}
      <button class="btn wide" id="kshow" style="margin-top:10px">こたえを見る</button>
      <div id="kv"></div></div>`;
    Quiz.memoPad(h.querySelector('#memo'));
    h.querySelector('#kshow').onclick = () => {
      h.querySelector('#kshow').remove();
      h.querySelector('#kv').innerHTML = `<div class="verdict" style="text-align:center">
        <div style="font-size:2.6rem;font-weight:900;font-family:'Hiragino Mincho ProN','Yu Mincho',serif;letter-spacing:.1em">${esc(x.w)}</div>
        <p class="muted">とめ・はね・はらい まで見くらべて、正直に。</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <button class="btn green" id="kok">⭕️ 書けた</button><button class="btn ghost" id="kng">❌ まちがえた</button></div></div>`;
      // 採点のあとも正しい字を残す（まちがえたときこそ見くらべる）
      const ans = `<div style="font-size:2rem;font-weight:900;font-family:'Hiragino Mincho ProN','Yu Mincho',serif">${esc(x.w)}<span style="font-size:.9rem;color:var(--sub);font-family:inherit">（${esc(x.y)}）</span></div>`;
      h.querySelector('#kok').onclick = () => verdict(S, it, true, ans);
      h.querySelector('#kng').onclick = () => verdict(S, it, false, ans);
    };
  } else {
    const pool = [...new Set(DATA_().goku.filter(g => g.t === x.t && g.a !== x.a && g.w !== x.a).map(g => g.a))];
    const opts = Store.shuffle([x.a, ...Store.shuffle(pool).slice(0, 3)]);
    const q = x.t === '対' ? `「<b>${esc(x.w)}</b>」の反対の意味のことばは？` : `「<b>${esc(x.w)}</b>」の意味は？`;
    h.innerHTML = `<div class="card">${head(S, it)}
      <p style="font-size:1.15rem;line-height:1.9">${q}</p><p class="muted">${esc(x.y)}</p>
      <div class="opts">${opts.map((o, i) => `<button class="opt" data-i="${i}"><span class="k">${'アイウエ'[i]}</span><span>${esc(o)}</span></button>`).join('')}</div>
      <div id="kv"></div></div>`;
    h.querySelectorAll('.opt').forEach(b => b.onclick = () => {
      const ok = opts[b.dataset.i] === x.a;
      h.querySelectorAll('.opt').forEach(o => { o.disabled = true; o.classList.add(opts[o.dataset.i] === x.a ? 'ok' : (o === b ? 'ng' : 'dim')); });
      verdict(S, it, ok, `<div style="font-weight:900">${esc(x.w)}：${esc(x.a)}</div>`);
    });
  }
}

function verdict(S, it, ok, body) {
  const h = S.host;
  h.querySelectorAll('#kgo,#kno,#kin,#kok,#kng').forEach(e => { e.disabled = true; });
  const gain = grade(it.id, ok, !!it._again);
  if (ok) { S.ok++; SFX.correct(); } else {
    SFX.wrong();
    // その日のうちに1回は正しく思い出す（同じセッションの最後にもう1回。2回目はくり返さない）
    if (!S.again.has(it.id)) { S.again.add(it.id); S.list.push(Object.assign({}, it, { _again: true })); }
  }
  h.querySelector('#kv').innerHTML = `<div class="verdict ${ok ? 'ok' : 'ng'}" style="margin-top:12px">
    <div class="head">${ok ? '⭕️ せいかい' : '❌ まちがい'}<span style="font-size:.8rem;font-weight:700;color:var(--sub)">＋${gain}コイン${ok ? '' : '・あとでもう1回'}</span></div>
    ${body}
    <button class="btn wide ${ok ? 'green' : 'blue'}" id="knext" style="margin-top:12px">${S.i + 1 < S.list.length ? 'つぎ →' : '結果を見る 🎉'}</button></div>`;
  h.querySelector('#knext').onclick = () => { SFX.tap(); S.i++; render(S); };
  h.querySelector('#kv').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function finish(S) {
  const k = K();
  if (k.day.done >= (k.daily || 10)) Quiz.confetti(.8);
  S.host.innerHTML = `<div class="card" style="text-align:center"><h2>📚 国語 おわり</h2>
    <p style="font-size:1.2rem;font-weight:900">${S.ok} / ${S.list.length} 問 せいかい</p>
    <p class="muted">まちがえた問題は、明日またでてきます。</p>
    <a class="btn wide" href="index.html">ホームへ</a>
    <button class="btn ghost wide" id="kmore" style="margin-top:8px">もう少しやる（5問）</button></div>`;
  S.host.querySelector('#kmore').onclick = () => start(S.host, { n: 5 });
}

// ホーム・保護者画面に出す数字
function stats() {
  const k = K(), c = k.cards, d = DATA_();
  const learned = pre => d.kanji.filter(x => (c[pre + x.k] || {}).box >= 4).length;
  return { day: k.day, daily: k.daily || 10, read: learned('ky:'), write: learned('kw:'), kanji: d.kanji.length,
           goku: d.goku.filter(x => (c['go:' + x.w] || {}).box >= 4).length, gokuAll: d.goku.length,
           due: Object.values(c).filter(x => x.box > 0 && x.due <= Store.today()).length };
}
function setDaily(n) { K().daily = n; Store.save(); }

return { start, plan, grade, stats, setDaily, kana };
})();
if (typeof window !== 'undefined') window.Kokugo = Kokugo;
