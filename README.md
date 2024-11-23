# Starter Template for Web or Progressive Web App (PWA)

This is a versatile starter template designed to help you build either a traditional website or a Progressive Web Application (PWA) with minimal setup. It includes essential features like responsive design, caching for offline support (if used as a PWA), and basic asset management.

## Features
- **Responsive Design**: Includes styles and meta tags for mobile compatibility.
- **Service Worker** (PWA mode): Implements a Stale-While-Revalidate caching strategy for offline support.
- **PWA Manifest** (PWA mode): A manifest file for adding the app to home screens on mobile devices.
- **ESLint Configuration**: Preconfigured ESLint for clean JavaScript code.

## Structure

```bash
├── index.html         # Main entry point
├── css/
│   └── style.css      # Base styles, responsive design, dark mode support
├── js/
│   └── app.js         # Main JavaScript, includes initialization
├── manifest.json      # PWA manifest (only for PWA usage)
├── service-worker.js  # Service worker (only for PWA usage)
├── icons/             # Application icons
└── .eslintrc.js       # ESLint configuration file
```

## Installation

1. Clone or download the repository using your preferred method (via Git, GitHub CLI, or downloading the ZIP).
2. Open the project in your preferred text editor.
3. Serve the project using any local server solution of your choice (e.g., using Live Server from your editor or another tool).

## Initial Setup

This template can be used in two different ways: as a **standard website** or as a **Progressive Web App (PWA)**. Depending on which type of app you want to build, follow the instructions below.

### 1. As a Standard Website
If you're building a regular website, some features related to PWAs are unnecessary and can be removed or commented out:

#### Required Changes:

- **Manifest file**: You can remove or ignore `manifest.json` as it's only needed for PWAs.
  
- **Service Worker**: You don't need a service worker. In `app.js`, set `useServiceWorker` to `false` to ensure that no service worker is registered and that any previously registered service worker is unregistered:

    ```javascript
    const useServiceWorker = false;
    ```

- **Meta Tags**: You can remove or ignore the following meta tags in `index.html`:

    ```html
    <link rel="manifest" href="manifest.json">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-title" content="--yourSiteName--">
    <meta name="apple-mobile-web-app-status-bar-style" content="black">
    ```

- **CSS for PWAs**: The following CSS rules are important for PWAs, but may not be necessary for a standard website:
    - **`user-select: none;`** and **`-webkit-user-select: none;`**: These rules prevent users from selecting text. In standard websites, this might not be necessary, but for PWAs, where interactions like clicking and swiping are important, it can prevent unwanted text selection.
    - **`-webkit-touch-callout: none;`**: This rule disables the touch-and-hold menu on iOS (e.g., for "Copy" or "Save Image"), which can be useful in PWAs where such actions are not relevant. You can remove or comment it out if not needed for your use case.

    ```css
    body {
        user-select: none; /* Prevents text selection */
        -webkit-user-select: none; /* Prevents text selection on older WebKit-based browsers */
        -webkit-touch-callout: none; /* Disables the long-press menu on iOS */
    }
    ```

### 2. As a Progressive Web App (PWA)

If you want to take full advantage of PWA features, follow these steps to ensure everything is set up correctly:

#### Required Changes:

- **Manifest File**: Make sure `manifest.json` is properly configured. Replace the placeholders (`--yourSiteName--`, `--your description--`) with the actual name, description, and icons of your app.

    Example:

    ```json
    {
        "short_name": "MyApp",
        "name": "My Application",
        "description": "A brief description of My Application.",
        "icons": [
            {
                "src": "icons/180x180.png",
                "type": "image/png",
                "sizes": "180x180"
            }
        ],
        "start_url": "/",
        "scope": "/",
        "background_color": "#eee",
        "display": "standalone",
        "theme_color": "#eee"
    }
    ```

- **Service Worker**: In `app.js`, set `useServiceWorker` to `true` to enable the Service Worker, providing caching and offline support:

    ```javascript
    const useServiceWorker = true; // Must be set to true for PWA functionality
    ```

- **Cache Name**: Customize the `CACHE_NAME` in `service-worker.js` to reflect your app's name and version:

    ```javascript
    const CACHE_NAME = 'my-app-cache-v1'; // Update with your app's cache name and version
    ```

- **Meta Tags**: Ensure the PWA-specific meta tags are included in your `index.html` for mobile compatibility and PWA installation:

    ```html
    <link rel="manifest" href="manifest.json">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-title" content="MyApp">
    <meta name="apple-mobile-web-app-status-bar-style" content="black">
    ```

- **CSS (Touch-Action)**: Keep the following line in your `style.css` to disable double-tap zoom on mobile devices, improving the mobile experience:

    ```css
    /* disable double tap to zoom. only use in mobile-pwa */
    touch-action: manipulation;
    ```

### Optional: `touchstart` Event Listener

- **JavaScript Touch Event**: The `touchstart` event listener was previously used to handle touch interactions on older iOS devices. While it is no longer necessary for most modern devices and browsers, you can leave the code commented out and re-enable it if you experience touch interaction issues:

    ```javascript
    // document.addEventListener("touchstart", function() {}, false);
    ```

### Customizing Styles

The template includes basic CSS with variables for easy customization. Colors and themes are set for both light and dark modes:

```css
:root {
    --bg-color: hsl(0, 0%, 95%);
    --font-color: hsl(0, 0%, 20%);
}

@media (prefers-color-scheme: dark) {
    :root {
        --bg-color: hsl(0, 0%, 20%);
        --font-color: hsl(0, 0%, 90%);
    }
}
```

Feel free to modify the styles to match your branding.

### ESLint

An `.eslintrc.js` file is included to enforce consistent coding practices. You can run ESLint to check your JavaScript for issues:

```bash
npx eslint js/app.js
```

### Summary

- For a **standard website**, disable or remove PWA-specific features like the service worker, manifest file, and touch-related CSS/JavaScript.
- For a **PWA**, ensure that the manifest file, service worker, and PWA-related meta tags are activated to provide offline support and a seamless mobile experience.

This template provides a flexible starting point for both traditional websites and Progressive Web Apps!