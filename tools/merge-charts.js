const dataDirUrl = new URL("../data/enriched/", import.meta.url);
const outputFileUrl = new URL("../data/merged-charts.json", import.meta.url);

function getReleaseYear(song, chartYear) {
	if (!song.releaseYear) {
		console.warn(
			`Release year missing for "${song.artist} - ${song.title}" in chart year ${chartYear}, rank ${song.rank}. Using chart year.`,
		);
		return chartYear;
	}

	return `${song.releaseYear}`;
}

async function mergeCharts() {
	const mergedData = {};
	const seenDeezerIDs = new Map();
	const ignoredSongs = [];

	const files = [];
	for await (const entry of Deno.readDir(dataDirUrl)) {
		if (entry.isFile) {
			files.push(entry.name);
		}
	}
	files.sort();

	for (const file of files) {
		const fileUrl = new URL(file, dataDirUrl);
		const fileContent = await Deno.readTextFile(fileUrl);
		const yearData = JSON.parse(fileContent);

		const yearMatch = file.match(/\d{4}/);
		if (!yearMatch) {
			console.warn(`Dateiname enthaelt keine Jahreszahl: ${file}`);
			continue;
		}
		const chartYear = yearMatch[0];

		for (const song of yearData) {
			if (!song.deezer || !song.deezer.deezerID) {
				continue;
			}

			const deezerID = song.deezer.deezerID;
			const releaseYear = getReleaseYear(song, chartYear);

			if (!mergedData[releaseYear]) {
				mergedData[releaseYear] = [];
			}

			if (typeof deezerID === "string") {
				console.log("Achtung: DeezerID ist ein String:", {
					ReleaseYear: releaseYear,
					ChartYear: chartYear,
					Rank: song.rank,
				});
			}

			if (seenDeezerIDs.has(deezerID)) {
				const {
					releaseYear: firstReleaseYear,
					chartYear: firstChartYear,
					rank: firstRank,
				} = seenDeezerIDs.get(deezerID);
				ignoredSongs.push({
					Title: song.title,
					DeezerID: deezerID,
					"Erstes Release-Jahr": firstReleaseYear,
					"Chartjahr (erstes Vorkommen)": firstChartYear,
					"Platzierung (erstes Vorkommen)": firstRank,
					"Ignoriertes Release-Jahr": releaseYear,
					"Ignoriertes Chartjahr": chartYear,
					"Platzierung (ignoriert)": song.rank,
				});
				continue;
			}

			mergedData[releaseYear].push(song);
			seenDeezerIDs.set(deezerID, {
				releaseYear,
				chartYear,
				rank: song.rank,
			});
		}
	}

	await Deno.writeTextFile(outputFileUrl, JSON.stringify(mergedData, null, 2));
	console.log(`Zusammengefuehrte Daten wurden in ${outputFileUrl} gespeichert.`);

	if (ignoredSongs.length > 0) {
		console.table(ignoredSongs);
	} else {
		console.log("Keine Duplikate gefunden.");
	}
}

if (import.meta.main) {
	mergeCharts().catch((error) => {
		console.error(error);
		Deno.exit(1);
	});
}
