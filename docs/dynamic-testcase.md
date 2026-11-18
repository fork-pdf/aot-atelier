# Dynamic testcase logic after compilation

The concern:

> If pagination and carry-forward values are computed by a testcase at render
> time, do they still work after AOT compilation?

Yes. The testcase is not discarded.

## 1. The template owns values

The Atelier template slices `items` into pages and computes:

- page subtotal
- carried-forward value
- brought-forward value
- final totals

## 2. The testcase owns measurement

`testcase.js` measures the rendered DOM, calculates page capacity from row
heights, and returns a patch:

```js
{
  patch: {
    pageSizes: [7, 7],
    measurePass: 1,
    probePass: 0
  },
  reason: 'Applied final page plan after probe'
}
```

## 3. The compiler records every attempt

For the 14-row stress payload:

```text
attempt-0  pageSizes [1, 13]  probePass 1
attempt-1  pageSizes [7, 7]   measurePass 1
attempt-2  success
           pageSizes [7, 7]
           totalPages 2
           carriedRows 1
           broughtRows 1
```

`renders/stress/patch-trace.json` contains the full trace. The settled attempt
stores the source PDF and `data.pb`.

## 4. The bundle stores the testcase

The `.fpaot` bundle contains:

```text
testcase.js
plans.json
plate-library.json
exact-map.json
source-renders/
```

## 5. Runtime exact replay

An exact trained payload returns the settled source PDF/PB directly.

## 6. Runtime structural replay

For a structural payload, the runtime:

1. loads the observed plan and plate
2. renders the template
3. executes `testcase.js`
4. applies the measured page plan
5. emits PDF and `data.pb`

The structural showcase changes the client name, project title, and one item
detail. The testcase still returns:

```json
{
  "success": true,
  "pageSizes": [7, 7],
  "totalPages": 2,
  "carriedRows": 1,
  "broughtRows": 1
}
```

The generated PB contains:

```text
data-role="carried-forward"
data-role="brought-forward"
CARRIED FORWARD
BROUGHT FORWARD
```

See `output/previews/structural-stress.png` and
`output/previews/structural-stress-page-2.png`.

## Why this is safe

- Exact inputs replay the settled bytes.
- Structural inputs execute the same testcase again.
- Unknown structures fail closed.
- The compiler never guesses a page plan.
