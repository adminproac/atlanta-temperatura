import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Project site: https://adminproac.github.io/atlanta-temperatura/
// Dev uses /. Build and preview (production mode) use the Pages base path.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === "production" ? "/atlanta-temperatura/" : "/",
}));
