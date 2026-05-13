import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminCookieName, verifyAdminJwt } from "@/lib/auth-session";

export async function requireAdminCookie() {
  const token = (await cookies()).get(adminCookieName)?.value;
  if (!token) return false;
  return verifyAdminJwt(token);
}

export async function adminUnauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
