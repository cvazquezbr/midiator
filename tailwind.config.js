/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Aqui você pode adicionar personalizações de tema se necessário no futuro
      // Ex: cores, fontes, etc.
      // colors: {
      //   'brand-purple': '#6d28d9',
      //   'brand-pink': '#ec4899',
      // }
    },
  },
  plugins: [
    // Aqui você pode adicionar plugins do Tailwind se necessário
    // Ex: require('@tailwindcss/forms'),
  ],
}
