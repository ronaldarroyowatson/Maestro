# Eval Suite Feature

Implements Phase 5 Step 11 quality evaluation pipeline.

Service order:
1. cer-calculator
2. wer-calculator
3. confidence-estimator
4. experiment-runner
5. result-logger

The `EvalSuite` facade composes all services and supports deterministic testable outputs.
