# Compliance

## Exact replay

Exact trained inputs return the original source PDF bytes.

If the source PDF was tagged, PDF/A, or PDF/UA, those bytes are preserved
exactly. The AOT runtime does not rewrite them.

## Structural generation

Structural generation creates a new PDF from plates and glyphs.

It does not preserve:

- tagging
- structure tree
- XMP metadata
- PDF/A output intent
- PDF/UA semantics

With a compliance policy, structural generation fails closed:

```js
const runtime = loadCompiled('template.fpaot', {
  compliance: { required: 'preserve' }
});
```

Result:

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

`preserve` allows exact replay and rejects structural generation.

Specific profiles additionally require source XMP metadata matching the
requested profile.

## Training guard

`fpaot render` blocks compliance-required training before any API call:

```text
E_COMPLIANCE_TRAINING_UNSUPPORTED
```

This prevents spending credits on corpora whose structural output AOT cannot
generate compliantly.

Exact-only `preserve` training requires explicit opt-in:

```bash
fpaot render --train-exact-only
```
