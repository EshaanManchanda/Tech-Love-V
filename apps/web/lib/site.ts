export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

// app/opengraph-image.png. Next attaches it automatically only to pages that
// inherit openGraph; any page setting its own openGraph object must list it.
export const OG_IMAGE = { url: "/opengraph-image.png", width: 1200, height: 630, alt: "Tech Love V — WordPress plugins by Eshaan Manchanda" };

// Share image for Certificate Generator pages — the tutorial-series thumbnail.
export const CG_OG_IMAGE = { url: "/marketing/cg-tutorial-series.jpg", width: 1280, height: 720, alt: "WordPress Certificate Generator — complete tutorial series" };

export const YOUTUBE_CHANNEL = "https://www.youtube.com/@techlovev";
export const YOUTUBE_PLAYLIST = "https://www.youtube.com/playlist?list=PLPuOF0XdtrEo";

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  uploadDate: string; // ISO 8601, as YouTube reports it
  duration: string; // ISO 8601 duration
  thumbnail?: string; // our own image in public/, preferred over YouTube's auto thumbnail
}

// Values copied from the video's YouTube page — keep them in sync if the video is re-uploaded.
export const CG_TUTORIAL: YouTubeVideo = {
  id: "2dewr6w0FwU",
  title: "WordPress Certificate Generator Full Tutorial | Build a Complete Certificate Management System (CMS)",
  description:
    "Build a complete Certificate Management System (CMS) in WordPress — from installation to certificate verification — using the Certificate Generator plugin, on a live site or locally with LocalWP.",
  uploadDate: "2026-10-08T00:21:21-07:00",
  duration: "PT4M11S",
  thumbnail: "/marketing/cg-tutorial-series.jpg",
};
export const FACEBOOK_URL = "https://www.facebook.com/TechLoveV/";
export const INSTAGRAM_URL = "https://www.instagram.com/techlovev.official/";
export const FOUNDER_URL = "https://eshaanportfolio.vercel.app/";

// Kept in one place so the Organization schema, footer links and every page
// describe the same entity with the same words.
export const CG_ENTITY_SENTENCE =
  "Certificate Generator is a WordPress plugin for creating, managing, issuing and verifying certificates. It supports bulk student import from CSV, drag-and-drop certificate templates, QR-code verification, serial numbers, automatic issuance from LMS and WooCommerce, and email analytics.";

export const DT_ENTITY_SENTENCE =
  "Dynamic Tags is a WordPress plugin that adds one merge-tag syntax for site data — post fields, WooCommerce product data, ACF fields, post queries and external APIs — usable in Elementor, Gutenberg, Divi or any field that accepts text. It includes formatters, fallbacks, conditionals, and [dt_loop]/[dt_template] shortcodes for repeating content.";

export const ORGANIZATION_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "Tech Love V",
  url: SITE_URL,
  sameAs: [YOUTUBE_CHANNEL, FACEBOOK_URL, INSTAGRAM_URL],
  founder: {
    "@type": "Person",
    name: "Eshaan Manchanda",
    url: FOUNDER_URL,
    sameAs: [
      "https://www.linkedin.com/in/eshaan-manchanda/",
      FOUNDER_URL,
      "https://www.instagram.com/eshaan.official2002/",
      "https://www.facebook.com/eshaan.official2002/",
    ],
  },
};

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}
