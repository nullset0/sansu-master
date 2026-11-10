"""国語・漢字データの検算: 配当表と1字ずつ一致・ことばに漢字が入る・例文に答えが出ていない・
よみに辞書(KANJIDIC2)の読みのどれか(連濁・促音を許す)が入る・ことばの他の漢字が同じ学年以下。
使い方: python3 -I tools/check_kanji.py <kanji_base.json>"""
import json, re, sys, glob, os
base = json.load(open(sys.argv[1]))
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
k2h = lambda s: ''.join(chr(ord(c) - 0x60) if 'ァ' <= c <= 'ヶ' else c for c in s)
DAK = dict(zip('かきくけこさしすせそたちつてとはひふへほ', 'がぎぐげござじずぜぞだぢづでどばびぶべぼ'))
HAN = dict(zip('はひふへほ', 'ぱぴぷぺぽ'))
def variants(r):
    r = k2h(r).replace('-', '')
    stem = r.split('.')[0]; full = r.replace('.', '')
    out = {stem, full}
    for x in list(out):
        if x and x[0] in DAK: out.add(DAK[x[0]] + x[1:])
        if x and x[0] in HAN: out.add(HAN[x[0]] + x[1:])
    for x in list(out):
        if len(x) >= 2 and x[-1] in 'つちくき': out.add(x[:-1] + 'っ')
    return {x for x in out if x}
rows = []
for f in sorted(glob.glob(os.path.join(ROOT, 'data/kj-g*.js'))):
    body = open(f).read().split('`')[1].strip()
    g = int(re.search(r'g(\d)', os.path.basename(f)).group(1))
    for n, l in enumerate(body.split('\n'), 1):
        p = l.split('|'); rows.append((f, n, g, p))
bad = 0
def ng(f, n, msg):
    global bad; bad += 1; print(f'{os.path.basename(f)}:{n} {msg}')
seen = {}
for f, n, g, p in rows:
    if len(p) != 4: ng(f, n, f'列が4つでない {p}'); continue
    k, w, y, s = p
    if k in seen: ng(f, n, f'{k} が重複')
    seen[k] = g
    b = base.get(k)
    if not b: ng(f, n, f'{k} は教育漢字でない'); continue
    if b['g'] != g: ng(f, n, f'{k} は小{b["g"]}')
    if k not in w: ng(f, n, f'{w} に {k} が無い')
    if s.count('＿＿') != 1: ng(f, n, '例文の＿＿が1つでない')
    if k in s: ng(f, n, f'例文に答えの {k} が出ている: {s}')
    if not re.fullmatch(r'[ぁ-んー]+', y): ng(f, n, f'よみ {y} がひらがなでない')
    vs = set().union(*[variants(r) for r in b['on'] + b['kun']])
    if not any(v in y for v in vs): print(f'  [要目視] {k} {w}={y}（辞書: {"・".join(b["on"]+b["kun"])}）')
    for c in w:
        if c in base and base[c]['g'] > g: ng(f, n, f'{w} の {c} は小{base[c]["g"]}（{k}は小{g}）')
        elif re.match(r'[一-龯]', c) and c not in base: ng(f, n, f'{w} の {c} は教育漢字でない')
for g in (4, 5, 6):
    miss = [k for k, v in base.items() if v['g'] == g and k not in seen]
    if miss: bad += 1; print(f'小{g} に無い字: {"".join(miss)}')
print(f'{len(rows)}行・問題 {bad}件')
sys.exit(1 if bad else 0)
