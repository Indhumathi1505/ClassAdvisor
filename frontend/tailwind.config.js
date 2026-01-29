/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    primary: '#67e8f9',   // Lighter Cyan
                    secondary: '#0d5771ff', // Darker Violet
                    accent: '#4b5563',    // Professional Grey
                    light: '#f3f4f6',     // Light Grey for backgrounds/options
                    deep: '#1f2937',      // Deep Grey for text
                }
            }
        },
    },
    plugins: [],
}
