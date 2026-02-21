# Feature Map

## Dashboard (`/`)

**Team overview — cost, activity, members at a glance.**

### Controls

- Search by name/email
- Filter by billing group
- Time range: 24h / 3d / 7d / 14d / 30d

### Stat Cards

- **Spend** — total team spend, $/day average
- **Billing Cycle** — day X of Y, days left, reset date
- **Anomalies** — open count, red border when active
- **Active** — active members count and % of team
- **Requests** — total agent requests, /day average
- **Lines** — total lines added, /day average

### Charts

- **Daily Spend Trend** — area chart with avg line, provisional zone (last 2d), spike detection
- **Model Cost Comparison** — table with $/request, relative multiplier (1x–8x+), color-coded
- **Top Spenders** — horizontal bar chart, top 8
- **Daily Spend by User** — stacked bar, top 6 + Others, clickable legend

### Members Table

- Sortable by: spend, activity, requests, lines, $/req, context, name
- Filterable by badge type via `Badges ▾` dropdown with collapsible sections and per-badge user counts
- Active badge filter shown as chip with ✕ dismiss next to table header
- Columns: rank, name, email, spend, requests, lines, $/req, model, profile badges, ranks

### Badges (per user, all shown)

| Category | Badges                                                                                                                                                                |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Usage    | Power User, Deep Thinker, Balanced, Low Usage                                                                                                                         |
| Spend    | Cost Efficient, Premium Model, Over Budget                                                                                                                            |
| Context  | Long Sessions, Short Sessions                                                                                                                                         |
| Adoption | AI-Native (80%+), High Adoption (55%+), Moderate (30%+), Low Adoption (10%+), Manual Coder (<10%) — based on composite score (accept rate + engagement + consistency) |

### Ranks

- Spend rank ($N) — blue
- Activity rank (AN) — green

---

## User Detail (`/users/[email]`)

**Per-user deep dive — KPIs, trends, tools, models, anomalies.**

### Header

- Name, email, role, billing group link
- Profile badges (same as dashboard)

### KPI Cards

- **Cycle Spend** — total $ in billing cycle, $/day
- **$/Req** — cost per agent request
- **Agent Reqs** — total requests in time range
- **Diffs Accepted** — % of agent diffs accepted (accepts/applies), raw counts
- **Team Rank** — spend and activity rank of N

### Charts

- **Spend Trend** — same area chart as dashboard, per-user
- **AI Adoption** — tier label (AI-Native/High/Moderate/Low/Manual) with one-line description. Score bar (0-100). Three stat pills: diffs accepted %, requests/day, active days. Composite score from Accept Rate (40%), Engagement Intensity (40%), Consistency (20%). Tooltips on hover with raw numbers.

### Sections

- **Cost Breakdown** — per-model table: requests, $/req, total $, included vs overage bar, errors
- **Tools & Features** — top 10 MCP tools + top 10 commands used
- **Context Efficiency** — avg cache read/req, org median, vs org ratio, rank, color-coded band
- **Model Preferences** — model, days used, requests
- **Daily Activity Table** — date, model, requests, spend, lines +/-, accepts, tabs, version (spike rows highlighted)
- **Anomaly History** — detected date, type, severity, message, status

---

## Insights (`/insights`)

**Team analytics — adoption, efficiency, trends.**

### Stat Cards

- Avg DAU, Commands total, Agent lines accepted, Tab lines accepted, MCP tools count

### Sections

- **Plan Exhaustion** — users who exceeded plan, days to exhaust, buckets (1-3d, 4-7d, 8-14d, 15+d)
- **Model Rankings** — biggest spenders, most/least cost efficient, full scorecard
- **DAU Chart** — daily active users by type (DAU, Cloud Agent, CLI)
- **Model Adoption Share** — stacked area, top 5 models over time
- **Model Usage Breakdown** — table: model, messages, users, % of total
- **Top File Extensions** — horizontal bar by AI lines accepted
- **Commands Adoption** — top 20 commands, usage counts
- **MCP Tool Adoption** — top 20 tools by server, call counts
- **Client Versions** — pie chart + table with "latest" / "needs update" badges

---

## Anomalies (`/anomalies`)

**Incident monitoring and response tracking.**

### Stat Cards

- Open Anomalies, Resolved, Open Incidents, Avg MTTD, Avg MTTI, Avg MTTR

### Sections

- **Open Incidents** — table with acknowledge/resolve actions
- **All Anomalies** — table: date, user, type, severity, metric, message, status

---

## Settings (`/settings`)

**Detection thresholds, budget, billing groups.**

### Detection Config

- Static thresholds (max spend/cycle, max requests/day)
- Z-score detection (std dev multiplier, lookback window)
- Spend trend detection (spike multiplier, lookback, cycle outlier multiplier)
- Collection schedule (cron interval)
- Team budget alert threshold

### Billing Groups

- Group management: create, rename, assign members
- HiBob CSV import with change preview
- Backup export/import
