/**
 * image-gen tests — retry + fallback logic with a MOCKED fetch.
 * No network, no keys, no waiting: baseDelayMs=1 and skipRateLimit.
 *
 * Run: node --test pipeline/tests/image-gen.test.mjs
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildHeroPrompt,
  generateHeroImage,
  _resetImageGenState,
} from '../scripts/lib/image-gen.mjs';

const imgBuf = (size = 20000) => Buffer.alloc(size, 7);

function imgRes(buf = imgBuf(), ct = 'image/jpeg') {
  return {
    ok: true,
    status: 200,
    headers: { get: (k) => (String(k).toLowerCase() === 'content-type' ? ct : null) },
    arrayBuffer: async () => buf,
  };
}

function errRes(status = 500) {
  return {
    ok: false,
    status,
    headers: { get: () => null },
    text: async () => 'boom',
  };
}

const FAST = { baseDelayMs: 1, skipRateLimit: true, log: () => {} };

describe('buildHeroPrompt', () => {
  it('includes the dish and the no-text brand suffix', () => {
    const p = buildHeroPrompt('High Iron Vegetarian Dinners', 'Iron');
    assert.match(p, /High Iron Vegetarian Dinners/);
    assert.match(p, /no text/);
    assert.match(p, /warm cream and deep forest green/);
  });
});

describe('generateHeroImage (mocked fetch)', () => {
  beforeEach(() => {
    _resetImageGenState();
    delete process.env.HF_TOKEN;
    process.env.POLLINATIONS_API_KEY = 'test-pollen-key';
  });

  it('returns the pollinations image on first try (bearer key sent)', async () => {
    let calls = 0;
    let authed = false;
    const fetchFn = async (url, opts) => {
      calls++;
      authed = opts.headers.Authorization === 'Bearer test-pollen-key';
      assert.match(String(url), /model=sana/);
      return imgRes();
    };
    const out = await generateHeroImage('test dish', { ...FAST, fetchFn });
    assert.equal(out.provider, 'pollinations');
    assert.equal(out.contentType, 'image/jpeg');
    assert.ok(out.buffer.length >= 10000);
    assert.equal(calls, 1);
    assert.ok(authed);
  });

  it('skips pollinations when POLLINATIONS_API_KEY is unset', async () => {
    delete process.env.POLLINATIONS_API_KEY;
    let calls = 0;
    const fetchFn = async () => {
      calls++;
      return imgRes();
    };
    const out = await generateHeroImage('test dish', { ...FAST, fetchFn });
    assert.equal(out, null); // no HF token either
    assert.equal(calls, 0); // pollinations never called
  });

  it('retries pollinations (3x) then succeeds', async () => {
    let calls = 0;
    const fetchFn = async () => (++calls < 3 ? errRes() : imgRes());
    const out = await generateHeroImage('test dish', { ...FAST, fetchFn });
    assert.equal(out.provider, 'pollinations');
    assert.equal(calls, 3);
  });

  it('falls back to huggingface after pollinations is exhausted', async () => {
    process.env.HF_TOKEN = 'test-token';
    const seen = [];
    const fetchFn = async (url, opts) => {
      seen.push(String(url));
      if (String(url).includes('pollinations')) return errRes();
      // huggingface must get the bearer token
      assert.match(opts.headers.Authorization, /^Bearer test-token$/);
      return imgRes(imgBuf(), 'image/png');
    };
    const out = await generateHeroImage('test dish', { ...FAST, fetchFn });
    assert.equal(out.provider, 'huggingface');
    assert.equal(out.contentType, 'image/png');
    assert.ok(seen.some((u) => u.includes('api-inference.huggingface.co')));
  });

  it('returns null when pollinations fails and HF_TOKEN is unset', async () => {
    let calls = 0;
    const fetchFn = async () => {
      calls++;
      return errRes();
    };
    const out = await generateHeroImage('test dish', { ...FAST, fetchFn });
    assert.equal(out, null);
    assert.equal(calls, 3); // 3 pollinations tries, no HF attempt
  });

  it('returns null when every provider fails', async () => {
    process.env.HF_TOKEN = 'test-token';
    const fetchFn = async () => errRes(503);
    const out = await generateHeroImage('test dish', { ...FAST, fetchFn });
    assert.equal(out, null);
  });

  it('rejects non-image content types and tiny bodies', async () => {
    const fetchFn = async (url) =>
      String(url).includes('pollinations')
        ? { ok: true, status: 200, headers: { get: () => 'text/html' }, arrayBuffer: async () => imgBuf() }
        : imgRes(imgBuf(100)); // too small
    process.env.HF_TOKEN = 'test-token';
    const out = await generateHeroImage('test dish', { ...FAST, fetchFn });
    assert.equal(out, null);
  });

  it('never throws — even a throwing fetch resolves to null', async () => {
    const fetchFn = async () => {
      throw new Error('network down');
    };
    const out = await generateHeroImage('test dish', { ...FAST, fetchFn });
    assert.equal(out, null);
  });
});
