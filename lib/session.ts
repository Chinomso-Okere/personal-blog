import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export interface SessionPayload extends JWTPayload {
  admin?: boolean;
  [key: string]: unknown;
}

export const SESSION_EXPIRY = "8h";
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60; // 28,800 seconds

/**
 * Signs a session payload using HS256 with an 8-hour expiry.
 * Pure function with no next/* imports.
 */
export async function signSession(
  payload: Record<string, unknown>,
  secret: string
): Promise<string> {
  if (!secret || typeof secret !== "string" || secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters long.");
  }

  const key = new TextEncoder().encode(secret);

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_EXPIRY)
    .sign(key);
}

/**
 * Verifies a session token using HS256.
 * Rejects tampered, expired, wrong-secret, and wrong-algorithm tokens.
 * Pure function with no next/* imports.
 */
export async function verifySession(
  token: string,
  secret: string
): Promise<SessionPayload | null> {
  if (
    !token ||
    typeof token !== "string" ||
    !secret ||
    typeof secret !== "string" ||
    secret.length < 32
  ) {
    return null;
  }

  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });

    if (payload.admin !== true) {
      return null;
    }

    return payload as SessionPayload;
  } catch {
    return null;
  }
}

