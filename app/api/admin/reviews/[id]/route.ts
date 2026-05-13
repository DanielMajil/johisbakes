import { NextResponse } from "next/server";
import { adminUnauthorized, requireAdminCookie } from "@/lib/admin-api";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  if (!(await requireAdminCookie())) return adminUnauthorized();
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.customer_name === "string") patch.customer_name = body.customer_name.trim();
  if (typeof body.quote === "string") patch.quote = body.quote.trim();
  if ("photo_url" in body) {
    if (body.photo_url === null) patch.photo_url = null;
    else if (typeof body.photo_url === "string") patch.photo_url = body.photo_url.trim() || null;
  }
  if (typeof body.sort_order === "number" && Number.isFinite(body.sort_order)) {
    patch.sort_order = body.sort_order;
  }
  if (typeof body.is_published === "boolean") patch.is_published = body.is_published;

  const admin = createSupabaseServiceClient();
  const { data, error } = await admin.from("reviews").update(patch).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ review: data });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  if (!(await requireAdminCookie())) return adminUnauthorized();
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const admin = createSupabaseServiceClient();
  const { error } = await admin.from("reviews").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
