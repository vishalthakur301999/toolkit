/** @type {import('tailwindcss').Config} */
module.exports = {
  // The 'dark' mode using 'class' will allow us to toggle dark mode if needed later.
  // For now, the theme will control it.
  darkMode: 'class',
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      // We let the tailwindcss-primeui plugin handle the colors now
    }
  },
  plugins: [
    // Ensure the plugin is registered
    require('tailwindcss-primeui')
  ],
};
