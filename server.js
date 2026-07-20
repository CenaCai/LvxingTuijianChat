const path = require('path');
const fs = require('fs');
const os = require('os');
const express = require('express');
const { marked } = require('marked');
const sanitizeHtml = require('sanitize-html');

const PORT = process.env.PORT || 3000;
const CTRIP_ENDPOINT = 'https://wendao-skill-prod.ctrip.com/skill/query';

// Load optional API key: env var > ~/.config/tripai-skill/api_key (per tripai-skill convention)
function loadToken() {
  if (process.env.TRIPAI_API_KEY) return process.env.TRIPAI_API_KEY.trim();
  try {
    return fs.readFileSync(path.join(os.homedir(), '.config/tripai-skill/api_key'), 'utf8').trim();
  } catch {
    return '';
  }
}

const app = express();
app.use(express.json());

// Proxy: browser -> this server -> Ctrip 问道
app.post('/api/ctrip', async (req, res) => {
  const query = (req.body && req.body.query) || '';
  if (!query) return res.status(400).json({ error: 'query required' });

  const token = loadToken();
  const body = token ? { token, query, source: 'github' } : { query, source: 'github' };

  try {
    const upstream = await fetch(CTRIP_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await upstream.text();
    const html = sanitizeHtml(marked.parse(text), {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat([
        'img', 'h1', 'h2', 'h3', 'h4', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      ]),
      allowedAttributes: {
        '*': ['href', 'src', 'alt', 'class', 'target', 'rel'],
        'input': ['type', 'checked', 'disabled'],
      },
      allowedSchemes: ['http', 'https', 'mailto'],
    });
    res.json({ html, text });
  } catch (e) {
    res.status(502).json({ error: 'ctrip_upstream_error', message: String(e && e.message || e) });
  }
});

// Serve the prototype (static frontend) at root
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use(express.static(path.join(__dirname, 'prototype')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'prototype', 'index.html')));

app.listen(PORT, () => {
  console.log(`LvxingTuijianChat running at http://localhost:${PORT}`);
});
