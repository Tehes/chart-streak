import { START_YEAR, END_YEAR } from "../config.js";
import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";

const chartsDirUrl = new URL("../data/charts/", import.meta.url);

async function fileExists(fileUrl) {
    try {
        await Deno.stat(fileUrl);
        return true;
    } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
            return false;
        }
        throw error;
    }
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
        console.error(`Failed to scrape data for ${year} at URL ${url}:`, error);
        return []; // Gib ein leeres Array zurück, falls das Jahr fehlschlägt

    } finally {
        if (browser) await browser.close(); // Browser immer schließen
    }
}

async function scrapeAllYears() {
    const allData = {};

    await Deno.mkdir(chartsDirUrl, { recursive: true });

    for (let year = START_YEAR; year <= END_YEAR; year++) {
        const fileUrl = new URL(`charts_${year}.json`, chartsDirUrl);

        // Fortschritt sichern: Überspringe Jahre, die bereits gespeichert wurden
        if (await fileExists(fileUrl)) {
            console.log(`Data for ${year} already exists. Skipping...`);
            continue;
        }

        const yearData = await scrapeYear(year);
        allData[year] = yearData;

        // Speichere jedes Jahr separat als JSON-Datei
        await Deno.writeTextFile(fileUrl, JSON.stringify(yearData, null, 2));
        console.log(`Saved data for ${year} to ${fileUrl}`);
    }
}

if (import.meta.main) {
    scrapeAllYears().catch(console.error);
}
