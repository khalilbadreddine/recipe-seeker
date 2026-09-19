/**
 * env.mjs — load repo-root .env (fallback: pipeline/.env) into process.env.
 * No dependencies. Only sets vars that aren't already set; ignores
 * placeholder values like <paste-here>. Import FIRST in pipeline scripts.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const candidates = [
  join(HERE, '..', '..', '..', '.env'), // repo root (README convention)
  join(HERE, '..', '..', '.env'), // pipeline/.env fallback
];

for (const p of candidates) {
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    if (/^\s*#/.test(line) || !line.includes('=')) continue;
    const i = line.indexOf('=');
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    if (!k || v.startsWith('<') || process.env[k] !== undefined) continue;
    process.env[k] = v;
  }
}
