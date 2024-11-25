import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const dataDir = path.resolve("data");
const deezerBaseURL = "https://api.deezer.com/search?q=";

// Bereinige Künstlernamen
function cleanArtistName(artist) {
    return artist
        .replace(/^(the|a|an)\s+/i, "") // Entferne Artikel am Anfang
        .replace(/'/g, "") // Entferne einfache Apostrophe
        .replace(/’/g, "") // Entferne typografische Apostrophe
        .replace(/(feat\.|featuring|&|und|starring|pres\.|with).*$/gi, "") // Entferne alles ab den Begriffen
        .replace(/\./g, "") // Entferne Punkte aus Künstlernamen
        .replace(/\([^)]*\)/g, "") // Entferne Inhalte in Klammern
        .replace(/\s{2,}/g, " ") // Reduziere mehrere Leerzeichen auf eines
        .trim(); // Entferne führende und nachfolgende Leerzeichen
}

// Bereinige Songtitel
function cleanTitle(title) {
    return title
        .replace(/'/g, "") // Entferne einfache Apostrophe
        .replace(/’/g, "") // Entferne typografische Apostrophe
        .replace(/\([^)]*\)/g, "") // Entferne Inhalte in runden Klammern
        .replace(/-/g, " ") // Ersetze Bindestriche durch Leerzeichen
        .replace(/\s{2,}/g, " ") // Reduziere mehrere Leerzeichen
        .replace(/[.,\/#!$%\^&\*;:{}=\_`~()?]/g, "") // Entferne alle Interpunktionszeichen
        .trim(); // Entferne führende und nachfolgende Leerzeichen
}

// Vergleicht, ob Teile des bereinigten Künstlernamens im Deezer-Künstlernamen enthalten sind.
function isArtistNameSimilar(deezerArtist, cleanedArtist) {
    const normalize = str => str
        .replace(/\./g, "") // Entferne Punkte
        .replace(/'/g, "") // Entferne einfache Apostrophe
        .replace(/’/g, "") // Entferne typografische Apostrophe
        .replace(/\s{2,}/g, " ") // Reduziere mehrere Leerzeichen
        .trim()
        .toLowerCase();

    const deezerArtistNormalized = normalize(deezerArtist);
    const cleanedArtistNormalized = normalize(cleanedArtist);

    const artistParts = cleanedArtist
        .split(/[+\/,]/) // Zerlege Künstlernamen in Teile
        .map(part => normalize(part));

    if (
        deezerArtistNormalized.includes(cleanedArtistNormalized) ||
        cleanedArtistNormalized.includes(deezerArtistNormalized)
    ) {
        return true;
    }

    // Prüfe sowohl mit "&", "and" und "und"
    return artistParts.some(part => {
        const variations = [
            part,
            part.replace(/\band\b/g, "&"), // "and" -> "&"
            part.replace(/\bund\b/g, "&"), // "und" -> "&"
            part.replace(/&/g, "and"),     // "&" -> "and"
            part.replace(/&/g, "und"),      // "&" -> "und"
            part.replace(/\b'N\b/g, "&"),     // "'N'" -> "&"
            part.replace(/\b'N\b/g, "and"),   // "'N'" -> "and"
            part.replace(/\b'N\b/g, "und"),    // "'N'" -> "und"
            part.replace(/\b'n\b/g, "&"),     // "'n'" -> "&"
            part.replace(/\b'n\b/g, "and"),   // "'n'" -> "and"
            part.replace(/\b'n\b/g, "und")    // "'n'" -> "und"
        ];

        // Überprüfe alle Varianten
        return variations.some(variation => deezerArtistNormalized.includes(variation));
    });
}

// Vergleicht, ob Teile des bereinigten Titels im Deezer-Titel enthalten sind.
function isTitleSimilar(deezerTitle, cleanedTitle) {
    const normalize = str => str
        .replace(/\([^)]*\)/g, "") // Entferne Inhalte in Klammern
        .replace(/'/g, "") // Entferne einfache Apostrophe
        .replace(/’/g, "") // Entferne typografische Apostrophe
        .replace(/\./g, "") // Entferne Punkte
        .replace(/-/g, " ") // Ersetze Bindestriche durch Leerzeichen
        .replace(/\s{2,}/g, " ") // Reduziere mehrere Leerzeichen
        .replace(/[.,\/#!$%\^&\*;:{}=\_`~()?]/g, "") // Entferne alle Interpunktionszeichen
        .replace(/ß/g, "ss")
        .replace(/ö/g, "oe")
        .replace(/ä/g, "ae")
        .replace(/ü/g, "ue")
        .replace(/\b(the|and|a|an|und|mit|von)\b/gi, "") // Entferne Stopwörter
        .trim()
        .toLowerCase();

    const deezerTitleNormalized = normalize(deezerTitle);
    const cleanedTitleNormalized = normalize(cleanedTitle);

    const deezerWords = deezerTitleNormalized.split(/\s+/);
    const cleanedWords = cleanedTitleNormalized.split(/\s+/);

    // Berechnung der Übereinstimmung
    const matchingWords = cleanedWords.filter(word => deezerWords.includes(word));
    const matchPercentage = (matchingWords.length / cleanedWords.length) * 100;

    // Dynamischer Schwellenwert: Kürzere Titel erlauben geringere Übereinstimmung
    const threshold = cleanedWords.length <= 3 ? 50 : 70;

    return matchPercentage >= threshold;
}

// Funktion zur Überprüfung, ob ein Titel "Remix" enthält
function isRemix(originalTitle, deezerTitle) {
    const includesRemix = str => str.toLowerCase().includes("remix");
    return !includesRemix(originalTitle) && includesRemix(deezerTitle);
}

function shouldExcludeTitle(title) {
    const normalizedTitle = title.toLowerCase().trim();
    return (
        normalizedTitle.includes("instrumental") ||
        normalizedTitle.includes("medley")
    );
}

// Deezer-Suche
async function searchDeezer(title, artist, year, retryCount = 0) {
    if (retryCount > 3) {
        console.error(`Max retries reached for query "${title}" by "${artist}"`);
        return null;
    }

    const cleanedArtist = cleanArtistName(artist);
    const cleanedTitle = cleanTitle(title);
    const query = encodeURIComponent(`${cleanedTitle} ${cleanedArtist}`);
    const url = `${deezerBaseURL}${query}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data && data.data && data.data.length > 0) {
            for (const result of data.data) {
                const deezerArtist = result.artist.name;

                if (
                    isArtistNameSimilar(deezerArtist, cleanedArtist) &&
                    isTitleSimilar(result.title_short, cleanedTitle) &&
                    !isRemix(cleanedTitle, result.title) &&
                    !shouldExcludeTitle(result.title)
                ) {
                    await new Promise(resolve => setTimeout(resolve, 2000)); // API-Limit
                    return {
                        deezerID: result.id,
                        deezerLink: result.link,
                        cover: result.album.cover_big,
                        deezerArtist: deezerArtist,
                        deezerTitle: result.title_short
                    };
                }
            }
        }
    } catch (error) {
        console.error(`Error fetching data for query "${query}":`, error.message);

        // Wartezeit vor erneutem Versuch
        console.log("Retrying...");
        await new Promise(resolve => setTimeout(resolve, 5000));
        return await searchDeezer(title, artist, year, retryCount + 1);
    }

    console.log(`No results for: "${title}" by "${artist}"`);
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
enrichAllYears(1991, 2000).catch(console.error);