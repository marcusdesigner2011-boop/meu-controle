import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: {
    colors: { paper: "#F6F2E9", ink: "#17202A", leaf: "#0B6E4F", leafdark: "#084C37", clay: "#C8553D", sand: "#E4DCC8", muted: "#5B6470" },
    fontFamily: { display: ["var(--font-display)", "Georgia", "serif"], sans: ["var(--font-body)", "system-ui", "sans-serif"] },
  } },
} satisfies Config;
