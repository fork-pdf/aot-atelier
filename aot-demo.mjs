#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { runVerification } from './lib/verification.mjs';
import { root } from './lib/template.mjs';

const verification = await runVerification();
const previewRoot = path.join(root, 'output', 'previews');
fs.mkdirSync(previewRoot, { recursive: true });

const previews = [
  ['exact-short', 'exact-short.pdf', 1],
  ['exact-balanced', 'exact-balanced.pdf', 1],
  ['exact-long', 'exact-long.pdf', 1],
  ['exact-stress', 'exact-stress.pdf', 1],
  ['exact-stress-page-2', 'exact-stress.pdf', 2],
  ['structural-stress', 'structural-stress.pdf', 1],
  ['structural-stress-page-2', 'structural-stress.pdf', 2]
];

for (const [name, file, page] of previews) {
  const pdf = path.join(root, 'output', 'aot', file);
  if (!fs.existsSync(pdf)) continue;
  const target = path.join(previewRoot, name);
  try {
    execFileSync('pdftoppm', [
      '-png',
      '-r',
      '120',
      '-singlefile',
      '-f',
      String(page),
      '-l',
      String(page),
      pdf,
      target
    ], { stdio: ['ignore', 'ignore', 'ignore'] });
  } catch {
    // pdftoppm is optional for the showcase.
  }
}

console.log(JSON.stringify({
  ok: verification.ok,
  bundleBytes: verification.bundle.bytes,
  exact: verification.exact.map((entry) => entry.variant),
  structural: verification.structural.pageSizes,
  output: 'output/aot',
  previews: 'output/previews',
  verification: 'verification.json'
}, null, 2));

if (!verification.ok) process.exitCode = 1;
