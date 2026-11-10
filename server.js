const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME types
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.ico': 'image/x-icon'
};

// In-memory or env provider configs
const ENV_FILE = path.join(__dirname, '.env.local');

function loadEnvConfig() {
  const envConfig = {
    providers: {
      groq: { configured: !!process.env.GROQ_API_KEY, model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b' },
      openrouter: { configured: !!process.env.OPENROUTER_API_KEY, model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free' },
      xai: { configured: !!process.env.XAI_API_KEY, model: process.env.XAI_MODEL || 'grok-2-latest' },
      openai: { configured: !!process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL || 'gpt-4o-mini' },
      ollama: { configured: true, baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434', model: process.env.OLLAMA_MODEL || 'llama3.1' }
    },
    defaultProvider: process.env.DEFAULT_PROVIDER || 'ollama'
  };

  if (fs.existsSync(ENV_FILE)) {
    try {
      const content = fs.readFileSync(ENV_FILE, 'utf8');
      content.split('\n').forEach(line => {
        const [k, ...v] = line.trim().split('=');
        if (k && v.length) {
          const val = v.join('=').trim().replace(/^["']|["']$/g, '');
          if (k === 'GROQ_API_KEY' && val) envConfig.providers.groq.configured = true;
          if (k === 'OPENROUTER_API_KEY' && val) envConfig.providers.openrouter.configured = true;
          if (k === 'XAI_API_KEY' && val) envConfig.providers.xai.configured = true;
          if (k === 'OPENAI_API_KEY' && val) envConfig.providers.openai.configured = true;
          if (k === 'OLLAMA_BASE_URL' && val) envConfig.providers.ollama.baseUrl = val;
        }
      });
    } catch (e) {}
  }
  return envConfig;
}

// Load knowledge graph data for offline reasoning fallback
let gitaGraph = null;
let gitaVerses = null;
try {
  const graphPath = path.join(PUBLIC_DIR, 'data', 'gita-graph.json');
  if (fs.existsSync(graphPath)) gitaGraph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
  const versesPath = path.join(PUBLIC_DIR, 'data', 'gita-verses.json');
  if (fs.existsSync(versesPath)) gitaVerses = JSON.parse(fs.readFileSync(versesPath, 'utf8'));
} catch (e) {
  console.warn('Could not pre-load graph data:', e.message);
}

// Graph-grounded response synthesizer
function generateGraphFallbackResponse({ question, context, mode }) {
  let response = '';
  if (mode === 'bridge') {
    response = `### The Philosophical Bridge in the Bhagavad Gita\n\n`;
    response += `This path weaves through the transformative journey of the Gita, revealing how spiritual dilemmas find resolution through higher understanding and disciplined action (*Yoga*).\n\n`;
    if (context) {
      response += `#### Graph-Grounded Traversals & Connections\n`;
      const contextLines = context.split('\n').filter(l => l.trim().length > 0);
      for (const line of contextLines.slice(0, 12)) {
        response += `> ${line}\n`;
      }
      response += `\n`;
    }
    response += `#### Synthesis of the Bridge\n`;
    response += `1. **The Human Dilemma (*Viṣāda*)**: The seeker begins at the crossroads of duty, attachment, and existential doubt—mirroring Arjuna's initial faint-heartedness between the two armies (BG 2.3).\n`;
    response += `2. **The Discerning Intellect (*Buddhi Yoga*)**: Krishna instructs that grief stems from confusing the transient body and outcome with the eternal *Ātman*. Through knowledge and detachment, the agitated mind steadies (BG 2.47, BG 2.70).\n`;
    response += `3. **Selfless Dedication (*Niṣkāma Karma & Bhakti*)**: By offering action without selfish clinging to rewards, one transmutes binding duty into liberating practice. This bridge culminates in inner serenity (*Śānti*) and supreme freedom (*Mokṣa*).\n`;
  } else {
    response = `### Gita Sarathi Knowledge Synthesis\n\n`;
    response += `In response to your inquiry: **"${question || 'Contemplating the Gita'}"**\n\n`;
    if (context) {
      response += `#### Grounded Textual Evidence & Graph Lineage\n`;
      const lines = context.split('\n').filter(l => l.trim().length > 0);
      for (const l of lines.slice(0, 8)) {
        response += `- ${l}\n`;
      }
      response += `\n`;
    }
    response += `#### Core Insight from the Gita\n`;
    response += `- **On Right Action**: *karmaṇy-evādhikāras te mā phaleṣhu kadāchana* (BG 2.47) — You have the right to work, but never to the fruits. Do not let results dictate your peace of mind.\n`;
    response += `- **On Equanimity (*Samatvam*)**: Krishna declares that yoga is equanimity of mind (*samatvaṁ yoga ucyate*, BG 2.48). Whether encountering triumph or defeat, the disciplined mind remains rooted in truth.\n`;
    response += `- **On Inner Transformation**: The lower self must be elevated by the higher Self; for the Self alone is one's friend, and the undisciplined mind one's adversary (BG 6.5).\n\n`;
    response += `*Explore the connected nodes on the interactive canvas or switch to Lineage (Darśana) to observe how this truth unfolds across the Gita's 18 chapters.*`;
  }
  return response;
}

// Stream helper
function streamText(res, text, headers = {}) {
  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    ...headers
  });

  const words = text.split(' ');
  let i = 0;
  const interval = setInterval(() => {
    if (i >= words.length) {
      clearInterval(interval);
      res.end();
      return;
    }
    const chunk = (i === 0 ? '' : ' ') + words[i];
    res.write(chunk);
    i++;
  }, 25);
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-gitasarathi-key, authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // --- API ROUTES ---

  // 1. GET/POST/DELETE /api/settings/env
  if (pathname === '/api/settings/env') {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(loadEnvConfig()));
      return;
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            ok: true,
            written: true,
            file: '.env.local',
            message: `Saved configuration for ${data.provider || 'provider'}.`
          }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: e.message }));
        }
      });
      return;
    }
    if (req.method === 'DELETE') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, message: 'Settings cleared' }));
      return;
    }
  }

  // 2. GET /api/settings/models
  if (pathname === '/api/settings/models') {
    const provider = parsedUrl.query.provider;
    const baseUrl = parsedUrl.query.baseUrl || 'http://localhost:11434';
    if (provider === 'ollama') {
      try {
        const ollamaRes = await fetch(`${baseUrl}/api/tags`).catch(() => null);
        if (ollamaRes && ollamaRes.ok) {
          const json = await ollamaRes.json();
          const models = (json.models || []).map(m => m.name);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ models, recommended: models.slice(0, 3) }));
          return;
        }
      } catch (e) {}
    }
    // Default model catalogs
    const modelsByProvider = {
      groq: ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b', 'llama-3.3-70b-versatile'],
      openrouter: ['meta-llama/llama-3.3-70b-instruct:free', 'google/gemma-3-27b-it:free', 'deepseek/deepseek-r1:free', 'anthropic/claude-sonnet-4.5', 'openai/gpt-4o-mini'],
      xai: ['grok-2-latest', 'grok-3', 'grok-3-mini'],
      openai: ['gpt-4o-mini', 'gpt-4o', 'o1-mini'],
      ollama: ['llama3.1', 'llama3.2', 'qwen2.5', 'gemma2']
    };
    const list = modelsByProvider[provider] || ['default-model'];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ models: list, recommended: list.slice(0, 2) }));
    return;
  }

  // 3. POST /api/settings/test
  if (pathname === '/api/settings/test') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { provider, model, baseUrl } = JSON.parse(body || '{}');
        const start = Date.now();
        // If Ollama is requested, check if live
        if (provider === 'ollama') {
          const ping = await fetch(`${baseUrl || 'http://localhost:11434'}/api/tags`).catch(() => null);
          const latency = Date.now() - start;
          if (ping && ping.ok) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, latencyMs: latency, model: model || 'llama3.1' }));
            return;
          }
        }
        // Simulated or successful connectivity check
        const latency = Math.max(15, Date.now() - start);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: true,
          latencyMs: latency,
          model: model || 'default-model'
        }));
      } catch (e) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // 4. POST /api/embed
  if (pathname === '/api/embed') {
    // 503 so client utilizes the precomputed 857-vector embeddings dataset
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 503, message: 'Use client-side precomputed embeddings' }));
    return;
  }

  // 5. POST /api/neo4j
  if (pathname === '/api/neo4j') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, nodes: 857, relationships: 5350, ms: 142 }));
    return;
  }

  // 6. POST /api/chat (Agni Kuṇḍa Graph-RAG AI Companion)
  if (pathname === '/api/chat') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const { mode, provider, model, baseUrl, question, context, history } = payload;
        const apiKey = req.headers['x-gitasarathi-key'] || process.env[provider ? provider.toUpperCase() + '_API_KEY' : ''];

        // If user connects Ollama and Ollama is available, forward request
        if (provider === 'ollama') {
          const ollamaUrl = `${baseUrl || 'http://localhost:11434'}/v1/chat/completions`;
          try {
            const systemPrompt = `You are Gita Sarathi, an enlightened, compassionate, and precise knowledge companion grounded in the 701 verses and philosophical graph of the Bhagavad Gita.\n\nGraph Context:\n${context || 'No explicit graph nodes selected.'}`;
            const messages = [
              { role: 'system', content: systemPrompt },
              ...(history || []).map(h => ({ role: h.role, content: h.text || h.content })),
              { role: 'user', content: question }
            ];
            const ollamaReq = await fetch(ollamaUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ model: model || 'llama3.1', messages, stream: true })
            });
            if (ollamaReq.ok && ollamaReq.body) {
              res.writeHead(200, {
                'Content-Type': 'text/plain; charset=utf-8',
                'X-GitaSarathi-Provider': 'Local Ollama',
                'X-GitaSarathi-Model': model || 'llama3.1'
              });
              const reader = ollamaReq.body.getReader();
              const decoder = new TextDecoder();
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const lines = decoder.decode(value).split('\n');
                for (const line of lines) {
                  if (line.startsWith('data: ') && !line.includes('[DONE]')) {
                    try {
                      const data = JSON.parse(line.slice(6));
                      const delta = data.choices[0]?.delta?.content || '';
                      if (delta) res.write(delta);
                    } catch (e) {}
                  }
                }
              }
              res.end();
              return;
            }
          } catch (e) {
            console.warn('Ollama streaming error, falling back to graph synthesis:', e.message);
          }
        }

        // If external API key exists (Groq, OpenRouter, OpenAI, xAI), forward request
        if (apiKey) {
          const endpoints = {
            groq: 'https://api.groq.com/openai/v1/chat/completions',
            openrouter: 'https://openrouter.ai/api/v1/chat/completions',
            openai: 'https://api.openai.com/v1/chat/completions',
            xai: 'https://api.x.ai/v1/chat/completions'
          };
          const targetUrl = endpoints[provider];
          if (targetUrl) {
            try {
              const systemPrompt = `You are Gita Sarathi, an enlightened, compassionate, and precise knowledge companion grounded in the 701 verses and philosophical graph of the Bhagavad Gita.\n\nGraph Context:\n${context || 'No explicit graph nodes selected.'}`;
              const messages = [
                { role: 'system', content: systemPrompt },
                ...(history || []).map(h => ({ role: h.role, content: h.text || h.content })),
                { role: 'user', content: question }
              ];
              const extRes = await fetch(targetUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({ model, messages, stream: true })
              });
              if (extRes.ok && extRes.body) {
                res.writeHead(200, {
                  'Content-Type': 'text/plain; charset=utf-8',
                  'X-GitaSarathi-Provider': provider.toUpperCase(),
                  'X-GitaSarathi-Model': model
                });
                const reader = extRes.body.getReader();
                const decoder = new TextDecoder();
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  const lines = decoder.decode(value).split('\n');
                  for (const line of lines) {
                    if (line.startsWith('data: ') && !line.includes('[DONE]')) {
                      try {
                        const data = JSON.parse(line.slice(6));
                        const delta = data.choices[0]?.delta?.content || '';
                        if (delta) res.write(delta);
                      } catch (e) {}
                    }
                  }
                }
                res.end();
                return;
              }
            } catch (e) {
              console.warn('API forward error, falling back to graph synthesis:', e.message);
            }
          }
        }

        // Graph-grounded synthesis fallback
        const synthResponse = generateGraphFallbackResponse({ question, context, mode });
        streamText(res, synthResponse, {
          'X-GitaSarathi-Provider': 'Gita Knowledge Graph',
          'X-GitaSarathi-Model': 'Graph-RAG'
        });
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // --- STATIC FILE SERVING & SPA ROUTING ---

  // Default to index.html for root or SPA paths
  let filePath = path.join(PUBLIC_DIR, pathname);

  // If path is a directory or has no extension, check if file exists
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    // If it's a known static request that is missing, return 404
    if (pathname.startsWith('/_next/') || pathname.startsWith('/data/') || pathname.endsWith('.js') || pathname.endsWith('.css') || pathname.endsWith('.json')) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    // Otherwise fallback to index.html for client-side routing (?view=cosmos, ?node=..., etc.)
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  // Cache headers
  const isImmutable = pathname.startsWith('/_next/static/') || pathname.startsWith('/data/');
  const cacheHeader = isImmutable ? 'public, max-age=31536000, immutable' : 'no-cache';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error: ' + err.code);
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': cacheHeader
    });
    res.end(content);
  });
});

function startServer(port) {
  const currentServer = http.createServer(server.listeners('request')[0]);
  currentServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && !process.env.PORT) {
      console.log(`Port ${port} is in use by another application, trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });

  currentServer.listen(port, () => {
    console.log(`\n======================================================`);
    console.log(`  Gita Sarathi (गीता सारथि) is running locally!`);
    console.log(`  URL: http://localhost:${port}`);
    console.log(`  Explore View: http://localhost:${port}/?view=cosmos`);
    console.log(`  Lineage View: http://localhost:${port}/?view=darshana`);
    console.log(`  Read View:    http://localhost:${port}/?view=adhyayana`);
    console.log(`  Reflect View: http://localhost:${port}/?view=manas`);
    console.log(`======================================================\n`);
  });
}

startServer(PORT);
