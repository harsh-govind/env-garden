# env-garden

Store and share environment variables securely. Live at **[env.garden](https://env.garden)**.

env-garden is an open-source workspace for `.env` files. Instead of pasting secrets into chats or docs, teams keep them encrypted in one place, control who can see each environment, and pull them from the terminal.

## Features

- **Encrypted at rest.** Every value is encrypted with AES-256-GCM under a project-scoped key, which is itself encrypted with a master key.
- **Workspaces, projects and env files.** Group env files by project and environment (production, staging, development…).
- **Team access.** Invite members by email; give them all projects or selected ones, as viewer or contributor, per environment.
- **History.** Every change, copy and pull is recorded per workspace.
- **Comments survive.** `# comment` lines are kept as notes and `# KEY=value` lines as commented-out variables, in the editor and the CLI.
- **Sign-in.** Magic link, Google or GitHub (linked by email), with optional authenticator-app 2FA and backup codes.
- **Sessions.** See and revoke browser and CLI sessions from Settings.
- **CLI.** [`@env-garden/cli`](https://www.npmjs.com/package/@env-garden/cli) (`eit`) can pull, push and run with variables, and manage workspaces, projects, env files, members and history. See the [CLI docs](https://env.garden/docs/cli).

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
| `MASTER_ENCRYPTION_KEY` | 64 hex chars. Encrypts project keys. Back it up; losing it makes variables unreadable |
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
pnpm db:sync    # prisma db push + prisma generate
```

## Project structure

```
app/            routes, pages and API route handlers
components/     UI by area (landing, docs, settings, dashboard, ui…)
constants/      constants only
types/          types only
lib/            server modules (auth, encryption, CLI auth, email)
prisma/         schema, services (data access) and one-off SQL migrations
utils/          pure helpers (env file parsing, serializers, time)
```

## API and CLI

The app API under `/api/workspaces/**` accepts either a browser session or a CLI token, with identical permission checks. Account settings, sessions, 2FA, accepting invites and approving CLI logins require a browser session. The CLI's sign-in endpoints live under `/api/cli/v1`.

## Security

Security is the foundation of env-garden.

If you discover a vulnerability, please do not open a public issue with exploit details. Report it privately to the maintainers first.

## Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make your changes with clear commits.
4. Open a pull request with context and screenshots if relevant.

## License

MIT. See [LICENSE](LICENSE).
