export type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  category: string | null;
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
