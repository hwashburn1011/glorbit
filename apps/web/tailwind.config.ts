import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0d0c",
        "bg-panel": "#101312",
        "bg-elev": "#151817",
        "bg-hover": "#1b1f1d",
        border: {
          DEFAULT: "#1f2421",
          hot: "#2a312d",
        },
        text: {
          DEFAULT: "#d7dcd6",
          dim: "#7a8078",
          fade: "#4a4f4b",
        },
        accent: {
          DEFAULT: "#d4ff3a",
          dim: "#8aa220",
        },
        kind: {
          red: "#ff5c5c",
          amber: "#ffb84d",
          green: "#6fcf7a",
          blue: "#7ab8ff",
          violet: "#c49fff",
          pink: "#ff9ecb",
          cyan: "#7ee8e0",
          orange: "#ff9966",
        },
      },
      fontFamily: {
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
        serif: ["Fraunces", "Iowan Old Style", "Georgia", "serif"],
      },
      fontSize: {
        xxs: ["9px", "1.4"],
        "11": ["11px", "1.5"],
        "13": ["13px", "1.5"],
        "14": ["14px", "1.5"],
      },
      letterSpacing: {
        widen: "0.24em",
        wide18: "0.18em",
      },
      borderRadius: {
        xs: "2px",
        sm: "3px",
        md: "4px",
        lg: "5px",
      },
      keyframes: {
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        "slide-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        pulse: "pulse 2s ease-in-out infinite",
        "slide-in": "slide-in 300ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
