import Image from "next/image";
import Link from "next/link";
import type { SiteSettings } from "@/lib/types";

export function SiteHeader({ settings }: { settings: SiteSettings | null }) {
  const name = settings?.business_name ?? "Johis Bakes";
  return (
    <header className="sticky top-0 z-40 border-b border-cocoa/10 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="relative h-10 w-10 overflow-hidden rounded-full border border-cocoa/15 bg-honey/30">
            {settings?.hero_image_url ? (
              <Image
                src={settings.hero_image_url}
                alt=""
                fill
                className="object-cover"
                sizes="40px"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center font-display text-lg text-terracotta">
                J
              </span>
            )}
          </div>
          <div className="leading-tight">
            <p className="font-display text-lg tracking-tight text-cocoa">{name}</p>
            <p className="text-xs text-cocoa/60">Frapes · Drinks · Bakes</p>
          </div>
        </Link>
        <nav className="flex items-center gap-2 text-sm font-medium">
          <Link
            href="/menu"
            className="rounded-full bg-terracotta px-3 py-1.5 text-white shadow-sm active:scale-[0.98]"
          >
            Live menu
          </Link>
        </nav>
      </div>
    </header>
  );
}
