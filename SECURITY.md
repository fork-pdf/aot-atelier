# Security

## Credentials

This repository does not contain ForkPDF API keys.

`render-corpus.mjs` and `render-api.mjs` read credentials from:

```text
FORKPDF_API_KEY
FORKPDF_PROJECT_ID
PROD_API_KEY
PROD_PROJECT_ID
```

Use `.env.example` as a template. `.env` is ignored by git.

## Offline verification

`npm run verify` does not use credentials and does not make network requests.

## Artifacts

The committed PDFs and `data.pb` files contain the example invoice data only.
They are sample documents, not customer data.

## Reporting

Report security issues to `registry@forkpdf.com`.

Do not open a public issue containing credentials, customer data, or a
reproducible exploit.
