# How ForkPDF AOT works

```text
payloads + render-corpus.mjs
        |
        v
ForkPDF API per testcase attempt
        |
        v
renders/<case>/attempt-N/{document.pdf,data.pb,payload.json}
        |
        v
fpaot compile
        |
        v
aot-output/ + template.fpaot
        |
        v
forkpdf-aot runtime
```

## Compile inputs

The compiler ingests observed data only:

- source PDF
- `data.pb` spatial metadata
- payload used for that render
- testcase results and patch state

It does not invent layouts, page counts, or content profiles.

## Compile outputs

- page plates
- observed plans
- exact input map
- source renders
- testcase
- glyph library
- coverage and render requests
- `.fpaot` bundle

## Runtime behavior

Exact trained input:

```text
input signature
  -> exact-map
  -> final source PDF/PB
```

Structural input:

```text
payload shape
  -> observed plan + plate
  -> execute testcase
  -> apply page plan
  -> generate PDF/PB
```

Unknown structural input:

```text
E_MISSING_PLAN
```

with a precise render request.

## Why plates

A plate is the static background of a page: rules, labels, images, and all
content that does not vary for that observed layout. Variable text is removed
from the plate and drawn at runtime.

This keeps rules and static text sharp and makes structural output much cheaper
than a full Chromium render.

## Why fail closed

The runtime never chooses a nearby page plan. If the observed corpus does not
cover the payload structure, it returns an error instead of producing a document
that looks plausible but is wrong.
