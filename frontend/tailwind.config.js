/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
    "./src/hooks/**/*.{js,jsx,ts,tsx}",
    "./src/fallback/**/*.{js,jsx,ts,tsx}",
    "./src/utils/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif"
        ]
      },
      colors: {
        auragen: {
          bg: "#F8FAFC",
          surface: "#FFFFFF",
          subtle: "#F1F5F9",
          border: "#E2E8F0",
          ink: "#0F172A",
          muted: "#64748B",
          emerald: "#10B981",
          emeraldDark: "#059669",
          emeraldSoft: "#ECFDF5",
          danger: "#F43F5E"
        }
      },
      boxShadow: {
        soft: "0 4px 20px -4px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.03)",
        "soft-lg": "0 12px 32px -8px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.04)",
        "emerald-glow": "0 8px 24px -6px rgba(16, 185, 129, 0.25)"
      }
    }
  },
  plugins: []
};

export default config;
