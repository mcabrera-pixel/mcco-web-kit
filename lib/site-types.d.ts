export interface SiteConfig {
  schema: number;
  key: string;
  name: string;
  domain: string;
  lang: string;
  locales: string[];
  tagline?: string;
  description: string;
  role: 'escaneo' | 'drones' | 'gemelos' | 'corporativa' | string;
  cloudflare: { project: string; zone_checklist_done?: boolean };
  analytics: { ga4?: string; ads?: string; cf_beacon_token?: string };
  contact: { whatsapp?: string; phone?: string; email?: string; turnstile_sitekey?: string; response_sla?: string };
  content: { blog_dir: string; cadence?: string; author?: { name: string; role: string } };
  seo: { og_image?: string; logo?: string; sameAs?: string[]; twitter?: string };
  csp: {
    script_src?: string[]; style_src?: string[]; font_src?: string[]; img_src?: string[];
    media_src?: string[]; connect_src?: string[]; frame_src?: string[]; unsafe_eval?: boolean;
  };
  redirects?: { www_to_apex?: boolean; extra_hosts?: string[] };
  llms?: { pages?: { title: string; url: string }[] };
  forbidden: string[];
  legacy_pages?: boolean;
  indexnow_key?: string;
}
