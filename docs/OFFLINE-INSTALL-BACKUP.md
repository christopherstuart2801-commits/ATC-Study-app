# Offline install, device backup, and the Head Guide

This version (0.8.37) stays the single-page app in `site/index.html`. It adds install metadata, an offline cache of the public files already in the app, a device backup, and the VECTOR Head Guide. It does not add accounts, a publication updater, or a training-chief login.

## Install

The app is a site, not an app-store product, and not a Department of Defense approval.

- Windows Chrome or Edge: Install in the address bar, or the menu → Apps → Install VECTOR ATC. An Install button appears when the browser offers it.
- iPhone: Safari → Share → Add to Home Screen. There is no App Store download.

The manifest and icons are next to `site/index.html`. Paths are relative, so GitHub Pages serves them under `/ATC-Study-app/` and a local server can serve the `site/` folder at its root.

## Offline

Open the site once while online. The service worker (`site/sw.js`) saves an enumerated shell: the page, this guide, study JSON, pdf.js, and icons. Publication PDFs referenced by the page are saved from that same enumerated list, one file at a time. A file that fails is reported and is not replaced with the app page.

The worker does not cache other websites, notes, credentials, or API responses. Device shows the publication count only after the app shell is saved. The browser storage estimate is a separate origin figure and can stay at 0 even when those files are saved; the page says so instead of treating 0 as an empty cache. A new app version waits until you choose Update. That reload does not erase study progress. There is no official-publication updater in this version.

`file://` cannot register a service worker. Use the hosted site or a local HTTP server.

## Device backup

Device → Export backup downloads one JSON file (`format` `vector-atc-backup`, version 1) of the `vatc.*` values on this device, including trainee name and initials, marks, checks, lessons, flashcards, tests, custom sets, and pocket keys. Import checks the file and asks before it replaces progress on this device. A bad file or a failed write leaves current progress in place. Nothing is uploaded.

## Head Guide

Head Guide (`#guide`) is visible with no login. It is for a successor or training chief. It labels rosters, office progress, office test review, reviews, and the training-chief role as later work. The chief role is planned to use a one-time code issued outside this app. This version does not accept a code and does not change permissions.

Report feedback (`#feedback`) only builds a note you can copy. Opening it sends nothing.

## Checks

`node site/scripts/test-offline.cjs` checks the cache list, routing, backup, guide wording, and that the study banks are unchanged. `node site/scripts/smoke-offline.mjs` loads the site under `/ATC-Study-app/`, reloads offline, and opens the guide.
