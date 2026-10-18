# Otto Payload Command-Service Verification

Date: 2026-07-05

## Scope

- Verified that the Otto payload includes the standalone command-service dependency needed during Maestro install.

## Findings

- `otto/maestro-payload.json` now includes an explicit `otto-command-service` artifact with a git source, version pin, and install path.
- The payload still includes the Maestro source checkout, build output, UI assets, configuration defaults, telemetry hooks, and lifecycle hooks.
- The command source-of-truth block continues to point at `../otto-command-service`.

## Result

- Otto installation for Maestro now has an explicit command-service artifact in addition to the command manifest contract.
- The payload remains compatible with the existing schema and install flow.