/* デプロイのたびに、HTMLが読むJS/CSSのURLに ?v=<版> を打つ。

   ファイル名にハッシュを付けていないので、直しても端末が古いJSを掴む事故が
   起きる（「きょうの5問」の白画面が、直した後も本番の端末で再現しつづけた）。
   URLが変われば必ず取り直されるので、この一手で丸ごと防げる。

   使い方: node tools/stamp.js <配る先ディレクトリ> [版]

   ★ 作業ツリーは書き換えない。配る直前のコピーにだけ打つ。
     リポジトリを書き換えると、デプロイのたびに差分が出てコミット漏れを生む。 */
'use strict';
const fs = require('fs'), path = require('path');
const APP = path.join(__dirname, '..');
const DEST = process.argv[2] && !/^\d+$/.test(process.argv[2]) ? process.argv[2] : APP;
const SW = path.join(DEST, 'service-worker.js');

const swSrc = fs.readFileSync(SW, 'utf8');

// 版は「コミット数 + そのコミットのSHA」。番号を1つずつ上げる方式は、
// 打った先をコミットしない作りにした瞬間に増えなくなり、同じ番号で
// 中身だけ変わる＝端末が古いキャッシュを掴みつづける（実際に起きた）。
// 大事なのは順番ではなく「中身が変わったらURLも変わる」ことなので、
// コミットを指す文字列をそのまま使う。
function version() {
  if (process.argv[3]) return process.argv[3];
  if (/^[\w.-]+$/.test(process.argv[2] || '') && !fs.existsSync(process.argv[2] || '')) return process.argv[2];
  try {
    const git = a => require('child_process')
      .execSync(a, { cwd: APP, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    const n = git('git rev-list --count HEAD');
    const sha = git('git rev-parse --short HEAD');
    const dirty = git('git status --porcelain') ? '-d' + (Date.now() % 100000) : '';
    return `${n}-${sha}${dirty}`;
  } catch (e) {
    return 'b' + Date.now();          // gitが無い環境
  }
}
const ver = version();

// 1) Service Worker の版と、precache するURLに版を打つ
let sw = swSrc.replace(/sansu-master-v[\w.-]+/g, `sansu-master-v${ver}`);
sw = sw.replace(/'(\.\/(?:app|data|questions)\/[^']+?\.js)(?:\?v=[\w.-]+)?'/g, `'$1?v=${ver}'`);
sw = sw.replace(/'(\.\/app\/style\.css)(?:\?v=[\w.-]+)?'/g, `'$1?v=${ver}'`);
fs.writeFileSync(SW, sw);

// 2) 各HTMLの <script src> と <link href> に版を打つ
const htmls = fs.readdirSync(DEST).filter(f => f.endsWith('.html') && !f.startsWith('_'));
let touched = 0;
htmls.forEach(f => {
  const p = path.join(DEST, f);
  const before = fs.readFileSync(p, 'utf8');
  const after = before
    .replace(/(src=")((?:app|data|questions)\/[^"?]+\.js)(?:\?v=[\w.-]+)?(")/g, `$1$2?v=${ver}$3`)
    .replace(/(href=")(app\/style\.css)(?:\?v=[\w.-]+)?(")/g, `$1$2?v=${ver}$3`);
  if (after !== before) { fs.writeFileSync(p, after); touched++; }
});

console.log(`🔖 版 v${ver} を打ちました（HTML ${touched}/${htmls.length} ファイル）`);
