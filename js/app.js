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
const randomChartEntries = getRandomChartEntries(charts);
let currentSong = randomChartEntries.shift();
let scrollTimeout;
let lastActiveSong = null;

const main = document.querySelector("main");
const shuffleButton = document.querySelector("#shuffle .button");
let shuffleCounter = 3;
const shuffleCounterElement = document.querySelector("#shuffle p");
shuffleCounterElement.textContent = shuffleCounter;
let score = 0;
const scoreElement = document.querySelector("#score p");
scoreElement.textContent = score;
let strikes = 0;
const strikesElement = document.querySelectorAll("#strikes img");
const helpButton = document.querySelector("#help");


/* --------------------------------------------------------------------------------------------------
functions
---------------------------------------------------------------------------------------------------*/
function getRandomChartEntries(charts) {
    const randomEntries = [];
    // Iterate over each year in the charts object to select a random song from each
    Object.keys(charts).forEach(year => {
        const entries = charts[year]; // Get all songs for the given year
        if (entries.length > 0) {
            const randomIndex = Math.floor(Math.random() * entries.length);
            const randomEntry = { ...entries[randomIndex], year }; // Include the year in the entry
            randomEntries.push(randomEntry); // Add the selected entry to the results
        }
    });

    // Shuffle the array using sort and Math.random
    randomEntries.sort(() => Math.random() - 0.5);

    return randomEntries; // Return the array of random entries, one per year
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

function insertSong(referenceElement = null, song = null) {
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

    document.body.style.backgroundImage = `url("${songToInsert.deezer.cover}")`;

    // Attach event listeners to the plus buttons in the newly inserted song element
    const plusButtons = clone.querySelectorAll(".add");
    plusButtons.forEach(button => button.addEventListener("click", clickButton));

    if (referenceElement) {
        // Replace the reference button with the newly created song element
        referenceElement.replaceWith(clone);
    } else {
        // If no reference element is provided, append the song to the main container
        main.appendChild(clone);
    }

    // If the current song was inserted, fetch a new random song and update the Deezer widget
    if (!song) {
        currentSong = randomChartEntries.shift();
        embedDeezerTrack(currentSong);
    }

    // Smoothly scroll the newly inserted song into view
    songElement.scrollIntoView({
        behavior: "smooth", // Smooth scrolling
        block: "center",    // Vertical alignment: center of the container
        inline: "center"    // Horizontal alignment: center of the container
    });
    songElement.addEventListener("click", centerSong, false);
}

function clickButton(event) {
    if (strikes === 3) {
        showMessage("Du hast alle Strikes aufgebraucht. Das Spiel ist vorbei.");
        return;
    }
    const button = event.target;
    const previousSong = button.previousElementSibling?.classList.contains("song") ? button.previousElementSibling : null;
    const nextSong = button.nextElementSibling?.classList.contains("song") ? button.nextElementSibling : null;

    // Check if there's a previous or next song that violates the correct chronological order.
    // If the previous song is from a later year or the next song is from an earlier year, show a message
    // and replace the current song with a new one.
    if (
        (previousSong && parseInt(previousSong.dataset.year) >= parseInt(currentSong.year)) ||
        (nextSong && parseInt(nextSong.dataset.year) <= parseInt(currentSong.year))
    ) {
        applyStrike();
        return;
    }

    // If all checks pass, call insertSong as usual
    insertSong(button);
    score++;
    scoreElement.textContent = score;
}

function clickShuffleButton() {
    if (shuffleCounter === 0) {
        showMessage("Du hast alle Shuffle-Versuche aufgebraucht.");
        return;
    }
    if (strikes === 3) {
        showMessage("Du hast alle Strikes aufgebraucht. Das Spiel ist vorbei.");
        return;
    }
    randomChartEntries.push(currentSong);
    currentSong = randomChartEntries.shift();
    embedDeezerTrack(currentSong);
    shuffleCounter--;
    shuffleCounterElement.textContent = shuffleCounter;
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
            const imgURL = closestSong.querySelector("img").src;

            // Highlight the active song
            songs.forEach(song => song.classList.remove("active"));
            closestSong.classList.add("active");
            document.body.style.backgroundImage = `url("${imgURL}")`;
        }
    }, 150); // Set a delay of 150 ms
}

function applyStrike() {
    // apply strike
    strikesElement[strikes].classList.add("active");
    strikesElement[strikes].src = "svg/cross.svg";
    strikes++;
    showMessage(`Strike ${strikes}: Der Song ist aus dem Jahr ${currentSong.year}.`);
    // get new song if strikes < 3
    if (strikes < 3) {
        randomChartEntries.push(currentSong);
        currentSong = randomChartEntries.shift();
        embedDeezerTrack(currentSong);
    }
    //end game if strikes === 3
    else {
        const iframeContainer = document.querySelector("#deezer-player");
        iframeContainer.innerHTML = "<h3>Das Spiel ist vorbei</h3>"
        const plusButtons = document.querySelectorAll(".add");
        plusButtons.forEach(button => button.remove());
        window.splitbee.track("chartStreak", {
            highscore: score
        });
    }
}

function showMessage(text) {
    const message = document.querySelector("aside");
    message.textContent = text;
    message.classList.add("visible");
    setTimeout(() => message.classList.remove("visible"), 3300);
}

function showSidebar() {
    const sidebar = document.querySelector("#sidebar");
    sidebar.classList.toggle("visible");
}

function centerSong(ev) {
    ev.target.scrollIntoView({
        behavior: "smooth", // Smooth scrolling
        block: "center",    // Vertical alignment: center of the container
        inline: "center"    // Horizontal alignment: center of the container
    });
}

function init() {
    document.addEventListener("touchstart", function () { }, false);
    main.addEventListener("scroll", handleScrollEvent, false);
    shuffleButton.addEventListener("click", clickShuffleButton, false);
    helpButton.addEventListener("click", showSidebar, false);

    embedDeezerTrack(currentSong);
    insertSong(null, randomChartEntries.shift());
    handleScrollEvent();
}

/* --------------------------------------------------------------------------------------------------
public members, exposed with return statement
---------------------------------------------------------------------------------------------------*/
window.app = {
    init, insertSong
};

window.app.init();

/* --------------------------------------------------------------------------------------------------
Service Worker configuration. Toggle 'useServiceWorker' to enable or disable the Service Worker.
---------------------------------------------------------------------------------------------------*/
const useServiceWorker = false; // Set to "true" if you want to register the Service Worker, "false" to unregister

async function registerServiceWorker() {
    try {
        const currentPath = window.location.pathname;
        const registration = await navigator.serviceWorker.register(`${currentPath}service-worker.js`);
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
    window.addEventListener("load", async () => {
        if (useServiceWorker) {
            await registerServiceWorker();
        } else {
            await unregisterServiceWorkers();
        }
    });
}