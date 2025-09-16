import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables from .env.testnet when in testnet mode
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['dotenv']
    },
    define: {
      // Ensure environment variables are properly handled
      'process.env': {}
    },
    envDir: '.', // Look for .env files in the project root
    envPrefix: 'VITE_', // Only expose variables prefixed with VITE_
  };
});
