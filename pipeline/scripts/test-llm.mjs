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

import './lib/env.mjs';

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
