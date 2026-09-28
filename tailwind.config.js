/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50:"#eef6ff",100:"#d9eaff",500:"#1d6ce0",600:"#1558bd",700:"#12489a",900:"#0d2547" },
        ink: "#0f1c2e"
      }
    }
  },
  plugins: []
};
