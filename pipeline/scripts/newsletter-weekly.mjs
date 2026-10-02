#!/usr/bin/env node
/**
 * WEEKLY NEWSLETTER — builds and sends one email per ISO week.
 *
 * Content (all from client/src/data/recipes.json, so numbers match the site):
 *   - "New this week": recipes published in the last 7 days (up to 3)
 *   - "This week's focus": one nutrient per week (rotates through all hubs),
 *     with 4 recipes rich in it and a link to its hub page
 *
 * Sending: Brevo transactional API (free tier: 300 emails/day, no own domain
 * needed; verify the sender address in Brevo first). Every email carries a
 * signed one-click unsubscribe link and List-Unsubscribe headers. A row in
 * `newsletter_issues` per week means a re-run never double-sends.
 *
 * Run:
 *   DRY_RUN=1 node pipeline/scripts/newsletter-weekly.mjs   # writes a preview HTML, sends nothing
 *   node pipeline/scripts/newsletter-weekly.mjs
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_KEY, BREVO_API_KEY, NEWSLETTER_FROM_EMAIL,
 *      NEWSLETTER_SECRET (same as Vercel), NEWSLETTER_POSTAL_ADDRESS (required by
 *      CAN-SPAM), optional NEWSLETTER_FROM_NAME, SITE_URL, MAX_SENDS (default 280).
 */

import './lib/env.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createDb } from './lib/db.mjs';
import { startRun, logEvent, finishRun } from './lib/runlog.mjs';
import { unsubscribeUrl } from '../../api/_lib/unsubscribeToken.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DRY_RUN = process.env.DRY_RUN === '1';
const MAX_SENDS = Number(process.env.MAX_SENDS || 280);
const data = JSON.parse(readFileSync(join(ROOT, 'client', 'src', 'data', 'recipes.json'), 'utf8'));
const SITE_URL = (process.env.SITE_URL || data.site.canonicalBase || 'https://recipe-seeker-client.vercel.app').replace(/\/$/, '');

/** ISO week key like "2026-W40" plus the week number. */
export function isoWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86_400_000 + 1) / 7);
  return { key: `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`, week };
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));
const utm = (path) => `${SITE_URL}${path}?utm_source=newsletter&utm_medium=email&utm_campaign=weekly`;

/** Pick this week's content. Pure, so it can be tested. */
export function buildIssue(now = new Date()) {
  const { key, week } = isoWeek(now);
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString().slice(0, 10);
  const fresh = data.recipes
    .filter((r) => (r.datePublished || '') >= weekAgo)
    .sort((a, b) => (b.datePublished || '').localeCompare(a.datePublished || ''))
    .slice(0, 3);
  const focus = data.nutrients[week % data.nutrients.length];
  const pool = data.recipes
    .filter((r) => r.nutrition[focus.key] && !fresh.includes(r))
    .sort((a, b) => (b.nutrition[focus.key].dv || 0) - (a.nutrition[focus.key].dv || 0))
    .slice(0, 12);
  const offset = Math.floor(week / data.nutrients.length) % Math.max(1, pool.length - 3);
  const picks = pool.slice(offset, offset + 4);
  const subject = fresh.length
    ? `New this week: ${fresh[0].title.replace(/\s*\(.*\)$/, '')}${fresh.length > 1 ? ` + ${fresh.length - 1} more` : ''}`
    : `This week: ${picks.length} ${focus.name.toLowerCase()}-rich recipes worth cooking`;
  return { key, focus, fresh, picks, subject };
}

function recipeCard(r, focusKey) {
  const n = r.nutrition[focusKey];
  const badge = n ? `${fmt(n.amount)}${n.unit} ${focusKey === 'omega3' ? 'omega-3' : ''}`.trim() : r.keyNutrients[0]?.label || '';
  const label = n ? `${badge}${focusKey === 'omega3' ? '' : ' ' + (data.nutrients.find((x) => x.key === focusKey)?.name.toLowerCase() || '')} · ${Math.round(n.dv)}% DV` : badge;
  return `<tr><td style="padding:0 0 20px">
<a href="${utm(`/recipes/${r.slug}`)}" style="text-decoration:none;color:#16201B">
<img src="${SITE_URL}/email/${r.slug}.jpg" width="536" alt="${esc(r.imageAlt || r.title)}" style="display:block;width:100%;max-width:536px;height:auto;border-radius:16px;border:0">
<p style="margin:12px 0 4px;font:700 20px/1.25 Arial,sans-serif">${esc(r.title)}</p>
<p style="margin:0;font:14px/1.5 Arial,sans-serif;color:#55605A">${r.totalMinutes} min · ${esc(label)} · ${r.calories} kcal per serving</p>
</a></td></tr>`;
}

export function renderEmail(issue, unsubUrl, postalAddress) {
  const { focus, fresh, picks } = issue;
  const freshHtml = fresh.length
    ? `<tr><td style="padding:8px 0 12px;font:800 13px/1 Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#155C37">New this week</td></tr>${fresh.map((r) => recipeCard(r, r.keyNutrients[0]?.key || 'protein')).join('')}`
    : '';
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(issue.subject)}</title></head>
<body style="margin:0;padding:0;background:#F6F4EE">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F4EE"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border-radius:24px">
<tr><td style="padding:28px 32px 8px;font:800 22px/1 Arial,sans-serif;color:#16201B">Recipe<span style="color:#1F7A4A">Seeker</span></td></tr>
<tr><td style="padding:0 32px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${freshHtml}
<tr><td style="padding:16px 0 4px;font:800 13px/1 Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#155C37">This week's focus</td></tr>
<tr><td style="padding:0 0 6px;font:800 30px/1.1 Arial,sans-serif;color:#16201B">${esc(focus.name)}</td></tr>
<tr><td style="padding:0 0 20px;font:16px/1.6 Arial,sans-serif;color:#3D4A42">${esc(String(focus.whatItDoes).split('. ')[0])}. Daily value: ${esc(focus.dailyValue)}.</td></tr>
${picks.map((r) => recipeCard(r, focus.key)).join('')}
<tr><td style="padding:4px 0 28px"><a href="${utm(`/nutrients/${focus.slug || focus.key}`)}" style="display:inline-block;background:#16201B;color:#F6F4EE;text-decoration:none;font:700 15px Arial,sans-serif;padding:14px 22px;border-radius:999px">All ${esc(focus.name.toLowerCase())} recipes →</a></td></tr>
</table></td></tr>
<tr><td style="padding:20px 32px 28px;border-top:1px solid #E2E1D8;font:12px/1.6 Arial,sans-serif;color:#6B746F">
Nutrition is estimated per serving from USDA FoodData Central data. General information only, not medical advice.<br>
You're getting this because you subscribed at The Recipe Seeker. <a href="${unsubUrl}" style="color:#16201B">Unsubscribe</a><br>
${esc(postalAddress)}
</td></tr></table></td></tr></table></body></html>`;
  const text = [
    issue.subject,
    '',
    ...(fresh.length ? ['NEW THIS WEEK', ...fresh.map((r) => `- ${r.title}: ${utm(`/recipes/${r.slug}`)}`), ''] : []),
    `THIS WEEK'S FOCUS: ${focus.name.toUpperCase()} (daily value ${focus.dailyValue})`,
    ...picks.map((r) => `- ${r.title} (${r.totalMinutes} min): ${utm(`/recipes/${r.slug}`)}`),
    '',
    'General information only, not medical advice.',
    `Unsubscribe: ${unsubUrl}`,
    postalAddress,
  ].join('\n');
  return { html, text };
}

async function sendBrevo({ to, subject, html, text, unsubUrl }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { email: process.env.NEWSLETTER_FROM_EMAIL, name: process.env.NEWSLETTER_FROM_NAME || 'The Recipe Seeker' },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
      headers: { 'List-Unsubscribe': `<${unsubUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      tags: ['weekly'],
    }),
  });
  if (!res.ok) throw new Error(`Brevo HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

async function main() {
  const issue = buildIssue();
  const postal = process.env.NEWSLETTER_POSTAL_ADDRESS || '';
  console.log(`[newsletter] ${issue.key}: "${issue.subject}" (${issue.fresh.length} new, ${issue.picks.length} ${issue.focus.name} picks)`);

  if (DRY_RUN) {
    const secret = process.env.NEWSLETTER_SECRET || 'dry-run-secret';
    const { html } = renderEmail(issue, unsubscribeUrl(SITE_URL, 'reader@example.com', secret), postal || '[postal address required: NEWSLETTER_POSTAL_ADDRESS]');
    const out = join(ROOT, 'pipeline', 'out');
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, 'newsletter-preview.html'), html);
    console.log('[newsletter] DRY_RUN: preview written to pipeline/out/newsletter-preview.html, nothing sent');
    return;
  }

  const missing = ['BREVO_API_KEY', 'NEWSLETTER_FROM_EMAIL', 'NEWSLETTER_SECRET', 'NEWSLETTER_POSTAL_ADDRESS'].filter((k) => !process.env[k]);
  if (missing.length) throw new Error(`missing env: ${missing.join(', ')}`);

  await startRun('newsletter-weekly');
  const db = createDb();
  const already = await db.select('newsletter_issues', `select=issue_key&issue_key=eq.${issue.key}`);
  if (already?.length) {
    console.log(`[newsletter] ${issue.key} already sent, nothing to do`);
    await finishRun('ok', { sent: 0, reason: 'already-sent' });
    return;
  }
  const subs = (await db.select('newsletter_subscribers', 'select=email&unsubscribed_at=is.null&order=created_at.asc&limit=10000')) || [];
  if (!subs.length) {
    console.log('[newsletter] no subscribers yet');
    await finishRun('ok', { sent: 0, reason: 'no-subscribers' });
    return;
  }
  // Claim the week first: a crash mid-send must never cause a second full send.
  await db.insert('newsletter_issues', { issue_key: issue.key, subject: issue.subject, sent_count: 0 });

  let sent = 0;
  let failed = 0;
  for (const { email } of subs.slice(0, MAX_SENDS)) {
    const unsubUrl = unsubscribeUrl(SITE_URL, email, process.env.NEWSLETTER_SECRET);
    const { html, text } = renderEmail(issue, unsubUrl, postal);
    try {
      await sendBrevo({ to: email, subject: issue.subject, html, text, unsubUrl });
      sent++;
    } catch (e) {
      failed++;
      console.error(`[newsletter] send failed: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  await db.update('newsletter_issues', `issue_key=eq.${issue.key}`, { sent_count: sent });
  if (subs.length > MAX_SENDS) console.log(`[newsletter] capped at ${MAX_SENDS}; ${subs.length - MAX_SENDS} not sent (raise MAX_SENDS with a bigger plan)`);
  await logEvent(`newsletter ${issue.key}: sent ${sent}, failed ${failed} — "${issue.subject}"`);
  await finishRun(failed > sent ? 'failed' : 'ok', { sent, failed });
  console.log(`[newsletter] sent ${sent}, failed ${failed}`);
  if (failed > sent) process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(async (e) => {
    console.error('[newsletter] FATAL:', e.message);
    try {
      await finishRun('failed', { reason: e.message });
    } catch {}
    process.exit(1);
  });
}
