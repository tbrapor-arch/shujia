#!/usr/bin/env python3
"""Build data/words.txt (segmentation word list) from jieba's dictionary (MIT).

    pip download jieba==0.42.1 --no-deps -d /tmp/jb && tar xzf /tmp/jb/jieba-0.42.1.tar.gz -C /tmp/jb
    python3 tools/build_words.py /tmp/jb/jieba-0.42.1/jieba/dict.txt data/words.txt

jieba's lines are `word freq pos`. Kept: words of Han characters only, in jieba's order, with their frequency; then one
letter for the word class when it is not a noun or a name (the app's 得 rules use it, see SOLO_READ in index.html):
    i idiom  v verb (v vn vd vg vi vq)  a adjective (a ad an ag)  z state word (z: 清清楚楚, 通红)  d adverb
    r pronoun  t time word  m number / measure word (m mq mg q)  p preposition  x anything else (c f u y e o l b zg g k h x)
no letter = noun or name (n nr ns nt nz nrt nrfg ng s j). jieba gives one class per word, its most common one, and often a
poor one (气 n, 高兴 b, 寻思 nr, 很 zg): the app keeps its own word lists on top of it.
Older words.txt had only the i letter, which the app's loader of that time reads as "idiom" whatever the letter.
"""
import re, sys

src, out = sys.argv[1:3]
HAN = re.compile(r'^[㐀-䶿一-鿿豈-﫿〇]+$')
CLS = {'i': 'i', 'v': 'v', 'vn': 'v', 'vd': 'v', 'vg': 'v', 'vi': 'v', 'vq': 'v', 'a': 'a', 'ad': 'a', 'an': 'a', 'ag': 'a',
       'z': 'z', 'd': 'd', 'dg': 'd', 'df': 'd', 'r': 'r', 'rr': 'r', 'rz': 'r', 'rg': 'r', 't': 't', 'tg': 't',
       'm': 'm', 'mq': 'm', 'mg': 'm', 'q': 'm', 'p': 'p'}
NOUN = {'n', 'nr', 'ns', 'nt', 'nz', 'nrt', 'nrfg', 'ng', 's', 'j'}
# the list as first published (Nov 2026) differed from jieba 0.42.1 in three words: kept as they were
ADD_AFTER = {'张副将': ('张力', 160, 'n')}
BEFORE = {'张华便': ('张华', 140, 'nr')}
DROP = {'吉林'}

seen, lines = set(), ['# jieba dictionary (MIT) - word freq [class: i idiom, v verb, a adjective, z state, d adverb, r pronoun, '
                      't time, m number/measure, p preposition, x other; none = noun or name] - tools/build_words.py']
def put(w, f, pos):
    if w in seen: return
    seen.add(w); c = '' if pos in NOUN else CLS.get(pos, 'x')
    lines.append(f'{w} {f}' + (f' {c}' if c else ''))
for L in open(src, encoding='utf8'):
    w, f, pos = L.split()
    if w in BEFORE: put(*BEFORE[w])
    if HAN.match(w) and w not in DROP: put(w, int(f), pos)
    if w in ADD_AFTER: put(*ADD_AFTER[w])
open(out, 'w', encoding='utf8').write('\n'.join(lines) + '\n')
print(len(lines) - 1, 'words')
