#!/usr/bin/env python3
"""Build data/wikt.txt: Chinese words from English Wiktionary that CC-CEDICT lacks, in CC-CEDICT's line format.

Input: Chinese entries of a wiktextract dump (kaikki.org raw data, CC BY-SA), one JSON object per line,
reduced to word / senses / sounds / forms. Usage:
    python3 tools/build_wikt.py zh.jsonl data/cedict.txt data/wikt.txt
Only words of 2+ Han characters with a Mandarin pinyin reading are kept; senses that belong to other
Chinese languages (Cantonese, Hokkien, Wu, Hakka…) are dropped, since the reader is for Mandarin texts.
"""
import json, re, sys, unicodedata

src, cedict_path, out_path = sys.argv[1:4]

HAN = re.compile(r'^[㐀-䶿一-鿿\U00020000-\U0003FFFF〇]+$')
ced, sylls = set(), set()
for L in open(cedict_path, encoding='utf8'):
    if L.startswith('#') or not L.strip():
        continue
    t, s, p = L.split('\t')[:3]
    ced.add(t); ced.add(s)
    for y in p.split():
        y = y.lower().rstrip('12345').replace('u:', 'v')
        if y.isalpha():
            sylls.add(y)
sylls.add('r')

TONES = {}
for base, marks in {'a': 'āáǎà', 'e': 'ēéěè', 'i': 'īíǐì', 'o': 'ōóǒò', 'u': 'ūúǔù', 'v': 'ǖǘǚǜ'}.items():
    for k, m in enumerate(marks):
        TONES[m] = (base, k + 1); TONES[m.upper()] = (base.upper(), k + 1)


def pinyin_numbered(py, n, word):
    """'kùnfá' (2 chars) -> 'kun4 fa2'; None when it cannot be split into exactly n syllables."""
    py = unicodedata.normalize('NFC', py.strip())
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
    s = ''.join(letters)
    L = len(s)
    # dynamic programming: exactly n valid syllables, never crossing an explicit break
    from functools import lru_cache

    @lru_cache(None)
    def go(i, k):
        if k == n:
            return () if i == L else None
        for j in range(min(L, i + 6), i, -1):
            if any(b in breaks for b in range(i + 1, j)):
                continue
            y = s[i:j]
            if y not in sylls or (y == 'r' and word[k] != '儿' and word[k] != '兒'):
                continue
            if y[0] in 'aeo' and i > 0 and i not in breaks:  # pinyin writes an apostrophe before a/e/o inside a word (Xī'ān)
                continue
            rest = go(j, k + 1)
            if rest is not None:
                return ((i, j),) + rest
        return None
    parts = go(0, 0)
    if not parts:
        return None
    out = []
    for i, j in parts:
        t = max(tones[i:j]) or 5
        y = s[i:j].replace('v', 'u:')
        if caps[i]:
            y = y[0].upper() + y[1:]
        out.append(f'{y}{t}')
    return ' '.join(out)


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
    g = re.sub(r'\s*／\s*|\s+/(?=[㐀-鿿])', '|', g)  # 內切圓／内切圆 -> 內切圓|内切圆 (shown as one simplified word)
    g = g.replace('/', '∕').replace('\t', ' ').strip()   # "/" separates senses in this format
    return g[:160] + ('…' if len(g) > 160 else '')


PLACE = re.compile(r'\((?:a |an )?(?:town|village|township|subdistrict|residential community|community|ethnic township|county|district|city|neighbou?rhood|area|prefecture|island|station|street|road|river|lake|mountain|place)\b[^)]*\b(?:in|of|on)\b|transliteration of|a (?:metro|railway|subway) station', re.I)
NUM = set('一二三四五六七八九十兩两幾几百千萬万半')
lines = {}
for L in open(src, encoding='utf8'):
    o = json.loads(L)
    w = o.get('word') or ''
    if len(w) < 2 or not HAN.match(w):
        continue
    simp = next((f['form'] for f in o.get('forms', []) if f.get('tags') and 'Simplified-Chinese' in f['tags'] and f.get('form')), w)
    if len(simp) != len(w) or not HAN.match(simp) or w in ced or simp in ced:
        continue
    py = next((x['zh_pron'] for x in o.get('sounds', []) if x.get('tags') and 'Mandarin' in x['tags'] and 'Pinyin' in x['tags']
               and 'Tongyong-Pinyin' not in x['tags']), None)
    if not py:
        continue
    py = py.split(',')[0]
    num = pinyin_numbered(py, len(w), w)
    if not num:
        continue
    if o.get('pos') == 'name' and num[0].islower():
        num = num[0].upper() + num[1:]
    defs = []
    for s in o.get('senses', []):
        tags = set(s.get('tags') or [])
        gl = s.get('glosses') or []
        if not gl or tags & OTHER or 'no-gloss' in tags or 'empty-gloss' in tags:
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
    key = (w, simp, num)
    cur = lines.setdefault(key, [])
    for d in defs:
        if d not in cur and len(cur) < 8:
            cur.append(d)

with open(out_path, 'w', encoding='utf8') as f:
    f.write('# Chinese words from English Wiktionary (wiktextract / kaikki.org), CC BY-SA 4.0, missing from CC-CEDICT. Built by tools/build_wikt.py\n')
    for (t, s, p), defs in sorted(lines.items(), key=lambda kv: kv[0][1]):
        f.write(f"{t}\t{s}\t{p}\t{'/'.join(defs)}\n")
print(len(lines), 'entries')
