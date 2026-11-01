import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const restCountriesProxy = (apiKey: string | undefined): Plugin => {
  const attach = (server: { middlewares: { use: (path: string, handler: (req: import('http').IncomingMessage, res: import('http').ServerResponse) => void) => void } }) => {
    server.middlewares.use('/api/countries', async (req, res) => {
      if (!apiKey) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'REST Countries API key is not configured' }));
        return;
      }

      const query = req.url?.startsWith('?') ? req.url.slice(1) : (req.url ?? '').split('?')[1] ?? '';
      const url = `https://api.restcountries.com/countries/v5${query ? `?${query}` : ''}`;

      try {
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        const body = await response.text();
        res.statusCode = response.status;
        res.setHeader('Content-Type', 'application/json');
        res.end(body);
      } catch {
        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Failed to reach REST Countries API' }));
      }
    });
  };

  return {
    name: 'restcountries-proxy',
    configureServer: attach,
    configurePreviewServer: attach,
  };
};

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiKey = env.RC_API_KEY || env.VITE_RC_API_KEY;

  return {
    plugins: [
      react(),
      tailwindcss(),
      restCountriesProxy(apiKey),
    ],
  };
});
