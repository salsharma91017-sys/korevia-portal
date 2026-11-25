/**
 * KoreVia brand details shared by the portal pages and the emails.
 *
 * The logos are the same files the KoreVia CompIQ site uses, loaded from there. To host them in the
 * portal instead, copy the four PNG files into public/brand/ and change BRAND_ASSET_BASE to "/brand"
 * (for emails the base must stay an absolute https:// address, so keep EMAIL_ASSET_BASE as is).
 */
export const EMAIL_ASSET_BASE = "https://compiq.korevia.solutions/assets/brand";
export const BRAND_ASSET_BASE = EMAIL_ASSET_BASE;

export const LOGO = {
  mark: `${BRAND_ASSET_BASE}/korevia-mark.png`, // square K+V icon
  wordmarkLight: `${BRAND_ASSET_BASE}/korevia-wordmark-light.png`, // for dark backgrounds
  wordmarkDark: `${BRAND_ASSET_BASE}/korevia-wordmark.png`, // for light backgrounds
  solutionsLight: `${BRAND_ASSET_BASE}/korevia-solutions-light.png`, // "KoreVia Solutions" lock-up, dark backgrounds
  favicon: "https://compiq.korevia.solutions/favicon-64.png",
  appleTouch: "https://compiq.korevia.solutions/apple-touch-icon.png",
};

export const EMAIL_LOGO = {
  wordmarkLight: `${EMAIL_ASSET_BASE}/korevia-wordmark-light.png`,
};

export const COLOURS = {
  navy: "#0B1437",
  navy2: "#12205A",
  blue: "#0B4DA2",
  teal: "#14B8A6",
  tealInk: "#0F766E",
  ink: "#17212B",
  ink2: "#4A5663",
  line: "#D7DBD4",
  bg: "#F2F3EF",
};

export const LINKS = {
  site: "https://korevia.solutions",
  email: "admin@korevia.solutions",
  compiq: "https://compiq.korevia.solutions",
};

export const TAGLINE = "Technology · Automation · Intelligence";
export const PROMISE = "Optimize processes | Drive efficiency | Deliver impact";

export const SERVICES: { title: string; body: string }[] = [
  { title: "AI agents & assistants", body: "Chatbots and co-pilots trained on your data" },
  { title: "Workflow automation", body: "Connect your tools and remove manual admin" },
  { title: "Custom platforms", body: "Web apps, portals and SaaS products, like this one" },
  { title: "Digital & marketing", body: "Websites and digital services for small business" },
];
