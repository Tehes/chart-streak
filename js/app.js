/* --------------------------------------------------------------------------------------------------
Imports
---------------------------------------------------------------------------------------------------*/

/* --------------------------------------------------------------------------------------------------
Variables
---------------------------------------------------------------------------------------------------*/


/* --------------------------------------------------------------------------------------------------
functions
---------------------------------------------------------------------------------------------------*/

function init() {
    // The following touchstart event listener was used as a workaround for older iOS devices
    // to prevent a 300ms delay in touch interactions. It is likely not necessary anymore
    // on modern devices and browsers, especially in Progressive Web Apps.
    // If you experience issues with touch interactions, you can uncomment it again.
    // document.addEventListener("touchstart", function() {}, false);
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