import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const requiredBuildVariables = [
  "VITE_AWS_REGION",
  "VITE_COGNITO_CLIENT_ID",
  "VITE_GRAPHQL_URL",
  "VITE_API_BASE_URL",
];

export default defineConfig(({ command, mode }) => {
  if (command === "build" && process.env.VITE_REQUIRE_DEPLOY_CONFIG === "true") {
    const fileEnv = loadEnv(mode, process.cwd(), "");
    const missing = requiredBuildVariables.filter(
      (name) => !(process.env[name] ?? fileEnv[name])?.trim(),
    );
    if (missing.length)
      throw new Error(`Missing required frontend build variables: ${missing.join(", ")}`);
  }
  return {
    plugins: [tailwindcss(), react()],
    resolve: {
      // Lazy route chunks must share the same React runtime during local HMR.
      dedupe: ["react", "react-dom"],
    },
    optimizeDeps: {
      include: ["react", "react-dom", "react-router-dom"],
    },
    build: {
      // ExcelJS is an isolated, on-demand export engine. Route and initial app chunks
      // remain below 500 kB; this budget prevents a false warning for that lazy tool.
      chunkSizeWarningLimit: 1000,
    },
  };
});
