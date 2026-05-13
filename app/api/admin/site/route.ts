import { NextResponse } from "next/server";
import { adminUnauthorized, requireAdminCookie } from "@/lib/admin-api";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

const stringOrNull = (v: unknown) => (typeof v === "string" ? v.trim() || null : undefined);

export async function PATCH(req: Request) {
  if (!(await requireAdminCookie())) return adminUnauthorized();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  const fields = [
    "business_name",
    "tagline",
    "about",
    "address_line",
    "maps_url",
    "phone",
    "email",
    "hours",
    "hero_image_url",
    "coffee_partner_title",
    "coffee_partner_body",
    "instagram_url",
  ] as const;

  for (const key of fields) {
    if (!(key in body)) continue;
    if (key === "business_name") {
      const v = typeof body.business_name === "string" ? body.business_name.trim() : "";
      if (v) patch.business_name = v;
      continue;
    }
    const val = stringOrNull(body[key]);
    if (val !== undefined) patch[key] = val;
  }

  const admin = createSupabaseServiceClient();
  const { data, error } = await admin.from("site_settings").update(patch).eq("id", 1).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}
