/** Postgres connections per server process (Neon's pooled endpoint handles more). */
export const DATABASE_POOL_MAX = 20;
/** How long a transaction may wait for a free connection before failing. */
export const TRANSACTION_MAX_WAIT_MS = 10_000;
/** How long a transaction may run. */
export const TRANSACTION_TIMEOUT_MS = 15_000;
