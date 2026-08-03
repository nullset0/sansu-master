/* =========================================================
   算数マスター v3 — 単元の前提関係グラフ (graph.js)

   「学年」ではなく【前提が満たされたか】で先へ進む。
   ・前提が満たされた単元は、学年に関係なく自動でひらく
   ・上の単元でつまずいたら、前提をたどって「どこの穴か」を特定して戻る
   ========================================================= */
window.Graph = (() => {
'use strict';

// 系統ごとの並び（同じ系統の中では、1つ前が前提になる）
const STRANDS = {
  calc:  ['g1-かず','g1-たしざん','g1-ひきざん','g1-ぐるぐる','g2-数','g2-九九','g2-ひっさん',
          'g3-わり算','g3-大きい数','g4-大きい数','g4-計算順序','g4-がい数'],
  frac:  ['g3-小数','g3-分数','g4-小数','g4-分数','g5-分数','g6-分数かけ割り'],
  meas:  ['g1-ながさかさ','g2-ながさ','g2-かさ','g3-重さ','g4-単位','g5-単位量'],
  time:  ['g1-とけい','g2-時間','g3-時間'],
  geo:   ['g1-かたち','g2-図形','g3-円','g4-角度','g4-面積','g4-立体',
          'g5-面積','g5-円','g5-体積','g6-円','g6-体積','g6-対称','g6-拡大縮小'],
  ratio: ['g5-割合','g6-比','g6-比例'],
  speed: ['g5-速さ'],
  word:  ['g2-文章題','g3-文章題','g4-文章題','g5-文章題','g6-文章題'],
  data:  ['g3-グラフ','g4-グラフ'],
  cases: ['g6-場合の数'],
  expr:  ['g6-文字式'],
  intg:  ['g5-整数','g5-倍数約数'],
};

// 系統をまたぐ前提（これが無いと「かけ算ができないのに面積」になる）
const EXTRA = {
  'g2-九九':      ['g1-たしざん'],
  'g3-わり算':    ['g2-九九'],
  'g4-面積':      ['g2-九九','g4-単位'],
  'g4-立体':      ['g2-図形'],
  'g5-面積':      ['g4-面積','g4-分数'],
  'g5-体積':      ['g4-立体','g4-面積'],
  'g5-割合':      ['g4-小数','g3-わり算'],
  'g5-速さ':      ['g4-小数','g4-単位','g3-わり算'],
  'g5-倍数約数':  ['g3-わり算'],
  'g5-単位量':    ['g3-わり算','g4-小数'],
  'g6-比':        ['g5-割合','g5-分数'],
  'g6-円':        ['g5-円','g4-小数'],
  'g6-体積':      ['g5-体積'],
  'g6-拡大縮小':  ['g6-比','g5-面積'],
  'g6-比例':      ['g6-比'],
  'g6-分数かけ割り':['g5-分数'],
  'g4-文章題':    ['g3-わり算'],
  'g5-文章題':    ['g5-割合'],
  'g6-文章題':    ['g6-比'],
  'g4-グラフ':    ['g3-グラフ'],
  'g3-グラフ':    ['g2-数'],
  'g3-小数':      ['g3-わり算'],
  'g2-文章題':    ['g1-たしざん','g1-ひきざん'],
  'g5-整数':      ['g3-わり算'],
  'g6-場合の数':  ['g4-計算順序'],
  'g6-文字式':    ['g4-計算順序'],
  'g1-とけい':    ['g1-かず'],
  'g1-ながさかさ':['g1-かず'],
  'g1-かたち':    ['g1-かず'],

  // ---- 中学受験 ----
  'jk-baisu':       ['g5-倍数約数'],
  'jk-sosuu':       ['jk-baisu'],
  'jk-amari':       ['jk-baisu'],
  'jk-suuretsu':    ['g4-計算順序'],
  'jk-gunsuuretsu': ['jk-suuretsu','jk-amari'],
  'jk-baai':        ['g6-場合の数'],
  'jk-michi':       ['jk-baai'],

  'jk-wariai':      ['g5-割合'],
  'jk-hi':          ['g6-比','jk-wariai'],
  'jk-soutou':      ['jk-wariai','g5-分数'],
  'jk-baisuu-zan':  ['jk-hi'],
  'jk-noudo':       ['jk-wariai'],
  'jk-songi':       ['jk-wariai'],
  'jk-shigoto':     ['jk-hi','jk-baisu'],
  'jk-newton':      ['jk-shigoto'],

  'jk-wasa':        ['g4-文章題'],
  'jk-bunpai':      ['jk-wasa','jk-hi'],
  'jk-tsurukame':   ['jk-wasa'],
  'jk-heikin':      ['g5-単位量'],
  'jk-kabusoku':    ['jk-wasa'],
  'jk-sashuu':      ['jk-kabusoku'],
  'jk-shoukyo':     ['jk-bunpai'],
  'jk-nenrei':      ['jk-wasa','jk-hi'],
  'jk-ueki':        ['g4-文章題'],
  'jk-houjin':      ['jk-ueki'],

  'jk-hayasa':      ['g5-速さ'],
  'jk-tabibito':    ['jk-hayasa'],
  'jk-tsuuka':      ['jk-hayasa'],
  'jk-ryuusui':     ['jk-hayasa','jk-wasa'],
  'jk-tokei':       ['jk-tabibito'],
  'jk-diagram':     ['jk-tabibito','g4-グラフ'],

  'jk-kakudo':      ['g4-角度'],
  'jk-menseki':     ['g5-面積'],
  'jk-en':          ['g6-円'],
  'jk-fukugou':     ['jk-en','jk-menseki'],
  'jk-souji':       ['jk-hi','jk-menseki','g6-拡大縮小'],
  'jk-taiseki':     ['g6-体積'],
  'jk-tenkai':      ['g4-立体'],
  'jk-suisou':      ['jk-taiseki','jk-hi','g4-グラフ'],

  // ---- 難関チャレンジ（前提の単元を両方おさえてから開く）----
  'hard-speed':    ['jk-tabibito','jk-diagram'],
  'hard-tenmove':  ['jk-menseki','jk-diagram'],
  'hard-water':    ['jk-suisou'],
  'hard-solid':    ['jk-taiseki','jk-tenkai'],
  'hard-ratiogeo': ['jk-souji'],
  'hard-rule':     ['jk-suuretsu','jk-amari','jk-houjin'],
  'hard-case':     ['jk-michi','jk-baai'],
  'hard-num':      ['jk-sosuu','jk-amari'],
  'hard-mix':      ['jk-noudo','jk-shigoto'],
  'hard-tokushu':  ['jk-sashuu','jk-tsurukame','jk-kabusoku'],
};

let PRE = null, DEPTH = null;

function build() {
  if (PRE) return;
  PRE = {};
  const exists = id => !!DATA.unit(id);
  const add = (id, p) => {
    if (!exists(id) || !exists(p) || id === p) return;
    (PRE[id] = PRE[id] || []).indexOf(p) < 0 && PRE[id].push(p);
  };
  Object.values(STRANDS).forEach(list => {
    const real = list.filter(exists);
    real.forEach((id, i) => { if (i > 0) add(id, real[i-1]); });
  });
  Object.entries(EXTRA).forEach(([id, ps]) => ps.forEach(p => add(id, p)));
  // 登録されていない単元は前提なし（＝いつでも開く）
  DATA.units.forEach(u => { if (!PRE[u.id]) PRE[u.id] = []; });

  // 深さ＝前提をさかのぼった最長の距離。学習順のものさしになる
  DEPTH = {};
  const seen = new Set();
  const depth = id => {
    if (DEPTH[id] != null) return DEPTH[id];
    if (seen.has(id)) return 0;             // 万一の循環に備える
    seen.add(id);
    const ps = PRE[id] || [];
    const d = ps.length ? 1 + Math.max(...ps.map(depth)) : 0;
    seen.delete(id);
    return (DEPTH[id] = d);
  };
  DATA.units.forEach(u => depth(u.id));
}

const pre     = id => (build(), PRE[id] || []);
const depthOf = id => (build(), DEPTH[id] || 0);
// その単元を頂点とした前提の木（近い順）
function ancestors(id, max = 40) {
  build();
  const out = [], q = [...pre(id)], seen = new Set(q);
  while (q.length && out.length < max) {
    const x = q.shift(); out.push(x);
    pre(x).forEach(p => { if (!seen.has(p)) { seen.add(p); q.push(p); } });
  }
  return out;
}
const children = id => (build(), DATA.units.filter(u => pre(u.id).indexOf(id) >= 0).map(u => u.id));

return { pre, depthOf, ancestors, children, STRANDS, EXTRA,
         get map(){ build(); return PRE; } };
})();
