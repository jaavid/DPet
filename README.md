# DPet — Liam, Ninoosh, Ozy & Slash

**Four desktop cats. One lively desktop.**

DPet brings Liam, Ninoosh, Ozy and Slash onto your macOS, Windows or Linux desktop as independent little companions. Liam is a playful white-and-tabby cat; Ninoosh has a cream coat, a smoky face and folded ears. They walk, greet each other, sit, groom, nap, look around, jump and react to a click.

DPet does not need an account, server, microphone, tracking or internet connection.

## Download

Download the latest automated beta from [GitHub Releases](https://github.com/jaavid/DPet/releases). Builds are available for Apple Silicon and Intel macOS (DMG/ZIP), Windows x64 (Setup/Portable), and Ubuntu/Debian x64 (.deb/AppImage). Unsigned beta installers can trigger macOS Gatekeeper or Windows SmartScreen; see [Signing and installation](docs/SIGNING.md).

## Controls

Click the **DPet icon** in the Mac menu bar or Windows/Linux system tray to open settings:

- **Pets** — show or hide Liam and Ninoosh independently.
- **Size** — 100, 120, 140, 160 or 180 pixels (default 140).
- **Start position** — left, center, right.
- **Distance from bottom** — 0, 12, 16, 24, 48 or 80 pixels.
- **Pause roaming** and **Playful behavior**.
- **Liam actions / Ninoosh actions** — pet (happy reaction), walk, sit, groom, nap, play, look, jump, happy.
- **Launch at login** and Quit.

Preferences are saved locally. Each of the four pets has a separate transparent desktop overlay; clicks outside the visible sprite pass through.

## Local development

Requires Node 22+:

```bash
git clone https://github.com/jaavid/DPet.git
cd DPet
npm install
npm run dev      # Electron desktop preview
npm run web      # Browser-only preview
npm run typecheck
npm test
```

Packaging: `npm run dist:mac` on Mac, `npm run dist:win` on Windows, or `npm run dist:linux` on Ubuntu/Debian.

## Architecture

- `src/core/` — platform-independent deterministic behavior engine, with tests.
- `src/main.ts` — Canvas renderer for desktop and browser.
- `electron/` — native transparent windows, tray, saved settings and positioning.
- `assets/sprite-sheets/` — four versioned, transparent 320×160 PNG atlases (80×80 frame, 4×2 grid).
- `src/core/spriteAtlas.ts` — shared frame order and mapping to behavior states.
- `scripts/prepare-assets.mjs` — validates/copies approved atlases and generates branded native icons.
- `docs/SIGNING.md` — unsigned beta testing and official signing/notarization.

Future mobile and Android TV builds may reuse the core state machine, with platform-specific frontends. iOS does not support a free-floating overlay across other apps.

**Artwork:** All four approved pixel-art sheets for Liam and Ninoosh are committed as PNG files, processed from the supplied character concept art. Actions are keyed as `[idle, look, sit, groom, nap, play, jump, happy]` in 4×2 order. Walk uses eight separate frames. Non-walk actions currently show one approved pose each; full multi-frame action animations remain a future step.

Copyright © 2026 DPet contributors. All rights reserved until a license is explicitly selected.

## Automatic update behavior

DPet checks public GitHub Releases when launched, then approximately every four hours (switchable from **Tray → Updates**). When a newer beta is published, a desktop notification and tray action appear; no manual version checking is required.

- **Windows installer (NSIS):** uses `electron-updater` to download SHA-512-verified update packages, and installs them after the app quits or from **Restart to install downloaded update**. The Portable edition is not a supported in-place auto-update target.
- **Linux (.deb/AppImage):** detects new GitHub Releases automatically and links to the Linux .deb; update installation is manual (not apt-backed by default).
- **Unsigned macOS beta:** shows the new version and takes you to the correct GitHub Release to install manually. Apple's Squirrel.Mac updater requires a signed app; without an Apple Developer ID certificate this cannot safely auto-replace the app. No account is required to build or test DPet.
- **After signing/notarization:** native macOS updater support can be enabled by the same release metadata.

DPet only checks releases when update checks are enabled. No telemetry, account, or updater service beyond GitHub is required.

## Ubuntu / Linux installation

DPet provides **x86_64/amd64** packages; both formats require a graphical desktop session:

- **Debian / Ubuntu:** download `DPet-*-linux-amd64.deb`, then install with `sudo apt install ./DPet-*-linux-amd64.deb` in the download directory. Launch from the application menu or `dpet`.
- **AppImage:** download `DPet-*-linux-x86_64.AppImage`, run `chmod +x DPet-*-linux-x86_64.AppImage`, then `./DPet-*-linux-x86_64.AppImage`. On distributions with missing FUSE 2 runtime, prefer the .deb instead of changing system security settings.

**Desktop limitation:** DPet uses transparent topmost windows and a tray icon. GNOME/Wayland compositors may restrict window positioning and always-on-top behavior; an **X11 desktop session** (or XWayland where supported) is recommended. This CI build validates packaging but does not exercise every Ubuntu compositor in a real interactive session.
