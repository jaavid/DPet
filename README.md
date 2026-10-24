# DPet

A little desktop home for Liam — a white-and-tabby cat that wanders across your desktop.

## Getting started

Requires Node.js 22+.

```sh
npm install
npm run dev
```

Open the web preview with `npm run web`. Build the desktop app with `npm run build`, then `npm run dist:mac` on macOS or `npm run dist:win` on Windows.

DPet uses a shared, platform-independent behavior engine (`src/core`), an HTML Canvas renderer, and a transparent Electron window. Future mobile/TV clients can use the same behavior model but need different renderers and OS integration.

## Releases

Each push to `main` runs validation and unsigned macOS/Windows builds, publishing an automatic prerelease `v0.1.0-beta.<run-number>`. Version tags (`v*`) publish releases. Unsigned installers can trigger OS security warnings. Real distribution requires Apple Developer ID notarization and Windows code signing.

© DPet contributors.