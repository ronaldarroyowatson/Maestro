# Maestro Embedded Otto Diagnostic Report

Date: 2026-07-05

## Scope

- Diagnose why installed Maestro could not be launched after pkg installation.
- Validate embedded Otto runtime presence and bootstrap invocation path.

## Findings

1. Installer deployed source/runtime files under `/opt/maestro` but did not include an embedded Otto executable path at `otto/bin/otto`.
2. Existing bootstrap scripts expected `otto` on PATH (or external installation).
3. Installer postinstall invoked bootstrap and failed with:
   - `PKInstallErrorDomain Code=112`
   - `Otto CLI not found. Set OTTO_BIN or install Otto first.`
4. No `/Applications/Maestro.app` bundle existed to provide a launch surface.
5. Command-service and update runtime artifacts were not bundled into a deterministic embedded Otto directory layout.

## Root Cause

Maestro installer architecture depended on an external Otto installation and PATH resolution. The package did not include a self-contained Otto core runtime and launch surface.

## Corrective Direction

- Bundle Otto runtime and command-service artifacts directly in installer payload.
- Launch via embedded binary path only.
- Provide a macOS app bundle that runs the embedded bootstrap.