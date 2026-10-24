# Signing DPet — without blocking testing

Current DPet beta releases are intentionally **unsigned**. They can be built for macOS and Windows without Apple Developer Program membership. Official macOS Developer ID signing and Apple notarization are **not possible without a paid Apple Developer account**; ad-hoc signing is not equivalent.

## Testing unsigned macOS betas

1. Download the DMG matching your Mac (arm64 for Apple Silicon, x64 for Intel).
2. Drag DPet.app to /Applications and try launching from Finder.
3. If Gatekeeper blocks it, check System Settings > Privacy & Security > Open Anyway.
4. For your own trusted build only, if needed, remove the quarantine attribute for *DPet only*:

```bash
xattr -dr com.apple.quarantine /Applications/DPet.app
open /Applications/DPet.app
```

Never disable macOS Gatekeeper globally. Windows SmartScreen may likewise warn about unsigned beta executables.

## Prepared for official macOS distribution

Signing-related packaging is already configured: hardened runtime, compatible entitlements, a conditional `afterSign` notarization hook, and optional CI secrets.

After enrolling in Apple Developer Program:

1. Export a Developer ID Application certificate and its private key into a P12.
2. Configure GitHub Actions secrets `MAC_CSC_LINK` (base64 encoded P12, or a secure URL) and `MAC_CSC_PASSWORD`.
3. Configure `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID`.
4. Trigger a release build. electron-builder will use the signing identity; the hook submits the signed application for Apple notarization.
5. Verify output with `codesign --verify --deep --strict --verbose=2 DPet.app` and `spctl --assess --type execute -vv DPet.app` and test Gatekeeper on a clean Mac.

Do not commit private keys, certificates or passwords. Signing requires verification of the packaged output; a green CI build alone is not proof of an Apple-trusted installer.

## Windows signing

Later, configure `WIN_CSC_LINK` and `WIN_CSC_PASSWORD` with a trusted Windows code-signing identity. Check the signed executables with Microsoft's `signtool verify /pa /v`.

## Release versioning

Every push to main validates and creates a numbered prerelease like `v0.2.0-beta.N`; the packaged app version matches the tag. Explicit `v*` tags create named GitHub releases.
