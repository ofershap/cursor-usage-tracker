<p align="center">
  <img src="public/logo.png" alt="Cursor Usage Tracker - open-source Cursor Enterprise cost monitoring dashboard with anomaly detection and Slack alerts" width="100" height="100" />
</p>

<h1 align="center">Cursor Usage Tracker</h1>

<p align="center">
  Know who's burning through your AI budget before the invoice tells you. Open-source Cursor Enterprise cost monitoring with anomaly detection, Slack alerts, and spend analytics.
</p>

<p align="center">
  <a href="https://cursor-usage-tracker.sticklight.app">Website</a> · <a href="#quick-start">Quick Start</a> · <a href="#deploy">Deploy</a> · <a href="#features">Features</a>
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

## Why This Exists

This dashboard answers three questions:

1. **Cost monitoring** - Are we spending too much? Who's driving it? Why?
2. **Adoption tracking** - Is everyone using the tool we're paying for?
3. **Usage understanding** - How is each person working with AI?

## AI Spend Is a Blind Spot

Engineering costs used to be two things: headcount and cloud infrastructure. You had tools for both. Then AI coding assistants showed up, and suddenly there's a third cost center that nobody has good tooling for.

A single developer on Cursor can burn through hundreds of dollars a day just by switching to an expensive model or letting an agent loop run wild. Developers often don't know which models cost more - one of our team members used `opus-max` for weeks thinking it was a cheaper option. Now multiply that confusion by 50, 100, 500 developers. The bill gets big fast, and there's nothing like Datadog or CloudHealth for this category yet.

Cursor's admin dashboard shows you the raw numbers, but it won't tell you when something is off. No anomaly detection. No alerts. No incident tracking. You find out about cost spikes when the invoice lands, weeks after the damage is done.

I built cursor-usage-tracker to fix that. It sits on top of Cursor's Enterprise APIs and gives engineering managers, finance, and platform teams actual visibility into AI spend before it becomes a surprise.

---

## What It Does

Your company has 50+ developers on Cursor. Do you know who's spending $200/day on Claude Opus while everyone else uses Sonnet?

You're about to find out.

![Cursor Usage Tracker dashboard showing team spend, anomaly detection alerts, and per-user AI cost breakdown](assets/demo.gif)

<sub>Demo animation created with <a href="https://github.com/ofershap/remotion-readme-kit">remotion-readme-kit</a></sub>

It connects to Cursor's Enterprise APIs, collects usage data, and automatically detects anomalies across three layers. When something looks off, you get a Slack message or email within the hour, not next month.

```
Developer uses Cursor → API collects data hourly → Engine detects anomaly → You get a Slack alert
```

### How It Works

| What happens                               | Example                                                                       |
| ------------------------------------------ | ----------------------------------------------------------------------------- |
| A developer exceeds the spend limit        | `Bob spent $82 this cycle (limit: $50)` → Slack alert                         |
| Someone's daily spend spikes               | `Alice: daily spend spiked to $214 (4.2x her 7-day avg of $51)` → Slack alert |
| A user's cycle spend is far above the team | `Bob: cycle spend $957 is 5.1x the team median ($188)` → Slack alert          |
| A user is statistically far from the team  | `Bob: daily spend $214 is 3.2σ above team mean ($42)` → Slack alert           |

Every alert includes who, what model, how much, and a link to their dashboard page so you can investigate immediately.

---

## Features

### Three-Layer Anomaly Detection

| Layer          | Method        | What it catches                                                               |
| -------------- | ------------- | ----------------------------------------------------------------------------- |
| **Thresholds** | Static limits | Optional hard caps on spend, requests, or tokens (disabled by default)        |
| **Z-Score**    | Statistical   | User daily spend 2.5+ standard deviations above team mean (active users only) |
| **Trends**     | Spend-based   | Daily spend spikes vs personal average, cycle spend outliers vs team median   |

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

### Rich Alerting

- **Slack**: Block Kit messages via bot token (`chat.postMessage`) with severity, user, model, value vs threshold, and dashboard links. Batches alerts automatically (individual messages for 1-3 anomalies, single summary for 4+).
- **Email**: HTML-formatted alerts via [Resend](https://resend.com) (one API key, no SMTP config)

### Web Dashboard

| Page               | What you see                                                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Team Overview**  | Stat cards, spend by user, daily spend trend, spend breakdown, members table with search/sort, **group filter dropdown**, billing cycle progress, time range picker |
| **Insights**       | DAU chart, model adoption trends, model efficiency rankings (cost/precision), MCP tool usage, file extensions, client versions                                      |
| **User Drilldown** | Per-user token timeline, model breakdown, feature usage, activity profile, anomaly history                                                                          |
| **Anomalies**      | Open incidents, MTTD/MTTI/MTTR metrics, full anomaly timeline                                                                                                       |
| **Settings**       | Detection thresholds, **billing group management** (rename, assign, create), **HiBob CSV import** with change preview                                               |

---

## Deploy

### One-click deploy

Deploy your own instance in minutes. You'll need a [Cursor Enterprise](https://cursor.com) plan and an Admin API key.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/ofershap/cursor-usage-tracker)

> **Railway and Docker** options below. Want help setting this up for your team — deployment, threshold tuning, first spend analysis, and ongoing support? [Let's talk](https://linkedin.com/in/ofershap).

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
DASHBOARD_PASSWORD=your_password              # optional basic auth for the dashboard

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

### Cloud platforms

Any platform that supports Docker + persistent volumes works. Tested with:

- **[Render](https://render.com)** — use the deploy button above, or `render.yaml` in this repo
- **[Railway](https://railway.app)** — create a project from this repo, attach a volume at `/app/data`
- **[Fly.io](https://fly.io)** — deploy with `fly launch`, create a volume for `/app/data`

> **Note:** Vercel is not supported — SQLite requires a persistent filesystem that Vercel's serverless functions don't provide.

---

## Architecture

```mermaid
flowchart TB
    APIs["Cursor Enterprise APIs\n/teams/members · /teams/spend · /teams/daily-usage-data\n/teams/filtered-usage-events · /teams/groups · /analytics/team/*"]
    C["Collector (hourly)"]
    DB[("SQLite (local)")]
    D["Detection Engine, 3 layers"]
    AL["Alerts: Slack / Email"]
    DA["Dashboard: Next.js"]

    APIs --> C --> DB --> D
    DB --> DA
    D --> AL
```

**Zero external dependencies.** SQLite stores everything locally. No Postgres, no Redis, no cloud database. Clone, configure, run.

---

## Configuration

All detection thresholds are configurable via the Settings page or the API:

| Setting                  | Default | What it does                                                   |
| ------------------------ | ------- | -------------------------------------------------------------- |
| Max spend per cycle      | 0 (off) | Alert when a user exceeds this in a billing cycle              |
| Max requests per day     | 0 (off) | Alert on excessive daily request count                         |
| Max tokens per day       | 0 (off) | Alert on excessive daily token consumption                     |
| Z-score multiplier       | 2.5     | How many standard deviations above mean to flag (spend + reqs) |
| Z-score window           | 7 days  | Historical window for statistical comparison                   |
| Spend spike multiplier   | 5.0x    | Alert when today's spend > N× user's personal daily average    |
| Spend spike lookback     | 7 days  | How many days of history to compare against                    |
| Cycle outlier multiplier | 10.0x   | Alert when cycle spend > N× team median (active users only)    |

---

<details>
<summary><strong>Billing Groups: organize teams by department, group, or custom structure</strong></summary>

Billing groups let you organize team members by department, team, or any structure that fits your org.

**Dashboard Filtering**

The Team Overview page includes a group filter dropdown next to the search bar. Select a group to instantly filter all stats, charts, and the members table to that subset. Groups are displayed in a hierarchical `Parent > Team` format.

**Settings Page**

From the Settings page you can:

- **View** all groups with member counts and per-group spend
- **Rename** groups to match your org structure
- **Reassign** members between groups
- **Create** new groups manually
- **Search** across all members to find who's in which group

</details>

<details>
<summary><strong>HiBob Import: sync your org structure from HiBob's People Directory</strong></summary>

For teams using [HiBob](https://www.hibob.com/) as their HR platform, the Settings page includes an **Import from HiBob** feature:

1. Download a CSV export from HiBob's People Directory
2. Upload it to the import modal in Settings
3. Review the preview: see which members will be moved, which groups will be created, and which members weren't matched
4. Selectively approve or reject individual changes before applying

The import uses HiBob's `Group` and `Team` columns (falling back to `Department`) to build a `Group > Team` hierarchy. Small teams (fewer than 3 members) are automatically consolidated into broader groups to avoid excessive granularity.

> The HiBob import updates your local billing groups only. It does not push changes back to HiBob or to Cursor's billing API.

</details>

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

| Component  | Technology                           |
| ---------- | ------------------------------------ |
| Framework  | Next.js (App Router)                 |
| Language   | TypeScript (strict mode)             |
| Database   | SQLite (better-sqlite3), zero config |
| Charts     | Recharts                             |
| Styling    | Tailwind CSS                         |
| Testing    | Vitest                               |
| Deployment | Docker (multi-stage)                 |

---

## Development

```bash
npm run dev          # Start dev server
npm run collect      # Manual data collection
npm run detect       # Manual anomaly detection + alerting
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

- **Vulnerability reporting**: See [SECURITY.md](SECURITY.md) for the disclosure policy. Report vulnerabilities privately via [GitHub Security Advisories](https://github.com/ofershap/cursor-usage-tracker/security/advisories/new), not public issues.
- **Automated scanning**: Every push and PR goes through [CodeQL](https://codeql.github.com/) (SQL injection, XSS, CSRF, etc.) and [Dependabot](https://docs.github.com/en/code-security/dependabot) for dependency vulnerabilities.
- **OpenSSF Scorecard**: Continuously evaluated against [OpenSSF Scorecard](https://scorecard.dev/viewer/?uri=github.com/ofershap/cursor-usage-tracker) security benchmarks.
- **OpenSSF Best Practices**: [Passing badge](https://www.bestpractices.dev/projects/11968) earned.
- **Data stays local**: Everything is stored in a local SQLite file. Nothing leaves your infrastructure. No external databases, no cloud services, no telemetry.
- **Small dependency tree**: Fewer dependencies = smaller attack surface.
- **Signed releases**: Automated via semantic-release with GitHub-verified provenance.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and guidelines. Bug reports, feature requests, docs improvements, and code are all welcome. Use [conventional commits](https://www.conventionalcommits.org/) and make sure CI is green before opening a PR.

## Code of Conduct

This project uses the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).

## Author

**Ofer Shapira**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=flat&logo=linkedin&logoColor=white)](https://linkedin.com/in/ofershap)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-181717?style=flat&logo=github&logoColor=white)](https://github.com/ofershap)

## License

[MIT](LICENSE) © Ofer Shapira
