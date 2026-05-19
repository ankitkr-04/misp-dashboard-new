import type { Config } from "tailwindcss";

const config: Config = {
  theme: {
    extend: {
      colors: {
        dashboard: {
          bg: "var(--color-bg)",
          panel: "var(--color-panel)",
          border: "var(--color-border)",
          accent: "var(--color-accent)",
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
        sans: ["system-ui", "sans-serif"],
      },
      boxShadow: {
        panel: "0 14px 34px rgba(0, 0, 0, 0.18)",
      },
    },
  },
};

export default config;
