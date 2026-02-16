# Cursor Usage Tracker

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED)](https://www.docker.com/)

**Your company has 50+ developers on Cursor. Do you know who's spending $200/day on Claude Opus while everyone else uses Sonnet?**

You're about to find out.

![Demo](assets/demo.gif)

<sub>Demo animation created with <a href="https://github.com/ofershap/remotion-readme-kit">remotion-readme-kit</a></sub>

---

## The Problem

You're managing Cursor for your engineering team. The bill comes in. It's... a lot.

- **Who** is driving the cost?
- **When** did it start spiking?
- **Why** — is it a model shift? A runaway agent? Legitimate heavy usage?
- **How long** until someone notices?

Cursor's built-in dashboard shows data, but has **no anomaly detection** and **no proactive alerting**. You find out about cost spikes when the invoice arrives — weeks too late.

## The Solution

cursor-usage-tracker connects to Cursor's Enterprise APIs, collects usage data, and **automatically detects anomalies** across three layers of intelligence. When something looks off, you get a Slack message or email — not next month, but within the hour.

```
Developer uses Cursor → API collects data hourly → Engine detects anomaly → You get a Slack alert
```

### How It Works

| What happens                                 | Example                                                 |
| -------------------------------------------- | ------------------------------------------------------- |
| A developer exceeds the spend limit          | `Bob spent $82 this cycle (limit: $50)` → Slack alert   |
| Someone's usage is 3x their personal average | `Token spike: 4.2x Alice's 7-day average` → Slack alert |
| A user is statistically far from the team    | `Bob: 2.8 std devs above team mean` → Slack alert       |
| Someone shifts to expensive models           | `Opus usage jumped from 5% to 45%` → Slack alert        |
| Usage drifts above team P75 for days         | `Above team P75 for 5 of last 6 days` → Slack alert     |

Every alert includes **who**, **what model**, **how much**, and a **link to their dashboard page** for instant investigation.

---

## Features

### Three-Layer Anomaly Detection

| Layer          | Method        | What it catches                                                             |
| -------------- | ------------- | --------------------------------------------------------------------------- |
| **Thresholds** | Static limits | Spend > $50/cycle, > 500 requests/day, > 5M tokens/day                      |
| **Z-Score**    | Statistical   | User 2+ standard deviations above team mean                                 |
| **Trends**     | Behavioral    | Personal spikes, sustained drift above P75, model shift to expensive models |

### Incident Lifecycle (MTTD / MTTI / MTTR)

Every anomaly becomes a tracked incident with full lifecycle metrics:

```
Anomaly Detected ──→ Alert Sent ──→ Acknowledged ──→ Resolved
       │                  │               │              │
       └──── MTTD ────────┘               │              │
                                          └── MTTI ──────┘
       └────────────────── MTTR ─────────────────────────┘
```

- **MTTD** — Mean Time to Detect: how fast the system catches it
- **MTTI** — Mean Time to Identify: how fast a human acknowledges it
- **MTTR** — Mean Time to Resolve: how fast it's fixed

### Rich Alerting

- **Slack** — Block Kit messages with severity, user, model, value vs threshold, and dashboard links
- **Email** — HTML-formatted alerts with the same context

### Web Dashboard

| Page               | What you see                                                             |
| ------------------ | ------------------------------------------------------------------------ |
| **Team Overview**  | Total spend, requests, tokens, top consumers, daily trends               |
| **User Drilldown** | Per-user token timeline, model breakdown, feature usage, anomaly history |
| **Anomalies**      | Open incidents, MTTD/MTTI/MTTR metrics, full anomaly timeline            |
| **Settings**       | Configurable detection thresholds — no code changes needed               |

---

## Quick Start

### Prerequisites

| What                   | Where to get it                                         |
| ---------------------- | ------------------------------------------------------- |
| Cursor Enterprise plan | Required for API access                                 |
| Admin API key          | Cursor dashboard → Settings → Advanced → Admin API Keys |
| Node.js 18+            | [nodejs.org](https://nodejs.org)                        |

### 1. Clone and install

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

# Alerting (at least one recommended)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../xxx

# Optional
CURSOR_ANALYTICS_API_KEY=your_analytics_key   # for DAU and model breakdowns
CRON_SECRET=your_secret_here                  # protects the cron endpoint
SMTP_HOST=smtp.gmail.com                      # for email alerts
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=app_password
ALERT_EMAIL_TO=team-lead@company.com
```

### 3. Collect your first data

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

### 4. Start the dashboard

```bash
npm run dev
# Open http://localhost:3000
```

### 5. Set up recurring collection

Trigger the cron endpoint hourly (via crontab, GitHub Actions, or any scheduler):

```bash
curl -X POST http://localhost:3000/api/cron -H "x-cron-secret: YOUR_SECRET"
```

This collects data, runs anomaly detection, and sends alerts — all in one call.

---

## Docker

For production deployment:

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

---

## Architecture

```
Cursor Enterprise APIs
  ├── /teams/members
  ├── /teams/spend
  ├── /teams/daily-usage-data
  └── /teams/filtered-usage-events
          │
          ▼
    ┌─────────────┐     ┌──────────┐     ┌───────────────────┐
    │  Collector   │────▶│  SQLite  │────▶│ Detection Engine  │
    │  (hourly)    │     │  (local) │     │ 3 layers          │
    └─────────────┘     └──────────┘     └───────────────────┘
                                                   │
                                          ┌────────┴────────┐
                                          ▼                 ▼
                                    ┌──────────┐    ┌──────────────┐
                                    │  Alerts   │    │  Dashboard   │
                                    │ Slack/Email│    │  Next.js     │
                                    └──────────┘    └──────────────┘
```

**Zero external dependencies.** SQLite stores everything locally. No Postgres, no Redis, no cloud database. Clone, configure, run.

---

## Configuration

All detection thresholds are configurable via the Settings page or the API:

| Setting              | Default | What it does                                      |
| -------------------- | ------- | ------------------------------------------------- |
| Max spend per cycle  | $50.00  | Alert when a user exceeds this in a billing cycle |
| Max requests per day | 500     | Alert on excessive daily request count            |
| Max tokens per day   | 5M      | Alert on excessive daily token consumption        |
| Z-score multiplier   | 2.0     | How many standard deviations above mean to flag   |
| Z-score window       | 14 days | Historical window for statistical comparison      |
| Spike multiplier     | 3.0x    | Alert when today > N× user's personal average     |
| Drift days above P75 | 3       | Consecutive days above team P75 to flag           |

---

## API Endpoints

| Endpoint              | Method  | Description                                   |
| --------------------- | ------- | --------------------------------------------- |
| `/api/cron`           | POST    | Collect + detect + alert (use with scheduler) |
| `/api/stats`          | GET     | Dashboard statistics                          |
| `/api/anomalies`      | GET     | Anomaly timeline                              |
| `/api/users/[email]`  | GET     | Per-user statistics                           |
| `/api/incidents/[id]` | PATCH   | Acknowledge or resolve incident               |
| `/api/settings`       | GET/PUT | Detection configuration                       |

---

## Tech Stack

| Component  | Technology                            |
| ---------- | ------------------------------------- |
| Framework  | Next.js (App Router)                  |
| Language   | TypeScript (strict mode)              |
| Database   | SQLite (better-sqlite3) — zero config |
| Charts     | Recharts                              |
| Styling    | Tailwind CSS                          |
| Testing    | Vitest                                |
| Deployment | Docker (multi-stage)                  |

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

| Endpoint                            | Auth              | What it provides                            |
| ----------------------------------- | ----------------- | ------------------------------------------- |
| `GET /teams/members`                | Admin API key     | Team member list                            |
| `POST /teams/spend`                 | Admin API key     | Per-user spending data                      |
| `POST /teams/daily-usage-data`      | Admin API key     | Daily usage metrics                         |
| `POST /teams/filtered-usage-events` | Admin API key     | Detailed usage events with model/token info |
| `GET /analytics/team/*`             | Analytics API key | DAU, model usage breakdowns (optional)      |

Rate limit: 250 requests/minute. The collector handles rate limiting with automatic retry.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

[MIT](LICENSE) © Ofer Shapira
