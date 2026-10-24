// Kör: node tools/check.mjs
// Genererar många frågor per generator och nivå och kontrollerar att svar, fällor och val håller.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ctx = { console };
vm.createContext(ctx);
const load = f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
load('engine/core.js');
load('engine/gen-math.js');
const modDir = path.join(root, 'modules');
for (const d of fs.readdirSync(modDir)) {
  const f = path.join('modules', d, 'module.js');
  if (fs.existsSync(path.join(root, f))) load(f);
}

const { SC } = ctx;
const N = Number(process.argv[2] || 300);
const bad = /undefined|NaN|\[object|Infinity/;
let errors = 0, count = 0, evaluated = 0;
const fail = (where, msg, q) => { errors++; if (errors <= 40) console.log(`✗ ${where}: ${msg}${q ? `\n    ask: ${strip(q.ask)}\n    prompt: ${strip(q.prompt)}` : ''}`); };
const strip = s => String(s ?? '').replace(/<span class="frac"><span>(.*?)<\/span><span>(.*?)<\/span><\/span>/g, '[$1/$2]').replace(/<[^>]+>/g, '');

// Oberoende omräkning av rena räkneuttryck.
function evalPrompt(html) {
  let s = html.replace(/<span class="frac"><span>(.*?)<\/span><span>(.*?)<\/span><\/span>/g, '(($1)/($2))');
  s = s.replace(/<[^>]+>/g, '').replace(/−/g, '-').replace(/·/g, '*').replace(/(\d),(\d)/g, '$1.$2').replace(/\s+/g, '');
  if (!/^[-+*/().\d]+$/.test(s)) return null;
  s = s.replace(/\)\(/g, ')*(').replace(/(\d)\(/g, '$1+('); // "2(1/4)" blandad form = 2 + 1/4
  return Function(`return (${s})`)();
}

function toInput(q) {
  const a = q.answer, neg = a.n < 0, abs = a.abs();
  if (abs.isInt) return { neg, num: String(abs.n), den: null };
  const dec = abs.toDec();
  if (q.fa === 'dec' && dec) return { neg, num: dec, den: null };
  return { neg, num: String(abs.n), den: String(abs.d) };
}

const topics = [];
for (const [name, list] of Object.entries(ctx.SvanteGen)) topics.push([name, list]);
for (const mod of Object.values(ctx.SvanteModules || {}))
  for (const t of mod.topics) if (t.subs) topics.push([`${mod.id}/${t.id}`, t.subs]);

const seen = new Set();
for (const [tname, subs] of topics) {
  for (const sub of subs) {
    if (seen.has(sub)) continue;
    seen.add(sub);
    for (const L of sub.levels) {
      const where = `${tname}/${sub.key}/L${L}`;
      for (let i = 0; i < N; i++) {
        count++;
        let q;
        try { q = SC.normalize(sub.make(L)); } catch (e) { fail(where, `kastade ${e.message}`); break; }
        const texts = [q.ask, q.prompt, q.hint, ...(q.steps || []), ...(q.traps || []).map(t => t[1]), ...(q.choices || []).map(c => c.html + (c.msg || ''))];
        if (texts.some(t => bad.test(String(t)))) { fail(where, 'text innehåller undefined/NaN', q); break; }
        if (!q.ask || !q.hint || !q.steps?.length) { fail(where, 'saknar ask/hint/steps', q); break; }
        const mode = q.mode || (q.choices ? 'choice' : 'auto');
        if (mode === 'choice') {
          if (!q.choices || q.choices.length < 2) { fail(where, 'för få val', q); break; }
          if (q.choices.filter(c => c.correct).length !== 1) { fail(where, 'inte exakt ett rätt val', q); break; }
          if (new Set(q.choices.map(c => c.html)).size !== q.choices.length) { fail(where, 'dubbla val', q); break; }
          continue;
        }
        if (mode === 'place') {
          const { spec, tick, traps } = q.place;
          if (tick < 0 || tick >= spec.ticks) { fail(where, 'tick utanför', q); break; }
          const v = SC.Q.of(spec.start).add(SC.Q.of(spec.step).mul(tick));
          if (!v.eq(q.answer)) { fail(where, `tick ${tick} = ${SC.txt(v)} men svar ${SC.txt(q.answer)}`, q); break; }
          if (traps.some(([t]) => t === tick)) { fail(where, 'fälla = rätt tick', q); break; }
          continue;
        }
        const g = SC.grade(q, SC.parseInput(toInput(q)));
        if (!g.ok) { fail(where, `rätt svar underkänns (${JSON.stringify(toInput(q))})`, q); break; }
        if (q.fa === 'mixed' && !q.answer.isInt) {
          const a = q.answer.abs(), w = Math.floor(a.n / a.d);
          const st = { neg: q.answer.n < 0, whole: w ? String(w) : null, num: String(a.n % a.d), den: String(a.d) };
          if (!SC.grade(q, SC.parseInput(st)).ok) { fail(where, `blandad form underkänns (${JSON.stringify(st)})`, q); break; }
        }
        if ((q.traps || []).some(([t]) => SC.Q.of(t).eq(q.answer))) { fail(where, 'fälla = rätt svar', q); break; }
        const opts = [...(q.traps || []).map(([t]) => SC.Q.of(t))];
        const fill = SC.fillers(q.answer, 3, opts);
        if (fill.length < 3) { fail(where, 'för få flervalsalternativ', q); break; }
        if (/^Beräkna/.test(q.ask) && !/var/.test(q.prompt)) {
          const v = evalPrompt(q.prompt);
          if (v !== null) evaluated++;
          if (v !== null && Math.abs(v - q.answer) > 1e-9) { fail(where, `omräkning ger ${v}, svar ${SC.txt(q.answer)}`, q); break; }
        }
      }
    }
  }
}
console.log(`${errors ? '✗' : '✓'} ${count} frågor kontrollerade (${evaluated} omräknade oberoende), ${errors} fel`);
process.exit(errors ? 1 : 0);
