import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: {
    colors: {
      paper: "var(--color-paper)", ink: "var(--color-ink)", leaf: "var(--color-leaf)",
      leafdark: "var(--color-leafdark)", clay: "var(--color-clay)", sand: "var(--color-sand)", muted: "var(--color-muted)",
    },
    fontFamily: { display: ["var(--font-display)", "Georgia", "serif"], sans: ["var(--font-body)", "system-ui", "sans-serif"] },
  } },
} satisfies Config;
