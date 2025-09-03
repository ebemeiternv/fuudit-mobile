
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
				// Soft pastels inspired by cover image
				'soft-pink': {
					50: 'hsl(var(--soft-pink-50))',
					100: 'hsl(var(--soft-pink-100))',
					200: 'hsl(var(--soft-pink-200))',
					300: 'hsl(var(--soft-pink-300))',
					400: 'hsl(var(--soft-pink-400))',
					500: 'hsl(var(--soft-pink-500))',
					600: 'hsl(var(--soft-pink-600))',
					700: 'hsl(var(--soft-pink-700))',
					800: 'hsl(var(--soft-pink-800))',
					900: 'hsl(var(--soft-pink-900))'
				},
				cream: {
					50: 'hsl(var(--cream-50))',
					100: 'hsl(var(--cream-100))',
					200: 'hsl(var(--cream-200))',
					300: 'hsl(var(--cream-300))',
					400: 'hsl(var(--cream-400))',
					500: 'hsl(var(--cream-500))',
					600: 'hsl(var(--cream-600))',
					700: 'hsl(var(--cream-700))',
					800: 'hsl(var(--cream-800))',
					900: 'hsl(var(--cream-900))'
				},
				lavender: {
					50: 'hsl(var(--lavender-50))',
					100: 'hsl(var(--lavender-100))',
					200: 'hsl(var(--lavender-200))',
					300: 'hsl(var(--lavender-300))',
					400: 'hsl(var(--lavender-400))',
					500: 'hsl(var(--lavender-500))',
					600: 'hsl(var(--lavender-600))',
					700: 'hsl(var(--lavender-700))',
					800: 'hsl(var(--lavender-800))',
					900: 'hsl(var(--lavender-900))'
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
