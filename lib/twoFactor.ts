import sql from "mssql";
import { timingSafeEqual } from "crypto";
import { connectToDatabase } from "./db";
import type { SessionUser } from "./session";

// Guesses allowed per code before it is burned
export const MAX_2FA_ATTEMPTS = 5;
// Codes that can be sent to one email per rolling hour
export const MAX_2FA_CODES_PER_HOUR = 5;

type VerifyResult = { ok: true; user: SessionUser } | { ok: false; error: string };

function codesMatch(expected: string, provided: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Checks a code against the latest active code for this email.
// Every call counts as an attempt; the increment is a single atomic UPDATE
// so parallel guesses cannot exceed MAX_2FA_ATTEMPTS.
export async function verifyTwoFactorCode(
  email: string,
  code: string
): Promise<VerifyResult> {
  const pool = await connectToDatabase();

  const attempt = await pool
    .request()
    .input("email", sql.NVarChar, email)
    .input("max", sql.Int, MAX_2FA_ATTEMPTS).query(`
      WITH latest AS (
        SELECT TOP 1 *
        FROM TwoFactorAuth
        WHERE email = @email
          AND used = 0
          AND expiresAt > GETDATE()
        ORDER BY id DESC
      )
      UPDATE latest
      SET attempts = attempts + 1
      OUTPUT inserted.id, inserted.userId, inserted.code, inserted.attempts
      WHERE attempts < @max
    `);

  const record = attempt.recordset[0];
  if (!record) {
    return { ok: false, error: "Invalid or expired code. Please request a new code." };
  }

  if (!codesMatch(String(record.code), code)) {
    const remaining = MAX_2FA_ATTEMPTS - record.attempts;

    if (remaining <= 0) {
      await pool
        .request()
        .input("id", sql.Int, record.id)
        .query("UPDATE TwoFactorAuth SET used = 1 WHERE id = @id");
      return { ok: false, error: "Too many attempts. Please request a new code." };
    }

    return {
      ok: false,
      error: `Invalid code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
    };
  }

  // Consume the code; the used = 0 guard stops two parallel requests both succeeding
  const consumed = await pool
    .request()
    .input("id", sql.Int, record.id)
    .query("UPDATE TwoFactorAuth SET used = 1 WHERE id = @id AND used = 0");

  if (consumed.rowsAffected[0] !== 1) {
    return { ok: false, error: "Invalid or expired code. Please request a new code." };
  }

  const userResult = await pool
    .request()
    .input("userId", sql.Int, record.userId)
    .query("SELECT id, name, email, role FROM Users WHERE id = @userId");

  const user = userResult.recordset[0];
  if (!user) {
    return { ok: false, error: "User not found" };
  }

  return { ok: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
}

// Codes expire 10 minutes after they are sent, so a code sent within the
// last hour has expiresAt later than (now - 50 minutes)
export async function countRecentTwoFactorCodes(email: string): Promise<number> {
  const pool = await connectToDatabase();
  const result = await pool
    .request()
    .input("email", sql.NVarChar, email)
    .query(`
      SELECT COUNT(*) AS sent
      FROM TwoFactorAuth
      WHERE email = @email
        AND expiresAt > DATEADD(MINUTE, -50, GETDATE())
    `);
  return result.recordset[0].sent;
}

// Burn any outstanding codes so only the newest one can be used
export async function invalidateTwoFactorCodes(email: string): Promise<void> {
  const pool = await connectToDatabase();
  await pool
    .request()
    .input("email", sql.NVarChar, email)
    .query("UPDATE TwoFactorAuth SET used = 1 WHERE email = @email AND used = 0");
}
