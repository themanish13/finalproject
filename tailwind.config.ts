import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Roboto', 'system-ui', 'sans-serif'],
        heading: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        background: "#111111",
        foreground: "#F2F5F3",
        primary: {
          DEFAULT: "#228B22",
          foreground: "#FFFFFF",
        },
        card: {
          DEFAULT: "#1A221F",
          foreground: "#F2F5F3",
        },
        popover: {
          DEFAULT: "#1A221F",
          foreground: "#F2F5F3",
        },
        secondary: {
          DEFAULT: "#1A221F",
          foreground: "#F2F5F3",
        },
        muted: {
          DEFAULT: "#1A221F",
          foreground: "#889690",
        },
        accent: {
          DEFAULT: "#228B22",
          foreground: "#FFFFFF",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#F2F5F3",
        },
        border: "#2A3230",
        input: "#2A3230",
        ring: "#228B22",
        heart: {
          DEFAULT: "#FF0040",
          foreground: "#FFFFFF",
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        glow: "hsl(var(--glow-primary))",
        glass: "hsl(var(--glass))",
        "glass-border": "hsl(var(--glass-border))",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "heart-beat": {
          "0%, 100%": { transform: "scale(1)" },
          "25%": { transform: "scale(1.1)" },
          "50%": { transform: "scale(1)" },
          "75%": { transform: "scale(1.1)" },
        },
        "bounce-in": {
          "0%": { transform: "scale(0)", opacity: "0" },
          "50%": { transform: "scale(1.1)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in-up": "fade-in-up 0.6s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
        "scale-in": "scale-in 0.3s ease-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "heart-beat": "heart-beat 1s ease-in-out infinite",
        "bounce-in": "bounce-in 0.5s ease-out",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-primary": "linear-gradient(135deg, #228B22 0%, #1a6b1a 100%)",
        "gradient-dark": "linear-gradient(180deg, #1A221F 0%, #1A221F 100%)",
        "gradient-glow": "none",
      },
      boxShadow: {
        'glow': 'none',
        'glow-lg': 'none',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
