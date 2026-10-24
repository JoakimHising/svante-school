// Svante School – frågegeneratorer för matte. Varje generator: { key, levels, make(level) } → fråga.
// Fråga: { ask, prompt, answer: Q, fa?, simplest?, traps?: [[värde, förklaring]], hint, steps, unit?, mode?, choices?, place? }
(function (G) {
  'use strict';
  const { Q, M, gcd, lcm, frac, int, fmt, fmtD, fmtM, pn, pq, ri, nz, pick, chance, shuffle, coprime, numberLine } = G.SC;
  const X = '<i class="var">x</i>';
  const B = s => `<b>${s}</b>`;
  const F = (n, d) => (n < 0 ? M : '') + frac(Math.abs(n), d);
  const RULE_MUL = { same: 'Lika tecken (minus · minus eller plus · plus) ger plus.', diff: 'Olika tecken (plus · minus) ger minus.' };
  const RULE_DIV = { same: 'Minus delat med minus blir plus.', diff: 'Plus delat med minus (eller tvärtom) blir minus.' };

  // ───────────── Negativa tal ─────────────
  const neg = [
    { key: 'neg-cross', levels: [1], make() {
      const a = ri(1, 9), b = ri(a + 1, a + 8), r = a - b;
      return { ask: 'Beräkna', prompt: `${a} − ${b}`, answer: Q.of(r),
        traps: [[b - a, `Du tar bort mer än du har, så svaret blir negativt.`]],
        hint: `Starta på ${a} på tallinjen och gå ${b} steg åt vänster.`,
        steps: [`Starta på ${a}.`, `Efter ${a} steg åt vänster är du på 0.`, `Gå ${b - a} steg till åt vänster.`, `Du hamnar på ${B(int(r))}.`] };
    } },
    { key: 'neg-negneg', levels: [1, 2], make(L) {
      const m = L > 1 ? 15 : 9, a = ri(1, m), b = ri(1, m), r = -a - b;
      return { ask: 'Beräkna', prompt: `${M}${a} − ${b}`, answer: Q.of(r),
        traps: [[b - a, `Båda delarna drar åt vänster. ${M}${a} − ${b} blir ännu mer negativt.`], [a + b, `Svaret ska vara negativt: du börjar under 0 och går ännu längre ner.`]],
        hint: `Du börjar på ${M}${a}. Minus ${b} betyder ${b} steg till åt vänster.`,
        steps: [`Starta på ${M}${a}.`, `− ${b} betyder ${b} steg åt vänster.`, `${M}${a} − ${b} = ${B(int(r))}`] };
    } },
    { key: 'neg-negplus', levels: [1], make() {
      const a = ri(1, 9); let b; do b = ri(1, 12); while (b === a);
      const r = b - a;
      return { ask: 'Beräkna', prompt: `${M}${a} + ${b}`, answer: Q.of(r),
        traps: [[-a - b, `Plus betyder att du går åt höger på tallinjen.`], [a + b, `Du startar på ${M}${a}, inte på ${a}.`]],
        hint: `Starta på ${M}${a} och gå ${b} steg åt höger.`,
        steps: [`Starta på ${M}${a}.`, `+ ${b} betyder ${b} steg åt höger.`, `${M}${a} + ${b} = ${B(int(r))}`] };
    } },
    { key: 'neg-plusneg', levels: [1, 2], make(L) {
      const a = L > 1 ? nz(-12, 15) : ri(1, 12), b = ri(1, 12), r = a - b;
      return { ask: 'Beräkna', prompt: `${int(a)} + (${M}${b})`, answer: Q.of(r),
        traps: [[a + b, `Plus ett negativt tal är samma sak som minus.`]],
        hint: `${int(a)} + (${M}${b}) är samma sak som ${int(a)} − ${b}.`,
        steps: [`Plus och minus bredvid varandra blir minus.`, `${int(a)} + (${M}${b}) = ${int(a)} − ${b}`, `= ${B(int(r))}`] };
    } },
    { key: 'neg-minusneg', levels: [2], make() {
      const a = nz(-12, 12), b = ri(1, 12), r = a + b;
      return { ask: 'Beräkna', prompt: `${int(a)} − (${M}${b})`, answer: Q.of(r),
        traps: [[a - b, `Minus ett negativt tal blir plus! Två minustecken bredvid varandra blir plus.`]],
        hint: `Två minus bredvid varandra blir plus: ${int(a)} − (${M}${b}) = ${int(a)} + ${b}.`,
        steps: [`Minus och minus bredvid varandra blir plus.`, `${int(a)} − (${M}${b}) = ${int(a)} + ${b}`, `= ${B(int(r))}`] };
    } },
    { key: 'neg-mul', levels: [1, 2], make(L) {
      const m = L > 1 ? 12 : 9;
      let x, y; do { x = nz(-m, m); y = nz(-m, m); } while ((x > 0 && y > 0) || Math.abs(x) < 2 || Math.abs(y) < 2);
      const r = x * y, same = Math.sign(x) === Math.sign(y);
      return { ask: 'Beräkna', prompt: `${pn(x)} · ${pn(y)}`, answer: Q.of(r),
        traps: [[-r, `Kolla tecknet! ${same ? RULE_MUL.same : RULE_MUL.diff}`]],
        hint: same ? RULE_MUL.same : RULE_MUL.diff,
        steps: [`Räkna först utan tecken: ${Math.abs(x)} · ${Math.abs(y)} = ${Math.abs(r)}`, `Tecken: ${same ? RULE_MUL.same : RULE_MUL.diff}`, `Svar: ${B(int(r))}`] };
    } },
    { key: 'neg-div', levels: [2], make() {
      const d0 = ri(2, 9), q0 = ri(2, 9);
      let sx, sy; do { sx = pick([1, -1]); sy = pick([1, -1]); } while (sx > 0 && sy > 0);
      const num = sx * d0 * q0, den = sy * d0, r = num / den, same = sx === sy;
      return { ask: 'Beräkna', prompt: frac(int(num), int(den)), answer: Q.of(r),
        traps: [[-r, `Kolla tecknet! ${same ? RULE_DIV.same : RULE_DIV.diff}`]],
        hint: same ? RULE_DIV.same : RULE_DIV.diff,
        steps: [`Räkna utan tecken: ${Math.abs(num)} / ${Math.abs(den)} = ${Math.abs(r)}`, `Tecken: ${same ? RULE_DIV.same : RULE_DIV.diff}`, `Svar: ${B(int(r))}`] };
    } },
    { key: 'neg-three', levels: [3], make() {
      const a = 10 * ri(2, 9), b = 10 * ri(1, 6), c = 10 * ri(1, 6);
      const v = pick([
        [`${a} + (${M}${b}) − (${M}${c})`, `${a} − ${b} + ${c}`, a - b + c, a - b - c],
        [`${a} − (${M}${b}) + (${M}${c})`, `${a} + ${b} − ${c}`, a + b - c, a - b - c],
        [`${M}${a} − (${M}${b}) − (${M}${c})`, `${M}${a} + ${b} + ${c}`, -a + b + c, -a - b - c],
      ]);
      const traps = v[3] !== v[2] ? [[v[3], `Minus ett negativt tal blir plus. Skriv om uttrycket utan parenteser först.`]] : [];
      return { ask: 'Beräkna', prompt: v[0], answer: Q.of(v[2]), traps,
        hint: `Skriv om utan parenteser: + (${M}) blir −, och − (${M}) blir +.`,
        steps: [`Skriv om tecknen: + (${M}) blir −, − (${M}) blir +.`, `${v[0]} = ${v[1]}`, `= ${B(int(v[2]))}`] };
    } },
    { key: 'neg-decmul', levels: [3], make() {
      const a = ri(2, 9), t = ri(1, 9);
      let sx, sy; do { sx = pick([1, -1]); sy = pick([1, -1]); } while (sx > 0 && sy > 0);
      const x = Q.of(sx * a), y = new Q(sy * t, 10), r = x.mul(y), same = sx === sy;
      return { ask: 'Beräkna', prompt: `${pq(x)} · ${pq(y, fmtD)}`, answer: r, fa: 'dec',
        traps: [[r.neg(), `Kolla tecknet! ${same ? RULE_MUL.same : RULE_MUL.diff}`], [Q.of(a * t * sx * sy), `Glöm inte decimalen: 0,${t} har en decimal, då har svaret också en.`]],
        hint: `Räkna ${a} · ${t} och sätt tillbaka en decimal. Tänk sedan på tecknet.`,
        steps: [`${a} · ${t} = ${a * t}`, `0,${t} har en decimal → ${fmtD(new Q(a * t, 10))}`, `Tecken: ${same ? RULE_MUL.same : RULE_MUL.diff}`, `Svar: ${B(fmtD(r))}`] };
    } },
    { key: 'neg-subst', levels: [3], make() {
      const V = ['a', 'b', 'c', 'd'], v = {};
      const show = e => e.replace(/[abcd]/g, k => `<i class="var">${k}</i>`);
      const type = pick(['sum', 'diff', 'prod', 'quot']);
      let expr, r, sub;
      for (;;) {
        V.forEach(k => (v[k] = nz(type === 'prod' ? -4 : -9, type === 'prod' ? 4 : 9)));
        if (type === 'sum') { expr = 'a + b + c + d'; r = v.a + v.b + v.c + v.d; break; }
        if (type === 'diff') { expr = 'a − b − c − d'; r = v.a - v.b - v.c - v.d; break; }
        if (type === 'prod') { expr = 'a · b · c · d'; r = v.a * v.b * v.c * v.d; break; }
        const top = v.a - v.b, bot = v.c - v.d;
        if (bot !== 0 && top % bot === 0 && top !== 0) { expr = null; r = top / bot; break; }
      }
      const P = k => pn(v[k]);
      if (type === 'quot') {
        sub = frac(`${P('a')} − ${P('b')}`, `${P('c')} − ${P('d')}`);
        expr = frac(show('a − b'), show('c − d'));
      } else {
        sub = expr.replace(/[abcd]/g, k => P(k));
        expr = show(expr);
      }
      const vals = V.map(k => `<i class="var">${k}</i> = ${int(v[k])}`).join(', ');
      return { ask: `Beräkna när ${vals}`, prompt: expr, answer: Q.of(r),
        hint: `Byt ut bokstäverna mot talen. Sätt negativa tal inom parentes.`,
        steps: [`Sätt in talen: ${sub}`, type === 'quot' ? `Täljare: ${int(v.a - v.b)}, nämnare: ${int(v.c - v.d)}` : `Räkna steg för steg från vänster.`, `= ${B(int(r))}`] };
    } },
  ];

  // ───────────── Bråk ─────────────
  const commonSteps = (a, b, c, d, op) => {
    const L = lcm(b, d), A = a * (L / b), C = c * (L / d), n = op === '+' ? A + C : A - C, r = new Q(n, L);
    const s = [`Gemensam nämnare: ${L}`];
    if (L !== b) s.push(`${F(a, b)} = ${F(A, L)}`);
    if (L !== d) s.push(`${F(c, d)} = ${F(C, L)}`);
    s.push(`${F(A, L)} ${op} ${F(C, L)} = ${F(n, L)}`);
    if (r.d !== L) s.push(`Förkorta: ${B(fmt(r))}`); else s[s.length - 1] += ` → ${B(fmt(r))}`;
    return s;
  };

  const fracs = [
    { key: 'frac-compare', levels: [1], make() {
      let a, b, c, d;
      do { [a, b] = coprime(9); [c, d] = coprime(9); } while (new Q(a, b).eq(new Q(c, d)) || b === d && chance(0.5));
      const big = new Q(a, b).cmp(new Q(c, d)) > 0, L = b * d;
      const msg = `Skriv båda bråken med samma nämnare och jämför täljarna.`;
      return { ask: 'Vilket tal är störst?', prompt: `${F(a, b)} eller ${F(c, d)}`, mode: 'choice', answer: big ? new Q(a, b) : new Q(c, d),
        choices: [{ html: F(a, b), correct: big, msg }, { html: F(c, d), correct: !big, msg }],
        hint: b === d ? 'Samma nämnare: jämför bara täljarna.' : `Förläng så att båda får nämnaren ${L}.`,
        steps: [`${F(a, b)} = ${F(a * d, L)}`, `${F(c, d)} = ${F(c * b, L)}`, `${Math.max(a * d, c * b)} > ${Math.min(a * d, c * b)}, så ${B(big ? F(a, b) : F(c, d))} är störst.`] };
    } },
    { key: 'frac-addsame', levels: [1], make() {
      const n = ri(5, 12), a = ri(1, n - 2), b = ri(1, n - 1 - a), r = new Q(a + b, n);
      const steps = [`Samma nämnare: addera bara täljarna. ${a} + ${b} = ${a + b}`, `${F(a + b, n)}${r.d !== n ? ` = ${B(fmt(r))} (förkortat)` : ''}`];
      return { ask: 'Beräkna. Svara i enklaste form.', prompt: `${F(a, n)} + ${F(b, n)}`, answer: r, simplest: true,
        traps: [[new Q(a + b, 2 * n), `Nämnaren ändras inte när nämnarna redan är lika. Addera bara täljarna.`]],
        hint: 'När nämnarna är lika adderar du bara täljarna. Nämnaren behålls.', steps };
    } },
    { key: 'frac-intplus', levels: [1, 2], make(L) {
      const w = ri(1, 5), [a, b] = coprime(8), plus = L === 1 || chance(0.5);
      const r = plus ? Q.of(w).add(new Q(a, b)) : Q.of(w).sub(new Q(a, b));
      return { ask: 'Beräkna', prompt: `${w} ${plus ? '+' : '−'} ${F(a, b)}`, answer: r, fa: 'mixed', simplest: true,
        traps: [[new Q(plus ? w + a : w - a, b), `Heltalet ${w} är ${F(w * b, b)}, inte ${F(w, b)}. Skriv om heltalet som ett bråk först.`]],
        hint: `Skriv ${w} som ett bråk med nämnaren ${b}: ${w} = ${F(w * b, b)}.`,
        steps: [`${w} = ${F(w * b, b)}`, `${F(w * b, b)} ${plus ? '+' : '−'} ${F(a, b)} = ${F(plus ? w * b + a : w * b - a, b)}`, `I blandad form: ${B(fmtM(r))}`] };
    } },
    { key: 'frac-mul', levels: [1, 2], make() {
      const [a, b] = coprime(6), [c, d] = coprime(6), r = new Q(a * c, b * d);
      const traps = [[new Q(a * c, d), `Multiplicera både täljarna och nämnarna.`], [new Q(a * c, b), `Multiplicera både täljarna och nämnarna.`]];
      if (b === d) traps.push([new Q(a * c, b), `Vid multiplikation behåller du inte nämnaren. Gör nämnare · nämnare.`]);
      return { ask: 'Beräkna. Svara i enklaste form.', prompt: `${F(a, b)} · ${F(c, d)}`, answer: r, simplest: true, traps,
        hint: 'Täljare gånger täljare, nämnare gånger nämnare.',
        steps: [`Täljare: ${a} · ${c} = ${a * c}`, `Nämnare: ${b} · ${d} = ${b * d}`, `${F(a * c, b * d)}${r.d !== b * d ? ` = ${B(fmt(r))} (förkortat)` : ''}`] };
    } },
    { key: 'frac-adddiff', levels: [2], make() {
      let a, b, c, d; do { [a, b] = coprime(8); [c, d] = coprime(8); } while (b === d);
      const op = chance(0.5) || new Q(a, b).cmp(new Q(c, d)) <= 0 ? '+' : '−';
      const r = op === '+' ? new Q(a, b).add(new Q(c, d)) : new Q(a, b).sub(new Q(c, d));
      return { ask: 'Beräkna. Svara i enklaste form.', prompt: `${F(a, b)} ${op} ${F(c, d)}`, answer: r, simplest: true,
        traps: [[new Q(op === '+' ? a + c : a - c, b + d), `Du ${op === '+' ? 'adderade' : 'subtraherade'} nämnarna. Gör först lika nämnare, sedan räknar du bara med täljarna.`]],
        hint: `Hitta en gemensam nämnare. Prova ${lcm(b, d)}.`, steps: commonSteps(a, b, c, d, op) };
    } },
    { key: 'frac-intmul', levels: [2], make() {
      const w = ri(2, 6), [a, b] = coprime(9), r = new Q(w * a, b);
      return { ask: 'Beräkna. Svara i enklaste form.', prompt: chance(0.5) ? `${w} · ${F(a, b)}` : `${F(a, b)} · ${w}`, answer: r, simplest: true, fa: 'frac',
        traps: [[new Q(w * a, w * b), `Skriv heltalet som ${F(w, 1)}. Nämnaren ska inte multipliceras med ${w}.`], [new Q(a, w * b), `Multiplicera täljaren med ${w}, inte nämnaren.`]],
        hint: `Skriv ${w} som ${F(w, 1)} och multiplicera.`,
        steps: [`${w} = ${F(w, 1)}`, `${F(w, 1)} · ${F(a, b)} = ${F(w * a, b)}`, r.d !== b ? `Förkorta: ${B(fmt(r))}` : `Svar: ${B(fmt(r))}${r.n > r.d ? ` (= ${fmtM(r)})` : ''}`] };
    } },
    { key: 'frac-div', levels: [2], make() {
      const [a, b] = coprime(8), [c, d] = coprime(8), r = new Q(a * d, b * c);
      const traps = [[new Q(a * c, b * d), `Vid division vänder du på det andra bråket och multiplicerar.`]];
      if (!new Q(b * c, a * d).eq(r)) traps.push([new Q(b * c, a * d), `Det är det andra bråket, det du delar med, som ska vändas.`]);
      return { ask: 'Beräkna. Svara i enklaste form.', prompt: `${F(a, b)} / ${F(c, d)}`, answer: r, simplest: true, traps,
        hint: `Att dela med ${F(c, d)} är samma sak som att multiplicera med ${F(d, c)}.`,
        steps: [`Vänd på det andra bråket: ${F(c, d)} → ${F(d, c)}`, `${F(a, b)} · ${F(d, c)} = ${F(a * d, b * c)}`, r.d !== b * c ? `Förkorta: ${B(fmt(r))}` : `Svar: ${B(fmt(r))}`] };
    } },
    { key: 'frac-divint', levels: [2], make() {
      const b = ri(2, 6), w = ri(2, 5), r = new Q(1, b * w), who = pick(['Hjalmar', 'Julia', 'Nadir', 'Ulla', 'Lennart']);
      return { ask: `${who} har ett ${F(1, b)} m långt rep och klipper det i ${w} lika stora bitar. Hur långa blir bitarna?`, prompt: `${F(1, b)} / ${w}`, answer: r, unit: 'm', simplest: true,
        traps: [[new Q(w, b), `Bitarna blir kortare än hela repet! Du ska dela, inte multiplicera.`], [new Q(1, b + w), `Att dela med ${w} = multiplicera med ${F(1, w)}. Nämnarna multipliceras.`]],
        hint: `Att dela med ${w} är samma sak som att multiplicera med ${F(1, w)}.`,
        steps: [`${F(1, b)} / ${w} = ${F(1, b)} · ${F(1, w)}`, `= ${F(1, b * w)}`, `Varje bit är ${B(fmt(r))} m.`] };
    } },
    { key: 'frac-intdiv', levels: [3], make() {
      const w = ri(2, 6), [a, b] = coprime(9), r = new Q(w * b, a);
      return { ask: 'Beräkna. Svara i enklaste form.', prompt: `${w} / ${F(a, b)}`, answer: r, simplest: true,
        traps: [[new Q(w * a, b), `Vid division med ett bråk vänder du på bråket och multiplicerar.`]],
        hint: `${w} / ${F(a, b)} = ${w} · ${F(b, a)}`,
        steps: [`Skriv ${w} som ${F(w, 1)}`, `${F(w, 1)} · ${F(b, a)} = ${F(w * b, a)}`, `Svar: ${B(fmt(r))}${!r.isInt && r.n > r.d ? ` (= ${fmtM(r)})` : ''}`] };
    } },
    { key: 'frac-neg', levels: [3], make() {
      let a, b, c, d; do { [a, b] = coprime(9); [c, d] = coprime(9); } while (b === d);
      const minusNeg = chance(0.5), A = new Q(-a, b), C = new Q(c, d);
      const r = minusNeg ? A.add(C) : A.sub(C);
      const prompt = minusNeg ? `${F(-a, b)} − (${F(-c, d)})` : `${F(-a, b)} − ${F(c, d)}`;
      const L = lcm(b, d);
      return { ask: 'Beräkna. Svara i enklaste form.', prompt, answer: r, simplest: true,
        traps: [[minusNeg ? A.sub(C) : A.add(C), minusNeg ? `Minus ett negativt tal blir plus.` : `Båda delarna drar åt minus-hållet.`]],
        hint: minusNeg ? `− (${F(-c, d)}) blir + ${F(c, d)}. Gör sedan lika nämnare (${L}).` : `Gör lika nämnare (${L}). Båda talen är negativa åt samma håll.`,
        steps: [minusNeg ? `${prompt} = ${F(-a, b)} + ${F(c, d)}` : `Båda delarna är negativa.`, `Gemensam nämnare ${L}: ${F(-a * (L / b), L)} ${minusNeg ? '+' : '−'} ${F(c * (L / d), L)}`, `= ${F(minusNeg ? -a * (L / b) + c * (L / d) : -a * (L / b) - c * (L / d), L)}`, `Svar: ${B(fmt(r))}`] };
    } },
    { key: 'frac-biggerthan', levels: [3], make() {
      let p, q; do { [p, q] = coprime(13); } while (q < 7);
      const t = new Q(p, q); const big = [], small = [];
      for (let i = 0; i < 200 && (big.length < 1 || small.length < 3); i++) {
        const [a, b] = coprime(16), f = new Q(a, b);
        if (f.eq(t) || [...big, ...small].some(x => x.eq(f))) continue;
        if (f.cmp(t) > 0 && big.length < 1 && f.cmp(t.add(new Q(1, 4))) < 0) big.push(f);
        else if (f.cmp(t) < 0 && small.length < 3 && f.cmp(t.sub(new Q(1, 4))) > 0) small.push(f);
      }
      if (big.length < 1 || small.length < 3) return fracs[0].make(1);
      const msg = `Jämför med en halv, eller förläng så att bråken får samma nämnare.`;
      return { ask: `Vilket av talen är större än ${F(p, q)}?`, prompt: F(p, q), mode: 'choice', answer: big[0],
        choices: shuffle([{ html: fmt(big[0]), correct: true }, ...small.map(s => ({ html: fmt(s), correct: false, msg }))]),
        hint: `${F(p, q)} är ungefär ${String(Math.round((p / q) * 100) / 100).replace('.', ',')}. Uppskatta varje bråk.`,
        steps: [`${F(p, q)} ≈ ${String(Math.round((p / q) * 100) / 100).replace('.', ',')}`, ...[...big, ...small].map(f => `${fmt(f)} ≈ ${String(Math.round(f * 100) / 100).replace('.', ',')}`), `Bara ${B(fmt(big[0]))} är större.`] };
    } },
  ];

  // ───────────── Decimaltal ─────────────
  const D = q => fmtD(q);
  const decs = [
    { key: 'dec-add', levels: [1], make() {
      const a = new Q(ri(11, 199), 10), b = new Q(ri(11, 99), 100), r = a.add(b);
      return { ask: 'Beräkna', prompt: `${D(a)} + ${D(b)}`, answer: r, fa: 'dec',
        traps: [[a.add(b.mul(10)), `Ställ upp talen så att decimaltecknen hamnar under varandra.`]],
        hint: `Skriv ${D(a)} som ${D(a)}0 så att båda har två decimaler.`,
        steps: [`${D(a)}0 + ${D(b)}`, `Räkna som vanligt, komma under komma.`, `= ${B(D(r))}`] };
    } },
    { key: 'dec-sub', levels: [1, 3], make(L) {
      const a = new Q(ri(201, 699), 10), b = new Q(ri(11, 99), 100), flip = L === 3;
      const r = flip ? b.sub(a) : a.sub(b);
      return { ask: 'Beräkna', prompt: flip ? `${D(b)} − ${D(a)}` : `${D(a)} − ${D(b)}`, answer: r, fa: 'dec',
        traps: flip ? [[r.neg(), `Du drar bort ett större tal från ett mindre, så svaret blir negativt.`]] : [[a.sub(b.mul(10)), `Ställ upp talen så att decimaltecknen hamnar under varandra.`]],
        hint: flip ? `Räkna ${D(a)} − ${D(b)} och sätt ett minus framför svaret.` : `Skriv ${D(a)} som ${D(a)}0.`,
        steps: flip ? [`${D(b)} är mindre än ${D(a)}, så svaret blir negativt.`, `${D(a)}0 − ${D(b)} = ${D(r.neg())}`, `Svar: ${B(D(r))}`] : [`${D(a)}0 − ${D(b)}`, `= ${B(D(r))}`] };
    } },
    { key: 'dec-mulint', levels: [1], make() {
      const xi = ri(11, 99), k = ri(2, 9), x = new Q(xi, 100), r = x.mul(k);
      return { ask: 'Beräkna', prompt: `${D(x)} · ${k}`, answer: r, fa: 'dec',
        traps: [[new Q(xi * k, 10), `${D(x)} har två decimaler, då ska svaret också ha två.`], [Q.of(xi * k), `Glöm inte att sätta tillbaka decimalerna.`]],
        hint: `Räkna ${xi} · ${k} och sätt sedan tillbaka två decimaler.`,
        steps: [`${xi} · ${k} = ${xi * k}`, `${D(x)} har två decimaler → ${B(D(r))}`] };
    } },
    { key: 'dec-muldec', levels: [2], make() {
      const a = ri(2, 9), b = ri(2, 9), r = new Q(a * b, 100);
      return { ask: 'Beräkna', prompt: `${D(new Q(a, 10))} · ${D(new Q(b, 10))}`, answer: r, fa: 'dec',
        traps: [[new Q(a * b, 10), `Räkna decimaler: båda talen har en decimal var, så svaret ska ha två.`], [new Q(a * b, 1000), `Båda talen har en decimal var. 1 + 1 = 2 decimaler i svaret.`]],
        hint: `Skriv som bråk: ${F(a, 10)} · ${F(b, 10)}`,
        steps: [`${D(new Q(a, 10))} · ${D(new Q(b, 10))} = ${F(a, 10)} · ${F(b, 10)}`, `= ${F(a * b, 100)}`, `= ${B(D(r))}`] };
    } },
    { key: 'dec-divdec', levels: [2], make() {
      const t = ri(2, 9), q0 = ri(2, 9), N = q0 * t * 10, r = Q.of(q0 * 100);
      return { ask: 'Beräkna', prompt: frac(N, D(new Q(t, 10))), answer: r,
        traps: [[Q.of(q0 * 10), `Förläng både täljare och nämnare med 10 så att nämnaren blir ett heltal.`], [Q.of(q0), `Att dela med ett tal mindre än 1 gör svaret större.`]],
        hint: `Förläng med 10: ${frac(N + ' · 10', D(new Q(t, 10)) + ' · 10')}`,
        steps: [`Förläng med 10: ${frac(N * 10, t)}`, `${N * 10} / ${t} = ${B(int(q0 * 100))}`] };
    } },
    { key: 'dec-divint', levels: [2], make() {
      const k = ri(2, 9), q0 = ri(2, 9), num = new Q(k * q0, 100), r = new Q(q0, 100);
      return { ask: 'Beräkna', prompt: frac(D(num), k), answer: r, fa: 'dec',
        traps: [[new Q(q0, 10), `${D(num)} är hundradelar. Svaret blir också hundradelar.`]],
        hint: `Tänk ${k * q0} hundradelar delat med ${k}.`,
        steps: [`${D(num)} = ${k * q0} hundradelar`, `${k * q0} / ${k} = ${q0} hundradelar`, `= ${B(D(r))}`] };
    } },
    { key: 'dec-divsmall', levels: [3], make() {
      const a = ri(2, 9), b = ri(2, 9), num = new Q(a * b, 1000), den = new Q(b, 100), r = new Q(a, 10);
      return { ask: 'Beräkna', prompt: frac(D(num), D(den)), answer: r, fa: 'dec',
        traps: [[new Q(a, 100), `Förläng båda med 100 så att nämnaren blir ett heltal.`], [Q.of(a), `Förläng båda med 100: täljaren blir ${D(num.mul(100))}.`]],
        hint: `Förläng med 100 så att nämnaren blir ${b}.`,
        steps: [`Förläng med 100: ${frac(D(num.mul(100)), b)}`, `${D(num.mul(100))} / ${b} = ${B(D(r))}`] };
    } },
    { key: 'dec-round', levels: [2], make() {
      let n, d; do { d = pick([3, 6, 7, 9, 11, 12]); n = ri(1, d - 1); } while (gcd(n, d) !== 1);
      const k = pick([1, 2]), p = 10 ** k, rounded = Math.round((n * p) / d), trunc = Math.floor((n * p) / d);
      const digits = String(Math.floor((n * 1e5) / d)).padStart(5, '0');
      const shown = `0,${digits}…`, r = new Q(rounded, p);
      const traps = [];
      if (rounded !== trunc) traps.push([new Q(trunc, p), `Titta på siffran efter: 5–9 avrundas uppåt.`]);
      const other = k === 1 ? new Q(Math.round((n * 100) / d), 100) : new Q(Math.round((n * 10) / d), 10);
      if (!other.eq(r)) traps.push([other, k === 1 ? `Tiondel betyder en decimal.` : `Hundradel betyder två decimaler.`]);
      const next = digits[k];
      return { ask: `Avrunda till närmaste ${k === 1 ? 'tiondel' : 'hundradel'}.`, prompt: `${F(n, d)} = ${shown}`, answer: r, fa: 'dec', traps,
        hint: `${k === 1 ? 'Tiondel = en decimal' : 'Hundradel = två decimaler'}. Titta på siffran efter.`,
        steps: [`Behåll ${k} decimal${k > 1 ? 'er' : ''}: 0,${digits.slice(0, k)}`, `Nästa siffra är ${next}: ${+next >= 5 ? 'avrunda uppåt' : 'avrunda nedåt'}.`, `Svar: ${B(D(r))}`] };
    } },
  ];

  // ───────────── Tid ─────────────
  const tid = [
    { key: 'tid-h2min', levels: [1, 2], make(L) {
      const h = L === 1 && chance(0.4) ? pick([new Q(1, 4), new Q(1, 2), new Q(3, 4)]) : new Q(L === 1 ? ri(1, 9) : ri(11, 29), 10);
      const r = h.mul(60);
      return { ask: 'Byt till minuter', prompt: `${D(h)} h`, answer: r, unit: 'min', fa: 'dec',
        traps: [[h.mul(100), `1 timme är 60 minuter, inte 100.`]],
        hint: `1 h = 60 min. Räkna ${D(h)} · 60.`,
        steps: [`1 h = 60 min`, `${D(h)} · 60 = ${D(r)}`, `${D(h)} h = ${B(D(r) + ' min')}`] };
    } },
    { key: 'tid-min2h', levels: [1, 2], make(L) {
      const m = L === 1 && chance(0.4) ? pick([15, 30, 45]) : 6 * ri(1, 9), r = new Q(m, 60);
      return { ask: 'Byt till timmar', prompt: `${m} min`, answer: r, unit: 'h', fa: 'dec',
        traps: [[new Q(m, 100), `Dela med 60, inte 100. En timme har 60 minuter.`]],
        hint: `Dela med 60: ${frac(m, 60)}`,
        steps: [`${m} min = ${frac(m, 60)} h`, `= ${F(r.n, r.d)} h`, `= ${B(D(r) + ' h')}`] };
    } },
    { key: 'tid-s2min', levels: [2], make() {
      const s = 6 * ri(1, 9), r = new Q(s, 60);
      return { ask: 'Byt till minuter', prompt: `${s} s`, answer: r, unit: 'min', fa: 'dec',
        traps: [[new Q(s, 100), `En minut har 60 sekunder. Dela med 60.`]],
        hint: `När du byter till en större enhet blir talet mindre. Dela med 60.`,
        steps: [`${s} s = ${frac(s, 60)} min`, `= ${B(D(r) + ' min')}`] };
    } },
    { key: 'tid-hmin', levels: [2], make() {
      const w = ri(1, 3), t = ri(1, 9), m = 6 * t, h = new Q(10 * w + t, 10);
      const msg = `0,${t} h är inte ${t * 10} min. Räkna 0,${t} · 60 = ${m} min.`;
      const opts = [{ html: `${w} h ${m} min`, correct: true }, { html: `${w} h ${t * 10} min`, correct: false, msg }, { html: `${w} h ${t} min`, correct: false, msg }];
      if (m !== 60 - m && t * 10 !== 60 - m && t !== 60 - m) opts.push({ html: `${w} h ${60 - m} min`, correct: false, msg });
      return { ask: 'Skriv i timmar och minuter', prompt: `${D(h)} h`, mode: 'choice', answer: h, choices: shuffle(opts),
        hint: `Hela timmar: ${w}. Resten: 0,${t} h · 60 = ? min`,
        steps: [`Hela timmar: ${w} h`, `0,${t} h · 60 = ${m} min`, `Svar: ${B(`${w} h ${m} min`)}`] };
    } },
    { key: 'tid-min2hmin', levels: [2], make() {
      const m = ri(70, 290), h = Math.floor(m / 60), rest = m % 60;
      const wrong = { html: `${Math.floor(m / 100)} h ${m % 100} min`, correct: false, msg: `1 h = 60 min, inte 100. Räkna hur många hela 60 som får plats i ${m}.` };
      const opts = [{ html: `${h} h ${rest} min`, correct: true }, { html: `${h + 1} h ${(rest + 20) % 60} min`, correct: false, msg: wrong.msg }, { html: `${h} h ${(rest + 30) % 60} min`, correct: false, msg: wrong.msg }];
      if (wrong.html !== opts[0].html && m % 100 < 100) opts.push(wrong);
      const uniq = opts.filter((o, i) => opts.findIndex(p => p.html === o.html) === i);
      return { ask: 'Skriv i timmar och minuter', prompt: `${m} min`, mode: 'choice', answer: Q.of(m), choices: shuffle(uniq),
        hint: `Hur många gånger får 60 plats i ${m}?`,
        steps: [`${h} · 60 = ${h * 60}`, `${m} − ${h * 60} = ${rest}`, `Svar: ${B(`${h} h ${rest} min`)}`] };
    } },
    { key: 'tid-zone', levels: [3], make() {
      const [city, home, diff] = pick([['New York', 'London', 5], ['Tokyo', 'Stockholm', 8], ['Dubai', 'Stockholm', 3], ['Los Angeles', 'Stockholm', 9]]);
      const after = city === 'New York' || city === 'Los Angeles';
      const t = ri(6, 22), r = ((t + (after ? -diff : diff)) % 24 + 24) % 24, wrongT = ((t + (after ? diff : -diff)) % 24 + 24) % 24;
      const c = h => `${String(h).padStart(2, '0')}.00`;
      const msg = `Ligger staden ${after ? 'efter' : 'före'}? Då ${after ? 'drar du bort' : 'lägger du till'} timmar.`;
      const opts = [{ html: c(r), correct: true }, { html: c(wrongT), correct: false, msg }, { html: c((r + 1) % 24), correct: false, msg }, { html: c((r + 23) % 24), correct: false, msg }];
      return { ask: `${city} ligger ${diff} timmar ${after ? 'efter' : 'före'} ${home}. När klockan är ${c(t)} i ${home}, vad är klockan i ${city}?`, prompt: `${c(t)} → ?`, mode: 'choice', answer: Q.of(r),
        choices: shuffle(opts.filter((o, i) => opts.findIndex(p => p.html === o.html) === i)),
        hint: after ? `Efter = tidigare på dagen. Dra bort ${diff} h.` : `Före = senare på dagen. Lägg till ${diff} h.`,
        steps: [`${city} ligger ${diff} h ${after ? 'efter' : 'före'}.`, `${c(t)} ${after ? '−' : '+'} ${diff} h`, `= ${B(c(r))}`] };
    } },
  ];

  // ───────────── Ekvationer ─────────────
  const eq = [
    { key: 'x-add', levels: [1], make() {
      const a = ri(2, 9), r = nz(-12, 6), b = a + r;
      return { ask: `Vilket tal är ${X}?`, prompt: `${a} + ${X} = ${int(b)}`, answer: Q.of(r),
        traps: [[b + a, `Dra bort ${a} från båda sidor: ${X} = ${int(b)} − ${a}.`], [-r, `Kolla genom att sätta in ditt svar: ${a} + ${pn(-r)} blir inte ${int(b)}.`]],
        hint: `Vilket tal ska läggas till ${a} för att få ${int(b)}?`,
        steps: [`Dra bort ${a} på båda sidor.`, `${X} = ${int(b)} − ${a} = ${B(int(r))}`, `Kontroll: ${a} + ${pn(r)} = ${int(b)} ✓`] };
    } },
    { key: 'x-sub', levels: [2], make() {
      const a = ri(2, 9), b = ri(a + 1, a + 9), r = a - b;
      return { ask: `Vilket tal är ${X}?`, prompt: `${a} − ${X} = ${b}`, answer: Q.of(r),
        traps: [[-r, `Sätt in och kontrollera: ${a} − ${-r} = ${a + r}, inte ${b}.`]],
        hint: `${b} är större än ${a}. Då måste ${X} vara negativt (minus minus blir plus).`,
        steps: [`${a} − ${X} = ${b} betyder ${X} = ${a} − ${b}`, `${X} = ${B(int(r))}`, `Kontroll: ${a} − (${int(r)}) = ${a} + ${-r} = ${b} ✓`] };
    } },
    { key: 'x-mul', levels: [2], make() {
      const k = nz(-6, 6), r = nz(-9, 9); if (Math.abs(k) < 2) return eq[2].make();
      const b = k * r;
      return { ask: `Vilket tal är ${X}?`, prompt: `${pn(k)} · ${X} = ${int(b)}`, answer: Q.of(r),
        traps: [[-r, `Kolla tecknet: ${pn(k)} · ${pn(-r)} = ${int(-b)}.`], [b - k, `${pn(k)} · ${X} betyder gånger. Dela med ${pn(k)}.`]],
        hint: `Dela båda sidor med ${pn(k)}.`,
        steps: [`${X} = ${frac(int(b), int(k))}`, `${X} = ${B(int(r))}`, `Kontroll: ${pn(k)} · ${pn(r)} = ${int(b)} ✓`] };
    } },
    { key: 'x-div', levels: [3], make() {
      const k = nz(-9, 9), b = nz(-9, 9); if (Math.abs(k) < 2) return eq[3].make();
      const r = k * b;
      return { ask: `Vilket tal är ${X}?`, prompt: `${frac(X, int(k))} = ${int(b)}`, answer: Q.of(r),
        traps: [[-r, `Kolla tecknet: ${pn(-r)} / ${pn(k)} blir ${int(-b)}.`], [new Q(b, k), `Multiplicera båda sidor med ${pn(k)}, dela inte.`]],
        hint: `Multiplicera båda sidor med ${pn(k)}.`,
        steps: [`${X} = ${int(b)} · ${pn(k)}`, `${X} = ${B(int(r))}`, `Kontroll: ${frac(int(r), int(k))} = ${int(b)} ✓`] };
    } },
    { key: 'x-den', levels: [3], make() {
      const r = nz(-6, 6), b = nz(-6, 6), k = b * r;
      return { ask: `Vilket tal är ${X}?`, prompt: `${frac(int(k), X)} = ${int(b)}`, answer: Q.of(r),
        traps: [[-r, `Kolla tecknet: ${frac(int(k), int(-r))} = ${int(-b)}.`]],
        hint: `Vilket tal ska ${int(k)} delas med för att bli ${int(b)}?`,
        steps: [`${X} = ${frac(int(k), int(b))}`, `${X} = ${B(int(r))}`, `Kontroll: ${frac(int(k), pn(r))} = ${int(b)} ✓`] };
    } },
    { key: 'x-both', levels: [3], make() {
      if (chance(0.5)) {
        const k = ri(2, 5), r = nz(-8, -1), left = k * r, a = nz(-9, -1), c = left - a;
        return { ask: `Vilket tal är ${X}?`, prompt: `${int(a)} + (${int(c)}) = ${X} · ${k}`, answer: Q.of(r),
          traps: [[-r, `Vänsterledet blir negativt, alltså blir ${X} också negativt.`]],
          hint: `Räkna ut vänsterledet först.`,
          steps: [`Vänsterled: ${int(a)} + (${int(c)}) = ${int(left)}`, `${int(left)} = ${X} · ${k}`, `${X} = ${frac(int(left), k)} = ${B(int(r))}`] };
      }
      const a = nz(-9, -1), b = ri(2, 12), c = nz(-5, 9), left = a + b, r = left - c;
      return { ask: `Vilket tal är ${X}?`, prompt: `${int(a)} − (${M}${b}) = ${X} ${c < 0 ? '−' : '+'} ${Math.abs(c)}`, answer: Q.of(r),
        traps: [[a - b - c, `Minus ett negativt tal blir plus: ${int(a)} − (${M}${b}) = ${int(a)} + ${b}.`]],
        hint: `Räkna ut vänsterledet först. Minus minus blir plus.`,
        steps: [`Vänsterled: ${int(a)} + ${b} = ${int(left)}`, `${int(left)} = ${X} ${c < 0 ? '−' : '+'} ${Math.abs(c)}`, `${X} = ${int(left)} ${c < 0 ? '+' : '−'} ${Math.abs(c)} = ${B(int(r))}`] };
    } },
  ];

  // ───────────── Tallinjen ─────────────
  const lineIntSpec = () => {
    const start = -ri(4, 8), ticks = 13, labels = [];
    for (let i = 0; i < ticks; i++) if ((start + i) % 5 === 0) labels.push(i);
    return { start, ticks, labels, step: 1 };
  };
  const line = [
    { key: 'line-read', levels: [1], make() {
      const s = lineIntSpec(); let m; do m = ri(0, s.ticks - 1); while (s.labels.includes(m) || s.start + m === 0);
      const v = s.start + m;
      return { ask: 'Vilket tal är markerat?', prompt: numberLine({ ...s, marks: [{ tick: m, label: 'A' }] }), answer: Q.of(v), wide: true,
        traps: [[-v, `Tal till vänster om 0 är negativa, tal till höger är positiva.`], [v + 1, `Räkna strecken noggrant från ett tal du vet.`], [v - 1, `Räkna strecken noggrant från ett tal du vet.`]],
        hint: `Varje streck är 1 steg. Utgå från 0 och räkna strecken.`,
        steps: [`Varje streck är 1.`, `A ligger ${Math.abs(v)} steg ${v < 0 ? 'till vänster' : 'till höger'} om 0.`, `A = ${B(int(v))}`] };
    } },
    { key: 'line-place', levels: [1, 2], make(L) {
      if (L === 1) {
        const s = lineIntSpec(); let m; do m = ri(0, s.ticks - 1); while (s.labels.includes(m) || s.start + m >= 0);
        const v = s.start + m, mirror = -v - s.start;
        return { ask: `Tryck där ${int(v)} ligger på tallinjen.`, prompt: '', mode: 'place', answer: Q.of(v), wide: true,
          place: { spec: s, tick: m, traps: mirror >= 0 && mirror < s.ticks ? [[mirror, `Negativa tal ligger till vänster om 0.`]] : [] },
          hint: `${int(v)} är negativt, så det ligger till vänster om 0.`,
          steps: [`${int(v)} är ${Math.abs(v)} steg till vänster om 0.`, `Det är strecket vid ${B(int(v))}.`] };
      }
      const k = pick([2, 4]), units = k === 2 ? 6 : 4, start = -units / 2, ticks = units * k + 1, step = new Q(1, k), labels = [];
      for (let i = 0; i < ticks; i += k) labels.push(i);
      let m; do m = ri(0, ticks - 1); while (m % k === 0 || start * k + m >= 0);
      const v = Q.of(start).add(step.mul(m));
      return { ask: `Tryck där ${fmtD(v)} ligger på tallinjen.`, prompt: '', mode: 'place', answer: v, wide: true,
        place: { spec: { start, step, ticks, labels }, tick: m, traps: [] },
        hint: `Mellan två heltal finns ${k} steg. Varje steg är ${fmtD(step)}.`,
        steps: [`Varje litet streck är ${fmtD(step)}.`, `${fmtD(v)} ligger mellan ${int(Math.floor(v))} och ${int(Math.ceil(v))}.`, `Räkna från ${int(Math.ceil(v))} åt vänster: ${B(fmtD(v))}`] };
    } },
    { key: 'line-frac', levels: [2], make() {
      const k = pick([2, 4, 5]), start = -1, ticks = 2 * k + 1, step = new Q(1, k), labels = [0, k, 2 * k];
      let m; do m = ri(1, ticks - 2); while (m % k === 0);
      const v = Q.of(start).add(step.mul(m));
      return { ask: 'Vilket tal är markerat? Svara i bråk- eller decimalform.', prompt: numberLine({ start, step, ticks, labels, marks: [{ tick: m, label: 'B' }] }), answer: v, fa: 'dec', wide: true,
        traps: [[Q.of(m - k), `Varje litet streck är inte 1. Mellan två heltal finns ${k} steg, så varje steg är ${fmt(step)}.`], [v.neg(), `Tal till vänster om 0 är negativa.`]],
        hint: `Mellan ${M}1 och 0 finns ${k} steg. Varje steg är ${fmt(step)}.`,
        steps: [`Mellan två heltal finns ${k} steg → ett steg = ${fmt(step)} = ${fmtD(step)}`, `B ligger ${Math.abs(m - k)} steg ${m < k ? 'till vänster' : 'till höger'} om 0.`, `B = ${B(fmtD(v))}${v.toDec() ? ` (= ${fmt(v)})` : ''}`] };
    } },
    { key: 'line-odd', levels: [3], make() {
      const k = pick([3, 4, 6, 7]); let diff; do diff = ri(5, 30); while (diff % k === 0);
      const v1 = ri(-25, 10), i1 = 2, i2 = i1 + k, ticks = i2 + 3, step = new Q(diff, k), start = Q.of(v1).sub(step.mul(i1));
      let m; do m = ri(0, ticks - 1); while (m === i1 || m === i2);
      const v = start.add(step.mul(m));
      return { ask: 'Vilket tal är markerat? Svara i bråkform eller blandad form.', prompt: numberLine({ start, step, ticks, labels: [i1, i2], marks: [{ tick: m, label: 'C' }] }), answer: v, fa: 'mixed', wide: true,
        hint: `Från ${int(v1)} till ${int(v1 + diff)} är det ${diff}. Hur många steg är det mellan dem?`,
        steps: [`Avståndet mellan ${int(v1)} och ${int(v1 + diff)} är ${diff}.`, `Det är ${k} steg, så ett steg = ${F(diff, k)}.`, `C ligger ${Math.abs(m - i1)} steg ${m < i1 ? 'till vänster' : 'till höger'} om ${int(v1)}.`, `C = ${int(v1)} ${m < i1 ? '−' : '+'} ${Math.abs(m - i1)} · ${F(diff, k)} = ${B(fmtM(v))}`] };
    } },
  ];

  // ───────────── Textuppgifter ─────────────
  const DAYS = ['M', 'T', 'O', 'T', 'F', 'L', 'S'];
  const tempTable = t => `<table class="tbl"><tr>${DAYS.map(d => `<th>${d}</th>`).join('')}</tr><tr>${t.map(v => `<td>${int(v)}</td>`).join('')}</tr></table>`;
  const text = [
    { key: 'text-temp', levels: [1, 2], make(L) {
      let t; do t = Array.from({ length: 7 }, () => ri(-7, 8)); while (Math.min(...t) >= 0 || Math.max(...t) <= 0);
      const hi = Math.max(...t), lo = Math.min(...t), table = tempTable(t), intro = 'Tabellen visar temperaturen (°C) samma tid varje dag en vecka i mars.';
      if (L === 1) {
        const askHi = chance(0.5), r = askHi ? hi : lo, sorted = [...new Set(t)].sort((a, b) => a - b);
        const near = askHi ? sorted[sorted.length - 2] : sorted[1];
        return { ask: `${intro} Vilken är den ${askHi ? 'högsta' : 'lägsta'} temperaturen?`, prompt: table, answer: Q.of(r), unit: '°C', wide: true,
          traps: askHi
            ? [[lo, `Det där är den lägsta. Leta efter det största talet.`], [near, `Det finns ett högre tal i tabellen.`]]
            : [[near, `Ju större minustal, desto kallare. ${int(lo)} är ännu kallare.`], [hi, `Det där är den högsta. Lägst är det minustal som ligger längst till vänster på tallinjen.`], [-lo, `${-lo} är plusgrader. Lägst är ${int(lo)}.`]],
          hint: askHi ? 'Leta efter det största talet.' : 'Det lägsta är det minustal som ligger längst till vänster på tallinjen.',
          steps: [`Talen: ${t.map(int).join(', ')}`, `${askHi ? 'Högst' : 'Lägst'}: ${B(int(r) + ' °C')}`] };
      }
      const r = hi - lo;
      return { ask: `${intro} Hur stor är skillnaden mellan den högsta och den lägsta temperaturen?`, prompt: table, answer: Q.of(r), unit: '°C', wide: true,
        traps: [[hi + lo, `Skillnaden = högsta − lägsta = ${hi} − (${int(lo)}). Minus minus blir plus!`]],
        hint: `Skillnad = högsta − lägsta. Tänk på tallinjen: hur många steg är det mellan ${int(lo)} och ${hi}?`,
        steps: [`Högst: ${hi}, lägst: ${int(lo)}`, `${hi} − (${int(lo)}) = ${hi} + ${-lo}`, `= ${B(r + ' °C')}`] };
    } },
    { key: 'text-quiz', levels: [2], make() {
      const right = ri(2, 8), wrong = 10 - right, p = pick([2, 3, 4]), m = pick([1, 2]), r = p * right - m * wrong;
      return { ask: `I ett quiz med 10 frågor får man ${p} poäng för varje rätt svar och ${M}${m} för varje fel. Ett lag hade ${right} rätt och ${wrong} fel. Hur många poäng fick laget?`, prompt: `${right} rätt, ${wrong} fel`, answer: Q.of(r), unit: 'p',
        traps: [[p * right, `Glöm inte minuspoängen för felen.`], [p * right + m * wrong, `Fel ger ${M}${m}, alltså ska de poängen dras bort.`]],
        hint: `Räkna ${right} · ${p} och ${wrong} · (${M}${m}) och lägg ihop.`,
        steps: [`Rätt: ${right} · ${p} = ${p * right}`, `Fel: ${wrong} · (${M}${m}) = ${int(-m * wrong)}`, `${p * right} + (${int(-m * wrong)}) = ${B(int(r))}`] };
    } },
    { key: 'text-tea', levels: [2], make() {
      const rate = ri(2, 5), mins = ri(2, 6), t1 = ri(70, 95), t2 = t1 - rate * mins, d = t2 - t1;
      return { ask: `Lennart häller upp te som är ${t1} °C. Efter ${mins} minuter är det ${t2} °C. Hur många grader ändras temperaturen per minut? (Tänk på tecknet!)`, prompt: frac(`${t2} − ${t1}`, mins), answer: Q.of(-rate), unit: '°C/min',
        traps: [[rate, `Temperaturen sjunker, så ändringen är negativ.`]],
        hint: `Ändring = ny − gammal. Dela sedan med antal minuter.`,
        steps: [`Ändring: ${t2} − ${t1} = ${int(d)}`, `Per minut: ${frac(int(d), mins)} = ${int(-rate)}`, `Teet blir ${rate} grader kallare per minut: ${B(int(-rate))}`] };
    } },
    { key: 'text-tower', levels: [3], make() {
      const h = pick([new Q(5, 4), new Q(3, 2), new Q(5, 2)]), n = ri(6, 16), total = h.mul(n);
      return { ask: `Ulla bygger ett torn av klossar som är ${fmtM(h)} cm höga. Hur många klossar har hon använt när tornet är ${fmtM(total)} cm högt?`, prompt: `${fmtM(total)} / ${fmtM(h)}`, answer: Q.of(n), unit: 'st',
        hint: `Skriv båda i bråkform: ${fmtM(total)} = ${fmt(total)} och ${fmtM(h)} = ${fmt(h)}.`,
        steps: [`${fmtM(total)} = ${fmt(total)}, ${fmtM(h)} = ${fmt(h)}`, `${fmt(total)} / ${fmt(h)} = ${fmt(total)} · ${F(h.d, h.n)}`, `= ${B(n + ' klossar')}`] };
    } },
    { key: 'text-sum', levels: [3], make() {
      const N = pick([19, 29, 49, 99]), r = (N + 1) / 2, pairs = (N - 1) / 2;
      return { ask: 'Beräkna summan', prompt: `1 + (${M}2) + 3 + (${M}4) + … + ${N - 2} + (${M}${N - 1}) + ${N}`, answer: Q.of(r),
        traps: [[-pairs, `Glöm inte det sista talet ${N}, som inte har något par.`]],
        hint: `Para ihop två och två: 1 + (${M}2) = ${M}1, 3 + (${M}4) = ${M}1 …`,
        steps: [`Varje par blir ${M}1: 1 + (${M}2), 3 + (${M}4), …`, `Det finns ${pairs} par → ${int(-pairs)}`, `Plus sista talet: ${int(-pairs)} + ${N} = ${B(r)}`] };
    } },
  ];

  G.SvanteGen = { neg, fracs, decs, tid, eq, line, text };
})(typeof window !== 'undefined' ? window : globalThis);
