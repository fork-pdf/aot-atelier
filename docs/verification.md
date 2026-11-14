# Verification

`npm run verify` performs an offline verification using only committed files and
the installed runtime packages.

It does not call the ForkPDF API.

## Checks

| Check | What it does |
|---|---|
| `sourceParity` | compares template/CSS/testcase hashes with pinned upstream |
| `exactAll` | generates four exact payloads and compares PDF/PB bytes |
| `structural` | generates the structural payload and checks testcase success |
| `dynamicPagePlan` | verifies `[8, 6]` and two pages |
| `carryForward` | checks carried/brought markers and text in PB |
| `qr` | checks image `src` equals payload `qrDataUri` |
| `failClosed` | checks 51-row payload returns `E_MISSING_PLAN` |
| `worker` | checks worker exact output equals Node |
| `compliance` | checks structural refusal under `preserve` |

## Outputs

```text
verification.json
artifacts.sha256
```

`verification.json` includes:

- bundle size and SHA-256
- source parity hashes
- exact PDF/PB hashes and timings
- structural testcase results
- training patch trace
- fail-closed error
- worker parity
- compliance error
- provenance

## Commands

```bash
npm install
npm run verify
```

Exit code is non-zero if any check fails.

## Optional artifacts

```bash
npm run aot
```

Regenerates:

```text
output/aot/exact-*.pdf
output/aot/exact-*.pb
output/aot/structural-stress.pdf
output/aot/structural-stress.pb
output/aot/fail-closed.json
output/previews/*.png
```

`npm run aot` also runs verification.
