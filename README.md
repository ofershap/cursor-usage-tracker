<p align="center">
  <img src="public/logo.png" alt="Cursor Usage Tracker - open-source Cursor Enterprise cost monitoring dashboard with anomaly detection and Slack alerts" width="100" height="100" />
</p>

<h1 align="center">Cursor Usage Tracker</h1>

<p align="center">
  Open-source cost monitoring and optimization for Cursor Enterprise teams. Track AI spend per developer, spot unnecessary expensive model usage, detect anomalies automatically, and get Slack alerts before the invoice surprises you. Self-host with Docker or <a href="https://cursor-usage-tracker.sticklight.app">let us run it for you</a>.
</p>

<p align="center">
  <a href="https://cursor-usage-tracker.sticklight.app"><img src="https://img.shields.io/badge/🌐_Website-Hosted_&_Managed-6366f1?style=for-the-badge" alt="Website — Hosted & Managed" /></a>
  &nbsp;
  <a href="#quick-start"><img src="https://img.shields.io/badge/Quick_Start-grey?style=for-the-badge" alt="Quick Start" /></a>
  &nbsp;
  <a href="#features"><img src="https://img.shields.io/badge/Features-grey?style=for-the-badge" alt="Features" /></a>
</p>

<p align="center">
  <a href="https://github.com/ofershap/cursor-usage-tracker/actions/workflows/ci.yml"><img src="https://github.com/ofershap/cursor-usage-tracker/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/ofershap/cursor-usage-tracker/actions/workflows/codeql.yml"><img src="https://github.com/ofershap/cursor-usage-tracker/actions/workflows/codeql.yml/badge.svg" alt="CodeQL" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ofershap/cursor-usage-tracker"><img src="https://api.scorecard.dev/projects/github.com/ofershap/cursor-usage-tracker/badge" alt="OpenSSF Scorecard" /></a>
  <a href="https://www.bestpractices.dev/projects/11968"><img src="https://www.bestpractices.dev/projects/11968/badge" alt="OpenSSF Best Practices" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-strict-blue" alt="TypeScript" /></a>
  <a href="https://www.docker.com/"><img src="https://img.shields.io/badge/Docker-ready-2496ED" alt="Docker" /></a>
</p>

---

## AI Spend Is a Blind Spot

Engineering costs used to be two things: headcount and cloud infrastructure. You had tools for both. Then AI coding assistants showed up, and suddenly there's a third cost center that nobody has good tooling for.

A single developer on Cursor can burn through hundreds of dollars a day just by switching to an expensive model or letting an agent loop run wild. Developers often don't know which models cost more - one of our team members used `opus-max` for weeks thinking it was a cheaper option. Now multiply that confusion by 50, 100, 500 developers. The bill gets big fast, and there's nothing like Datadog or CloudHealth for this category yet.

Cursor's admin dashboard shows you the raw numbers, but it won't tell you when something is off. No anomaly detection. No alerts. No incident tracking. You find out about cost spikes when the invoice lands, weeks after the damage is done.

I built cursor-usage-tracker to fix that. It sits on top of Cursor's Enterprise APIs and gives engineering managers, finance, and platform teams actual visibility into AI spend before it becomes a surprise.

## What This Dashboard Answers

1. **Cost monitoring** - Are we spending too much? Who's driving it? Why?
2. **Cost optimization** - Who's using expensive models when cheaper ones would do? How much would switching save?
3. **Adoption tracking** - Is everyone using the tool we're paying for?
4. **Usage understanding** - How is each person working with AI?

---

## What It Does

Your company has 50+ developers on Cursor. Do you know who's spending $200/day on Claude Opus while everyone else uses Sonnet?

You're about to find out.

<p align="center">
  <sub>Watch the full demo (90 seconds):</sub>
  <br><br>
  <a href="https://www.youtube.com/watch?v=DqPjFWGI57A">
    <img src="assets/video-preview.gif" alt="Watch the full demo (90 seconds)" width="800">
  </a>
</p>

It connects to Cursor's Enterprise APIs, collects usage data, and automatically detects anomalies across three layers. When something looks off, you get a Slack message or email within the hour, not next month.

```
Developer uses Cursor → API collects data hourly → Engine detects anomaly → You get a Slack alert
```

### How It Works

| What happens                                          | Example                                                                                                  |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| A developer exceeds the spend limit                   | `Bob spent $82 this cycle (limit: $50)` → Slack alert                                                    |
| Someone's daily spend spikes                          | `Alice: daily spend spiked to $214 (4.2x her 7-day avg of $51)` → Slack alert                            |
| A user's cycle spend is far above the team            | `Bob: cycle spend $957 is 5.1x the team median ($188)` → Slack alert                                     |
| A user is statistically far from the team             | `Bob: daily spend $214 is 3.2σ above team mean ($42)` → Slack alert                                      |
| Someone switches to an expensive model                | `Bob: cost/request spiked to $1.45 (4.2x his avg of $0.34), using opus-max` → Slack alert                |
| A developer uses an expensive model when others don't | `Bob averaged $4.20/req on claude-opus-max (team median: $0.52 on sonnet)` → Model cost comparison table |

Every alert includes who, what model, how much, and a link to their dashboard page so you can investigate immediately.

---

<div align="center">
<h3>Quiz Time: Can you guess which Cursor model costs the most? 🤔</h3>
<p>Your developers see this list every day. Can <i>you</i> spot the expensive one?</p>
<table>
<tr><td align="center" height="12"></td></tr>
<tr><td>&emsp; <code>claude-4.6-opus-high</code> &emsp;</td></tr>
<tr><td>&emsp; <code>composer-1.5</code> &emsp;</td></tr>
<tr><td>&emsp; <code>claude-4.6-opus-max-thinking-fast</code> &emsp;</td></tr>
<tr><td>&emsp; <code>claude-4.5-opus-high</code> &emsp;</td></tr>
<tr><td>&emsp; <code>claude-4.6-opus-max</code> &emsp;</td></tr>
<tr><td align="center" height="12"></td></tr>
</table>
<details>
<summary><b>&nbsp;&nbsp;Reveal the answer&nbsp;&nbsp;</b></summary>
<br>
<table>
<tr><th>Model</th><th>Output $/1M tokens</th><th>Relative cost</th></tr>
<tr><td><code>composer-1.5</code></td><td>$17.50</td><td><b>1x</b> (cheapest)</td></tr>
<tr><td><code>claude-4.5-opus-high</code></td><td>$25</td><td>1.4x</td></tr>
<tr><td><code>claude-4.6-opus-high</code></td><td>$25</td><td>1.4x</td></tr>
<tr><td><code>claude-4.6-opus-max</code></td><td>$25 + 20% surcharge</td><td>~1.7x</td></tr>
<tr><td><b><code>claude-4.6-opus-max-thinking-fast</code></b></td><td><b>$150 + 20% surcharge</b></td><td><b>~10x 🔥</b></td></tr>
</table>
<br>
<p><b>"Fast" sounds cheap. It's the most expensive model Cursor offers.</b><br>Now imagine 200 developers picking from this dropdown without knowing.</p>
</details>
</div>

---

## Features

### Three-Layer Anomaly Detection

| Layer               | Method        | What it catches                                                                        |
| ------------------- | ------------- | -------------------------------------------------------------------------------------- |
| **Thresholds**      | Static limits | Optional hard caps on spend, requests, or tokens (disabled by default)                 |
| **Z-Score**         | Statistical   | User daily spend 2.5+ standard deviations above team mean (active users only)          |
| **Trends**          | Spend-based   | Daily spend spikes vs personal average, cycle spend outliers vs team median            |
| **Expensive Model** | Cost/request  | User's $/request jumps vs their own history (catches model switches like max-thinking) |

### Incident Lifecycle (MTTD / MTTI / MTTR)

Every anomaly becomes a tracked incident with full lifecycle metrics:

```
Anomaly Detected ──→ Alert Sent ──→ Acknowledged ──→ Resolved
       │                  │               │              │
       └──── MTTD ────────┘               │              │
                                          └── MTTI ──────┘
       └────────────────── MTTR ─────────────────────────┘
```

- **MTTD** (Mean Time to Detect): how fast the system catches it
- **MTTI** (Mean Time to Identify): how fast a human acknowledges it
- **MTTR** (Mean Time to Resolve): how fast it gets fixed

### Proactive Slack Notifications

You don't need to remember to check the dashboard. The system comes to you.

| Notification        | When it fires                    | What you learn                                                                      |
| ------------------- | -------------------------------- | ----------------------------------------------------------------------------------- |
| **Anomaly alerts**  | Within the hour                  | "Alice's daily spend spiked to $214 (4.2x her 7-day avg)"                           |
| **Plan exhaustion** | Daily, when users exceed plan    | "65/151 active users have exceeded their included plan this cycle"                  |
| **Cycle summary**   | 3 days before billing cycle ends | Total spend, unused seats, top spenders, adoption breakdown, cycle-over-cycle trend |

Anomaly alerts include severity, user, model, value vs threshold, and a direct link to the user's dashboard page. Cycle summaries tell you how many seats are going unused and who's driving cost, so you can act before the invoice lands.

Also supports **email alerts** via [Resend](https://resend.com) (one API key, no SMTP config).

### Web Dashboard

| Page               | What you see                                                                                                                                                                     |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Team Overview**  | Stat cards, spend by user, daily spend trend, spend breakdown, members table with search/sort, **group filter dropdown**, billing cycle progress, time range picker              |
| **Insights**       | DAU chart, model adoption trends, model efficiency rankings (cost/precision), repository code volume (lines, % of total, AI %), MCP tool usage, file extensions, client versions |
| **User Drilldown** | Per-user token timeline, model breakdown, feature usage, repository breakdown, activity profile, anomaly history                                                                 |
| **Anomalies**      | Open incidents, MTTD/MTTI/MTTR metrics, full anomaly timeline                                                                                                                    |
| **Settings**       | Detection thresholds, expensive model alerts, billing group management, HiBob CSV import, group export/import                                                                    |

> For a detailed breakdown of every section, metric, badge, and chart, see [FEATURES.md](docs/FEATURES.md).

---

## Deploy

### One-click deploy

Deploy your own instance in minutes. You'll need a [Cursor Enterprise](https://cursor.com) plan and an Admin API key.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/ofershap/cursor-usage-tracker)

> **Railway and Docker** options below. Want help setting this up for your team? Deployment, threshold tuning, first spend analysis, ongoing support. [Let's talk](https://linkedin.com/in/ofershap).

---

## Quick Start

### Prerequisites

| What                   | Where to get it                                         |
| ---------------------- | ------------------------------------------------------- |
| Cursor Enterprise plan | Required for API access                                 |
| Admin API key          | Cursor dashboard → Settings → Advanced → Admin API Keys |
| Node.js 18+            | [nodejs.org](https://nodejs.org)                        |

### 1. Set up

**Option A: One command**

```bash
npx cursor-usage-tracker my-tracker
cd my-tracker
```

**Option B: Manual clone**

```bash
git clone https://github.com/ofershap/cursor-usage-tracker.git
cd cursor-usage-tracker
npm install
```

### 2. Configure

```bash
cp .env.example .env
```

Edit `.env`:

```bash
# Required
CURSOR_ADMIN_API_KEY=your_admin_api_key

# Alerting — Slack (at least one alerting channel recommended)
SLACK_BOT_TOKEN=xoxb-your-bot-token          # bot token with chat:write scope
SLACK_CHANNEL_ID=C0123456789                  # channel to post alerts to

# Dashboard URL (used in alert links)
DASHBOARD_URL=http://localhost:3000

# Optional
CRON_SECRET=your_secret_here                  # protects the cron endpoint

# Email alerts via Resend (optional)
RESEND_API_KEY=re_xxxxxxxxxxxx
ALERT_EMAIL_TO=team-lead@company.com
```

### 3. Start the dashboard

```bash
npm run dev
# Open http://localhost:3000
```

### 4. Collect your first data

```bash
npm run collect
```

You should see:

```
[collect] Done in 4.2s
  Members: 87
  Daily usage: 30
  Spending: 87
  Usage events: 12,847
```

### 5. Run anomaly detection

After collecting data, run detection separately:

```bash
npm run detect
```

This runs the stored data through all three detection layers and sends alerts for anything it finds.

> `npm run collect` only fetches data. `npm run detect` only runs detection. The cron endpoint (`POST /api/cron`) does both in one call.

### Reset stored data (optional)

To wipe collected data from the local database — for a fresh start or after testing — use the reset CLI. It deletes rows from selected tables (schema is preserved). Works with SQLite (default) and Postgres (`DATABASE_SOURCE=postgres`).

```bash
npm run reset -- --list              # show all resettable tables
npm run reset -- --all               # wipe every table (confirmation prompt)
npm run reset -- usage_events        # wipe one or more tables
npm run reset -- --all --yes         # skip confirmation (scripts/CI)
npm run reset:postgres -- --all      # same, against Postgres
```

Clearing `metadata` or `config` also removes billing-cycle anchors, alert dedup state, and detection thresholds. After a reset, run `npm run collect` to repopulate from the Cursor API.

### Postgres storage (optional)

By default data is stored in a local SQLite file at `data/tracker.db`. For Postgres — with decimal-safe spend columns — set `DATABASE_SOURCE=postgres`.

**Start Postgres in Docker** (no local Postgres install required; uses port **5433** to avoid conflicting with a system Postgres on 5432):

```bash
npm run postgres:up
```

Add to `.env` (copy the Postgres block from `.env.example` and set your password):

```env
DATABASE_SOURCE=postgres
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password
POSTGRES_DB=cursor_tracker
POSTGRES_HOST=localhost
POSTGRES_PORT=5433
```

Docker Compose and npm scripts read these values from `.env`. You can set `POSTGRES_URL` instead if you prefer a single connection string.

Then collect and run the dashboard against Postgres:

```bash
npm run collect:postgres   # or npm run collect after updating .env
npm run dev:postgres       # or npm run dev after updating .env
```

Schema is created automatically on first connect. For a full Docker stack (app + Postgres), use `docker compose -f docker-compose.full.yml up`.

### 6. Set up recurring collection

Trigger the cron endpoint hourly (via crontab, GitHub Actions, or any scheduler):

```bash
curl -X POST http://localhost:3000/api/cron -H "x-cron-secret: YOUR_SECRET"
```

This collects data, runs anomaly detection, and sends alerts in one call.

---

## Production Deployment

### Docker (self-hosted)

```bash
cp .env.example .env   # configure your keys
docker compose up -d
# Dashboard at http://localhost:3000
```

The Docker image uses multi-stage builds for a minimal production image. Data persists in a Docker volume.

<details>
<summary>Docker Compose details</summary>

```yaml
services:
  tracker:
    build: .
    ports:
      - "3000:3000"
    env_file: .env
    volumes:
      - tracker-data:/app/data
volumes:
  tracker-data:
```

</details>

### Fly.io (recommended free option)

```bash
fly launch --copy-config          # creates the app from fly.toml
fly volumes create tracker_data --region ams --size 1
fly secrets set CURSOR_ADMIN_API_KEY=your_key CRON_SECRET=your_secret
fly deploy
# Dashboard at https://your-app.fly.dev
```

Set up hourly collection by adding `DASHBOARD_URL` and `CRON_SECRET` as [GitHub Actions secrets](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions). The included `.github/workflows/cron.yml` workflow triggers `/api/cron` every hour.

### Other cloud platforms

Any platform that supports Docker + persistent volumes works:

- **[Render](https://render.com)** - use the deploy button above, or `render.yaml` in this repo
- **[Railway](https://railway.app)** - create a project from this repo, attach a volume at `/app/data`

> **Serverless platforms** (Vercel, AWS Lambda, etc.) require replacing SQLite with an external database. The data layer is abstracted behind `src/lib/data/`. Swap the implementation to use Postgres, Supabase, PlanetScale, or any other database. See [Architecture](#architecture) for details.

---

## Architecture

```mermaid
flowchart TB
    APIs["Cursor Enterprise APIs\n/teams/members · /teams/spend · /teams/daily-usage-data\n/teams/filtered-usage-events · /teams/groups · /analytics/team/*"]
    C["Collector (hourly)"]
    DB[("Database\n(SQLite default, swappable)")]
    D["Detection Engine, 3 layers"]
    AL["Alerts: Slack / Email"]
    DA["Dashboard: Next.js"]

    APIs --> C --> DB --> D
    DB --> DA
    D --> AL
```

The data layer is abstracted behind `src/lib/data/`. SQLite is the default (zero-config), but you can swap the implementation for Postgres, Supabase, or any database that fits your infrastructure.

---

## Configuration

All detection thresholds are configurable via the Settings page or the API:

| Setting                   | Default | What it does                                                   |
| ------------------------- | ------- | -------------------------------------------------------------- |
| Max spend per cycle       | 0 (off) | Alert when a user exceeds this in a billing cycle              |
| Max requests per day      | 0 (off) | Alert on excessive daily request count                         |
| Max tokens per day        | 0 (off) | Alert on excessive daily token consumption                     |
| Z-score multiplier        | 2.5     | How many standard deviations above mean to flag (spend + reqs) |
| Z-score window            | 7 days  | Historical window for statistical comparison                   |
| Spend spike multiplier    | 5.0x    | Alert when today's spend > N× user's personal daily average    |
| Spend spike lookback      | 7 days  | How many days of history to compare against                    |
| Cycle outlier multiplier  | 10.0x   | Alert when cycle spend > N× team median (active users only)    |
| Cost/req spike multiplier | 3.0x    | Alert when today's $/request > N× user's historical average    |
| Cost/req min daily spend  | $20     | Skip cost/req alerts for users below this daily spend          |

---

## Settings

The Settings page (`/settings`) is where you configure detection behavior and manage your team structure. Everything is persisted locally and takes effect on the next detection run.

### Detection Thresholds

All anomaly detection parameters listed in [Configuration](#configuration) above are editable from the Settings page. Static thresholds, z-score sensitivity, spend spike multipliers, the expensive model detector. Set any value to 0 to disable that check.

### Billing Groups

Billing groups let you organize team members by department, team, or any structure that fits your org. The Team Overview page has a group filter dropdown. Select a group to scope all stats, charts, and the members table to that subset.

From the Settings page you can:

- **View** all groups with member counts and per-group spend
- **Rename** groups to match your org structure (displayed as `Parent > Team`)
- **Reassign** individual members between groups
- **Create** new groups manually
- **Search** across all members to find and reassign anyone
- **Export** your current group mapping as a CSV backup
- **Import** a previously exported CSV to restore or transfer mappings between environments

### HiBob Import

For teams using [HiBob](https://www.hibob.com/) as their HR platform, the Settings page includes a dedicated **Import from HiBob** flow:

1. Export a CSV from HiBob's People Directory (include Email, Department, Group, and Team columns)
2. Upload it to the import modal
3. Review the preview: which members move, which groups get created, who wasn't matched
4. Selectively approve or reject individual changes before applying

The import builds a `Group > Team` hierarchy automatically. Small teams (fewer than 3 members) are merged into their parent group. Members not found in the CSV keep their current assignment.

> The HiBob import updates your local billing groups only. It does not push changes back to HiBob or to Cursor's billing API.

---

## Authentication

Authentication is **fully optional**. When no auth environment variables are set, the dashboard is open (the default behavior). Setting `AUTH_SECRET` enables Google OAuth sign-in.

### Setup

1. Create a [Google OAuth app](https://console.cloud.google.com/apis/credentials) with redirect URI:
   - Local: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-domain.com/api/auth/callback/google`

2. Add to your `.env`:

```bash
AUTH_SECRET=$(openssl rand -base64 32)       # encryption key for sessions
AUTH_GOOGLE_ID=your-client-id.apps.google... # Google OAuth client ID
AUTH_GOOGLE_SECRET=GOCSPX-...               # Google OAuth client secret
AUTH_TRUST_HOST=true                         # required behind a reverse proxy
AUTH_URL=https://your-domain.com             # public URL (auto-detected locally)
```

3. Optionally restrict access by domain or specific emails:

```bash
AUTH_ALLOWED_DOMAIN=yourcompany.com          # only @yourcompany.com emails
AUTH_ALLOWED_EMAILS=admin@example.com,cto@example.com  # or specific emails
```

When both are set, either match grants access. When neither is set, any Google account can sign in.

### How It Works

- Sessions use encrypted JWT cookies, no database tables needed
- The `/api/cron` endpoint is excluded from auth (it uses its own `CRON_SECRET`)
- Sign-in page appears automatically when auth is enabled
- User avatar and sign-out menu appear in the nav bar

---

## API Endpoints

| Endpoint              | Method  | Description                                         |
| --------------------- | ------- | --------------------------------------------------- |
| `/api/cron`           | POST    | Collect + detect + alert (use with scheduler)       |
| `/api/stats`          | GET     | Dashboard statistics (`?days=7`)                    |
| `/api/analytics`      | GET     | Analytics data: DAU, models, MCP, etc. (`?days=30`) |
| `/api/team-spend`     | GET     | Daily team spend breakdown                          |
| `/api/model-costs`    | GET     | Model cost breakdown by users and spend             |
| `/api/groups`         | GET     | Billing groups with members and spend               |
| `/api/groups`         | PATCH   | Rename group, assign member, or create group        |
| `/api/groups/import`  | POST    | HiBob CSV import (preview + apply)                  |
| `/api/anomalies`      | GET     | Anomaly timeline (`?days=30`)                       |
| `/api/users/[email]`  | GET     | Per-user statistics (`?days=30`)                    |
| `/api/incidents/[id]` | PATCH   | Acknowledge or resolve incident                     |
| `/api/settings`       | GET/PUT | Detection configuration                             |

---

## Tech Stack

| Component  | Technology                                                                                                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework  | [![Next.js](https://img.shields.io/badge/Next.js-000?logo=nextdotjs&logoColor=white)](https://github.com/vercel/next.js) App Router                                                         |
| Language   | [![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://github.com/microsoft/TypeScript) strict mode                                        |
| Database   | SQLite (default) or PostgreSQL via `DATABASE_SOURCE`; SQLite uses [better-sqlite3](https://github.com/WiseLibs/better-sqlite3), Postgres uses [pg](https://github.com/brianc/node-postgres) |
| Charts     | [![Recharts](https://img.shields.io/badge/Recharts-22B5BF?logo=recharts&logoColor=white)](https://github.com/recharts/recharts)                                                             |
| Styling    | [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)](https://github.com/tailwindlabs/tailwindcss)                                           |
| Testing    | [![Vitest](https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white)](https://github.com/vitest-dev/vitest)                                                                   |
| Deployment | [![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)](https://github.com/docker) multi-stage build                                                            |

---

## Development

```bash
npm run dev          # Start dev server
npm run collect      # Manual data collection
npm run detect       # Manual anomaly detection + alerting
npm run reset        # Clear database tables (see --help)
npm run typecheck    # Type checking
npm test             # Run tests
npm run lint         # Lint + format check
```

---

## Cursor API Requirements

Requires a **Cursor Enterprise** plan. The tool uses these endpoints:

| Endpoint                            | Auth              | What it provides                             |
| ----------------------------------- | ----------------- | -------------------------------------------- |
| `GET /teams/members`                | Admin API key     | Team member list                             |
| `POST /teams/spend`                 | Admin API key     | Per-user spending data                       |
| `POST /teams/daily-usage-data`      | Admin API key     | Daily usage metrics                          |
| `POST /teams/filtered-usage-events` | Admin API key     | Detailed usage events with model/token info  |
| `POST /teams/groups`                | Admin API key     | Billing groups + cycle dates                 |
| `GET /analytics/team/*`             | Analytics API key | DAU, model usage, MCP, tabs, etc. (optional) |

Rate limit: 20 requests/minute (Admin API), 100 requests/minute (Analytics API). The collector handles rate limiting with automatic retry.

---

## Security

This project handles sensitive usage and spending data, so security matters here more than most.

- **Vulnerability reporting**: See [SECURITY.md](.github/SECURITY.md) for the disclosure policy. Report vulnerabilities privately via [GitHub Security Advisories](https://github.com/ofershap/cursor-usage-tracker/security/advisories/new), not public issues.
- **Automated scanning**: Every push and PR goes through [CodeQL](https://codeql.github.com/) (SQL injection, XSS, CSRF, etc.) and [Dependabot](https://docs.github.com/en/code-security/dependabot) for dependency vulnerabilities.
- **OpenSSF Scorecard**: Continuously evaluated against [OpenSSF Scorecard](https://scorecard.dev/viewer/?uri=github.com/ofershap/cursor-usage-tracker) security benchmarks.
- **OpenSSF Best Practices**: [Passing badge](https://www.bestpractices.dev/projects/11968) earned.
- **Data stays yours**: Everything is stored in your own infrastructure. No external services, no telemetry, no data leaving your network.
- **Small dependency tree**: Fewer dependencies = smaller attack surface.
- **Signed releases**: Automated via semantic-release with GitHub-verified provenance.

---

## Contributing

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for setup and guidelines. Bug reports, feature requests, docs improvements, and code are all welcome. Use [conventional commits](https://www.conventionalcommits.org/) and make sure CI is green before opening a PR.

## Code of Conduct

This project uses the [Contributor Covenant Code of Conduct](.github/CODE_OF_CONDUCT.md).

## Author

[![Made by ofershap](https://gitshow.dev/api/card/ofershap)](https://gitshow.dev/ofershap)

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=flat&logo=linkedin&logoColor=white)](https://linkedin.com/in/ofershap)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-181717?style=flat&logo=github&logoColor=white)](https://github.com/ofershap)

## License

[MIT](LICENSE) © Ofer Shapira
