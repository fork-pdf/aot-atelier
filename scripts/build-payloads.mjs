import fs from 'node:fs';
import path from 'node:path';
import { VARIANTS, variantPayload, root } from '../lib/template.mjs';

const outDir = path.join(root, 'payloads');
fs.mkdirSync(outDir, { recursive: true });
for (const variant of VARIANTS) {
  fs.writeFileSync(
    path.join(outDir, `${variant}.json`),
    `${JSON.stringify(variantPayload(variant), null, 2)}\n`
  );
}
console.log(`wrote ${VARIANTS.length} payloads to payloads/`);
