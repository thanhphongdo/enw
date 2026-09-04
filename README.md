# English Writing Practice

Vietnamese → English translation drills: 5,000 sentences from A2 to B2, scored out of 100, with per-phrase hints on hover.

## Running locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

No build step. Login and cross-device sync only work once deployed to Vercel, since they need the API routes.

## Layout

| Path | Purpose |
|---|---|
| `index.html` | Entire UI plus the scoring engine — no external libraries |
| `data/sentences.js` | All 5,000 sentences, assigned to `window.SENTENCES_DATA` |
| `data/raw-<topic>.json` | Per-topic source data, used to rebuild the bundle |
| `data/build.js` | Merges the raw files into `sentences.js` |
| `data/SPEC.md` | Spec for generating more sentences |
| `api/auth.js` | Login, returns a signed token |
| `api/progress.js` | Reads and writes per-user progress |
| `tools/adduser.mjs` | Generates a user entry for the environment variable |

Rebuild `sentences.js` after editing any source file:

```bash
npm run build:data
```

## Deploying to Vercel

### 1. Push the code

```bash
git push -u origin main
```

Then import the repository at vercel.com, or deploy straight from the CLI with `vercel --prod`. The free **Hobby** plan is enough — note it is limited to non-commercial use.

### 2. Attach Upstash Redis

In the Vercel project: **Storage → Create Database → Upstash Redis**. Pick the free tier (500K commands/month, 256 MB). Vercel injects `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for you.

Progress for all 5,000 sentences takes roughly 500 KB, about 0.2% of the quota.

### 3. Set two environment variables

Under **Settings → Environment Variables**:

**`AUTH_SECRET`** — a random string used to sign tokens:

```bash
node -e 'console.log(crypto.randomUUID()+crypto.randomUUID())'
```

**`USERS`** — the account list. Generate one line per person:

```bash
node tools/adduser.mjs alice "alice-password"
node tools/adduser.mjs bob "bob-password"
```

Join the lines with semicolons:

```
alice:c2FsdA:aGFzaA;bob:c2FsdDI:aGFzaDI
```

Passwords are never stored anywhere — only a random salt and a PBKDF2-HMAC-SHA256 digest at 210,000 iterations. Adding or changing a user means editing this variable and redeploying.

### 4. Redeploy

Environment variables added after the first deploy take effect only on the next one. Skip this and the login button reports *"AUTH_SECRET is not set on the server"*.

## How syncing works

- **Signed out** — the app is fully usable and progress lives in `localStorage` on that device.
- **Signed in** — each user gets their own Redis key, `vlv:progress:<name>`.
- **Merged per sentence** — every sentence carries its own timestamp and the newer side wins. Do sentences 1–50 on your phone and 51–100 on a laptop and you end up with both, rather than one device clobbering the other.
- **Works offline** — `localStorage` stays the source of truth; changes are pushed once the network is back.
- Progress uploads 2.5 seconds after the last grade (debounced) and again when the tab is hidden.

## Security

- Passwords hashed with PBKDF2-HMAC-SHA256, 210,000 iterations, unique salt per user.
- Password comparison is constant-time, and an unknown username still runs the full hash so response timing does not reveal which accounts exist.
- Tokens are signed with HMAC-SHA256 and expire after 60 days; changing a single character breaks the signature.
- Brute-force protection: 10 failed attempts per username per 15 minutes.
- Uploaded payloads are validated and size-capped before they reach Redis.

Note that `data/sentences.js` is a static file, so anyone with the URL can fetch it. That is deliberate — 5,000 translation drills are not sensitive; only each person's progress needs protecting.

## AI grading

If the browser exposes Built-in AI (Chrome's Prompt API), the **Chấm bằng AI** toggle in the toolbar lights up. The model runs locally, so nothing you write leaves the machine. Without it the built-in scorer handles everything.

That scorer aligns your answer against the reference word by word: inflection slips such as `s/es` cost a few points, wrong meaning costs many, and British spellings (`neighbourhood`, `realise`) are treated as correct rather than as errors. Its weak spot is a valid phrasing that differs from the reference answers, which still gets marked down — exactly the gap the AI pass closes.
