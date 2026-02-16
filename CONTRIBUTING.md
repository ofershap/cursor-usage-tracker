# Contributing

Contributions are welcome! Here's how to get started:

## Setup

```bash
git clone https://github.com/ofershap/cursor-usage-tracker.git
cd cursor-usage-tracker
npm install
```

## Development

```bash
npm run dev          # Start dev server at localhost:3000
npm run typecheck    # Type checking
npm test             # Run tests
npm run lint         # Lint + format check
npm run format       # Auto-format code
```

## Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Make your changes
4. Run `npm run typecheck && npm test && npm run lint`
5. Commit using [conventional commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, etc.)
6. Push and open a pull request

## Project Structure

```
src/
  app/                    # Next.js pages and API routes
  lib/
    cursor-client.ts      # Cursor API client
    db.ts                 # SQLite schema and queries
    collector.ts          # Data collection pipeline
    incidents.ts          # Incident lifecycle management
    types.ts              # Shared TypeScript types
    anomaly/              # Detection engine (thresholds, z-score, trends)
    alerts/               # Slack and email alerting
    cli/                  # CLI commands (collect, detect)
  components/             # React components (charts, dashboard)
tests/                    # Vitest test files
```
