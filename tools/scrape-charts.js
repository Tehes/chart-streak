import { END_YEAR, START_YEAR } from "../config.js";
import puppeteer from "npm:puppeteer-core";

const chartsDirUrl = new URL("../data/charts/", import.meta.url);

// Use the locally installed Chrome on macOS. You can override this via env var.
const CHROME_EXECUTABLE_PATH = Deno.env.get("CHROME_EXECUTABLE_PATH") ??
	"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SCRAPE_RETRY_LIMIT = 3;
const SCRAPE_RETRY_DELAY_MS = 2000;
const NAVIGATION_TIMEOUT_MS = 60000;

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

function wait(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scrapeYear(year) {
	const url = `https://www.offiziellecharts.de/charts/single-jahr/for-date-${year}`;
	for (let attempt = 1; attempt <= SCRAPE_RETRY_LIMIT; attempt++) {
		let browser;
		let userDataDir;

		try {
			userDataDir = await Deno.makeTempDir();
			browser = await puppeteer.launch({
				headless: true,
				executablePath: CHROME_EXECUTABLE_PATH,
				userDataDir,
			}); // Headless-Mode aktivieren
			const page = await browser.newPage();
			await page.goto(url, { timeout: NAVIGATION_TIMEOUT_MS, waitUntil: "domcontentloaded" });
			await page.waitForSelector(".chart-table tbody tr", { timeout: NAVIGATION_TIMEOUT_MS });
			console.log(`Scraping data for ${year}...`);

			// Tabelle mit den Top 100 Songs scrapen
			const songs = await page.evaluate(() => {
				const rows = document.querySelectorAll(".chart-table tbody tr");
				const results = [];
				rows.forEach((row) => {
					const rank = row.querySelector(".ch-pos .this-week")?.textContent.trim();
					const artist = row.querySelector(".info-artist")?.textContent.trim();
					const title = row.querySelector(".info-title")?.textContent.trim();
					const detailPath = row.querySelector(".ch-pos .drill-down")?.getAttribute("href");
					const detailUrl = detailPath ? new URL(detailPath, location.origin).href : null;

					if (rank && artist && title) {
						results.push({
							rank: parseInt(rank, 10),
							artist,
							title,
							detailUrl,
						});
					}
				});
				return results;
			});

			return songs;
		} catch (error) {
			console.error(
				`Failed to scrape data for ${year} at URL ${url} (attempt ${attempt}/${SCRAPE_RETRY_LIMIT}):`,
				error,
			);
			if (attempt === SCRAPE_RETRY_LIMIT) {
				return []; // Gib ein leeres Array zurück, falls das Jahr fehlschlägt
			}
			await wait(SCRAPE_RETRY_DELAY_MS);
		} finally {
			if (browser) {
				await browser.close(); // Browser immer schließen
			}
			if (userDataDir) {
				try {
					await Deno.remove(userDataDir, { recursive: true });
				} catch (error) {
					if (!(error instanceof Deno.errors.NotFound)) {
						console.warn(`Could not remove temp profile for ${year}:`, error);
					}
				}
			}
		}
	}

	return [];
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
