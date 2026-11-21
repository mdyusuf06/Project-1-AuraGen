/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
    "./src/hooks/**/*.{js,jsx,ts,tsx}",
    "./src/fallback/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        auragen: {
          bg: "#080B16",
          bgSecondary: "#0D1220",
          card: "#11172A",
          elevated: "#171E33",
          violet: "#8057FF",
          lavender: "#B69CFF",
          cyan: "#25D9E8",
          success: "#38D9A9",
          error: "#FF647C"
        }
      }
    }
  },
  plugins: []
};

export default config;

