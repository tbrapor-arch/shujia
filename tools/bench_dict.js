async () => {
  const text = await (await fetch('/bench/book.txt')).text();
  ensureFreq();
  const isHan = s => /^[㐀-鿿]+$/.test(s);
  const stats = { tokens: 0, multi: 0, cedict: 0, wikt: 0, synth: 0, none: 0, refOnly: 0, refResolved: 0, readNote: 0, oldVariantChar: 0, newVariantChar: 0, charRows: 0 };
  const types = { cedict: new Map(), wikt: new Map(), synth: new Map(), none: new Map(), ref: new Map(), note: new Map() };
  const bump = (m, w) => m.set(w, (m.get(w) || 0) + 1);
  for (const para of text.split('\n')) {
    const ns = normZh(para, true);
    for (const [a, b] of segment(ns)) {
      const orig = para.slice(a, b), nw = ns.slice(a, b);
      if (!isHan(orig)) continue;
      stats.tokens++;
      if (orig.length < 2) continue;
      stats.multi++;
      let es = Dict.entries(orig) || Dict.entries(nw);
      let kind;
      if (es && es.every(e => e.wikt)) kind = 'wikt';
      else if (es) kind = 'cedict';
      else if (Words.map.has(nw) && compoundEntry(orig, nw)) kind = 'synth';
      else kind = 'none';
      stats[kind]++; bump(types[kind], orig);
      if (!es) continue;
      const main = es[0];
      if (isRefOnly(main)) { stats.refOnly++; bump(types.ref, orig); if (refTarget(main.defs[0], main)) stats.refResolved++; }
      // character rows: reading in this word vs usual, and variant-only meanings old vs new
      const cs = [...orig], syl = main.pinyin.split(' '), fit = syl.length === cs.length;
      cs.forEach((c, i) => {
        stats.charRows++;
        const e = charEntry(c, fit ? syl[i] : null), u = (() => { const es = (Dict.entries(c) || []).filter(x => !x.proper), r = es.length && READ_MAIN[es[0].simp]; return (r && es.find(x => x.pinyin.toLowerCase() === r)) || charEntry(c); })();
        const A = pyKey(u && u.pinyin), B = pyKey(e && e.pinyin), base = x => x.replace(/\d/, '');
        if (e && u && A !== B && (base(A) !== base(B) || (!/5$/.test(A) && !/5$/.test(B)))) { stats.readNote++; bump(types.note, `${c} ${e.pinyin} (≠ ${u.pinyin}) in ${orig}`); }
        const all = Dict.entries(c) || []; const old = all.find(x => !x.proper) || all[0];
        if (old && isRefOnly(old)) stats.oldVariantChar++;
        if (e && isRefOnly(e) && !refTarget(e.defs[0], e)) stats.newVariantChar++;
      });
    }
  }
  const top = (m, n = 40) => [...m].sort((x, y) => y[1] - x[1]).slice(0, n);
  const wiktSample = top(types.wikt, 200).map(([w, n]) => { const e = (Dict.entries(w) || Dict.entries(normZh(w, true)))[0]; return `${n}× ${w} ${e.pinyin} : ${e.defs.slice(0, 2).join(' / ').slice(0, 90)}`; });
  return { stats, distinct: Object.fromEntries(Object.entries(types).map(([k, m]) => [k, m.size])),
    topSynth: top(types.synth, 60), topNone: top(types.none, 20), topRef: top(types.ref, 20), topNote: top(types.note, 25), wiktSample };
}
