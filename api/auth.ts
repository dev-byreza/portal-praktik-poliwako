const NEON_AUTH_BASE = 'https://ep-quiet-lab-b39rfs7j.neonauth.c-4.ap-southeast-1.aws.neon.tech/neondb/auth';
const NEON_AUTH_HOST = 'ep-quiet-lab-b39rfs7j.neonauth.c-4.ap-southeast-1.aws.neon.tech';

export default async function handler(req: any, res: any) {
  // CORS & Methods
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Extract subpath
    let subpath = '';
    if (req.query?.__subpath) {
      subpath = '/' + (Array.isArray(req.query.__subpath) ? req.query.__subpath.join('/') : req.query.__subpath);
    } else if (req.url) {
      const parsedUrl = new URL(req.url, 'http://localhost');
      subpath = parsedUrl.pathname.replace(/^\/api\/auth/, '');
      parsedUrl.searchParams.delete('__subpath');
      const remainingSearch = parsedUrl.searchParams.toString();
      if (remainingSearch) {
        subpath += '?' + remainingSearch;
      }
    }

    const targetUrl = `${NEON_AUTH_BASE}${subpath}`;

    // Prepare headers
    const forwardHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers || {})) {
      if (!value) continue;
      const lower = key.toLowerCase();
      if (lower === 'host' || lower === 'x-forwarded-host') {
        forwardHeaders[lower] = NEON_AUTH_HOST;
      } else if (lower !== 'content-length') {
        forwardHeaders[lower] = String(value);
      }
    }
    forwardHeaders['host'] = NEON_AUTH_HOST;
    forwardHeaders['x-forwarded-host'] = NEON_AUTH_HOST;

    // Prepare body
    let body: any = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (typeof req.body === 'string') {
        body = req.body;
      } else if (req.body && typeof req.body === 'object') {
        body = JSON.stringify(req.body);
      }
    }

    const neonRes = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body,
      redirect: 'manual',
    });

    res.statusCode = neonRes.status;

    // Forward response headers
    neonRes.headers.forEach((val, key) => {
      const lower = key.toLowerCase();
      if (lower === 'set-cookie') {
        // Better Auth sets cookies with Domain or SameSite attributes; strip domain so it binds to current origin
        const cleanCookie = val.replace(/Domain=[^;]+;?\s*/gi, '');
        res.setHeader('Set-Cookie', cleanCookie);
      } else if (lower === 'location') {
        res.setHeader('Location', val);
      } else if (lower !== 'transfer-encoding') {
        res.setHeader(key, val);
      }
    });

    const data = await neonRes.arrayBuffer();
    return res.end(Buffer.from(data));
  } catch (err: any) {
    console.error('Neon Auth proxy error:', err);
    return res.status(502).json({ error: 'Auth proxy failed: ' + err.message });
  }
}
