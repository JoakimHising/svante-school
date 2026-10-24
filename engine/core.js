// Svante School – kärna: exakta bråktal, formatering, rättning. Körs i både webbläsare och Node (tools/check.mjs).
(function (G) {
  'use strict';

  const M = '−';
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
  const lcm = (a, b) => Math.abs(a * b) / gcd(a, b);

  class Q {
    constructor(n, d = 1) {
      if (!Number.isInteger(n) || !Number.isInteger(d) || d === 0) throw new Error(`Ogiltigt tal ${n}/${d}`);
      if (d < 0) { n = -n; d = -d; }
      const g = gcd(n, d);
      this.n = n / g || 0;
      this.d = d / g;
    }
    static of(x, d = 1) { return x instanceof Q ? x : new Q(x, d); }
    static dec(str) {
      const s = String(str).replace(M, '-').replace(',', '.');
      const m = /^(-?)(\d*)(?:\.(\d*))?$/.exec(s);
      if (!m || (m[2] === '' && !m[3])) return null;
      const fr = m[3] || '';
      const n = parseInt((m[2] || '0') + fr, 10);
      return new Q(m[1] ? -n : n, 10 ** fr.length);
    }
    add(o) { o = Q.of(o); return new Q(this.n * o.d + o.n * this.d, this.d * o.d); }
    sub(o) { o = Q.of(o); return new Q(this.n * o.d - o.n * this.d, this.d * o.d); }
    mul(o) { o = Q.of(o); return new Q(this.n * o.n, this.d * o.d); }
    div(o) { o = Q.of(o); if (o.n === 0) throw new Error('Division med 0'); return new Q(this.n * o.d, this.d * o.n); }
    neg() { return new Q(-this.n, this.d); }
    abs() { return new Q(Math.abs(this.n), this.d); }
    eq(o) { o = Q.of(o); return this.n === o.n && this.d === o.d; }
    cmp(o) { o = Q.of(o); return Math.sign(this.n * o.d - o.n * this.d); }
    get isInt() { return this.d === 1; }
    valueOf() { return this.n / this.d; }
    decDigits() {
      let d = this.d, a = 0, b = 0;
      while (d % 2 === 0) { d /= 2; a++; }
      while (d % 5 === 0) { d /= 5; b++; }
      return d === 1 ? Math.max(a, b) : null;
    }
    toDec() {
      const k = this.decDigits();
      if (k === null) return null;
      const scaled = Math.abs(this.n) * (10 ** k) / this.d;
      let s = String(scaled);
      if (k > 0) { s = s.padStart(k + 1, '0'); s = s.slice(0, -k) + ',' + s.slice(-k); }
      return (this.n < 0 ? M : '') + s;
    }
  }

  const sgn = q => (q.n < 0 ? M : '');
  const frac = (n, d) => `<span class="frac"><span>${n}</span><span>${d}</span></span>`;
  const int = x => (x < 0 ? M + -x : String(x));
  const fmt = q => { q = Q.of(q); return q.isInt ? int(q.n) : sgn(q) + frac(Math.abs(q.n), q.d); };
  const fmtD = q => { q = Q.of(q); return q.toDec() ?? fmt(q); };
  const fmtM = q => {
    q = Q.of(q);
    const a = Math.abs(q.n), w = Math.floor(a / q.d), r = a % q.d;
    if (w === 0 || r === 0) return fmt(q);
    return `${sgn(q)}${w}${frac(r, q.d)}`;
  };
  const txt = q => { q = Q.of(q); return q.toDec() ?? `${sgn(q)}${Math.abs(q.n)}/${q.d}`; };
  const par = (html, neg) => (neg ? `(${html})` : html);
  const pn = x => par(int(x), x < 0);
  const pq = (q, f = fmt) => par(f(q), Q.of(q).n < 0);
  const formatter = name => ({ dec: fmtD, mixed: fmtM, frac: fmt })[name] || fmt;

  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const nz = (a, b) => { let x; do x = ri(a, b); while (x === 0); return x; };
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const chance = p => Math.random() < p;
  const shuffle = arr => { const b = [...arr]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const coprime = maxD => { let n, d; do { d = ri(2, maxD); n = ri(1, d - 1); } while (gcd(n, d) !== 1); return [n, d]; };

  // Felsvar som liknar typiska misstag, när frågan saknar egna fällor.
  function fillers(ans, count, exclude = []) {
    const rest = [ans.add(1), ans.sub(1), ans.mul(2), ans.add(2), ans.mul(10), ans.div(10), ans.sub(2), ans.add(10)];
    if (!ans.isInt) rest.push(new Q(ans.n + (ans.n < 0 ? -1 : 1), ans.d), new Q(ans.n, ans.d + 1), new Q(ans.d * Math.sign(ans.n), Math.abs(ans.n)));
    const out = [];
    for (const q of [ans.neg(), ...shuffle(rest)]) {
      if (out.length >= count) break;
      if (q.eq(ans) || exclude.some(e => e.eq(q)) || out.some(o => o.eq(q))) continue;
      out.push(q);
    }
    return out;
  }

  // Inmatning från knappsatsen: { neg, whole: null | '4', num: '12,5', den: null | '7' }  (whole = blandad form)
  function parseInput(st) {
    const a = Q.dec(st.num);
    if (!a) return null;
    let v = a, raw = null;
    if (st.den !== null) {
      const b = Q.dec(st.den);
      if (!b || b.n === 0) return null;
      v = a.div(b);
      if (!/,/.test(st.num + st.den)) raw = { n: parseInt(st.num, 10), d: parseInt(st.den, 10) };
    }
    if (st.whole != null) {
      const w = Q.dec(st.whole);
      if (!w || st.den === null) return null;
      v = w.add(v);
    }
    return { v: st.neg ? v.neg() : v, raw };
  }

  function grade(q, parsed) {
    if (!parsed) return { ok: false, invalid: true };
    const { v, raw } = parsed;
    if (v.eq(q.answer)) {
      if (q.simplest && raw && raw.d !== 1 && gcd(raw.n, raw.d) !== 1)
        return { ok: false, almost: true, msg: 'Rätt värde! Men förkorta bråket så långt det går.' };
      return { ok: true };
    }
    const trap = (q.traps || []).find(([t]) => Q.of(t).eq(v));
    return { ok: false, msg: trap ? trap[1] : null, value: v };
  }

  // Tar bort fällor som råkar sammanfalla med svaret eller med varandra.
  function normalize(q) {
    if (q.traps && q.answer) {
      const out = [];
      for (const t of q.traps) {
        const v = Q.of(t[0]);
        if (!v.eq(q.answer) && !out.some(o => Q.of(o[0]).eq(v))) out.push(t);
      }
      q.traps = out;
    }
    return q;
  }

  // Tallinje som SVG. Etiketter är alltid heltal eller decimaltal.
  function numberLine({ start, step, ticks, labels = [], marks = [], interactive = false }) {
    start = Q.of(start); step = Q.of(step);
    const W = 340, H = 84, L = 18, R = W - 30, y = 38;
    const x = i => L + (i * (R - L)) / (ticks - 1);
    let s = `<svg class="nl" viewBox="0 0 ${W} ${H}" role="img" aria-label="Tallinje">`;
    s += `<line x1="4" y1="${y}" x2="${W - 8}" y2="${y}" class="nl-axis"/><path d="M${W - 4} ${y} l-10 -6 v12 z" class="nl-arrow"/>`;
    for (let i = 0; i < ticks; i++) {
      const big = labels.includes(i);
      s += `<line x1="${x(i)}" y1="${y - (big ? 9 : 6)}" x2="${x(i)}" y2="${y + (big ? 9 : 6)}" class="nl-tick${big ? ' big' : ''}"/>`;
      if (big) s += `<text x="${x(i)}" y="${y + 30}" class="nl-label">${txt(start.add(step.mul(i)))}</text>`;
    }
    for (const m of marks) {
      s += `<circle cx="${x(m.tick)}" cy="${y}" r="6.5" class="nl-mark ${m.cls || ''}"/>`;
      if (m.label) s += `<text x="${x(m.tick)}" y="${y - 16}" class="nl-mlabel ${m.cls || ''}">${m.label}</text>`;
    }
    if (interactive)
      for (let i = 0; i < ticks; i++)
        s += `<rect x="${x(i) - (R - L) / (ticks - 1) / 2}" y="0" width="${(R - L) / (ticks - 1)}" height="${H}" class="nl-hit" data-tick="${i}"/>`;
    return s + '</svg>';
  }

  // Fasta frågor (t.ex. för andra ämnen än matte) → generatorer, en per nivå.
  // Fråga: { level, ask, prompt, hint, steps, choices: [{ html, correct, msg }] } eller { ..., answer: 12 | '3/4' | '0,5' }
  const toQ = a => (a instanceof Q ? a : typeof a === 'number' ? Q.of(a) : /\//.test(a) ? Q.dec(a.split('/')[0]).div(Q.dec(a.split('/')[1])) : Q.dec(a));
  function fromList(list, prefix = 'list') {
    const levels = [...new Set(list.map(q => q.level || 1))];
    return levels.map(L => ({
      key: `${prefix}-${L}`, levels: [L],
      make() {
        const q = pick(list.filter(x => (x.level || 1) === L));
        return { ...q, answer: q.answer != null ? toQ(q.answer) : undefined, choices: q.choices && shuffle(q.choices), mode: q.choices ? 'choice' : q.mode || 'input' };
      },
    }));
  }

  G.SC = { Q, M, gcd, lcm, frac, int, fmt, fmtD, fmtM, txt, par, pn, pq, formatter, ri, nz, pick, chance, shuffle, coprime, fillers, parseInput, grade, normalize, numberLine, fromList };
})(typeof window !== 'undefined' ? window : globalThis);
