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

  const customer_name = typeof body.customer_name === "string" ? body.customer_name.trim() : "";
  const quote = typeof body.quote === "string" ? body.quote.trim() : "";
  if (!customer_name || !quote) {
    return NextResponse.json({ error: "customer_name and quote required" }, { status: 400 });
  }

  const photo_url = typeof body.photo_url === "string" ? body.photo_url.trim() || null : null;
  const is_published = body.is_published === false ? false : true;
  const sort_order = Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0;

  const admin = createSupabaseServiceClient();
  const { data, error } = await admin
    .from("reviews")
    .insert({ customer_name, quote, photo_url, is_published, sort_order })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ review: data });
}
