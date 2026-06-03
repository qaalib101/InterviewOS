import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1f2933",
        paper: "#f7f4ef",
        line: "#d8d2c8",
        moss: "#526b4d",
        rust: "#a8552a",
        steel: "#456276"
      },
      fontFamily: {
        sans: ["Aptos", "ui-sans-serif", "system-ui"],
        display: ["Georgia", "ui-serif", "serif"]
      }
    }
  },
  plugins: []
} satisfies Config;
