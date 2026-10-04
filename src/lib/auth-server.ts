// Server-side helpers: verify a Firebase ID token and check the email against
// the AllowedUser table. All allowed accounts share the same dataset (rows are
// keyed by NEXT_PUBLIC_ALLOWED_EMAIL, the "data owner").
import { prisma } from "@/lib/prisma";

const OWNER_EMAIL = (process.env.NEXT_PUBLIC_ALLOWED_EMAIL || "").trim().toLowerCase();

export function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

// Uses Firebase's REST lookup so no service-account credentials are needed.
export async function verifyIdToken(request: Request): Promise<string | null> {
  const header = request.headers.get("authorization") ?? "";
  const idToken = header.startsWith("Bearer ") ? header.slice(7) : "";
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!idToken || !apiKey) return null;

  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const user = data?.users?.[0];
    if (!user?.email || user.emailVerified === false) return null;
    return normalizeEmail(user.email);
  } catch {
    return null;
  }
}

export async function isAllowedEmail(email: string): Promise<boolean> {
  try {
    if ((await prisma.allowedUser.count()) === 0) {
      // First run: seed the table with the original single allowed account.
      if (OWNER_EMAIL && email === OWNER_EMAIL) {
        await prisma.allowedUser.upsert({ where: { email }, update: {}, create: { email, addedBy: "bootstrap" } });
        return true;
      }
      return false;
    }
    return (await prisma.allowedUser.findUnique({ where: { email } })) !== null;
  } catch {
    // Table missing / DB error: fall back to the original env allowlist.
    return Boolean(OWNER_EMAIL) && email === OWNER_EMAIL;
  }
}

// Returns the verified, allowed email or null.
export async function requireAllowedUser(request: Request): Promise<string | null> {
  const email = await verifyIdToken(request);
  if (!email) return null;
  return (await isAllowedEmail(email)) ? email : null;
}
