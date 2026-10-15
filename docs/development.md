# Development and deployment

## Local frontend

Use Node.js 22.12+ or 24 LTS and npm. From a clean checkout:

```bash
npm ci
npm run dev
npm test
npm run build
```

The default local frontend computes results and exports certificates without a database. Collection requests fail harmlessly until a backend is configured. Copy `.env.example` to `.env` only if you want to configure the optional public GeeTest captcha ID.

For isolated browser checks, start `npm run dev -- --mode test --host 127.0.0.1`, then run `npm run test:browser`. Install a Playwright browser with `npx playwright install chromium`, or set `BTI_BROWSER_CHANNEL=msedge` / `chrome` when an appropriate local browser is installed. Tests mock submission on localhost; they refuse remote test URLs and never submit to the production site.

## Backend

The deployed application is **React/Vite + Cloudflare Pages Functions + D1**, not a database-free static site. `/api/submit` validates and stores completed consented responses. `/api/export` is an owner endpoint protected by the `EXPORT_KEY` secret. Keep export URLs and response files private.

Create your own D1 database for a fork and set its ID in `wrangler.toml`. The checked-in binding name is `DB`. A new database uses `schema.sql`; an existing pre-language database uses `migrations/001_locale.sql` once. Do not run both on the same initialized schema.

```bash
# Local, isolated D1 state
npx wrangler d1 execute bti-responses --local --persist-to .wrangler-test --file schema.sql
npm run build
npx wrangler pages dev dist --persist-to .wrangler-test
```

For local owner-export tests put a synthetic `EXPORT_KEY` in ignored `.dev.vars`. Production secrets belong in Cloudflare, not `.env`, Git or a frontend `VITE_` variable. Optional backend settings are `GEETEST_KEY` and `TURNSTILE_ENFORCE`; the latter retains its historical name even though validation now uses GeeTest. CAPTCHA UI languages are zho / eng / jpn. A provider challenge image may retain text from its configured image set, so UI-language support does not establish translated image coverage.

## Production

The existing project is `research-bti`, connected to GitHub branch `main`, build command `npm run build`, output `dist`. Retain its D1 binding and encrypted environment variables. Do not recreate the Pages project or rename the domain for this release. `wrangler.toml` participates in Pages configuration; keep it aligned with the actual binding rather than assuming dashboard settings always override it.

For an existing installation apply the additive language migration first, deploy the compatible API, then deploy the language-enabled frontend. Older clients may omit the two metadata fields; their stored values remain NULL. Frontend rollback remains compatible with the additive schema. Record the previous successful deployment before rollout.

The public application files in `dist/` are only the runtime site. Documentation images, analysis outputs, raw records and local research archives are not copied into the production asset directory.

## Data and translations

`data/questionsv5.json` is the canonical Chinese question source. `data/results.json` and `data/dimensions.json` define the result catalogue and dimensions. `data/locales/` contains presentation-only translations indexed by stable question IDs, option values and type codes. The same scoring engine runs in every language.

Language is stored in the URL, preference and session. Resuming a legacy session uses its original Chinese interface; the database's historical language stays unrecorded. New submissions include `locale` and `translationVersion`; CSV export appends the corresponding columns after the existing fields.

The self-hosted font subsets are committed and normal builds do not fetch fonts. To regenerate Chinese fonts use `npm run fonts`. Japanese regeneration additionally takes `--jp-source /path/to/NotoSansJP-variable.ttf`, sourced from the official [google/fonts repository](https://github.com/google/fonts/tree/main/ofl/notosansjp); see [font notices](third-party-notices.md). Fonts are never loaded from a CDN at runtime.

## Pilot analysis

Install `scripts/requirements-analysis.txt` into a separate Python environment. `scripts/analyze_responses.py --help` describes the private snapshot, hash manifest and private audit directory inputs. It writes only aggregate public findings. Then run `python scripts/render_analysis.py` to render the report and figure. Raw responses and individual exclusion logs must remain outside this repository.

Use `npm run docs:assets` against a local Vite server and `npm run docs:readmes` to rebuild documentation assets and multilingual summaries. Certificate examples are captured from isolated demo answers, not participant records.

## Dependency audit at this release

The 2026-10-15 audit reports zero production-dependency vulnerabilities and zero critical findings. Seven remaining findings (five high, two moderate) are confined to the Tailwind 3 build dependency tree. Vite and Vitest were upgraded and rechecked; a Tailwind 4 migration is not included in this release. Keep development servers local and review upstream fixes before changing the build stack.
