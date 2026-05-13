import Image from "next/image";
import { CopyMenuUrlButton } from "@/components/CopyMenuUrlButton";
import { MenuBoard } from "@/components/MenuBoard";
import { PartnersSection, ReviewsSection, VisitSection } from "@/components/MarketingSections";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { loadPublicSite } from "@/lib/public-site";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { menu, reviews, partners, settings, error } = await loadPublicSite();

  return (
    <>
      <SiteHeader settings={settings} />
      <main className="mx-auto max-w-3xl space-y-14 px-4 pb-16 pt-6">
        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-semibold">Site database isn’t connected yet</p>
            <p className="mt-1 text-amber-900/80">
              Add your Supabase keys to <code className="rounded bg-white/60 px-1">.env.local</code> and run{" "}
              <code className="rounded bg-white/60 px-1">supabase/schema.sql</code>. ({error})
            </p>
          </div>
        ) : null}

        <section className="overflow-hidden rounded-3xl border border-cocoa/10 bg-gradient-to-br from-white to-honey/15 shadow-sm">
          <div className="grid gap-0 sm:grid-cols-5">
            <div className="relative aspect-[4/3] sm:col-span-2 sm:aspect-auto sm:min-h-[220px]">
              {settings?.hero_image_url ? (
                <Image
                  src={settings.hero_image_url}
                  alt=""
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 40vw"
                />
              ) : (
                <div className="flex h-full min-h-[200px] items-center justify-center bg-cocoa/5 font-display text-5xl text-terracotta/80">
                  JB
                </div>
              )}
            </div>
            <div className="space-y-4 p-6 sm:col-span-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-terracotta">Johis Bakes</p>
              <h1 className="font-display text-3xl leading-tight text-cocoa sm:text-4xl">
                {settings?.tagline ?? "Frapes, drinks & baked goods made for your day."}
              </h1>
              <p className="text-sm leading-relaxed text-cocoa/75">
                {settings?.about?.trim()
                  ? settings.about
                  : "Browse our story, see happy customers, and check the live menu for what’s available right now — including sold‑out items."}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href="#menu"
                  className="inline-flex items-center justify-center rounded-full bg-terracotta px-4 py-2 text-sm font-semibold text-white shadow-sm"
                >
                  Jump to live menu
                </a>
                <CopyMenuUrlButton />
              </div>
            </div>
          </div>
        </section>

        <MenuBoard items={menu} heading="Live menu & prices" />

        <ReviewsSection reviews={reviews} />
        <PartnersSection settings={settings} partners={partners} />
        <VisitSection settings={settings} />
      </main>
      <SiteFooter settings={settings} />
    </>
  );
}
