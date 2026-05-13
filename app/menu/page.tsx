import type { Metadata } from "next";
import { MenuBoard } from "@/components/MenuBoard";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { loadPublicSite } from "@/lib/public-site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live menu — Johis Bakes",
  description: "Current prices and availability for Johis Bakes.",
};

export default async function MenuPage() {
  const { menu, settings, error } = await loadPublicSite();

  return (
    <>
      <SiteHeader settings={settings} />
      <main className="mx-auto max-w-3xl space-y-6 px-4 pb-16 pt-6">
        <div>
          <h1 className="font-display text-3xl text-cocoa">Today’s menu</h1>
          <p className="mt-1 text-sm text-cocoa/65">
            Share this page: it always reflects live availability from the shop.
          </p>
        </div>
        {error ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            Connect Supabase to show the menu. ({error})
          </p>
        ) : null}
        <MenuBoard items={menu} heading="Items & status" />
      </main>
      <SiteFooter settings={settings} />
    </>
  );
}
