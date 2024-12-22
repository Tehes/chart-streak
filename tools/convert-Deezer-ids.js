import { START_YEAR, END_YEAR } from "../config.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Setup für __dirname in ESM-Modulen
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Verzeichnis definieren
const dataDir = path.join(__dirname, "../data/enriched");

// Funktion zum Konvertieren von DeezerIDs und Überschreiben der Dateien
const processAllYears = () => {
    for (let year = START_YEAR; year <= END_YEAR; year++) {
        const filePath = path.join(dataDir, `charts_${year}_enriched.json`);

        try {
            if (!fs.existsSync(filePath)) {
                console.warn(`Datei für Jahr ${year} nicht gefunden: ${filePath}`);
                continue;
            }

            const fileContent = fs.readFileSync(filePath, "utf-8");
            const yearData = JSON.parse(fileContent);

            // Konvertiere DeezerIDs und protokolliere Änderungen
            const updatedData = yearData.map((song) => {
                if (song.deezer && typeof song.deezer.deezerID === "string") {
                    const numericDeezerID = Number(song.deezer.deezerID);
                    if (!isNaN(numericDeezerID)) {
                        console.log(`Konvertiere DeezerID für Jahr ${year}:`, {
                            OldDeezerID: song.deezer.deezerID,
                            NewDeezerID: numericDeezerID
                        });
                        song.deezer.deezerID = numericDeezerID;
                    }
                }
                return song;
            });

            // Überschreibe die Datei mit den aktualisierten Daten
            fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2), "utf-8");
            console.log(`Datei für Jahr ${year} wurde aktualisiert: ${filePath}`);
        } catch (error) {
            console.error(`Fehler beim Verarbeiten der Datei ${filePath}:`, error.message);
        }
    }
};

// Skript ausführen
processAllYears();