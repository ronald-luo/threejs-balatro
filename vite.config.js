import { defineConfig } from "vite";

export default defineConfig({
  assetsInclude: ["**/*.glsl"],
  server: {
    open: true,
  },
  base: "/threejs-balatro/",
});
