# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BioIntelligence Hub v2 is a client-side single-page research workbench for bioinformatics scientists. It provides AI-assisted research planning, a companion (gamified pet) system, evidence management, memos with markdown editing, and integration with external research tools. The UI is bilingual (Chinese/English) with three visual themes (day, sunset, midnight) using glassmorphism.

## Running the Application

There is **no build step**. Open `index.html` directly in a browser or serve it with any static file server:

```bash
npx serve .
# or
python3 -m http.server 8000
```

To use the Tencent IMA (knowledge base) integration, start the local CORS proxy:

```bash
node ima-proxy.js
# Runs on http://localhost:3000/ima
# Also available via the macOS double-click script: 启动IMA代理.command
```

## Architecture

### Module System

All JS files are loaded as global `window.*` singletons via `<script>` tags in `index.html` (no bundler, no ES modules). The load order matters — `store` and `ui` must load before feature modules, and `app.js` loads last to orchestrate initialization.

**Load order** (defined in `index.html`):
1. `data/translations.js`, `data/toolCatalog.js`, `data/guideContent.js`, `data/petImages.js` — static data
2. `js/ui.js` — DOM helpers, i18n, theming, modal, notifications
3. `js/store.js` — IndexedDB abstraction (DB name: `BioIntelligenceHubDB`, version 4)
4. `js/ima_client.js` — Tencent IMA API wrapper
5. `js/ai.js` — Google Gemini API client
6. `js/migration.js` — data migration logic
7. Feature modules: `dashboard`, `projects`, `planner`, `evidence`, `memos`, `companion`, `settings`
8. `js/app.js` — boot orchestrator (`BioHubApp` class)

### Key Modules

- **store** (`js/store.js`): All persistence goes through IndexedDB. Object stores: `projects`, `plans`, `evidence`, `companion`, `settings`, `memos`, `chat`, `expeditions`. Use `store.get(storeName, id)`, `store.getAll(storeName)`, `store.set(storeName, data)`, `store.delete(storeName, id)`, `store.getByProject(storeName, projectId)`.

- **ai** (`js/ai.js`): Calls Google Gemini API. Reads API config from `store.get('settings', 'api')`. The model defaults to `gemini-2.0-flash`.

- **ima_client** (`js/ima_client.js`): Tencent IMA knowledge base integration. Supports direct or proxy connection modes. Credentials stored at `store.get('settings', 'ima')`.

- **companion** (`js/companion.js`): Gamified pet system with leveling, stats (focus, precision, inspiration, affinity), chat history, and personality traits. Chat uses AI module for responses.

- **planner** (`js/planner.js`): AI research planner. Takes a research question and optional biology background, generates a multi-tool analysis strategy.

- **ui** (`js/ui.js`): Central UI utilities — tab switching, modals, i18n via `data-i18n` attributes, theme management, custom cursor, notifications.

### Tab/Navigation System

Navigation is handled by `app.switchTab(tabId)`. Each tab corresponds to a `<section id="{tabId}-workspace">` in `index.html`. The companion is special — it opens as a modal overlay, not a tab.

### i18n

Translations are in `data/translations.js` (object `TRANSLATIONS`). HTML elements use `data-i18n` for text and `data-i18n-placeholder` for placeholders. `ui.applyTranslations()` processes these.

### Theming

Three themes: `day`, `sunset`, `midnight`. Set via `ui.setTheme(themeId)` which updates `data-theme` on `<body>` and stores preference in `localStorage` key `bio-hub-theme`. CSS variables `--glass-blur` and `--glass-opacity` control glassmorphism intensity.

## External Dependencies (CDN)

- jsPDF (`jspdf.umd.min.js`) — PDF generation
- PptxGenJS — PowerPoint generation
- marked.js — Markdown rendering

## Conventions

- All feature modules expose an `init()` function called during boot, and optionally a `refresh()` function called on tab switch.
- Dynamic HTML event handlers that need to call into feature modules go through the `window.app` bridge object (set up in `app.js`).
- Data seeding (default API settings, default research tools) happens in `store.seedInitialData()`.
- CSS is a single file: `css/style.css`.
