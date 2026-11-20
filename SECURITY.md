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

- Variables are end-to-end encrypted. Names, values and notes are encrypted in the browser or CLI with XChaCha20-Poly1305 under a key per project environment. The server stores and returns ciphertext only.
- Each account has an X25519/Ed25519 key pair derived from a 24-word recovery phrase. The seed is encrypted in the browser with an Argon2id-derived key from a vault passphrase that never leaves the browser.
- Environment keys are shared per member as copies sealed to that member's public key and signed by the member who shared them. The server checks signatures and permissions; owners and admins cannot grant themselves a key.
- Removing access deletes the member's key copies and flags the environment for rotation, which re-encrypts every value under a new key. Removed members keep anything they already saw.
- CLI sessions and service account tokens hold half of a split account key; the other half is stored on the server encrypted with a key only the CLI holds. Only a SHA-256 hash of each token is stored.
- Browsers and the CLI pin teammates' public keys on first use and warn when they change.
- Sign-in uses Better Auth (magic link, Google, GitHub) with optional authenticator-app 2FA enforced on every sign-in method.
- Access is checked on every request (workspace role, project role, environment access), and key shares, revocations, rotations and saves are recorded in workspace history.

Known limits:

- Metadata is not encrypted: workspace, project and env file names, environment names, variable counts and membership.
- The web app's JavaScript is served by env.garden. A compromised server could serve code that exfiltrates keys from an unlocked browser. The CLI is not exposed to this.
- Losing both the vault passphrase and the recovery phrase loses access to every environment nobody else holds.

## Supported versions

Only the latest deployed version of the web app and the latest published CLI receive fixes.
