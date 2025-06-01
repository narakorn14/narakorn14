// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./src/**/*.{js,jsx,ts,tsx}", // บอก Tailwind ให้สแกนหา class ในไฟล์เหล่านี้
    ],
    theme: {
      extend: {
        // คุณสามารถเพิ่ม custom theme ได้ที่นี่ เช่น สี, ฟอนต์
        colors: {
          'wkk-primary': '#007bff', // ตัวอย่างสีหลัก
          'wkk-secondary': '#6c757d', // ตัวอย่างสีรอง
        }
      },
    },
    plugins: [],
  }