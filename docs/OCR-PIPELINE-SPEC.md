# OCR Pipeline Specification

## Scope
Define a deterministic OCR-oriented pipeline contract from `PageInput` to `ParsedPageResult` using Maestro node execution.

## Input Contract
`PageInput`
- `imagePath: string`
- `fixtureId: string`

## Output Contract
`ParsedPageResult`
- `fixtureId: string`
- `extractedText: string`
- `lineCount: number`

## Logical Stages
1. Image Loader
- Reads image bytes.
- Associates bytes with pipeline context metadata.

2. OCR Stage
- Produces raw transcription text.
- Associates OCR text with context metadata.

3. Parser Stage
- Normalizes extracted text.
- Produces `ParsedPageResult`.

## Graph Topology (Phase 6 fixtures)
- `trigger-entry` -> `loader` -> `ocr` -> `parser`
- Node shape for processing stages uses `service` with `purpose` config:
  - `load-image`
  - `ocr-read`
  - `parse-page`

## Validation Rules
- Graph must be acyclic.
- Referenced node IDs and ports must be valid.
- At least one entry trigger and one exit trigger are required.

## Fixture Requirements
- Pipeline descriptor XML in `fixtures/pipelines/`.
- Sample images in `fixtures/images/`:
  - `single-col.png`
  - `two-col.png`
  - `grid-2x2.png`
- Ground truth transcriptions in `fixtures/transcriptions/`.

## Verification
- Integration test executes fixture pipeline end-to-end for all fixture images.
- Expected behavior: execution status is `completed` or `partial`, output equals transcription fixture text.
