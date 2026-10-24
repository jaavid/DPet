# DPet — Liam & Ninoosh

**Two tiny cats. One lively desktop.**

DPet brings Liam and Ninoosh onto your macOS or Windows desktop as independent little companions. Liam is a playful white-and-tabby cat; Ninoosh has a cream coat, a smoky face and folded ears. They walk, greet each other, sit, groom, nap, look around, jump and react to a click.

DPet does not need an account, server, microphone, tracking or internet connection.

## Download

Download the latest automated beta from [GitHub Releases](https://github.com/jaavid/DPet/releases). Builds are available for Apple Silicon and Intel macOS (DMG/ZIP), and Windows x64 (Setup/Portable). Unsigned beta installers can trigger macOS Gatekeeper or Windows SmartScreen; see [Signing and installation](docs/SIGNING.md).

## Controls

Click the **DPet icon** in the Mac menu bar or Windows tray to open settings:

- **Pets** — show or hide Liam and Ninoosh independently.
- **Size** — 100, 120, 140, 160 or 180 pixels (default 140).
- **Start position** — left, center, right.
- **Distance from bottom** — 0, 12, 16, 24, 48 or 80 pixels.
- **Pause roaming** and **Playful behavior**.
- **Liam actions / Ninoosh actions** — pet, walk, sit, groom, nap, play, look, jump.
- **Launch at login** and Quit.

Preferences are saved locally. Each pet has a separate transparent desktop overlay; clicks outside the visible sprite pass through.

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

Packaging: `npm run dist:mac` on Mac or `npm run dist:win` on Windows.

## Architecture

- `src/core/` — platform-independent deterministic behavior engine, with tests.
- `src/main.ts` — Canvas renderer for desktop and browser.
- `electron/` — native transparent windows, tray, saved settings and positioning.
- `scripts/prepare-assets.mjs` — sprite and branded icon generation.
- `docs/SIGNING.md` — unsigned beta testing and official signing/notarization.

Future mobile and Android TV builds may reuse the core state machine, with platform-specific frontends. iOS does not support a free-floating overlay across other apps.

**Artwork:** Liam's walk uses the existing prototype sprite; Ninoosh and the additional actions are new stylized pixel-like recreations based on the supplied cat photo. Higher-fidelity animation sheets remain a future art task.

Licensed under MIT; see LICENSE.
