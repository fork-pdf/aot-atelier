#!/usr/bin/env node
/**
 * ForkPDF corpus renderer used by fpaot render.
 *
 * The AOT compiler owns testcase execution and calls this script once per
 * attempt. It deliberately does not pass `testCase` to the API.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ForkPDFClient } from 'forkpdf';
import { loadCss, payloadFromFile, renderHtml } from './lib/template.mjs';

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : null;
}

const payloadFile = readArg('payload') || process.env.FORKPDF_PAYLOAD;
const outputDir = readArg('out') || process.env.FORKPDF_OUTPUT_DIR;
if (!payloadFile) throw new Error('Missing --payload <file>');
if (!outputDir) throw new Error('Missing --out <dir>');

const apiKey = process.env.FORKPDF_API_KEY || process.env.PROD_API_KEY;
const projectId = process.env.FORKPDF_PROJECT_ID || process.env.PROD_PROJECT_ID;
if (!apiKey || !projectId) {
  throw new Error('Set FORKPDF_API_KEY and FORKPDF_PROJECT_ID (or PROD_API_KEY and PROD_PROJECT_ID).');
}

const payload = payloadFromFile(payloadFile);
const html = renderHtml(payload);
const css = loadCss();
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'page.html'), html);

const client = new ForkPDFClient(apiKey, projectId);
const result = await client.generate({
  htmlContent: html,
  css,
  data: payload,
  format: 'A4',
  preferCSSPageSize: true,
  waitUntil: 'load',
  timeout: 30000,
  spatial: true,
  unzip: true,
  outputDir
});

console.log(`rendered: ${path.relative(process.cwd(), outputDir) || '.'}`);
if (result.pdfFilePath) console.log(`pdf: ${result.pdfFilePath}`);
if (result.binaryFilePath) console.log(`pb: ${result.binaryFilePath}`);
