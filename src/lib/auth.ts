import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./prisma";

const SESSION_COOKIE = "digisub_session";

function getJwtSecret(): Uint8Array {
  const secret =
    process.env.JWT_SECRET ?? "digisub-fallback-dev-secret-do-not-use-in-prod";
  return new TextEncoder().encode(secret);
}

export function normalizeIranPhone(input: string): string | null {
  const cleaned = input
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[\s\-().+]/g, "");

  if (cleaned.startsWith("989") && cleaned.length === 12) {
    return `0${cleaned.slice(2)}`;
  }
  if (cleaned.startsWith("00989") && cleaned.length === 14) {
    return `0${cleaned.slice(4)}`;
  }
  if (cleaned.startsWith("9") && cleaned.length === 10) {
    return `0${cleaned}`;
  }
  if (/^09\d{9}$/.test(cleaned)) {
    return cleaned;
  }
  return null;
}

export function generateReferralCode(phone: string): string {
  const suffix = phone.slice(-4);
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `DS${suffix}${rand}`;
}

export interface SessionPayload {
  userId: string;
  role: string;
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ userId: payload.userId, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getJwtSecret());
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (typeof payload.userId !== "string" || typeof payload.role !== "string") {
      return null;
    }
    return { userId: payload.userId, role: payload.role };
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await signSessionToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await verifySessionToken(token);
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      phone: true,
      name: true,
      email: true,
      role: true,
      status: true,
      walletBalance: true,
      loyaltyPoints: true,
      totalSpent: true,
      referralCode: true,
      preferredLocale: true,
      tagsJson: true,
      lastPurchaseAt: true,
      createdAt: true,
    },
  });

  if (!user || user.status !== "ACTIVE") return null;
  return user;
}

export async function getUserTier(loyaltyPoints: number) {
  const tiers = await prisma.loyaltyTier.findMany({
    orderBy: { minPoints: "desc" },
  });
  return (
    tiers.find((t) => loyaltyPoints >= t.minPoints) ??
    tiers[tiers.length - 1] ??
    null
  );
}
