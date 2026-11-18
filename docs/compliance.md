# Compliance

## Exact replay

Exact trained inputs return the original source PDF bytes.

If the source PDF was tagged, PDF/A, or PDF/UA, those bytes are preserved
exactly. The AOT runtime does not rewrite them.

## Structural generation

Structural generation creates a new PDF from plates and glyphs.

When the bundle is compiled with a compliance profile, structural generation
emits tagged output from the locked structure contract:

```js
const runtime = loadCompiled('template.fpaot', {
  compliance: { required: 'pdf-ua-1' }
});
```

Bundles compiled with `compliance.required=none` refuse structural compliance
requests instead of emitting an untagged PDF:

```text
E_COMPLIANCE_REQUIRED                older bundles without a lock
E_COMPLIANCE_STRUCTURE_UNAVAILABLE   exact-only bundles
```

This Atelier showcase compiles with `none`, so its structural compliance
requests stay fail-closed. The engine supports compliant structural bundles;
see the runtime README for the full policy list.

## Policies

```text
none, preserve,
pdf-ua-1, pdf-ua-2,
pdf-a-2b, pdf-a-2u, pdf-a-2a,
pdf-a-3b, pdf-a-3u, pdf-a-3a,
pdf-a-4,
pdf-ua-1+pdf-a-2b, pdf-ua-1+pdf-a-2u, pdf-ua-1+pdf-a-2a,
pdf-ua-1+pdf-a-3b, pdf-ua-1+pdf-a-3u, pdf-ua-1+pdf-a-3a,
pdf-ua-2+pdf-a-4
```

`preserve` allows exact replay only. Source renders must be tagged and carry
PDF/UA or PDF/A metadata.

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

## Compiling a compliant structural bundle

Set the target profile in `compiler.config.json` and compile normally:

```json
{ "compliance": { "required": "pdf-ua-1" } }
```

```bash
fpaot compile --profile
```

`fpaot render` passes the compliance option to the ForkPDF API. Custom render
scripts receive:

```text
FORKPDF_COMPLIANCE
FORKPDF_TARGET_LANG
```

## Validation boundary

The compiler lock checks `Tagged` plus XMP metadata with `pdfinfo`. veraPDF is
the CI compliance gate across PDF/UA-1/2, PDF/A-2/3/4, and the combined
profiles.

Some API PDF/UA layouts, including testCase-driven multi-page stress, may need a
settled payload render before the source itself is compliant.
