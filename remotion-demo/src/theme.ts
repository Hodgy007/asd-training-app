export const theme = {
  bg: "#0B1020",
  bgSoft: "#131A33",
  accent: "#6366F1",
  accent2: "#22D3EE",
  success: "#34D399",
  warning: "#FBBF24",
  pink: "#F472B6",
  text: "#F8FAFC",
  textMuted: "#94A3B8",
  card: "#1A2142",
  cardBorder: "rgba(148, 163, 184, 0.15)",
};

export type Theme = {
  mode: "dark" | "light";
  bg: string;
  bgSoft: string;
  card: string;
  cardBorder: string;
  cardShadow: string;
  text: string;
  textMuted: string;
  accent: string;
  accent2: string;
  accent3: string;
  success: string;
  warning: string;
  lime: string;
  pillBg: string;
  subtleFill: string;
};

// AaA brand palette (from logo SVG):
// navy #001522 · cyan #49c7ed · orange #f58220 · green #3bb14a
// yellow #fdb813 · lime #b2d235

export const aaaDark: Theme = {
  mode: "dark",
  bg: "#001522",
  bgSoft: "#002A3E",
  card: "#0C2230",
  cardBorder: "rgba(73, 199, 237, 0.18)",
  cardShadow: "0 24px 60px rgba(0,0,0,0.45)",
  text: "#FFFFFF",
  textMuted: "#9FB4BE",
  accent: "#49C7ED",
  accent2: "#F58220",
  accent3: "#FDB813",
  success: "#3BB14A",
  warning: "#FDB813",
  lime: "#B2D235",
  pillBg: "rgba(73, 199, 237, 0.14)",
  subtleFill: "rgba(159, 180, 190, 0.1)",
};

export const aaaLight: Theme = {
  mode: "light",
  bg: "#FFFFFF",
  bgSoft: "#F4F8FB",
  card: "#FFFFFF",
  cardBorder: "rgba(0, 21, 34, 0.08)",
  cardShadow: "0 18px 40px rgba(0, 21, 34, 0.08)",
  text: "#001522",
  textMuted: "#5B6B76",
  accent: "#49C7ED",
  accent2: "#F58220",
  accent3: "#FDB813",
  success: "#3BB14A",
  warning: "#FDB813",
  lime: "#B2D235",
  pillBg: "rgba(73, 199, 237, 0.14)",
  subtleFill: "rgba(0, 21, 34, 0.04)",
};

export const fontStack =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif';
