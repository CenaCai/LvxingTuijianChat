/* ============================================
   CSTS TravelChat — Interactive Logic
   ============================================ */

// ----- DOM -----
const views = document.querySelectorAll('.view');
const navItems = document.querySelectorAll('.nav-item');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const contextPanel = document.getElementById('contextPanel');
const ctxDefault = document.getElementById('ctxDefault');
const ctxMemory = document.getElementById('ctxMemory');
const ctxMemoryList = document.getElementById('ctxMemoryList');
const statusDot = document.querySelector('.status-dot');
const statusText = document.getElementById('statusText');
const toast = document.getElementById('toast');

// ----- State -----
let isTyping = false;
const MEM_KEY = 'travelmind_mem';
// 记忆中心「标签」下拉框静态配置（差旅偏好维度）
const MEM_TAGS = [
  '饮食偏好',
  '预算习惯',
  '出行节奏',
  '住宿偏好',
  '交通偏好',
  '出行同伴',
  '兴趣主题',
  '忌讳/禁忌',
  '健康与体力',
  '语言偏好',
  '气候偏好',
  '购物偏好',
  '证件与签证',
  '其他',
];
const DEFAULT_MEMORIES = [
  { label: '饮食偏好', value: '少辣、清淡为主', locked: true },
  { label: '预算习惯', value: '800-1200元/天（含住宿）', locked: false },
  { label: '出行节奏', value: '慢节奏、不赶路', locked: true },
  { label: '住宿偏好', value: '民宿/精品 300-500元/晚', locked: false },
];
function loadMemories() {
  try {
    const raw = localStorage.getItem(MEM_KEY);
    if (raw === null) return DEFAULT_MEMORIES.map(m => ({ ...m }));
    return JSON.parse(raw);
  } catch { return []; }
}
function saveMemories() {
  try { localStorage.setItem(MEM_KEY, JSON.stringify(extractedMemories)); } catch {}
}
let extractedMemories = loadMemories();

// ============================================
// View switching
// ============================================
function switchView(id) {
  views.forEach(v => v.classList.toggle('is-visible', v.id === `view-${id}`));
  navItems.forEach(n => n.classList.toggle('is-active', n.dataset.view === id));
}

navItems.forEach(n => n.addEventListener('click', () => switchView(n.dataset.view)));

// ============================================
// Toast & Status
// ============================================
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('show'), 2000);
}

function setStatus(text, busy) {
  statusText.textContent = text;
  statusDot.classList.toggle('busy', busy);
}

// ============================================
// Chat
// ============================================
function scrollChat() { chatMessages.scrollTop = chatMessages.scrollHeight; }

function addMsg(role, html) {
  const div = document.createElement('div');
  div.className = `chat-msg ${role}`;
  div.innerHTML = `<div class="msg-avatar">${role === 'user' ? '👤' : '🤖'}</div><div class="msg-bubble">${html}</div>`;
  chatMessages.appendChild(div);
  scrollChat();
  return div;
}

function addTyping() {
  const id = 'typing-' + Date.now();
  const div = document.createElement('div');
  div.className = 'chat-msg ai';
  div.id = id;
  div.innerHTML = '<div class="msg-avatar">🤖</div><div class="msg-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>';
  chatMessages.appendChild(div);
  scrollChat();
  return id;
}

function remTyping(id) { const e = document.getElementById(id); if (e) e.remove(); }

function addChips(labels) {
  const div = document.createElement('div');
  div.className = 'chat-msg ai';
  const chipsHtml = labels.map(l => `<button class="chip">${l}</button>`).join('');
  div.innerHTML = `<div class="msg-avatar">🤖</div><div class="msg-bubble"><div class="quick-chips">${chipsHtml}</div></div>`;
  chatMessages.appendChild(div);
  // Bind click
  div.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => handleChip(c.textContent)));
  scrollChat();
}

function handleChip(label) {
  if (label.includes('欧洲') || label.includes('游学')) sendAsUser('我想规划2个月欧洲游学，预算8万元');
  else if (label.includes('新疆') || label.includes('云南') || label.includes('对比')) sendAsUser('新疆15天自驾 vs 云南15天游学，预算1.2万');
  else if (label.includes('突发') || label.includes('Plan B') || label.includes('状况')) sendAsUser('大理暴雨预警，Day 6户外课程无法进行');
  else if (label.includes('执行 Plan B1') || label.includes('执行Plan B1')) sendAsUser('就Plan B1，帮我执行');
  else if (label.includes('Plan B2') || label.includes('查看 Plan B2')) aiRespond('planb2');
  else if (label.includes('证据')) aiRespond('evidence');
  else if (label.includes('预算')) sendAsUser('帮我做预算分配');
  else if (label.includes('路线') || label.includes('交通')) sendAsUser('帮我规划城市间的交通路线');
  else if (label.includes('攻略')) sendAsUser('我有一些旅行攻略想粘贴给你');
  else if (label.includes('保存')) showToast('✅ 已保存');
  else sendAsUser(label);
}

// Initial quick chips
document.querySelectorAll('#chatMessages .chip').forEach(c => {
  c.addEventListener('click', () => handleChip(c.textContent));
});

// ============================================
// Send message
// ============================================
function sendAsUser(text) {
  addMsg('user', `<p>${esc(text)}</p>`);
  const tid = addTyping();
  setTimeout(() => { remTyping(tid); aiRespond(detect(text), text); }, 700 + Math.random() * 500);
}

function sendMessage() {
  const text = chatInput.value.trim();
  if (!text || isTyping) return;
  chatInput.value = '';
  chatInput.style.height = 'auto';
  sendBtn.disabled = true;
  isTyping = true;
  setStatus('思考中...', true);

  addMsg('user', `<p>${esc(text)}</p>`);
  const tid = addTyping();

  setTimeout(() => {
    remTyping(tid);
    aiRespondReal(text);   // 真实调用AI 助手；失败则回退到本地演示回复
    isTyping = false;
    sendBtn.disabled = false;
    setStatus('就绪');
    chatInput.focus();
  }, 400 + Math.random() * 300);
}

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
chatInput.addEventListener('input', () => {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + 'px';
});

// ============================================
// Scene detection
// ============================================
function detect(text) {
  const t = text.toLowerCase();
  if (t.includes('欧洲') || t.includes('游学') || t.includes('两个月') || t.includes('2个月') || t.includes('留学')) return 'europe';
  if (t.includes('对比') || t.includes('新疆') || t.includes('云南') || t.includes('纠结') || t.includes('vs')) return 'compare';
  if (t.includes('暴雨') || t.includes('预警') || t.includes('突发') || t.includes('紧急') || t.includes('取消') || t.includes('关门')) return 'emergency';
  if (t.includes('执行') && (t.includes('plan') || t.includes('b1') || t.includes('b2'))) return 'execute';
  if (t.includes('plan b2') || t.includes('planb2')) return 'planb2';
  if (t.includes('证据')) return 'evidence';
  if (t.includes('预算') || t.includes('分配')) return 'budget';
  if (t.includes('记忆') || t.includes('偏好')) return 'memory';
  if (t.includes('路线') || t.includes('交通') || t.includes('行程路线') || t.includes('怎么去')) return 'route';
  if (t.includes('攻略') || t.includes('小红书') || t.includes('游记')) return 'guide';
  return 'general';
}

// ============================================
// AI Respond dispatcher
// ============================================
function aiRespond(scene, text) {
  switch (scene) {
    case 'europe': rEurope(text); break;
    case 'compare': rCompare(); break;
    case 'emergency': rEmergency(); break;
    case 'execute': rExecute(); break;
    case 'planb2': rPlanB2(); break;
    case 'evidence': rEvidence(); break;
    case 'budget': rBudget(); break;
    case 'memory': rMemory(); break;
    case 'route': aiRespondReal(text); break;
    case 'guide': aiRespondReal(text); break;
    default: rGeneral(); break;
  }
}

// ============================================
// Real backend: AI 助手 proxy
// ============================================
async function aiRespondReal(text) {
  const html = await ctripHtml(text);
  if (html && html.indexOf('⚠️ 查询失败') === -1) {
    addMsg('ai', html);
  } else {
    addMsg('ai', `<p>⚠️ 暂时连不上 AI 助手，已回退到本地演示回复。</p>`);
    aiRespond(detect(text), text);   // 回退到原 canned 逻辑
  }
}

// ============================================
// Context panel helpers
// ============================================
function showCtx(which) {
  ctxDefault.style.display = 'none';
  ctxMemory.style.display = 'none';
  if (which === 'default') ctxDefault.style.display = 'block';
  else if (which === 'memory') ctxMemory.style.display = 'block';
}

function updateCtxMemory() {
  if (extractedMemories.length === 0) { showCtx('default'); return; }
  showCtx('memory');
  ctxMemoryList.innerHTML = extractedMemories.map(m =>
    `<div class="ctx-mem-item"><span class="ctx-mem-label">${m.label}</span><span>${m.value}</span></div>`
  ).join('');
}

function addMemories(mems) {
  mems.forEach(m => { if (!extractedMemories.find(e => e.label === m.label)) extractedMemories.push(m); });
  saveMemories();
  updateCtxMemory();
  renderMemoryPage();
}

// ============================================
// Scene: Europe (Knowledge Base)
// ============================================
function rEurope(text) {
  const mems = [];
  if (text.includes('月')) { const m = text.match(/(\d+)\s*个?月/); if (m) mems.push({label:'行程时长',value:m[1]+' 个月'}); }
  if (text.includes('万')) { const m = text.match(/(\d+)\s*万/); if (m) mems.push({label:'总预算',value:m[1]+' 万元'}); }
  if (text.includes('清淡')||text.includes('少辣')) mems.push({label:'饮食偏好',value:'清淡、少辣'});
  if (text.includes('语言')||text.includes('学')) mems.push({label:'学习目标',value:'语言提升+文化体验'});
  if (text.includes('慢')||text.includes('不赶')) mems.push({label:'出行节奏',value:'慢节奏、不赶路'});
  addMemories(mems);

  addMsg('ai', `
    <p>好的！让我帮你理清思路 ✨</p>
    <div class="bubble-card">
      <div class="bubble-card-header">🔍 已提取的约束条件（已存入长期记忆）</div>
      <div class="bubble-card-row"><span class="l">行程时长</span><span class="v">2 个月</span></div>
      <div class="bubble-card-row"><span class="l">总预算</span><span class="v">¥80,000</span></div>
      <div class="bubble-card-row"><span class="l">目的</span><span class="v">语言学习 + 文化体验</span></div>
      <div class="bubble-card-row"><span class="l">饮食偏好</span><span class="v">清淡、少辣</span></div>
      <div class="bubble-card-row"><span class="l">出行节奏</span><span class="v">慢节奏</span></div>
    </div>
    <div class="bubble-warn">🧠 这些约束已存入长期记忆。即使在行程第45天，我也会记得今天的设定。</div>
    <p>接下来你可以粘贴收集的旅行攻略、签证资料，或让我规划具体路线。</p>
  `);

  addChips(['📅 帮我规划城市路线', '💰 帮我做预算分配', '📎 粘贴攻略链接']);
  showToast('🧠 5个约束已存入长期记忆');
}

// ============================================
// Scene: Compare
// ============================================
function rCompare() {
  addMsg('ai', `
    <p>好问题！让我并行查询两边数据...</p>
    <p style="font-size:12px;color:var(--ink2);">🔧 同时调用：天气MCP · 航班MCP · 住宿MCP · 知识库RAG</p>
  `);

  addMsg('ai', `
    <p>基于你之前的偏好（学习优先、体力友好、预算1.2万）：</p>
    <div class="compare-mini">
      <div class="compare-mini-item">
        <div>🏔️ 新疆自驾</div>
        <div class="big r">64</div>
        <div style="font-size:12px;color:var(--ink2);">综合得分</div>
      </div>
      <div class="compare-mini-item winner">
        <div>🌿 云南游学</div>
        <div class="big g">82</div>
        <div style="font-size:12px;font-weight:700;color:var(--green);">⭐ 综合得分</div>
      </div>
    </div>
    <div class="bubble-card">
      <div class="bubble-card-header">📊 6维度对比</div>
      <div class="bubble-card-row"><span class="l">💰 预算可控</span><span class="v">新疆72 · 云南84</span></div>
      <div class="bubble-card-row"><span class="l">📚 学习收益</span><span class="v">新疆58 · 云南91</span></div>
      <div class="bubble-card-row"><span class="l">😌 体力友好</span><span class="v">新疆46 · 云南82</span></div>
      <div class="bubble-card-row"><span class="l">🏞️ 自然体验</span><span class="v">新疆94 · 云南78</span></div>
    </div>
    <div class="bubble-warn">⚠️ 天气>7天准确率60% · 机票为当前中位数 · 课程评价3个月前更新</div>
    <p>推荐 <strong>🌿 云南15天游学</strong>。可在「方案对比」页调节权重查看变化。</p>
  `);

  addChips(['🔍 展开详细证据', '📊 去方案对比页调节权重', '💾 保存对比结果']);
}

// ============================================
// Scene: Emergency
// ============================================
function rEmergency() {
  addMsg('ai', `
    <p>🚨 <span class="detect-tag-inline auto">🤖 系统自动检测</span></p>
    <p style="font-size:11px;color:var(--ink2);">天气MCP · 15分钟轮询 · 置信度96%</p>
  `);

  addMsg('ai', `
    <p><strong>大理暴雨橙色预警</strong>，预计持续8小时。你的Day 6户外研学课程和洱海骑行将受影响。</p>
    <p>正在生成Plan B（结合你的约束：学习优先、预算可控、体力友好）...</p>
  `);

  addMsg('ai', `
    <p>2个替代方案：</p>
    <div class="planb-mini rec">
      <strong>⭐ Plan B1 — 室内备选方案（推荐）</strong>
      <p>大理州博物馆 + 白族扎染室内工坊，课程平移。骑行推迟至Day 8上午。</p>
      <div class="planb-mini-tags"><span>💰 无额外费用</span><span>📚 学习目标不变</span><span>⏰ 仅调整顺序</span></div>
    </div>
    <div class="planb-mini">
      <strong>Plan B2 — 提前转移丽江</strong>
      <p>提前1天去丽江。大理退1晚，丽江加1晚。Day 7课程顺延。</p>
      <div class="planb-mini-tags"><span>💰 额外~320元</span><span>🚌 需改签大巴</span><span>🏨 酒店退改</span></div>
    </div>
    <p>推荐 <strong>Plan B1</strong>。要执行吗？</p>
  `);

  addChips(['✅ 执行 Plan B1', '🔄 查看 Plan B2 详情']);
}

// ============================================
// Scene: Execute (MCP orchestration)
// ============================================
function rExecute() {
  const steps = [
    {name:'取消户外课程场地',api:'预订MCP: cancel_booking',cost:'¥0'},
    {name:'预订大理州博物馆',api:'预订MCP: create_booking',cost:'¥0'},
    {name:'确认扎染工坊场地',api:'预订MCP: book_local',cost:'¥0'},
    {name:'通知学员+更新行程',api:'通知MCP: send_wechat',cost:'¥0.75'},
  ];

  addMsg('ai', `
    <p>好的！激活 <strong>Skill: execute_rebook</strong> → Agent 按依赖关系自动编排 MCP 调用链：</p>
  `);

  const container = addMsg('ai', '');
  const card = document.createElement('div');
  card.style.cssText = 'margin-top:6px;';
  card.innerHTML = '<div id="orchChat"></div>';
  container.querySelector('.msg-bubble').appendChild(card);

  const orch = card.querySelector('#orchChat');
  steps.forEach((s,i) => {
    const d = document.createElement('div');
    d.className = 'orch-mini-step';
    d.id = `och-${i}`;
    d.innerHTML = `
      <div class="orch-mini-dot">${i+1}</div>
      <div style="flex:1;min-width:0;">
        <strong style="font-size:12px;">${s.name}</strong>
        <span style="font-size:10px;color:var(--ink2);display:block;">${s.api} · ${s.cost}</span>
      </div>
      <span style="font-size:10px;color:var(--ink3);" class="och-stat">等待</span>
    `;
    orch.appendChild(d);
  });

  const note = document.createElement('p');
  note.style.cssText = 'font-size:11px;color:var(--ink3);margin-top:8px;';
  note.textContent = '🔐 均为非支付类操作。退款/扣款将单独授权。';
  card.appendChild(note);

  scrollChat();

  // Animate
  const anim = (i, status, delay) => setTimeout(() => {
    const el = document.getElementById(`och-${i}`);
    if (!el) return;
    el.classList.remove('run','done');
    el.classList.add(status);
    const s = el.querySelector('.och-stat');
    if (status === 'run') { s.textContent = '执行中...'; s.style.color = 'var(--blue)'; }
    else if (status === 'done') { s.textContent = '✓ 完成'; s.style.color = 'var(--green)'; }
  }, delay);

  anim(0,'run',400); anim(0,'done',1100);
  anim(1,'run',1300); anim(2,'run',1300);
  anim(1,'done',1900); anim(2,'done',1900);
  anim(3,'run',2100); anim(3,'done',2600);

  setTimeout(() => {
    addMsg('ai', `
      <p>✅ <strong>全部执行完成！</strong></p>
      <p style="font-size:11px;color:var(--ink2);">总耗时3.2秒 · 4个MCP调用成功 · 总费用¥0.75</p>
      <p>15名学员已收到微信通知。</p>
    `);
    showToast('✅ Plan B1 执行完成');
  }, 2900);
}

// ============================================
// Other scenes
// ============================================
function rPlanB2() {
  addMsg('ai', `
    <p><strong>Plan B2 详情：</strong></p>
    <p>提前1天前往丽江。<br/>大理住宿退1晚(¥150退款) → 丽江加1晚(¥250) → 大巴改签(¥30)。</p>
    <p>💰 净增费用：约 ¥130<br/>📚 Day 7课程顺延1天，不影响内容。<br/>⚠️ 需要大巴票改签（提前2小时可免费改签）。</p>
    <p>相比Plan B1，多了交通改签的麻烦。建议还是 <strong>Plan B1</strong>。</p>
  `);
  addChips(['✅ 还是执行 Plan B1', '📞 联系课程老师确认']);
}

function rEvidence() {
  addMsg('ai', `
    <p>📋 <strong>证据链</strong></p>
    <div class="bubble-card">
      <div class="bubble-card-row"><span class="l">🌤️ 天气</span><span class="v">天气服务 · 2026-07-15</span></div>
      <div class="bubble-card-row"><span class="l">✈️ 机票</span><span class="v">实时数据 · ¥1,600-4,200</span></div>
      <div class="bubble-card-row"><span class="l">🏨 住宿</span><span class="v">住宿平台 · ¥150-350/晚</span></div>
      <div class="bubble-card-row"><span class="l">📚 课程</span><span class="v">知识库RAG · 4.6/5 (128条)</span></div>
    </div>
    <div class="bubble-warn">⚠️ 所有价格标注了查询时间。课程评价超6个月需重新确认。</div>
  `);
}

function rBudget() {
  addMsg('ai', `
    <p>基于2个月欧洲游学 + 8万预算：</p>
    <div class="bubble-card">
      <div class="bubble-card-header">💰 建议分配</div>
      <div class="bubble-card-row"><span class="l">✈️ 国际机票</span><span class="v">¥12,000</span></div>
      <div class="bubble-card-row"><span class="l">🏫 语言课程(8周)</span><span class="v">¥24,000</span></div>
      <div class="bubble-card-row"><span class="l">🏨 住宿(60晚)</span><span class="v">¥21,000</span></div>
      <div class="bubble-card-row"><span class="l">🍽️ 餐饮</span><span class="v">¥12,000</span></div>
      <div class="bubble-card-row"><span class="l">🚆 欧洲交通</span><span class="v">¥6,000</span></div>
      <div class="bubble-card-row"><span class="l">💡 应急</span><span class="v">¥5,000</span></div>
      <div class="bubble-card-row"><span class="l"><strong>合计</strong></span><span class="v"><strong>¥80,000</strong></span></div>
    </div>
    <div class="bubble-warn">⚠️ 机票为当前中位数 · 汇率1EUR≈7.8CNY</div>
  `);
  addChips(['📅 帮我规划城市路线', '💾 保存预算方案']);
}

function rMemory() {
  addMsg('ai', `
    <p>🧠 你的长期记忆：</p>
    <div class="bubble-card">
      <div class="bubble-card-row"><span class="l">🍽️ 饮食</span><span class="v">清淡、少辣</span></div>
      <div class="bubble-card-row"><span class="l">💰 预算</span><span class="v">800-1200元/天</span></div>
      <div class="bubble-card-row"><span class="l">🏃 节奏</span><span class="v">慢节奏、不赶路</span></div>
      <div class="bubble-card-row"><span class="l">🏨 住宿</span><span class="v">民宿/精品 300-500元</span></div>
    </div>
    <p>这些记忆会在未来的对话中自动激活。你可以随时编辑或删除。</p>
  `);
}

function rGeneral() {
  addMsg('ai', `
    <p>收到！我理解你想规划旅行 🗺️</p>
    <p>可以多告诉我一些细节：目的地、时间、预算、同行人数、喜欢的节奏？</p>
    <p>或者直接选一个场景体验 👇</p>
  `);
  addChips(['🇪🇺 2个月欧洲游学', '⚖️ 新疆 vs 云南对比', '🛡️ 突发状况 Plan B']);
}

// ============================================
// Shared: call Ctrip 问道, return safe HTML (or error marker)
// ============================================
// 对后端返回 HTML 做品牌中性化处理（AI 对话视图不暴露供应商品牌）
function sanitizeVendorBrand(html) {
  if (!html) return html;
  return html
    .replace(/携程智能旅行助手\s*小道\s*Wendao/gi, 'AI 旅行助手')
    .replace(/携程智能旅行助手/g, 'AI 旅行助手')
    .replace(/小道Wendao/gi, 'AI 旅行助手')
    .replace(/Wendao/gi, '')
    .replace(/携程问道/g, 'AI 助手')
    .replace(/携程/g, 'OTA')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

async function ctripHtml(query) {
  try {
    const res = await fetch('/api/ctrip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const raw = (data && data.html) ? data.html : '<p>' + esc((data && data.text) || '') + '</p>';
    return sanitizeVendorBrand(raw);
  } catch (e) {
    return '<p>⚠️ 查询失败，请重试。</p>';
  }
}

// ============================================
// Compare Page Logic (real Ctrip 问道)
// ============================================
const CMP_FOCUS = ['预算', '美食', '自然风光', '体验', '亲子', '人文'];
let cmpSelectedFocus = new Set(['预算', '体验']);

function initCompare() {
  const wrap = document.getElementById('cmpFocus');
  if (wrap) {
    wrap.innerHTML = CMP_FOCUS.map(f =>
      `<button class="focus-chip ${cmpSelectedFocus.has(f) ? 'on' : ''}" data-f="${f}">${f}</button>`).join('');
    wrap.querySelectorAll('.focus-chip').forEach(b => b.addEventListener('click', () => {
      const f = b.dataset.f;
      if (cmpSelectedFocus.has(f)) cmpSelectedFocus.delete(f); else cmpSelectedFocus.add(f);
      b.classList.toggle('on');
    }));
  }
  document.getElementById('cmpBtn')?.addEventListener('click', runCompare);
}

async function runCompare() {
  const a = (document.getElementById('cmpA')?.value || '').trim();
  const b = (document.getElementById('cmpB')?.value || '').trim();
  const aEl = document.getElementById('cmpAnswerA');
  const bEl = document.getElementById('cmpAnswerB');
  const sumEl = document.getElementById('cmpSummary');
  if (!a || !b) { showToast('⚠️ 请填写两个目的地'); return; }
  if (document.getElementById('cmpATitle')) document.getElementById('cmpATitle').textContent = a;
  if (document.getElementById('cmpBTitle')) document.getElementById('cmpBTitle').textContent = b;

  const focusTxt = [...cmpSelectedFocus].length ? '，侧重' + [...cmpSelectedFocus].join('、') : '';
  const qBase = `对比旅行目的地：${a} 和 ${b}。请从预算、美食、自然风光、体验、适合人群、大致费用区间等角度分析各自优劣${focusTxt}。`;
  if (aEl) aEl.innerHTML = '<p class="loading">⏳ 正在向 AI 助手查询「' + esc(a) + '」…</p>';
  if (bEl) bEl.innerHTML = '<p class="loading">⏳ 正在向 AI 助手查询「' + esc(b) + '」…</p>';
  if (sumEl) sumEl.innerHTML = '';
  setStatus('对比查询中...', true);

  const [htmlA, htmlB] = await Promise.all([
    ctripHtml(qBase + ` 先专门展开讲${a}。`),
    ctripHtml(qBase + ` 先专门展开讲${b}。`),
  ]);
  if (aEl) aEl.innerHTML = (htmlA || '<p>无结果</p>');
  if (bEl) bEl.innerHTML = (htmlB || '<p>无结果</p>');

  if (sumEl) {
    sumEl.innerHTML = '<p class="loading">⏳ 正在生成综合建议…</p>';
    const sum = await ctripHtml(`基于前面的对比，综合来看更推荐 ${a} 还是 ${b}？给出一句话结论和简要理由。`);
    sumEl.innerHTML = `<div class="rec-label">🤖 AI 助手 · 综合建议</div>` + (sum || '<p>无结果</p>');
  }
  setStatus('就绪');
  showToast('✅ 对比完成');
}

// ============================================
// Monitor Page Logic
// ============================================
document.querySelectorAll('.plan-card').forEach(card => {
  card.addEventListener('click', function() {
    this.parentElement.querySelectorAll('.plan-card').forEach(c => c.classList.remove('selected'));
    this.classList.add('selected');
  });
});

// Live query (real Ctrip 问道)
function initMonitor() {
  const input = document.getElementById('monQuery');
  const btn = document.getElementById('monQueryBtn');
  const out = document.getElementById('monitorResult');
  if (!btn || !out) return;
  const go = async () => {
    const q = (input.value || '').trim();
    if (!q) { showToast('⚠️ 请输入查询内容'); return; }
    out.innerHTML = '<p class="loading">⏳ 正在向 AI 助手查询「' + esc(q) + '」…</p>';
    setStatus('查询中...', true);
    const html = await ctripHtml(q);
    out.innerHTML = (html || '<p>无结果</p>');
    setStatus('就绪');
  };
  btn.addEventListener('click', go);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
}

// Execute orchestration
document.getElementById('execBtn')?.addEventListener('click', async function() {
  this.disabled = true;
  this.textContent = '⏳ Agent 编排中...';
  setStatus('执行中...', true);

  const steps = document.querySelectorAll('#orchChain .och-step');
  const animate = (el, cls, delay) => new Promise(r => setTimeout(() => {
    el.classList.remove('active','done');
    el.classList.add(cls);
    const s = el.querySelector('.och-status');
    if (cls === 'active') { s.textContent = '执行中...'; s.className = 'och-status run'; }
    else if (cls === 'done') { s.textContent = '✓ 完成'; s.className = 'och-status done'; }
    r();
  }, delay));

  await animate(steps[0], 'active', 300);
  this.textContent = '⏳ 步骤 1/4...';
  await animate(steps[0], 'done', 600);

  this.textContent = '⏳ 步骤 2-3/4(并行)...';
  await Promise.all([animate(steps[1],'active',200), animate(steps[2],'active',200)]);
  await Promise.all([animate(steps[1],'done',500), animate(steps[2],'done',500)]);

  this.textContent = '⏳ 步骤 4/4...';
  await animate(steps[3], 'active', 200);
  await animate(steps[3], 'done', 500);

  this.textContent = '✅ 全部执行完成';
  this.style.background = '#34c759';
  document.getElementById('execNote').innerHTML = '✅ <strong>执行完成</strong>：4个MCP调用全部成功。课程已取消→博物馆已预订→工坊已确认→15名学员已通知。总耗时3.2秒，费用¥0.75。';
  setStatus('已完成');
  showToast('✅ Plan B1 执行完成');
});

// ============================================
// Demo Button
// ============================================
const sleep = ms => new Promise(r => setTimeout(r, ms));

document.getElementById('demoBtn')?.addEventListener('click', async function() {
  this.disabled = true;
  this.textContent = '⏳ 演示中...';
  switchView('chat');
  setStatus('演示中...', true);

  // Clear
  chatMessages.innerHTML = '';

  // Phase 1: Inspiration
  addMsg('ai', '<p>🎬 <strong>Phase 1/6：灵感激发</strong> — LLM意图识别+实体提取</p>');
  await sleep(600);
  addMsg('user', '<p>我想出去玩两个月，学点东西，预算大概8万块</p>');
  await sleep(800);
  addMsg('ai', `
    <p>你好！从你的描述中我识别到：</p>
    <div class="bubble-card">
      <div class="bubble-card-header">🔍 意图识别结果</div>
      <div class="bubble-card-row"><span class="l">意图</span><span class="v">长途游学规划</span></div>
      <div class="bubble-card-row"><span class="l">时长</span><span class="v">2个月</span></div>
      <div class="bubble-card-row"><span class="l">预算</span><span class="v">¥80,000</span></div>
      <div class="bubble-card-row"><span class="l">置信度</span><span class="v">0.78（需追问）</span></div>
    </div>
    <p>还需要确认：目的地偏好？学习方向？</p>
  `);
  await sleep(1200);

  // Phase 2: Knowledge + Memory
  addMsg('ai', '<p>📚 <strong>Phase 2/6：知识库+记忆</strong> — RAG检索+碎片结构化+长期记忆存储</p>');
  addMsg('user', '<p>我想去欧洲，学语言和文化艺术，饮食清淡，不想太赶</p>');
  await sleep(1000);
  addMsg('ai', `
    <p>明白了！✅ 偏好已存入长期记忆。</p>
    <div class="bubble-card">
      <div class="bubble-card-header">🧠 已保存的记忆</div>
      <div class="bubble-card-row"><span class="l">目的地</span><span class="v">欧洲</span></div>
      <div class="bubble-card-row"><span class="l">饮食</span><span class="v">清淡</span></div>
      <div class="bubble-card-row"><span class="l">节奏</span><span class="v">慢节奏</span></div>
    </div>
    <p>同时激活 Skill: ingest_knowledge → 知识库MCP检索匹配的学校和签证信息...</p>
  `);
  addMemories([{label:'目的地',value:'欧洲'},{label:'饮食',value:'清淡'},{label:'节奏',value:'慢节奏'}]);
  showToast('🧠 偏好已存入长期记忆');
  await sleep(1500);

  // Phase 3: Compare
  addMsg('ai', '<p>⚖️ <strong>Phase 3/6：决策对比</strong> — 并行MCP调用+多维分析</p>');
  addMsg('user', '<p>我在新疆15天自驾和云南15天游学之间纠结</p>');
  await sleep(800);
  rCompare();
  await sleep(1500);

  // Phase 4: Memory recall (Day 45)
  addMsg('ai', '<p>🧠 <strong>Phase 4/6：长记忆召回</strong> — 时间快进到Day 45</p>');
  addMsg('user', '<p>（Day 45）今晚在佛罗伦萨有什么好吃的推荐？</p>');
  await sleep(800);
  addMsg('ai', `
    <p>让我查一下...同时检索到你的<strong>Day 1长期记忆</strong>：</p>
    <div class="bubble-card">
      <div class="bubble-card-header">🧠 已激活记忆（Day 1设定）</div>
      <div class="bubble-card-row"><span class="l">🍽️ 饮食</span><span class="v">清淡、少辣</span></div>
      <div class="bubble-card-row"><span class="l">💰 预算</span><span class="v">约¥800/天</span></div>
    </div>
    <p>推荐 <strong>Trattoria ZaZa</strong>（托斯卡纳家常菜，清淡橄榄油基底，人均€25）</p>
    <p style="color:var(--ink3);">💡 这就是长期记忆的价值——第45天记得第1天的偏好。</p>
  `);
  showToast('🧠 长期记忆在第45天自动激活');
  await sleep(1500);

  // Phase 5: Emergency
  addMsg('ai', '<p>🛡️ <strong>Phase 5/6：行程守护</strong> — 系统主动监控+Plan B生成</p>');
  addMsg('user', '<p>（系统通知）大理暴雨橙色预警！</p>');
  await sleep(600);
  rEmergency();
  await sleep(1200);

  // Phase 6: Execute
  addMsg('ai', '<p>⚡ <strong>Phase 6/6：Skill编排执行</strong> — Agent串联MCP调用链</p>');
  addMsg('user', '<p>就Plan B1，帮我执行！</p>');
  await sleep(600);
  rExecute();
  await sleep(3500);

  setStatus('就绪');
  this.disabled = false;
  this.textContent = '▶ 演示完整流程';
  showToast('✅ 6个Phase演示完成！');
});

// ============================================
// Memory page (real persistence)
// ============================================
function renderMemoryPage() {
  const el = document.getElementById('memLongTerm');
  if (!el) return;
  if (!extractedMemories.length) {
    el.innerHTML = '<p class="muted">暂无长期记忆，可在上方添加，或在聊天中描述偏好自动提取。</p>';
    return;
  }
  el.innerHTML = extractedMemories.map((m, i) => `
    <div class="mem-row">
      <span class="mem-emoji">${m.locked ? '🔒' : '📌'}</span>
      <div><strong>${esc(m.label)}</strong><em>${esc(m.value)}</em></div>
      <button class="mem-act" data-act="lock" data-i="${i}">${m.locked ? '🔓 解锁' : '🔒 锁定'}</button>
      <button class="mem-act" data-act="del" data-i="${i}">🗑 删除</button>
    </div>`).join('');
  el.querySelectorAll('.mem-act').forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.i, act = b.dataset.act;
    if (act === 'del') extractedMemories.splice(i, 1);
    else if (act === 'lock') extractedMemories[i].locked = !extractedMemories[i].locked;
    saveMemories();
    renderMemoryPage();
  }));
}

function initMemory() {
  // 用静态标签填充下拉框
  const sel = document.getElementById('memKey');
  if (sel) {
    const opts = MEM_TAGS.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
    sel.innerHTML = '<option value="">选择标签…</option>' + opts;
  }
  const addBtn = document.getElementById('memAddBtn');
  if (addBtn) addBtn.addEventListener('click', () => {
    const k = document.getElementById('memKey').value.trim();
    const v = document.getElementById('memVal').value.trim();
    if (!k) { showToast('⚠️ 请先选择标签'); return; }
    if (!v) { showToast('⚠️ 请填写记忆内容'); return; }
    addMemories([{ label: k, value: v }]);
    document.getElementById('memKey').value = '';
    document.getElementById('memVal').value = '';
    showToast('✅ 已添加记忆');
  });
  renderMemoryPage();
}

// ============================================
// Init
// ============================================
initCompare();
initMonitor();
initMemory();
switchView('chat');
showCtx('default');
setStatus('就绪');

console.log('🧳 CSTS TravelChat 就绪');
