const path = require('path');
const fs = require('fs');
const os = require('os');
const express = require('express');
const { marked } = require('marked');
const sanitizeHtml = require('sanitize-html');

const PORT = process.env.PORT || 6001;
const CTRIP_ENDPOINT = 'https://wendao-skill-prod.ctrip.com/skill/query';

// ---- 语义检索微服务 (Haystack 密集向量, Python :7001) ----
const { spawn } = require('child_process');
const SEMANTIC_URL = process.env.SEMANTIC_URL || 'http://127.0.0.1:7001';
const SEMANTIC_SVC = process.env.SEMANTIC_SVC || path.join(__dirname, 'semantic_service.py');
const SEMANTIC_PYTHON = process.env.SEMANTIC_PYTHON ||
  '/Users/cenacai/.workbuddy/binaries/python/envs/haystack/bin/python';

// 优先走 Haystack 密集向量；Python 不可用时返回 null，由调用方回退本地 TF-IDF
async function querySemantic(text, topK = 3) {
  try {
    const r = await fetch(SEMANTIC_URL + '/api/semantic/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: text, topK }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    return Array.isArray(d.results) ? d.results : null;
  } catch { return null; }
}
async function semanticHealth() {
  try {
    const r = await fetch(SEMANTIC_URL + '/api/semantic/health', { signal: AbortSignal.timeout(1500) });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}
async function startSemanticService() {
  if (process.env.SEMANTIC_AUTOSTART === '0') return;
  if (await semanticHealth()) { console.log('[semantic] 服务已在运行，跳过启动'); return; }
  try {
    const ps = spawn(SEMANTIC_PYTHON, [SEMANTIC_SVC], {
      env: { ...process.env, HF_ENDPOINT: process.env.HF_ENDPOINT || 'https://hf-mirror.com' },
      stdio: ['ignore', 'ignore', 'inherit'],
    });
    ps.on('error', (e) => console.log('[semantic] 启动失败(将使用本地 TF-IDF 兜底):', e.message));
    ps.on('exit', (code) => console.log('[semantic] 进程退出 code=' + code + ' (查询将回退本地 TF-IDF)'));
    console.log('[semantic] 已启动语义检索服务 ->', SEMANTIC_URL);
  } catch (e) {
    console.log('[semantic] 跳过启动:', e.message);
  }
}

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

    // 若上游返回 JSON 错误（如限流、参数错误），直接透传错误码，避免把错误 JSON 当作答案渲染
    if (text.trim().startsWith('{')) {
      try {
        const errJson = JSON.parse(text);
        if (errJson && errJson.error) {
          const status = /limit exceeded|rate|too many/i.test(text) ? 429 : 502;
          return res.status(status).json({ error: 'ctrip_upstream_error', message: errJson.error });
        }
      } catch {}
    }

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
// 检索策略：优先 Haystack 密集向量(语义)，Python 不可用时回退本地 TF-IDF
app.post('/api/kb/query', async (req, res) => {
  const q = (req.body && req.body.query) || '';
  const topK = Math.min(Number(req.body && req.body.topK) || 5, 10);
  if (!q) return res.status(400).json({ error: 'query required' });
  try {
    const sem = await querySemantic(q, topK);
    if (sem) return res.json({ results: sem, total: sem.length, engine: 'semantic' });
    const results = kb.query(q, topK);
    res.json({ results, total: kb.stats().count, engine: 'tfidf' });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
});
app.get('/api/kb/stats', async (req, res) => {
  const base = kb.stats();
  const h = await semanticHealth();
  res.json({
    ...base,
    semantic: h && h.ok
      ? { available: true, count: h.count, model: h.model, device: h.device }
      : { available: false },
  });
});
app.post('/api/kb/reingest', async (req, res) => {
  try {
    kb.clear();
    const target = kbIngestTarget();
    const r = kb.ingestDir(target);
    // 通知语义服务重建索引（若在线）
    let semanticReloaded = false;
    try {
      const rr = await fetch(SEMANTIC_URL + '/api/semantic/reindex', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: '{}', signal: AbortSignal.timeout(3000),
      });
      semanticReloaded = rr.ok;
    } catch {}
    res.json({ ok: true, ...r, semanticReloaded });
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
  startSemanticService();
});
