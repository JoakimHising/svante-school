// Modul: Tal och räkning (Matte åk 8). Källa: provmaterial kapitel 1 – bråk, decimaltal, negativa tal, tid.
(globalThis.SvanteModules ||= {})['tal-och-rakning'] = {
  id: 'tal-och-rakning',
  title: 'Tal och räkning',
  subject: 'Matte',
  grade: 'Åk 8',
  testDate: '2026-11-07',
  topics: [
    { id: 'neg', name: 'Negativa tal', glyph: '−3', subs: SvanteGen.neg, boss: { name: 'Minus-Monstret', c1: '#5ec8ff', c2: '#2f5bea', horns: 'spikes', eyes: 2 } },
    { id: 'frac', name: 'Bråk', glyph: '¾', subs: SvanteGen.fracs, boss: { name: 'Bråk-Bjässen', c1: '#e07bff', c2: '#7a3cf0', horns: 'curl', eyes: 1 } },
    { id: 'dec', name: 'Decimaltal', glyph: '0,5', subs: SvanteGen.decs, boss: { name: 'Komma-Kraken', c1: '#ff9d5c', c2: '#e2434b', horns: 'antenna', eyes: 3 } },
    { id: 'tid', name: 'Räkna med tid', glyph: 'h', subs: SvanteGen.tid, boss: { name: 'Tids-Trollet', c1: '#5ff0b5', c2: '#139a7a', horns: 'spikes', eyes: 2 } },
    { id: 'eq', name: 'Vilket tal är x?', glyph: 'x', subs: SvanteGen.eq, boss: { name: 'X-Spöket', c1: '#b9c3ff', c2: '#6a74c9', horns: 'none', eyes: 2 } },
    { id: 'line', name: 'Tallinjen', glyph: '↔', subs: SvanteGen.line, boss: { name: 'Linje-Larven', c1: '#ffe066', c2: '#d99a00', horns: 'antenna', eyes: 2 } },
    { id: 'text', name: 'Textuppgifter', glyph: 'Aa', subs: SvanteGen.text, boss: { name: 'Ord-Ogret', c1: '#ff7aa8', c2: '#c02a6b', horns: 'spikes', eyes: 1 } },
  ],
  final: { name: 'Provbossen', c1: '#ffd46b', c2: '#ff6a3d', horns: 'crown', eyes: 3 },
};
