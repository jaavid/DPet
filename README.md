# DPet — six desktop companions

Bring **Liam, Ninoosh, Ozy, Slash, Toto and Chico** to your desktop. Four cats and two cockatiels can wander, play, rest and react to clicks.

**Windows, macOS and Ubuntu.** No account, server or tracking required to run DPet.

## Download the newest beta

These links **always point to the newest beta installer**, without needing to look up a version number.

| System | Download | Install |
| --- | --- | --- |
| Windows 10/11 (x64) | [DPet Windows Setup (.exe)](https://github.com/jaavid/DPet/releases/download/current-beta/DPet-Windows-Setup.exe) | Double-click and follow the installer |
| Mac Apple Silicon (M1–M-series) | [DPet macOS Apple Silicon (.dmg)](https://github.com/jaavid/DPet/releases/download/current-beta/DPet-mac-arm64.dmg) | Open DMG, drag DPet into Applications |
| Mac Intel | [DPet macOS Intel (.dmg)](https://github.com/jaavid/DPet/releases/download/current-beta/DPet-mac-x64.dmg) | Open DMG, drag DPet into Applications |
| Ubuntu/Debian (amd64) | [DPet Ubuntu (.deb)](https://github.com/jaavid/DPet/releases/download/current-beta/DPet-Ubuntu-amd64.deb) | Double-click using your package installer, or see below |

[All versioned releases](https://github.com/jaavid/DPet/releases) · [Current beta downloads](https://github.com/jaavid/DPet/releases/tag/current-beta)

### First launch on macOS

The beta is **not Apple Developer ID signed or notarized yet**. If Gatekeeper refuses to open DPet, try **System Settings → Privacy & Security → Open Anyway** after attempting to launch it. If that option does not appear, and **only after verifying you downloaded your own trusted build**, you may run:

```bash
xattr -dr com.apple.quarantine "/Applications/DPet.app"
open "/Applications/DPet.app"
```

Never disable Gatekeeper system-wide. See [Signing details](docs/SIGNING.md).

### Ubuntu terminal install

Download the DEB above, then run:

```bash
cd ~/Downloads
sudo apt install ./DPet-Ubuntu-amd64.deb
```

If you downloaded a versioned release instead, substitute its actual DEB filename. DPet is a graphical desktop app; GNOME/Wayland may restrict transparent overlay placement, so an X11 session is recommended for the first test.

## Controls and updates

Open the **DPet icon** in the macOS menu bar or Windows/Linux system tray. Select which companions appear using **Pets**. Change Size, Start position, Distance from bottom, or toggle playful activity. Select individual actions such as grooming, napping, hopping or spreading wings.

DPet checks GitHub for new releases at startup and roughly every four hours; toggle it in **Updates**. Windows NSIS installers support background download and install on quit (when update metadata is available). On unsigned macOS and Ubuntu DEB, DPet notifies you of a newer version and opens the installer link; installation is manual.

## Develop

Requires Node.js 22+.

```bash
git clone https://github.com/jaavid/DPet.git
cd DPet
npm install
npm run dev
npm run typecheck
npm test
```

Use `npm run web` for a browser preview, or build installers on the matching OS with `npm run dist:mac`, `npm run dist:win`, `npm run dist:linux`.

## Implementation

- `src/core`: platform-independent deterministic pet behavior + tests.
- `electron`: native desktop overlays, tray, update checks and preferences.
- `src/main.ts`: Canvas renderer.
- `assets/sprite-sheets`: versioned sprite atlases.
- `scripts/prepare-assets.mjs`: sprite normalization and native icons.
- `.github/workflows/release.yml`: builds macOS DMGs and internal ZIP update payloads, Windows Setup, Ubuntu DEB, and updater metadata. Public releases preserve ZIP and relevant blockmaps for update support; they are not alternate installers.

### Future platforms

The portable behavior engine can power Android, Android TV and an iOS in-app companion, but iOS does not allow an unrestricted floating pet over other apps.

© 2026 DPet contributors. All rights reserved; no open-source license has been granted.
