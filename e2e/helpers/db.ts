import { Client } from "pg";
import { config as loadEnv } from "dotenv";

loadEnv();

export function hasDatabaseUrl(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.length > 0);
}

async function withDb<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for invitation E2E helpers.");
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

export type ResetTokenRecord = {
  token: string;
  expiresAt: Date;
};

/**
 * Read the latest Better Auth password-reset token for an email.
 * Identifier format: `reset-password:{token}` (token is the path/query segment).
 */
export async function findLatestPasswordResetToken(
  email: string,
): Promise<ResetTokenRecord | null> {
  return withDb(async (client) => {
    const result = await client.query<{
      identifier: string;
      expiresAt: Date;
    }>(
      `SELECT v.identifier, v."expiresAt"
       FROM verification v
       INNER JOIN "user" u ON u.id = v.value
       WHERE lower(u.email) = lower($1)
         AND v.identifier LIKE 'reset-password:%'
       ORDER BY COALESCE(v."createdAt", v."expiresAt") DESC
       LIMIT 1`,
      [email.trim()],
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      token: row.identifier.replace(/^reset-password:/, ""),
      expiresAt: row.expiresAt,
    };
  });
}

export async function waitForPasswordResetToken(
  email: string,
  options?: { timeoutMs?: number; intervalMs?: number },
): Promise<ResetTokenRecord> {
  const timeoutMs = options?.timeoutMs ?? 15_000;
  const intervalMs = options?.intervalMs ?? 250;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const found = await findLatestPasswordResetToken(email);
    if (found) {
      return found;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Timed out waiting for reset token for ${email}`);
}

export async function expirePasswordResetToken(token: string): Promise<void> {
  await withDb(async (client) => {
    await client.query(
      `UPDATE verification
       SET "expiresAt" = NOW() - INTERVAL '1 hour'
       WHERE identifier = $1`,
      [`reset-password:${token}`],
    );
  });
}

export async function getAuthUserEmailVerified(email: string): Promise<boolean | null> {
  return withDb(async (client) => {
    const result = await client.query<{ emailVerified: boolean }>(
      `SELECT "emailVerified" FROM "user" WHERE lower(email) = lower($1) LIMIT 1`,
      [email.trim()],
    );
    return result.rows[0]?.emailVerified ?? null;
  });
}

/** Remove invitee Auth + ERP rows created by invitation E2E (best-effort). */
export async function deleteUserByEmail(email: string): Promise<void> {
  await withDb(async (client) => {
    const normalized = email.trim().toLowerCase();

    await client.query(
      `UPDATE users SET "authUserId" = NULL WHERE lower(email) = $1`,
      [normalized],
    );
    await client.query(
      `UPDATE "user" SET "erpUserId" = NULL WHERE lower(email) = $1`,
      [normalized],
    );
    await client.query(
      `DELETE FROM verification
       WHERE value IN (SELECT id FROM "user" WHERE lower(email) = $1)`,
      [normalized],
    );
    await client.query(`DELETE FROM "user" WHERE lower(email) = $1`, [normalized]);
    await client.query(`DELETE FROM users WHERE lower(email) = $1`, [normalized]);
  });
}
