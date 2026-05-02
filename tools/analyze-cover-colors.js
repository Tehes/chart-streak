// Arguments:
// --dry-run  Analyze covers without writing changes to data/merged-charts.json.
// --force    Re-analyze songs that already have stored cover colors.
// --limit=N  Stop after processing N songs.

import "npm:sharp@0.34.5";
import { getSwatches } from "npm:colorthief@3.3.0";

const chartsFileUrl = new URL("../data/merged-charts.json", import.meta.url);
const textEncoder = new TextEncoder();
const saveEvery = 25;
const colorThiefOptions = {
	colorCount: 16,
	quality: 10,
};
const swatchMap = [
	["vibrant", "Vibrant"],
	["muted", "Muted"],
	["darkVibrant", "DarkVibrant"],
	["darkMuted", "DarkMuted"],
	["lightVibrant", "LightVibrant"],
	["lightMuted", "LightMuted"],
];

function parseArgs(args) {
	const options = {
		dryRun: false,
		force: false,
		limit: null,
	};

	for (const arg of args) {
		if (arg === "--dry-run") {
			options.dryRun = true;
		} else if (arg === "--force") {
			options.force = true;
		} else if (arg.startsWith("--limit=")) {
			const limit = Number.parseInt(arg.slice("--limit=".length), 10);
			if (!Number.isInteger(limit) || limit < 1) {
				throw new Error(`Invalid limit: ${arg}`);
			}
			options.limit = limit;
		} else {
			throw new Error(`Unknown argument: ${arg}`);
		}
	}

	return options;
}

function formatSwatches(swatches) {
	const colors = {};

	for (const [targetKey, swatchKey] of swatchMap) {
		colors[targetKey] = swatches[swatchKey]?.color.hex() ?? null;
	}

	return colors;
}

function getTotalSongs(charts) {
	let total = 0;

	for (const songs of Object.values(charts)) {
		total += songs.length;
	}

	return total;
}

async function fetchCover(coverUrl) {
	const response = await fetch(coverUrl);
	if (!response.ok) {
		throw new Error(`Cover request failed: ${response.status}`);
	}

	return new Uint8Array(await response.arrayBuffer());
}

async function analyzeCover(coverUrl) {
	const imageData = await fetchCover(coverUrl);
	const swatches = await getSwatches(imageData, colorThiefOptions);

	return formatSwatches(swatches);
}

async function saveCharts(charts) {
	await Deno.writeTextFile(chartsFileUrl, JSON.stringify(charts, null, 2));
}

function writeProgress(processed, total, updated, failed) {
	const progress = Math.round((processed / total) * 100);
	Deno.stdout.writeSync(
		textEncoder.encode(
			`\rProgress: ${progress}% (${processed}/${total}) updated: ${updated} failed: ${failed}`,
		),
	);
}

async function analyzeCoverColors(options) {
	const charts = JSON.parse(await Deno.readTextFile(chartsFileUrl));
	const total = getTotalSongs(charts);
	const colorCache = new Map();

	let processed = 0;
	let updated = 0;
	let failed = 0;

	for (const songs of Object.values(charts)) {
		for (const song of songs) {
			if (options.limit !== null && processed >= options.limit) {
				break;
			}

			processed++;

			const coverUrl = song.deezer?.cover;
			if (!coverUrl) {
				writeProgress(processed, total, updated, failed);
				continue;
			}

			if (song.colors && !options.force) {
				colorCache.set(coverUrl, song.colors);
				writeProgress(processed, total, updated, failed);
				continue;
			}

			try {
				if (colorCache.has(coverUrl)) {
					song.colors = colorCache.get(coverUrl);
				} else {
					song.colors = await analyzeCover(coverUrl);
					colorCache.set(coverUrl, song.colors);
				}

				updated++;

				if (!options.dryRun && updated % saveEvery === 0) {
					await saveCharts(charts);
				}
			} catch (error) {
				failed++;
				console.warn(
					`\nCould not analyze cover for "${song.artist} - ${song.title}": ${error.message}`,
				);
			}

			writeProgress(processed, total, updated, failed);
		}

		if (options.limit !== null && processed >= options.limit) {
			break;
		}
	}

	console.log();

	if (options.dryRun) {
		console.log("Dry run complete. No file was changed.");
	} else if (updated > 0) {
		await saveCharts(charts);
		console.log(`Saved cover colors to ${chartsFileUrl}.`);
	} else {
		console.log("No missing cover colors found.");
	}

	if (failed > 0) {
		console.warn(`${failed} cover(s) could not be analyzed.`);
	}
}

if (import.meta.main) {
	const options = parseArgs(Deno.args);

	analyzeCoverColors(options).catch((error) => {
		console.error(error);
		Deno.exit(1);
	});
}
