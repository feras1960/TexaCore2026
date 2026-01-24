/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
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
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // ERP Custom Colors
        erp: {
          navy: "#0A2540",
          teal: "#00D4AA",
          cream: "#FAF9F6",
          success: "#10B981",
          warning: "#F59E0B",
          error: "#EF4444",
        }
      },
      fontFamily: {
        // للغات الأوروبية (Inter)
        inter: ["Inter", "sans-serif"],
        // للغة العربية
        cairo: ["Cairo", "sans-serif"],
        tajawal: ["Tajawal", "sans-serif"],
        // للأرقام والأكواد
        mono: ["JetBrains Mono", "monospace"],
        // Font stack: يختار تلقائياً حسب اللغة
        sans: ["Inter", "Cairo", "Tajawal", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      // ═══════════════════════════════════════════════════════════
      // Custom Keyframes - الحركات المخصصة
      // ═══════════════════════════════════════════════════════════
      keyframes: {
        // Accordion (Radix UI)
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        // Fade Animations
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeOut: {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        // Slide Animations
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideLeft: {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideRight: {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        // Scale Animation
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        scaleOut: {
          "0%": { opacity: "1", transform: "scale(1)" },
          "100%": { opacity: "0", transform: "scale(0.95)" },
        },
        // Shimmer (Loading skeleton)
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        // Pulse soft
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        // Bounce soft
        "bounce-soft": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        // Shake (for errors)
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-4px)" },
          "20%, 40%, 60%, 80%": { transform: "translateX(4px)" },
        },
        // Float (subtle hover effect)
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        // Glow pulse
        glow: {
          "0%, 100%": { boxShadow: "0 0 5px rgba(0, 212, 170, 0.5)" },
          "50%": { boxShadow: "0 0 20px rgba(0, 212, 170, 0.8)" },
        },
      },
      // ═══════════════════════════════════════════════════════════
      // Custom Animations - الرسوم المتحركة
      // ═══════════════════════════════════════════════════════════
      animation: {
        // Accordion
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        // Fade
        "fade-in": "fadeIn 0.3s ease-out",
        "fade-out": "fadeOut 0.3s ease-out",
        "fade-in-slow": "fadeIn 0.5s ease-out",
        // Slide
        "slide-up": "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-down": "slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-left": "slideLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-right": "slideRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        // Scale
        "scale-in": "scaleIn 0.2s ease-out",
        "scale-out": "scaleOut 0.2s ease-out",
        // Continuous
        "spin-slow": "spin 3s linear infinite",
        "pulse-soft": "pulse-soft 3s ease-in-out infinite",
        "bounce-soft": "bounce-soft 2s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "float": "float 3s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite",
        // Utility
        "shake": "shake 0.5s ease-in-out",
      },
      // ═══════════════════════════════════════════════════════════
      // Custom Box Shadows - الظلال المخصصة
      // ═══════════════════════════════════════════════════════════
      boxShadow: {
        // Soft shadows
        "soft-sm": "0 2px 8px rgba(0,0,0,0.04)",
        "soft-md": "0 4px 16px rgba(0,0,0,0.06)",
        "soft-lg": "0 8px 32px rgba(0,0,0,0.08)",
        "soft-xl": "0 16px 48px rgba(0,0,0,0.12)",
        // Glow shadows
        "glow-sm": "0 0 15px rgba(59, 130, 246, 0.3)",
        "glow-md": "0 0 30px rgba(59, 130, 246, 0.4)",
        "glow-teal": "0 0 20px rgba(0, 212, 170, 0.3)",
        "glow-teal-lg": "0 0 40px rgba(0, 212, 170, 0.4)",
        // Colored shadows
        "teal": "0 4px 14px rgba(0, 212, 170, 0.25)",
        "navy": "0 4px 14px rgba(10, 37, 64, 0.25)",
        // Lift shadow (for hover states)
        "lift": "0 10px 40px rgba(0,0,0,0.12)",
        "lift-lg": "0 20px 60px rgba(0,0,0,0.15)",
      },
      // ═══════════════════════════════════════════════════════════
      // Custom Backdrop Blur
      // ═══════════════════════════════════════════════════════════
      backdropBlur: {
        xs: "2px",
      },
      // ═══════════════════════════════════════════════════════════
      // Custom Transition Timing Functions - منحنيات الحركة
      // ═══════════════════════════════════════════════════════════
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
        "in-expo": "cubic-bezier(0.7, 0, 0.84, 0)",
        "bounce": "cubic-bezier(0.34, 1.56, 0.64, 1)",
        "smooth": "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      // ═══════════════════════════════════════════════════════════
      // Custom Transition Duration
      // ═══════════════════════════════════════════════════════════
      transitionDuration: {
        "250": "250ms",
        "350": "350ms",
        "400": "400ms",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
