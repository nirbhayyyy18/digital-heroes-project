import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B0F14",
        panel: "#121821",
        line: "#212A35",
        mint: "#3ECF8E",
        amber: "#E0A458",
        cloud: "#EAF0F6",
        mute: "#8FA0B3",
      },
      fontFamily: {
        display: ["'Clash Display'", "system-ui", "sans-serif"],
        serifItalic: ["'Fraunces'", "Georgia", "serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
export default config;
