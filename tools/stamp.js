/* デプロイのたびに、HTMLが読むJS/CSSのURLに ?v=<版> を打つ。

   ファイル名にハッシュを付けていないので、直しても端末が古いJSを掴む事故が
   起きる（「きょうの5問」の白画面が、直した後も本番の端末で再現しつづけた）。
   URLが変われば必ず取り直されるので、この一手で丸ごと防げる。

   使い方: node tools/stamp.js         … 版を1つ上げて全HTMLに打つ
           node tools/stamp.js 123     … 版を指定して打つ                */
'use strict';
const fs = require('fs'), path = require('path');
const APP = path.join(__dirname, '..');
const SW = path.join(APP, 'service-worker.js');

const swSrc = fs.readFileSync(SW, 'utf8');
const cur = Number((swSrc.match(/sansu-master-v(\d+)/) || [])[1] || 0);

// 版はコミット数から作る。ファイルに書いた数字を1つずつ上げる方式だと、
// デプロイで書き換えたぶんをコミットし忘れた瞬間に版が巻き戻り、
// 古い版と新しい中身が同じURLで衝突する。コミット数なら必ず増える。
let counted = 0;
try {
  counted = Number(require('child_process')
    .execSync('git rev-list --count HEAD', { cwd: APP, stdio: ['ignore','pipe','ignore'] })
    .toString().trim()) || 0;
} catch (e) { /* gitが無い環境ではファイルの数字を使う */ }
const ver = Number(process.argv[2]) || Math.max(counted, cur + 1);

// 1) Service Worker の版と、precache するURLに版を打つ
let sw = swSrc.replace(/sansu-master-v\d+/g, `sansu-master-v${ver}`);
sw = sw.replace(/'(\.\/(?:app|data|questions)\/[^']+?\.js)(?:\?v=\d+)?'/g, `'$1?v=${ver}'`);
sw = sw.replace(/'(\.\/app\/style\.css)(?:\?v=\d+)?'/g, `'$1?v=${ver}'`);
fs.writeFileSync(SW, sw);

// 2) 各HTMLの <script src> と <link href> に版を打つ
const htmls = fs.readdirSync(APP).filter(f => f.endsWith('.html') && !f.startsWith('_'));
let touched = 0;
htmls.forEach(f => {
  const p = path.join(APP, f);
  const before = fs.readFileSync(p, 'utf8');
  const after = before
    .replace(/(src=")((?:app|data|questions)\/[^"?]+\.js)(?:\?v=\d+)?(")/g, `$1$2?v=${ver}$3`)
    .replace(/(href=")(app\/style\.css)(?:\?v=\d+)?(")/g, `$1$2?v=${ver}$3`);
  if (after !== before) { fs.writeFileSync(p, after); touched++; }
});

console.log(`🔖 版 v${ver} を打ちました（HTML ${touched}/${htmls.length} ファイル）`);
