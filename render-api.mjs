#!/usr/bin/env node
/**
 * Normal ForkPDF API renderer for the Atelier invoice.
 *
 * This is the API twin of the AOT corpus renderer. It passes the testcase to
 * the API so the hosted renderer performs the same measured pagination patch.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ForkPDFClient } from 'forkpdf';
import {
  VARIANTS,
  loadCss,
  loadTestcase,
  renderHtml,
  variantPayload,
  root
} from './lib/template.mjs';

const apiKey = process.env.FORKPDF_API_KEY || process.env.PROD_API_KEY;
const projectId = process.env.FORKPDF_PROJECT_ID || process.env.PROD_PROJECT_ID;
if (!apiKey || !projectId) {
  throw new Error('Set FORKPDF_API_KEY and FORKPDF_PROJECT_ID (or PROD_API_KEY and PROD_PROJECT_ID).');
}

const requested = process.argv.slice(2);
const selected = requested.length ? requested : VARIANTS;
for (const variant of selected) {
  if (!VARIANTS.includes(variant)) throw new Error(`Unknown variant: ${variant}`);
}

const client = new ForkPDFClient(apiKey, projectId);
const outRoot = path.join(root, 'output', 'api');
fs.mkdirSync(outRoot, { recursive: true });

for (const variant of selected) {
  const payload = variantPayload(variant);
  const tempDir = path.join(outRoot, `.tmp-${variant}`);
  fs.rmSync(tempDir, { recursive: true, force: true });
  try {
    const result = await client.generate({
      htmlContent: renderHtml(payload),
      css: loadCss(),
      data: payload,
      testCase: loadTestcase(),
      format: 'A4',
      preferCSSPageSize: true,
      waitUntil: 'load',
      timeout: 30000,
      spatial: true,
      unzip: true,
      outputDir: tempDir
    });
    const pdf = result.pdfFilePath || path.join(tempDir, 'document.pdf');
    const pb = result.binaryFilePath || path.join(tempDir, 'data.pb');
    if (!fs.existsSync(pdf) || !fs.existsSync(pb)) {
      throw new Error(`${variant}: API did not return PDF and PB`);
    }
    fs.copyFileSync(pdf, path.join(outRoot, `atelier-${variant}.pdf`));
    fs.copyFileSync(pb, path.join(outRoot, `atelier-${variant}.pb`));
    console.log(`${variant}: ${result.testResults?.total_attempts ?? '?'} attempt(s)`);
    console.log(`${variant}: ${JSON.stringify(result.testResults)}`);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
