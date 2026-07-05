# Maestro Durable Installer URL Verification

Date: 2026-07-05

## Scope

- Verified repository documentation uses version-independent release asset URLs.

## Updated URLs

- Windows: `https://github.com/ronaldarroyowatson/Maestro/releases/latest/download/maestro-installer-windows.exe`
- Linux: `https://github.com/ronaldarroyowatson/Maestro/releases/latest/download/maestro-installer-linux.sh`
- macOS: `https://github.com/ronaldarroyowatson/Maestro/releases/latest/download/maestro-installer-macos.pkg`

## Result

- Installer links now resolve through the GitHub Releases `latest/download` endpoint and are not tied to versioned asset names.
- The published asset names match the durable URLs for each platform.