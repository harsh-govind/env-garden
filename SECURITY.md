# Security policy

## Reporting a vulnerability

Please **don't** open a public issue for security problems.

Report privately through GitHub: **[Report a vulnerability](https://github.com/harsh-govind/env-garden/security/advisories/new)**. Include steps to reproduce, the impact, and any proof of concept. You'll get an acknowledgement within 3 business days.

Please give us a reasonable time to fix the issue before disclosing it publicly.

## Scope

- The web app and API at https://env.garden
- The CLI (`@env-garden/cli`) — also see its repository
- This repository's code

Out of scope: denial of service, social engineering, and reports from automated scanners without a demonstrated impact.

## How secrets are protected

- Values are encrypted with AES-256-GCM, one encrypted payload per value, using a per-project key. Project keys are encrypted with a master key held only by the server.
- The server can decrypt values to serve authorized users. env.garden is **not** end-to-end encrypted today.
- Access is checked on every request (workspace role, project role, environment access) for both the web app and the CLI.
- Viewing, copying, pulling and changing variables is recorded in workspace history.
- Sign-in uses Better Auth (magic link, Google, GitHub) with optional authenticator-app 2FA enforced on every sign-in method.
- CLI tokens are generated on the user's machine; only a SHA-256 hash is stored. They expire after 7 days and can be revoked in Settings.

## Supported versions

Only the latest deployed version of the web app and the latest published CLI receive fixes.
