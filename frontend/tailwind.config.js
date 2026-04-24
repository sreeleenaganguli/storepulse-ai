/** @type {import("tailwindcss").Config} */
export default {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#eefbfc",
          100: "#cdf4f6",
          500: "#01696f",
          600: "#0c4e54",
          700: "#0f3638",
        },
        surface: {
          DEFAULT: "#f9f8f5",
          2: "#fbfbf9",
          offset: "#f3f0ec",
          dark: "#1c1b19",
          "dark-2": "#201f1d",
          "dark-offset": "#22211f",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.35s cubic-bezier(0.16,1,0.3,1)",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        shimmer: "shimmer 1.5s ease-in-out infinite",
        "spin-slow": "spin 2s linear infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: "translateY(12px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        pulseSoft: { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.5 } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
      },
    },
  },
  plugins: [],
};
