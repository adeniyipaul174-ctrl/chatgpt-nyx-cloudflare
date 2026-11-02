import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

const root = resolve('public');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const sendJson = value => {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify(value));
  };
  if (req.method === 'GET' && url.pathname === '/api/state') {
    return sendJson({ chats: [], memories: [], tasks: [], settings: { customInstructions: '', thinkingMode: 'normal' } });
  }
  if (req.method === 'GET' && url.pathname === '/api/ai-status') {
    return sendJson({ configured: true, databaseConfigured: true, textModel: 'Gemini (mock)', imageModel: 'Gemini (mock)' });
  }
  if (req.method === 'POST' && url.pathname === '/api/chat') {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const query = JSON.parse(raw).messages?.at(-1)?.content || '';
    const grounded = /search the web|latest|current|today/i.test(query);
    return sendJson({
      reply: 'Demo answer from a local mock API. Search-enabled chats display their returned grounding sources here.',
      chatId: 'mock-chat',
      route: grounded ? 'live_research' : 'general_chat',
      sources: grounded ? [
        { title: 'Google AI — Search grounding documentation', uri: 'https://ai.google.dev/gemini-api/docs/generate-content/google-search' },
        { title: 'Cloudflare Workers documentation', uri: 'https://developers.cloudflare.com/workers/' }
      ] : []
    });
  }
  const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
  if (!['index.html', 'app.js', '_headers'].includes(file)) {
    res.writeHead(404);
    return res.end('Not found');
  }
  try {
    const body = await readFile(resolve(root, file));
    res.writeHead(200, { 'content-type': mime[extname(file)] || 'text/plain' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});
server.listen(4173, '0.0.0.0');
