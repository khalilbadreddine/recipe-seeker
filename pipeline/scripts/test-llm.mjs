#!/usr/bin/env node
/**
 * test-llm.mjs — smoke-test the free-LLM fallback chain.
 *
 * Sends one tiny prompt through pipeline/scripts/lib/llm.mjs and reports
 * which provider+model answered (or why each failed — no secrets printed).
 *
 * Run:  node pipeline/scripts/test-llm.mjs
 * Needs: at least one of XAI_API_KEY, OPENROUTER_API_KEY, NVIDIA_API_KEY,
 *        GEMINI_API_KEY in .env (repo root).
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// minimal .env loader (repo root), no dependencies
const HERE = dirname(fileURLToPath(import.meta.url));
for (const p of [join(HERE, '..', '..', '.env'), join(HERE, '..', '.env')]) {
  if (existsSync(p)) {
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (m && !m[2].startsWith('<') && process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2];
      }
    }
  }
}

const { chat, configuredProviders } = await import('./lib/llm.mjs');

console.log('Configured providers:', configuredProviders().join(', ') || '(none)');
try {
  const out = await chat(
    'You are a test probe. Reply with exactly: ok',
    'ping',
    { maxTokens: 10, log: (m) => console.log(m) }
  );
  console.log(`\nSUCCESS — answered by ${out.provider}/${out.model}: "${out.text}"`);
} catch (e) {
  console.log('\nFAILED —', e.message);
  process.exit(1);
}
