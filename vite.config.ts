import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function neonApiPlugin() {
  return {
    name: 'neon-api-dev-server',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (!req.url?.startsWith('/api/')) return next();

        let body = {};
        if (req.method === 'POST') {
          const buffers = [];
          for await (const chunk of req) buffers.push(chunk);
          const raw = Buffer.concat(buffers).toString('utf8');
          try { body = JSON.parse(raw); } catch {}
        }
        req.body = body;

        const customRes = res;
        customRes.status = (statusCode: number) => {
          res.statusCode = statusCode;
          return customRes;
        };
        customRes.json = (data: any) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
          return customRes;
        };

        try {
          if (req.url.startsWith('/api/student-auth')) {
            const { default: handler } = await server.ssrLoadModule('./api/student-auth.ts');
            return await handler(req, customRes);
          }
          if (req.url.startsWith('/api/instructor-auth')) {
            const { default: handler } = await server.ssrLoadModule('./api/instructor-auth.ts');
            return await handler(req, customRes);
          }
          if (req.url.startsWith('/api/data')) {
            const { default: handler } = await server.ssrLoadModule('./api/data.ts');
            return await handler(req, customRes);
          }
        } catch (err: any) {
          console.error('Neon dev API error:', err);
          return customRes.status(500).json({ error: err.message });
        }
        next();
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), neonApiPlugin()],
    // The local .env currently stores the publishable key without VITE_.
    // Expose only that public key to the browser; never expose secret keys.
    define: {
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(
        env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY || ''
      ),
    },
    server: {
      port: 5173,
      host: true
    }
  };
});

