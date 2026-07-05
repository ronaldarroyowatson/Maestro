# Training Pipeline Feature

Implements Phase 5 Step 12 adaptive training flow.

Service order:
1. result-collector
2. training-queue
3. blob-packager
4. remote-sync
5. training-loop
6. model-distributor

The feature consumes eval-suite outputs and produces packaged training artifacts suitable for model update distribution.
