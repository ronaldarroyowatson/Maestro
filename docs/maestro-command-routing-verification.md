# Maestro Command Routing Verification

Date: 2026-07-05

## Scope

- Rescanned installer, update, telemetry, and UI command routing surfaces.
- Checked for embedded command-service logic and standalone CLI code.

## Findings

- Maestro command contracts resolve through the standalone `@otto/command-service` package in `src/shared/utils/commandServiceContract.ts`.
- `otto/maestro-commands.json` declares `../Otto/otto-command-service` as the source of truth for Maestro command schemas.
- `otto/maestro-payload.json` now also includes an explicit `otto-command-service` artifact entry for install-time availability.
- No embedded command-service implementation or standalone Maestro CLI parser was found in the active Maestro source paths.

## Evidence

- Command contract validation: `src/shared/utils/commandServiceContract.ts`
- Command manifest: `otto/maestro-commands.json`
- Otto payload: `otto/maestro-payload.json`
- Workspace validation docs: `docs/maestro-compatibility-verification.md`

## Conclusion

- Maestro command routing remains on the standalone Otto command-service layer.
- No stale embedded command-service wiring was found in the checked source paths.