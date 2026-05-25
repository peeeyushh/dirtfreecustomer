/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: "#F7F7F8",
        fg: "#0E1220",
        card: "#FFFFFF",
        muted: "#6B7280",
        border: "#E7E8EC",
        electric: "#3B6BFF",
        electricSoft: "#7AA2FF",
        gold: "#D6A75A",
        success: "#22C58A",
        danger: "#E5484D",
        primary: "#006D44", // Keeping dirtfree's primary color
      },
      fontFamily: { sans: ["System"] },
    },
  },
  plugins: [],
};
