# 🎵 Chart Streak

**Chart Streak** is a single-player music quiz where the goal is to place songs in the correct chronological order based on when they first appeared in the **Top 100 of the official German single charts**. The game runs directly in the browser and includes a Deezer player for previewing tracks.

## 📌 Overview

- **Timeframe:** 1978 – today  
- **Goal:** Place as many songs correctly as possible  
- **Game Over:** After 3 mistakes (strikes)  

The game does **not** consider the official release year but instead uses the **first appearance in the annual single charts** as the reference year.

---

## 🛠️ How It Works

### 1️⃣ Data Collection

Chart Streak processes music chart data through multiple stages:

1. **Scraping Official Charts**  
   - The script `scrape-charts.js` retrieves the **Top 100** songs per year from [offiziellecharts.de](https://www.offiziellecharts.de/).  
   - Each year is saved as a separate JSON file.

2. **Enriching with Deezer Data**  
   - `enrich-charts.js` cleans up artist names and song titles.  
   - It queries the **Deezer API** to retrieve:  
     - **Cover images**  
     - **Deezer track IDs**  
     - **Direct links to songs**  
   - The enriched data is saved as JSON files.

3. **Merging Data**  
   - `merge-charts.js` consolidates all years into a single `merged-charts.json` file.  
   - Duplicate entries (same Deezer track appearing in multiple years) are removed.

---

## 🔧 Project Structure
```
chart-streak/
│── css/                     # Styles
│   ├── style.css
│
│── data/                    # Processed chart data
│   ├── charts/              # Raw scraped data (per year)
│   ├── enriched/            # Data enriched with Deezer metadata
│   ├── merged-charts.json   # Final dataset used in the game
│
│── icons/                   # App icons & favicons
│
│── js/                      # Core game logic
│   ├── app.js               # Main gameplay functionality
│
│── svg/                     # UI icons (strikes, shuffle, etc.)
│── tools/                   # Scripts for data processing
│   ├── scrape-charts.js     # Scrapes official chart data
│   ├── enrich-charts.js     # Adds metadata from Deezer
│   ├── merge-charts.js      # Merges all years into one dataset
│
│── index.html               # Main game file
│── service-worker.js        # (Optional) PWA support
│── manifest.json            # Web app manifest for mobile support
│── README.md                # This file
```
---

## 🎮 Gameplay

1️⃣ **New Song Appears**  
   - A song is shown with its **cover, title, and artist** in the Deezer player.  
   - You can listen to the song for reference.

2️⃣ **Placing the Song in the Timeline**  
   - Songs are sorted **from left (earlier) to right (later)**.  
   - Click on a **“+”** sign to place the song:  
     - **Left of an existing song:** The new song is **older**.  
     - **Right of an existing song:** The new song is **more recent**.  
   - **Correct placement:** 🎉 +1 point  
   - **Wrong placement:** ❌ 1 strike  

3️⃣ **Strikes & Shuffle**  
   - **Three mistakes = Game Over**  
   - **Shuffle:** Swap the current song (max. 3 times, no strike penalty).  

4️⃣ **Game End & Highscore**  
   - The game ends when you get **3 strikes** or when no new songs remain.  
   - Your **final score** is the total number of correctly placed songs.  

---

## 📊 Data Sources

- **🎵 Official German Charts** – Data is scraped from [offiziellecharts.de](https://www.offiziellecharts.de/).  
- **🎧 Deezer API** – Provides song covers, track IDs, and player links.  

> **Note:** This project is for **personal use only** and has no affiliation with Deezer or the official chart providers.

---

## 📜 Disclaimer

Chart Streak is a **non-commercial project** built for fun and personal use.  
The project does not provide downloadable software and is not intended for redistribution.
