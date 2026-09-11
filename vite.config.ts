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
      // In modalità dev, gestisce endpoint diagnostico per test sessioni reali
      server.middlewares.use((req, res, next) => {
        if (req.url === '/api/save-diagnosis' && req.method === 'POST') {
          console.log('[VITE] /api/save-diagnosis POST received');
          let body = '';
          req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              const outDir = path.resolve(__dirname, 'scratch');
              if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
              fs.writeFileSync(path.resolve(outDir, 'real_session_diagnosis.json'), body, 'utf-8');
              fs.appendFileSync(path.resolve(outDir, 'diagnosis_events.jsonl'), JSON.stringify({ time: new Date().toISOString(), ...parsed }) + '\n', 'utf-8');
              if (parsed.step) {
                fs.writeFileSync(path.resolve(outDir, `step_${parsed.step}.json`), body, 'utf-8');
              }
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true }));
            } catch (err: unknown) {
              console.error('[VITE] /api/save-diagnosis write error:', err);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: String(err) }));
            }
          });
          return;
        }

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
