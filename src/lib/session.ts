import "server-only";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken, type Session } from "@/lib/auth";

/** Validate an email + password against the configured admin credentials. */
export async function verifyCredentials(email: string, password: string): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL;

  // TEMP login diagnostic — secret-safe (no email/password/hash values, only
  // presence flags, the match result, and lengths). REMOVE after debugging.
  const _plainEnv = process.env.ADMIN_PASSWORD;
  console.log(
    "[login-diag] adminEmailSet=%s emailMatch=%s adminEmailLen=%s emailLen=%s hashSet=%s plainSet=%s plainLen=%s pwLen=%s",
    Boolean(adminEmail),
    adminEmail ? email.trim().toLowerCase() === adminEmail.trim().toLowerCase() : false,
    adminEmail ? adminEmail.trim().length : 0,
    email.trim().length,
    Boolean(process.env.ADMIN_PASSWORD_HASH),
    Boolean(_plainEnv),
    _plainEnv ? _plainEnv.length : 0,
    password.length,
  );

  if (!adminEmail || email.trim().toLowerCase() !== adminEmail.trim().toLowerCase()) {
    return false;
  }

  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (hash && hash.length > 0) {
    return bcrypt.compare(password, hash);
  }

  // Dev fallback: plaintext password (never use in production).
  const plain = process.env.ADMIN_PASSWORD;
  if (plain && plain.length > 0) {
    return password === plain;
  }

  return false;
}

/** Read the current session from cookies, or null. */
export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

/** Require a session for a server component / action; redirect to /login otherwise. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
