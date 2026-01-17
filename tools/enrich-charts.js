import { END_YEAR, START_YEAR } from "../config.js";

const chartsDirUrl = new URL("../data/charts/", import.meta.url);
const enrichedDirUrl = new URL("../data/enriched/", import.meta.url);
const deezerBaseURL = "https://api.deezer.com/search?q=";
const textEncoder = new TextEncoder();

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

function normalizePunctuation(value) {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/\$/g, "s")
		.replace(/[\u2018\u2019\u201B\u2032`´]/g, "'")
		.replace(/[\u2013\u2014]/g, "-");
}

function extractPrimaryArtist(artist) {
	if (!artist) {
		return "";
	}

	return artist.split(/[+\/,]/)[0].trim();
}

function cleanArtistName(artist) {
	const normalized = normalizePunctuation(artist);

	return normalized
		.replace(/^(the|a|an)\s+/i, "")
		.replace(/'/g, "")
		.replace(/ƒ/g, "")
		.replace(/(feat\.|featuring|&|und|starring|pres\.|with).*$/gi, "")
		.replace(/\s+x\s+.*$/gi, "")
		.replace(/\./g, "")
		.replace(/\([^)]*\)/g, "")
		.replace(/\[[^\]]*\]/g, "")
		.replace(/\s{2,}/g, " ")
		.trim();
}

function cleanTitle(title) {
	const normalized = normalizePunctuation(title);

	return normalized
		.replace(/'/g, "")
		.replace(/ƒ/g, "")
		.replace(/\([^)]*\)/g, "")
		.replace(/-/g, " ")
		.replace(/\s{2,}/g, " ")
		.replace(/[.,\/#!$%\^&\*;:{}=\_`~()?]/g, "")
		.trim();
}

function isArtistNameSimilar(deezerArtist, cleanedArtist) {
	const normalize = (str) =>
		normalizePunctuation(str)
			.replace(/\./g, "")
			.replace(/'/g, "")
			.replace(/ƒ/g, "")
			.replace(/\s{2,}/g, " ")
			.trim()
			.toLowerCase();

	const deezerArtistNormalized = normalize(deezerArtist);
	const cleanedArtistNormalized = normalize(cleanedArtist);

	const artistParts = cleanedArtist
		.split(/[+\/,]/)
		.map((part) => normalize(part));

	if (
		deezerArtistNormalized.includes(cleanedArtistNormalized) ||
		cleanedArtistNormalized.includes(deezerArtistNormalized)
	) {
		return true;
	}

	return artistParts.some((part) => {
		const variations = [
			part,
			part.replace(/\band\b/g, "&"),
			part.replace(/\bund\b/g, "&"),
			part.replace(/&/g, "and"),
			part.replace(/&/g, "und"),
			part.replace(/\b'N\b/g, "&"),
			part.replace(/\b'N\b/g, "and"),
			part.replace(/\b'N\b/g, "und"),
			part.replace(/\b'n\b/g, "&"),
			part.replace(/\b'n\b/g, "and"),
			part.replace(/\b'n\b/g, "und"),
		];

		return variations.some((variation) => deezerArtistNormalized.includes(variation));
	});
}

function isTitleSimilar(deezerTitle, cleanedTitle) {
	const normalize = (str) =>
		normalizePunctuation(str)
			.replace(/\([^)]*\)/g, "")
			.replace(/'/g, "")
			.replace(/ƒ/g, "")
			.replace(/\./g, "")
			.replace(/-/g, " ")
			.replace(/\s{2,}/g, " ")
			.replace(/[.,\/#!$%\^&\*;:{}=\_`~()?]/g, "")
			.replace(/ÇY/g, "ss")
			.replace(/Çô/g, "oe")
			.replace(/ÇÏ/g, "ae")
			.replace(/Ç¬/g, "ue")
			.replace(/\b(the|and|a|an|und|mit|von)\b/gi, "")
			.trim()
			.toLowerCase();

	const deezerTitleNormalized = normalize(deezerTitle);
	const cleanedTitleNormalized = normalize(cleanedTitle);

	const deezerWords = deezerTitleNormalized.split(/\s+/);
	const cleanedWords = cleanedTitleNormalized.split(/\s+/);

	const matchingWords = cleanedWords.filter((word) => deezerWords.includes(word));
	const matchPercentage = (matchingWords.length / cleanedWords.length) * 100;
	const threshold = cleanedWords.length <= 3 ? 50 : 70;

	return matchPercentage >= threshold;
}

function isRemix(originalTitle, deezerTitle) {
	const includesRemix = (str) => str.toLowerCase().includes("remix");
	return !includesRemix(originalTitle) && includesRemix(deezerTitle);
}

function shouldExcludeTitle(title) {
	const normalizedTitle = title.toLowerCase().trim();
	return (
		normalizedTitle.includes("instrumental") ||
		normalizedTitle.includes("medley")
	);
}

async function fetchReleaseYear(detailUrl) {
	if (!detailUrl) {
		return null;
	}

	try {
		const response = await fetch(detailUrl);
		if (!response.ok) {
			throw new Error(`Request failed: ${response.status}`);
		}
		const html = await response.text();
		const yearMatch = html.match(
			/<td class="detail-info-label">\s*Jahr:\s*<\/td>\s*<td>\s*(\d{4})/i,
		);

		if (yearMatch) {
			return parseInt(yearMatch[1], 10);
		}

		console.warn(`Release year not found for detail URL: ${detailUrl}`);
		return null;
	} catch (error) {
		console.error(`Error fetching release year from "${detailUrl}":`, error.message);
		return null;
	}
}

async function searchDeezer(title, artist, year, retryCount = 0) {
	if (retryCount > 3) {
		console.error(`Max retries reached for query "${title}" by "${artist}"`);
		return null;
	}

	const cleanedArtist = cleanArtistName(artist);
	const cleanedTitle = cleanTitle(title);
	const normalizedTitle = normalizePunctuation(title);
	const normalizedArtist = normalizePunctuation(artist);
	const primaryArtist = extractPrimaryArtist(artist);
	const cleanedPrimaryArtist = cleanArtistName(primaryArtist);
	const primaryQuery = `${normalizedTitle} ${cleanedArtist}`;
	const fallbackQuery = `${cleanedTitle} ${cleanedArtist}`;
	const rawQuery = `${normalizedTitle} ${normalizedArtist}`;
	const primaryArtistQuery = `${normalizedTitle} ${cleanedPrimaryArtist}`;
	const titleOnlyQuery = normalizedTitle;

	const tryQuery = async (queryText) => {
		const query = encodeURIComponent(queryText.trim());
		const url = `${deezerBaseURL}${query}`;

		if (!query) {
			return null;
		}

		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Request failed: ${response.status}`);
		}
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
					await new Promise((resolve) => setTimeout(resolve, 2000));
					return {
						deezerID: result.id,
						deezerLink: result.link,
						cover: result.album.cover_big,
						deezerArtist: deezerArtist,
						deezerTitle: result.title_short,
					};
				}
			}
		}

		return null;
	};

	try {
		const queryCandidates = [
			primaryQuery,
			fallbackQuery,
			rawQuery,
			primaryArtistQuery,
			titleOnlyQuery,
		];
		const seenQueries = new Set();

		for (const queryText of queryCandidates) {
			const trimmed = queryText.trim();
			if (!trimmed || seenQueries.has(trimmed)) {
				continue;
			}
			seenQueries.add(trimmed);

			const match = await tryQuery(trimmed);
			if (match) {
				return match;
			}
		}
	} catch (error) {
		console.error(`Error fetching data for "${title}" by "${artist}":`, error.message);
		console.log("Retrying...");
		await new Promise((resolve) => setTimeout(resolve, 5000));
		return await searchDeezer(title, artist, year, retryCount + 1);
	}

	console.log(`No results for: "${title}" by "${artist}"`);
	return null;
}

async function enrichYear(year) {
	const inputFileUrl = new URL(`charts_${year}.json`, chartsDirUrl);
	const outputFileUrl = new URL(`charts_${year}_enriched.json`, enrichedDirUrl);

	if (!await fileExists(inputFileUrl)) {
		console.error(`File not found: ${inputFileUrl}`);
		return;
	}

	if (await fileExists(outputFileUrl)) {
		console.log(`Enriched data for ${year} already exists. Skipping...`);
		return;
	}

	const data = JSON.parse(await Deno.readTextFile(inputFileUrl));
	console.log(`Enriching data for year ${year}...`);

	let processed = 0;
	const total = data.length;

	for (const song of data) {
		const releaseYear = await fetchReleaseYear(song.detailUrl);
		if (releaseYear) {
			song.releaseYear = releaseYear;
		}

		const deezerData = await searchDeezer(song.title, song.artist, year);
		if (deezerData) {
			song.deezer = deezerData;
		}
		processed++;

		const progress = Math.round((processed / total) * 100);
		Deno.stdout.writeSync(
			textEncoder.encode(`\rProgress: ${progress}% (${processed}/${total})`),
		);
	}

	console.log();
	await Deno.writeTextFile(outputFileUrl, JSON.stringify(data, null, 2));
	console.log(`Saved enriched data to ${outputFileUrl}`);
}

async function enrichAllYears() {
	await Deno.mkdir(enrichedDirUrl, { recursive: true });

	for (let year = START_YEAR; year <= END_YEAR; year++) {
		console.log(`Processing year ${year}...`);
		const start = Date.now();

		await enrichYear(year);

		// const elapsed = (Date.now() - start) / 1000;
		// const waitTime = Math.max(600 - elapsed, 0);
		// if (waitTime > 0) {
		//     console.log(`Waiting ${waitTime.toFixed(0)} seconds before processing next year...`);
		//     await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
		// }
	}

	console.log("All years processed.");
}

if (import.meta.main) {
	enrichAllYears().catch(console.error);
}
