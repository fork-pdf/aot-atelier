import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';
import { loadCompiled } from 'forkpdf-aot/runtime';
import { loadCompiledBytes } from 'forkpdf-aot/worker';
import {
  VARIANTS,
  oversizedPayload,
  root,
  structuralPayload,
  variantPayload
} from './template.mjs';

const require = createRequire(import.meta.url);
const { SpatialDocument } = require('forkpdf');

const bundleFile = path.join(root, 'template.fpaot');
const outputRoot = path.join(root, 'output');
const aotRoot = path.join(outputRoot, 'aot');
const apiRoot = path.join(outputRoot, 'api');

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function finalAttempt(variant) {
  const caseDir = path.join(root, 'renders', variant);
  const attempts = fs.readdirSync(caseDir)
    .filter((name) => /^attempt-\d+$/.test(name))
    .sort((a, b) => Number(a.slice(8)) - Number(b.slice(8)));
  if (!attempts.length) throw new Error(`No attempts for ${variant}`);
  return path.join(caseDir, attempts[attempts.length - 1]);
}

function sourceParity() {
  const expected = readJson(path.join(root, 'source-parity.json'));
  const files = {};
  for (const [file, expectedHash] of Object.entries(expected.files)) {
    const actual = sha256(fs.readFileSync(path.join(root, file)));
    files[file] = {
      expected: expectedHash,
      actual,
      equal: actual === expectedHash
    };
  }
  return {
    upstream: expected.upstream,
    files,
    ok: Object.values(files).every((entry) => entry.equal)
  };
}

async function inspectPb(pbBytes, payload) {
  const doc = new SpatialDocument();
  await doc.load(Buffer.from(pbBytes));
  const images = doc.nodes.filter((node) => node.tag_name === 'img');
  const carried = doc.nodes.filter((node) => node.attributes?.['data-role'] === 'carried-forward');
  const brought = doc.nodes.filter((node) => node.attributes?.['data-role'] === 'brought-forward');
  const text = doc.nodes
    .filter((node) => node.tag_name === '#text')
    .map((node) => String(node.text_content || '').trim())
    .filter(Boolean);
  return {
    imageCount: images.length,
    qrSrcMatches: images.length > 0 && images.every((node) => node.attributes?.src === payload.qrDataUri),
    carriedRows: carried.length,
    broughtRows: brought.length,
    hasCarriedText: text.includes('CARRIED FORWARD'),
    hasBroughtText: text.includes('BROUGHT FORWARD')
  };
}

function patchTrace(variant) {
  const file = path.join(root, 'renders', variant, 'patch-trace.json');
  if (!fs.existsSync(file)) return null;
  return readJson(file);
}

export async function runVerification() {
  fs.mkdirSync(aotRoot, { recursive: true });
  fs.mkdirSync(apiRoot, { recursive: true });

  const runtime = loadCompiled(bundleFile, {
    useExactMap: true,
    cacheResults: true,
    testcaseMode: 'isolated',
    compliance: { required: 'none' }
  });
  const workerRuntime = loadCompiledBytes(fs.readFileSync(bundleFile));
  const parity = sourceParity();

  const exact = [];
  for (const variant of VARIANTS) {
    const payload = variantPayload(variant);
    const sourceDir = finalAttempt(variant);
    const sourcePdf = fs.readFileSync(path.join(sourceDir, 'document.pdf'));
    const sourcePb = fs.readFileSync(path.join(sourceDir, 'data.pb'));
    fs.copyFileSync(path.join(sourceDir, 'document.pdf'), path.join(apiRoot, `atelier-${variant}.pdf`));
    fs.copyFileSync(path.join(sourceDir, 'data.pb'), path.join(apiRoot, `atelier-${variant}.pb`));

    const started = performance.now();
    const result = await runtime.generate(payload);
    const durationMs = performance.now() - started;
    const pdfEqual = result.ok && sha256(result.pdf) === sha256(sourcePdf);
    const pbEqual = result.ok && sha256(result.pb) === sha256(sourcePb);
    if (result.ok) {
      fs.writeFileSync(path.join(aotRoot, `exact-${variant}.pdf`), result.pdf);
      fs.writeFileSync(path.join(aotRoot, `exact-${variant}.pb`), result.pb);
    }
    const evidence = result.ok ? await inspectPb(result.pb, payload) : null;
    exact.push({
      variant,
      ok: result.ok,
      code: result.code || null,
      exactSource: result.exactSource ?? null,
      sourceRender: result.plan?.sourceRender || null,
      pdfSha256: result.pdf ? sha256(result.pdf) : null,
      sourcePdfSha256: sha256(sourcePdf),
      pbSha256: result.pb ? sha256(result.pb) : null,
      sourcePbSha256: sha256(sourcePb),
      pdfEqual,
      pbEqual,
      qrSrcMatches: evidence?.qrSrcMatches ?? false,
      durationMs: Number(durationMs.toFixed(2))
    });
  }

  const structuralPayloadData = structuralPayload();
  const structuralStarted = performance.now();
  const structural = await runtime.generate(structuralPayloadData);
  const structuralMs = performance.now() - structuralStarted;
  let structuralPb = null;
  if (structural.ok) {
    fs.writeFileSync(path.join(aotRoot, 'structural-stress.pdf'), structural.pdf);
    fs.writeFileSync(path.join(aotRoot, 'structural-stress.pb'), structural.pb);
    structuralPb = await inspectPb(structural.pb, structuralPayloadData);
  }

  const oversized = await runtime.generate(oversizedPayload());
  fs.writeFileSync(
    path.join(aotRoot, 'fail-closed.json'),
    `${JSON.stringify(oversized, null, 2)}\n`
  );

  const workerResult = await workerRuntime.generate(variantPayload('balanced'));
  const workerSourcePdf = fs.readFileSync(path.join(finalAttempt('balanced'), 'document.pdf'));
  const workerSourcePb = fs.readFileSync(path.join(finalAttempt('balanced'), 'data.pb'));
  const workerEqual = workerResult.ok
    && sha256(workerResult.pdf) === sha256(workerSourcePdf)
    && sha256(workerResult.pb) === sha256(workerSourcePb);

  const complianceRuntime = loadCompiled(bundleFile, {
    compliance: { required: 'preserve' }
  });
  const complianceStructural = await complianceRuntime.generate(structuralPayloadData);

  const trace = patchTrace('stress');
  const finalStressTest = readJson(path.join(root, 'renders', 'stress', 'attempt-2', 'test-results.json'));

  const checks = {
    sourceParity: parity.ok,
    exactAll: exact.every((entry) => entry.ok && entry.pdfEqual && entry.pbEqual),
    structural: structural.ok === true
      && structural.exactSource === false
      && structural.testResults?.success === true
      && structural.testResults?.carriedRows >= 1
      && structural.testResults?.broughtRows >= 1,
    dynamicPagePlan: structural.testResults?.pageSizes?.join(',') === '7,7'
      && structural.testResults?.totalPages === 2,
    carryForward: structuralPb?.carriedRows >= 1
      && structuralPb?.broughtRows >= 1
      && structuralPb?.hasCarriedText === true
      && structuralPb?.hasBroughtText === true,
    qr: structuralPb?.qrSrcMatches === true,
    failClosed: oversized.ok === false && oversized.code === 'E_MISSING_PLAN',
    worker: workerEqual,
    compliance: complianceStructural.ok === false
      && complianceStructural.code === 'E_COMPLIANCE_REQUIRED'
  };

  const verification = {
    ok: Object.values(checks).every(Boolean),
    bundle: {
      file: 'template.fpaot',
      bytes: fs.statSync(bundleFile).size,
      sha256: sha256(fs.readFileSync(bundleFile))
    },
    sourceParity: parity,
    exact,
    structural: {
      ok: structural.ok === true,
      code: structural.code || null,
      exactSource: structural.exactSource ?? null,
      sourceRender: structural.plan?.sourceRender || null,
      attempts: structural.attempts ?? null,
      patchCount: structural.patchCount ?? 0,
      testResults: structural.testResults,
      pageSizes: structural.testResults?.pageSizes || null,
      carriedRows: structural.testResults?.carriedRows ?? null,
      broughtRows: structural.testResults?.broughtRows ?? null,
      pb: structuralPb,
      durationMs: Number(structuralMs.toFixed(2))
    },
    trainingPatchTrace: trace,
    trainingFinalTest: finalStressTest,
    failClosed: {
      code: oversized.code || null,
      message: oversized.message || null,
      required: oversized.required || null
    },
    worker: {
      exactEqual: workerEqual,
      exactSource: workerResult.exactSource ?? null
    },
    compliance: {
      structuralCode: complianceStructural.code || null
    },
    checks,
    provenance: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      runtimeVersion: readJson(path.join(root, 'node_modules', 'forkpdf-aot', 'package.json')).version,
      compilerVersion: readJson(path.join(root, 'node_modules', 'forkpdf-aot-compiler', 'package.json')).version,
      commands: {
        render: 'npm run render:corpus',
        compile: 'npm run compile',
        verify: 'npm run verify'
      }
    }
  };

  fs.writeFileSync(
    path.join(root, 'verification.json'),
    `${JSON.stringify(verification, null, 2)}\n`
  );

  const artifactFiles = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else artifactFiles.push(file);
    }
  };
  walk(aotRoot);
  walk(apiRoot);
  artifactFiles.push(bundleFile);
  for (const file of ['invoice.njk', 'styles.css', 'testcase.js', 'source-parity.json']) {
    artifactFiles.push(path.join(root, file));
  }
  artifactFiles.sort();
  fs.writeFileSync(
    path.join(root, 'artifacts.sha256'),
    `${artifactFiles.map((file) => `${sha256(fs.readFileSync(file))}  ${path.relative(root, file)}`).join('\n')}\n`
  );

  return verification;
}

export { bundleFile, aotRoot, apiRoot, sha256 };
