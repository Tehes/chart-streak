import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const dataDir = path.resolve("data");
const deezerBaseURL = "https://api.deezer.com/search?q=";

// Bereinige Künstlernamen
function cleanArtistName(artist) {
    return artist
        .replace(/(feat\.|featuring|&|und|starring|pres\.).*$/gi, "") // Entferne alles ab den Begriffen
        .replace(/\([^)]*\)/g, "") // Entferne Inhalte in Klammern
        .replace(/\s{2,}/g, " ") // Reduziere mehrere Leerzeichen auf eines
        .trim(); // Entferne führende und nachfolgende Leerzeichen
}

// Bereinige Songtitel
function cleanTitle(title) {
    return title
        .replace(/\([^)]*\)/g, "") // Entferne Inhalte in runden Klammern
        .replace(/\s{2,}/g, " ") // Reduziere mehrere Leerzeichen
        .trim(); // Entferne führende und nachfolgende Leerzeichen
}

// Deezer-Suche für einen Song mit dynamischem Jahr
async function searchDeezer(title, artist, year) {
    const cleanedArtist = cleanArtistName(artist); // Bereinige Künstlernamen
    const cleanedTitle = cleanTitle(title);       // Bereinige Titel
    const query = encodeURIComponent(`${cleanedTitle} ${cleanedArtist}`);
    const url = `${deezerBaseURL}${query}&order=ALBUM_ASC`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data && data.data && data.data.length > 0) {
            // Priorisiere Ergebnisse, die dem Jahr entsprechen
            const originalMatch = data.data.find(track =>
                track.release_date && track.release_date.startsWith(year.toString())
            );

            const result = originalMatch || data.data[0]; // Fallback auf erstes Ergebnis
            await new Promise(resolve => setTimeout(resolve, 1000)); // API-Limit

            return {
                deezerId: result.id,
                preview: result.preview,
                cover: result.album.cover_big,
                deezerArtist: result.artist.name, // Rückgabewert von Deezer
                deezerTitle: result.title         // Rückgabewert von Deezer
            };
        }
    } catch (error) {
        console.error(`Error fetching data for query "${query}":`, error.message);
        console.log(`No results for: "${title}" by "${artist}"`);
        return null; // Rückgabe bei Fehler
    }

    console.log(`No results for: "${title}" by "${artist}"`); // Keine Treffer
    return null;
}

// Anreichern der Daten für ein Jahr mit Fortschrittsanzeige
async function enrichYear(year) {
    const filePath = path.join(dataDir, `charts_${year}.json`);
    const outputFilePath = path.join(dataDir, `charts_${year}_enriched.json`);

    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return;
    }

    if (fs.existsSync(outputFilePath)) {
        console.log(`Enriched data for ${year} already exists. Skipping...`);
        return;
    }

    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    console.log(`Enriching data for year ${year}...`);

    let processed = 0;
    const total = data.length;

    for (const song of data) {
        const deezerData = await searchDeezer(song.title, song.artist, year); // Jahr übergeben
        if (deezerData) {
            song.deezer = deezerData; // Füge Deezer-Daten hinzu
        }
        processed++;

        // Fortschrittsanzeige
        const progress = Math.round((processed / total) * 100);
        process.stdout.write(`\rProgress: ${progress}% (${processed}/${total})`);
    }

    console.log(); // Neue Zeile nach der Fortschrittsanzeige
    fs.writeFileSync(outputFilePath, JSON.stringify(data, null, 2));
    console.log(`Saved enriched data to ${outputFilePath}`);
}

// Alle Jahre anreichern
async function enrichAllYears(startYear, endYear) {
    for (let year = startYear; year <= endYear; year++) {
        console.log(`Processing year ${year}...`);
        const start = Date.now();

        await enrichYear(year);

        // Warten, falls das Jahr weniger als 10 Minuten dauert
        // const elapsed = (Date.now() - start) / 1000; // Zeit in Sekunden
        // const waitTime = Math.max(600 - elapsed, 0); // Zielzeit 10 Minuten
        // if (waitTime > 0) {
        //     console.log(`Waiting ${waitTime.toFixed(0)} seconds before processing next year...`);
        //     await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
        // }
    }

    console.log("All years processed.");
}

// Starte den Anreicherungsprozess
enrichAllYears(1979, 1979).catch(console.error);