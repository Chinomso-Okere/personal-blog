import { cookies } from "next/headers";
import {
  verifySession,
  SESSION_MAX_AGE_SECONDS,
  type SessionPayload,
} from "./session";

export const SESSION_COOKIE_NAME = "admin_session";

export function getSessionCookieOptions() {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    sameSite: "strict" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === "production",
  };
}

/**
 * Retrieves and validates the current session from incoming cookies.
 * Fail closed: if SESSION_SECRET is unset or invalid, always returns null.
 * Usable in Server Components, Layouts, and Route Handlers.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    return null;
  }

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      return null;
    }

    return await verifySession(token, secret);
  } catch {
    return null;
  }
}

/**
 * CSRF defense: Origin header must match host / x-forwarded-host.
 * If Origin is absent, Sec-Fetch-Site must be "same-origin".
 */
export function checkOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      const host = request.headers.get("host");
      const forwardedHost = request.headers.get("x-forwarded-host");
      return (
        originHost === host ||
        (forwardedHost !== null && originHost === forwardedHost)
      );
    } catch {
      return false;
    }
  }

  const secFetchSite = request.headers.get("sec-fetch-site");
  return secFetchSite === "same-origin";
}

