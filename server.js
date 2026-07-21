const path = require('path');
const fs = require('fs');
const os = require('os');
const express = require('express');
const { marked } = require('marked');
const sanitizeHtml = require('sanitize-html');

const PORT = process.env.PORT || 6001;
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

// ---- 知识库 RAG 引擎 ----
const kb = require('./kb');
const KB_SOURCE = process.env.KB_SOURCE ||
  '/Users/cenacai/WorkBuddy/2026-07-20-18-31-23/旅行平台基础QA';

function kbIngestTarget() {
  // 优先录入中文规范知识库子目录；若不存在则录入整个 KB_SOURCE
  const sub = path.join(KB_SOURCE, '知识库');
  try { fs.accessSync(sub); return sub; } catch { return KB_SOURCE; }
}
function kbAutoIngest() {
  const loaded = kb.load();
  if (loaded > 0) { console.log(`[KB] 已加载本地知识库 ${loaded} 条`); return; }
  const target = kbIngestTarget();
  const r = kb.ingestDir(target);
  console.log(`[KB] 首次自动录入 ${r.added} 条（来源 ${target}）`);
}

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

// 知识库检索 / 统计 / 重新录入
app.post('/api/kb/query', (req, res) => {
  const q = (req.body && req.body.query) || '';
  const topK = Math.min(Number(req.body && req.body.topK) || 5, 10);
  if (!q) return res.status(400).json({ error: 'query required' });
  try {
    const results = kb.query(q, topK);
    res.json({ results, total: kb.stats().count });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
});
app.get('/api/kb/stats', (req, res) => {
  res.json(kb.stats());
});
app.post('/api/kb/reingest', (req, res) => {
  try {
    kb.clear();
    const target = kbIngestTarget();
    const r = kb.ingestDir(target);
    res.json({ ok: true, ...r });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
});

// Serve the prototype (static frontend) at root
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use(express.static(path.join(__dirname, 'prototype')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'prototype', 'index.html')));

app.listen(PORT, () => {
  console.log(`LvxingTuijianChat running at http://localhost:${PORT}`);
  kbAutoIngest();
});
