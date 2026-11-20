import { APP_REPOSITORY_URL } from "@/constants/app";
import { CLI_DOCS_PATH, SIGN_IN_PATH } from "@/constants/routes";
import type {
    LandingFaq,
    LandingFeature,
    LandingLink,
    LandingPreviewRow,
    LandingTermDetail,
} from "@/types/landing";

export const LANDING_AUTHOR_NAME = "Harsh Govind";
export const LANDING_AUTHOR_URL = "https://github.com/harsh-govind";

export const LANDING_NAV_LINKS: LandingLink[] = [
    { label: "Product", href: "#product" },
    { label: "Security", href: "#security" },
    { label: "CLI", href: "#cli" },
    { label: "FAQ", href: "#faq" },
    { label: "Docs", href: CLI_DOCS_PATH },
];

export const LANDING_PREVIEW_PROJECTS = ["api", "web", "worker", "analytics"];

export const LANDING_PREVIEW_ENVIRONMENTS = ["development", "preview", "production"];

export const LANDING_PREVIEW_ACTIVE_ENVIRONMENT = "production";

export const LANDING_PREVIEW_ROWS: LandingPreviewRow[] = [
    { key: "DATABASE_URL", value: "postgres://app:••••••••@db.internal:5432/main", by: "HG", when: "2h ago" },
    { key: "STRIPE_SECRET_KEY", value: "sk_live_••••••••••••••••••••", by: "AK", when: "Yesterday" },
    { key: "RESEND_API_KEY", value: "re_••••••••••••••••", by: "MR", when: "3d ago" },
    { key: "NEXTAUTH_SECRET", value: "••••••••••••••••••••••••", by: "HG", when: "1w ago" },
    { key: "REDIS_URL", value: "rediss://default:••••••••@cache:6379", by: "AK", when: "2w ago" },
];

export const LANDING_STATS: LandingTermDetail[] = [
    { term: "End-to-end", detail: "Encryption" },
    { term: "Per environment", detail: "Key isolation" },
    { term: "MIT", detail: "License" },
    { term: "100%", detail: "Open source" },
];

export const LANDING_FEATURES: LandingFeature[] = [
    {
        label: "01 · Encryption",
        title: "Encrypted before it leaves your device.",
        body: "Values are encrypted in your browser and CLI with a key per environment. The server, and anyone who breaches it, only ever sees ciphertext.",
        visual: "cipher",
    },
    {
        label: "02 · Access",
        title: "The right people, nobody else.",
        body: "Only people an environment's key is shared with can read it. Owners manage access, but even they can't read an environment nobody shared with them.",
        visual: "access",
    },
    {
        label: "03 · History",
        title: "Know what changed, and who.",
        body: "Every add, update and removal is recorded, so environment drift stops being a mystery.",
        visual: "history",
    },
];

export const LANDING_CIPHER_SAMPLE = {
    key: "STRIPE_SECRET_KEY",
    ciphertext: "a3f9·1c0e·77b2·e94d·0f1a·c6b8·52de·9a07·b13f·e8c4",
};

export const LANDING_ACCESS_SAMPLE: LandingTermDetail[] = [
    { term: "harsh@acme.dev", detail: "Owner" },
    { term: "anya@acme.dev", detail: "Editor" },
    { term: "max@acme.dev", detail: "Viewer" },
];

export const LANDING_HISTORY_SAMPLE = [
    { action: "Updated", key: "DATABASE_URL", when: "2h" },
    { action: "Added", key: "REDIS_URL", when: "1d" },
    { action: "Removed", key: "LEGACY_TOKEN", when: "4d" },
];

export const LANDING_SECURITY_SPECS: LandingTermDetail[] = [
    { term: "Encryption", detail: "End-to-end, in the browser and CLI" },
    { term: "Ciphers", detail: "XChaCha20-Poly1305, X25519, Ed25519, Argon2id" },
    { term: "Key scope", detail: "One key per environment, shared per member" },
    { term: "Recovery", detail: "24-word phrase only you hold" },
    { term: "Sign-in", detail: "Magic link, Google, GitHub" },
    { term: "Two-factor", detail: "Authenticator app with backup codes" },
    { term: "CLI sessions", detail: "Expire after 7 days, revocable anytime" },
    { term: "Disclosure", detail: "Private vulnerability reporting" },
    { term: "License", detail: "MIT" },
];

export const LANDING_FAQS: LandingFaq[] = [
    {
        question: "What is env.garden?",
        answer: "An open-source workspace for storing, managing and sharing environment variables across a team, so secrets stop living in chat threads and stale local files.",
    },
    {
        question: "How are secrets protected?",
        answer: "End-to-end. Names, values and notes are encrypted in your browser or CLI with a key per environment, and that key is shared only with the members you choose, sealed to each one's public key. env.garden stores ciphertext it cannot decrypt.",
    },
    {
        question: "Is it open source?",
        answer: "Yes. The full source is public on GitHub under the MIT license. Issues, ideas and pull requests are welcome.",
    },
    {
        question: "Is there a CLI?",
        answer: "Yes. Run `npx @env-garden/cli login`, approve the device in your browser, then pull, push and run with your variables, or manage workspaces, projects, members and history from the terminal. Sessions last 7 days and can be revoked in Settings.",
    },
    {
        question: "Does it support two-factor authentication?",
        answer: "Yes. Turn on an authenticator app in Settings → Security. Every sign-in, including magic links and Google or GitHub, then asks for a code, and you get backup codes in case you lose your device.",
    },
    {
        question: "How do I report a vulnerability?",
        answer: "Privately, through GitHub security advisories on the env-garden repository. Please don\'t open a public issue with exploit details. See SECURITY.md for the full policy.",
    },
];

export const LANDING_FOOTER_PRODUCT_LINKS: LandingLink[] = [
    { label: "Overview", href: "#product" },
    { label: "Security", href: "#security" },
    { label: "CLI", href: "#cli" },
    { label: "CLI docs", href: CLI_DOCS_PATH, isInternal: true },
];

export const LANDING_FOOTER_PROJECT_LINKS: LandingLink[] = [
    { label: "GitHub", href: APP_REPOSITORY_URL },
    { label: "Sign in", href: SIGN_IN_PATH, isInternal: true },
    { label: "FAQ", href: "#faq" },
];
