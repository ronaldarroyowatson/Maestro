# Maestro v0.4 Release Checklist

## 1. Pre-Release Validation

- [ ] Confirm `VERSION` is `0.4.0`
- [ ] Confirm `CHANGELOG.md` has a `Maestro 0.4` entry
- [ ] Run smoke tests:

```bash
python -m unittest discover -s tests -p "test_smoke_maestro.py"
```

- [ ] Compile key scripts:

```bash
python -m py_compile run_maestro.py install_maestro.py backend/main.py
```

## 2. Commit Release Changes

```bash
git status
git add VERSION CHANGELOG.md readme.md run_maestro.py install_maestro.py tests/test_smoke_maestro.py backend/state.py frontend/app.js
git commit -m "release: prepare Maestro v0.4.0"
```

## 3. Tag the Release

```bash
git tag -a v0.4.0 -m "Maestro v0.4.0"
```

## 4. Push Commit and Tag

```bash
git push origin main
git push origin v0.4.0
```

## 5. Create GitHub Release

- [ ] Open repository on GitHub -> Releases -> New release
- [ ] Choose tag: `v0.4.0`
- [ ] Title: `Maestro v0.4.0`
- [ ] Description highlights:
  - Stabilized multi-agent handoff and execution flow
  - Fixed coder code capture to dashboard
  - Added smoke test suite in `tests/`
  - Added unified entrypoint `run_maestro.py`
  - Added installer script `install_maestro.py`
  - Updated README Quick Start and architecture notes
- [ ] Publish release

## 6. Post-Release Verification

- [ ] Fresh install test:

```bash
python install_maestro.py
python run_maestro.py
```

- [ ] Confirm dashboard opens and agents complete a sample task
- [ ] Confirm tag appears in GitHub Releases
