// Sums every script index.html loads eagerly (entry + modulepreload), gzipped.
// Lazy route chunks are excluded on purpose: they are not on the first screen.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const LIMIT_BYTES = 150 * 1024;
const dist = path.resolve(import.meta.dirname, '../dist');
const html = readFileSync(path.join(dist, 'index.html'), 'utf8');
const files = new Set();

for (const [tag] of html.matchAll(/<script\b[^>]*>/g)) {
  const src = /\bsrc="([^"]+)"/.exec(tag)?.[1];
  if (src && /type="module"/.test(tag)) files.add(src);
}
for (const [tag] of html.matchAll(/<link\b[^>]*>/g)) {
  const href = /\bhref="([^"]+)"/.exec(tag)?.[1];
  if (href && /rel="modulepreload"/.test(tag)) files.add(href);
}

if (files.size === 0) {
  console.error('No entry scripts found in dist/index.html. Run the build first.');
  process.exit(1);
}

let total = 0;
for (const file of files) {
  const size = gzipSync(readFileSync(path.join(dist, file.replace(/^\//, '')))).length;
  total += size;
  console.log(`${(size / 1024).toFixed(1).padStart(8)} KB  ${file}`);
}
console.log(`${(total / 1024).toFixed(1).padStart(8)} KB  total (limit ${LIMIT_BYTES / 1024} KB)`);

if (total > LIMIT_BYTES) {
  console.error('Initial JavaScript is over budget.');
  process.exit(1);
}
