/* --------------------------------------------------------------------------------------------------
Imports
---------------------------------------------------------------------------------------------------*/
async function fetchData(filePath) {
	try {
		const response = await fetch(filePath);
		if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
		return await response.json();
	} catch (error) {
		console.error("Error loading charts data:", error);
		return {};
	}
}

/* --------------------------------------------------------------------------------------------------
Variables
---------------------------------------------------------------------------------------------------*/
const charts = await fetchData("data/merged-charts.json");
let randomChartEntries;
let currentSong;
let scrollTimeout;
let lastActiveSong;
const addLockDurationMs = 250;
const deezerTrackProxyUrl = "https://chart-streak.tehes.deno.net/deezer-track/";
const deezerReadableCache = new Map();
let isAddLocked = false;
let isSongLoading = false;

const main = document.querySelector("main");
const shuffleButton = document.querySelector("#shuffle .button");
let shuffleCounter;
const shuffleCounterElement = document.querySelector("#shuffle p");
let score;
const scoreElement = document.querySelector("#score p");
let strikes;
const strikesElement = document.querySelectorAll("#strikes img");
const sidebar = document.querySelector("#sidebar");
const helpButton = document.querySelector("#help");

/* --------------------------------------------------------------------------------------------------
functions
---------------------------------------------------------------------------------------------------*/
function getRandomChartEntries(charts) {
	const randomEntries = [];
	// Select one random song from each bucket while keeping the real release year.
	Object.keys(charts).forEach((year) => {
		const entries = charts[year];
		if (entries.length > 0) {
			const randomIndex = Math.floor(Math.random() * entries.length);
			const randomEntry = entries[randomIndex];
			randomEntries.push({ ...randomEntry, year: randomEntry.releaseYear });
		}
	});

	// Shuffle the array using sort and Math.random
	randomEntries.sort(() => Math.random() - 0.5);

	return randomEntries;
}

async function isDeezerTrackReadable(song) {
	const deezerID = song.deezer.deezerID;

	if (deezerReadableCache.has(deezerID)) {
		return deezerReadableCache.get(deezerID);
	}

	try {
		const response = await fetch(`${deezerTrackProxyUrl}${deezerID}`);
		if (!response.ok) {
			console.warn(`Failed to check Deezer track ${deezerID}: ${response.status}`);
			return true;
		}

		const track = await response.json();
		if (track.readable === false) {
			globalThis.umami?.track("chartStreak", {
				songID: deezerID,
				year: song.year,
			});
		}

		const isReadable = track.readable === true;
		deezerReadableCache.set(deezerID, isReadable);
		return isReadable;
	} catch (error) {
		console.warn(`Failed to check Deezer track ${deezerID}:`, error);
		return true;
	}
}

async function getNextReadableSong() {
	while (randomChartEntries.length > 0) {
		const song = randomChartEntries.shift();
		if (await isDeezerTrackReadable(song)) {
			return song;
		}

		console.warn(`Skipping unavailable Deezer track ${song.deezer.deezerID}.`);
	}

	return null;
}

async function loadNextCurrentSong() {
	isSongLoading = true;

	try {
		currentSong = await getNextReadableSong();
		if (!currentSong) {
			showNoSongAvailable();
			return false;
		}

		embedDeezerTrack(currentSong);
		return true;
	} finally {
		isSongLoading = false;
	}
}

function embedDeezerTrack(randomSong) {
	const deezerID = randomSong.deezer.deezerID;
	const iframeContainer = document.querySelector("#deezer-player");
	const iframe = document.createElement("iframe");
	iframeContainer.innerHTML = "";
	iframe.title = "deezer-widget";
	iframe.src = `https://widget.deezer.com/widget/auto/track/${deezerID}?tracklist=false`;
	iframe.frameBorder = "0";
	iframe.allowTransparency = "true";
	iframe.allow = "encrypted-media; clipboard-write"; // Add permissions for media playback and clipboard access

	document.querySelector("#deezer-player").appendChild(iframe);
}

function getSongBackgroundColor(song) {
	return song.colors?.muted ??
		song.colors?.lightMuted ??
		song.colors?.darkMuted ??
		null;
}

function getSongAccentColor(song) {
	return song.colors?.vibrant ??
		song.colors?.lightVibrant ??
		song.colors?.darkVibrant ??
		null;
}

function setBodyBackgroundColor(color) {
	if (color) {
		document.body.style.setProperty("--cover-bg-color", color);
		document.body.classList.add("has-cover-bg-color");
	} else {
		document.body.style.removeProperty("--cover-bg-color");
		document.body.classList.remove("has-cover-bg-color");
	}
}

function setBodyAccentColor(color) {
	if (color) {
		document.body.style.setProperty("--cover-accent-color", color);
		document.body.classList.add("has-cover-accent-color");
	} else {
		document.body.style.removeProperty("--cover-accent-color");
		document.body.classList.remove("has-cover-accent-color");
	}
}

async function insertSong(referenceElement = null, song = null) {
	const songToInsert = song || currentSong;

	if (!songToInsert) {
		console.warn("No song available to insert.");
		return;
	}

	// Clone the template and populate it with the song's data
	const template = document.querySelector("#timeline-template");
	const clone = template.content.cloneNode(true);
	const songElement = clone.querySelector(".song");
	const img = clone.querySelector("img");
	const titleElement = clone.querySelector(".title");
	const artistElement = clone.querySelector(".artist");
	const yearElement = clone.querySelector(".year");

	// Set the song's cover image, alt text, title, artist, and year
	img.src = songToInsert.deezer.cover;
	img.alt = `${songToInsert.artist} - ${songToInsert.title}`;
	titleElement.textContent = songToInsert.title;
	artistElement.textContent = songToInsert.artist;
	yearElement.textContent = songToInsert.year;
	songElement.setAttribute("data-year", songToInsert.year);
	const backgroundColor = getSongBackgroundColor(songToInsert);
	if (backgroundColor) {
		songElement.dataset.backgroundColor = backgroundColor;
	}
	const accentColor = getSongAccentColor(songToInsert);
	if (accentColor) {
		songElement.dataset.accentColor = accentColor;
	}

	setBodyBackgroundColor(backgroundColor);
	setBodyAccentColor(accentColor);

	// Attach event listeners to the plus buttons in the newly inserted song element
	const plusButtons = clone.querySelectorAll(".add");
	plusButtons.forEach((button) => button.addEventListener("click", clickButton));

	if (referenceElement) {
		// Replace the reference button with the newly created song element
		referenceElement.replaceWith(clone);
	} else {
		// If no reference element is provided, append the song to the main container
		main.appendChild(clone);
	}

	centerTimelineSong(songElement);
	songElement.addEventListener("click", centerSong, false);

	// If the current song was inserted, fetch a new random song and update the Deezer widget
	if (!song) {
		await loadNextCurrentSong();
	}
}

async function clickButton(event) {
	if (strikes === 3) {
		showMessage("Du hast alle Strikes aufgebraucht. Das Spiel ist vorbei.");
		return;
	}

	if (isAddLocked || isSongLoading || !currentSong) {
		return;
	}

	isAddLocked = true;
	const button = event.currentTarget;
	button.classList.add("inactive");

	setTimeout(() => {
		isAddLocked = false;
		button.classList.remove("inactive");
	}, addLockDurationMs);

	const previousSong = button.previousElementSibling?.classList.contains("song")
		? button.previousElementSibling
		: null;
	const nextSong = button.nextElementSibling?.classList.contains("song")
		? button.nextElementSibling
		: null;

	// Check if there's a previous or next song that violates the correct chronological order.
	// If the previous song is from a later year or the next song is from an earlier year, show a message
	// and replace the current song with a new one.
	if (
		(previousSong && parseInt(previousSong.dataset.year) >= parseInt(currentSong.year)) ||
		(nextSong && parseInt(nextSong.dataset.year) <= parseInt(currentSong.year))
	) {
		await applyStrike();
		return;
	}

	// If all checks pass, call insertSong as usual
	await insertSong(button);
	score++;
	scoreElement.textContent = score;
}

async function clickShuffleButton() {
	if (shuffleCounter === 0) {
		showMessage("Du hast alle Shuffle-Versuche aufgebraucht.");
		return;
	}
	if (strikes === 3) {
		showMessage("Du hast alle Strikes aufgebraucht. Das Spiel ist vorbei.");
		return;
	}
	if (isSongLoading || !currentSong) {
		return;
	}
	randomChartEntries.push(currentSong);
	if (await loadNextCurrentSong()) {
		shuffleCounter--;
		shuffleCounterElement.textContent = shuffleCounter;
	}
	if (shuffleCounter === 0) {
		shuffleButton.removeEventListener("click", clickShuffleButton, false);
		shuffleButton.classList.add("inactive");
	}
}

function handleScrollEvent() {
	clearTimeout(scrollTimeout); // Clear previous timer

	scrollTimeout = setTimeout(() => {
		const songs = document.querySelectorAll(".song");
		let closestSong = null;
		let minDistance = Infinity;

		const timelineCenter = main.offsetWidth / 2;
		const timelineLeft = main.scrollLeft;

		songs.forEach((song) => {
			const songLeft = song.offsetLeft - timelineLeft;
			const songCenter = songLeft + song.offsetWidth / 2;
			const distance = Math.abs(songCenter - timelineCenter);

			if (distance < minDistance) {
				minDistance = distance;
				closestSong = song;
			}
		});

		if (closestSong && closestSong !== lastActiveSong) {
			lastActiveSong = closestSong; // Update the last active song

			// Highlight the active song
			songs.forEach((song) => song.classList.remove("active"));
			closestSong.classList.add("active");
			setBodyBackgroundColor(closestSong.dataset.backgroundColor);
			setBodyAccentColor(closestSong.dataset.accentColor);
		}
	}, 150); // Set a delay of 150 ms
}

async function applyStrike() {
	// apply strike
	strikesElement[strikes].classList.add("active");
	strikesElement[strikes].src = "svg/cross.svg";
	strikes++;
	showMessage(
		`Strike ${strikes}: Richtiges Jahr: ${currentSong.year}.`,
	);
	// get new song if strikes < 3
	if (strikes < 3) {
		randomChartEntries.push(currentSong);
		await loadNextCurrentSong();
	} //end game if strikes === 3
	else {
		const iframeContainer = document.querySelector("#deezer-player");
		iframeContainer.innerHTML = "<h3>Das Spiel ist vorbei</h3>";

		const restartButton = document.createElement("div");
		restartButton.id = "restart";
		restartButton.classList.add("button");
		restartButton.textContent = "Neu starten";
		restartButton.addEventListener("click", resetGame);
		iframeContainer.appendChild(restartButton);

		const plusButtons = document.querySelectorAll(".add");
		plusButtons.forEach((button) => button.remove());
		main.classList.add("game-over");
		centerTimelineSong(
			lastActiveSong || document.querySelector(".song.active") ||
				document.querySelector(".song"),
		);
		globalThis.umami?.track("chartStreak", {
			highscore: score,
		});
	}
}

function showNoSongAvailable() {
	const iframeContainer = document.querySelector("#deezer-player");
	iframeContainer.innerHTML = "<h3>Kein weiterer Song verfügbar</h3>";

	const plusButtons = document.querySelectorAll(".add");
	plusButtons.forEach((button) => button.remove());
	main.classList.add("game-over");
}

function showMessage(text) {
	const message = document.querySelector("aside");
	message.textContent = text;
	message.classList.add("visible");
	setTimeout(() => message.classList.remove("visible"), 4300);
}

function toggleSidebar() {
	sidebar.classList.toggle("visible");
}

function centerSong(ev) {
	centerTimelineSong(ev.currentTarget);
}

function centerTimelineSong(songElement) {
	if (!songElement) {
		return;
	}

	requestAnimationFrame(() => {
		songElement.scrollIntoView({
			behavior: "smooth",
			block: "center",
			inline: "center",
		});
	});
}

async function resetGame() {
	lastActiveSong = null;
	main.classList.remove("game-over");
	randomChartEntries = getRandomChartEntries(charts);
	currentSong = null;
	score = 0;
	scoreElement.textContent = score;
	shuffleCounter = 3;
	shuffleCounterElement.textContent = shuffleCounter;
	strikes = 0;
	if (strikesElement[0].classList.contains("active")) {
		strikesElement.forEach((strike) => {
			strike.classList.remove("active");
			strike.src = "svg/cross-outline.svg";
		});
	}
	main.innerHTML = "";
	await loadNextCurrentSong();
	const firstTimelineSong = randomChartEntries.shift();
	if (firstTimelineSong) {
		await insertSong(null, firstTimelineSong);
	}
	handleScrollEvent();
	if (shuffleButton.classList.contains("inactive")) {
		shuffleButton.addEventListener("click", clickShuffleButton, false);
		shuffleButton.classList.remove("inactive");
	}
}

function init() {
	document.addEventListener("touchstart", function () {}, false);
	main.addEventListener("scroll", handleScrollEvent, false);
	shuffleButton.addEventListener("click", clickShuffleButton, false);
	helpButton.addEventListener("click", toggleSidebar, false);
	sidebar.addEventListener("click", toggleSidebar, false);

	resetGame();
}

/* --------------------------------------------------------------------------------------------------
public members, exposed with return statement
---------------------------------------------------------------------------------------------------*/
globalThis.app = {
	init,
	insertSong,
};

globalThis.app.init();

/* --------------------------------------------------------------------------------------------------
Service Worker configuration. Toggle 'useServiceWorker' to enable or disable the Service Worker.
---------------------------------------------------------------------------------------------------*/
const useServiceWorker = false; // Set to "true" if you want to register the Service Worker, "false" to unregister

async function registerServiceWorker() {
	try {
		const currentPath = globalThis.location.pathname;
		const registration = await navigator.serviceWorker.register(
			`${currentPath}service-worker.js`,
		);
		console.log("Service Worker registered with scope:", registration.scope);
	} catch (error) {
		console.log("Service Worker registration failed:", error);
	}
}

async function unregisterServiceWorkers() {
	const registrations = await navigator.serviceWorker.getRegistrations();
	for (const registration of registrations) {
		const success = await registration.unregister();
		if (success) {
			console.log("Service Worker successfully unregistered.");
		}
	}
}

if ("serviceWorker" in navigator) {
	globalThis.addEventListener("load", async () => {
		if (useServiceWorker) {
			await registerServiceWorker();
		} else {
			await unregisterServiceWorkers();
		}
	});
}
