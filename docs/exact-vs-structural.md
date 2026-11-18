# Exact vs structural output

## Exact trained input

An exact payload is one whose canonical data signature exists in
`exact-map.json`.

```text
payload -> input signature -> exact-map -> final source render
```

Output:

- final settled PDF
- final settled `data.pb`
- byte-identical to the API source attempt

The verification script checks all four payloads:

```text
short     PDF equal, PB equal
balanced  PDF equal, PB equal
long      PDF equal, PB equal
stress    PDF equal, PB equal
```

## Structural input

A structural payload has the same item/array structure as an observed plan but
different text or values.

```text
payload shape -> observed plan + plate -> testcase -> PDF/PB
```

This is not a byte-identical API replay. It is a new generated document whose
layout is selected only from observed plans.

The structural showcase changes:

- client name
- project title
- one item detail

It still produces the measured `[7, 7]` page plan and the carry/brought-forward
rows.

## Unknown structural input

```text
E_MISSING_PLAN
```

No nearest-plan fallback. No silent layout shift.

The 51-row payload is included as a fail-closed example.

## What exact does not mean

Exact does not mean the runtime recomputes the source PDF. It returns the stored
final source bytes.

## What structural does not mean

Structural does not mean arbitrary HTML-to-PDF. It only uses observed plates,
plans, glyphs, and content profiles.

If any required piece is missing, generation fails closed with a render request.
