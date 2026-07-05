# Maestro Installer Workflow Verification

Date: 2026-07-05

## Scope

- Verified that permanent GitHub Actions workflows exist for macOS, Linux, and Windows installer publication.

## Findings

- The workflow set now consists of:
  - `.github/workflows/maestro-installers-linux.yml`
  - `.github/workflows/maestro-installers-macos.yml`
  - `.github/workflows/maestro-installers-windows.yml`
- Each workflow triggers on `main`, tagged releases, and manual dispatch.
- Each workflow packages the repository snapshot, builds an OS-specific installer artifact, and publishes it to the latest release.

## Result

- Durable latest-release URLs are supported by the workflow outputs.
- The workflow names and artifact names match the durable download paths documented in the repository.