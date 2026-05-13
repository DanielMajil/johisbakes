import type { MenuGroup } from "@/lib/menu-groups";

export type MenuCategory = {
  id: string;
  menu_group: MenuGroup;
  name: string;
  sort_order: number;
};

export type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  /** Legacy free-text label; prefer category_id + category_name. */
  category: string | null;
  menu_group: MenuGroup;
  category_id: string | null;
  /** Filled by the server when loading the public menu (from menu_categories). */
  category_name?: string | null;
  image_url: string | null;
  is_available: boolean;
  sort_order: number;
};

export type Review = {
  id: string;
  customer_name: string;
  quote: string;
  photo_url: string | null;
  is_published: boolean;
  sort_order: number;
};

export type Partner = {
  id: string;
  company_name: string;
  logo_url: string | null;
  note: string | null;
  is_published: boolean;
  sort_order: number;
};

export type SiteSettings = {
  id: number;
  business_name: string;
  tagline: string | null;
  about: string | null;
  address_line: string | null;
  maps_url: string | null;
  phone: string | null;
  email: string | null;
  hours: string | null;
  hero_image_url: string | null;
  coffee_partner_title: string | null;
  coffee_partner_body: string | null;
  instagram_url: string | null;
};
