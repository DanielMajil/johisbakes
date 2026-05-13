import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { adminUnauthorized, requireAdminCookie } from "@/lib/admin-api";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!(await requireAdminCookie())) return adminUnauthorized();

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  if (file.size > 6 * 1024 * 1024) {
    return NextResponse.json({ error: "Max file size is 6MB" }, { status: 400 });
  }

  const admin = createSupabaseServiceClient();
  const ext = (() => {
    const n = file.name || "upload";
    const i = n.lastIndexOf(".");
    return i >= 0 ? n.slice(i + 1).toLowerCase() : "jpg";
  })();

  const path = `uploads/${randomUUID()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error } = await admin.storage.from("media").upload(path, buf, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: pub } = admin.storage.from("media").getPublicUrl(path);
  return NextResponse.json({ url: pub.publicUrl });
}
