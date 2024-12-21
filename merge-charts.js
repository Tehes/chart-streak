import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Setup für __dirname in ESM-Modulen
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Verzeichnisse und Zielpfad definieren
const dataDir = path.join(__dirname, "data/enriched");
const outputFile = path.join(__dirname, "data/merged-charts.json");

// Funktion zur Zusammenführung der Daten
const mergeCharts = () => {
    const mergedData = {};
    const seenDeezerIDs = new Set();

    // Alle Dateien im Ordner 'data/enriched' lesen
    const files = fs.readdirSync(dataDir).sort(); // Sortiere Dateien, damit ältere Jahre zuerst verarbeitet werden

    files.forEach((file) => {
        const filePath = path.join(dataDir, file);

        // JSON-Datei einlesen und parsen
        try {
            const fileContent = fs.readFileSync(filePath, "utf-8");
            const yearData = JSON.parse(fileContent);

            // Jahreszahl aus dem Dateinamen extrahieren
            const yearMatch = file.match(/\d{4}/);
            if (!yearMatch) {
                console.warn(`Dateiname enthält keine Jahreszahl: ${file}`);
                return;
            }
            const year = yearMatch[0];

            // Initialisiere das Jahr, falls noch nicht vorhanden
            if (!mergedData[year]) {
                mergedData[year] = [];
            }

            // Songs verarbeiten
            yearData.forEach((song) => {
                if (!song.deezer || !song.deezer.deezerID) {
                    console.warn(`Song ohne DeezerID übersprungen: ${JSON.stringify(song)}`);
                    return;
                }

                // Prüfen, ob der Song schon existiert (basierend auf DeezerID)
                if (seenDeezerIDs.has(song.deezer.deezerID)) {
                    console.log(`Song ignoriert (Duplikat): ${song.title} (${song.deezer.deezerID})`);
                    return;
                }

                // Song hinzufügen und seine DeezerID registrieren
                mergedData[year].push(song);
                seenDeezerIDs.add(song.deezer.deezerID);
                console.log(`Song hinzugefügt: ${song.title} (${song.deezer.deezerID}) in Jahr ${year}`);
            });
        } catch (error) {
            console.error(`Fehler beim Verarbeiten der Datei ${file}:`, error.message);
        }
    });

    // Fehlende Jahre initialisieren
    for (let year = 1978; year <= 2024; year++) {
        if (!mergedData[year]) {
            mergedData[year] = [];
        }
    }

    // Zusammengeführte Daten speichern
    try {
        fs.writeFileSync(outputFile, JSON.stringify(mergedData, null, 2), "utf-8");
        console.log(`Zusammengeführte Daten wurden in ${outputFile} gespeichert.`);
    } catch (error) {
        console.error(`Fehler beim Speichern der Datei: ${error.message}`);
    }
};

// Skript ausführen
mergeCharts();