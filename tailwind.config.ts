import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "#0052cc",
          foreground: "#ffffff",
          dark: "#0043a6",
        },
        secondary: {
          DEFAULT: "#f4f5f7",
          foreground: "#172b4d",
          dark: "#e9ebf0",
        },
      },
    },
  },
  plugins: [],
};
export default config;
