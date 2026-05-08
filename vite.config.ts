import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

// Relative base so the build works on GitHub Pages (any sub-path) and
// custom domains alike.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss(), tsConfigPaths()],
  server: {
    host: "::",
    port: 8080,
  },
});
