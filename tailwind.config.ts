/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // Add this line
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
      backgroundColor: {
        // Add dark mode variants for your custom colors
        "dark-primary": "#1a202c",
        "dark-secondary": "#2d3748",
      },
    },
  },
  plugins: [],
};
