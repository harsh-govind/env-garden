import { CLI_TOKEN_TTL_DAYS } from "@/constants/cli";
import type { DocsSectionGroup } from "@/types/docs";

export const CLI_DOCS_TITLE = "CLI";
export const CLI_DOCS_DESCRIPTION =
    "Use eit to manage workspaces, projects, members and env files, and to pull, push and run with your variables from the terminal.";

export const CLI_DOCS_GROUPS: DocsSectionGroup[] = [
    {
        title: "Getting started",
        sections: [
            {
                id: "install",
                title: "Install",
                blocks: [
                    { kind: "text", text: "The CLI is called `eit`. Install it globally, or run it with `npx` without installing." },
                    { kind: "code", label: "Global install", code: "pnpm add --global @env-garden/cli\n# or\nnpm install --global @env-garden/cli" },
                    { kind: "code", label: "Without installing", code: "npx @env-garden/cli <command>" },
                    { kind: "text", text: "Requires Node.js 20 or newer." },
                ],
            },
            {
                id: "quick-start",
                title: "Quick start",
                blocks: [
                    { kind: "text", text: "Four commands take you from a fresh clone to a running app." },
                    {
                        kind: "code",
                        code: "eit login            # approve this device in your browser\neit link             # pick a workspace, project and env file\neit pull             # write the variables to .env\neit run -- npm run dev   # or inject them without writing a file",
                    },
                ],
            },
        ],
    },
    {
        title: "Authentication",
        sections: [
            {
                id: "login",
                title: "Log in",
                blocks: [
                    { kind: "text", text: "`eit login` opens Env Garden in your browser. Sign in if needed, approve the device, and return to the terminal." },
                    { kind: "code", code: "eit login\neit login --no-browser          # print the URL instead of opening it\neit login --api-url http://localhost:3000   # self-hosted or local" },
                    {
                        kind: "list",
                        items: [
                            `A session lasts ${CLI_TOKEN_TTL_DAYS} days. After that, run \`eit login\` again.`,
                            "The token is generated on your machine. Only its SHA-256 hash is sent to Env Garden.",
                            "Credentials are stored in `~/.config/env-garden/credentials.json` with user-only permissions.",
                        ],
                    },
                ],
            },
            {
                id: "status",
                title: "Status",
                blocks: [
                    { kind: "text", text: "`eit status` shows the signed-in account, when the session expires, whether it has been revoked, and which env file the current folder is linked to." },
                    { kind: "code", code: "eit status" },
                ],
            },
            {
                id: "permissions",
                title: "Access and permissions",
                blocks: [
                    { kind: "text", text: "The CLI acts as your account, with exactly the same workspace, project and environment access as the web app. If your access changes, the CLI follows on its next request." },
                    {
                        kind: "list",
                        items: [
                            "Approving `eit login` requires a fully signed-in browser session, including your 2FA code if it's on.",
                            "Account settings, sessions, 2FA, accepting invites and approving CLI logins stay in the web app.",
                            "CLI actions appear in workspace history, labelled \"via CLI\".",
                        ],
                    },
                ],
            },
            {
                id: "sessions",
                title: "Sessions and revoking access",
                blocks: [
                    { kind: "text", text: "Every device that runs `eit login` appears under **Settings → Sessions → CLI sessions** in Env Garden, with when it was last used and when it expires." },
                    { kind: "text", text: "Revoke a single device or all of them from there. A revoked device is rejected on its next request." },
                    { kind: "text", text: "To sign out from the terminal and revoke the session in one step:" },
                    { kind: "code", code: "eit logout\neit logout --local   # only delete the local credentials" },
                ],
            },
        ],
    },
    {
        title: "Working with env files",
        sections: [
            {
                id: "link",
                title: "Link a folder",
                blocks: [
                    { kind: "text", text: "`eit link` connects the current folder to one env file. It asks for the workspace, project and env file, or you can pass them as flags." },
                    { kind: "code", code: "eit link\neit link --workspace Acme --project api --env production\neit unlink" },
                    { kind: "text", text: "The link is saved to `.eit.json`. It contains only ids and names, no secrets, so it's safe to commit. Commands look for it in the current folder and its parents." },
                    { kind: "text", text: "`eit list` shows every workspace, project and env file you can access, and marks the linked one." },
                ],
            },
            {
                id: "pull",
                title: "Pull",
                blocks: [
                    { kind: "text", text: "`eit pull` downloads the linked env file and writes it to `.env`." },
                    { kind: "code", code: "eit pull\neit pull -o .env.local\neit pull --env staging\neit pull --force       # overwrite without asking" },
                    {
                        kind: "list",
                        items: [
                            "The file is written with `0600` permissions (readable only by you).",
                            "If the local file is different, `eit pull` asks before overwriting it.",
                            "It warns you when the file isn't covered by `.gitignore`.",
                        ],
                    },
                ],
            },
            {
                id: "push",
                title: "Push",
                blocks: [
                    { kind: "text", text: "`eit push` uploads a local file and replaces the env file on Env Garden. It shows what will change first and asks you to confirm." },
                    { kind: "code", code: "$ eit push\nChanges to api / .env.production:\n  + NEW_FLAG\n  ~ DATABASE_URL\n  - OLD_TOKEN\nReplace .env.production on Env Garden with .env? [y/N]" },
                    { kind: "code", code: "eit push -f .env.local\neit push --env staging\neit push --yes   # skip the confirmation" },
                    { kind: "note", text: "Push replaces the whole env file. Keys missing from your local file are removed on Env Garden." },
                ],
            },
            {
                id: "run",
                title: "Run",
                blocks: [
                    { kind: "text", text: "`eit run` starts a command with the variables injected into its environment. Nothing is written to disk." },
                    { kind: "code", code: "eit run -- npm run dev\neit run --env production -- node scripts/migrate.js" },
                    { kind: "text", text: "Variables from Env Garden override ones already set in your shell. Commented-out variables are skipped." },
                ],
            },
            {
                id: "env-flag",
                title: "Choosing an env file",
                blocks: [
                    { kind: "text", text: "`pull`, `push` and `run` use the linked env file. Pass `--env` to use a different env file in the same project for one command." },
                    { kind: "text", text: "`--env` accepts the file name (`.env.production`), its environment (`production`) or its id." },
                ],
            },
            {
                id: "comments",
                title: "Comments",
                blocks: [
                    { kind: "text", text: "Comments and commented-out variables survive a pull and push round trip." },
                    { kind: "code", label: ".env", code: "# Primary database\nDATABASE_URL=\"postgres://…\"\n# LEGACY_FLAG=on\nPORT=3000 # web port" },
                    {
                        kind: "list",
                        items: [
                            "`#` lines directly above a variable are stored as that variable's note.",
                            "`# KEY=value` lines are stored as commented-out variables.",
                            "Inline comments after a value (`PORT=3000 # web port`) are added to the note.",
                        ],
                    },
                ],
            },
        ],
    },
    {
        title: "Workspaces & teams",
        sections: [
            {
                id: "workspaces",
                title: "Workspaces",
                blocks: [
                    { kind: "text", text: "Manage workspaces without opening the browser. Commands use the same permissions as the web app." },
                    { kind: "code", code: "eit workspace list\neit workspace show Acme\neit workspace create \"Acme\"\neit workspace rename Acme \"Acme Inc\"\neit workspace delete Acme" },
                ],
            },
            {
                id: "projects",
                title: "Projects",
                blocks: [
                    { kind: "text", text: "New projects get an env file for each environment you pass (or the defaults)." },
                    { kind: "code", code: "eit project list --workspace Acme\neit project create api --workspace Acme --environments production,development\neit project show api\neit project rename api backend\neit project delete backend" },
                ],
            },
            {
                id: "env-files",
                title: "Env files",
                blocks: [
                    { kind: "code", code: "eit env list --project api\neit env create .env.staging --environment staging --project api\neit env rename .env.staging .env.stage --project api\neit env delete .env.stage --project api" },
                    { kind: "text", text: "Environment types: production, staging, beta, development, qa, testing, uat, sandbox, preview, demo, canary, local." },
                ],
            },
            {
                id: "members",
                title: "Members and invites",
                blocks: [
                    { kind: "code", code: "eit member list --workspace Acme\neit member invite dev@acme.dev --role member --projects api --project-role contributor\neit member update dev@acme.dev --role admin\neit member remove dev@acme.dev\neit invite revoke dev@acme.dev" },
                    {
                        kind: "list",
                        items: [
                            "`--role` is `member` (default) or `admin`. Admins get every project.",
                            "Without `--projects`, members get every project at `--project-role` (default `viewer`).",
                            "`member list` also shows pending invites.",
                        ],
                    },
                ],
            },
            {
                id: "history",
                title: "History",
                blocks: [
                    { kind: "text", text: "See who changed what. CLI actions are labelled \"via CLI\"." },
                    { kind: "code", code: "eit history --workspace Acme\neit history --search DATABASE_URL --limit 50" },
                ],
            },
            {
                id: "context",
                title: "Workspace and project defaults",
                blocks: [
                    { kind: "text", text: "`--workspace` and `--project` accept a name or id. When you leave them out, commands use the folder linked with `eit link`, or your only workspace or project." },
                    { kind: "note", text: "Deletes and removals ask for confirmation. In scripts, pass `--yes`." },
                ],
            },
        ],
    },
    {
        title: "Reference",
        sections: [
            {
                id: "commands",
                title: "Commands",
                blocks: [
                    {
                        kind: "table",
                        headers: ["Command", "Description"],
                        rows: [
                            ["eit login [--api-url <url>] [--no-browser]", "Sign in and approve this device."],
                            ["eit logout [--local]", "Revoke this device and remove local credentials."],
                            ["eit status", "Show account, session expiry and folder link."],
                            ["eit link [--workspace] [--project] [--env]", "Link the current folder to an env file."],
                            ["eit unlink", "Remove the folder link."],
                            ["eit list", "List workspaces, projects and env files."],
                            ["eit pull [--env] [-o <file>] [--force]", "Download variables into a file."],
                            ["eit push [--env] [-f <file>] [--yes]", "Replace the env file with a local file."],
                            ["eit run [--env] -- <command>", "Run a command with variables injected."],
                            ["eit workspace <list|show|create|rename|delete>", "Manage workspaces."],
                            ["eit project <list|show|create|rename|delete>", "Manage projects in a workspace."],
                            ["eit env <list|create|rename|delete>", "Manage env files in a project."],
                            ["eit member <list|invite|update|remove>", "Manage workspace members."],
                            ["eit invite revoke <email>", "Cancel a pending invite."],
                            ["eit history [--search] [--limit]", "Show workspace activity."],
                        ],
                    },
                ],
            },
            {
                id: "environment-variables",
                title: "Environment variables",
                blocks: [
                    {
                        kind: "table",
                        headers: ["Variable", "Purpose"],
                        rows: [
                            ["EIT_API_URL", "Env Garden URL, for self-hosted instances."],
                            ["EIT_TOKEN_NAME", "Device name shown on the approval screen and in Settings."],
                            ["EIT_CONFIG_DIR", "Where credentials are stored."],
                        ],
                    },
                ],
            },
            {
                id: "ci",
                title: "Scripts and CI",
                blocks: [
                    { kind: "text", text: "When there's no terminal to answer prompts, pass the flags that skip them. Commands fail instead of waiting for input." },
                    { kind: "code", code: "eit link --workspace Acme --project api --env production\neit pull --force\neit push --yes" },
                ],
            },
            {
                id: "troubleshooting",
                title: "Troubleshooting",
                blocks: [
                    {
                        kind: "table",
                        headers: ["Message", "What to do"],
                        rows: [
                            ["Your session has expired or was revoked", "Run `eit login` again."],
                            ["This folder isn't linked to an env file", "Run `eit link` in the project folder."],
                            [".env already exists", "Confirm the prompt, or pass `--force`."],
                            ["You do not have access to edit this env file", "Ask a workspace admin for edit access to that environment."],
                            ["Could not connect to Env Garden", "Check your connection, or `--api-url` for self-hosted instances."],
                        ],
                    },
                ],
            },
        ],
    },
];
