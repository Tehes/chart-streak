const enrichedDirUrl = new URL("../data/enriched/", import.meta.url);
const delayMs = 2000;
const defaultYear = "1983";
const textEncoder = new TextEncoder();

function getInputFileUrl(input) {
	if (!input) {
		return null;
	}

	if (/^\d{4}$/.test(input)) {
		return new URL(`charts_${input}_enriched.json`, enrichedDirUrl);
	}

	if (input.endsWith(".json")) {
		return new URL(input, enrichedDirUrl);
	}

	return new URL(`charts_${input}_enriched.json`, enrichedDirUrl);
}

function extractYearLabel(input) {
	if (!input) {
		return "";
	}

	const match = input.match(/(19|20)\d{2}/);
	return match ? match[0] : "";
}

function formatLine(song, yearLabel, deezerId) {
	const yearValue = yearLabel || "";
	const artist = song.artist || "";
	const title = song.title || "";
	const link = song.deezer?.deezerLink || "";

	return `${yearValue}\t${artist}\t${title}\t${deezerId}\t${link}`;
}

async function loadSongs(fileUrl) {
	try {
		const raw = await Deno.readTextFile(fileUrl);
		const data = JSON.parse(raw);

		if (!Array.isArray(data)) {
			console.error("Unexpected JSON format: expected an array of songs.");
			return null;
		}

		return data;
	} catch (error) {
		console.error("Failed to read or parse file:", error.message);
		return null;
	}
}

async function fetchTrack(deezerId) {
	const url = `https://api.deezer.com/track/${deezerId}`;

	try {
		const response = await fetch(url);
		if (!response.ok) {
			console.warn(`Request failed for ${deezerId}: ${response.status}`);
			return null;
		}

		const data = await response.json();
		if (data?.error) {
			console.warn(`API error for ${deezerId}: ${data.error.message}`);
			return null;
		}

		return data;
	} catch (error) {
		console.warn(`Request failed for ${deezerId}: ${error.message}`);
		return null;
	}
}

async function checkReadable(inputArg) {
	const input = inputArg || defaultYear;
	const fileUrl = getInputFileUrl(input);
	if (!fileUrl) {
		console.log("Usage: deno run --allow-read --allow-net tools/check-deezer-readable.js 1978");
		console.log(
			"   or: deno run --allow-read --allow-net tools/check-deezer-readable.js charts_1978_enriched.json",
		);
		Deno.exit(1);
	}

	const yearLabel = extractYearLabel(input);
	const songs = await loadSongs(fileUrl);
	if (!songs) {
		Deno.exit(1);
	}

	const cache = new Map();
	const total = songs.length;
	let processed = 0;
	console.log("year\tartist\ttitle\tdeezerID\tdeezerLink");

	for (const song of songs) {
		const deezerId = song.deezer?.deezerID;
		if (!deezerId) {
			processed++;
			const progress = Math.round((processed / total) * 100);
			Deno.stdout.writeSync(
				textEncoder.encode(`\rProgress: ${progress}% (${processed}/${total})`),
			);
			continue;
		}

		let readable = cache.get(deezerId);
		if (readable === undefined) {
			const track = await fetchTrack(deezerId);
			readable = track ? track.readable : null;
			cache.set(deezerId, readable);
			await new Promise((resolve) => setTimeout(resolve, delayMs));
		}

		if (readable === false) {
			console.log(formatLine(song, yearLabel, deezerId));
		}

		processed++;
		const progress = Math.round((processed / total) * 100);
		Deno.stdout.writeSync(
			textEncoder.encode(`\rProgress: ${progress}% (${processed}/${total})`),
		);
	}

	console.log();
}

if (import.meta.main) {
	checkReadable(Deno.args[0]);
}
