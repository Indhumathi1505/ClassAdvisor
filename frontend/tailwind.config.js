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
                    primary: '#417b84ff',   // Lighter Cyan
                    secondary: '#154c60ff', // Darker Violet
                    accent: '#343435ff',    // Professional Grey
                    light: '#f3f4f6',     // Light Grey for backgrounds/options
                    deep: '#1f2937',      // Deep Grey for text
                }
            }
        },
    },
    plugins: [],
}
