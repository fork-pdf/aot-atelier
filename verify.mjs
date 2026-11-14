#!/usr/bin/env node
import { runVerification } from './lib/verification.mjs';

try {
  const verification = await runVerification();
  console.log(JSON.stringify({
    ok: verification.ok,
    checks: verification.checks,
    exact: verification.exact.map((entry) => ({
      variant: entry.variant,
      pdfEqual: entry.pdfEqual,
      pbEqual: entry.pbEqual,
      durationMs: entry.durationMs
    })),
    structural: {
      ok: verification.structural.ok,
      patchCount: verification.structural.patchCount,
      pageSizes: verification.structural.pageSizes,
      carriedRows: verification.structural.carriedRows,
      broughtRows: verification.structural.broughtRows
    },
    failClosed: verification.failClosed.code,
    worker: verification.worker,
    compliance: verification.compliance
  }, null, 2));
  if (!verification.ok) process.exitCode = 1;
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
