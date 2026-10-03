import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development, every request to /api/... is forwarded to the Laravel server,
// so the browser sees one origin (no CORS headaches).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:8000' },
  },
});
