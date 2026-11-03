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

