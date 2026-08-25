import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';

const currentBuildVersion = `v_${Date.now()}`;
const currentBuildTimestamp = new Date().toISOString();

function pwaVersioningPlugin(): Plugin {
  return {
    name: 'pwa-versioning-plugin',
    configureServer(server) {
      // In modalità dev, serve sw.js con la versione corrente
      server.middlewares.use((req, res, next) => {
        if (req.url === '/sw.js') {
          const swPath = path.resolve(__dirname, 'public/sw.js');
          if (fs.existsSync(swPath)) {
            let content = fs.readFileSync(swPath, 'utf-8');
            content = content.replace(/__BUILD_VERSION__/g, currentBuildVersion);
            res.setHeader('Content-Type', 'application/javascript');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            return res.end(content);
          }
        }
        next();
      });
    },
    closeBundle() {
      // Al termine della build, inietta la versione univoca in dist/sw.js
      const distSwPath = path.resolve(__dirname, 'dist/sw.js');
      if (fs.existsSync(distSwPath)) {
        let content = fs.readFileSync(distSwPath, 'utf-8');
        content = content.replace(/__BUILD_VERSION__/g, currentBuildVersion);
        fs.writeFileSync(distSwPath, content, 'utf-8');
      }

      // Genera anche dist/version.json per controlli diagnostici
      const distVersionPath = path.resolve(__dirname, 'dist/version.json');
      fs.writeFileSync(
        distVersionPath,
        JSON.stringify(
          {
            version: currentBuildVersion,
            builtAt: currentBuildTimestamp,
          },
          null,
          2
        ),
        'utf-8'
      );
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), pwaVersioningPlugin()],
  define: {
    __APP_BUILD_VERSION__: JSON.stringify(currentBuildVersion),
    __APP_BUILD_TIMESTAMP__: JSON.stringify(currentBuildTimestamp),
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('d3-')) {
              return 'charts';
            }
            if (id.includes('@supabase')) {
              return 'supabase';
            }
            if (id.includes('lucide-react')) {
              return 'icons';
            }
            if (id.includes('motion') || id.includes('framer-motion')) {
              return 'motion';
            }
            if (id.includes('zod') || id.includes('qrcode.react')) {
              return 'utils';
            }
          }
        },
      },
    },
  },
});
