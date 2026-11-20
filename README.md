# env-garden

Store and share environment variables securely. Live at **[env.garden](https://env.garden)**.

env-garden is an open-source workspace for `.env` files. Instead of pasting secrets into chats or docs, teams keep them encrypted in one place, control who can see each environment, and pull them from the terminal.

## Features

- **End-to-end encrypted.** Names, values and notes are encrypted in the browser or CLI. The server stores ciphertext it cannot decrypt. See [How encryption works](#how-encryption-works).
- **Workspaces, projects and env files.** Group env files by project and environment (production, staging, development…).
- **Team access.** Invite members by email; give them all projects or selected ones, as viewer or contributor, per environment. Reading an environment also needs its key, which someone who already holds it shares with you.
- **Service accounts.** Give CI its own end-to-end encrypted access with a token in `EIT_TOKEN`.
- **History.** Every change, copy and pull is recorded per workspace.
- **Comments survive.** `# comment` lines are kept as notes and `# KEY=value` lines as commented-out variables, in the editor and the CLI.
- **Sign-in.** Magic link, Google or GitHub (linked by email), with optional authenticator-app 2FA and backup codes.
- **Sessions.** See and revoke browser and CLI sessions from Settings.
- **CLI.** [`@env-garden/cli`](https://www.npmjs.com/package/@env-garden/cli) (`eit`) can pull, push and run with variables, and manage workspaces, projects, env files, members and history. See the [CLI docs](https://env.garden/docs/cli).

## How encryption works

- **Account keys.** Each account has a key pair derived from a 24-word recovery phrase. The browser encrypts the seed with a vault passphrase (Argon2id) before uploading it, so the server never sees the passphrase, the phrase or the private keys.
- **Environment keys.** Every project environment has its own random key. It is shared with each member as a copy sealed to their public key and signed by whoever shared it.
- **Variables.** Names, values and notes are encrypted with XChaCha20-Poly1305 and bound to their env file, key version and flags, so ciphertext can't be moved or altered undetected.
- **Access.** Owners and admins grant permission, but only someone who holds an environment's key can share it. Nobody can give themselves a key.
- **Revocation.** Losing access deletes your key copies and flags the environment for key rotation, which re-encrypts every value under a new key.
- **CLI and CI.** The CLI receives its account key split in two: half sealed to a one-time key on the device, half stored on the server encrypted with a key only the device holds.
- **Limits.** The server still sees names of workspaces, projects and env files, environment names, how many variables each has, and who has access. The web app's code is served by the server, so a compromised server could ship code that steals keys while you're unlocked; the CLI doesn't have that exposure.

## Tech stack

Next.js (App Router), React, TypeScript, Tailwind, shadcn/ui, Prisma with Postgres, Better Auth (magic link, OAuth, two-factor), Resend for email. Deployed on Heroku.

## Getting started

### Prerequisites

- Node.js 24
- pnpm 11
- A Postgres database

### Setup

```bash
pnpm install
cp .env.example .env    # fill in the values
pnpm db:sync            # push the Prisma schema and generate the client
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Outside production, magic links are printed to the terminal instead of emailed.

### Environment variables

See [`.env.example`](.env.example) for the full list. The important ones:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `BETTER_AUTH_URL` | Public URL of the app (auth callbacks) |
| `BETTER_AUTH_SECRET` | Signs sessions and encrypts 2FA secrets. Use 32+ random bytes |
| `NEXT_PUBLIC_APP_URL` | Public URL used in email and CLI authorization links |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google sign-in |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub sign-in |
| `RESEND_API_KEY` / `EMAIL_DOMAIN` | Sending magic links and invites |

OAuth callback URLs are `<BETTER_AUTH_URL>/api/auth/callback/google` and `/api/auth/callback/github`.

### Scripts

```bash
pnpm dev        # development server
pnpm build      # production build (includes type checking)
pnpm start      # run the production build
pnpm lint       # ESLint
pnpm test       # crypto unit tests
pnpm db:sync    # prisma db push + prisma generate
```

## Project structure

```
app/            routes, pages and API route handlers
components/     UI by area (landing, docs, settings, dashboard, ui…)
constants/      constants only
types/          types only
lib/            modules (auth, CLI auth, email); lib/crypto holds the client-side encryption
contexts/       React contexts, including the vault that holds unlocked keys in memory
prisma/         schema and services (data access)
tests/          unit tests
utils/          pure helpers (env file parsing, serializers, time)
```

## API and CLI

The app API under `/api/workspaces/**` accepts either a browser session or a CLI token, with identical permission checks. It only ever receives and returns ciphertext for variables. Account settings, sessions, 2FA, accepting invites and approving CLI logins require a browser session. The CLI's sign-in endpoints live under `/api/cli/v1`.

## Security

Security is the foundation of env-garden.

If you discover a vulnerability, please do not open a public issue. Report it privately via [GitHub security advisories](https://github.com/harsh-govind/env-garden/security/advisories/new). See [SECURITY.md](SECURITY.md) for the full policy.

## Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make your changes with clear commits.
4. Open a pull request with context and screenshots if relevant.

## License

MIT. See [LICENSE](LICENSE).
