/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Soft blue palette -- NestWork's primary brand scale.
        nest: {
          50: "#F5F9FD",
          100: "#EAF2FB",
          200: "#D3E5F5",
          300: "#B4D1EC",
          400: "#8FB9DF",
          500: "#6B9DCE",
          600: "#4F80B4",
          700: "#3C6690",
          800: "#2E4F70",
          900: "#233D57",
        },
        // Muted slate-blue for text and borders, warmer than pure gray.
        slateblue: {
          50: "#F7F9FB",
          100: "#EEF1F5",
          200: "#DCE2E9",
          300: "#B9C4D0",
          400: "#8C9AAC",
          500: "#647188",
          600: "#4B5768",
          700: "#37414F",
          800: "#252C36",
          900: "#171C22",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
    },
  },
  future: {
    // Scope `hover:` under `@media (hover: hover)` so touch devices don't get
    // sticky hover styles -- without this, iOS Safari requires a second tap
    // to actually fire a click on any link/button with a hover: class.
    hoverOnlyWhenSupported: true,
  },
  plugins: [],
};
