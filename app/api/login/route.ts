import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { signSession } from "@/lib/session";
import { getSessionCookieOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Best-effort in-memory rate limiter.
 * Note: In a serverless environment (such as Vercel), serverless functions
 * spin up, shut down, and do not share in-memory state across instances.
 * This provides local rate limiting against rapid brute-force requests,
 * but is best-effort only.
 */
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const failedAttempts = new Map<string, RateLimitRecord>();
const RATE_LIMIT_MAX_FAILED = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "unknown-ip";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = failedAttempts.get(ip);
  if (!record) {
    return false;
  }
  if (now > record.resetAt) {
    failedAttempts.delete(ip);
    return false;
  }
  return record.count >= RATE_LIMIT_MAX_FAILED;
}

function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const record = failedAttempts.get(ip);
  if (!record || now > record.resetAt) {
    failedAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  } else {
    record.count += 1;
  }
}

function clearRateLimit(ip: string): void {
  failedAttempts.delete(ip);
}

function checkOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      const host = request.headers.get("host");
      const forwardedHost = request.headers.get("x-forwarded-host");
      return originHost === host || (forwardedHost !== null && originHost === forwardedHost);
    } catch {
      return false;
    }
  }

  const secFetchSite = request.headers.get("sec-fetch-site");
  return secFetchSite === "same-origin";
}

export async function POST(request: Request) {
  // Basic CSRF defense: Origin must match request host or Sec-Fetch-Site must be same-origin
  if (!checkOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const clientIp = getClientIp(request);

  if (isRateLimited(clientIp)) {
    return NextResponse.json(
      { error: "Too many failed attempts. Please try again later." },
      { status: 429 }
    );
  }

  let password = "";
  try {
    const body = await request.json();
    if (typeof body.password === "string") {
      password = body.password;
    }
  } catch {
    // Malformed JSON
  }

  const hash = process.env.ADMIN_PASSWORD_HASH;
  const secret = process.env.SESSION_SECRET;

  // Fail closed: if either secret is missing or empty, fail closed with generic error.
  if (!hash || !hash.trim() || !secret || secret.length < 32) {
    console.error(
      "Admin login unavailable: ADMIN_PASSWORD_HASH or SESSION_SECRET is not set or invalid."
    );
    recordFailedAttempt(clientIp);
    await new Promise((resolve) => setTimeout(resolve, 500));
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  if (!password) {
    recordFailedAttempt(clientIp);
    await new Promise((resolve) => setTimeout(resolve, 500));
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  let isValid = false;
  try {
    isValid = await bcrypt.compare(password, hash);
  } catch {
    isValid = false;
  }

  if (!isValid) {
    recordFailedAttempt(clientIp);
    await new Promise((resolve) => setTimeout(resolve, 500));
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  clearRateLimit(clientIp);

  const token = await signSession({ admin: true }, secret);
  const cookieOptions = getSessionCookieOptions();

  const response = NextResponse.json({ success: true });
  response.cookies.set({
    ...cookieOptions,
    value: token,
  });

  return response;
}

