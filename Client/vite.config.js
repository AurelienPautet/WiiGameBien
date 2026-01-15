import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Allow serving files from parent directory (Shared folder)
    fs: {
      allow: [".."],
    },
  },
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "../Shared"),
    },
  },
  // Serve Shared folder as static asset
  publicDir: "public",
});
