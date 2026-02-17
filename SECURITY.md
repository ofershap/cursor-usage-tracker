# Security Policy

## Reporting a Vulnerability

**Please do not open public GitHub issues for security vulnerabilities.**

If you discover a security vulnerability in cursor-usage-tracker, please report it responsibly through one of these channels:

1. **GitHub Security Advisories (preferred):** [Create a private security advisory](https://github.com/ofershap/cursor-usage-tracker/security/advisories/new)
2. **Email:** <security@ofershap.dev>

### What to Include

- A description of the vulnerability and its potential impact
- Steps to reproduce or a minimal proof of concept
- The version(s) affected
- Any suggested fix (optional, but appreciated)

### What to Expect

- **Acknowledgment** within 48 hours
- **Status update** within 7 days with an assessment and expected timeline
- **Fix and disclosure** coordinated with you before any public announcement
- **Credit** in the release notes (unless you prefer to stay anonymous)

We follow [Coordinated Vulnerability Disclosure](https://github.com/ossf/oss-vulnerability-guide) practices and will work with you on a fix before anything goes public.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |

As a pre-1.0 project, security fixes are applied to the latest release only.

## Security Measures

- **CodeQL scanning** on every push and pull request (SQL injection, XSS, CSRF, command injection)
- **Dependabot** for automated dependency vulnerability alerts and updates
- **OpenSSF Scorecard** for continuous security posture evaluation
- **Strict TypeScript** with no `any` types to reduce runtime errors
- **Parameterized SQL queries** throughout, no string concatenation in database operations
- **Local-only data storage**: all data stays in a local SQLite file, nothing is sent to external services
- **No telemetry or analytics**: the tool does not phone home
- **Minimal dependency tree**: fewer dependencies, smaller attack surface
- **Signed releases** via semantic-release with GitHub-verified provenance

## Scope

The following are considered in-scope for security reports:

- SQL injection or other injection vulnerabilities
- Authentication/authorization bypass (dashboard password, cron secret)
- Cross-site scripting (XSS) in the dashboard
- Sensitive data exposure (API keys, tokens in logs or responses)
- Dependency vulnerabilities with a realistic exploit path

The following are **out of scope**:

- Vulnerabilities in Cursor's own APIs
- Issues requiring physical access to the server
- Denial of service via excessive API calls (rate limiting is Cursor's responsibility)
- Social engineering attacks
