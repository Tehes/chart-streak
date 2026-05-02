# Deezer-Readability-Check pro Jahr

Bitte prüfe die Deezer-Readability für das Jahr `<YEAR>`.

## Wichtig

- Nur dieses eine Jahr prüfen.
- Nicht automatisch mit dem nächsten Jahr weitermachen.
- Nicht `merged-charts.json` neu bauen.
- Keinen Merge-Task ausführen.
- Keine anderen Jahre anfassen.
- Kein Service-Worker-Bump nur wegen enriched-Daten.
- Die Prüfung dient nur dazu, problematische Deezer-Verknüpfungen in der enriched-Datei zu finden und gezielt zu korrigieren.

## Ablauf

Exakt in dieser Reihenfolge arbeiten:

1. Prüfe kurz, ob die enriched-Datei für `<YEAR>` existiert:

   ```text
   data/enriched/charts_<YEAR>_enriched.json
   ```

1. Führe den Deezer-Readability-Check für genau dieses Jahr aus:

   ```bash
   deno task check <YEAR>
   ```

1. Warte, bis der Lauf vollständig bei 100% abgeschlossen ist.

1. Werte alle ausgegebenen Problemzeilen aus.

1. Berücksichtige die Spalte `problem`:

   ```text
   not_readable
   api_error:...
   request_failed:...
   missing_deezer
   ```

1. Liste alle betroffenen Songs zuerst mit Rank, Titel, Artist, Deezer-ID und Problem auf.

1. Suche nur diese betroffenen Songs manuell über:

   ```text
   https://api.deezer.com/search?q=...
   ```

1. Ersetze nur sichere, bessere Deezer-Matches in:

   ```text
   data/enriched/charts_<YEAR>_enriched.json
   ```

1. Entferne keine vorhandenen Deezer-Daten, außer der bestehende Match ist eindeutig falsch und es gibt keinen sicheren Ersatz.

## Matching-Regeln

- Keine Karaoke-Versionen übernehmen.
- Keine Tribute- oder Cover-Versionen übernehmen.
- Keine Instrumentalversion übernehmen, wenn der gesuchte Chartsong eigentlich eine gesungene Version ist.
- Keine Remixe übernehmen, außer der Remix ist eindeutig der gesuchte Chart-Song.
- Keine offensichtlich falschen Artist-Credits übernehmen.
- Bei unsicherem Treffer lieber den bestehenden Eintrag unverändert lassen oder ungelöst markieren.
- Schreibvarianten sind okay, wenn Track und Artist eindeutig passen.
- Artist-Aliase sind okay, wenn sie eindeutig sind.
- Album-Versionen, Single-Versionen und Remaster sind okay, wenn der Song eindeutig derselbe ist.
- Wenn kein sicherer Ersatz auffindbar ist, am Ende als ungelöst auflisten.

## Abschlussbericht

Am Ende bitte kurz berichten:

- Welche enriched-Datei geprüft wurde.
- Wie viele Problemzeilen der erste Check ausgegeben hat.
- Welche Songs korrigiert wurden, jeweils mit:
  - Rank
  - Artist
  - Titel
  - alte Deezer-Track-ID
  - neue Deezer-Track-ID
  - Deezer-Artist
  - Deezer-Titel
- Welche Songs bewusst nicht geändert wurden und warum, jeweils mit Rank.
- Welche Dateien geändert wurden.
- Welche Problemzeilen der zweite Readability-Check noch ausgegeben hat und warum sie nicht gelöst wurden.
