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

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const price_cents = Number(body.price_cents);
  if (!name || !Number.isFinite(price_cents) || price_cents < 0) {
    return NextResponse.json({ error: "name and valid price_cents required" }, { status: 400 });
  }

  const description =
    typeof body.description === "string" ? body.description.trim() : null;
  const category = typeof body.category === "string" ? body.category.trim() || null : null;
  const image_url = typeof body.image_url === "string" ? body.image_url.trim() || null : null;
  const is_available = body.is_available === false ? false : true;
  const sort_order = Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0;

  const admin = createSupabaseServiceClient();
  const { data, error } = await admin
    .from("menu_items")
    .insert({
      name,
      description,
      price_cents,
      category,
      image_url,
      is_available,
      sort_order,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ item: data });
}
