import { NextResponse } from "next/server";
import { adminUnauthorized, requireAdminCookie } from "@/lib/admin-api";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  if (!(await requireAdminCookie())) return adminUnauthorized();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const company_name = typeof body.company_name === "string" ? body.company_name.trim() : "";
  if (!company_name) {
    return NextResponse.json({ error: "company_name required" }, { status: 400 });
  }

  const logo_url = typeof body.logo_url === "string" ? body.logo_url.trim() || null : null;
  const note = typeof body.note === "string" ? body.note.trim() || null : null;
  const is_published = body.is_published === false ? false : true;
  const sort_order = Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0;

  const admin = createSupabaseServiceClient();
  const { data, error } = await admin
    .from("partners")
    .insert({ company_name, logo_url, note, is_published, sort_order })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ partner: data });
}
