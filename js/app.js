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
let currentSong = getRandomSong();
let scrollTimeout;
let lastActiveSong = null;

const main = document.querySelector("main");


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
    return randomEntries; // Return the array of random entries, one per year
}

function getRandomSong() {
    if (randomChartEntries.length === 0) {
        console.warn("No more songs available to select.");
        return null;
    }
    const randomIndex = Math.floor(Math.random() * randomChartEntries.length);
    const selectedSong = randomChartEntries.splice(randomIndex, 1)[0]; // Remove and return the selected song
    return selectedSong;
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

    //document.body.style.backgroundImage = `url("${songToInsert.deezer.cover}")`;

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
        currentSong = getRandomSong();
        embedDeezerTrack(currentSong);
    }

    // Smoothly scroll the newly inserted song into view
    songElement.scrollIntoView({
        behavior: "smooth", // Smooth scrolling
        block: "center",    // Vertical alignment: center of the container
        inline: "center"    // Horizontal alignment: center of the container
    });
}

function clickButton(event) {
    const button = event.target;
    const previousSong = button.previousElementSibling?.classList.contains("song") ? button.previousElementSibling : null;
    const nextSong = button.nextElementSibling?.classList.contains("song") ? button.nextElementSibling : null;

    // Check if there's a previous song and its year is earlier than the current song's year
    if (previousSong) {
        if (parseInt(previousSong.dataset.year) >= parseInt(currentSong.year)) {
            alert(`Der Song ist aus dem Jahr ${currentSong.year} und damit an dieser Position nicht korrekt`);
            randomChartEntries.push(currentSong);
            currentSong = getRandomSong();
            embedDeezerTrack(currentSong);
            return;
        }
    }

    // Check if there's a next song and its year is later than the current song's year
    if (nextSong) {
        if (parseInt(nextSong.dataset.year) <= parseInt(currentSong.year)) {
            alert(`Der Song ist aus dem Jahr ${currentSong.year} und damit an dieser Position nicht korrekt.`);
            randomChartEntries.push(currentSong);
            currentSong = getRandomSong();
            embedDeezerTrack(currentSong);
            return;
        }
    }

    // If all checks pass, call insertSong as usual
    insertSong(button);
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

function init() {
    // The following touchstart event listener was used as a workaround for older iOS devices
    // to prevent a 300ms delay in touch interactions. It is likely not necessary anymore
    // on modern devices and browsers, especially in Progressive Web Apps.
    // If you experience issues with touch interactions, you can uncomment it again.
    // document.addEventListener("touchstart", function() {}, false);
    main.addEventListener("scroll", handleScrollEvent);
    //window.addEventListener("wheel", handleHorizontalScroll, { passive: false });

    embedDeezerTrack(currentSong);
    insertSong(null, getRandomSong());
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