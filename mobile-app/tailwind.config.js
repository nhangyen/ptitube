/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        surface: "#23020f",
        "surface-container-low": "#2b0414",
        "surface-container-high": "#3e0d21",
        "surface-container-highest": "#4e1b30", // Tùy chỉnh thêm
        primary: "#ff8c95",
        "primary-dim": "#e80048",
        "on-primary": "#64001a",
        secondary: "#29fcf3",
        tertiary: "#f3ffca",
        "outline-variant": "#693949",
        "primary-fixed-dim": "#ff576e"
      },
      fontFamily: {
        "display": ["PlusJakartaSans-Bold", "sans-serif"],
        "headline": ["PlusJakartaSans-SemiBold", "sans-serif"],
        "body": ["BeVietnamPro-Regular", "sans-serif"],
        "label": ["BeVietnamPro-Medium", "sans-serif"],
      },
    },
  },
  plugins: [],
}

