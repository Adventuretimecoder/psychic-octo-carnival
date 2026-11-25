import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// One self-contained HTML file (fonts & code inlined) — used for the shareable web link.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), viteSingleFile()],
  build: { target: 'es2022', outDir: 'dist-single', assetsInlineLimit: 100_000_000, chunkSizeWarningLimit: 5000 },
});
