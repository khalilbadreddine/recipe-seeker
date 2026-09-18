/**
 * runlog.mjs — best-effort run/event logging for the pipeline scripts.
 *
 * Every script opens a row in `pipeline_runs`, appends human-readable lines
 * to `pipeline_events`, and closes the run with ok/failed + a summary.
 * The dashboard's Activity tab reads these two tables — this is the
 * "behind it, see what it's doing" feed.
 *
 * BEST-EFFORT BY DESIGN: in DRY_RUN, when env is missing, or when the
 * tables don't exist yet (schema not applied), logging disables itself
 * silently and the script keeps working. Logging must never break a
 * pipeline run.
 */
import { createDb } from './db.mjs';

let client = null;
let runId = null;
let scriptName = '';
let disabled = false;

function getDb() {
  if (!client) client = createDb(); // throws when env missing — caught below
  return client;
}

/** Open a run row. Returns the run id (or null when logging is unavailable). */
export async function startRun(script) {
  scriptName = script;
  if (disabled || process.env.DRY_RUN === '1') {
    disabled = true;
    return null;
  }
  try {
    const rows = await getDb().insert('pipeline_runs', [{ script, status: 'running' }]);
    runId = rows?.[0]?.id || null;
  } catch {
    disabled = true; // tables missing / no permission — stay quiet, keep working
    runId = null;
  }
  return runId;
}

/** Append one line to the activity feed. Never throws. */
export async function logEvent(message, level = 'info') {
  if (disabled) return;
  try {
    await getDb().insert('pipeline_events', [
      { run_id: runId, script: scriptName, level, message },
    ]);
  } catch {
    disabled = true;
  }
}

/** Close the run. Never throws. */
export async function finishRun(status = 'ok', summary = {}) {
  if (disabled || !runId) return;
  try {
    await getDb().update('pipeline_runs', `id=eq.${runId}`, {
      status,
      finished_at: new Date().toISOString(),
      summary,
    });
  } catch {
    /* best effort */
  }
}
