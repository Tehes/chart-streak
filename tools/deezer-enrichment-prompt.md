# Deezer-Enrichment pro Jahr

Bitte bearbeite das Deezer-Enrichment für das Jahr `<YEAR>`.

## Wichtig

- Nur dieses eine Jahr bearbeiten.
- Nicht automatisch mit dem nächsten Jahr weitermachen.
- Nicht `merged-charts.json` neu bauen.
- Keinen Merge-Task ausführen.
- Keine anderen Jahre anfassen.
- Kein Service-Worker-Bump nur wegen enriched-Daten.
- Der Merge kommt später gesammelt, wenn alle noch offenen Jahre bis 1978 bearbeitet sind.

## Ablauf

Exakt in dieser Reihenfolge arbeiten:

1. Prüfe kurz, ob `tools/enrich-charts.js` gezielt ein einzelnes Jahr verarbeiten kann, z. B.:

   ```bash
   deno run -A tools/enrich-charts.js <YEAR>
   ```

2. Falls nicht, ergänze minimal einen Jahresparameter, ohne die Matching-Logik zu verändern.

3. Lösche nur:

   ```text
   data/enriched/charts_<YEAR>_enriched.json
   ```

4. Erzeuge die enriched-Datei für `<YEAR>` komplett neu:

   ```bash
   deno run -A tools/enrich-charts.js <YEAR>
   ```

5. Warte, bis der Lauf vollständig bei 100% abgeschlossen ist.

6. Prüfe danach, welche Einträge in dieser Datei noch kein `deezer`-Objekt haben:

   ```text
   data/enriched/charts_<YEAR>_enriched.json
   ```

7. Liste diese fehlenden Songs zuerst mit Rank, Titel und Artist auf.

8. Suche ausschließlich diese fehlenden Songs manuell über:

   ```text
   https://api.deezer.com/search?q=...
   ```

9. Verifiziere passende Treffer zusätzlich über:

   ```text
   https://www.deezer.com/de/track/<TRACK_ID>
   ```

10. Ergänze nur sichere Deezer-Matches in der enriched-Datei.

## Matching-Regeln

- Keine Karaoke-Versionen übernehmen.
- Keine Tribute- oder Cover-Versionen übernehmen.
- Keine Instrumentalversion übernehmen, wenn der gesuchte Chartsong eigentlich eine gesungene Version ist.
- Keine Remixe übernehmen, außer der Remix ist eindeutig der gesuchte Chart-Song.
- Keine offensichtlich falschen Artist-Credits übernehmen.
- Bei unsicherem Treffer lieber nicht ergänzen.
- Schreibvarianten sind okay, wenn Track und Artist eindeutig passen.
- Artist-Aliase sind okay, wenn sie eindeutig sind.
- Wenn ein Song nicht sicher auffindbar ist, am Ende als ungelöst auflisten.

## Validierung

- Prüfe die Anzahl fehlender Deezer-Objekte in:

  ```text
  data/enriched/charts_<YEAR>_enriched.json
  ```

- Prüfe für neu ergänzte Deezer-Tracks:
  - API-Endpunkt erreichbar
  - HTTP 200
  - `readable === true`, falls das Feld vorhanden ist

- Prüfe nicht `merged-charts.json`, weil sie jetzt bewusst nicht neu gebaut wird.

## Abschlussbericht

Am Ende bitte kurz berichten:

- Welche enriched-Datei gelöscht und neu erzeugt wurde.
- Wie viele Deezer-Objekte nach dem Neu-Enrichment fehlten.
- Welche Songs ergänzt wurden, jeweils mit:
  - Rank
  - Artist
  - Titel
  - Deezer-Track-ID
  - Deezer-Artist
  - Deezer-Titel
- Welche Songs bewusst nicht ergänzt wurden und warum, jeweils mit Rank.
- Welche Dateien geändert wurden.
- Ob die Validierung der enriched-Datei erfolgreich war.
