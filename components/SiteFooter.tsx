import Link from "next/link";
import type { SiteSettings } from "@/lib/types";

export function SiteFooter({ settings }: { settings: SiteSettings | null }) {
  const year = new Date().getFullYear();
  const ig = settings?.instagram_url?.trim();
  return (
    <footer className="mt-16 border-t border-cocoa/10 bg-cocoa text-cream">
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-sm">
        <p className="font-display text-xl">{settings?.business_name ?? "Johis Bakes"}</p>
        <p className="text-cream/80">{settings?.tagline ?? "Frapes, drinks & baked goods"}</p>
        <div className="flex flex-wrap gap-3 text-cream/90">
          {settings?.phone ? <span>{settings.phone}</span> : null}
          {settings?.email ? (
            <a className="underline decoration-cream/40" href={`mailto:${settings.email}`}>
              {settings.email}
            </a>
          ) : null}
          {ig ? (
            <a className="underline decoration-cream/40" href={ig} target="_blank" rel="noreferrer">
              Instagram
            </a>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-4 pt-2">
          <Link href="/menu" className="text-cream underline decoration-cream/40">
            Shareable menu
          </Link>
          <Link href="/admin/login" className="text-cream/60">
            Admin
          </Link>
        </div>
        <p className="text-xs text-cream/50">© {year} {settings?.business_name ?? "Johis Bakes"}</p>
      </div>
    </footer>
  );
}
