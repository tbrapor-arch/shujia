#!/usr/bin/env python3
"""Build data/wikt.txt: Chinese words from English Wiktionary that CC-CEDICT lacks, in CC-CEDICT's line format.

Input: Chinese entries of a wiktextract dump (kaikki.org raw data, CC BY-SA), one JSON object per line,
reduced to word / pos / senses / sounds / forms. Usage:
    python3 tools/build_wikt.py zh.jsonl data/cedict.txt data/wikt.txt [redirects.tsv]
Only words of 2+ Han characters with a Standard Mandarin pinyin reading are kept; senses that belong to other
Chinese languages (Cantonese, Hokkien, Wu, Hakka…) are dropped, since the reader is for Mandarin texts.
Also reads data/words.txt (next to cedict.txt) and index.html (WORD_PY, READ_MAIN, PY_DEFAULT) to rank readings like the app.
"""
import json, math, os, re, sys, unicodedata
from collections import Counter

src, cedict_path, out_path = sys.argv[1:4]
redir_path = sys.argv[4] if len(sys.argv) > 4 else None  # word<TAB>target|target… (Wiktionary soft redirects: 甚麼 → 什麼)
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
stats = Counter()

HAN = re.compile(r'^[㐀-䶿一-鿿\U00020000-\U0003FFFF〇]+$')
tl = lambda y: y.lower().rstrip('012345').replace('u:', 'v').replace('ü', 'v')  # toneless syllable

# --- CC-CEDICT: every entry per key, and the readings of each character
ced_all = {}   # key -> [(trad, simp, pinyin, defs)]
reads = {}     # character -> toneless readings
treads = {}    # character -> readings with their tone
t2s = {}
for L in open(cedict_path, encoding='utf8'):
    if L.startswith('#') or not L.strip():
        continue
    t, s, p, d = L.rstrip('\n').split('\t')[:4]
    defs = [x for x in d.split('/') if x and not x.startswith('CL:')]
    for k in {t, s}:
        ced_all.setdefault(k, []).append((t, s, p, defs))
    if len(t) == 1 and len(s) == 1:
        for k in (t, s):
            reads.setdefault(k, set()).add(tl(p)); treads.setdefault(k, set()).add(p.lower())
        t2s.setdefault(t, s)
    elif not p[:1].isupper():  # readings a character takes inside words count too (匙 shi in 鑰匙 yàoshi)
        syl = p.split()
        if len(syl) == len(t) == len(s):
            for k in (t, s):
                for c, y in zip(k, syl):
                    reads.setdefault(c, set()).add(tl(y)); treads.setdefault(c, set()).add(y.lower())
ced = set(ced_all)
sylls = {tl(y) for es in ced_all.values() for e in es for y in e[2].split() if tl(y).isalpha()} | {'r'}

TONES = {}
for base, marks in {'a': 'āáǎà', 'e': 'ēéěè', 'i': 'īíǐì', 'o': 'ōóǒò', 'u': 'ūúǔù', 'v': 'ǖǘǚǜ'}.items():
    for k, m in enumerate(marks):
        TONES[m] = (base, k + 1); TONES[m.upper()] = (base.upper(), k + 1)


def one_syllable(py):
    """'shān' -> 'shan1' (None if it isn't a single plain syllable)"""
    out, tone = '', 5
    for ch in unicodedata.normalize('NFC', py.strip().lower()):
        if ch in TONES:
            b, tone = TONES[ch]; out += b
        elif ch == 'ü':
            out += 'v'
        elif ch.isascii() and ch.isalpha():
            out += ch
        else:
            return None
    return out + str(tone) if out else None


# readings Wiktionary gives the character itself count as well (杉 shā in 杉木, 綸 guān in 綸巾), Standard Mandarin only
ONE = re.compile(r'^\{"word": "(.)",')
for L in open(src, encoding='utf8'):
    m = ONE.match(L)
    if not m:
        continue
    c = m.group(1)
    for x in json.loads(L).get('sounds', []):
        t = set(x.get('tags') or [])
        if 'Mandarin' in t and 'Pinyin' in t and (t & {'Standard-Chinese', 'Standard'} or t == {'Mandarin', 'Pinyin'}) and not t & {'Tongyong-Pinyin', 'Erhua', 'phonetic'}:
            for v in re.split(r'[,，]\s*', re.sub(r'\s*[\[(].*', '', x.get('zh_pron') or '')):
                y = one_syllable(v)
                if y:
                    reads.setdefault(c, set()).add(tl(y)); treads.setdefault(c, set()).add(y)

# --- the app's own tables, so readings are ranked the way the pop-up ranks them
app = open(os.path.join(root, 'index.html'), encoding='utf8').read()
WORD_PY = dict(re.findall(r"(\S+): '([^']+)'", re.search(r"const WORD_PY = \{([^}]*)\}", app).group(1)))
READ_MAIN = {t[0]: t[1:] for t in re.search(r"const READ_MAIN = \{\}; '([^']*)'", app).group(1).split()}
PY_DEFAULT = {t[0]: t[1:] for t in re.search(r"const PY_DEFAULT = \{\};\n\('([^']*)'\)", app).group(1).split()}
MINOR_RE = re.compile(r'archaic|obsolete|^old variant of|^used in |radical|^see |Japanese variant|\(old\)|^\(dialect\)|^\(Cantonese\)', re.I)
words_path = os.path.join(os.path.dirname(cedict_path), 'words.txt')
wfreq = {}
for L in open(words_path, encoding='utf8'):
    if L.startswith('#'):
        continue
    x = L.split()
    if len(x) >= 2:
        wfreq[x[0]] = int(x[1])
LOGTOTAL = math.log(sum(wfreq.values()))


def rank(w, es, word_py=True):
    """Entries of a multi-character word in the app's order (Dict.entries0): names last, then WORD_PY, most senses, neutral tone."""
    def sc(e):
        minor = bool(e[3]) and all(MINOR_RE.search(d) for d in e[3])
        return (100 if word_py and e[2] in (WORD_PY.get(w), WORD_PY.get(e[1])) else 0) + len(e[3]) + (0.5 if '5' in e[2] else 0) - (50 if minor else 0)
    return sorted(es, key=lambda e: (e[2][:1].isupper(), -sc(e)))


def fits(c, y):
    """y (toneless) is a CC-CEDICT reading of character c; characters CC-CEDICT doesn't know pass"""
    if y == 'r':
        return c in '儿兒'
    return c not in reads or y in reads[c]


def usual(c):
    """the usual readings of a character (the app's READ_MAIN / PY_DEFAULT), else all of them"""
    s = t2s.get(c, c)
    u = {tl(x) for x in (READ_MAIN.get(s), PY_DEFAULT.get(c), PY_DEFAULT.get(s)) if x}
    return u or reads.get(c, set())




def pinyin_numbered(py, word):
    """'kùnfá' (困乏) -> 'kun4 fa2'. Every split into len(word) valid syllables is tried; the one whose syllables are readings
    of their characters wins (鳳蛾 fèngé = fèng é, not fèn gé), the apostrophe rule only breaks ties. None when no split
    matches the characters (dialect or wrong pinyin in the source: 貨單 huòduān)."""
    n = len(word)
    py = unicodedata.normalize('NFC', re.sub(r'\s*[\[(].*', '', py.strip()))
    letters, tones, caps, breaks = [], [], [], set()
    for ch in py:
        if ch in TONES:
            b, t = TONES[ch]
        elif ch in 'üÜ':
            b, t = ('v' if ch == 'ü' else 'V'), 0
        elif ch.isascii() and ch.isalpha():
            b, t = ch, 0
        elif ch in " '’-‧·":
            breaks.add(len(letters)); continue
        else:
            return None
        letters.append(b.lower()); tones.append(t); caps.append(b.isupper())
    s = ''.join(letters); L = len(s)
    found = []

    def go(i, k, acc):
        if len(found) > 200:
            return
        if k == n:
            if i == L:
                found.append(acc)
            return
        for j in range(min(L, i + 6), i, -1):
            if any(b in breaks for b in range(i + 1, j)):
                continue  # a syllable never crosses a written break
            y = s[i:j]
            if y in sylls and (y != 'r' or word[k] in '儿兒'):
                go(j, k + 1, acc + [(i, j)])
    go(0, 0, [])
    if not found:
        return None

    def score(parts):
        miss = sum(not fits(word[k], s[i:j]) for k, (i, j) in enumerate(parts))
        multi = sum(sum(1 for t in tones[i:j] if t) > 1 for i, j in parts)  # two tone marks in one syllable
        apos = sum(1 for i, j in parts if i and s[i] in 'aeo' and i not in breaks)  # pinyin writes Xī'ān
        return (miss, multi, apos)
    best = min(found, key=score)
    if score(best)[0]:
        return None
    out = []
    for i, j in best:
        t = max(tones[i:j]) or 5
        y = s[i:j].replace('v', 'u:')
        if caps[i]:
            y = y[0].upper() + y[1:]
        out.append(f'{y}{t}')
    return out


def split_words(simp):
    """the word cut into the segmenter's words, never the whole (在劫难逃 = 在劫 + 难逃, not 在 + 劫难 + 逃), like the app's segment()"""
    n = len(simp); best = [0.0] * (n + 1); nxt = [n] * (n + 1)
    for i in range(n - 1, -1, -1):
        bs = None
        for L in range(1, min(8, n - i) + 1):
            if L == n:
                continue
            w = simp[i:i + L]
            f = wfreq.get(w) or (3 if w in ced else (1 if L == 1 else 0))
            if not f:
                continue
            sc = math.log(f) - LOGTOTAL + best[i + L]
            if bs is None or sc > bs:
                bs, nxt[i] = sc, i + L
        best[i] = bs if bs is not None else -1e9
    out, i = [], 0
    while i < n:
        out.append((i, nxt[i])); i = nxt[i]
    return out


def neutral_tones(w, simp, syl):
    """Wiktionary often drops the neutral tone inside longer words (老先生 xiānshēng, 聰明人 cōngmíng): copy the syllables of
    the CC-CEDICT words it is made of (先生 xiān sheng), when they agree without tones"""
    out = list(syl)
    if len(w) == 4 and ((w[0] == w[1] and w[2] == w[3]) or (w[0] == w[2] and w[1] == w[3])):
        return out  # doubled words keep full tones: 老老實實 lǎolǎoshíshí, not the shi of 老實
    for i, j in split_words(simp):
        if j - i < 2:
            continue
        es = [e for k in dict.fromkeys((w[i:j], simp[i:j])) for e in ced_all.get(k, [])]
        here = [x.lower() for x in out[i:j]]
        es = [e for e in es if [tl(y) for y in e[2].split()] == [tl(y) for y in here]]
        if not es:
            continue
        exact = any(e[2].lower().split() == here for e in es)
        # a tone the character never has (院 yuán in 動物醫院) is a slip in the source
        bad = {k for k in range(j - i) if w[i + k] in treads and not here[k].endswith('5') and here[k] not in treads[w[i + k]]}
        top = rank(simp[i:j], es, word_py=False)[0][2].lower().split()  # (地方志 keeps the fāng of 地方 "local")
        # Wiktionary's tones stay (平上去入 shǎng, not the shàng of 上去) except where CC-CEDICT only adds neutral tones
        # (髒東西 dōngxi) or the character never has that tone (動物醫院 yīyuàn, not yīyuán)
        if top != here and all(a == b or a.endswith('5') or (k in bad and not exact) for k, (a, b) in enumerate(zip(top, here))):
            for k, y in enumerate(top):
                out[i + k] = y[0].upper() + y[1:] if out[i + k][:1].isupper() else y
            stats['tones from CC-CEDICT'] += 1
    return out


def pick_sound(o):
    """Standard Mandarin pinyin: never a regional reading (走親親 has only Xi'an zòuqiǎnqian, 疙瘩子 Chengdu), nor a sandhi
    spelling; Beijing words (板兒, 暴土) and erhua words keep their Beijing / erhua reading when there is nothing else"""
    REGION = {"Chengdu", "Sichuanese", "Xi'an", "Nanjing", "Dungan"}
    OTHERS = {'phonetic', 'Erhua', 'toneless-final-syllable-variant', 'Beijing', 'dialectal'}
    cands = [(x['zh_pron'], set(x.get('tags') or [])) for x in o.get('sounds', []) if x.get('zh_pron')]
    cands = [(p, t) for p, t in cands if 'Mandarin' in t and 'Pinyin' in t and 'Tongyong-Pinyin' not in t]
    std = [(p, t) for p, t in cands if t & {'Standard-Chinese', 'Standard'} and not t & (REGION | OTHERS)]
    std.sort(key=lambda x: 'variant' in x[1])
    if std:
        return std[0][0]
    regional = {p for p, t in cands if t & REGION}
    for p, t in cands:
        if p not in regional and (t <= {'Mandarin', 'Pinyin'} or (not t & REGION and not 'phonetic' in t)):
            return p
    if cands:
        stats['rejected: dialect pinyin only'] += 1
    return None


OTHER = set('''Cantonese Hokkien Min Xiamen Hakka Taiwanese-Hokkien Zhangzhou-Hokkien Wu Quanzhou Teochew Xiang Puxian-Min Jin
Zhangzhou Gan Leizhou-Min Hainanese Pinghua Jinjiang-Hokkien Penang-Hokkien Taishanese Sixian Meixian Changsha Dongguan Guangzhou
Nanning Loudi Tong'an Jinhua Zhongshan Zhao'an Tainan Longyan-Min Huizhou Dungan Pingxiang Philippine Jinjiang Shanghainese
Suzhou Wenzhou Ningbo Fuzhou Eastern-Min Northern-Min Southern-Min Hong-Kong-Cantonese Hailu Raoping Dabu Yudu Shaoxing Hangzhou'''.split())
LABEL = {'literary': 'literary', 'figuratively': 'fig.', 'colloquial': 'coll.', 'Taiwan': 'Tw', 'Taiwanese-Mandarin': 'Tw',
         'Mainland-China': 'mainland', 'slang': 'slang', 'Internet': 'Internet slang', 'neologism': 'neologism',
         'derogatory': 'derog.', 'vulgar': 'vulgar', 'historical': 'historical', 'archaic': 'archaic', 'obsolete': 'obsolete',
         'dated': 'dated', 'Classical': 'Classical Chinese', 'dialectal': 'dialect', 'Beijing': 'Beijing dialect',
         'Northeastern': 'NE dialect', 'Sichuanese': 'Sichuan dialect', 'Southwestern-Mandarin': 'SW Mandarin',
         'humorous': 'humorous', 'euphemistic': 'euph.', 'formal': 'formal', 'Singapore': 'Singapore', 'Malaysia': 'Malaysia',
         'Hong-Kong': 'HK', 'offensive': 'offensive', 'rare': 'rare'}


def clean(g):
    # "Used other than figuratively or idiomatically: see 一, 節|节: one segment…": only what follows the references, if anything
    m = re.match(r'Used other than figuratively or idiomatically:\s*(?:see [^:]*?(?::\s*(.*))?|(.*))$', g)
    if m:
        g = m.group(1) or m.group(2) or ''
    g = re.sub(r'\s*\((?:in )?senses? #?\d+(?:[-–,]\s*#?\d+)*\)', '', g)  # "Communist (sense #2)": a pointer into another page
    g = re.sub(r'\s*／\s*|\s+/(?=[㐀-鿿])', '|', g)  # 內切圓／内切圆 -> 內切圓|内切圆 (shown as one simplified word)
    g = g.replace('/', '∕').replace('\t', ' ').strip()   # "/" separates senses in this format
    return g[:160] + ('…' if len(g) > 160 else '')


PLACE = re.compile(r'\((?:a |an )?(?:town|village|township|ward|commune|subdistrict|residential community|community|ethnic township|county|district|city|neighbou?rhood|area|prefecture|island|station|street|road|river|lake|mountain|place)\b[^)]*\b(?:in|of|on)\b|transliteration of|a (?:metro|railway|subway) station', re.I)
NUM = set('一二三四五六七八九十兩两幾几百千萬万半')
PRON = ('我們', '你們', '他們', '她們', '咱們', '我们', '你们', '他们', '她们', '咱们', '我', '你', '他', '她', '它', '您', '咱', '俺')
PARTICLE = {'的': 'de5', '了': 'le5', '着': 'zhe5', '著': 'zhe5', '吗': 'ma5', '嗎': 'ma5', '呢': 'ne5', '吧': 'ba5', '啊': 'a5', '嘛': 'ma5'}


def sentence_like(w, simp, syl, pos, senses):
    """a phrase or a grammatical string rather than a word: 你懂的, 下雨了, 愛美的 "amateur", 創傷後 "post-traumatic"…
    (they would take over taps and segmentation on ordinary text, where the literal reading is the right one)"""
    last, lastpy = w[-1], syl[-1].lower()
    particle = PARTICLE.get(last) == lastpy  # (not 氧吧 "oxygen bar" bā, 毛呢 "woollen cloth" ní)
    # (a four-character set phrase stays: 你儂我儂 "to bill and coo")
    if pos == 'phrase' and ((w.startswith(PRON) and len(w) != 4) or particle):
        return 'phrase'
    rest = simp[:-1]
    # (的 read otherwise too: 愛美的 àiměidí "amateur", a loan on top of 愛美 "to love beauty")
    if (particle and (len(rest) == 1 or rest in ced)) or (last in '的了着著' and len(rest) > 1 and rest in ced):
        # X + 的/了/着 where X is a word: literal; kept only for real nouns (掌櫃的 shopkeeper, 要飯的 beggar), not loans or jokes
        marked = any(set(s.get('tags') or []) & {'dated', 'humorous', 'slang', 'Internet'} or
                     any(re.search(r'borrowed|humorous|slang|transliteration', c) for c in s.get('categories') or []) for s in senses)
        if len(rest) == 1 or pos != 'noun' or marked:
            return 'particle'
    if last in '后後' and len(rest) > 1 and rest in ced and pos != 'noun':
        return 'after'  # 创伤 + 后
    return None


lines, posof = {}, {}
for L in open(src, encoding='utf8'):
    o = json.loads(L)
    w = o.get('word') or ''
    if len(w) < 2 or not HAN.match(w):
        continue
    # (not an alternative form: 官人's forms list the Min 官侬 as "alternative, Simplified-Chinese")
    simp = next((f['form'] for f in o.get('forms', []) if f.get('tags') and 'Simplified-Chinese' in f['tags'] and 'alternative' not in f['tags'] and f.get('form')), w)
    if len(simp) != len(w) or not HAN.match(simp) or w in ced or simp in ced:
        continue
    py = pick_sound(o)
    if not py:
        continue
    py = py.split(',')[0]
    syl = pinyin_numbered(py, w)
    if syl and any(not fits(c, tl(y)) for c, y in zip(simp, syl)):
        syl = None  # the simplified form's characters must fit too
    if not syl:
        stats['rejected: pinyin not a reading of its characters'] += 1
        if stats['rejected: pinyin not a reading of its characters'] <= 40:
            print('  pinyin?', w, py, file=sys.stderr)
        continue
    syl = neutral_tones(w, simp, syl)
    pos = o.get('pos')
    if pos == 'name' and syl[0].islower():
        syl[0] = syl[0][0].upper() + syl[0][1:]
    senses = o.get('senses', [])
    why = sentence_like(w, simp, syl, pos, senses)
    if why:
        stats['dropped: ' + why] += 1
        continue
    defs = []
    for s in senses:
        tags = set(s.get('tags') or [])
        gl = s.get('glosses') or []
        if not gl or tags & OTHER or 'no-gloss' in tags or 'empty-gloss' in tags:
            continue
        # a joke name (說髒話 "(humorous) Freshjoy, a milk brand"): the words mean what they say
        if pos == 'name' and (tags & {'humorous', 'slang', 'Internet'} or any(re.search(r'humorous|slang', c) for c in s.get('categories') or [])):
            stats['dropped: joke name sense'] += 1
            continue
        g = clean(gl[-1])
        if not g or g.startswith('For pronunciation and definitions'):
            continue
        labels = [LABEL[t] for t in s.get('tags') or [] if t in LABEL]
        if labels and not g.startswith('('):
            g = f"({', '.join(dict.fromkeys(labels))}) {g}"
        if g not in defs:
            defs.append(g)
    # plain senses before slang / offensive / archaic ones
    MARKED = re.compile(r'^\((?:[^)]*\b)?(?:slang|Internet slang|offensive|vulgar|derog\.|archaic|obsolete|dated)\b')
    defs.sort(key=lambda d: bool(MARKED.match(d)))
    # 五十萬 "(Internet slang, offensive) a spy": a number phrase whose only senses are slang means the literal number in a book
    if defs and w[0] in NUM and all(re.match(r'^\([^)]*\b(?:slang|offensive|vulgar)\b', d) for d in defs):
        continue
    if not defs or all(PLACE.search(d) for d in defs):  # small towns, villages, stations, transliterated names: many, rarely met in novels
        continue
    key = (w, simp, ' '.join(syl))
    cur = lines.setdefault(key, [])
    for d in defs:
        if d not in cur and len(cur) < 8:
            cur.append(d)

# spellings Wiktionary only redirects (甚麼 → 什麼, 迴身 → 回身): a "variant of" line pointing to the entry, which the app follows
variants = {}
if redir_path:
    known = {}
    for (t, s, p), defs in lines.items():
        for k in {t, s}:
            known.setdefault(k, []).append((t, s, p, defs))
    red = {}
    for L in open(redir_path, encoding='utf8'):
        w, _, tg = L.rstrip('\n').partition('\t')
        red[w] = tg.split('|')
    for w, tgs in red.items():
        if len(w) < 2 or not HAN.match(w) or w in ced_all or w in known:
            continue
        hit, todo, seen = None, list(tgs), set()
        while todo and not hit and len(seen) < 6:
            x = todo.pop(0)
            if x in seen:
                continue
            seen.add(x)
            if (x in ced_all or x in known) and len(x) == len(w):
                hit = rank(x, ced_all.get(x) or known[x])[0]  # the reading the app shows first (敎授 → 教授 jiào shòu "professor")
            else:
                todo += red.get(x, [])
        if not hit:
            continue
        t, s, p = hit[:3]
        syl = [tl(y) for y in p.split()]
        # the redirect must read like its own characters (的事 → 代誌 dài zhì, 阿那 → 婀娜 ē nuó are Wiktionary noise);
        # a two-character word the segmenter knows must even use their usual readings (强强 is qiáng qiáng, not 彊彊 jiāng jiāng;
        # longer ones are safe: 丈二和尚摸不着头脑 has 着 zháo)
        if len(syl) != len(w) or not all(fits(c, y) for c, y in zip(w, syl)):
            stats['dropped redirect: reading'] += 1
            continue
        if len(w) == 2 and w in wfreq and not all(c not in reads or y in usual(c) for c, y in zip(w, syl)):
            stats['dropped redirect: common word, unusual reading'] += 1
            continue
        variants[w] = (p, f"variant of {t if t == s else t + '|' + s}[{p}]")

with open(out_path, 'w', encoding='utf8') as f:
    f.write('# Chinese words from English Wiktionary (wiktextract / kaikki.org), CC BY-SA 4.0, missing from CC-CEDICT. Built by tools/build_wikt.py\n')
    for (t, s, p), defs in sorted(lines.items(), key=lambda kv: kv[0][1]):
        f.write(f"{t}\t{s}\t{p}\t{'/'.join(defs)}\n")
    for w, (p, d) in sorted(variants.items()):
        f.write(f"{w}\t{w}\t{p}\t{d}\n")
print(len(lines), 'entries,', len(variants), 'variant spellings')
for k, v in sorted(stats.items()):
    print(f'  {k}: {v}')
