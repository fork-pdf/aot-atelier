# Evidence

This file summarizes the machine-readable checks in
[`verification.json`](verification.json) and
[`artifacts.sha256`](artifacts.sha256).

No API key, network request, or ForkPDF credit is used by verification.

## Source parity

Upstream:

```text
repository  https://gitlab.com/fork-pdf/examples
path        invoices/freelance/01-atelier
commit      80643556638b21162e91c51978e9ea5179208f55
```

| File | SHA-256 |
|---|---|
| `invoice.njk` | `692e2df3f22cafa8ae19d7bfc048b774dc04020dd47150df10464ca864153a61` |
| `styles.css` | `544f02be02be445ed4417512a46a321eac1210db6623ebd2de5293128cda733e` |
| `testcase.js` | `dc30036beae824b226ba8e6767e9ebc4a7ae1cdf09e90195d7f83a906e7a345f` |

Result:

```text
sourceParity: true
```

## Bundle

```text
template.fpaot
  bytes   1,782,997
  sha256  a01a1e65a200d866b095fa0e2bef16674c9b10e18e7d4711a2560364dc5ad810
  entries 35
  plates  13
  plans   6
```

## Exact replay

Each exact payload was generated offline and compared byte-for-byte with the
final source API attempt.

| Payload | PDF equal | PB equal |
|---|---:|---:|
| short | yes | yes |
| balanced | yes | yes |
| long | yes | yes |
| stress | yes | yes |

Warm exact replay is single-digit milliseconds on the test machine. Timing is
reported per payload in `verification.json`.

Result:

```text
exactAll: true
```

## Structural replay

The structural payload changes the client name, project title, and one item
detail. It is not an exact trained input.

```text
structural: true
exactSource: false
plan: stress/attempt-2
pageSizes: [8, 6]
totalPages: 2
carriedRows: 1
broughtRows: 1
duration: reported in `verification.json`
```

Generated PB evidence:

```text
imageCount: 1
qrSrcMatches: true
carriedRows: 1
broughtRows: 1
hasCarriedText: true
hasBroughtText: true
```

## Dynamic testcase trace

The stress payload required three training attempts.

```text
attempt-0
  patch: pageSizes [1, 13], probePass 1
  reason: Forcing a fitting page for measurement

attempt-1
  patch: pageSizes [8, 6], measurePass 1
  reason: Applied final page plan after probe

attempt-2
  success: true
  pageSizes: [8, 6]
  totalPages: 2
  carriedRows: 1
  broughtRows: 1
```

The testcase is stored in the bundle and executed again for structural runtime
generation.

## Fail-closed behavior

A 51-row payload produced:

```json
{
  "ok": false,
  "code": "E_MISSING_PLAN",
  "required": {
    "items": 51
  }
}
```

Result:

```text
failClosed: true
```

## Worker parity

`loadCompiledBytes(template.fpaot)` generated the balanced payload and matched
the Node exact output byte-for-byte.

```text
worker.exactEqual: true
```

## Compliance behavior

With `compliance.required=preserve`, structural generation returned:

```text
E_COMPLIANCE_REQUIRED
```

Exact replay still preserves the original source PDF bytes.

```text
compliance: true
```

## Reproduce

```bash
npm install
npm run verify
```

The command writes:

```text
verification.json
artifacts.sha256
```

and exits non-zero if any check fails.
