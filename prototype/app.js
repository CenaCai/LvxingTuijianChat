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
let clarifyState = { active: false, dest: '', collected: { days: 0, purpose: '', budget: '', from: '', notes: '' } };
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

// 记忆分类：稳定偏好（跨行程可默认继承）vs 行程特定（每次新行程需确认）
const STABLE_MEMORY_LABELS = new Set([
  '饮食偏好', '出行节奏', '住宿偏好', '交通偏好', '出行同伴',
  '兴趣主题', '忌讳/禁忌', '健康与体力', '语言偏好', '气候偏好', '购物偏好', '其他'
]);
const TRIP_MEMORY_LABELS = new Set([
  '预算习惯', '行程时长', '总预算', '学习目标', '证件与签证'
]);
function classifyMemory(label) {
  if (STABLE_MEMORY_LABELS.has(label)) return 'stable';
  if (TRIP_MEMORY_LABELS.has(label)) return 'trip';
  return 'stable'; // 未知标签默认安全侧：当作可继承偏好
}

// 用户在当前会话中已确认沿用的行程特定记忆标签
const confirmedTripMemLabels = new Set();
// 用户点击「重新设定」后排除的行程特定记忆标签（不再显示为待确认）
const rejectedTripMemLabels = new Set();

// 按目的地持久化用户「沿用/排除」历史行程特定记忆的选择，避免刷新后重复弹出
const TRIP_CONFIRM_KEY = 'travelmind_trip_confirmed';
const TRIP_REJECT_KEY = 'travelmind_trip_rejected';
function resetTripLabelStateForDest(dest) {
  confirmedTripMemLabels.clear();
  rejectedTripMemLabels.clear();
  if (!dest) return;
  try {
    const c = JSON.parse(localStorage.getItem(TRIP_CONFIRM_KEY) || '{}');
    const r = JSON.parse(localStorage.getItem(TRIP_REJECT_KEY) || '{}');
    if (c.dest === dest && Array.isArray(c.labels)) c.labels.forEach(l => confirmedTripMemLabels.add(l));
    if (r.dest === dest && Array.isArray(r.labels)) r.labels.forEach(l => rejectedTripMemLabels.add(l));
  } catch {}
}
function saveTripLabelState() {
  try {
    const dest = (tripState && tripState.dest) || '';
    localStorage.setItem(TRIP_CONFIRM_KEY, JSON.stringify({ dest, labels: Array.from(confirmedTripMemLabels) }));
    localStorage.setItem(TRIP_REJECT_KEY, JSON.stringify({ dest, labels: Array.from(rejectedTripMemLabels) }));
  } catch {}
}

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
resetTripLabelStateForDest(tripState && tripState.dest);

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
  const dest = t.match(/(北京|清迈|曼谷|普吉|东京|大阪|京都|北海道|首尔|济州|巴厘岛|新加坡|新疆|云南|西藏|成都|重庆|三亚|厦门|大理|丽江|香格里拉|青海|甘肃|川西|稻城|冰岛|瑞士|新西兰|欧洲|日本|泰国|越南|摩洛哥)/);
  if (dest && dest[1] !== trip.dest) {
    // 目的地切换时，重置沿用/排除状态、清空旧出发地，并加载新目的地对应的选择
    resetTripLabelStateForDest(dest[1]);
    trip.dest = dest[1];
    trip.from = '';
    changed = true;
  }

  // 出发地
  const from = t.match(/(?:从)?([\u4e00-\u9fa5]{2,6})(?:出发)/);
  if (from && from[1] !== trip.from) { trip.from = from[1]; changed = true; }

  if (changed) {
    trip.updatedAt = Date.now();
    tripState = trip;
    saveTrip();
    renderTripMemory();   // 行程要素变化即时反映到记忆中心面板
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
  if (id === 'memory') renderTripMemory();     // 切到记忆中心时按最新行程刷新当前行程记忆
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
    if (clarifyState.active) {
      handleClarifyReply(text);   // 处于澄清追问模式，解析用户补充信息
    } else {
      aiRespondReal(text);        // 真实调用AI 助手；失败则回退到本地演示回复
    }
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

// 判断用户输入是否信息不足：短句且未包含时长/预算/目的/明确确认
function isUnderSpecified(text, entities) {
  const t = (text || '').trim();
  if (t.length >= 45) return false;
  const entStr = entities.join(' ');
  const hasDuration = /时长|天|日|周|个月/.test(entStr);
  const hasBudget = /预算|元|万|钱/.test(t) || /元|万/.test(entStr);
  const hasPurpose = /学习|游学|蜜月|亲子|度假|出差|摄影|徒步|美食|购物|放松/.test(t);
  const normalized = t.replace(/[，。！？、\s]/g, '');
  const isConfirm = /^(沿用|确认|就用|可以|好|好啊|好吧|好的|行|行的|是的|没错|对的|对|ok|yes)(的|啊|吧|行)?$/i.test(normalized) && normalized.length < 25;
  if (isConfirm) return false;            // 明确确认不算信息不足
  return !hasDuration && !hasBudget && !hasPurpose;
}

// 构建当前轮次应注入的记忆上下文，并判断是否需要先澄清
function buildMemoryContext(text, entities) {
  const stable = [];
  const trip = [];
  extractedMemories.forEach(m => {
    const cls = classifyMemory(m.label);
    if (cls === 'trip') trip.push(m);
    else stable.push(m);
  });
  const under = isUnderSpecified(text, entities);
  // 用户已排除的行程记忆不再参与本次澄清与展示
  const activeTrip = trip.filter(m => !rejectedTripMemLabels.has(m.label));
  const unconfirmedTrip = activeTrip.filter(m => !confirmedTripMemLabels.has(m.label));
  // 信息不足时进入澄清追问：
  // - 有未确认的历史行程记忆 → 先问是否沿用
  // - 没有历史行程记忆 → 直接问槽位
  // - 历史记忆已全部确认/排除 → 把记忆拼入 prompt，不再追问
  const needsClarification = under && (unconfirmedTrip.length > 0 || activeTrip.length === 0);
  return {
    stable,
    trip: activeTrip,
    unconfirmedTrip,
    // 行程特定记忆默认不自动沿用，必须用户在本会话确认后才注入
    injectable: stable.concat(activeTrip.filter(m => confirmedTripMemLabels.has(m.label))),
    needsClarification,
    underSpecified: under,
  };
}

// ---- 聊天式澄清追问：解析缺失行程槽位 ----
function extractPurpose(text) {
  const t = (text || '').toLowerCase();
  if (/出差|商务|开会|办公|公务|团建|会议|考察|驻外|外派/.test(t)) return '出差';
  if (/游学|学习|上课|语言|进修|研学|留学|交换|访学/.test(t)) return '游学';
  if (/蜜月|结婚|新婚|度蜜月|旅拍|拍婚纱|婚纱照/.test(t)) return '度蜜月';
  if (/亲子|带娃|带孩子|带小孩|全家|一家|遛娃|宝宝|儿童/.test(t)) return '亲子游';
  if (/探亲|回家|回老家|看父母|看爸妈|奔丧|参加婚礼|喝喜酒|白事|红白事|老友|同学会|校友会|聚会|相聚|reunion/.test(t)) return '探亲';
  if (/购物|扫货|买买买|逛街|代购|血拼|买东西/.test(t)) return '购物游';
  if (/看病|就医|体检|养生|医保|疗养/.test(t)) return '看病/体检';
  if (/露营|康养|朝圣|避暑|避寒|city\s*walk|citywalk|探店|穷游|旅行|旅游|玩|度假|休闲|自由行|跟团|徒步|自驾游|周边游|散心|逛/.test(t)) return '旅行';
  return '';
}
function extractClarifyDays(text) {
  const t = (text || '');
  if (/一年/.test(t)) return 365;
  if (/大半年/.test(t)) return 180;
  if (/大半个月/.test(t)) return 20;
  if (/半个月/.test(t)) return 15;
  if (/寒假/.test(t)) return 30;
  if (/暑假/.test(t)) return 45;
  if (/寒暑假/.test(t)) return 40;
  if (/二十几天|二十来天/.test(t)) return 25;
  if (/十几天|十来天/.test(t)) return 15;
  if (/一周多|一个多星期/.test(t)) return 10;
  if (/小长假/.test(t)) return 5;
  if (/黄金周|大长假/.test(t)) return 7;
  if (/周末|双休/.test(t)) return 3;
  // 中文区间：两三天→3、三四天→4、三五天→5（取下界后的上界）
  const cnDigits = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
  const cr = t.match(/([一二两三四五六七八九十])\s*([三四五六七八九])\s*(天|日|周|个月)/);
  if (cr && cnDigits[cr[2]] > cnDigits[cr[1]]) {
    let n = cnDigits[cr[2]];
    if (cr[3] === '周') n *= 7; else if (cr[3] === '个月') n *= 30;
    return n;
  }
  // 范围：4到5天 / 4-5天（取上界）
  const rng = t.match(/([0-9]{1,3}(?:\.[0-9]+)?|[一二两三四五六七八九十]{1,3})\s*[-到至]\s*([0-9]{1,3}(?:\.[0-9]+)?|[一二两三四五六七八九十]{1,3})\s*(天|日|周|个月)/);
  if (rng) {
    const lo = /^\d/.test(rng[1]) ? parseFloat(rng[1]) : cn2num(rng[1]);
    const hi = /^\d/.test(rng[2]) ? parseFloat(rng[2]) : cn2num(rng[2]);
    let n = Math.max(lo, hi); if (rng[3] === '周') n *= 7; else if (rng[3] === '个月') n *= 30;
    if (n > 0 && n <= 730) return Math.round(n);
  }
  const m = t.match(/([0-9]{1,3}(?:\.[0-9]+)?|[一二两三四五六七八九十]{1,3})\s*(天|日|周|个月)/);
  if (!m) return 0;
  let n = /^\d/.test(m[1]) ? parseFloat(m[1]) : cn2num(m[1]);
  if (m[2] === '周') n *= 7;
  else if (m[2] === '个月') n *= 30;
  return n > 0 && n <= 365 ? Math.round(n) : 0;
}
function extractClarifyBudget(text) {
  const t = (text || '').toLowerCase();
  // 免费 / 零预算
  if (/免费|不花钱|预算0|零预算|0元/.test(t)) return '0元/免费';
  // 中文近似金额（无阿拉伯数字时兜底）
  if (/一两?百/.test(t)) return fmtYuan(200);
  if (/两三百/.test(t)) return fmtYuan(300);
  if (/三四百/.test(t)) return fmtYuan(400);
  if (/几百/.test(t)) return fmtYuan(500);
  if (/千把|一两千|两三千|三四千/.test(t)) return fmtYuan(2500);
  if (/五六千/.test(t)) return fmtYuan(5500);
  if (/七八千/.test(t)) return fmtYuan(7500);
  if (/小一万|一万出头|大几千/.test(t)) return fmtYuan(10000);
  if (/万把|一两万/.test(t)) return fmtYuan(15000);
  if (/两三万/.test(t)) return fmtYuan(25000);
  if (/三四万/.test(t)) return fmtYuan(35000);
  if (/几万/.test(t)) return fmtYuan(30000);
  // 识别「每天/每人/每晚」等按单位表述，保留 /天 语义
  const perUnit = /每\s*天|每日|每晚|每人|人均|\/\s*天|\/\s*人|\/\s*晚/.test(t);

  // 1) 关键词前缀：预算5000、每天1000、控制在800、不超过1000、大概1万、总共2万
  const m1 = t.match(/(?:预算|大概|大约|准备|花|要|用|控制在|不超过|低于|总共|合计|一共|总计|全部|估摸|差不多|每天|每日|人均|每晚)\s*([0-9]{1,6}(?:\.[0-9]+)?)(?:\s*(?:万|千|k|w|元|块|rmb|¥|刀|美元|美金|欧元|英镑))?(?:\s*(?:左右|以内|上下))?/);
  // 2) 纯货币单位：5000元、1万、300块、500刀
  const m2 = t.match(/([0-9]{1,6}(?:\.[0-9]+)?)\s*(?:万|千|k|w|元|块|rmb|¥|刀|美元|美金|欧元|英镑)(?:\s*(?:左右|以内|上下))?/);
  // 3) 每单位形式：1000/天、1000元/天、1000每天、1000一天
  const m3 = t.match(/([0-9]{1,6}(?:\.[0-9]+)?)\s*(?:元|块|rmb|¥)?\s*(?:\/|每|一)\s*(天|日|晚|人|夜)(?:\s*(?:左右|以内|上下))?/);

  let raw = '', suffix = '';
  if (m3) {
    raw = m3[1];
    suffix = '/' + m3[2];
  } else if (m1 || m2) {
    raw = (m1 || m2)[1];
    if (perUnit) suffix = '/天';
  }
  if (!raw) {
    if (/穷游|省钱|便宜|经济|低预算/.test(t)) return '经济型/省钱优先';
    if (/不差钱|高端|豪华|奢华|上限高|品质|上不封顶|没上限|随便花|不差钱/.test(t)) return '高端/品质优先';
    return '';
  }
  let n = parseFloat(raw);
  if (/万/.test(t)) n *= 10000;
  else if (/千/.test(t) || /k/.test(t)) n *= 1000;
  return fmtYuan(n) + suffix;
}
function extractClarifyFrom(text, dest) {
  const t = (text || '');
  const cities = ['北京','上海','广州','深圳','成都','重庆','杭州','南京','武汉','西安','天津','苏州','长沙','郑州','沈阳','青岛','宁波','东莞','无锡','厦门','福州','昆明','大连','哈尔滨','长春','石家庄','济南','合肥','南宁','贵阳','海口','兰州','银川','西宁','乌鲁木齐','拉萨','呼和浩特','南昌','太原','香港','台北','澳门'];
  // 显式：从X出发 / 出发地X / 我在X / 起点X
  const m1 = t.match(/(?:从|出发地|起点|我在)\s*([\u4e00-\u9fa5]{2,6})/);
  if (m1) {
    const c = cities.find(x => m1[1].includes(x) || x.includes(m1[1]));
    if (c && c !== dest) return c;
  }
  // X出发 / X飞 / X到 / X去 —— 取首个非目的地的城市
  const m2 = t.match(/([\u4e00-\u9fa5]{2,6})\s*(?:出发|起飞|飞|到|去|前往)/);
  if (m2) {
    const c = cities.find(x => m2[1].includes(x) || x.includes(m2[1]));
    if (c && c !== dest) return c;
  }
  // 兜底：文本里出现且非目的地的已知城市（应对「上海」这类只给城市名的简短回复）
  for (const c of cities) {
    if (t.includes(c) && c !== dest) return c;
  }
  return '';
}

function buildClarifyQuestion(collected, dest) {
  const known = [];
  if (collected.from) known.push(`从${collected.from}出发`);
  if (collected.days) known.push(`${collected.days}天`);
  if (collected.purpose) known.push(collected.purpose);
  if (collected.budget) known.push(`预算${collected.budget}`);
  const missing = [];
  if (!collected.from) missing.push('从哪里出发');
  if (!collected.days) missing.push('去几天');
  if (!collected.purpose) missing.push('是去出差还是旅行');
  if (!collected.budget) missing.push('预算大概多少');
  if (!collected.notes) missing.push('有没有什么其他要求，比如饮食、节奏、同伴');
  if (known.length) {
    return `收到，${known.join('、')}。还想确认一下：${missing.join('，')}呢？`;
  }
  return `我知道你想去${dest || '这个地方'}，请问${missing.join('，')}呢？`;
}
function isClarifyDone(text) {
  return /^(没有|暂无|没要求|不需要|就这些|够了|ok|好的|行|可以|就这样|随便|无)$/i.test(text.trim());
}
function handleClarifyReply(text) {
  const days = extractClarifyDays(text);
  const purpose = extractPurpose(text);
  const budget = extractClarifyBudget(text);
  const from = extractClarifyFrom(text, clarifyState.dest);
  const prefs = extractPreferences(text);
  const c = clarifyState.collected;
  // 如果原始输入已解析出出发地/天数，进入澄清时预填，避免重复询问
  if (!c.from) c.from = from || ((tripState && tripState.dest === clarifyState.dest) ? tripState.from : '');
  if (days && !c.days) c.days = days;
  if (purpose && !c.purpose) c.purpose = purpose;
  if (budget && !c.budget) c.budget = budget;
  // 容错：澄清回复只给纯数字（如「5」「5000」）时按槽位语义兜底
  const bareNum = text.replace(/[，。、\s]/g, '').match(/^(\d{1,6})$/);
  if (bareNum) {
    const n = parseInt(bareNum[1], 10);
    if (!c.days && n <= 365) c.days = n;
    else if (!c.budget) c.budget = fmtYuan(n);
  }
  if (prefs.length) {
    // 稳定偏好（饮食/节奏/同伴等）写入长期记忆；预算/时长等行程特定信息只用于本次 query，不落盘
    const stablePrefs = prefs.filter(p => classifyMemory(p.label) === 'stable');
    if (stablePrefs.length) addMemories(stablePrefs);
    const budgetPref = prefs.find(p => p.label === '预算习惯');
    if (budgetPref && !c.budget) c.budget = budgetPref.value;
    c.notes = prefs.map(p => p.label + '：' + p.value).join('；');
  }
  if (c.from && c.days && c.purpose && c.budget) {
    const full = `我想从${c.from}去${clarifyState.dest}${c.purpose}，${c.days}天，预算${c.budget}` +
      (c.notes ? '，' + c.notes : '') + '，请帮我规划行程。';
    clarifyState.active = false;
    aiRespondReal(full);
  } else {
    addMsg('ai', `<p>${esc(buildClarifyQuestion(c, clarifyState.dest))}</p>`);
  }
}

// ---- 阶段 2 展示用：抽取目的地/天数等实体（仅用于流程可视化）----
function extractEntities(text) {
  const ents = [];
  const days = text.match(/([0-9一二两三四五六七八九十]{1,3})\s*(天|日|周|个月)/);
  if (days) ents.push('时长: ' + days[0]);
  const from = text.match(/(?:从)?([\u4e00-\u9fa5]{2,6})(?:出发)/);
  if (from) ents.push('出发地: ' + from[1]);
  // 常见目的地关键词
  const dest = text.match(/(北京|清迈|曼谷|东京|大阪|京都|首尔|巴厘岛|新疆|云南|西藏|成都|重庆|三亚|厦门|大理|丽江|青海|甘肃|川西|北海道|冰岛|瑞士|新西兰|欧洲|日本|泰国|越南)/);
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

// 平台知识库检索：本地 TF-IDF RAG，经后端 /api/kb/query 提供。
// 失败（如后端未启动）时静默降级返回空数组，不影响主流程。
async function queryKb(text, topK = 3) {
  try {
    const r = await fetch('/api/kb/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: text, topK })
    });
    if (!r.ok) return [];
    const data = await r.json();
    return Array.isArray(data.results) ? data.results : [];
  } catch (e) {
    return [];
  }
}

// 为 KB 直接作答判断提取候选匹配词（2-4 字中文子串，去重）
function extractKbMatchTerms(text) {
  const t = (text || '').replace(/[^\u4e00-\u9fa5a-z0-9]/gi, '').toLowerCase();
  const terms = [];
  for (let len = 4; len >= 2; len--) {
    for (let i = 0; i + len <= t.length; i++) {
      terms.push(t.slice(i, i + len));
    }
  }
  return [...new Set(terms)];
}

// 判断当前查询是否可由平台知识库直接作答，从而跳过行程澄清/出发地追问。
// 触发条件：命中分数足够 + 是知识型问句 + 非行程规划请求 + 查询词与命中内容实质重叠。
function kbDirectAnswerable(kbResults, text) {
  if (!kbResults || !kbResults.length) return false;
  const top = kbResults[0];
  if ((top.score || 0) < 0.10) return false;
  // 明显的行程规划请求：不应由平台 FAQ 直接回答，仍需走澄清
  if (/我想去|我要去|打算去|准备去|计划去|规划|推荐.*地方|哪里好|什么地方|哪个城市|攻略|路线|行程|旅游.*去|旅行.*去/.test(text)) return false;
  // 知识型问句特征
  if (!/怎么|如何|吗|什么|哪些|多少|多少钱|为什么|能否|可以吗|介绍|区别|规则|政策|条件|流程|收费|费用/.test(text)) return false;
  const terms = extractKbMatchTerms(text);
  if (!terms.length) return false;
  // 若查询包含城市名，命中内容必须与「类别/子类别」匹配（避免问题正文里偶然提到城市造成的误匹配）
  const hasCity = /北京|上海|广州|深圳|成都|重庆|杭州|南京|武汉|西安|天津|苏州|长沙|郑州|沈阳|青岛|宁波|东莞|无锡|厦门|福州|昆明|大连|哈尔滨|长春|石家庄|济南|合肥|南宁|贵阳|海口|兰州|银川|西宁|乌鲁木齐|拉萨|呼和浩特|南昌|太原|香港|台北|澳门/.test(text);
  return kbResults.slice(0, 3).some(r => {
    const catPath = ((r.category || '') + '/' + (r.subcategory || '')).toLowerCase();
    if (terms.some(term => catPath.includes(term))) return true;
    if (hasCity) return false;
    const hay = catPath + ' ' + (r.question || '').toLowerCase();
    return terms.some(term => hay.includes(term));
  });
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

  // ③ 记忆检索 + 写入 + 相关性校验 + 平台知识库（RAG）检索
  setStage(2, 'active'); await sleep(300);
  const before = extractedMemories.map(m => m.label + '=' + m.value);
  if (prefs.length) addMemories(prefs);
  const added = prefs.filter(p => !before.includes(p.label + '=' + p.value));
  const memCtx = buildMemoryContext(text, entities);
  // 平台知识库检索（本地 TF-IDF，无需联网模型）
  const kbResults = await queryKb(text, 3);
  const kbDirect = kbDirectAnswerable(kbResults, text);
  setStage(2, 'done');

  // 阶段明细：稳定偏好 + 历史行程设定（区分是否沿用）
  let memDetail = `<div class="stage-detail"><span class="sd-tag sd-mem">记忆命中 ${extractedMemories.length}</span>`;
  if (memCtx.stable.length) {
    memDetail += `<span class="sd-sub">已注入 ${memCtx.stable.length} 条稳定偏好</span>` +
      memCtx.stable.slice(0, 3).map(m => `<code>${esc(m.label + ': ' + m.value)}</code>`).join(' ');
  }
  if (memCtx.unconfirmedTrip.length) {
    memDetail += `<span class="sd-sub">${memCtx.unconfirmedTrip.length} 条历史行程设定待确认</span>` +
      memCtx.unconfirmedTrip.slice(0, 3).map(m => `<code>${esc(m.label + ': ' + m.value)}</code>`).join(' ');
  }
  memDetail += '</div>';
  if (added.length) memDetail += `<div class="stage-detail"><span class="sd-tag sd-new">新增记忆 ${added.length}</span>` +
    added.map(m => `<code>${esc(m.label + ': ' + m.value)}</code>`).join(' ') + '</div>';
  setDetail((stageWrap._detail || '') + memDetail);

  // 平台知识库命中明细（位于记忆检索之后，便于对比「记忆 vs 知识库」两类来源）
  if (kbResults.length) {
    const kbDetail = `<div class="stage-detail"><span class="sd-tag sd-kb">📚 知识库命中 ${kbResults.length}${kbDirect ? ' · 直接引用' : ''}</span>` +
      kbResults.slice(0, 3).map(k => `<code>${esc((k.category || '') + '/' + (k.subcategory || '') + ' · ' + (k.question || '').slice(0, 16))}</code>`).join(' ') + '</div>';
    setDetail((stageWrap._detail || '') + kbDetail);
  }

  // 若输入信息不足，先澄清而非直接调用 AI。
  // 但若知识库已高置信命中且问题是平台 FAQ 型，直接由 KB 作答，不再进入行程澄清。
  if (memCtx.needsClarification && !kbDirect) {
    setStage(3, 'pending');
    setStage(4, 'pending');
    setStage(5, 'pending');
    if (memCtx.unconfirmedTrip.length > 0) {
      renderClarificationCard(text, memCtx.unconfirmedTrip, stageWrap);
    } else {
      // 没有历史行程记忆需要确认时，直接在阶段条气泡里进入聊天式槽位追问
      enterClarifyMode([], stageWrap, memCtx.injectable);
    }
    return;
  }

  // 行程类请求若仍缺少出发地，先追问出发地，避免 AI 给出随机的 inbound 航班。
  // 知识库可直接作答的 FAQ 问题例外。
  const isTripScene = ['general', 'route', 'guide', 'budget'].includes(scene);
  if (isTripScene && !(tripState && tripState.from) && !kbDirect) {
    setStage(3, 'pending');
    setStage(4, 'pending');
    setStage(5, 'pending');
    enterClarifyMode([], stageWrap, memCtx.injectable);
    return;
  }

  // ④ 工具调用：仅注入已确认/稳定的记忆 + 平台知识库参考，调用真实 AI 知识引擎
  setStage(3, 'active');
  const memStr = memCtx.injectable.slice(0, 6).map(m => `${m.label}:${m.value}`).join('；');
  let augmented = memStr
    ? `${text}\n\n【用户长期偏好，请在建议中优先考虑】${memStr}`
    : text;
  // 把命中的平台知识库官方口径拼进 prompt，让 AI 优先采用，避免编造
  if (kbResults && kbResults.length) {
    const kbRef = kbResults.slice(0, 3).map(k => {
      const ans = (k.answer || '').replace(/\s+/g, ' ').trim().slice(0, 380);
      return `Q: ${k.question || ''}\nA: ${ans}`;
    }).join('\n\n');
    augmented += `\n\n【平台知识库参考（请优先采用以下官方口径作答，不要与之一致性冲突）】\n${kbRef}`;
  }
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
    if (kbResults && kbResults.length) {
      const top = kbResults[0];
      answer += `<div class="mem-noted kb-noted">📚 已引用平台知识库 <b>${kbResults.length}</b> 条（${esc((top.category || '') + '/' + (top.subcategory || ''))}）作为官方参考口径。</div>`;
    }
    addMsg('ai', answer);
  } else {
    addMsg('ai', `<p>⚠️ 暂时连不上 AI 知识引擎，已回退到本地演示回复。</p>`);
    aiRespond(scene === 'route' || scene === 'guide' ? 'general' : scene, text);
  }
}

// 当输入过短且命中历史行程特定记忆时，弹出澄清卡片让用户确认是否沿用
function renderClarificationCard(originalText, tripMems, stageWrap) {
  const items = tripMems.map(m => `<div class="clar-item"><span class="clar-label">${esc(m.label)}</span><span class="clar-value">${esc(m.value)}</span></div>`).join('');
  const summary = tripMems.map(m => `${m.label}:${m.value}`).join('；');
  const id = 'clarify-' + Date.now();
  const card = document.createElement('div');
  card.className = 'clarify-card';
  card.id = id;
  card.innerHTML = `
    <div class="clarify-title">🧠 检测到历史行程设定</div>
    <p class="clarify-desc">你只说了「${esc(originalText)}」，但我之前记录过这些行程特定信息。它们对本次北京之行是否仍然适用？</p>
    <div class="clarify-list">${items}</div>
    <div class="clarify-actions">
      <button class="btn btn-primary clar-confirm">✅ 沿用这些设定</button>
      <button class="btn clar-reject">🔄 重新设定</button>
    </div>
    <p class="clarify-tip">选择“重新设定”后，我会用聊天方式问你几个简单问题（去几天、出差还是旅行、预算等），再给出建议。</p>
  `;
  stageWrap.appendChild(card);
  scrollChat();

  card.querySelector('.clar-confirm').addEventListener('click', () => {
    tripMems.forEach(m => confirmedTripMemLabels.add(m.label));
    card.remove();
    addMsg('user', '<p>沿用这些设定</p>');
    sendAsUserConfirm(originalText, summary);
  });
  card.querySelector('.clar-reject').addEventListener('click', () => {
    card.remove();
    addMsg('user', '<p>重新设定</p>');
    sendAsUserReject(originalText, tripMems);
  });
}

// 确认沿用：把行程特定记忆拼回 prompt，重新走完整 6 阶段
function sendAsUserConfirm(originalText, summary) {
  clarifyState.active = false;
  saveTripLabelState();
  const tid = addTyping();
  setTimeout(() => { remTyping(tid); aiRespondReal(originalText + '\n\n（本次行程沿用：' + summary + '）'); }, 400);
}

// 拒绝沿用：把当前行程特定记忆标记为已排除，进入聊天式澄清追问
function enterClarifyMode(tripMems, stageWrap, injectable) {
  if (tripMems && tripMems.length) {
    tripMems.forEach(m => rejectedTripMemLabels.add(m.label));
    saveTripLabelState();
  }
  clarifyState = {
    active: true,
    dest: (tripState && tripState.dest) || '',
    collected: {
      days: (tripState && tripState.days) || 0,
      purpose: '',
      budget: '',
      from: (tripState && tripState.from) || '',
      notes: ''
    }
  };
  // 从已确认的历史行程记忆里预填时长/总预算，减少重复提问
  if (injectable && injectable.length) {
    const memDays = injectable.find(m => m.label === '行程时长');
    if (memDays && !clarifyState.collected.days) {
      const d = extractClarifyDays(memDays.value);
      if (d) clarifyState.collected.days = d;
    }
    const memBudget = injectable.find(m => m.label === '总预算');
    if (memBudget && !clarifyState.collected.budget) {
      clarifyState.collected.budget = memBudget.value;
    }
  }
  const question = `<p>${esc(buildClarifyQuestion(clarifyState.collected, clarifyState.dest))}</p>`;
  if (stageWrap) {
    stageWrap.innerHTML += question;
    scrollChat();
    return;
  }
  const tid = addTyping();
  setTimeout(() => {
    remTyping(tid);
    addMsg('ai', question);
  }, 300);
}

function sendAsUserReject(originalText, tripMems) {
  addMsg('user', '<p>重新设定</p>');
  enterClarifyMode(tripMems);
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
  renderTripMemory();   // 预算/要求等记忆变化会同步到当前行程记忆面板
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

// 平台知识库面板：展示录入条数 / 分类数，并提供「重新录入」入口
async function renderKbPanel() {
  const stat = document.getElementById('kbStat');
  if (!stat) return;
  try {
    const r = await fetch('/api/kb/stats');
    if (!r.ok) { stat.innerHTML = '⚠️ 知识库状态获取失败'; return; }
    const d = await r.json();
    const cats = Object.keys(d.categories || {}).length;
    stat.innerHTML = `已录入 <b>${d.count}</b> 条问答 · 覆盖 <b>${cats}</b> 个业务分类`;
  } catch (e) {
    stat.innerHTML = '⚠️ 知识库服务未连接（对话仍可用，仅离线）';
  }
}

function initKb() {
  const btn = document.getElementById('kbReingestBtn');
  if (btn) btn.addEventListener('click', async () => {
    btn.disabled = true;
    const old = btn.textContent;
    btn.textContent = '⏳ 录入中…';
    try {
      const r = await fetch('/api/kb/reingest', { method: 'POST' });
      const d = await r.json();
      btn.textContent = `✅ 已录入 ${d.added || 0} 条`;
    } catch (e) {
      btn.textContent = '⚠️ 录入失败';
    }
    renderKbPanel();
    setTimeout(() => { btn.disabled = false; btn.textContent = old; }, 1600);
  });
  renderKbPanel();
}

// 金额格式化：>=1万 显示为「X万元」，否则「X元」
function fmtYuan(n) {
  if (n >= 10000) { const w = n / 10000; return (Math.round(w * 10) / 10) + '万元'; }
  return Math.round(n).toLocaleString('zh-CN') + '元';
}

// 由预算习惯记忆推导全程预算：支持「1000元/天 ×天数」或整笔预算或原文展示
function deriveTripBudget() {
  const bm = extractedMemories.find(m => m.label === '预算习惯');
  if (!bm) return null;
  const v = bm.value;
  const num = v.match(/(\d[\d,]*(?:\.\d+)?)\s*(万|千|元|块)?/);
  const perDay = /每?\s*天|每日|day/i.test(v);
  if (num) {
    let yuan = parseFloat(num[1].replace(/,/g, ''));
    if (num[2] === '万') yuan *= 10000;
    else if (num[2] === '千') yuan *= 1000;
    if (perDay && tripState && tripState.days) {
      const total = Math.round(yuan * tripState.days);
      return `${fmtYuan(total)}（${fmtYuan(yuan)}/天 × ${tripState.days}天）`;
    }
    let s = fmtYuan(yuan);
    if (!perDay && tripState && tripState.days) s += ` · 约${fmtYuan(yuan / tripState.days)}/天`;
    return s;
  }
  return v; // 非数字预算（穷游 / 不差钱 等）直接展示原文
}

// 由相关记忆汇总「特别要求」
function deriveTripNotes() {
  const labels = ['饮食偏好', '出行节奏', '出行同伴', '忌讳/禁忌', '健康与体力', '兴趣主题'];
  const items = extractedMemories.filter(m => labels.includes(m.label)).map(m => m.value);
  return items.length ? items.join('；') : '';
}

// 动态渲染记忆中心「当前行程记忆」面板（数据源 = tripState + 长期记忆）
function renderTripMemory() {
  const goal = document.getElementById('tripGoal');
  if (!goal) return;
  const budget = document.getElementById('tripBudget');
  const cities = document.getElementById('tripCities');
  const notes = document.getElementById('tripNotes');
  const meta = document.getElementById('tripMeta');

  if (!tripState || !tripState.dest) {
    goal.textContent = '尚未规划';
    budget.textContent = '未设置';
    cities.textContent = '—';
    notes.textContent = '暂无';
    if (meta) meta.textContent = '在「AI 对话」中说出目的地和天数即可自动生成';
    return;
  }
  const { dest, days, from } = tripState;
  const route = (from ? from + ' → ' : '') + dest;
  goal.textContent = `${route}${days ? ' · ' + days + '天' : ''}`;
  cities.textContent = route;
  budget.textContent = deriveTripBudget() || '未设置';
  notes.textContent = deriveTripNotes() || '暂无';
  if (meta) {
    const t = tripState.updatedAt
      ? new Date(tripState.updatedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '';
    meta.textContent = t ? `数据来自对话规划 · 更新于 ${t}` : '数据来自对话规划';
  }
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
  renderTripMemory();   // 同步刷新当前行程记忆面板
}

// ============================================
// Init
// ============================================
initCompare();
initMonitor();
initMemory();
initKb();
switchView('chat');
showCtx('default');
setStatus('就绪');

console.log('🧳 CSTS TravelChat 就绪');
