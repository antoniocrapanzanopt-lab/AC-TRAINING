import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

// ─── 1. AUTO-GUARIGIONE PER AGGIORNAMENTI & CHUNK VITE DINAMICI ───────────
// Se l'utente ha la pagina aperta mentre viene fatto un deploy, intercetta
// il disallineamento dei vecchi file .js e ricarica all'istante la versione aggiornata.
window.addEventListener('error', (event) => {
  const msg = event?.message || '';
  const isChunkError =
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('Loading chunk') ||
    msg.includes('Importing a module script failed');

  if (isChunkError) {
    console.warn('Nuova versione dell\'applicazione rilevata. Ricaricamento automatico...');
    const reloadKey = 'ac_last_chunk_reload';
    const lastReload = sessionStorage.getItem(reloadKey);
    const now = Date.now();

    // Evita loop di ricarica se l'errore è dovuto a totale assenza di connessione internet
    if (!lastReload || now - parseInt(lastReload, 10) > 8000) {
      sessionStorage.setItem(reloadKey, now.toString());
      if ('caches' in window) {
        caches
          .keys()
          .then((names) => Promise.all(names.map((n) => caches.delete(n))))
          .finally(() => {
            location.reload();
          });
      } else {
        location.reload();
      }
    }
  }
});

// ─── 2. PULIZIA AUTOMATICA CACHE LEGACY AL BOOTSTRAP ─────────────────────
if (typeof window !== 'undefined' && 'caches' in window) {
  caches.keys().then((names) => {
    names.forEach((name) => {
      // Pulisce cache residue legacy di vecchie build di terze parti
      if (name.includes('workbox') || name.includes('vite') || name.includes('precache')) {
        caches.delete(name);
      }
    });
  }).catch(() => {});
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

