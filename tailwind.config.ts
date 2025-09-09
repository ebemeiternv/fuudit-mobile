
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				// Scandinavian-inspired colors
				sage: {
					50: 'hsl(120 14% 97%)',
					100: 'hsl(120 14% 92%)',
					200: 'hsl(120 14% 83%)',
					300: 'hsl(120 14% 71%)',
					400: 'hsl(120 14% 56%)',
					500: 'hsl(120 20% 42%)',
					600: 'hsl(120 20% 32%)',
					700: 'hsl(120 20% 27%)',
					800: 'hsl(120 20% 23%)',
					900: 'hsl(120 20% 19%)'
				},
				cream: {
					50: 'hsl(45 71% 97%)',
					100: 'hsl(45 71% 92%)',
					200: 'hsl(45 71% 86%)',
					300: 'hsl(45 71% 78%)',
					400: 'hsl(45 71% 69%)',
					500: 'hsl(45 71% 60%)',
					600: 'hsl(45 71% 52%)',
					700: 'hsl(45 71% 45%)',
					800: 'hsl(45 71% 38%)',
					900: 'hsl(45 71% 32%)'
				},
				nordic: {
					50: 'hsl(210 20% 98%)',
					100: 'hsl(210 20% 95%)',
					200: 'hsl(210 20% 90%)',
					300: 'hsl(210 20% 85%)',
					400: 'hsl(210 20% 75%)',
					500: 'hsl(210 20% 65%)',
					600: 'hsl(210 20% 55%)',
					700: 'hsl(210 20% 40%)',
					800: 'hsl(210 20% 25%)',
					900: 'hsl(210 20% 13%)'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'fade-in': {
					'0%': {
						opacity: '0',
						transform: 'translateY(20px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'float': {
					'0%, 100%': {
						transform: 'translateY(0px)'
					},
					'50%': {
						transform: 'translateY(-10px)'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.6s ease-out',
				'float': 'float 3s ease-in-out infinite'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
