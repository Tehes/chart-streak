import { START_YEAR, END_YEAR } from "../config.js";

const dataDirUrl = new URL("../data/enriched/", import.meta.url);
const outputFileUrl = new URL("../data/merged-charts.json", import.meta.url);

async function mergeCharts() {
    const mergedData = {};
    const seenDeezerIDs = new Map(); // Map für DeezerID und deren Details
    const ignoredSongs = []; // Liste für ignorierte Songs

    const files = [];
    for await (const entry of Deno.readDir(dataDirUrl)) {
        if (entry.isFile) {
            files.push(entry.name);
        }
    }
    files.sort(); // Ältere Jahre zuerst

    for (const file of files) {
        const fileUrl = new URL(file, dataDirUrl);

        try {
            const fileContent = await Deno.readTextFile(fileUrl);
            const yearData = JSON.parse(fileContent);

            const yearMatch = file.match(/\d{4}/);
            if (!yearMatch) {
                console.warn(`Dateiname enthält keine Jahreszahl: ${file}`);
                continue;
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

                if (typeof deezerID === "string") {
                    console.log(`Achtung: DeezerID ist ein String:`, {
                        Year: currentYear,
                        Rank: song.rank
                    });
                }

                if (seenDeezerIDs.has(deezerID)) {
                    const { year: firstYear, rank: firstRank } = seenDeezerIDs.get(deezerID);
                    ignoredSongs.push({
                        Title: song.title,
                        DeezerID: deezerID,
                        "Erstes Jahr": firstYear,
                        "Platzierung (erstes Jahr)": firstRank,
                        "Ignoriertes Jahr": currentYear,
                        "Platzierung (ignoriert)": song.rank

                    });
                    return;
                }

                mergedData[currentYear].push(song);
                seenDeezerIDs.set(deezerID, { year: currentYear, rank: song.rank }); // DeezerID mit Jahr und Rank speichern
            });
        } catch (error) {
            console.error(`Fehler beim Verarbeiten der Datei ${file}:`, error.message);
        }
    }

    for (let year = START_YEAR; year <= END_YEAR; year++) {
        if (!mergedData[year]) {
            mergedData[year] = [];
        }
    }

    try {
        await Deno.writeTextFile(outputFileUrl, JSON.stringify(mergedData, null, 2));
        console.log(`Zusammengeführte Daten wurden in ${outputFileUrl} gespeichert.`);
    } catch (error) {
        console.error(`Fehler beim Speichern der Datei: ${error.message}`);
    }

    // Zeige ignorierte Songs in einer Tabelle
    if (ignoredSongs.length > 0) {
        console.table(ignoredSongs);
    } else {
        console.log("Keine Duplikate gefunden.");
    }
}

if (import.meta.main) {
    mergeCharts().catch(console.error);
}
