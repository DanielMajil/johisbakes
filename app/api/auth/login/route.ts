import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminCookieName, signAdminJwt } from "@/lib/auth-session";

function sha256Utf8(value: string) {
  return createHash("sha256").update(value, "utf8").digest();
}

export async function POST(req: Request) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || expected.length < 8) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD is not set (min 8 characters)." },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const password =
    typeof body === "object" && body !== null && "password" in body
      ? String((body as { password: unknown }).password)
      : "";

  const a = sha256Utf8(password);
  const b = sha256Utf8(expected);
  if (!timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const token = await signAdminJwt();
  const jar = await cookies();
  jar.set(adminCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 14,
    path: "/",
  });

  return NextResponse.json({ ok: true });
}
