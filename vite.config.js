import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 4173,
    host: true,
    // Aceptar cualquier host. Es seguro porque preview solo se usa para
    // servir el build estático (ya compilado, sin código del backend).
    allowedHosts: true,
  },
});
