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
        return null; // Return null if the array is empty
    }
    const randomIndex = Math.floor(Math.random() * randomChartEntries.length);
    const selectedSong = randomChartEntries.splice(randomIndex, 1)[0]; // Remove and return the selected song
    return selectedSong;
}

function embedDeezerTrack(randomSong) {
    const deezerID = randomSong.deezer.deezerID
    const iframe = document.createElement("iframe");
    iframe.title = "deezer-widget";
    iframe.src = `https://widget.deezer.com/widget/auto/track/${deezerID}?tracklist=false`;
    iframe.frameBorder = "0";
    iframe.allowTransparency = "true";
    iframe.allow = "encrypted-media; clipboard-write"; // Add permissions for media playback and clipboard access

    document.querySelector("#deezer-player").appendChild(iframe);
    console.log("Selected song:", randomSong);
}

function insertRandomSong(randomSong) {
    const template = document.querySelector("#timeline-template");
    const main = document.querySelector("main");
    const clone = template.content.cloneNode(true);
    const img = clone.querySelector("img");
    const titleElement = clone.querySelector(".title");
    const artistElement = clone.querySelector(".artist");
    const yearElement = clone.querySelector(".year");

    img.src = randomSong.deezer.cover;
    img.alt = `${randomSong.artist} - ${randomSong.title}`;
    titleElement.textContent = randomSong.title;
    artistElement.textContent = randomSong.artist;
    yearElement.textContent = randomSong.year;

    main.appendChild(clone);
}

function init() {
    // The following touchstart event listener was used as a workaround for older iOS devices
    // to prevent a 300ms delay in touch interactions. It is likely not necessary anymore
    // on modern devices and browsers, especially in Progressive Web Apps.
    // If you experience issues with touch interactions, you can uncomment it again.
    // document.addEventListener("touchstart", function() {}, false);
    embedDeezerTrack(getRandomSong());

    insertRandomSong(getRandomSong());
    insertRandomSong(getRandomSong());
    insertRandomSong(getRandomSong());
}

/* --------------------------------------------------------------------------------------------------
public members, exposed with return statement
---------------------------------------------------------------------------------------------------*/
window.app = {
    init
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