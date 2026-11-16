# Compliance

## Exact replay

Exact trained inputs return the original source PDF bytes.

If the source PDF was tagged, PDF/A, or PDF/UA, those bytes are preserved
exactly. The AOT runtime does not rewrite them.

## Structural generation

Structural generation creates a new PDF from plates and glyphs.

It does not yet preserve:

- tagging
- structure tree
- XMP metadata
- PDF/A output intent
- PDF/UA semantics

With a compliance policy, structural generation fails closed:

```js
const runtime = loadCompiled('template.fpaot', {
  compliance: { required: 'pdf-ua-1' }
});
```

Exact-only locked bundles use:

```text
E_COMPLIANCE_STRUCTURE_UNAVAILABLE
```

Older bundles without a lock use:

```text
E_COMPLIANCE_REQUIRED
```

## Policies

```text
none
preserve
pdf-ua-1
pdf-ua-2
pdf-a-4
```

`preserve` allows exact replay only.

Specific profiles require source XMP metadata matching the requested profile.

## Input lock

When compliance is not `none`, every final source render must already satisfy
the selected profile. The compiler rejects a mixed or non-compliant corpus:

```text
E_COMPLIANCE_SOURCE_MISMATCH
E_COMPLIANCE_MIXED_SOURCES
```

A locked bundle records:

```text
compliance.lock.json
structure/<source-render>.json
```

The structure contract is read-only. It records the existing `StructTreeRoot`,
roles, MCIDs, table headers, figure alt text, language, metadata flags, and XMP.
It never rewrites the source PDF.

The runtime cannot downgrade a locked bundle:

```text
E_COMPLIANCE_LOCKED
```

## Exact-only training

Structural tagging is not implemented yet. A compliance-required compile must
opt in explicitly:

```bash
fpaot compile --train-exact-only
```

`fpaot render` passes the compliance option to the ForkPDF API. Custom render
scripts receive:

```text
FORKPDF_COMPLIANCE
FORKPDF_TARGET_LANG
```

Without explicit exact-only opt-in, the compiler rejects structural compliance
before any API call:

```text
E_COMPLIANCE_STRUCTURAL_UNSUPPORTED
```

## Validation boundary

The compiler lock checks `Tagged` plus XMP metadata with `pdfinfo`. Full
veraPDF/axes4 validation is a separate CI gate and must pass before a public
structural compliance claim is made.

Some API PDF/UA layouts, including testCase-driven multi-page stress, may need a
settled payload render before the source itself is compliant.
