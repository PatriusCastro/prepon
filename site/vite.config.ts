import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROUTES } from './src/routes.ts';

// GitHub Pages has no SPA fallback. Copy index.html into each route's folder so deep
// links return 200, and to 404.html so unknown paths still render the app's 404 page.
const routePages = {
  name: 'route-pages',
  apply: 'build' as const,
  closeBundle() {
    const out = join(import.meta.dirname, 'dist');
    const html = readFileSync(join(out, 'index.html'));
    for (const r of ROUTES) {
      if (r === '/') continue;
      mkdirSync(join(out, r), { recursive: true });
      writeFileSync(join(out, r, 'index.html'), html);
    }
    writeFileSync(join(out, '404.html'), html);
  },
};

export default defineConfig({
  base: '/prepon/',
  plugins: [react(), routePages],
});
