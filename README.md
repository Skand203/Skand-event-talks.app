# BigQuery Release Radar 🚀

A premium, responsive web application built with **Python Flask** and vanilla **HTML, CSS, and JavaScript** that fetches the official BigQuery Release Notes RSS feed and formats them into a clean, searchable, and interactive interface.

It parses daily release entries into individual, category-coded updates (e.g., Features, Fixes, Changes, Notices) and allows you to select specific updates to tweet about them on X (Twitter) using a built-in character-counting tweet composer.

---

## Features

1. **Live XML Feed Fetching**: Fetches the official [BigQuery Release Notes XML Feed](https://docs.cloud.google.com/feeds/bigquery-release-notes.xml) dynamically via a backend API.
2. **BeautifulSoup Feed Splitting**: Parses the feed entries' CDATA HTML on the server-side, splitting daily entries into individual, category-coded updates.
3. **Advanced Filters & Real-time Search**:
   - Filter by release category (Features, Fixes, Changes, Notices) with live count badges.
   - Search by keyword through titles, categories, or release content.
4. **Tweet Sharing Integration**:
   - **Single Update Tweet**: Quick share button on each card that pre-formats the update title, snippet, and link, opening a Twitter intent.
   - **Multi-select Digest**: Select multiple updates using checkboxes to compile a bulleted tweet digest, managed by a floating action banner.
5. **Interactive Tweet Composer**: A modal displaying a draft tweet with a character counter that respects Twitter's `t.co` URL limit (23 characters) and live visual progress bars.
6. **Premium Responsive UI**: Dark/Light modes persisting via `localStorage`, smooth animations, glassmorphism filters, and a mobile-friendly design.

---

## File Structure

```text
E:\agy-cli-projects\
├── app.py                 # Flask server with feedparser + BeautifulSoup parsing logic
├── requirements.txt       # Python dependencies
├── templates/
│   └── index.html         # Main dashboard template, filters, and Tweet composer modal
└── static/
    ├── css/
    │   └── style.css      # Core styling (Dark/Light themes, custom scrollbars, transitions)
    └── js/
        └── app.js         # Client-side state, event handlers, and tweet formatting logic
```

---

## How to Run Locally

### 1. Create and Activate Virtual Environment (Done)
If you need to re-create it:
```bash
# Windows
python -m venv venv
venv\Scripts\activate
```

### 2. Install Dependencies (Done)
```bash
pip install -r requirements.txt
```

### 3. Run the Flask Server
The server is currently running in the background. If you need to start it manually:
```bash
python app.py
```
This runs the application in debug mode on **`http://127.0.0.1:5000`**.

---

## Architecture and Design Decisions

- **Feed Parsing**: Using `feedparser` instead of standard XML libraries since it manages XML namespaces, character encodings, and invalid characters automatically.
- **Content Partitioning**: BigQuery release notes lump multiple updates under a single day's RSS entry. We parse the entry's HTML using BeautifulSoup, identifying `<h3>` and `<h4>` headers (e.g., `Feature`, `Fix`) to partition updates into separate, selectable cards.
- **Twitter Character Counter**: The modal calculates character count according to Twitter guidelines. Rather than using raw URL lengths, it counts the source URL as exactly `23` characters since Twitter wraps all links in `t.co`. This guarantees absolute accuracy in the live character warning bar before you hit "Tweet on X".
