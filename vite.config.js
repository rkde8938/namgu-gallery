// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc"; // ← 여기! swc 버전
import tailwindcss from "@tailwindcss/vite";  // ← Tailwind Vite 플러그인

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  base: "/gallery/",
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      // 🔹 이미지도 PHP 서버로 프록시
      "/gallery-images": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
