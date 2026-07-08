import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#f0f4fa",
          100: "#dce5f3",
          200: "#c2d2e9",
          300: "#98b3d9",
          400: "#688cc5",
          500: "#466eb0",
          600: "#345694",
          700: "#2b4678",
          800: "#213154",
          900: "#0b1f3a",
          950: "#071527",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(7,21,39,0.06), 0 10px 30px -12px rgba(7,21,39,0.18)",
        lift: "0 24px 48px -16px rgba(7,21,39,0.35)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
