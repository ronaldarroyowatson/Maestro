# Integration Checklist (Non-Archival)

This checklist captures remaining non-archival items that involve external systems.

## Otto Command Service Registration
- Status: external to this repository.
- Action: register Maestro commands in the Otto command service repository.
- Verification: commands discoverable and invokable through Otto command layer.

## Otto Local File Link During Development
- Status: external to this repository.
- Action: set Maestro package link in Otto `package.json` to local path.
- Example value: `"maestro": "file:../maestro-v1"` (adjust path for actual workspace).
- Verification: Otto resolves local Maestro package without pulling a published artifact.

## Notes
- These tasks cannot be fully completed from this repository alone.
- All in-repo non-archival implementation and testing work is complete.
