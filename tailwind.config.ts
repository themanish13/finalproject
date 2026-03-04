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
        background: "#0E0F0F",
        foreground: "#F2F5F3",
        primary: {
          DEFAULT: "#2E7D57",
          foreground: "#FFFFFF",
          light: "#1B5E3A",
          dark: "#1B5E3A",
        },
        "emerald-glow": {
          DEFAULT: "#2E7D57",
          light: "#1B5E3A",
        },
        "neon-green": {
          DEFAULT: "#39FF14",
          foreground: "#000000",
          muted: "#39FF1440",
        },
        card: {
          DEFAULT: "#161A18",
          foreground: "#F2F5F3",
        },
        popover: {
          DEFAULT: "#161A18",
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
          DEFAULT: "#2E7D57",
          foreground: "#FFFFFF",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#F2F5F3",
        },
        border: "#2A3230",
        input: "#777777",
        ring: "#2E7D57",
        heart: {
          DEFAULT: "#FF2D55",
          foreground: "#FFFFFF",
          neon: "#FF2D55",
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
        "heart-burst": {
          "0%": { transform: "scale(0)", opacity: "1" },
          "50%": { transform: "scale(1.2)", opacity: "0.8" },
          "100%": { transform: "scale(1.5)", opacity: "0" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 5px rgba(255,45,85,0.3)" },
          "50%": { boxShadow: "0 0 20px rgba(255,45,85,0.5)" },
        },
        "float-up": {
          "0%": { transform: "translateY(0) scale(1)", opacity: "1" },
          "100%": { transform: "translateY(-50px) scale(0)", opacity: "0" },
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
        "heart-burst": "heart-burst 0.6s ease-out forwards",
        "float-up": "float-up 1s ease-out forwards",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-primary": "linear-gradient(135deg, #1B5E3A 0%, #2E7D57 100%)",
        "gradient-emerald": "linear-gradient(135deg, #1B5E3A 0%, #2E7D57 50%, #34A853 100%)",
        "gradient-dark": "linear-gradient(180deg, #161A18 0%, #161A18 100%)",
        "gradient-glow": "none",
      },
      boxShadow: {
        'glow': '0 0 20px rgba(255,45,85,0.3)',
        'glow-lg': '0 0 30px rgba(255,45,85,0.4)',
        'glow-emerald': '0 0 20px rgba(46,125,87,0.3)',
        'glow-emerald-lg': '0 0 30px rgba(46,125,87,0.4)',
        'card': '0 4px 20px rgba(0,0,0,0.3)',
        'card-hover': '0 8px 30px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
