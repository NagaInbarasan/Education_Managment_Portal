/**
 * Phazon Ollama Tunnel Auth Proxy
 * 
 * Sits between Cloudflare Tunnel and local Ollama.
 * Validates a shared secret before forwarding requests to Ollama.
 * 
 * Usage:
 *   OLLAMA_TUNNEL_SECRET=<your-secret> node server/lib/ollamaTunnelProxy.js
 * 
 * Listens on :11435, forwards to Ollama on :11434.
 * Only requests with a valid X-Ollama-Secret header are forwarded.
 */
import http from 'node:http';

const PROXY_PORT = parseInt(process.env.OLLAMA_PROXY_PORT || '11435', 10);
const OLLAMA_TARGET = process.env.OLLAMA_TARGET || 'http://localhost:11434';
const TUNNEL_SECRET = process.env.OLLAMA_TUNNEL_SECRET;

if (!TUNNEL_SECRET || TUNNEL_SECRET.length < 32) {
  console.error('[Proxy] FATAL: OLLAMA_TUNNEL_SECRET must be set and at least 32 characters.');
  console.error('[Proxy] Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64\'))"');
  process.exit(1);
}

const server = http.createServer(async (req, res) => {
  // ── Auth check ──
  const providedSecret = req.headers['x-ollama-secret'];
  if (!providedSecret || providedSecret !== TUNNEL_SECRET) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    console.log(`[Proxy] 401 Rejected: ${req.method} ${req.url} (invalid/missing secret)`);
    return;
  }

  // ── Forward to Ollama ──
  try {
    const targetUrl = new URL(req.url, OLLAMA_TARGET);

    // Collect request body
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);

    // Build forwarding headers (strip the secret header)
    const forwardHeaders = { ...req.headers };
    delete forwardHeaders['x-ollama-secret'];
    delete forwardHeaders['host'];

    // Forward request to Ollama
    const ollamaRes = await fetch(targetUrl.toString(), {
      method: req.method,
      headers: forwardHeaders,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : body,
      signal: AbortSignal.timeout(180000) // 3 min timeout for large generations
    });

    // Stream response back
    res.writeHead(ollamaRes.status, Object.fromEntries(ollamaRes.headers.entries()));

    if (ollamaRes.body) {
      const reader = ollamaRes.body.getReader();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) { res.end(); break; }
          res.write(value);
        }
      };
      await pump();
    } else {
      const text = await ollamaRes.text();
      res.end(text);
    }
  } catch (err) {
    console.error(`[Proxy] Error forwarding to Ollama:`, err.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Ollama unreachable', details: err.message }));
  }
});

server.listen(PROXY_PORT, '127.0.0.1', () => {
  console.log(`[Proxy] ✅ Ollama Auth Proxy listening on http://127.0.0.1:${PROXY_PORT}`);
  console.log(`[Proxy] → Forwarding to ${OLLAMA_TARGET}`);
  console.log(`[Proxy] → Secret required: X-Ollama-Secret header`);
});

server.on('error', (err) => {
  console.error(`[Proxy] Server error:`, err.message);
  process.exit(1);
});
