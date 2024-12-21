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
    const seenDeezerIDs = new Map(); // Map für DeezerID und Jahr des ersten Vorkommens

    const files = fs.readdirSync(dataDir).sort(); // Ältere Jahre zuerst

    files.forEach((file) => {
        const filePath = path.join(dataDir, file);

        try {
            const fileContent = fs.readFileSync(filePath, "utf-8");
            const yearData = JSON.parse(fileContent);

            const yearMatch = file.match(/\d{4}/);
            if (!yearMatch) {
                console.warn(`Dateiname enthält keine Jahreszahl: ${file}`);
                return;
            }
            const currentYear = yearMatch[0];

            if (!mergedData[currentYear]) {
                mergedData[currentYear] = [];
            }

            yearData.forEach((song) => {
                if (!song.deezer || !song.deezer.deezerID) {
                    return;
                }

                const deezerID = song.deezer.deezerID;
                if (seenDeezerIDs.has(deezerID)) {
                    const firstYear = seenDeezerIDs.get(deezerID);
                    console.log(
                        `Song ignoriert (Duplikat): ${song.title} (${deezerID}), erstes Jahr: ${firstYear}, ignoriert in Jahr: ${currentYear}`
                    );
                    return;
                }

                mergedData[currentYear].push(song);
                seenDeezerIDs.set(deezerID, currentYear); // DeezerID mit aktuellem Jahr registrieren
            });
        } catch (error) {
            console.error(`Fehler beim Verarbeiten der Datei ${file}:`, error.message);
        }
    });

    for (let year = 1978; year <= 2024; year++) {
        if (!mergedData[year]) {
            mergedData[year] = [];
        }
    }

    try {
        fs.writeFileSync(outputFile, JSON.stringify(mergedData, null, 2), "utf-8");
        console.log(`Zusammengeführte Daten wurden in ${outputFile} gespeichert.`);
    } catch (error) {
        console.error(`Fehler beim Speichern der Datei: ${error.message}`);
    }
};

// Skript ausführen
mergeCharts();