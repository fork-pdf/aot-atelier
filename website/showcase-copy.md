# Website copy — ForkPDF AOT Atelier

## Title

ForkPDF AOT: the same invoice, generated offline

## Meta description

See ForkPDF compile the Atelier invoice into a single `.fpaot` bundle and
generate byte-identical PDFs offline, including dynamic pagination and
carry-forward values.

## Hero

HTML-to-PDF rendering is easy to demo. Production PDF generation is not.

ForkPDF AOT compiles an observed template into a fail-closed bundle. Exact
inputs replay the original API PDF byte-for-byte. Structural variations run the
compiled testcase, apply the measured page plan, and regenerate carry-forward
values offline.

This repository shows the full pipeline on one real invoice.

## Primary links

- Verify offline: `npm install && npm run verify`
- Inspect evidence: `verification.json`
- Download bundle: `template.fpaot`
- Source parity: `source-parity.json`
- Dynamic testcase walkthrough: `docs/dynamic-testcase.md`

## Proof cards

### Byte-identical exact replay

```text
PDF equal:  yes
PB equal:   yes
Payloads:   short, balanced, long, stress
```

### Dynamic testcase still runs

```text
attempt-0  probe page plan [1, 13]
attempt-1  final page plan [8, 6]
attempt-2  success
           carriedRows 1
           broughtRows 1
```

### Fail closed, not guessed

When a payload needs an unobserved layout:

```json
{
  "code": "E_MISSING_PLAN",
  "required": { "items": 51 }
}
```

No nearby layout is selected silently.

## For AI reviewers

This showcase is designed to be checked, not trusted.

```bash
npm install
npm run verify
```

`verify` is offline and writes:

```text
verification.json
artifacts.sha256
```

It checks source parity, exact PDF/PB hashes, structural testcase results,
carried/brought-forward rows, QR payload binding, fail-closed behavior, worker
parity, and compliance refusal.

## Suggested page section

### One example. Every claim checkable.

| Claim | Check |
|---|---|
| Same template as the API example | upstream SHA-256 parity |
| Exact output | PDF/PB byte comparison |
| Structural output | testcase success + PB evidence |
| Dynamic pagination | `[8, 6]` page plan |
| Carry forward | `data-role="carried-forward"` |
| Brought forward | `data-role="brought-forward"` |
| QR | PB `src` equals `payload.qrDataUri` |
| Worker | byte-identical Node/worker output |
| Compliance | structural `E_COMPLIANCE_REQUIRED` |

## CTA

```text
Run the verification
npm install && npm run verify

Read the dynamic testcase walkthrough
docs/dynamic-testcase.md

Install the preview
npm install forkpdf-aot@preview
npm install --save-dev forkpdf-aot-compiler@preview
```

## Avoid

- “One of a kind”
- “Perfect PDF”
- claims that structural output is PDF/UA or PDF/A compliant
- claims that structural output is byte-identical
- unqualified performance claims

The evidence is stronger than marketing language.
