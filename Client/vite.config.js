import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    viteStaticCopy({
      targets: [
        {
          src: path.resolve(__dirname, "../Shared"),
          dest: ".",
        },
      ],
    }),
  ],
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
  base: "./",
});
