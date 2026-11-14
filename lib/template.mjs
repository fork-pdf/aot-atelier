import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nunjucks from 'nunjucks';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const environment = new nunjucks.Environment(null, { autoescape: true });

export const VARIANTS = ['short', 'balanced', 'long', 'stress'];

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function qrDataUri() {
  const bytes = fs.readFileSync(path.join(root, 'assets', 'pay-qr.png'));
  return `data:image/png;base64,${bytes.toString('base64')}`;
}

export function fontFaces() {
  const encode = (file) => (
    fs.readFileSync(path.join(root, 'fonts', file)).toString('base64')
  );
  return `
@font-face {
  font-family: 'Fraunces';
  src: url(data:font/woff2;base64,${encode('Fraunces-latin.woff2')}) format('woff2');
  font-weight: 500 600;
  font-style: normal;
  font-display: block;
}
@font-face {
  font-family: 'Inter';
  src: url(data:font/woff2;base64,${encode('Inter-latin.woff2')}) format('woff2');
  font-weight: 400 600;
  font-style: normal;
  font-display: block;
}
`;
}

export function loadTemplate() {
  return fs.readFileSync(path.join(root, 'invoice.njk'), 'utf8');
}

export function loadCss() {
  return fontFaces() + fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
}

export function loadTestcase() {
  return fs.readFileSync(path.join(root, 'testcase.js'), 'utf8');
}

export function variantPayload(variant) {
  if (!VARIANTS.includes(variant)) {
    throw new Error(`Unknown variant: ${variant}`);
  }
  const data = readJson(path.join(root, `data.${variant}.json`));
  return { ...data, qrDataUri: qrDataUri() };
}

export function payloadFromFile(file) {
  const data = readJson(file);
  return data.qrDataUri ? data : { ...data, qrDataUri: qrDataUri() };
}

export function renderHtml(payload) {
  return environment.renderString(loadTemplate(), payload);
}

export function structuralPayload() {
  const payload = variantPayload('stress');
  return {
    ...payload,
    client: {
      ...payload.client,
      name: 'Marlow & Partners'
    },
    project: {
      ...payload.project,
      title: 'Spring campaign — phase two'
    },
    items: payload.items.map((item, index) => (
      index === 2
        ? {
            ...item,
            detail: 'Extended visual system and production-ready component library for launch.'
          }
        : item
    ))
  };
}

export function oversizedPayload() {
  const payload = variantPayload('balanced');
  const items = [];
  for (let index = 0; index < 51; index += 1) {
    const item = payload.items[index % payload.items.length];
    items.push({
      ...item,
      description: `${item.description} ${index + 1}`
    });
  }
  return { ...payload, items };
}

export { root };
