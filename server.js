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

// ---- Plan B 编排链费用（对接 MCP 计价服务；未接入时返回默认 0）----
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < (s || '').length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
app.post('/api/planb/orchestrate-cost', async (req, res) => {
  const dest = (req.body && req.body.dest) || '目的地';
  const days = Number(req.body && req.body.days) || 5;
  try {
    // TODO: 接入真实 MCP 价格服务，按 dest/days/plan 返回各步费用
    // 当前为演示模型：所有步骤 ¥0（前端文案与后端口径保持一致）
    const seed = hashStr(dest);
    const rebookCost = 80 + (seed % 120);                // B2 酒店退改 + 交通改签 ¥80–199
    const b2total = rebookCost;                          // B2 净增费用（通知费为 0）
    res.json({
      dest,
      days,
      steps: [
        { name: '取消受影响户外场地', api: '预订MCP: cancel_booking', cost: 0 },
        { name: `预订${dest}室内替代场地`, api: '预订MCP: create_booking', cost: 0 },
        { name: '确认特色工坊/活动', api: '预定MCP: book_local', cost: 0 },
        { name: '通知同行人 + 更新行程', api: '通知MCP: send_wechat', cost: 0 },
      ],
      notifyCost: 0,
      rebookCost,
      b2total,
    });
  } catch (e) {
    // 任何异常都返回全 0 兜底，避免前端卡住
    res.json({
      dest,
      days,
      steps: [
        { name: '取消受影响户外场地', api: '预订MCP: cancel_booking', cost: 0 },
        { name: `预订${dest}室内替代场地`, api: '预订MCP: create_booking', cost: 0 },
        { name: '确认特色工坊/活动', api: '预定MCP: book_local', cost: 0 },
        { name: '通知同行人 + 更新行程', api: '通知MCP: send_wechat', cost: 0 },
      ],
      notifyCost: 0,
      rebookCost: 0,
      b2total: 0,
    });
  }
});

// ============================================================
// 下单接口占位（Booking Stub）
// ------------------------------------------------------------
// 【重要】携程「问道」(Wendao) 是攻略型 API，只返回文本攻略，
//   不含库存确认 / 订单 / 支付链路，无法直接下单。
// 真实下单需对接以下任一渠道（均需单独申请资质与密钥）：
//   1. 携程商旅 MCP        openapi.ctripbiz.com   （含一键下单等工具）
//   2. 携程旅游开放平台     ttdstp.ctrip.com       （门票/活动/租车 下单·退款·核销）
//   3. 第三方 RollingGo MCP （实时库存 + 下单闭环）
// 下面三个接口按真实下单平台的契约设计（quote→create→order 查询），
//   当前为 stub（mock:true），拿到真实密钥后把 TODO 处替换为真实调用即可。
// ============================================================

// 简单内存订单表（演示用；生产应落库 + 幂等键）
const BOOKING_ORDERS = new Map();
function genOrderId() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rnd = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `TM${ymd}${rnd}`;
}

// 透明预估模型：无真实报价接口时，按 目的地/天数/出发地 稳定派生「预估价」。
// 明确标注 estimate:true，前端会显示「预估·非实时报价」，不会当作真实成交价。
function estimateItems({ dest = '目的地', days = 5, from = '', partySize = 1 }) {
  days = (days && days > 0) ? days : 5;
  partySize = (partySize && partySize > 0) ? partySize : 1;
  const seed = hashStr(dest + '|' + from);
  const nights = Math.max(1, days - 1);
  // 机票：往返，按目的地稳定派生中位价（¥1200–2800/人）
  const flightUnit = 1200 + (seed % 1600);
  // 酒店：¥300–800/晚（贴合记忆中「民宿/精品 300-500」的量级）
  const hotelUnit = 300 + ((seed >> 3) % 500);
  // 活动/门票：按天数派生，¥120–360/天
  const actUnit = 120 + ((seed >> 6) % 240);
  const items = [
    {
      type: 'flight',
      title: `${from ? from + ' ↔ ' : ''}${dest} 往返机票`,
      unit: flightUnit, qty: partySize, unitLabel: '人（往返）',
      subtotal: flightUnit * partySize,
      provider: 'ctrip.flight', bookApi: 'POST /flight/order',
    },
    {
      type: 'hotel',
      title: `${dest} 住宿 ${nights} 晚`,
      unit: hotelUnit, qty: nights, unitLabel: '晚',
      subtotal: hotelUnit * nights,
      provider: 'ctrip.hotel', bookApi: 'POST /hotel/order',
    },
    {
      type: 'activity',
      title: `${dest} 当地活动/门票 ${days} 天`,
      unit: actUnit, qty: days, unitLabel: '天',
      subtotal: actUnit * days,
      provider: 'ctrip.ttd', bookApi: 'POST /ttd/order',
    },
  ];
  const total = items.reduce((s, it) => s + it.subtotal, 0);
  return { items, total };
}

// ① 报价：给定行程要素，返回可下单条目 + 预估总价
app.post('/api/booking/quote', (req, res) => {
  const b = req.body || {};
  const dest = b.dest || '目的地';
  const days = Number(b.days) || 5;
  const from = b.from || '';
  const partySize = Number(b.partySize) || 1;
  // TODO: 接入真实渠道时，改为调用 携程商旅/开放平台 的实时报价接口
  const { items, total } = estimateItems({ dest, days, from, partySize });
  res.json({
    mock: true, provider: 'stub', estimate: true,
    currency: 'CNY',
    plan: b.plan || 'A',
    dest, days, from, partySize,
    items, total,
    note: '预估价·非实时报价。真实成交价需对接携程商旅/开放平台下单接口。',
  });
});

// ② 下单：创建订单（stub），返回 orderId + 待支付状态
app.post('/api/booking/create', (req, res) => {
  const b = req.body || {};
  const items = Array.isArray(b.items) ? b.items : [];
  const total = typeof b.total === 'number'
    ? b.total
    : items.reduce((s, it) => s + (Number(it.subtotal) || 0), 0);
  const orderId = genOrderId();
  const order = {
    mock: true, provider: 'stub',
    orderId,
    plan: b.plan || 'A',
    dest: b.dest || '', days: b.days || null, from: b.from || '',
    partySize: b.partySize || 1,
    items, total, currency: 'CNY',
    status: 'PENDING_PAYMENT',       // 真实链路：PENDING_PAYMENT→PAID→CONFIRMED
    createdAt: new Date().toISOString(),
    note: '演示订单·未对接真实支付。接口契约已就绪，接入携程商旅/开放平台后可真实出票。',
    // TODO: 真实下单时在此调用渠道 create_order，并写入渠道单号 channelOrderId
  };
  BOOKING_ORDERS.set(orderId, order);
  res.json(order);
});

// ③ 查单：按 orderId 查询订单状态
app.get('/api/booking/order/:id', (req, res) => {
  const order = BOOKING_ORDERS.get(req.params.id);
  if (!order) return res.status(404).json({ error: 'order_not_found' });
  res.json(order);
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
