import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  trailingSlash: "always",
  build: {
    inlineStylesheets: "never",
  },
  integrations: [
    {
      name: "ask-local-api",
      hooks: {
        "astro:config:setup": ({ command, updateConfig }) => {
          // Astro's slash guard precedes Vite's proxy. Leave the static build
          // unchanged, but permit the exact /api/ask path in development.
          if (command === "dev") updateConfig({ trailingSlash: "ignore" });
        },
      },
    },
  ],
  vite: {
    server: {
      proxy: {
        "/api/ask": {
          target: "http://127.0.0.1:5001",
          rewrite: () => "/demo-meridian-station/us-central1/askParkinsons",
        },
      },
    },
  },
});
