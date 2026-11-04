import { NextResponse } from "next/server";
import {
  getSession,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
  checkOrigin,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // CSRF defense: Origin must match request host or Sec-Fetch-Site must be same-origin
  if (!checkOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Defense in depth: Verify session independently
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  const cookieOptions = getSessionCookieOptions();

  response.cookies.set({
    ...cookieOptions,
    name: SESSION_COOKIE_NAME,
    value: "",
    maxAge: 0,
  });

  return response;
}

