// Modul: Ljud och ljus (Fysik åk 8). Källa: provinfo v. 46, bildspelen Ljud och Optik,
// arbetsbladen Akustik 4.1–4.7 och Optik 5.1–5.9 med facit. Frågorna knyter an till musik där det går.
(function () {
  const { pick, shuffle, fromList } = SC;

  // ───────────── Hjälpare ─────────────
  const mc = (level, ask, right, wrongs, hint, steps, extra = {}) => ({
    level, ask, prompt: '', hint, steps: [].concat(steps), ...extra,
    choices: [{ html: right, correct: true }, ...wrongs.map(([html, msg]) => ({ html, correct: false, msg }))],
  });
  // Sant/falskt: påståendet visas i prompten.
  const tf = (level, statement, isTrue, why, hint) => mc(level, 'Stämmer påståendet?', isTrue ? 'Sant' : 'Falskt',
    [[isTrue ? 'Falskt' : 'Sant', why]], hint, [why], { prompt: statement, wide: true });

  const r1 = n => Math.round(n * 10) / 10;
  const rad = deg => (deg * Math.PI) / 180;
  const svg = (w, h, body) => `<svg viewBox="0 0 ${w} ${h}" width="100%" style="max-width:${w}px;display:block;margin:0 auto" role="img" aria-hidden="true">${body}</svg>`;
  const line = (x1, y1, x2, y2, st) => `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" style="${st}"/>`;
  const txt = (x, y, s, anchor = 'start') => `<text x="${x}" y="${y}" text-anchor="${anchor}" style="fill:var(--muted);font:600 12px var(--f-body)">${s}</text>`;
  // Stråle med pilspets på mitten.
  function ray(x1, y1, x2, y2, color) {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, a = Math.atan2(y2 - y1, x2 - x1), s = 7;
    const p = [[mx + s * Math.cos(a), my + s * Math.sin(a)], [mx + s * Math.cos(a + 2.5), my + s * Math.sin(a + 2.5)], [mx + s * Math.cos(a - 2.5), my + s * Math.sin(a - 2.5)]];
    return line(x1, y1, x2, y2, `stroke:${color};stroke-width:3;stroke-linecap:round`) +
      `<polygon points="${p.map(([x, y]) => `${r1(x)},${r1(y)}`).join(' ')}" style="fill:${color}"/>`;
  }
  const IN = 'var(--c1)', OUT = 'var(--gold)';

  // Ljudvåg som SVG.
  function wave(cyc, amp) {
    const w = 160, h = 70, mid = h / 2, N = 160;
    let d = `M0 ${mid}`;
    for (let i = 1; i <= N; i++) d += ` L${r1((i / N) * w)} ${r1(mid - amp * Math.sin((2 * Math.PI * cyc * i) / N))}`;
    return svg(w, h, line(0, mid, w, mid, 'stroke:var(--line-2)') + `<path d="${d}" style="fill:none;stroke:var(--c1);stroke-width:2.5"/>`);
  }

  // Spegel: horisontell yta, normal streckad, infallande stråle från vänster.
  function mirrorPic(a, outAngle, through = false) {
    const X = 100, Y = 86, L = 72;
    let body = line(20, Y, 180, Y, 'stroke:var(--text);stroke-width:4');
    for (let x = 26; x < 180; x += 12) body += line(x, Y + 3, x - 8, Y + 12, 'stroke:var(--muted);stroke-width:1.5');
    body += line(X, 14, X, Y, 'stroke:var(--muted);stroke-width:1.5;stroke-dasharray:4 4');
    body += ray(X - L * Math.sin(rad(a)), Y - L * Math.cos(rad(a)), X, Y, IN);
    if (outAngle === 'back') body += ray(X, Y, X - L * Math.sin(rad(a)), Y - L * Math.cos(rad(a)), OUT);
    else if (through) body += ray(X, Y, X + L * Math.sin(rad(a)), Y + L * Math.cos(rad(a)) * 0.45, OUT);
    else body += ray(X, Y, X + L * Math.sin(rad(outAngle)), Y - L * Math.cos(rad(outAngle)), OUT);
    return svg(200, 104, body);
  }

  // Brytning: gräns vid y=80, övre ämne `top`, undre `bot`. out = {angle, up}.
  function refrPic(a, top, bot, out) {
    const X = 100, Y = 80, L = 66, dense = s => s !== 'luft';
    let body = `<rect x="0" y="0" width="200" height="${Y}" style="fill:${dense(top) ? 'color-mix(in oklab, var(--c1) 22%, transparent)' : 'transparent'}"/>` +
      `<rect x="0" y="${Y}" width="200" height="${160 - Y}" style="fill:${dense(bot) ? 'color-mix(in oklab, var(--c1) 22%, transparent)' : 'transparent'}"/>` +
      line(0, Y, 200, Y, 'stroke:var(--line-2);stroke-width:2') +
      line(X, 8, X, 152, 'stroke:var(--muted);stroke-width:1.5;stroke-dasharray:4 4') +
      txt(8, 18, top) + txt(8, 150, bot);
    body += ray(X - L * Math.sin(rad(a)), Y - L * Math.cos(rad(a)), X, Y, IN);
    if (out.up) body += ray(X, Y, X + L * Math.sin(rad(out.angle)), Y - L * Math.cos(rad(out.angle)), OUT);
    else body += ray(X, Y, X + L * Math.sin(rad(out.angle)), Y + L * Math.cos(rad(out.angle)), OUT);
    return svg(200, 160, body);
  }

  // Böjd spegel med tre parallella strålar. type: 'konkav' | 'konvex'.
  function curvedMirror(type) {
    const cx = 150; let body = '';
    const k = type === 'konkav' ? 1 : -1;
    // Parabel som kvadratisk Bézier: kanterna vid x = edge, mitten vid x = edge + k·27,5.
    const edge = k > 0 ? 122.5 : 150, ctrl = edge + k * 55;
    body += `<path d="M${edge} 15 Q${ctrl} 70 ${edge} 125" style="fill:none;stroke:var(--text);stroke-width:4"/>`;
    for (const y of [40, 70, 100]) {
      const t = (y - 15) / 110, xHit = edge + k * 110 * t * (1 - t);
      body += ray(14, y, xHit - 2, y, IN);
      if (type === 'konkav') body += ray(xHit - 2, y, xHit - 2 - 110, y - (y - 70) * 1.9, OUT);
      else body += ray(xHit - 2, y, xHit - 2 - 85, y + (y - 70) * 1.3, OUT);
    }
    if (type === 'konkav') body += `<circle cx="82" cy="70" r="4" style="fill:var(--gold)"/>`;
    return svg(190, 140, body);
  }

  // Lins med tre parallella strålar.
  function lens(type) {
    const cx = 95; let body = '';
    body += type === 'konvex'
      ? `<path d="M${cx} 15 Q${cx + 22} 70 ${cx} 125 Q${cx - 22} 70 ${cx} 15 Z" style="fill:color-mix(in oklab, var(--c1) 25%, transparent);stroke:var(--text);stroke-width:2"/>`
      : `<path d="M${cx - 14} 15 L${cx + 14} 15 Q${cx + 2} 70 ${cx + 14} 125 L${cx - 14} 125 Q${cx - 2} 70 ${cx - 14} 15 Z" style="fill:color-mix(in oklab, var(--c1) 25%, transparent);stroke:var(--text);stroke-width:2"/>`;
    for (const y of [40, 70, 100]) {
      body += ray(10, y, cx, y, IN);
      if (type === 'konvex') body += ray(cx, y, 175, 70 + (y - 70) * -0.4, OUT);
      else body += ray(cx, y, 180, y + (y - 70) * 1.2, OUT);
    }
    if (type === 'konvex') body += `<circle cx="150" cy="70" r="4" style="fill:var(--gold)"/>`;
    return svg(190, 140, body);
  }

  // ───────────── 1. Ljud & vågor ─────────────
  const vagorList = [
    mc(1, 'Vad krävs för att ljud ska uppstå?', 'Att något vibrerar',
      [['Att det finns ljus', 'Ljus och ljud är olika saker. Ljud uppstår när något vibrerar, som ett trumskinn eller en sträng.'],
       ['Att luften är varm', 'Temperaturen spelar ingen roll för om ljud uppstår. Det som krävs är att något vibrerar.']],
      'Tänk på vad trumskinnet gör när du slår på det.', ['Ljud uppstår när något vibrerar, till exempel ett skinn eller en sträng.']),
    mc(1, 'Någon slår på en virveltrumma. Vad gör skinnet med luften?', 'Trycker ihop och tunnar ut luften',
      [['Skjuter iväg luften hela vägen till örat', 'Luften stannar ungefär där den är. Det är rörelseenergin som förflyttas, från molekyl till molekyl.'],
       ['Värmer upp luften så att den låter', 'Ljud är inte värme. Skinnet trycker ihop luften till förtätningar och drar isär den till förtunningar.']],
      'Molekylerna knuffar på varandra.', ['Skinnet vibrerar och gör förtätningar och förtunningar i luften.', 'Rörelseenergin förflyttas genom luften.']),
    mc(1, 'Vad mäts frekvens i?', 'Hertz (Hz)',
      [['Decibel (dB)', 'Decibel mäter ljudstyrka. Frekvens mäts i hertz.'], ['Meter per sekund (m/s)', 'm/s är en hastighet. Frekvens mäts i hertz.'], ['Candela (cd)', 'Candela är ljusstyrka. Frekvens mäts i hertz.']],
      'Stämappen visar det här när du slår an en sträng.', ['Frekvens mäts i hertz, Hz.']),
    mc(1, 'Vad mäts ljudstyrka i?', 'Decibel (dB)',
      [['Hertz (Hz)', 'Hertz är frekvens, alltså hur hög tonen är. Ljudstyrka mäts i decibel.'], ['Candela (cd)', 'Candela är ljusstyrka. Ljudstyrka mäts i decibel.'], ['Lumen (lm)', 'Lumen är ljusflöde. Ljudstyrka mäts i decibel.']],
      'Hörselskydd märks med det här.', ['Ljudstyrka mäts i decibel, dB.']),
    mc(1, 'Vad är frekvens?', 'Hur många gånger något svänger fram och tillbaka på en sekund',
      [['Hur starkt ljudet är', 'Hur starkt ljudet är kallas ljudstyrka och syns på amplituden. Frekvens är antal svängningar per sekund.'],
       ['Hur långt ljudet når', 'Frekvens handlar inte om avstånd. Det är antal svängningar per sekund.']],
      'Tänk på "per sekund".', ['Frekvens = antal svängningar per sekund.']),
    mc(1, 'Hög frekvens ger…', 'hög (ljus) ton',
      [['låg (mörk) ton', 'Det är tvärtom. Låg frekvens ger låg ton, som en bas.'], ['starkt ljud', 'Starkt ljud handlar om amplitud, inte frekvens.']],
      'Den tunna e-strängen har högst frekvens.', ['Hög frekvens = hög ton. Låg frekvens = låg ton.']),
    mc(1, 'Vad förstärker ljudet i en akustisk gitarr?', 'Kroppen, som är en resonanslåda',
      [['Strängarna själva', 'Strängarna gör ljudet, men de är för tunna för att trycka på mycket luft. Kroppen förstärker.'],
       ['Stämskruvarna', 'Stämskruvarna ändrar spänningen och därmed tonen. Det är kroppen som förstärker.']],
      'Varför låter en elgitarr utan förstärkare så tyst?', ['Gitarrkroppen är en resonanslåda som svänger med och förstärker ljudet.']),
    mc(2, 'Trummisen spänner skinnet hårdare med stämnyckeln. Vad händer med tonen?', 'Den blir högre',
      [['Den blir lägre', 'Ett hårdare spänt skinn vibrerar snabbare. Högre frekvens ger högre ton.'], ['Ljudet blir starkare', 'Spänningen ändrar tonhöjden. Hur starkt det blir beror på hur hårt du slår.']],
      'Snabbare vibration ger…?', ['Hårdare spänt skinn vibrerar snabbare.', 'Högre frekvens ger högre ton.']),
    mc(2, 'Basens strängar är mycket tjockare än gitarrens. Om längd och spänning är lika, vad gör tjockleken med tonen?', 'Den blir lägre',
      [['Den blir högre', 'En tjockare sträng är tyngre och svänger långsammare. Det ger lägre frekvens.'], ['Inget händer', 'Tjockleken spelar roll. Tjockare sträng ger lägre ton.']],
      'Vilka strängar på gitarren är tjockast, de höga eller de låga?', ['Tjockare sträng svänger långsammare.', 'Lägre frekvens ger lägre ton.']),
    mc(2, 'Trummisen slår hårdare på samma trumma. Vad ändras?', 'Amplituden, ljudet blir starkare',
      [['Frekvensen, tonen blir högre', 'Tonen är densamma, det kan du se i stämappen. Hårdare slag ger större amplitud, alltså starkare ljud.'],
       ['Ljudets hastighet blir högre', 'Ljudet går lika fort, 340 m/s i luft. Det är amplituden som ökar.']],
      'Titta på stämappen: siffran är densamma.', ['Hårdare slag ger högre vågor, större amplitud.', 'Större amplitud = starkare ljud (fler dB).']),
    mc(2, 'Man ritar ljud som en våg. Vad motsvarar toppen på vågen?', 'En förtätning',
      [['En förtunning', 'Förtunningen är dalen. Toppen är där luften är mest hoptryckt, en förtätning.'], ['En våglängd', 'Våglängden är avståndet mellan två toppar, inte toppen själv.']],
      'Topp = mycket luft på liten plats.', ['Toppen motsvarar en förtätning.', 'Dalen motsvarar en förtunning.']),
    mc(2, 'Vad är en våglängd?', 'Avståndet mellan två vågtoppar',
      [['Höjden på vågen', 'Höjden är amplituden. Våglängd är avståndet från topp till topp.'], ['En svängning', 'Det är en vanlig fälla. En svängning och en våglängd är inte samma sak.']],
      'Från en topp till nästa topp.', ['Våglängd = avståndet mellan två toppar, eller mellan två dalar.']),
    mc(2, 'Vad betyder resonans?', 'Medsvängning',
      [['Eko', 'Eko är ljud som studsar. Resonans är när något svänger med och förstärker.'], ['Dämpning', 'Dämpning gör ljudet svagare. Resonans är medsvängning som förstärker.']],
      'Gitarrkroppen svänger med strängarna.', ['Resonans = medsvängning. Resonanslådan svänger med och förstärker ljudet.']),
    mc(2, 'Två gitarrister spelar exakt samma ton i fas. Vad händer?', 'Ljudet blir starkare',
      [['Ljudet tar ut sig självt och blir tyst', 'Om de är i fas sammanfaller topparna. Då blir vågen högre och ljudet starkare.'], ['Tonen blir högre', 'Frekvensen är densamma. Det är styrkan som ökar.']],
      'I fas betyder att topparna kommer samtidigt.', ['I fas: topp + topp ger högre våg.', 'Högre våg = starkare ljud.']),
    mc(2, 'Vad gör en mikrofon?', 'Omvandlar rörelseenergi till elektrisk energi',
      [['Omvandlar elektrisk energi till rörelseenergi', 'Det är högtalaren. Mikrofonen fångar ljudets rörelseenergi och gör om den till el.'], ['Gör ljudet starkare utan el', 'En mikrofon förstärker inte själv. Den gör om ljudets rörelse till elektriska signaler.']],
      'Mikrofonen tar in ljud och skickar det i en sladd.', ['Mikrofon: rörelseenergi → elektrisk energi.', 'Högtalare: elektrisk energi → rörelseenergi.']),
    mc(2, 'Vad gör en högtalare?', 'Omvandlar elektrisk energi till rörelseenergi',
      [['Omvandlar rörelseenergi till elektrisk energi', 'Det är mikrofonen. Högtalarens membran rör sig av elen och skapar ljud.'], ['Gör om ljus till ljud', 'Högtalaren använder el, inte ljus.']],
      'Lägg fingret på membranet när det spelar bas.', ['Högtalare: elektrisk energi → rörelseenergi (ljud).']),
    tf(2, 'Luft som pressats ihop har högre densitet än tunn luft.', true, 'Hoptryckt luft har fler molekyler på samma plats, alltså högre densitet. Det är en förtätning.', 'Densitet = hur tätt packat.'),
    tf(2, 'En svängning och en våglängd är samma sak.', false, 'En svängning är en rörelse fram och tillbaka. En våglängd är ett avstånd mellan två toppar.', 'Den ena är en rörelse, den andra ett avstånd.'),
    mc(3, 'Ett ljud är 100 Hz och ett annat 10 000 Hz. Vilket har kortast våglängd?', '10 000 Hz',
      [['100 Hz', 'Låg frekvens ger lång våglängd. Det höga ljudet, 10 000 Hz, har kortast våglängd.'], ['De är lika långa', 'Våglängden beror på frekvensen. Högre frekvens ger kortare våglängd.']],
      'Täta vågor = hög ton.', ['Hög frekvens = kort våglängd = hög ton.']),
    mc(3, 'Kort våglängd ger…', 'hög ton',
      [['låg ton', 'Det är tvärtom. Lång våglängd ger låg ton.'], ['starkt ljud', 'Styrkan beror på amplituden, inte våglängden.']],
      'Täta vågor.', ['Kort våglängd = hög frekvens = hög ton.']),
    mc(3, 'Gitarristen trycker ner strängen vid tolfte bandet, så att den svängande delen blir hälften så lång. Vad händer med frekvensen?', 'Den dubblas, tonen går en oktav upp',
      [['Den halveras, tonen går ner', 'En kortare sträng svänger snabbare, inte långsammare.'], ['Den är densamma', 'Kortare svängande del ger snabbare svängningar och högre frekvens.']],
      'Kortare sträng svänger…', ['Halva längden ger dubbla frekvensen.', 'Samma ton, en oktav upp.']),
  ];

  const waveTon = { key: 'vag-ton', levels: [1, 2], make() {
    const cycs = shuffle([1.5, 3, 5.5]), high = Math.random() < 0.5, best = high ? 5.5 : 1.5;
    return { prompt: '', ask: `Vilken ljudvåg har ${high ? 'högst' : 'lägst'} ton?`, hint: 'Täta vågor = hög frekvens = hög ton.',
      steps: ['Tonhöjden syns på hur tätt vågorna ligger.', high ? 'Tätast vågor = högst ton.' : 'Glesast vågor = lägst ton.'],
      choices: cycs.map(c => ({ html: wave(c, 24), correct: c === best,
        msg: c === best ? '' : `Den här vågen har ${c < best ? 'glesare' : 'tätare'} vågor, alltså ${c < best ? 'lägre' : 'högre'} frekvens. Höjden är lika på alla, så den spelar ingen roll här.` })) };
  } };
  const waveStyrka = { key: 'vag-styrka', levels: [2], make() {
    const amps = shuffle([7, 15, 28]), loud = Math.random() < 0.5, best = loud ? 28 : 7;
    return { prompt: '', ask: `Vilken ljudvåg är ${loud ? 'starkast' : 'svagast'}?`, hint: 'Styrkan syns på hur höga vågorna är, amplituden.',
      steps: ['Hur starkt ljudet är syns på amplituden, vågens höjd.', loud ? 'Högst vågor = starkast.' : 'Lägst vågor = svagast.'],
      choices: amps.map(a => ({ html: wave(3, a), correct: a === best,
        msg: a === best ? '' : `Alla har samma frekvens. Det som skiljer är höjden, och den här vågen är ${a < best ? 'lägre' : 'högre'}.` })) };
  } };
  const waveKombo = { key: 'vag-kombo', levels: [3], make() {
    const all = [{ c: 5.5, a: 28, d: 'hög ton och starkt ljud' }, { c: 5.5, a: 8, d: 'hög ton och svagt ljud' }, { c: 1.5, a: 28, d: 'låg ton och starkt ljud' }, { c: 1.5, a: 8, d: 'låg ton och svagt ljud' }];
    const t = pick(all);
    return { prompt: '', ask: `Vilken ljudvåg har ${t.d}?`, hint: 'Täthet = tonhöjd. Höjd = ljudstyrka.',
      steps: ['Täta vågor = hög ton, glesa = låg ton.', 'Höga vågor = starkt ljud, låga = svagt.'],
      choices: shuffle(all).map(w => ({ html: wave(w.c, w.a), correct: w === t, msg: w === t ? '' : `Den här vågen har ${w.d}.` })) };
  } };

  // ───────────── 2. Hörsel, eko & fart ─────────────
  const horaList = [
    mc(1, 'Vilka frekvenser kan människan höra?', '20–20 000 Hz',
      [['0–100 Hz', 'Vi hör mycket högre toner än 100 Hz. Den tunna e-strängen ligger på ungefär 330 Hz.'], ['1 000–100 000 Hz', 'Vi hör inte så höga frekvenser, och vi hör bastoner under 1 000 Hz. Gränserna är 20 och 20 000 Hz.']],
      'Testa med ett hörseltest på Youtube.', ['Människan hör 20–20 000 Hz.']),
    mc(1, 'Vad kallas ljud med lägre frekvens än 20 Hz?', 'Infraljud',
      [['Ultraljud', 'Ultraljud är tvärtom, över 20 000 Hz. Under 20 Hz heter infraljud.'], ['Eko', 'Eko är ljud som studsar. Under 20 Hz heter infraljud.']],
      '"Infra" betyder under.', ['Under 20 Hz = infraljud.', 'Över 20 000 Hz = ultraljud.']),
    mc(1, 'Vad kallas ljud med högre frekvens än 20 000 Hz?', 'Ultraljud',
      [['Infraljud', 'Infraljud är under 20 Hz. Över 20 000 Hz heter ultraljud.'], ['Överljud', 'Det finns inget som heter så. Över 20 000 Hz heter ultraljud.']],
      '"Ultra" betyder bortom, över.', ['Över 20 000 Hz = ultraljud.']),
    mc(1, 'Hur uppstår ett eko?', 'Ljudet studsar mot en hård yta',
      [['Ljudet blir starkare av sig självt', 'Ljud blir inte starkare av sig självt. Eko är ljud som studsar tillbaka, reflekteras.'], ['Luften vibrerar dubbelt så fort', 'Frekvensen ändras inte. Eko är reflekterat ljud.']],
      'Klappa i händerna i ett kalt trapphus.', ['Eko = ljud som studsar (reflekteras) mot en hård yta.']),
    mc(1, 'Varför har replokalen mjuk dämpning på väggarna?', 'Mjuka material absorberar ljudet',
      [['Mjuka material reflekterar ljudet bättre', 'Det är hårda ytor som reflekterar. Mjuka material fångar upp, absorberar, ljudet.'], ['De gör tonerna högre', 'Dämpning ändrar inte tonhöjden. Den minskar eko.']],
      'Jämför ett tomt rum med ett rum med soffa och mattor.', ['Mjuka material är ljudabsorbenter. De fångar upp ljudet så att det inte ekar.']),
    mc(1, 'Hur fort går ljudet i luft?', '340 m/s',
      [['340 km/h', 'Fälla! Det är 340 meter per sekund, inte kilometer i timmen.'], ['300 000 km/s', 'Det är ljusets hastighet. Ljud går mycket långsammare, 340 m/s.']],
      'Ungefär en kilometer på tre sekunder.', ['Ljudets hastighet i luft är 340 m/s.']),
    mc(1, 'Hörs ljud i rymden?', 'Nej, där finns inga partiklar som kan vibrera',
      [['Ja, men svagare', 'I rymden är det vakuum. Utan partiklar kan ljudet inte färdas alls.'], ['Ja, fast snabbare', 'Ljud behöver ett ämne. I vakuum hörs ingenting.']],
      'Ljud är molekyler som knuffar varandra.', ['Ljud behöver ett ämne. I vakuum, som rymden, hörs inget.']),
    mc(2, 'Hur fort går ljudet i vatten?', '1500 m/s',
      [['340 m/s', 'Det är i luft. Vatten är tätare, så där går ljudet snabbare: 1500 m/s.'], ['150 m/s', 'Ljud går snabbare i vatten än i luft, inte långsammare.']],
      'Tätare ämne ger snabbare ljud.', ['Luft: 340 m/s. Vatten: 1500 m/s.', 'Ju tätare ämne, desto snabbare.']),
    mc(2, 'I vilket ämne går ljudet snabbast?', 'Stål',
      [['Luft', 'Luft är tunnast av dem. Ljud går snabbare ju tätare ämnet är.'], ['Vatten', 'Vatten är tätare än luft men stål är ännu tätare.']],
      'Ju tätare, desto…', ['Ju tätare ämne, desto högre ljudhastighet.', 'Stål är tätast här.']),
    mc(2, 'Vad används ultraljud till?', 'Att se ett foster i magen',
      [['Fjärrkontroller', 'Fjärrkontroller använder IR-ljus, inte ljud.'], ['Att se skelettet', 'Skelettet fotograferas med röntgenstrålning.']],
      'Med ultraljud kan man "se in" i kroppen.', ['Ultraljud används i vården för att se in i kroppen, till exempel foster och organ.']),
    mc(2, 'Vad används ett ekolod till?', 'Att mäta djup och avstånd till sjöss',
      [['Att förstärka musik', 'Det gör förstärkare. Ekolodet skickar ljud och lyssnar efter ekot.'], ['Att mäta hur stark åskan är', 'Ekolod används i vatten och mäter avstånd med hjälp av eko.']],
      'Eko + lod (djupmätare).', ['Ekolodet skickar ut ljud och mäter tiden tills ekot kommer tillbaka.', 'Då kan man räkna ut avståndet.']),
    mc(2, 'En ambulans med siren kör förbi dig. Vad hör du?', 'Tonen är högre när den kommer och sjunker när den har passerat',
      [['Tonen är lägre när den kommer och stiger när den har passerat', 'Det är tvärtom. Förtätningarna trycks ihop framför ambulansen, så tonen är högre när den närmar sig.'],
       ['Tonen är exakt likadan hela tiden', 'Tonen ändras när ljudkällan rör sig. Det heter dopplereffekten.']],
      'Gör ett "iiiiioooooo"-ljud.', ['Dopplereffekten: framför ljudkällan trycks förtätningarna ihop och frekvensen ökar.', 'Bakom blir avståndet större och frekvensen minskar.']),
    mc(2, 'Varför låter sirenen högre när ambulansen kommer mot dig?', 'Förtätningarna trycks ihop så att frekvensen ökar',
      [['Ljudet går snabbare', 'Ljudet går fortfarande 340 m/s. Det är avståndet mellan förtätningarna som minskar.'], ['Föraren höjer volymen', 'Volymen är densamma. Frekvensen ändras av rörelsen.']],
      'Avståndet mellan förtätningarna…', ['Framför ambulansen blir avståndet mellan förtätningarna kortare.', 'Kortare avstånd = högre frekvens = högre ton.']),
    mc(2, 'Vad är skillnaden mellan eko och efterklang?', 'Eko är en tydlig upprepning, efterklang ett utdraget ljud',
      [['Eko är ett utdraget ljud, efterklang en tydlig upprepning', 'Det är tvärtom. Ett eko hör man som en tydlig upprepning, som "hallå… hallå".'], ['Det är samma sak', 'Båda är reflekterat ljud, men eko är en tydlig upprepning och efterklang ett utdraget ljud.']],
      'Ropa mot en bergvägg jämfört med att spela i en kyrka.', ['Eko: tydlig upprepning.', 'Efterklang: utdraget ljud som klingar av.']),
    mc(2, 'Vad kan starkt infraljud orsaka hos människor?', 'Illamående',
      [['Solbränna', 'Solbränna kommer från UV-strålning, inte ljud.'], ['Att man ser färger', 'Infraljud är ljud vi inte hör. Det kan ge illamående.']],
      'Vi hör det inte, men kroppen kan märka det.', ['Infraljud kan ge illamående.']),
    mc(2, 'Ljudet har kommit in i hörselgången. Vad är det första som sätts i rörelse?', 'Trumhinnan',
      [['Snäckan', 'Snäckan ligger längre in. Först vibrerar trumhinnan, sedan hörselbenen.'], ['Hörselnerven', 'Hörselnerven skickar signalen till hjärnan allra sist.']],
      'Den heter som ett trumskinn.', ['Ordningen: ytterörat → hörselgången → trumhinnan → hammaren, städet, stigbygeln → snäckan → hörselnerven.']),
    mc(2, 'Vad gör örat med ljudets vibrationer?', 'Gör om dem till nervsignaler som går till hjärnan',
      [['Gör om dem till ljus', 'Örat gör om vibrationer till nervsignaler, inte ljus.'], ['Förstärker dem och skickar ut dem igen', 'Örat skickar signalerna vidare till hjärnan via hörselnerven.']],
      'Hörselnerven går till hjärnan.', ['Örat omvandlar vibrationer till nervsignaler.']),
    mc(2, 'Vid ungefär hur många decibel gör ljud ont och kan skada hörseln?', '140 dB',
      [['40 dB', 'Ungefär 40 dB är lugnt tal. Det skadar inte.'], ['10 dB', '10 dB är nästan tyst.']],
      'Ett trumset kommer över 100 dB, och smärtgränsen ligger ännu högre.', ['Runt 140 dB gör det ont. Trumhinnan kan skadas.', 'Använd öronproppar när du spelar.']),
    mc(2, 'Vad heter det när ett flygplan färdas snabbare än ljudet?', 'Att bryta ljudvallen',
      [['Dopplereffekten', 'Dopplereffekten är att tonen ändras. Snabbare än ljudet heter att bryta ljudvallen.'], ['Ultraljud', 'Ultraljud är ljud över 20 000 Hz.']],
      'Det säger "pang" – en ljudbang.', ['Snabbare än ljudet = överljudsfart. Man bryter ljudvallen.']),
    mc(3, 'Vad blir ljud till när det absorberas av mjuka material?', 'Värme',
      [['Ljus', 'Ljudet blir inte till ljus. Rörelseenergin blir värme.'], ['Elektricitet', 'Det är mikrofonen som gör om ljud till el. Mjuka material gör om ljudet till värme.']],
      'Energi försvinner inte, den byter form.', ['När ljud absorberas omvandlas rörelseenergin till värme.']),
    mc(2, 'Varför ser man blixten innan man hör åskan?', 'Ljuset går mycket snabbare än ljudet',
      [['Åskan kommer senare från molnet', 'Blixt och åska uppstår samtidigt. Ljuset (300 000 km/s) är framme direkt, ljudet (340 m/s) tar tid.'], ['Örat är långsammare än ögat', 'Det handlar om hur fort ljus och ljud färdas, inte om kroppen.']],
      'Jämför 300 000 km/s med 340 m/s.', ['Ljuset går 300 000 km/s och är framme direkt.', 'Ljudet går 340 m/s och kommer efter.']),
    mc(2, 'Längst bak på en festival ser du trummisen slå innan du hör slaget. Varför?', 'Ljudet behöver tid att färdas, ljuset är framme direkt',
      [['Högtalarna är trasiga', 'Det händer alltid på långt avstånd. Ljudet går bara 340 m/s.'], ['Ljuset studsar på publiken', 'Det handlar om att ljud är mycket långsammare än ljus.']],
      'Samma sak som blixt och åska.', ['Ljuset når dig direkt.', 'Ljudet går 340 m/s, så det kommer en stund senare.']),
    mc(3, 'Stora festivaler har högtalartorn mitt i publiken. Varför fördröjer man ljudet i dem med flit?', 'Så att det kommer samtidigt som ljudet från scenen',
      [['För att göra ljudet starkare', 'Tornen gör det starkare, men fördröjningen finns för att ljudet från scenen ska hinna fram först.'], ['För att skapa eko med flit', 'Det är tvärtom. Utan fördröjning hörs allt två gånger, som ett eko.']],
      'Ljudet från scenen går bara 340 m/s.', ['Ljudet från scenen tar tid att nå tornen.', 'Tornen väntar lika länge, så att allt hörs samtidigt.']),
    mc(2, 'Ett ekolod får tillbaka ekot efter längre tid än förut. Vad betyder det?', 'Det är djupare',
      [['Det är grundare', 'Längre tid betyder att ljudet åkt längre, alltså djupare vatten.'], ['Vattnet är varmare', 'Tiden visar hur långt ljudet åkt ner och upp.']],
      'Ljudet åker ner och upp igen.', ['Ljudet åker ner till botten och upp igen.', 'Längre tid = längre väg = djupare.']),
    mc(3, 'Ett ekolod mäter tiden tills ekot kommer tillbaka. Varför måste man tänka på att ljudet åker två gånger?', 'Ljudet åker ner till botten och sedan upp igen',
      [['Ljudet studsar två gånger mot båten', 'Det studsar mot botten en gång, men åker både ner och upp.'], ['Det behöver man inte', 'Tiden gäller både vägen ner och vägen upp. Djupet är bara halva sträckan.']],
      'Vägen ner + vägen upp.', ['Tiden gäller vägen ner och upp.', 'Djupet är halva den sträckan.']),
    tf(3, 'Om det tar 3 sekunder mellan blixt och åska slog blixten ner 3 km bort.', false, 'Ljudet går 340 m varje sekund. 3 s · 340 m/s = 1020 m, alltså ungefär 1 km.', 'Hur långt går ljudet på en sekund?'),
  ];


  // ───────────── 3. Ljus & speglar ─────────────
  const spegelList = [
    mc(1, 'Hur fort går ljuset?', '300 000 km/s',
      [['340 m/s', 'Det är ljudets hastighet i luft. Ljus går nästan en miljon gånger snabbare.'], ['300 000 km/h', 'Det är per sekund, inte per timme: 300 000 km/s.']],
      'Därför ser man blixten före åskan.', ['Ljusets hastighet är 300 000 km/s.']),
    mc(1, 'Vad krävs för att ljus ska skapas?', 'En ljuskälla',
      [['En spegel', 'En spegel reflekterar ljus men skapar inget eget ljus.'], ['Luft', 'Ljus behöver inte luft. Det går till och med genom rymden.']],
      'Solen, en lampa, scenljuset…', ['Ljus skapas av en ljuskälla, till exempel solen eller en lampa.']),
    mc(1, 'Vad säger reflektionslagen?', 'Infallsvinkeln är lika stor som reflektionsvinkeln',
      [['Reflektionsvinkeln är dubbelt så stor som infallsvinkeln', 'Vinklarna är exakt lika stora.'], ['Ljuset studsar alltid rakt tillbaka', 'Bara om det kommer rakt in längs normalen. Annars är vinkeln ut lika stor som vinkeln in.']],
      'In-vinkel och ut-vinkel…', ['Reflektionslagen: infallsvinkeln = reflektionsvinkeln.']),
    mc(1, 'Vad mäts ljusstyrka i?', 'Candela (cd)',
      [['Lumen (lm)', 'Lumen mäter ljusflöde. Ljusstyrka mäts i candela.'], ['Decibel (dB)', 'Decibel är ljudstyrka.']],
      'Ordet betyder ljus på latin.', ['Ljusstyrka: candela (cd).', 'Ljusflöde: lumen (lm).']),
    mc(1, 'Vad mäts i lumen (lm)?', 'Ljusflöde',
      [['Ljusstyrka', 'Ljusstyrka mäts i candela. Lumen är ljusflöde, alltså hur tätt det är mellan ljusstrålarna.'], ['Ljusets hastighet', 'Hastighet mäts i km/s.']],
      'Står ofta på lampförpackningar.', ['Ljusflöde mäts i lumen.']),
    mc(1, 'Vad är normalen?', 'En linje vinkelrät mot ytan där strålen träffar',
      [['Ytan på spegeln', 'Normalen står vinkelrätt mot ytan, den är inte själva ytan.'], ['Den vanliga vägen ljuset tar', 'Normalen är en hjälplinje i 90° mot ytan.']],
      'Den ritas streckad, rakt ut från ytan.', ['Normalen är en tänkt linje vinkelrät (90°) mot ytan.', 'Alla vinklar mäts från den.']),
    mc(1, 'Hur ser en konkav spegel ut och vad gör den?', 'Buktar inåt och samlar strålarna i en brännpunkt',
      [['Buktar utåt och sprider strålarna', 'Det är en konvex spegel.'], ['Är helt plan och ger en skenbild', 'Det är en vanlig plan spegel.']],
      'KonKAV – som en grotta (kav = hål).', ['Konkav spegel: buktar inåt, samlar parallella strålar i brännpunkten.']),
    mc(1, 'Hur ser en konvex spegel ut och vad gör den?', 'Buktar utåt och sprider strålarna',
      [['Buktar inåt och samlar strålarna', 'Det är en konkav spegel.'], ['Släpper igenom ljuset', 'En spegel reflekterar ljuset, den släpper inte igenom det.']],
      'Baksidan av en sked.', ['Konvex spegel: buktar utåt, sprider strålarna.']),
    mc(2, 'Varifrån mäter man infallsvinkeln?', 'Från normalen',
      [['Från spegelytan', 'Vanlig fälla! Vinklarna mäts från normalen, den streckade linjen i 90° mot ytan.'], ['Från ljuskällan', 'Vinkeln mäts mellan strålen och normalen.']],
      'Den streckade linjen.', ['Infallsvinkel och reflektionsvinkel mäts båda från normalen.']),
    mc(2, 'Vad är brännvidd?', 'Avståndet från spegeln till brännpunkten',
      [['Hur varm brännpunkten blir', 'Brännvidd är ett avstånd, inte en temperatur.'], ['Hur bred spegeln är', 'Brännvidd är avståndet från spegeln till brännpunkten.']],
      'Vidd = avstånd.', ['Brännvidd = avståndet från spegeln (eller linsen) till brännpunkten.']),
    mc(2, 'Vilken sorts spegel sitter i en utfart så att man ser bilarna?', 'Konvex, den ger större synfält',
      [['Konkav, den förstorar', 'En konkav spegel samlar ljuset. I trafiken vill man se mycket på en gång, och det ger en konvex spegel.'], ['Plan, den ger exakt bild', 'En plan spegel visar för lite. En konvex spegel ger större synfält.']],
      'Man ser mindre ut men ser mer av omgivningen.', ['Konvex spegel: man ser mindre ut men får större synfält.', 'Används i trafik och butiker.']),
    mc(2, 'Vilken sorts spegel är en sminkspegel som förstorar?', 'Konkav',
      [['Konvex', 'En konvex spegel gör dig mindre. Den som förstorar när du är nära är konkav.'], ['Plan', 'En plan spegel förstorar inte.']],
      'Inåtbuktande.', ['Konkav spegel: om du är nära (innanför brännpunkten) ser du förstorad och rättvänd ut.']),
    mc(2, 'Var ligger brännpunkten för en konvex spegel?', 'Bakom spegeln',
      [['Framför spegeln', 'Det gäller konkava speglar. För en konvex spegel ligger brännpunkten bakom spegeln.'], ['Den har ingen', 'Den har en, men den ligger bakom spegeln.']],
      'Strålarna sprids, men de ser ut att komma från en punkt…', ['Konvex spegel: brännpunkten ligger bakom spegeln.']),
    mc(2, 'Vad kallas bilden du ser i en vanlig plan spegel?', 'En skenbild',
      [['En verklig bild', 'Bilden finns inte på riktigt bakom spegeln. Den kallas skenbild.'], ['Ett spektrum', 'Ett spektrum är när vitt ljus delas upp i färger.']],
      'Det ser ut som om du står bakom spegeln.', ['En plan spegel ger en skenbild.']),
    mc(2, 'Vad är kärnskuggan?', 'Den mörkaste delen av skuggan',
      [['Den ljusaste delen av skuggan', 'Det är halvskuggan som är ljusare. Kärnskuggan är den mörkaste.'], ['Ljuset mitt i lampan', 'Kärnskugga handlar om skuggor, inte lampor.']],
      'Kärnan = mitten.', ['Kärnskuggan är mörkast. Halvskuggan är ljusare.']),
    mc(2, 'Vad är diffus reflektion?', 'Ljus som studsar åt alla håll på en ojämn yta',
      [['Ljus som studsar perfekt som i en spegel', 'Det är vanlig, regelbunden reflektion. Diffus betyder åt alla håll.'], ['Ljus som går igenom en glasruta', 'Det är genomskinligt material, inte reflektion.']],
      'Papper och väggar.', ['Diffus reflektion: ljuset sprids åt alla håll på en ojämn yta.']),
    tf(2, 'Ljus kan böjas runt hörn.', false, 'Ljus går rakt. Därför blir det skuggor.', 'Varför blir det skuggor?'),
    mc(2, 'Vad heter spegeln på bilden?', 'Konkav spegel',
      [['Konvex spegel', 'Strålarna samlas i en punkt. Det gör en konkav spegel.'], ['Plan spegel', 'En plan spegel samlar inte strålarna.']],
      'Samlas strålarna eller sprids de?', ['Strålarna samlas i brännpunkten: konkav spegel.'], { prompt: curvedMirror('konkav'), wide: true }),
    mc(2, 'Vad heter spegeln på bilden?', 'Konvex spegel',
      [['Konkav spegel', 'Strålarna sprids åt olika håll. Det gör en konvex spegel.'], ['Plan spegel', 'En plan spegel skickar tillbaka strålarna parallellt.']],
      'Samlas strålarna eller sprids de?', ['Strålarna sprids: konvex spegel.'], { prompt: curvedMirror('konvex'), wide: true }),
    mc(3, 'Var används konkava speglar?', 'I ficklampor och parabolantenner',
      [['I trafikspeglar', 'Trafikspeglar är konvexa, för att ge stort synfält.'], ['I glasögon', 'Glasögon har linser, inte speglar.']],
      'De samlar strålar till en punkt, eller skickar ut dem parallellt från den.', ['Konkava speglar: ficklampor, sminkspeglar, teleskop, parabolantenner.']),
  ];

  const spegelRay = { key: 'spegel-ray', levels: [2, 3], make() {
    const a = pick([25, 30, 35, 50, 55, 60]), off = a < 45 ? a + 25 : a - 25;
    const opts = [
      { html: mirrorPic(a, a), correct: true },
      { html: mirrorPic(a, off), msg: 'Vinkeln ut är inte lika stor som vinkeln in. Jämför båda med den streckade normalen.' },
      { html: mirrorPic(a, 0, true), msg: 'Ljuset går inte igenom en spegel. Det studsar tillbaka.' },
      { html: mirrorPic(a, 'back'), msg: 'Ljuset studsar bara rakt tillbaka om det kommer rakt in längs normalen.' },
    ];
    return { prompt: '', ask: 'Det blå ljuset träffar spegeln. Vilken bild visar den reflekterade (gula) strålen rätt?', hint: 'Den streckade linjen är normalen. Vinkeln in ska vara lika stor som vinkeln ut.',
      steps: ['Mät vinkeln mellan den blå strålen och normalen.', 'Den gula strålen ska ha lika stor vinkel på andra sidan normalen.'], choices: shuffle(opts) };
  } };


  // ───────────── 4. Brytning & linser ─────────────
  const brytList = [
    mc(1, 'Vad händer när ljus går snett från ett ämne in i ett annat?', 'Det byter riktning, det bryts',
      [['Det stannar', 'Ljuset fortsätter, men byter riktning.'], ['Det blir till ljud', 'Ljus blir inte ljud. Det bryts.']],
      'Pennan i vattenglaset.', ['Ljus som går in i ett nytt ämne byter riktning. Det kallas brytning.']),
    mc(1, 'Ljus går från luft in i glas. Hur bryts det?', 'Mot normalen',
      [['Från normalen', 'Från tunnare till tätare ämne bryts ljuset mot normalen. Från normalen gäller åt andra hållet.'], ['Det bryts inte alls', 'När ljuset går snett in i ett nytt ämne bryts det.']],
      'Tunnare → tätare.', ['Från tunnare till tätare ämne: mot normalen.']),
    mc(1, 'Ljus går från vatten upp i luft. Hur bryts det?', 'Från normalen',
      [['Mot normalen', 'Från tätare till tunnare ämne bryts ljuset från normalen.'], ['Det bryts inte alls', 'När ljuset går snett in i ett nytt ämne bryts det.']],
      'Tätare → tunnare.', ['Från tätare till tunnare ämne: från normalen.']),
    mc(1, 'Vad kallas en konvex lins också?', 'Samlingslins',
      [['Spridningslins', 'Spridningslins är den konkava. Den konvexa samlar strålarna.'], ['Spegel', 'En lins släpper igenom ljuset, en spegel reflekterar.']],
      'Den samlar strålarna i brännpunkten.', ['Konvex lins = samlingslins.', 'Konkav lins = spridningslins.']),
    mc(1, 'Vad kallas en konkav lins också?', 'Spridningslins',
      [['Samlingslins', 'Samlingslinsen är den konvexa. Den konkava sprider strålarna.'], ['Förstoringsglas', 'Ett förstoringsglas är en konvex lins.']],
      'Den sprider strålarna.', ['Konkav lins = spridningslins.']),
    mc(1, 'Vad kallas en lupp också?', 'Förstoringsglas',
      [['Teleskop', 'Ett teleskop är till för saker långt bort. En lupp är ett förstoringsglas.'], ['Prisma', 'Ett prisma delar upp ljus i färger.']],
      'Detektivens verktyg.', ['En lupp är ett enkelt optiskt instrument som kallas förstoringsglas.']),
    mc(1, 'Vad används ett teleskop till?', 'Att titta på saker som är långt bort',
      [['Att titta på saker som är för små för ögat', 'Det gör ett mikroskop.'], ['Att mäta ljud', 'Teleskop är för ljus.']],
      'Stjärnor och planeter.', ['Teleskop: långt bort.', 'Mikroskop: för litet att se med blotta ögat.']),
    mc(1, 'Vad används ett mikroskop till?', 'Att titta på det som är för litet att se med blotta ögat',
      [['Att titta på saker långt bort', 'Det gör ett teleskop.'], ['Att dela upp ljus i färger', 'Det gör ett prisma.']],
      'Celler och bakterier.', ['Mikroskop: för litet att se med blotta ögat.']),
    mc(2, 'I ett optiskt instrument: vad heter linsen närmast föremålet?', 'Objektiv',
      [['Okular', 'Okularet är linsen man tittar i, närmast ögat. Den närmast föremålet heter objektiv.'], ['Lupp', 'En lupp är ett eget enkelt instrument.']],
      'Objekt = föremålet.', ['Objektiv: närmast föremålet.', 'Okular: den man tittar i (oculus = öga).']),
    mc(2, 'I ett optiskt instrument: vad heter linsen man tittar i?', 'Okular',
      [['Objektiv', 'Objektivet sitter närmast föremålet. Den man tittar i heter okular.'], ['Prisma', 'Ett prisma delar upp ljus i färger.']],
      'Oculus betyder öga på latin.', ['Okular: närmast ögat.']),
    mc(2, 'Hur ser en konvex lins ut?', 'Tjockast på mitten',
      [['Tunnast på mitten', 'Det är den konkava linsen.'], ['Lika tjock överallt', 'Då bryter den inte ljuset som en lins.']],
      'Den "växer på mitten".', ['Konvex lins: tjockast på mitten.', 'Konkav lins: tunnast på mitten.']),
    mc(2, 'Hur många brännpunkter har en lins?', 'Två, en på var sida',
      [['En', 'Fälla! Ljus kan komma från båda hållen, så en lins har en brännpunkt på var sida.'], ['Ingen', 'En samlingslins samlar strålarna i en brännpunkt, och den har en på var sida.']],
      'Ljus kan komma från båda håll.', ['En lins har två brännpunkter, en på var sida.']),
    mc(2, 'Vad händer med ljus som passerar en glasruta snett?', 'Det bryts två gånger och blir lite förskjutet',
      [['Det bryts en gång och fortsätter åt ett nytt håll', 'Ljuset bryts både in i glaset och ut ur det. Det kommer ut parallellt med hur det kom in, men lite förskjutet.'], ['Det reflekteras helt', 'Det mesta går igenom, glas är genomskinligt.']],
      'In i glaset och ut ur glaset.', ['Ljuset bryts in i glaset och ut igen, två gånger.', 'Det fortsätter i samma riktning men lite förskjutet.']),
    mc(2, 'Varför ser en penna i ett vattenglas bruten ut?', 'Ljuset bryts när det går från vatten till luft',
      [['Vattnet böjer pennan', 'Pennan är rak. Det är ljuset som byter riktning.'], ['Ljuset reflekteras i glaset', 'Det handlar om brytning, inte reflektion.']],
      'Ljuset byter riktning vid vattenytan.', ['Ljuset från pennan bryts när det går från vatten till luft.', 'Därför ser pennan bruten ut.']),
    mc(2, 'Vad krävs för totalreflektion?', 'Ljuset går från tätare till tunnare ämne med stor infallsvinkel',
      [['Ljuset går från tunnare till tätare ämne', 'Det är tvärtom. Det måste vara från tätare till tunnare, till exempel från glas till luft.'], ['Ljuset kommer rakt in längs normalen', 'Rakt in går ljuset rakt igenom. Det krävs en stor infallsvinkel.']],
      'Två villkor: riktning och vinkel.', ['Från tätare till tunnare ämne.', 'Infallsvinkeln är tillräckligt stor.', 'Då reflekteras allt ljus.']),
    mc(2, 'Vad bygger fiberoptik på?', 'Totalreflektion',
      [['Ljudvågor', 'Fiberoptik leder ljus, inte ljud.'], ['Diffus reflektion', 'Ljuset studsar perfekt mot fiberns kanter genom totalreflektion.']],
      'Ljuset studsar längs insidan av fibern.', ['I en optisk fiber studsar ljuset fram genom totalreflektion.']),
    mc(2, 'Går ljuset fortare eller långsammare när det kommer in i glas?', 'Långsammare',
      [['Fortare', 'Det är ljud som går snabbare i tätare ämnen. Ljus går långsammare.'], ['Lika fort', 'Det går långsammare. Därför bryts det.']],
      'Motsatsen till ljud!', ['Ljus går långsammare i optiskt tätare ämnen.', 'Ljud går snabbare i tätare ämnen.']),
    mc(2, 'Ljus träffar en vattenyta rakt uppifrån, längs normalen. Vad händer?', 'Det går rakt igenom utan att brytas',
      [['Det bryts mot normalen', 'När ljuset redan går längs normalen finns inget att bryta.'], ['Det totalreflekteras', 'Totalreflektion kräver stor vinkel och att ljuset går från tätare till tunnare.']],
      'Brytning kräver snett infall.', ['Ljus som kommer rakt in, längs normalen, bryts inte.']),
    mc(2, 'Du tittar på en fisk i vattnet från bryggan. Var är fisken egentligen?', 'Djupare än den ser ut',
      [['Precis där den ser ut att vara', 'Ljuset bryts vid ytan, så fisken ser ut att vara närmare ytan än den är.'], ['Närmare ytan än den ser ut', 'Det är tvärtom. Fisken ser närmare ut än den är.']],
      'Ljuset bryts vid vattenytan.', ['Föremål i vatten ser närmare ytan ut än de är.', 'Sikta under fisken.']),
    mc(2, 'Vilken sorts lins är ögonlinsen?', 'Konvex',
      [['Konkav', 'Ögonlinsen samlar ljuset på näthinnan, så den är konvex.'], ['Ingen lins, en spegel', 'Ögat har en lins, ingen spegel.']],
      'Den samlar ljuset.', ['Ögonlinsen är en konvex lins, en samlingslins.']),
    tf(2, 'Infallsvinkeln är alltid lika stor som brytningsvinkeln.', false, 'Det är vid reflektion som vinklarna är lika. Vid brytning ändras vinkeln.', 'Reflektion eller brytning?'),
    tf(2, 'Konkava linser är tjockast på mitten.', false, 'Konkava linser är tunnast på mitten. Konvexa är tjockast på mitten.', 'Konkav = grotta.'),
    tf(2, 'En konvex lins kan tända eld.', true, 'En konvex lins samlar solens strålar i brännpunkten, där det blir mycket varmt.', 'Förstoringsglas i solen.'),
    mc(2, 'Vad heter linsen på bilden?', 'Konvex lins (samlingslins)',
      [['Konkav lins (spridningslins)', 'Strålarna samlas i en punkt. Det gör en konvex lins.'], ['Konvex spegel', 'Ljuset går igenom, så det är en lins, inte en spegel.']],
      'Samlas strålarna eller sprids de?', ['Strålarna samlas i brännpunkten: konvex lins.'], { prompt: lens('konvex'), wide: true }),
    mc(2, 'Vad heter linsen på bilden?', 'Konkav lins (spridningslins)',
      [['Konvex lins (samlingslins)', 'Strålarna sprids. Det gör en konkav lins.'], ['Konkav spegel', 'Ljuset går igenom, så det är en lins, inte en spegel.']],
      'Samlas strålarna eller sprids de?', ['Strålarna sprids: konkav lins.'], { prompt: lens('konkav'), wide: true }),
    mc(3, 'Vad består optiska instrument som kikare och mikroskop av?', 'En serie konvexa linser',
      [['En serie konkava speglar', 'Kikare och mikroskop använder linser. Ljuset går igenom dem.'], ['Ett prisma', 'Ett prisma delar upp ljus i färger.']],
      'Objektiv och okular.', ['Optiska instrument består av en serie konvexa linser: objektiv och okular.']),
    mc(3, 'Vilken lins behöver en person som är översynt?', 'En samlingslins',
      [['En spridningslins', 'Spridningslinser används för närsynthet. Översynthet rättas med samlingslinser.'], ['Ingen lins, en spegel', 'Glasögon har linser.']],
      'Översynta ser dåligt på nära håll. Ljuset behöver samlas mer.', ['Översynthet korrigeras med en samlingslins (konvex).']),
  ];

  const brytRay = { key: 'bryt-ray', levels: [1, 2, 3], make(L) {
    if (L === 3 && Math.random() < 0.5) {
      const a = pick([65, 70]);
      const opts = [
        { html: refrPic(a, 'glas', 'luft', { angle: a, up: true }), correct: true },
        { html: refrPic(a, 'glas', 'luft', { angle: 84 }), msg: 'Vinkeln är så stor att ljuset inte kommer ut alls. Allt reflekteras: totalreflektion.' },
        { html: refrPic(a, 'glas', 'luft', { angle: a }), msg: 'Ljuset fortsätter inte rakt. Här är vinkeln så stor att allt reflekteras.' },
        { html: refrPic(a, 'glas', 'luft', { angle: r1(a * 0.6) }), msg: 'Från glas till luft bryts ljuset från normalen, inte mot. Och med så stor vinkel blir det totalreflektion.' },
      ];
      return { prompt: '', ask: 'Ljus i glas träffar ytan mot luften med mycket stor infallsvinkel. Vilken bild visar vad som händer?', hint: 'Tätare → tunnare och stor vinkel. Vad heter det?',
        steps: ['Ljuset går från tätare (glas) till tunnare (luft).', 'Infallsvinkeln är stor.', 'Då blir det totalreflektion: allt studsar tillbaka in i glaset.'], choices: shuffle(opts) };
    }
    const pairs = L === 1 ? [['luft', 'glas']] : [['luft', 'glas'], ['luft', 'vatten'], ['vatten', 'luft'], ['glas', 'luft']];
    const [top, bot] = pick(pairs), toDense = top === 'luft';
    const a = toDense ? pick([35, 40, 45, 50]) : pick([25, 30, 35]);
    const toward = r1(a * 0.6), away = Math.min(80, r1(a * 1.5));
    const opts = [
      { html: refrPic(a, top, bot, { angle: toDense ? toward : away }), correct: true },
      { html: refrPic(a, top, bot, { angle: toDense ? away : toward }), msg: toDense ? 'Från tunnare till tätare ämne bryts ljuset mot normalen, inte från.' : 'Från tätare till tunnare ämne bryts ljuset från normalen, inte mot.' },
      { html: refrPic(a, top, bot, { angle: a }), msg: 'Ljuset byter riktning när det går snett in i ett nytt ämne. Det fortsätter inte rakt.' },
      { html: refrPic(a, top, bot, { angle: a, up: true }), msg: `Det här är reflektion. Frågan gäller strålen som går in i ${bot === 'luft' ? 'luften' : bot === 'glas' ? 'glaset' : 'vattnet'}.` },
    ];
    return { prompt: '', ask: `Ljus går från ${top} in i ${bot}. Vilken bild visar den brutna (gula) strålen rätt?`,
      hint: toDense ? 'Tunnare → tätare: mot normalen.' : 'Tätare → tunnare: från normalen.',
      steps: [`${top[0].toUpperCase() + top.slice(1)} är ${toDense ? 'tunnare' : 'tätare'} än ${bot}.`, toDense ? 'Tunnare → tätare: ljuset bryts mot normalen (vinkeln blir mindre).' : 'Tätare → tunnare: ljuset bryts från normalen (vinkeln blir större).'],
      choices: shuffle(opts) };
  } };

  // ───────────── 5. Färger & strålning ─────────────
  const fargList = [
    mc(1, 'Vad består vitt ljus av?', 'Alla färger',
      [['Bara vitt', 'Vitt ljus kan delas upp. Det innehåller alla färger.'], ['Rött, gult och blått', 'Vitt ljus innehåller alla färger i spektrumet.']],
      'Tänk på regnbågen.', ['Vitt ljus består av alla färger.']),
    mc(1, 'Vad gör ett prisma?', 'Delar upp vitt ljus i ett spektrum av färger',
      [['Gör ljuset starkare', 'Ett prisma delar upp ljuset, det förstärker inte.'], ['Samlar ljuset i en brännpunkt', 'Det gör en samlingslins.']],
      'Pink Floyd-omslaget.', ['Ett prisma delar upp vitt ljus i ett färgspektrum.', 'En regnbåge fungerar som ett prisma.']),
    mc(1, 'Varför ser en röd tröja röd ut?', 'Den reflekterar rött och absorberar de andra färgerna',
      [['Den absorberar rött och reflekterar resten', 'Det är tvärtom. Vi ser den färg som reflekteras till våra ögon.'], ['Den lyser rött själv', 'Tröjan är ingen ljuskälla. Den reflekterar det röda i ljuset.']],
      'Vi ser det som studsar in i ögat.', ['Föremål reflekterar vissa färger och absorberar andra.', 'Vi ser färgen som reflekteras.']),
    mc(1, 'Vad består en bildskärm av?', 'Små ljuspunkter som kallas pixlar',
      [['Små speglar', 'Skärmen lyser själv med pixlar.'], ['Prismor', 'Skärmen består av pixlar.']],
      'Zooma in med mobilkameran.', ['Bildskärmar består av en stor mängd ljuspunkter, pixlar.']),
    mc(1, 'Vad kallas infraröd strålning (IR) också?', 'Värmestrålning',
      [['UV-strålning', 'Fälla! UV är något annat, med kortare våglängd. IR kallas värmestrålning.'], ['Röntgenstrålning', 'Röntgen har mycket kortare våglängd. IR är värmestrålning.']],
      'Värmelampor.', ['IR = infraröd strålning = värmestrålning.']),
    mc(1, 'Vad kan UV-strålning orsaka?', 'Solbränna',
      [['Eko', 'Eko är ljud som studsar.'], ['Att mat värms i mikron', 'Det gör mikrovågor.']],
      'Solkräm skyddar mot den.', ['UV-strålning ger solbränna och kan orsaka hudcancer.']),
    mc(2, 'En röd tröja belyses med blått scenljus. Hur ser den ut?', 'Svart',
      [['Lila', 'Tröjan blandar inte färger. Den kan bara reflektera rött, och det finns inget rött i blått ljus.'], ['Röd', 'Det finns inget rött ljus att reflektera. Allt blått absorberas, så den ser svart ut.']],
      'Vad finns det att reflektera?', ['Tröjan reflekterar bara rött.', 'Blått ljus innehåller inget rött.', 'Allt absorberas: den ser svart ut.']),
    mc(2, 'Vilken färg har längst våglängd?', 'Röd',
      [['Violett', 'Violett har kortast våglängd. Röd har längst.'], ['Grön', 'Grön ligger i mitten. Röd har längst.']],
      'Infrarött ligger bortom den.', ['Röd har längst våglängd, violett kortast.']),
    mc(2, 'Vilken färg har kortast våglängd?', 'Violett',
      [['Röd', 'Röd har längst våglängd.'], ['Gul', 'Gul ligger i mitten.']],
      'Ultraviolett ligger bortom den.', ['Violett har kortast våglängd av de synliga färgerna.']),
    mc(2, 'Inom vilket område ligger synligt ljus?', 'Ungefär 380–750 nm',
      [['20–20 000 Hz', 'Det är det människan hör. Synligt ljus mäts i nanometer: 380–750 nm.'], ['300 000 km/s', 'Det är ljusets hastighet.']],
      'nm = nanometer.', ['Synligt ljus: ca 380 nm (violett) till 750 nm (röd).']),
    mc(2, 'Hur hänger våglängd och energi ihop?', 'Ju kortare våglängd, desto mer energi',
      [['Ju längre våglängd, desto mer energi', 'Det är tvärtom. Radiovågor har längst våglängd och minst energi.'], ['Våglängden spelar ingen roll', 'Våglängden avgör energin.']],
      'Gamma har kortast våglängd och är farligast.', ['Kort våglängd = mer energi.']),
    mc(2, 'Vilken strålning har mest energi?', 'Gammastrålning',
      [['Radiovågor', 'Radiovågor har minst energi.'], ['Synligt ljus', 'Synligt ljus ligger i mitten.']],
      'Kortast våglängd.', ['Gammastrålning har kortast våglängd och mest energi.']),
    mc(2, 'Vilken strålning har minst energi?', 'Radiovågor',
      [['Gammastrålning', 'Gamma har mest energi.'], ['UV-strålning', 'UV har mer energi än synligt ljus.']],
      'Längst våglängd.', ['Radiovågor har längst våglängd och minst energi.']),
    mc(2, 'Vad består ljusets partikelstråle av?', 'Fotoner',
      [['Molekyler', 'Ljudet förs fram av molekyler. Ljusets partiklar heter fotoner.'], ['Pixlar', 'Pixlar sitter i skärmar.']],
      'Foto- som i ljus.', ['Ljusets partiklar heter fotoner.']),
    mc(2, 'Hur uppför sig ljus?', 'Ibland som en partikelstråle och ibland som en vågrörelse',
      [['Bara som en vågrörelse', 'Ljus kan också uppföra sig som partiklar, fotoner.'], ['Bara som partiklar', 'Ljus kan också uppföra sig som en vågrörelse.']],
      'Två sätt.', ['Ljus beter sig både som partikelstråle (fotoner) och som vågrörelse.']),
    mc(2, 'Vad används röntgenstrålning till?', 'Att se skelettet',
      [['Fjärrkontroller', 'Fjärrkontroller använder IR.'], ['Att se foster', 'Foster undersöks med ultraljud.']],
      'På sjukhuset när du brutit armen.', ['Röntgenstrålning används för att se skelettet.']),
    mc(2, 'Vilken strålning använder en tv-fjärrkontroll?', 'IR (infraröd)',
      [['UV', 'UV ger solbränna. Fjärrkontroller använder IR.'], ['Ultraljud', 'Ultraljud är ljud, inte strålning. Fjärrkontrollen använder IR.']],
      'Syns i mobilkameran.', ['Fjärrkontroller skickar IR-ljus.']),
    mc(2, 'Vilken strålning kan vara farlig?', 'Strålning med kortare våglängd än synligt ljus',
      [['Strålning med längre våglängd än synligt ljus', 'Det är tvärtom. Kort våglängd betyder mycket energi och kan vara farligt.'], ['Allt ljus är lika farligt', 'Farligheten beror på våglängden.']],
      'UV, röntgen, gamma.', ['Kortare våglängd än synligt ljus (UV, röntgen, gamma) kan vara farligt.']),
    mc(2, 'Vad är det gemensamma namnet för radiovågor, ljus, UV och röntgen?', 'Elektromagnetisk strålning',
      [['Ljudvågor', 'Ljud är något helt annat. Det behöver ett ämne.'], ['Ultraljud', 'Ultraljud är ljud.']],
      'Elektro + magnetisk.', ['Alla typer har ett gemensamt namn: elektromagnetisk strålning.']),
    mc(2, 'Varför blir en svart tröja varmare i solen än en vit?', 'Svart absorberar allt ljus',
      [['Svart reflekterar allt ljus', 'Det är vitt som reflekterar. Svart absorberar ljuset och blir varmt.'], ['Svart är tjockare', 'Det handlar om ljuset, inte tygets tjocklek.']],
      'Därför målas hus vita i varma länder.', ['Svart absorberar allt ljus och blir varmt.', 'Vitt reflekterar allt ljus.']),
    mc(3, 'Vilken färg har ljus med våglängden 530 nm?', 'Grön',
      [['Röd', 'Röd ligger på 620–750 nm.'], ['Violett', 'Violett ligger på 380–450 nm.']],
      'Mitten av spektrumet.', ['Grön: 495–570 nm.']),
    mc(3, 'Vilken färg har ljus med våglängden 680 nm?', 'Röd',
      [['Blå', 'Blå ligger på 450–495 nm.'], ['Grön', 'Grön ligger på 495–570 nm.']],
      'Långt.', ['Röd: 620–750 nm.']),
    mc(3, 'Vilken ordning har färgerna från kortast till längst våglängd?', 'Violett, blå, grön, gul, orange, röd',
      [['Röd, orange, gul, grön, blå, violett', 'Det är från längst till kortast.'], ['Blå, violett, grön, gul, röd, orange', 'Ordningen är violett, blå, grön, gul, orange, röd.']],
      'Börja vid ultraviolett.', ['Kort → lång: violett, blå, grön, gul, orange, röd.']),
    mc(3, 'Vad skiljer olika typer av elektromagnetisk strålning åt?', 'Våglängden',
      [['Färgen på ljuskällan', 'De flesta typer kan vi inte ens se. Det som skiljer är våglängden.'], ['Hur fort de går', 'Alla går lika fort i vakuum. Det som skiljer är våglängden.']],
      'Spektrumet sorteras efter det.', ['Våglängden skiljer dem åt.']),
    tf(3, 'UV-strålning kallas också värmestrålning.', false, 'Det är IR-strålning som kallas värmestrålning. UV ger solbränna.', 'IR eller UV?'),
    tf(3, 'Vi uppfattar ljusets olika våglängder som olika färger.', true, 'Varje färg har sin våglängd, till exempel rött 620–750 nm.', 'Spektrumet.'),
  ];

  (globalThis.SvanteModules ||= {})['ljud-och-ljus'] = {
    id: 'ljud-och-ljus',
    title: 'Ljud och ljus',
    subject: 'Fysik',
    grade: 'Åk 8',
    testDate: '2026-11-12',
    topics: [
      { id: 'vagor', name: 'Ljud & vågor', glyph: '∿', subs: [...fromList(vagorList, 'vagor'), waveTon, waveStyrka, waveKombo],
        boss: { name: 'Feedback-Fantomen', c1: '#ff9d5c', c2: '#e2434b', horns: 'spikes', eyes: 2 } },
      { id: 'hora', name: 'Hörsel, eko & fart', glyph: 'Hz', subs: fromList(horaList, 'hora'),
        boss: { name: 'Eko-Ekorren', c1: '#5ff0b5', c2: '#139a7a', horns: 'antenna', eyes: 2 } },
      { id: 'spegel', name: 'Ljus & speglar', glyph: '◐', subs: [...fromList(spegelList, 'spegel'), spegelRay],
        boss: { name: 'Spegel-Spöket', c1: '#b9c3ff', c2: '#6a74c9', horns: 'none', eyes: 3 } },
      { id: 'bryt', name: 'Brytning & linser', glyph: '⟋', subs: [...fromList(brytList, 'bryt'), brytRay],
        boss: { name: 'Lins-Lurken', c1: '#5ec8ff', c2: '#2f5bea', horns: 'curl', eyes: 1 } },
      { id: 'farg', name: 'Färger & strålning', glyph: '▤', subs: fromList(fargList, 'farg'),
        boss: { name: 'Prisma-Paddan', c1: '#e07bff', c2: '#7a3cf0', horns: 'crown', eyes: 2 } },
    ],
    final: { name: 'Provbossen', c1: '#ffd46b', c2: '#ff6a3d', horns: 'crown', eyes: 3 },
  };
})();
