import { defineConfig } from 'vite'; // Vite config helper
import react from '@vitejs/plugin-react'; // React plugin for Vite

export default defineConfig({
  plugins: [react()], // Enable React fast refresh/build pipeline
  server: {
    proxy: {
      // Anything starting with /api will be forwarded to your backend
      // Example: /api/health -> http://localhost:5000/health
      '/api': {
        target: 'http://localhost:5000', // Your Express server
        changeOrigin: true, // Makes proxy requests look like they come from the target
        rewrite: (path) => path.replace(/^\/api/, ''), // Remove /api prefix before hitting Express
      },
    },
  },
});


