# Otto Sandbox Engine

The Otto Sandbox Engine provides isolated execution boundaries for experiments, tool calls, agent actions, and repository changes.

Core guarantees:

- no writes outside the approved sandbox root
- no path traversal or hidden file escapes
- no execution without a valid approval record
- recoverable snapshots and audit trail

This scaffold is intentionally minimal and intended to be extended into a standalone repository.
