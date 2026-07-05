# Maestro Installer Otto Binary Verification

Date: 2026-07-05

## Scope

- Verified the Otto binary entrypoint used by Maestro bootstrap installers.
- Checked for stale references to the pre-extraction embedded command-service layout.

## Findings

- The bootstrap installers resolve Otto through `OTTO_BIN` with a default of `otto` in the Linux and macOS scripts, and through the `otto` command in Windows PowerShell.
- No installer script hard-codes an outdated Otto binary path.
- The installer flow uses the standalone Otto CLI entrypoint to run `ui splash`, `self-update`, and `maestro install`.

## Evidence

- Linux bootstrap: `installer/linux/bootstrap.sh`
- macOS bootstrap: `installer/macos/bootstrap.sh`
- Windows bootstrap: `installer/windows/bootstrap.ps1`
- Installer architecture notes: `installer/README.md`

## Conclusion

- Maestro installers already point at the current Otto CLI entrypoint and do not reference an obsolete embedded binary path.
- No code change was required for the Otto binary reference itself.