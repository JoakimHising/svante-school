// Svante School – spelmotor: modulens startsida, Boss Fight, resultat. Används av alla moduler via Svante.start(modul).
(function (G) {
  'use strict';
  const { Q, formatter, fillers, parseInput, grade, normalize, numberLine, shuffle, pick } = G.SC;

  // ───────────── Lagring ─────────────
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* privat läge */ } },
  };

  // ───────────── Ljud (syntetiserat, inga filer) ─────────────
  const Sound = {
    ctx: null,
    muted: store.get('svante:muted', false),
    ensure() {
      if (!this.ctx) { const AC = G.AudioContext || G.webkitAudioContext; if (AC) this.ctx = new AC(); }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },
    tone(f, t, dur, type = 'triangle', vol = 0.16, f2) {
      const c = this.ctx, o = c.createOscillator(), g = c.createGain(), t0 = c.currentTime + t;
      o.type = type; o.frequency.setValueAtTime(f, t0);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.03);
    },
    noise(t, dur, vol = 0.2, freq = 1200) {
      const c = this.ctx, len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq; g.gain.value = vol;
      s.connect(f).connect(g).connect(c.destination); s.start(c.currentTime + t);
    },
    play(name) {
      if (this.muted) return;
      this.ensure(); if (!this.ctx) return;
      const T = (...a) => this.tone(...a);
      switch (name) {
        case 'tap': T(880, 0, 0.035, 'square', 0.03); break;
        case 'correct': T(660, 0, 0.09); T(990, 0.07, 0.16); break;
        case 'hit': this.noise(0.05, 0.14, 0.35, 900); T(240, 0.05, 0.14, 'square', 0.07, 80); break;
        case 'wrong': T(220, 0, 0.3, 'sawtooth', 0.09, 110); break;
        case 'hurt': this.noise(0.08, 0.22, 0.25, 300); break;
        case 'almost': T(560, 0, 0.08); T(560, 0.12, 0.08); break;
        case 'hint': T(740, 0, 0.08, 'sine', 0.12); T(1110, 0.08, 0.14, 'sine', 0.1); break;
        case 'heal': T(523, 0, 0.1, 'sine'); T(784, 0.08, 0.18, 'sine'); break;
        case 'levelup': [523, 659, 784, 1047].forEach((f, i) => T(f, i * 0.08, 0.16, 'square', 0.07)); break;
        case 'win': [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => T(f, i * 0.1, 0.2, 'square', 0.07)); break;
        case 'lose': [392, 330, 262, 196].forEach((f, i) => T(f, i * 0.18, 0.3, 'sawtooth', 0.06)); break;
      }
    },
  };

  // ───────────── Framsteg ─────────────
  // Per område: nivå 1–3. Tre rätt i rad utan ledtråd → nivå upp. Två fel i rad → nivå ner.
  const key = mod => `svante:mod:${mod.id}`;
  const loadP = mod => store.get(key(mod), { topics: {}, wins: {} });
  const tstate = (p, id) => (p.topics[id] ||= { level: 1, streak: 0, miss: 0, hist: [] });
  const readiness = ts => {
    if (!ts || !ts.hist.length) return 0;
    const acc = ts.hist.reduce((a, b) => a + b, 0) / ts.hist.length;
    return Math.round((((ts.level - 1) / 2) * 0.6 + acc * 0.4) * 100);
  };
  const overall = (mod, p) => Math.round(mod.topics.reduce((a, t) => a + readiness(p.topics[t.id]), 0) / mod.topics.length);
  function record(ts, ok, hinted) {
    ts.hist.push(ok ? (hinted ? 0.5 : 1) : 0);
    if (ts.hist.length > 10) ts.hist.shift();
    if (ok && !hinted) {
      ts.miss = 0;
      if (++ts.streak >= 3 && ts.level < 3) { ts.level++; ts.streak = 0; return 'up'; }
    } else if (!ok) {
      ts.streak = 0;
      if (++ts.miss >= 2 && ts.level > 1) { ts.level--; ts.miss = 0; return 'down'; }
    }
    return null;
  }

  // ───────────── Ikoner ─────────────
  const I = {
    back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    sound: '<svg viewBox="0 0 24 24"><path class="fill" d="M3.5 9.5h4l5-4v13l-5-4h-4z"/><path d="M16 9a4.5 4.5 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>',
    mute: '<svg viewBox="0 0 24 24"><path class="fill" d="M3.5 9.5h4l5-4v13l-5-4h-4z"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5"/></svg>',
    heart: '<svg viewBox="0 0 24 24" class="heart"><path d="M12 21s-7.6-4.7-9.7-9.3C.8 8.3 3 4.4 6.8 4.4c2.1 0 3.6 1.2 5.2 3 1.6-1.8 3.1-3 5.2-3 3.8 0 6 3.9 4.5 7.3C19.6 16.3 12 21 12 21z"/></svg>',
    bulb: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.1v.1h5v-.1c0-.8.4-1.6 1.1-2.1A6 6 0 0 0 12 3z"/></svg>',
    chev: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
    del: '<svg viewBox="0 0 24 24"><path d="M9 5.5h11.5v13H9L3 12z"/><path d="M12.5 9.5l5 5M17.5 9.5l-5 5"/></svg>',
    sword: '<svg viewBox="0 0 24 24"><path d="M14.5 3.5H20.5V9.5L10 20l-6-6z"/><path d="M7 13l4 4M3.5 20.5l3-3"/></svg>',
  };

  // ───────────── Bossar som SVG ─────────────
  let gid = 0;
  function bossSVG(b) {
    const id = `bg${++gid}`, c1 = b.c1, c2 = b.c2, ink = '#16122c';
    const horns = {
      spikes: `<path d="M64 66 L52 20 L88 54 Z" fill="${c2}"/><path d="M136 66 L148 20 L112 54 Z" fill="${c2}"/>`,
      curl: `<path d="M66 66 C38 58 38 24 62 18 C52 34 60 48 82 54 Z" fill="${c2}"/><path d="M134 66 C162 58 162 24 138 18 C148 34 140 48 118 54 Z" fill="${c2}"/>`,
      antenna: `<path d="M84 52 L72 18 M116 52 L128 18" stroke="${c2}" stroke-width="6" fill="none"/><circle cx="72" cy="16" r="8" fill="${c1}"/><circle cx="128" cy="16" r="8" fill="${c1}"/>`,
      crown: `<path d="M60 56 L66 14 L84 38 L100 8 L116 38 L134 14 L140 56 Z" fill="#ffd34d" stroke="#e0a21b" stroke-width="3"/><circle cx="100" cy="30" r="5" fill="#ff5a76"/>`,
      none: '',
    }[b.horns || 'none'];
    const eye = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/><circle cx="${x + r * 0.15}" cy="${y + r * 0.12}" r="${r * 0.48}" fill="${ink}"/><circle cx="${x + r * 0.32}" cy="${y - r * 0.12}" r="${r * 0.16}" fill="#fff"/>`;
    const eyes = {
      1: `${eye(100, 94, 24)}<path d="M70 64 Q100 76 130 64" stroke="${ink}" stroke-width="7" fill="none"/>`,
      2: `${eye(78, 98, 15)}${eye(122, 98, 15)}<path d="M60 76 L92 86 M140 76 L108 86" stroke="${ink}" stroke-width="7" fill="none"/>`,
      3: `${eye(72, 104, 12)}${eye(128, 104, 12)}${eye(100, 82, 11)}<path d="M56 86 L84 94 M144 86 L116 94" stroke="${ink}" stroke-width="6" fill="none"/>`,
    }[b.eyes || 2];
    return `<svg class="boss-svg" viewBox="0 0 200 200" aria-hidden="true">
      <defs><radialGradient id="${id}" cx="38%" cy="28%" r="80%"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient></defs>
      <ellipse cx="100" cy="184" rx="60" ry="9" class="boss-shadow"/>
      <g class="boss-body">
        ${horns}
        <path d="M44 124 C22 128 18 148 26 158" stroke="${c2}" stroke-width="14" fill="none"/>
        <path d="M156 124 C178 128 182 148 174 158" stroke="${c2}" stroke-width="14" fill="none"/>
        <path d="M38 150 C26 96 54 46 100 46 C146 46 174 96 162 150 C154 180 46 180 38 150 Z" fill="url(#${id})"/>
        <ellipse cx="100" cy="146" rx="40" ry="22" fill="#fff" opacity="0.1"/>
        <ellipse cx="74" cy="66" rx="16" ry="9" fill="#fff" opacity="0.18" transform="rotate(-25 74 66)"/>
        <g class="boss-eyes">${eyes}</g>
        <path d="M68 132 Q100 164 132 132 Q100 142 68 132 Z" fill="${ink}"/>
        <path d="M80 134 l6 12 l6 -10 Z M108 136 l6 10 l6 -12 Z" fill="#fff"/>
      </g>
    </svg>`;
  }

  // ───────────── Hjälpare ─────────────
  let MOD, P, S, root;
  const $ = s => root.querySelector(s);
  const topicOf = id => MOD.topics.find(t => t.id === id);
  const setColors = (c1, c2) => { document.body.style.setProperty('--c1', c1); document.body.style.setProperty('--c2', c2); };
  const muteBtn = () => `<button class="iconbtn mute" aria-label="${Sound.muted ? 'Slå på ljud' : 'Stäng av ljud'}">${Sound.muted ? I.mute : I.sound}</button>`;
  const save = () => { P.summary = { readiness: overall(MOD, P), updated: Date.now() }; store.set(key(MOD), P); };
  function daysLeft(date) {
    if (!date) return '';
    const d = Math.round((new Date(date + 'T00:00:00') - new Date(new Date().toDateString())) / 864e5);
    if (d < 0) return 'Provet har varit';
    if (d === 0) return 'Provet är idag!';
    if (d === 1) return 'Provet är imorgon';
    return `Provet om ${d} dagar`;
  }
  const toast = text => { const t = document.createElement('div'); t.className = 'toast'; t.textContent = text; document.body.appendChild(t); setTimeout(() => t.remove(), 1900); };

  document.addEventListener('click', e => {
    const m = e.target.closest('.mute');
    if (!m) return;
    Sound.muted = !Sound.muted; store.set('svante:muted', Sound.muted);
    document.querySelectorAll('.mute').forEach(b => { b.innerHTML = Sound.muted ? I.mute : I.sound; b.setAttribute('aria-label', Sound.muted ? 'Slå på ljud' : 'Stäng av ljud'); });
    Sound.play('tap');
  });

  // ───────────── Modulens startsida ─────────────
  function home() {
    S = null;
    setColors('#8b9bff', '#5a5ff0');
    const r = overall(MOD, P), F = MOD.final;
    root.innerHTML = `<main class="screen home">
      <div class="topbar"><a class="iconbtn" href="${MOD.hub || '../../index.html'}" aria-label="Alla prov">${I.back}</a><span class="eyebrow">${MOD.subject} · ${MOD.grade}</span>${muteBtn()}</div>
      <section class="hero"><h1>${MOD.title}</h1>${MOD.testDate ? `<span class="pill">${daysLeft(MOD.testDate)}</span>` : ''}</section>
      <section class="card ready">
        <div class="ready-top"><span class="eyebrow">Provberedskap</span><span class="ready-num">${r}<small>%</small></span></div>
        <div class="meter"><div style="width:${r}%"></div></div>
        <p class="muted">${r === 0 ? 'Slåss mot en boss för att se var du står.' : r < 50 ? 'Bra start. Fortsätt med de områden som har lägst procent.' : r < 85 ? 'Du är på god väg. Sikta på nivå 3 i alla områden.' : 'Du är redo. Kör Provbossen för att hålla formen.'}</p>
      </section>
      <button class="final" data-go="final">${bossSVG(F)}<span><h3>${F.name}</h3><p>Blandade frågor från alla områden, mest från det du behöver öva på.</p></span>${I.chev}</button>
      <h2 class="section-label">Områden</h2>
      <div class="topics">${MOD.topics.map(t => {
        const ts = P.topics[t.id], rd = readiness(ts), lvl = ts ? ts.level : 1;
        return `<button class="topic" data-go="${t.id}" style="--tc:${t.boss.c1}">
          <span class="glyph">${t.glyph}</span>
          <span class="t-main"><span class="t-name">${t.name}</span><span class="t-sub">Boss: ${t.boss.name}</span><span class="meter"><div style="width:${rd}%"></div></span></span>
          <span class="t-right"><span class="t-pct">${rd}%</span><span class="pips" aria-label="Nivå ${lvl} av 3">${[1, 2, 3].map(i => `<i class="${i <= lvl ? 'on' : ''}"></i>`).join('')}</span></span>
          ${I.chev}</button>`;
      }).join('')}</div>
      <p class="legend">Staplarna visar nivå 1–3. Tre rätt i rad utan ledtråd ger nästa nivå.</p>
    </main>`;
    root.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { Sound.play('tap'); battle(b.dataset.go === 'final' ? null : b.dataset.go); }));
  }

  // ───────────── Boss Fight ─────────────
  const MAX_HEARTS = 5, BASE_DMG = 14;

  function battle(topicId) {
    const boss = topicId ? topicOf(topicId).boss : MOD.final;
    const startLevels = Object.fromEntries(MOD.topics.map(t => [t.id, tstate(P, t.id).level]));
    S = { topicId, boss, hp: 100, hearts: MAX_HEARTS, combo: 0, maxCombo: 0, asked: 0, right: 0, wrong: 0, retries: [], lastKey: null, startLevels, startReady: overall(MOD, P), busy: false };
    setColors(boss.c1, boss.c2);
    root.innerHTML = `<main class="screen battle">
      <div class="hud"><button class="iconbtn" data-act="quit" aria-label="Avsluta">${I.close}</button><div class="hearts" aria-label="Liv"></div><span class="combo" hidden></span>${muteBtn()}</div>
      <section class="stage"><div class="boss-wrap">${bossSVG(boss)}</div><div class="boss-name">${boss.name}</div><div class="hp" role="progressbar" aria-label="Bossens liv"><div class="hp-ghost" style="width:100%"></div><div class="hp-fill" style="width:100%"></div></div></section>
      <section class="card qcard"><div class="chips"></div><p class="ask"></p><div class="prompt"></div><div class="hintbox" hidden></div></section>
      <section class="answer"></section>
    </main>`;
    $('[data-act=quit]').addEventListener('click', () => { Sound.play('tap'); home(); });
    $('.prompt').addEventListener('click', e => {
      const hit = e.target.closest('.nl-hit');
      if (!hit || S.busy || S.q.kind !== 'place') return;
      S.sel = +hit.dataset.tick;
      $('.prompt').innerHTML = placeLine();
      $('[data-act=place]').disabled = false;
      Sound.play('tap');
    });
    renderHud();
    next();
  }

  function pickTopic() {
    const w = MOD.topics.map(t => 110 - readiness(P.topics[t.id]));
    let r = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < w.length; i++) if ((r -= w[i]) <= 0) return MOD.topics[i];
    return MOD.topics[0];
  }

  function makeQ(topic, level, subKey) {
    let subs = topic.subs.filter(s => s.levels.includes(level));
    if (!subs.length) {
      const dist = s => Math.min(...s.levels.map(l => Math.abs(l - level)));
      const best = Math.min(...topic.subs.map(dist));
      subs = topic.subs.filter(s => dist(s) === best);
    }
    let sub = subKey && topic.subs.find(s => s.key === subKey);
    if (!sub) { const fresh = subs.filter(s => s.key !== S.lastKey); sub = pick(fresh.length ? fresh : subs); }
    const L = sub.levels.includes(level) ? level : sub.levels[0];
    const q = normalize(sub.make(L));
    Object.assign(q, { topic, sub: sub.key, level: L });
    q.kind = q.mode || (q.place ? 'place' : L === 1 ? 'choice' : 'input');
    return q;
  }

  function next() {
    closeSheet();
    const due = S.retries.findIndex(r => r.due <= S.asked);
    let q;
    if (due >= 0) {
      const r = S.retries.splice(due, 1)[0];
      q = makeQ(topicOf(r.topicId), r.level, r.key);
      q.retry = true;
    } else {
      const t = S.topicId ? topicOf(S.topicId) : pickTopic();
      q = makeQ(t, tstate(P, t.id).level);
    }
    S.lastKey = q.sub;
    Object.assign(S, { q, hinted: false, busy: false, sel: null, input: { neg: false, whole: null, num: '', den: null } });
    S.asked++;
    renderQuestion();
  }

  function renderHud() {
    $('.hearts').innerHTML = Array.from({ length: MAX_HEARTS }, (_, i) => I.heart.replace('class="heart"', `class="heart${i < S.hearts ? '' : ' lost'}"`)).join('');
    const c = $('.combo');
    c.hidden = S.combo < 2;
    c.textContent = `Combo ×${S.combo}`;
    $('.hp-fill').style.width = `${S.hp}%`;
    $('.hp-ghost').style.width = `${S.hp}%`;
  }

  function renderQuestion() {
    const q = S.q, card = $('.qcard');
    card.classList.remove('good', 'bad');
    $('.battle').classList.toggle('compact', q.kind !== 'choice' || !!q.wide);
    $('.chips').innerHTML = `<span class="chip">${q.topic.name}</span><span class="chip">Nivå ${q.level}</span>${q.retry ? '<span class="chip retry">Revansch</span>' : ''}
      <button class="hintbtn" ${q.hint ? '' : 'disabled'}>${I.bulb}Ledtråd</button>`;
    const ask = $('.ask');
    ask.innerHTML = q.ask || '';
    ask.classList.toggle('long', (q.ask || '').length > 60);
    const pr = $('.prompt');
    pr.classList.toggle('wide', !!q.wide);
    pr.innerHTML = q.kind === 'place' ? placeLine() : q.prompt || '';
    const hb = $('.hintbox');
    hb.hidden = true; hb.innerHTML = '';
    $('.hintbtn').addEventListener('click', e => {
      S.hinted = true; e.currentTarget.disabled = true;
      hb.innerHTML = `${q.hint}<br><span class="muted" style="font-size:13px">Ledtråd ger halv skada.</span>`; hb.hidden = false;
      Sound.play('hint');
    });
    const ans = $('.answer');
    if (q.kind === 'choice') renderChoices(ans);
    else if (q.kind === 'place') renderPlace(ans);
    else renderInput(ans);
  }

  // Flerval
  function renderChoices(ans) {
    const q = S.q, fa = formatter(q.fa), unit = q.unit ? ` <small class="muted">${q.unit}</small>` : '';
    let list;
    if (q.choices) list = q.choices;
    else {
      const traps = (q.traps || []).slice(0, 2).map(([v, m]) => [Q.of(v), m]);
      const fill = fillers(q.answer, 3 - traps.length, traps.map(t => t[0]));
      list = shuffle([{ html: fa(q.answer) + unit, correct: true }, ...traps.map(([v, m]) => ({ html: fa(v) + unit, correct: false, msg: m })), ...fill.map(v => ({ html: fa(v) + unit, correct: false }))]);
    }
    S.choices = list;
    const long = list.some(c => c.html.replace(/<[^>]+>/g, '').length > 11);
    ans.innerHTML = `<div class="choices${long ? ' stack' : ''}">${list.map((c, i) => `<button class="choice" data-i="${i}">${c.html}</button>`).join('')}</div>`;
    ans.querySelectorAll('.choice').forEach(b => b.addEventListener('click', () => pickChoice(+b.dataset.i)));
  }
  function pickChoice(i) {
    if (S.busy || !S.choices[i]) return;
    const c = S.choices[i], btns = root.querySelectorAll('.choice');
    btns.forEach((b, j) => { if (S.choices[j].correct) b.classList.add('right'); else if (j === i) b.classList.add('wrong'); else b.classList.add('dim'); });
    c.correct ? onRight() : onWrong(c.msg || null);
  }

  // Egen inmatning med knappsats
  function renderInput(ans) {
    const mixed = S.q.fa === 'mixed';
    const keys = ['7', '8', '9', 'del', '4', '5', '6', 'frac', '1', '2', '3', 'neg', mixed ? 'mix' : ',', '0', 'ok'];
    const label = { del: I.del, frac: '<span class="fk">BRÅK</span>', mix: '<span class="fk">BLANDAD</span>', neg: '<span>±</span>', ok: 'SVARA' };
    const aria = { del: 'Radera', frac: 'Bråkstreck', mix: 'Blandad form: siffrorna blir heltal', neg: 'Byt tecken', ok: 'Svara' };
    ans.innerHTML = `<div class="inputrow"><div class="display" aria-live="polite"></div>${S.q.unit ? `<span class="unit">${S.q.unit}</span>` : ''}</div>
      <p class="note" hidden></p>
      <div class="keypad">${keys.map(k => `<button class="key${label[k] ? (k === 'ok' ? ' ok' : ' fn') : ''}" data-k="${k}" aria-label="${aria[k] || k}">${label[k] || k}</button>`).join('')}</div>`;
    ans.querySelectorAll('.key').forEach(b => b.addEventListener('click', () => press(b.dataset.k)));
    renderDisplay();
  }
  function renderDisplay() {
    const st = S.input, d = $('.display');
    if (!d) return;
    const sign = st.neg ? '−' : '';
    if (st.whole != null) d.innerHTML = `${sign}${st.whole}<span class="frac"><span class="${st.den === null ? 'on' : ''}">${st.num}</span><span class="${st.den !== null ? 'on' : ''}">${st.den ?? ''}</span></span>`;
    else if (st.den === null) d.innerHTML = st.num || st.neg ? `<span class="caret">${sign}${st.num}</span>` : '<span class="ph">?</span><span class="caret"></span>';
    else d.innerHTML = `${sign}<span class="frac"><span>${st.num}</span><span class="on">${st.den}</span></span>`;
  }
  function press(k) {
    if (S.busy) return;
    const st = S.input, part = st.den === null ? 'num' : 'den';
    const note = $('.note'); if (note) note.hidden = true;
    if (/^\d$/.test(k)) { if (st[part].length < 7) st[part] += k; }
    else if (k === ',') { if (!st[part].includes(',')) st[part] += st[part] ? ',' : '0,'; }
    else if (k === 'del') {
      if (part === 'den' && st.den === '') st.den = null;
      else if (st[part]) st[part] = st[part].slice(0, -1);
      else if (st.whole != null) { st.num = st.whole; st.whole = null; }
      else if (st.neg) st.neg = false;
    }
    else if (k === 'mix') { if (st.whole == null && st.den === null && st.num) { st.whole = st.num; st.num = ''; } }
    else if (k === 'frac') { if (st.den === null && st.num && !st.num.endsWith(',')) st.den = ''; }
    else if (k === 'neg') st.neg = !st.neg;
    else if (k === 'ok') return submitInput();
    Sound.play('tap');
    renderDisplay();
  }
  function submitInput() {
    const parsed = parseInput(S.input), d = $('.display');
    if (!parsed) { d.classList.remove('shake'); void d.offsetWidth; d.classList.add('shake'); Sound.play('almost'); return; }
    const g = grade(S.q, parsed);
    if (g.almost) {
      const n = $('.note'); n.textContent = g.msg; n.hidden = false; Sound.play('almost');
      return;
    }
    S.lastValue = parsed.v;
    g.ok ? onRight() : onWrong(g.msg);
  }

  // Tallinje: tryck på rätt streck
  const placeLine = (marks = S.sel !== null && S.sel !== undefined ? [{ tick: S.sel, label: '?' }] : []) => numberLine({ ...S.q.place.spec, marks, interactive: true });
  function renderPlace(ans) {
    ans.innerHTML = `<p class="place-help">Tryck på ett streck och svara.</p><button class="btn" data-act="place" disabled>Svara</button>`;
    $('[data-act=place]').addEventListener('click', () => {
      if (S.busy || S.sel === null) return;
      const p = S.q.place;
      if (S.sel === p.tick) onRight();
      else { const t = p.traps.find(([tk]) => tk === S.sel); onWrong(t ? t[1] : null); }
    });
  }

  // ───────────── Rätt / fel ─────────────
  function onRight() {
    const q = S.q;
    S.busy = true; S.right++;
    const ev = record(tstate(P, q.topic.id), true, S.hinted);
    let dmg = Math.round(BASE_DMG * (1 + 0.15 * Math.min(S.combo, 5)) * (S.hinted ? 0.5 : 1));
    if (q.retry) dmg += 4;
    S.combo++; S.maxCombo = Math.max(S.maxCombo, S.combo);
    const healed = q.retry && S.hearts < MAX_HEARTS;
    if (healed) S.hearts++;
    S.hp = Math.max(0, S.hp - dmg);
    save();

    $('.qcard').classList.add('good');
    Sound.play('correct');
    setTimeout(() => {
      Sound.play('hit');
      const wrap = $('.boss-wrap');
      if (!wrap) return;
      wrap.classList.remove('hit'); void wrap.offsetWidth; wrap.classList.add('hit');
      floater(`−${dmg}`);
      sparks();
      if (healed) { floater('+1 liv', 'heal'); Sound.play('heal'); }
      renderHud();
      if (S.combo >= 2) { const c = $('.combo'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
      const heart = root.querySelectorAll('.heart')[S.hearts - 1];
      if (healed && heart) heart.classList.add('pop');
    }, 180);
    if (q.retry) setTimeout(() => toast('Revansch!'), 250);
    if (ev === 'up') setTimeout(() => { toast(`Nivå ${tstate(P, q.topic.id).level} i ${q.topic.name}!`); Sound.play('levelup'); }, q.retry ? 900 : 350);
    setTimeout(() => (S.hp <= 0 ? win() : next()), ev === 'up' ? 1500 : 1000);
  }

  function onWrong(msg) {
    const q = S.q;
    S.busy = true; S.wrong++; S.combo = 0;
    record(tstate(P, q.topic.id), false, S.hinted);
    S.hearts--;
    S.retries.push({ topicId: q.topic.id, key: q.sub, level: q.level, due: S.asked + 2 });
    save();

    $('.qcard').classList.add('bad');
    Sound.play('wrong');
    const wrap = $('.boss-wrap');
    wrap.classList.remove('attack'); void wrap.offsetWidth; wrap.classList.add('attack');
    setTimeout(() => {
      Sound.play('hurt');
      const scr = $('.screen'); scr.classList.remove('shake'); void scr.offsetWidth; scr.classList.add('shake');
      const h = document.createElement('div'); h.className = 'hurt'; document.body.appendChild(h); setTimeout(() => h.remove(), 650);
      renderHud();
    }, 220);
    setTimeout(() => openSheet(msg), 650);
  }

  function floater(text, cls = '') {
    const el = document.createElement('div'); el.className = `dmg ${cls}`; el.textContent = text;
    $('.stage').appendChild(el); setTimeout(() => el.remove(), 1000);
  }
  function sparks() {
    const st = $('.stage');
    for (let i = 0; i < 12; i++) {
      const s = document.createElement('div'), a = (Math.PI * 2 * i) / 12 + Math.random() * 0.4, r = 50 + Math.random() * 40;
      s.className = 'spark';
      s.style.setProperty('--dx', `${Math.cos(a) * r}px`); s.style.setProperty('--dy', `${Math.sin(a) * r}px`);
      if (i % 3 === 0) s.style.background = 'var(--gold)';
      st.appendChild(s); setTimeout(() => s.remove(), 700);
    }
  }

  // Förklaring vid fel
  function openSheet(msg) {
    const q = S.q;
    let correct;
    if (q.kind === 'choice' && S.choices) correct = S.choices.find(c => c.correct).html;
    else if (q.kind === 'place') correct = numberLine({ ...q.place.spec, marks: [{ tick: q.place.tick, label: '✓', cls: 'good' }, ...(S.sel !== q.place.tick ? [{ tick: S.sel, label: '✗', cls: 'bad' }] : [])] });
    else correct = formatter(q.fa)(q.answer) + (q.unit ? ` ${q.unit}` : '');
    const scrim = document.createElement('div'); scrim.className = 'scrim';
    const sh = document.createElement('section'); sh.className = 'sheet'; sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-label', 'Förklaring');
    sh.innerHTML = `<h2>${S.hearts > 0 ? 'Inte riktigt' : 'Slut på liv'}</h2>
      ${msg ? `<div class="diag">${msg}</div>` : ''}
      <div class="answer-line">${q.kind === 'place' ? 'Rätt plats:' : 'Rätt svar:'} ${q.kind === 'place' ? correct : `<b>${correct}</b>`}</div>
      <ol class="steps">${(q.steps || []).map((s, i) => `<li style="animation-delay:${0.15 + i * 0.35}s"><span>${s}</span></li>`).join('')}</ol>
      <p class="muted" style="margin:0;font-size:14px">En liknande fråga kommer snart igen. Klarar du den får du tillbaka ett liv.</p>
      <button class="btn" data-act="cont">${S.hearts > 0 ? 'Jag fattar' : 'Se resultat'} ${I.chev}</button>`;
    document.body.append(scrim, sh);
    sh.querySelector('[data-act=cont]').addEventListener('click', () => { Sound.play('tap'); S.hearts > 0 ? next() : result(false); });
    sh.querySelector('[data-act=cont]').focus({ preventScroll: true });
  }
  function closeSheet() { document.querySelectorAll('.sheet, .scrim').forEach(e => e.remove()); }

  function win() {
    const k = S.topicId || 'final';
    P.wins[k] = (P.wins[k] || 0) + 1; save();
    $('.boss-wrap').classList.add('dead');
    Sound.play('win');
    setTimeout(() => result(true), 1200);
  }

  function result(won) {
    closeSheet();
    if (!won) Sound.play('lose');
    const after = overall(MOD, P), b = S.boss, total = S.right + S.wrong;
    const pct = total ? Math.round((S.right / total) * 100) : 0;
    const ups = MOD.topics.filter(t => tstate(P, t.id).level > S.startLevels[t.id]);
    root.innerHTML = `<main class="screen result ${won ? 'win' : 'lose'}">
      <div class="boss-wrap">${bossSVG(b)}</div>
      <h1>${won ? `${b.name} är besegrad!` : `${b.name} vann den här gången`}</h1>
      <p>${won ? (S.hearts === MAX_HEARTS ? 'Utan att tappa ett enda liv. Snyggt!' : `Du klarade det med ${S.hearts} liv kvar.`) : 'Alla fel du gjorde har gjort dig bättre förberedd. Kör igen, frågorna du missade kommer tillbaka.'}</p>
      <div class="stats">
        <div class="card stat"><b>${S.right}/${total}</b><span>rätt svar (${pct}%)</span></div>
        <div class="card stat"><b>×${S.maxCombo}</b><span>bästa combo</span></div>
        <div class="card stat"><b>${after}%</b><span>provberedskap${after !== S.startReady ? ` (${after > S.startReady ? '+' : ''}${after - S.startReady})` : ''}</span></div>
      </div>
      ${ups.length ? `<div class="levelups">${ups.map(t => `<span class="chip">${t.name}: nivå ${tstate(P, t.id).level}</span>`).join('')}</div>` : ''}
      <div class="actions"><button class="btn" data-act="again">${I.sword} Slåss igen</button><button class="btn ghost" data-act="home">Tillbaka</button></div>
    </main>`;
    if (won) $('.boss-wrap').classList.add('defeated');
    const tid = S.topicId;
    $('[data-act=again]').addEventListener('click', () => { Sound.play('tap'); battle(tid); });
    $('[data-act=home]').addEventListener('click', () => { Sound.play('tap'); home(); });
  }

  // Tangentbord på dator
  document.addEventListener('keydown', e => {
    if (!S || !S.q || e.metaKey || e.ctrlKey) return;
    const cont = document.querySelector('.sheet [data-act=cont]');
    if (cont) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cont.click(); } return; }
    if (S.busy) return;
    if (S.q.kind === 'choice' && /^[1-4]$/.test(e.key)) return pickChoice(+e.key - 1);
    if (S.q.kind !== 'input') return;
    const map = { Backspace: 'del', Enter: 'ok', '-': 'neg', '/': 'frac', ',': ',', '.': ',', ' ': 'mix' };
    const k = /^\d$/.test(e.key) ? e.key : map[e.key];
    const btn = k && root.querySelector(`.key[data-k="${k}"]`);
    if (!btn) return;
    e.preventDefault();
    btn.classList.add('press'); setTimeout(() => btn.classList.remove('press'), 100);
    press(k);
  });

  G.Svante = {
    start(mod) {
      MOD = mod;
      P = loadP(mod);
      root = document.getElementById('app');
      document.title = `${mod.title} · Svante School`;
      home();
    },
    bossSVG,
    readinessOf(id) { return store.get(`svante:mod:${id}`, null)?.summary?.readiness ?? null; },
  };
})(window);
