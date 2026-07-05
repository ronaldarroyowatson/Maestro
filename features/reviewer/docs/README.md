# Reviewer Feature

This feature performs edge-level output checks using schema validation and rule evaluation,
then returns one of three decisions: accepted, revision-requested, or rejected.

## Structure
- models/: reviewer contracts
- services/: schema-validator, rule-evaluator, decision-engine, revision-prompter
- tests/: feature tests
- docs/: feature docs
