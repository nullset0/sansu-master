/* おうちの人からのひとことを、いま出す。

   使い方:
     node tools/notice.js "ちゃんと座ってやりなさい"
     node tools/notice.js "がんばれ" --emoji 💪 --color '#4a9df5' --days 1
     node tools/notice.js --clear

   notice.json を書いて VPS に置くだけ。アプリは20秒おきに見にいくので、
   開いている端末には20秒以内、閉じていれば次に開いたときに1回だけ出る。
   端末ごとに「出したか」を覚えるので、二度は出ない。                     */
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const APP = path.join(__dirname, '..');
const OUT = path.join(APP, 'notice.json');
const HOST = process.env.VPS_HOST || 'root@nullset-tools.xvps.jp';
const DIR  = process.env.REMOTE_DIR || '/root/sansu-master';

const args = process.argv.slice(2);
const flag = (name, def) => { const i = args.indexOf('--' + name); return i < 0 ? def : args[i + 1]; };
const text = args.filter(a => !a.startsWith('--') &&
  args[args.indexOf(a) - 1] !== '--emoji' && args[args.indexOf(a) - 1] !== '--color' &&
  args[args.indexOf(a) - 1] !== '--days').join(' ');

const iso = d => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);

let notice;
if (args.includes('--clear') || !text) {
  notice = { id: 'none', text: '', until: '2000-01-01' };
} else {
  notice = {
    id: 'n' + Date.now(),                       // 新しいidになった瞬間に出る
    text,
    emoji: flag('emoji', '📣'),
    color: flag('color', '#f0a500'),
    until: iso(Number(flag('days', 1))),        // 既定は1日で期限ぎれ
  };
}

fs.writeFileSync(OUT, JSON.stringify(notice, null, 1) + '\n');
console.log('📝 notice.json:', JSON.stringify(notice));

try {
  execFileSync('rsync', ['-az', '-e', 'ssh -o StrictHostKeyChecking=accept-new',
    OUT, `${HOST}:${DIR}/app/notice.json`], { stdio: 'inherit' });
  console.log('🚀 送りました。開いている端末には20秒以内、閉じていれば次に開いたときに出ます。');
} catch (e) {
  console.error('❌ 送れませんでした:', e.message);
  process.exit(1);
}
