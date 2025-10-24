import { defineConfig } from 'vite';
import path from 'path';

// Use an async config and dynamic import for the React plugin so ESM-only plugin
// packages are loaded via import() instead of require(). This avoids the
// "ESM file cannot be loaded by require" error when esbuild/Vite tries to
// externalize deps.
export default defineConfig(async () => {
  const pluginReact = (await import('@vitejs/plugin-react')).default;

  return {
    plugins: [pluginReact()],
    root: path.resolve(__dirname),
    build: {
      // emit the frontend build into frontend/dist (requested)
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
      sourcemap: true,
    },
    server: {
      port: 5173,
      // Proxy API requests during development to the backend server.
      // This forwards any request starting with /api to http://localhost:3000
      // without rewriting the path. Adjust target if your backend runs elsewhere.
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
          // keep /api prefix so frontend requests to /api/... map directly
          // to the backend's same path
        },
      },
    },
  };
});
