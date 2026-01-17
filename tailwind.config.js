/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,jsx,ts,tsx}",
        "./components/**/*.{js,jsx,ts,tsx}",
    ],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                // Cosmic gradient colors
                cosmic: {
                    blue: '#1e3a8a',
                    pink: '#be185d',
                    purple: '#7c3aed',
                    turquoise: '#0d9488',
                    dark: '#0f172a',
                },
                // Dark sub-themes
                dark: {
                    crimson: {
                        bg: '#1a0a0a',
                        surface: '#2d1515',
                        accent: '#dc2626',
                        text: '#fecaca',
                        muted: '#991b1b',
                    },
                    emerald: {
                        bg: '#0a1a0f',
                        surface: '#14532d',
                        accent: '#10b981',
                        text: '#d1fae5',
                        muted: '#065f46',
                    },
                    zinc: {
                        bg: '#18181b',
                        surface: '#27272a',
                        accent: '#a1a1aa',
                        text: '#fafafa',
                        muted: '#71717a',
                    },
                    slate: {
                        bg: '#0f172a',
                        surface: '#1e293b',
                        accent: '#64748b',
                        text: '#f1f5f9',
                        muted: '#475569',
                    },
                },
                // Light sub-themes
                light: {
                    milk: {
                        bg: '#fefefe',
                        surface: '#f8f8f8',
                        accent: '#1e293b',
                        text: '#1e293b',
                        muted: '#64748b',
                    },
                    sandstorm: {
                        bg: '#fef7ed',
                        surface: '#fef3c7',
                        accent: '#b45309',
                        text: '#78350f',
                        muted: '#a16207',
                    },
                    lavender: {
                        bg: '#faf5ff',
                        surface: '#f3e8ff',
                        accent: '#7c3aed',
                        text: '#4c1d95',
                        muted: '#8b5cf6',
                    },
                },
            },
            fontFamily: {
                comfortaa: ['Comfortaa_400Regular', 'sans-serif'],
                'comfortaa-medium': ['Comfortaa_500Medium', 'sans-serif'],
                'comfortaa-bold': ['Comfortaa_700Bold', 'sans-serif'],
                prosto: ['ProstoOne_400Regular', 'serif'],
            },
            borderRadius: {
                'xl': '1rem',
                '2xl': '1.5rem',
                '3xl': '2rem',
            },
            boxShadow: {
                'cosmic': '0 4px 20px -5px rgba(124, 58, 237, 0.4)',
                'glow': '0 0 20px rgba(124, 58, 237, 0.3)',
            },
        },
    },
    plugins: [],
};
