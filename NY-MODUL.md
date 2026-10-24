# Så skapar du en ny modul (prov eller läxa)

Ge Claude bilder på provmaterialet och be: "Läs NY-MODUL.md och gör en ny modul av de här bilderna."

## 1. Läs materialet
Konvertera HEIC-bilder först: `sips -s format jpeg bild.HEIC --out bild.jpg`.
Lista vilka **områden** provet täcker och vilka **uppgiftstyper** som finns per område och nivå (böckerna har ofta Nivå 1–3).

## 2. Skapa mappen
```
modules/<id>/index.html   – kopiera från modules/tal-och-rakning/index.html, byt id i Svante.start(...)
modules/<id>/module.js    – modulens innehåll
```
`<id>` = kort namn utan å/ä/ö och mellanslag, t.ex. `algebra-1` eller `engelska-v12`.

## 3. Skriv module.js
```js
(globalThis.SvanteModules ||= {})['<id>'] = {
  id: '<id>', title: 'Titel', subject: 'Matte', grade: 'Åk 8', testDate: 'ÅÅÅÅ-MM-DD',
  topics: [
    { id: 'neg', name: 'Negativa tal', glyph: '−3', subs: SvanteGen.neg, boss: { name: 'Minus-Monstret', c1: '#5ec8ff', c2: '#2f5bea', horns: 'spikes', eyes: 2 } },
  ],
  final: { name: 'Provbossen', c1: '#ffd46b', c2: '#ff6a3d', horns: 'crown', eyes: 3 },
};
```
- Boss: `horns` = `spikes | curl | antenna | crown | none`, `eyes` = `1 | 2 | 3`. Ge varje område egen färg och ett roligt namn.
- **Matte:** återanvänd generatorer i `engine/gen-math.js` (`neg`, `fracs`, `decs`, `tid`, `eq`, `line`, `text`). Saknas en uppgiftstyp, lägg till en ny generator där i stället för att hårdkoda frågor. Varje generator måste ha `hint`, `steps` och helst `traps` (vanliga felsvar med en förklaring av just det felet).
- **Andra ämnen:** använd fasta frågor:
  ```js
  subs: SC.fromList([
    { level: 1, ask: 'Vad betyder "sustainable"?', prompt: 'sustainable', hint: '…', steps: ['…'],
      choices: [{ html: 'hållbar', correct: true }, { html: 'snabb', correct: false, msg: 'Varför fel…' }] },
  ], 'glosor')
  ```
  Ett tal som svar fungerar också: `answer: 12`, `'3/4'` eller `'0,5'` (då används knappsatsen).

## 4. Lägg till i startsidan
Lägg till ett objekt i `modules/manifest.js` med `id`, `path`, `title`, `subject`, `grade`, `about`, `testDate`, `added` (dagens datum), `glyph`, `color`.

## 5. Kontrollera
```
node tools/check.mjs
```
Skriptet kör alla generatorer hundratals gånger, räknar om uttrycken oberoende och stoppar om ett svar, en fälla eller ett flervalsalternativ är fel. Öppna sedan modulen i webbläsaren i mobilbredd och spela en omgång.

## Pedagogiska principer
- Felsvar ska förklara **elevens** misstag, inte bara visa rätt svar.
- Steg-för-steg ska vara korta, en tanke per steg.
- Nivå 1 = flerval, nivå 2–3 = eget svar via knappsatsen. Appen höjer nivån automatiskt.
