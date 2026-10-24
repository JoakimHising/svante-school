# Svante School

Statisk webbapp (ingen build) för att öva inför prov. Hostas på GitHub Pages.

- `engine/` – gemensam motor: `core.js` (exakta bråktal, rättning), `gen-math.js` (mattegeneratorer), `game.js` (UI, Boss Fight), `style.css`.
- `modules/<id>/` – ett prov/läxa per mapp. `modules/manifest.js` listar dem på startsidan.
- Ny modul: följ `NY-MODUL.md`.
- Ändra aldrig motorn för en enskild modul; lägg till generatorer eller frågetyper generellt.
- Kör `node tools/check.mjs` efter varje ändring i generatorer eller moduler.
- All text i appen på svenska, skriven för en 14-åring. Minustecken `−`, decimalkomma.
