# Pin Scheduler — your part (do it yourself, step by step)

This is the one pipeline piece you wanted to run yourself. Everything is
already coded (`pipeline/scripts/pin-scheduler.mjs`) — you just need to
connect your Pinterest account and press go. 15 minutes, one time.

## What the script does (so it's not a black box)

1. Reads your Supabase `drafts` for posts with `status = 'published'`
   that don't have a pin yet. Anything not published is invisible to it —
   that's the P2 guardrail, enforced again by the database trigger.
2. For each one it builds a pin: title + description (uses pin variant #1
   of the 3 the draft generator wrote), `link` = the live blog post URL,
   and the hero image from your site (Pinterest downloads it from your
   public URL, e.g. `https://recipe-seeker-client.vercel.app/images/….webp`).
3. It schedules them `PIN_SPACING_HOURS` apart (default 6h) with the
   `publish_at` field, so pins go out steadily instead of in one burst.
4. It saves the Pinterest pin id back to the `pins` table.

## Step 1 — Create the Pinterest token (5 min)

1. Go to [developers.pinterest.com](https://developers.pinterest.com) and
   open **your app** (the one approved for the Developer Program).
2. Find **Token generation** (or "Generate token").
3. Select these scopes and generate:
   - `boards:read` (to list your boards)
   - `pins:read`
   - `pins:write` (to create pins)
4. Copy the token. It looks like `pina_...`. **Keep it secret** — it goes
   in your local `.env` only, never in git, never in chat.

## Step 2 — Find your board id (2 min)

```bash
cd ~/workspace/recipe-site   # or wherever you keep the repo
PINTEREST_ACCESS_TOKEN=pina_YOUR_TOKEN node pipeline/scripts/pin-scheduler.mjs --boards
```

You'll see your boards with their ids. Pick the food/nutrition board the
pins should go to and copy its id (a string of digits).

## Step 3 — Set your env vars (2 min)

```bash
cp pipeline/.env.example .env   # if you don't have one yet
```

Fill in (the Supabase values are the same ones the site already uses):

```
PINTEREST_ACCESS_TOKEN=pina_YOUR_TOKEN
PINTEREST_BOARD_ID=123456789012345
SUPABASE_URL=https://xyz.supabase.co
SUPABASE_SERVICE_KEY=eyJ...        # the SECRET service_role key, not the publishable one
SITE_URL=https://recipe-seeker-client.vercel.app
PIN_SPACING_HOURS=6
```

`.env` is gitignored — verify with `git check-ignore .env` (it must print `.env`).

## Step 4 — Teach-mode dry run (3 min)

```bash
DRY_RUN=1 node pipeline/scripts/pin-scheduler.mjs --explain
```

`--explain` narrates every step in plain language and shows the exact JSON
it *would* send to Pinterest. `DRY_RUN=1` means nothing is created anywhere.
Read it once — that's the whole "how it works".

## Step 5 — Real run (1 min)

```bash
node pipeline/scripts/pin-scheduler.mjs
```

Then check Pinterest → your profile → the board: the pins appear there
(scheduled ones show a clock badge until their `publish_at` time).

## If something fails

| Error | Meaning | Fix |
|---|---|---|
| `401` | Bad/expired token | Regenerate the token (Step 1) |
| `403` on `/pins` | Missing `pins:write` scope | Regenerate with the scope |
| `400` about `image_url` | Pinterest can't fetch the image | Open the image URL in your browser — it must load publicly (post must be deployed first) |
| `publish_at` rejected | Time in the past / too far out | The script already retries as an immediate pin automatically |
| `PIPELINE GUARDRAIL` | Draft isn't `published` | That's the guardrail doing its job — approve + publish the draft first |

## The rhythm

Run the scheduler whenever the publisher has shipped new posts (or add it
to the same weekly routine). One pin per post, spaced 6h apart, is plenty —
Pinterest rewards steadiness, not bursts.
