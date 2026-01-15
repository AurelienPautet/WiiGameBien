import { defineConfig, normalizePath } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const isBuild = command === "build";
  return {
    base: "./",
    plugins: [
      react(),
      tailwindcss(),
      viteStaticCopy({
        targets: [
          // Copy Shared folder contents to dist/shared (lowercase)
          {
            src: normalizePath(path.resolve(__dirname, "../shared")) + "/*",
            dest: "shared",
          },
          // Copy public assets (excluding Shared symlink) to dist
          ...(isBuild
            ? [
                {
                  src:
                    normalizePath(path.resolve(__dirname, "public")) +
                    "/!(*Shared)",
                  dest: ".",
                },
              ]
            : []),
        ],
      }),
      {
        name: "serve-shared-dev",
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            // Match lowercase /shared/ requests from index.html
            if (req.url.startsWith("/shared/")) {
              const sharedPath = path.resolve(__dirname, "../shared");
              const filePath = req.url.replace("/shared", "");
              // Rewrite to use Vite's internal FS serving
              req.url = `/@fs${sharedPath}${filePath}`;
            }
            next();
          });
        },
      },
    ],
    resolve: {
      alias: {
        "@shared": path.resolve(__dirname, "../shared"),
      },
    },
    server: {
      fs: {
        allow: [".."],
      },
    },
    // Disable default publicDir copy during build to prevent EISDIR error on Shared symlink
    // But keep it enabled for dev to serve assets from public/Shared
    publicDir: isBuild ? false : "public",
  };
});
