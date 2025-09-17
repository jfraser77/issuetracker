import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#2c3e50",
        secondary: "#3498db",
        success: "#2ecc71",
        warning: "#f39c12",
        danger: "#e74c3c",
        light: "#ecf0f1",
        dark: "#34495e",
        gray: "#95a5a6",
      },
    },
  },
  plugins: [],
} satisfies Config;
