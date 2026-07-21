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

// ----- 行程状态（chat ↔ 行程监控 联动的单一数据源）-----
const TRIP_KEY = 'travelmind_trip';
function loadTrip() {
  try {
    const raw = localStorage.getItem(TRIP_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveTrip() {
  try { localStorage.setItem(TRIP_KEY, JSON.stringify(tripState)); } catch {}
}
let tripState = loadTrip();

// 中文数字 → 阿拉伯数字（用于「五天」「十五天」等）
function cn2num(s) {
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  const map = { 一:1,二:2,两:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10 };
  if (s === '十') return 10;
  if (s.length === 1) return map[s] || 0;
  // 十X / X十 / X十X
  if (s[0] === '十') return 10 + (map[s[1]] || 0);
  if (s[s.length - 1] === '十') return (map[s[0]] || 0) * 10;
  if (s.includes('十')) { const [a, b] = s.split('十'); return (map[a] || 0) * 10 + (map[b] || 0); }
  return map[s] || 0;
}

// 从用户输入解析行程要素（目的地/天数/出发地），有更新则写入 tripState
function updateTripFromInput(text) {
  const t = text || '';
  let changed = false;
  const trip = tripState || { dest: '', days: 0, from: '', updatedAt: 0 };

  // 天数：支持「5天」「十五天」「2周」「一个月」
  const dm = t.match(/([0-9]{1,3}|[一二两三四五六七八九十]{1,3})\s*(天|日|周|个月)/);
  if (dm) {
    let n = cn2num(dm[1]);
    if (dm[2] === '周') n *= 7;
    else if (dm[2] === '个月') n *= 30;
    if (n > 0 && n <= 365 && n !== trip.days) { trip.days = n; changed = true; }
  }

  // 目的地关键词
  const dest = t.match(/(清迈|曼谷|普吉|东京|大阪|京都|北海道|首尔|济州|巴厘岛|新加坡|新疆|云南|西藏|成都|重庆|三亚|厦门|大理|丽江|香格里拉|青海|甘肃|川西|稻城|冰岛|瑞士|新西兰|欧洲|日本|泰国|越南|摩洛哥)/);
  if (dest && dest[1] !== trip.dest) { trip.dest = dest[1]; changed = true; }

  // 出发地
  const from = t.match(/(?:从)?([\u4e00-\u9fa5]{2,6})(?:出发)/);
  if (from && from[1] !== trip.from) { trip.from = from[1]; changed = true; }

  if (changed) {
    trip.updatedAt = Date.now();
    tripState = trip;
    saveTrip();
  }
  return changed;
}

// 依据目的地 + 天数动态切分行程时间线阶段（保证区间连续递增、不重叠）
function buildTimelinePhases(dest, days) {
  const d = dest || '目的地';
  days = (days && days > 0) ? days : 5;
  if (days === 1) return [{ day: 'Day 1', text: `${d}一日游 + 返程` }];
  if (days === 2) return [
    { day: 'Day 1', text: `抵达${d}，入住 + 城区游览` },
    { day: 'Day 2', text: `${d}核心景点 + 返程` },
  ];
  // days >= 3：Day1 抵达 + 末日返程 + 中间均分成若干段
  const midLabels = [
    `${d}城区 + 经典地标探索`,
    `${d}周边 / 自然人文深度体验`,
    `主题活动 + 自由行`,
    `${d}小众探索 + 美食`,
  ];
  const phases = [{ day: 'Day 1', text: `抵达${d}，酒店已确认` }];
  const midStart = 2, midEnd = days - 1;
  const midTotal = midEnd - midStart + 1;
  const segCount = Math.min(midLabels.length, midTotal,
    days <= 4 ? 1 : days <= 7 ? 2 : days <= 11 ? 3 : 4);
  let cursor = midStart;
  for (let i = 0; i < segCount; i++) {
    const remainDays = midEnd - cursor + 1;
    const take = Math.ceil(remainDays / (segCount - i));
    const s = cursor, e = cursor + take - 1;
    phases.push({ day: s === e ? `Day ${s}` : `Day ${s}-${e}`, text: midLabels[i] });
    cursor = e + 1;
  }
  phases.push({ day: `Day ${days}`, text: `返程 · 行程收官` });
  return phases;
}

// ============================================
// View switching
// ============================================
function switchView(id) {
  views.forEach(v => v.classList.toggle('is-visible', v.id === `view-${id}`));
  navItems.forEach(n => n.classList.toggle('is-active', n.dataset.view === id));
  if (id === 'monitor') renderMonitorTrip();   // 切到行程监控时按最新 chat 行程刷新
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
// Real backend: 6 阶段 Agent 流水线（对应 PRD 3.1）
// ①用户输入 → ②意图识别 → ③记忆检索 → ④工具调用 → ⑤聚合校验 → ⑥结构化输出
// ============================================
// (sleep 工具函数已在文件后段声明，运行时可用)

// 6 阶段定义（与 system-flow.html 流水线严格对应）
const STAGE_DEFS = [
  { icon: '👤', name: '用户输入', hint: '自然语言 / 上下文' },
  { icon: '🔍', name: '意图识别', hint: '实体提取 + 分类' },
  { icon: '🧠', name: '记忆检索', hint: '长短期记忆融合' },
  { icon: '🔧', name: '工具调用', hint: 'AI 知识引擎' },
  { icon: '📊', name: '聚合校验', hint: '约束匹配 + 标注' },
  { icon: '💬', name: '结构化输出', hint: '生成回复' },
];

// ---- 阶段 2 核心：从自然语言中提取差旅偏好，映射到 MEM_TAGS ----
function extractPreferences(text) {
  const t = (text || '').toLowerCase();
  const out = [];
  const push = (label, value) => {
    if (!value) return;
    if (!out.find(o => o.label === label)) out.push({ label, value, locked: false });
  };

  // 饮食偏好
  if (/不吃辣|不能吃辣|怕辣|少辣|微辣|清淡/.test(t)) push('饮食偏好', '少辣、清淡为主');
  else if (/无辣不欢|重口|爱吃辣|嗜辣/.test(t)) push('饮食偏好', '偏爱重口/辣');
  if (/素食|吃素|不吃肉/.test(t)) push('饮食偏好', '素食');
  const jikou = t.match(/不吃([\u4e00-\u9fa5]{1,6})/);
  if (jikou && !/辣|肉/.test(jikou[1])) push('忌讳/禁忌', '不吃' + jikou[1]);

  // 预算习惯
  const budget = text.match(/(?:预算|人均|每天|每人|日均)?\s*([0-9]{2,5})\s*(?:元|块|rmb|¥)?\s*(?:\/|每)?\s*(天|日|晚|人|夜)/i);
  if (budget) push('预算习惯', budget[1] + '元/' + budget[2]);
  else if (/穷游|省钱|预算有限|便宜/.test(t)) push('预算习惯', '经济型/省钱优先');
  else if (/不差钱|高端|奢华|豪华/.test(t)) push('预算习惯', '高端/品质优先');

  // 出行节奏
  if (/慢节奏|不赶路|悠闲|放松|深度游|躺平/.test(t)) push('出行节奏', '慢节奏、不赶路');
  else if (/特种兵|暴走|紧凑|赶路|打卡|多刷/.test(t)) push('出行节奏', '紧凑、多点打卡');

  // 住宿偏好
  if (/民宿/.test(t)) push('住宿偏好', '偏好民宿');
  else if (/青旅|青年旅舍|hostel/.test(t)) push('住宿偏好', '青旅/经济住宿');
  else if (/五星|豪华酒店|高档酒店/.test(t)) push('住宿偏好', '五星/高档酒店');
  else if (/精品酒店|设计酒店/.test(t)) push('住宿偏好', '精品/设计酒店');
  const stay = text.match(/([0-9]{3,5})\s*(?:元|块)?\s*\/?\s*晚/);
  if (stay) push('住宿偏好', stay[1] + '元/晚');

  // 交通偏好
  if (/自驾/.test(t)) push('交通偏好', '自驾');
  else if (/高铁|动车/.test(t)) push('交通偏好', '偏好高铁');
  else if (/不坐飞机|不飞|怕坐飞机/.test(t)) push('交通偏好', '不坐飞机');
  else if (/飞机|航班/.test(t)) push('交通偏好', '接受飞机');

  // 出行同伴
  if (/带娃|带孩子|亲子|带小孩|一家|全家/.test(t)) push('出行同伴', '亲子/带娃');
  else if (/带父母|带老人|带爸妈/.test(t)) push('出行同伴', '带父母/老人');
  else if (/情侣|蜜月|二人|和对象/.test(t)) push('出行同伴', '情侣/二人');
  else if (/独自|一个人|独游|单人/.test(t)) push('出行同伴', '独自出行');
  else if (/朋友|闺蜜|同学/.test(t)) push('出行同伴', '朋友结伴');

  // 兴趣主题
  const themes = [];
  if (/美食|吃货|探店/.test(t)) themes.push('美食');
  if (/自然|风光|山水|海岛|草原|雪山/.test(t)) themes.push('自然风光');
  if (/人文|历史|古迹|博物馆|文化/.test(t)) themes.push('人文历史');
  if (/摄影|拍照|出片/.test(t)) themes.push('摄影');
  if (/徒步|登山|户外|hiking/.test(t)) themes.push('徒步户外');
  if (/温泉/.test(t)) themes.push('温泉');
  if (themes.length) push('兴趣主题', themes.join('、'));

  // 忌讳/禁忌 & 健康体力
  if (/晕车/.test(t)) push('忌讳/禁忌', '易晕车');
  if (/晕船/.test(t)) push('忌讳/禁忌', '易晕船');
  if (/走不动|体力有限|腿脚不便|走路多了不行/.test(t)) push('健康与体力', '体力有限、避免长距离步行');
  if (/高反|高原反应/.test(t)) push('健康与体力', '注意高原反应');

  // 气候偏好
  if (/怕冷|喜欢温暖|想去暖和|避寒/.test(t)) push('气候偏好', '偏好温暖');
  else if (/怕热|避暑|喜欢凉爽/.test(t)) push('气候偏好', '偏好凉爽/避暑');

  // 购物偏好
  if (/购物|免税|买买买|扫货|奥莱/.test(t)) push('购物偏好', '重视购物/免税');

  return out;
}

// ---- 阶段 2 展示用：抽取目的地/天数等实体（仅用于流程可视化）----
function extractEntities(text) {
  const ents = [];
  const days = text.match(/([0-9一二两三四五六七八九十]{1,3})\s*(天|日|周|个月)/);
  if (days) ents.push('时长: ' + days[0]);
  const from = text.match(/(?:从)?([\u4e00-\u9fa5]{2,6})(?:出发)/);
  if (from) ents.push('出发地: ' + from[1]);
  // 常见目的地关键词
  const dest = text.match(/(清迈|曼谷|东京|大阪|京都|首尔|巴厘岛|新疆|云南|西藏|成都|重庆|三亚|厦门|大理|丽江|青海|甘肃|川西|北海道|冰岛|瑞士|新西兰|欧洲|日本|泰国|越南)/);
  if (dest) ents.push('目的地: ' + dest[1]);
  return ents;
}

// ---- 阶段进度条渲染 ----
function stepperHtml(states) {
  const steps = STAGE_DEFS.map((s, i) => {
    const st = states[i] || 'pending';
    return `<div class="stage-step ${st}">
      <div class="stage-ico">${st === 'done' ? '✓' : s.icon}</div>
      <div class="stage-meta"><div class="stage-name">${i + 1}. ${s.name}</div>
      <div class="stage-hint">${s.hint}</div></div></div>`;
  }).join('<div class="stage-arrow">›</div>');
  return `<div class="stage-stepper">${steps}</div>`;
}

async function aiRespondReal(text) {
  // 阶段状态：pending / active / done
  const states = ['pending', 'pending', 'pending', 'pending', 'pending', 'pending'];
  const bubble = addMsg('ai', stepperHtml(states));
  const stageWrap = bubble.querySelector('.msg-bubble');
  const setStage = (i, st) => { states[i] = st; stageWrap.innerHTML = stepperHtml(states) + (stageWrap._detail || ''); scrollChat(); };
  const setDetail = (h) => { stageWrap._detail = h; stageWrap.innerHTML = stepperHtml(states) + h; scrollChat(); };

  // ① 用户输入
  setStage(0, 'active'); await sleep(220); setStage(0, 'done');

  // ② 意图识别：分类 + 实体 + 偏好抽取
  setStage(1, 'active'); await sleep(280);
  const scene = detect(text);
  const sceneName = ({ europe: '知识问答', compare: '方案对比', emergency: '突发应对', budget: '预算规划', route: '路线交通', guide: '攻略推荐', memory: '偏好管理', general: '通用咨询' })[scene] || '通用咨询';
  const entities = extractEntities(text);
  const prefs = extractPreferences(text);
  const tripChanged = updateTripFromInput(text);   // 解析目的地/天数 → 行程监控联动
  setStage(1, 'done');
  setDetail(`<div class="stage-detail"><span class="sd-tag">意图</span>${sceneName}${entities.length ? ' · ' + entities.map(e => `<code>${esc(e)}</code>`).join(' ') : ''}</div>`);

  // ③ 记忆检索 + 写入
  setStage(2, 'active'); await sleep(300);
  const before = extractedMemories.map(m => m.label + '=' + m.value);
  if (prefs.length) addMemories(prefs);
  const added = prefs.filter(p => !before.includes(p.label + '=' + p.value));
  const hitMem = extractedMemories.slice(0, 4).map(m => `${m.label}: ${m.value}`);
  setStage(2, 'done');
  let memDetail = `<div class="stage-detail"><span class="sd-tag sd-mem">记忆命中 ${extractedMemories.length}</span>` +
    hitMem.map(m => `<code>${esc(m)}</code>`).join(' ') + '</div>';
  if (added.length) memDetail += `<div class="stage-detail"><span class="sd-tag sd-new">新增记忆 ${added.length}</span>` +
    added.map(m => `<code>${esc(m.label + ': ' + m.value)}</code>`).join(' ') + '</div>';
  setDetail((stageWrap._detail || '') + memDetail);

  // ④ 工具调用：把记忆注入 prompt，调用真实 AI 知识引擎
  setStage(3, 'active');
  const memCtx = extractedMemories.slice(0, 6).map(m => `${m.label}:${m.value}`).join('；');
  const augmented = memCtx
    ? `${text}\n\n【用户长期偏好，请在建议中优先考虑】${memCtx}`
    : text;
  const html = await ctripHtml(augmented);
  const ok = html && html.indexOf('⚠️ 查询失败') === -1;
  setStage(3, ok ? 'done' : 'pending');

  // ⑤ 聚合校验
  setStage(4, 'active'); await sleep(260); setStage(4, ok ? 'done' : 'pending');

  // ⑥ 结构化输出
  setStage(5, 'active'); await sleep(200); setStage(5, 'done');
  await sleep(150);

  if (ok) {
    // 折叠流程条，输出正式回复
    let answer = html;
    if (added.length) {
      answer += `<div class="mem-noted">🧠 已记住 ${added.length} 条偏好：` +
        added.map(m => `<b>${esc(m.value)}</b>`).join('、') + '，后续会自动带入建议。</div>';
    }
    if (tripChanged && tripState && tripState.dest) {
      answer += `<div class="mem-noted trip-noted">🛡️ 已同步「行程监控」：<b>${esc(tripState.dest)}${tripState.days ? ' · ' + tripState.days + '天' : ''}</b>，可在左侧「行程监控」查看动态时间线。</div>`;
      renderMonitorTrip();
    }
    addMsg('ai', answer);
  } else {
    addMsg('ai', `<p>⚠️ 暂时连不上 AI 知识引擎，已回退到本地演示回复。</p>`);
    aiRespond(scene === 'route' || scene === 'guide' ? 'general' : scene, text);
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

// 依据 chat 提取的 tripState 动态渲染「行程时间线」
function renderMonitorTrip() {
  const card = document.getElementById('timelineCard');
  if (!card) return;
  if (!tripState || !tripState.dest) {
    // 尚未在对话中规划行程 → 给出引导（保留默认演示于下方）
    if (!card.querySelector('.tl-empty-hint')) {
      const hint = document.createElement('div');
      hint.className = 'tl-empty-hint';
      hint.innerHTML = '💡 在「AI 对话」中说出目的地和天数（如「去清迈玩5天」），这里会自动生成你的专属行程时间线。以下为示例数据。';
      card.insertBefore(hint, card.firstChild.nextSibling);
    }
    return;
  }
  const { dest, days, from } = tripState;
  const phases = buildTimelinePhases(dest, days);
  const rows = phases.map((p, i) => {
    const st = i === 0 ? 'done' : (i === 1 ? 'active' : 'pending');
    const dotCls = st === 'active' ? 'tl-dot pulse' : 'tl-dot';
    const tag = st === 'done' ? '<span class="tl-tag ok">✅</span>'
      : st === 'active' ? '<span class="tl-tag warn">进行中</span>'
      : '<span class="tl-tag pending">⏳</span>';
    return `<div class="tl-item ${st === 'done' ? 'done' : ''}"><div class="${dotCls}"></div>` +
      `<div class="tl-info"><span class="tl-day">${esc(p.day)}</span><p>${esc(p.text)}</p></div>${tag}</div>`;
  }).join('');
  card.innerHTML =
    `<h3>📍 行程时间线 — ${esc(dest)} ${days || ''}天 <span class="tl-live">· 来自 AI 对话</span></h3>` +
    (from ? `<p class="tl-sub">出发地：${esc(from)} → 目的地：${esc(dest)}</p>` : '') +
    rows +
    `<p class="tl-note">⏱️ 时间线依据你在对话中规划的行程动态生成；天气/航班预警为产品演示。</p>`;
}

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
  renderMonitorTrip();   // 首次加载即按已保存行程渲染
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
