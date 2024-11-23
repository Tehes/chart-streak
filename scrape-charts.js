import puppeteer from "puppeteer"; // Puppeteer importieren
import fs from "fs"; // File System importieren
import path from "path"; // Importiere path für plattformübergreifende Pfade

// Stelle sicher, dass der Ordner 'data' existiert
const dataDir = path.resolve("data");
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true }); // Erstelle den Ordner, falls er nicht existiert
}

async function scrapeYear(year) {
    const url = `https://www.offiziellecharts.de/charts/single-jahr/for-date-${year}`;
    let browser; // Browser-Variable vor der Try-Catch-Logik definieren

    try {
        browser = await puppeteer.launch({ headless: true }); // Headless-Mode aktivieren
        const page = await browser.newPage();
        await page.goto(url, { timeout: 60000 }); // Timeout auf 60 Sekunden erhöhen
        console.log(`Scraping data for ${year}...`);

        // Tabelle mit den Top 100 Songs scrapen
        const songs = await page.evaluate(() => {
            const rows = document.querySelectorAll(".chart-table tbody tr");
            const results = [];
            rows.forEach(row => {
                const rank = row.querySelector(".ch-pos .this-week")?.textContent.trim();
                const artist = row.querySelector(".info-artist")?.textContent.trim();
                const title = row.querySelector(".info-title")?.textContent.trim();

                if (rank && artist && title) {
                    results.push({
                        rank: parseInt(rank, 10),
                        artist,
                        title
                    });
                }
            });
            return results;
        });

        return songs;

    } catch (error) {
        console.error(`Failed to scrape data for ${year} at URL ${url}:`, error.message);
        return []; // Gib ein leeres Array zurück, falls das Jahr fehlschlägt

    } finally {
        if (browser) await browser.close(); // Browser immer schließen
    }
}

async function scrapeAllYears(startYear, endYear) {
    const allData = {};

    for (let year = startYear; year <= endYear; year++) {
        const filePath = path.join(dataDir, `charts_${year}.json`);

        // Fortschritt sichern: Überspringe Jahre, die bereits gespeichert wurden
        if (fs.existsSync(filePath)) {
            console.log(`Data for ${year} already exists. Skipping...`);
            continue;
        }

        const yearData = await scrapeYear(year);
        allData[year] = yearData;

        // Speichere jedes Jahr separat als JSON-Datei
        fs.writeFileSync(
            filePath,
            JSON.stringify(yearData, null, 2)
        );
        console.log(`Saved data for ${year} to data/charts_${year}.json`);
    }
}

// Starte den Scraping-Prozess
scrapeAllYears(1978, 2023).catch(console.error);