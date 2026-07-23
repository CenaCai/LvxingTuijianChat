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

// ----- i18n（中文即 key；英文做覆盖）-----
let currentLang = (function () { try { return localStorage.getItem('lang') || 'zh'; } catch { return 'zh'; } })();
const I18N_EN = {};
function en(zh, e) { I18N_EN[zh] = e; }   // 注册英文覆盖（避免中文键转义问题）
function t(zh) { return (currentLang === 'en' && I18N_EN[zh] !== undefined) ? I18N_EN[zh] : zh; }
// 把突发状况里的 |DEST|/|DAY|/|HD| 占位还原为实际值（先 t() 翻译再还原，确保中英文都正确）
function fillInc(v, dest, day, hd) {
  return String(v).replace(/\|DEST\|/g, dest).replace(/\|DAY\|/g, day).replace(/\|HD\|/g, hd);
}

// 注册英文文案（键 = 页面/代码中的中文原文）
en('您的AI 差旅助手工作台', 'Your AI Travel Assistant Workspace');
en('AI 对话', 'AI Chat'); en('方案对比', 'Plan Compare'); en('行程监控', 'Trip Monitor'); en('记忆中心', 'Memory Center'); en('PRD 文档', 'PRD Docs');
en('🎬 不知道从哪开始？', '🎬 Not sure where to start?');
en('▶ 演示完整流程', '▶ Run Full Demo');
en('就绪', 'Ready');
en('你好！我是您的 AI 差旅助手 <strong>CSTS TravelChat</strong> 🧳', 'Hi! I\'m your AI travel assistant <strong>CSTS TravelChat</strong> 🧳');
en('在下方输入你的旅行想法，会由 <strong>AI 助手</strong> 实时回答（酒店 / 机票 / 火车票 / 景点 / 玩乐）。试试告诉我你的旅行想法吧～', 'Type your travel idea below — the <strong>AI assistant</strong> answers in real time (hotels / flights / trains / attractions / activities). Tell me what you\'re thinking!');
en('描述你的旅行想法...', 'Describe your travel idea...');
en('AI 会记住这些', 'AI Remembers');
en('你的偏好会随对话沉淀为长期记忆，跨行程复用。', 'Your preferences settle into long-term memory as you chat, reused across trips.');
en('预算偏好', 'Budget'); en('饮食口味', 'Diet'); en('出行节奏', 'Pace'); en('住宿要求', 'Lodging');
en('已提取的约束', 'Extracted Constraints');
en('⚖️ 方案对比决策', '⚖️ Plan Compare');
en('输入两个目的地，由<strong>AI 助手</strong>实时对比分析（真实数据）', 'Enter two destinations for the <strong>AI assistant</strong> to compare in real time (real data).');
en('目的地 A，如 罗马', 'Destination A, e.g. Rome'); en('目的地 B，如 米兰', 'Destination B, e.g. Milan');
en('开始对比', 'Compare');
en('你的侧重点（影响对比侧重）：', 'Your focus (affects comparison):');
en('目的地 A', 'Destination A'); en('目的地 B', 'Destination B');
en('输入后点击「开始对比」', 'Click "Compare" after entering destinations');
en('📋 数据说明', '📋 Data Notes');
en('对比内容由<strong>AI 助手</strong>实时生成，覆盖预算 / 美食 / 风光 / 体验 / 适合人群等', 'Comparison is generated live by the <strong>AI assistant</strong>, covering budget / food / scenery / experience / who it suits.');
en('每次点击「开始对比」都会重新向AI 助手发起真实查询', 'Every "Compare" click re-queries the AI assistant with real data.');
en('上方「侧重点」会注入到查询中，引导问道更关注你关心的维度', 'The "focus" above is injected into the query, steering the assistant toward dimensions you care about.');
en('🛡️ 行程实时守护', '🛡️ Trip Monitor');
en('天气 API 每15分钟轮询 · 航班状态实时跟踪 · 突发状况自动感知', 'Weather API polls every 15 min · real-time flight tracking · auto incident detection.');
en('实时查询：如「罗马到米兰 7月25日 列车」或「罗马 天气」或「罗马 暴雨 预警」', 'Live query: e.g. "Rome to Milan Jul 25 train" or "Rome weather" or "Rome storm alert"');
en('查询', 'Query');
en('输入上述问题，由AI 助手返回真实航班 / 天气 / 突发信息', 'Ask above and the AI assistant returns real flights / weather / incident info.');
en('以下时间线、Plan B 与编排链为<strong>产品演示</strong>示意，非真实监控数据。', 'The timeline, Plan B and orchestration chain below are <strong>product demos</strong>, not real monitoring data.');
en('天气监控', 'Weather'); en('航班状态', 'Flights'); en('景点/课程', 'Attractions/Courses');
en('OpenWeatherMap · 每15分钟', 'OpenWeatherMap · every 15 min'); en('FlightAware · 每30分钟', 'FlightAware · every 30 min'); en('官方公告 + 社交媒体', 'Official notices + social media');
en('正常', 'Normal'); en('1个预警', '1 alert');
en('📍 行程时间线 — 意大利 15 天文化艺术游学', '📍 Itinerary Timeline — Italy 15-day Culture & Art Study');
en('抵达罗马，酒店已确认', 'Arrive in Rome, hotel confirmed');
en('罗马文化探索，斗兽场、梵蒂冈博物馆', 'Rome culture: Colosseum, Vatican Museums');
en('佛罗伦萨，乌菲兹美术馆 + 手工皮具课', 'Florence: Uffizi Gallery + leather-craft class');
en('暴雨橙色预警，户外课程受阻', 'Orange rainstorm alert, outdoor classes disrupted');
en('米兰，大教堂 + 设计博物馆 + 意式烹饪课', 'Milan: Duomo + Design Museum + Italian cooking class');
en('威尼斯 + 运河游船 + 玻璃工艺 + 返程', 'Venice + canal cruise + glass craft + return');
en('💡 在「AI 对话」中规划好行程（如「去意大利玩15天」）后，这里会根据你的目的地和天数，模拟突发状况并生成专属 Plan B 备选方案。以下为示例数据。', 'After planning a trip in "AI Chat" (e.g. "15 days in Italy"), this panel simulates incidents and generates your Plan B. Sample data below.');
en('🤖 系统自动检测', '🤖 Auto-detected');
en('OpenWeatherMap API · 2026-07-15 14:32 · 置信度 96%', 'OpenWeatherMap API · 2026-07-15 14:32 · confidence 96%');
en('Day 6 — 暴雨橙色预警', 'Day 6 — Orange Rainstorm Alert');
en('预计持续8小时。户外写生课程 + 托斯卡纳乡间路段受影响。', 'Expected to last 8 hours. Outdoor sketching class + Tuscan country roads affected.');
en('🤖 AI 推荐 Plan B（综合你的约束）', '🤖 AI-recommended Plan B (based on your constraints)');
en('⭐ Plan B1 — 室内备选方案', '⭐ Plan B1 — Indoor Alternative');
en('推荐', 'Recommended');
en('佛罗伦萨乌菲兹室内导览 + 手工皮具工坊，课程平移。乡间骑行推迟至 Day 8。', 'Florence Uffizi indoor tour + leather workshop; classes shifted. Countryside ride moved to Day 8.');
en('💰 无额外费用', '💰 No extra cost'); en('📚 学习目标不变', '📚 Learning goal unchanged'); en('⏰ 仅调整顺序', '⏰ Order adjusted only');
en('Plan B2 — 提前转移米兰', 'Plan B2 — Move to Milan early');
en('备选', 'Alt');
en('提前1天去米兰。佛罗伦萨退1晚，米兰加1晚。Day 7课程顺延。', 'Go to Milan 1 day early. Cancel 1 Florence night, add 1 Milan night. Day 7 class deferred.');
en('💰 额外 ~320元', '💰 ~¥320 extra'); en('🚌 需改签大巴', '🚌 Bus rebooking'); en('🏨 酒店退改', '🏨 Hotel change');
en('⚙️ 点击确认后，Agent 自动编排 MCP 调用链', '⚙️ On confirm, the Agent auto-orchestrates the MCP call chain');
en('取消户外课程场地', 'Cancel outdoor class venue'); en('预订佛罗伦萨乌菲兹美术馆', 'Book Florence Uffizi'); en('确认扎染工坊场地', 'Confirm tie-dye workshop'); en('通知学员 + 更新行程', 'Notify students + update trip');
en('等待', 'Waiting'); en('并行', 'Parallel'); en('依赖', 'Dependency');
en('总费用 ¥0', 'Total ¥0'); en('预计 ≈12秒', '~12s est.'); en('需授权：是', 'Auth: Yes');
en('✅ 确认执行 Plan B1 — 授权 Agent 自动编排以上 4 步', '✅ Confirm Plan B1 — authorize the Agent to orchestrate the 4 steps above');
en('🔐 以上为非支付类操作。涉及退款/扣款将单独请求授权。', '🔐 These are non-payment actions. Refunds/charges require separate authorization.');
en('🧠 AI 记忆中心', '🧠 AI Memory Center');
en('你的偏好会随着对话逐渐沉淀，成为 AI 理解你的基础', 'Your preferences accumulate through conversation and become the basis for the AI to understand you.');
en('📌 长期记忆（跨行程复用）', '📌 Long-term Memory (cross-trip)');
en('选择标签…', 'Select a tag…'); en('值，如 清淡少辣', 'Value, e.g. light & mild'); en('添加', 'Add');
en('记忆保存在本机浏览器（localStorage），刷新不丢失；聊天中识别到的偏好也会自动归入此处。', 'Memories are stored in this browser (localStorage), safe on refresh; preferences detected in chat are auto-filed here.');
en('📋 当前行程记忆', '📋 Current Trip Memory');
en('行程目标', 'Trip Goal'); en('总预算', 'Total Budget'); en('目标城市', 'Destination'); en('特别要求', 'Special Requests');
en('尚未规划', 'Not planned'); en('未设置', 'Not set'); en('—', '—'); en('暂无', 'None');
en('在「AI 对话」中说出目的地和天数即可自动生成', 'Mention a destination and days in "AI Chat" to auto-generate');
en('🔐 记忆治理规则', '🔐 Memory Governance');
en('透明', 'Transparent'); en('可控', 'Controllable'); en('隐私', 'Privacy'); en('时效', 'Timeliness');
en('推荐时标注"基于你的XX偏好"', 'Recommendations show "based on your XX preference"');
en('可编辑、锁定、删除任意记忆', 'Edit, lock, or delete any memory');
en('敏感数据不入长期记忆', 'Sensitive data stays out of long-term memory');
en('6个月未用自动标记"待确认"', 'Unused for 6 months → flagged "needs confirmation"');
en('📚 平台知识库（本地 RAG）', '📚 Platform Knowledge Base (local RAG)');
en('加载中…', 'Loading…'); en('🔄 重新录入知识库', '🔄 Re-ingest Knowledge Base');
en('知识库优先由 Haystack 密集向量（语义）引擎检索，Python 服务离线时自动回退本地 TF-IDF；已录入你的「旅行平台基础QA」，对话时会自动检索并作为官方口径注入 AI。', 'KB prefers Haystack dense-vector (semantic) search, falling back to local TF-IDF when the Python service is offline; your "travel-platform QA" is ingested and injected as official grounding during chat.');
en('📄 核心功能 PRD', '📄 Core PRD');
en('产品定位 · 竞品分析 · 用户场景 · AI 逻辑 · 功能清单 · 设计阐述', 'Positioning · Competitors · Scenarios · AI logic · Features · Design');
en('1. 产品定位', '1. Positioning'); en('2. 竞品格局（四类参考）', '2. Competitor Landscape (4 categories)'); en('3. 核心差异化', '3. Core Differentiation');
en('4. 三大用户场景', '4. Three User Scenarios'); en('5. AI 数据流（6阶段）', '5. AI Data Flow (6 stages)'); en('6. 核心 Prompt 设计思路', '6. Core Prompt Design');
en('7. 防幻觉机制（5道防线）', '7. Anti-Hallucination (5 defenses)'); en('8. 功能清单（MVP → V2）', '8. Feature List (MVP → V2)'); en('9. 设计阐述', '9. Design Notes');
en('「CSTS TravelChat」是基于 LLM 的<strong>全流程 AI 差旅助手</strong>。CUI 对话 + GUI 卡片混合交互，覆盖"灵感激发 → 规划决策 → 行程守护"完整链路。', '"CSTS TravelChat" is an LLM-based <strong>full-journey AI travel assistant</strong>. Mixed CUI chat + GUI cards cover the full chain "inspire → plan → protect".');
en('市面上现有平台多为<strong>"单点能力"</strong>：OTA AI 负责问答推荐、企业差旅负责预订报销、TripIt/Wanderlog 负责行程管理、航司系统负责异常恢复。<strong>我们的差异化是把这些能力整合成一个可解释、可确认、可执行的 Agent 工作台。</strong>', 'Most platforms today offer <strong>"point solutions"</strong>: OTA AI for Q&A, corporate travel for booking, TripIt/Wanderlog for itineraries, airlines for recovery. <strong>Our difference: fuse these into one explainable, confirmable, executable Agent workbench.</strong>');
en('严格说，市面上"完整覆盖灵感、决策、记忆、工具执行、突发 Plan B"的平台还不多，但每一块能力都有成熟参考对象。', 'Few platforms fully cover inspire, decide, remember, execute tools, and Plan B — but every capability has a mature reference.');
en('类别', 'Category'); en('平台', 'Platform'); en('核心能力', 'Core Capability'); en('对我们的启发', 'Takeaway'); en('直接竞品', 'Direct Rivals'); en('企业差旅', 'Corporate Travel'); en('行程管理', 'Itinerary Mgmt'); en('异常恢复', 'Disruption Recovery');
en('OTA 内 LLM 助手，探索式问题、景点查询', 'In-OTA LLM assistant, exploratory Q&A, attraction search');
en('AI 不是替代搜索，而是补充复杂探索', 'AI complements, not replaces, search for complex exploration');
en('OTA 内置 chatbot，目的地/行程/预订前咨询', 'In-OTA chatbot for destination/itinerary/pre-booking');
en('参考"AI+交易平台"入口形态', 'Reference the "AI + booking" entry form');
en('WhatsApp/Instagram 旅行助手，人工审核防幻觉', 'WhatsApp/IG travel assistant, human review vs hallucination');
en('CUI 轻入口、白标给 DMO、人工纠偏', 'Light CUI entry, white-label to DMOs, human correction');
en('搜索+地图+评价+酒店/机票 → 动态 itinerary', 'Search+maps+reviews+hotels/flights → dynamic itinerary');
en('对话+可视化画布+后续预订伙伴', 'Chat + visual canvas + downstream booking partner');
en('多语言，灵感规划到旅中/旅后服务', 'Multilingual, from inspiration to in/after-trip service');
en('"全旅程助手"叙事', '"Whole-journey assistant" narrative');
en('语音交互，从发现到预订的 agentic features', 'Voice UX, agentic features from discovery to booking');
en('移动端语音入口+自然语言预订', 'Mobile voice entry + natural-language booking');
en('Travel+Expense+Payment 一体化 AI-first 平台', 'Travel+Expense+Payment unified AI-first platform');
en('企业版商业化参考', 'Enterprise commercialization reference');
en('AI bot Juno，自动化预订和报销', 'AI bot Juno, automated booking & reimbursement');
en('旅行+支出管理一体化', 'Unified travel + spend management');
en('大企业差旅管理、异常支持、政策合规', 'Large-enterprise travel, disruption support, policy compliance');
en('全球服务网络+合规能力', 'Global network + compliance');
en('传统差旅报销、审批、财务合规', 'Legacy T&E, approvals, finance compliance');
en('后台流程标杆（非前台体验）', 'Back-office benchmark (not front-end UX)');
en('邮件导入订单、自动生成 itinerary、航班提醒', 'Email import, auto itinerary, flight alerts');
en('自动化行程整理', 'Automated itinerary organization');
en('多人协作、地图、预算、任务分配', 'Multi-user collab, maps, budget, tasks');
en('GUI 工作台参考', 'GUI workbench reference');
en('AI 搜索、AI 筛选、评价摘要、住宿推荐', 'AI search, AI filter, review summary, stays');
en('AI 筛选+摘要能力', 'AI filter + summary');
en('实时航班延误预测+天气+对话式 AI', 'Real-time delay prediction + weather + conversational AI');
en('预测+感知+对话', 'Predict + perceive + converse');
en('航司运营中的 aircraft/crew/passenger recovery', 'Airline ops aircraft/crew/passenger recovery');
en('Plan B 不能只靠 LLM，需要规则+优化器+库存+人工确认', 'Plan B needs rules+optimizer+inventory+human confirm, not just LLM');
en('<strong>全链路整合</strong> — 灵感（类似 GuideGeek）→ 决策（类似 Google Travel Canvas）→ 记忆（向量数据库+治理）→ 执行（类似 Navan MCP 编排）→ 异常恢复（类似 AIRS + LLM）', '<strong>Full-chain integration</strong> — inspire (GuideGeek) → decide (Google Travel Canvas) → remember (vector DB + governance) → execute (Navan MCP) → recover (AIRS + LLM)');
en('<strong>可解释 Agent</strong> — 每次推荐标注数据来源(souce)+查询时间(fetched_at)+置信度+不确定性声明，类似 GuideGeek 的人工审核思路但用自动化实现', '<strong>Explainable Agent</strong> — every recommendation cites source + fetched_at + confidence + uncertainty, like GuideGeek\'s human review but automated');
en('<strong>长记忆系统</strong> — 独立于 LLM 上下文窗口的向量记忆，跨行程复用，第45天记得第1天的偏好', '<strong>Long-memory system</strong> — vector memory independent of the LLM context window, reused across trips, remembers Day-1 preferences on Day 45');
en('<strong>MCP 工具编排</strong> — 通过 MCP 协议标准化接入OTA 平台/天气/航班/知识库等外部服务，Agent 按依赖关系自动编排调用链', '<strong>MCP tool orchestration</strong> — standardized MCP access to OTA/weather/flight/KB services; the Agent auto-orchestrates the call chain by dependency');
en('<strong>双通道风险感知</strong> — 系统主动监控（类似 FlightSense 预测）+ 用户手动上报，确保异常不遗漏', '<strong>Dual-channel risk sensing</strong> — active monitoring (FlightSense-style prediction) + user reports, so nothing slips');
en('A · 长线游学知识库', 'A · Long-term Study Knowledge Base'); en('B · 复杂行程对比决策', 'B · Complex Compare & Decide'); en('C · 行程突发与动态调整', 'C · Disruption & Dynamic Adjust');
en('用户正规划意大利文化艺术游学，前期收集了大量小红书攻略、签证政策、语校与美术馆资料、个人学习计划。<strong>痛点</strong>：碎片信息难以结构化；第45天时无法回忆起第1天设定的饮食偏好或预算限制。<strong>AI方案</strong>：用户粘贴碎片→自动提取实体+约束→存入向量数据库→第45天自动激活相关记忆→主动提醒"根据Day1设定，你偏好清淡饮食"。', 'A user plans an Italy culture & art study trip, collecting Xiaohongshu guides, visa policies, school & museum info, personal plans. <strong>Pain</strong>: fragmented info is hard to structure; by Day 45 they forget Day-1 diet/budget. <strong>AI</strong>: paste fragments → auto-extract entities+constraints → vector DB → Day 45 re-activates memory → proactively reminds "per Day-1, you prefer light meals".');
en('用户在"罗马"和"米兰"间纠结，不知道先去哪个城市。<strong>痛点</strong>：信息分散（天气、机票、住宿、课程评价），多维度难以量化比较。<strong>AI方案</strong>：并行调用4个MCP Server→6维评分矩阵→用户调节权重实时重算→展示每项评分的数据来源和不确定性。', 'User hesitates between "Rome" and "Milan". <strong>Pain</strong>: scattered info (weather, flights, stays, course reviews), hard to compare quantitatively. <strong>AI</strong>: 4 parallel MCP calls → 6-dim score matrix → user tunes weights live → shows each score\'s source & uncertainty.');
en('旅行途中突发状况（景点关门、极端天气航班取消）。<strong>痛点</strong>：手动查询备选方案耗时；调整涉及多个环节（课程/交通/住宿）。<strong>AI方案</strong>：天气MCP 15分钟轮询→自动检测异常→Skill: generate_plan_b 生成2-3个替代方案→用户确认→Skill: execute_rebook 编排MCP链一键执行。', 'Mid-trip disruptions (closed sights, weather-cancelled flights). <strong>Pain</strong>: manual alternatives take time; changes touch many parts. <strong>AI</strong>: weather MCP polls 15 min → auto-detect → generate_plan_b → user confirms → execute_rebook runs the MCP chain in one click.');
en('👤 用户输入', '👤 User input'); en('🔍 意图识别+实体提取', '🔍 Intent + entity'); en('🧠 记忆检索(向量DB)', '🧠 Memory (vector DB)'); en('🔧 并行MCP调用', '🔧 Parallel MCP'); en('📊 聚合+约束校验', '📊 Aggregate + validate'); en('💬 结构化输出+不确定性声明', '💬 Structured output + uncertainty');
en('阶段', 'Stage'); en('输入 (Input)', 'Input'); en('要求输出 (Output)', 'Output'); en('约束条件（防幻觉）', 'Constraints (anti-hallucination)');
en('意图识别', 'Intent'); en('用户原始消息 + 上下文摘要', 'Raw message + context summary'); en('{intent, entities[], confidence, required_tools[]}', '{intent, entities[], confidence, required_tools[]}'); en('confidence &lt;0.7 必须追问；不得猜测具体数值', 'confidence &lt;0.7 → must ask; never guess numbers');
en('记忆检索', 'Retrieve'); en('user_id + intent + entities', 'user_id + intent + entities'); en('{memories[], similarity_score, saved_at}', '{memories[], similarity_score, saved_at}'); en('仅返回 similarity &gt;0.8；标注记忆保存时间', 'return only similarity &gt;0.8; stamp saved_at');
en('工具编排', 'Orchestrate'); en('task + required_tools + 依赖关系', 'task + required_tools + deps'); en('{tool_calls[], dependency_graph}', '{tool_calls[], dependency_graph}'); en('独立调用并行执行；有依赖的串行；标注每个 tool 的 source', 'independent calls parallel; dependent serial; cite each tool source');
en('方案生成', 'Generate'); en('tool_results + user_constraints + memories', 'tool_results + user_constraints + memories'); en('结构化方案 + evidence[] + uncertainty[]', 'structured plan + evidence[] + uncertainty[]'); en('每条数据强制携带 source + fetched_at；数值区间不可缩小', 'every datum must carry source + fetched_at; never narrow intervals');
en('Plan B', 'Plan B'); en('disruption_event + affected_segments[]', 'disruption_event + affected_segments[]'); en('{plans[], cost_impact, time_impact, risk}', '{plans[], cost_impact, time_impact, risk}'); en('必须≥2个方案；标注每个方案的代价和风险', '≥2 plans required; state each plan\'s cost & risk');
en('<strong>① 强制溯源</strong> — 所有数据类声明（价格、天气、时间）必须携带 source 和 fetched_at 字段，无来源=不可信', '<strong>① Mandatory sourcing</strong> — every data claim (price, weather, time) must carry source + fetched_at; no source = untrusted');
en('<strong>② 置信度门槛</strong> — 意图识别 confidence &lt;0.7 时强制追问用户；工具调用结果标记置信度', '<strong>② Confidence gate</strong> — intent confidence &lt;0.7 forces a question; tool results are confidence-tagged');
en('<strong>③ 数值区间保护</strong> — 工具返回的价格区间 [¥1600, ¥4200] 不可被模型缩小为"大约¥3000"', '<strong>③ Interval protection</strong> — a tool\'s price range [¥1600, ¥4200] must not be narrowed to "about ¥3000"');
en('<strong>④ 未知即声明</strong> — 无法获取的数据标注为"暂未获取"而非编造默认值，类似 GuideGeek 人工审核思路', '<strong>④ Declare the unknown</strong> — unavailable data is marked "not yet fetched", not fabricated, like GuideGeek\'s human review');
en('<strong>⑤ 人工确认卡点</strong> — 涉及支付/退款/隐私的操作，Agent 不可自动执行，必须用户逐项勾选确认', '<strong>⑤ Human confirm gate</strong> — payments/refunds/privacy need per-item user confirmation; the Agent cannot auto-run them');
en('优先级', 'Priority'); en('功能', 'Feature'); en('MVP', 'MVP'); en('V1.1', 'V1.1'); en('V2', 'V2'); en('参考对象', 'Reference');
en('对话式行程规划+约束提取', 'Conversational planning + constraint extraction'); en('多方案对比+权重调节', 'Multi-plan compare + weight tuning'); en('突发事件感知+Plan B', 'Incident sensing + Plan B');
en('长期/短期记忆管理', 'Long/short-term memory'); en('知识库上传+自动结构化', 'KB upload + auto-structure'); en('MCP 编排退改签执行', 'MCP orchestrated rebooking'); en('多人协作行程规划', 'Multi-user planning'); en('语音输入+实时翻译', 'Voice input + live translate'); en('企业差旅政策合规', 'Corporate policy compliance');
en('GuideGeek / AI 助手', 'GuideGeek / AI assistant'); en('Google Travel Canvas', 'Google Travel Canvas'); en('FlightSense / AIRS', 'FlightSense / AIRS'); en('自研向量记忆系统', 'In-house vector memory'); en('RAG + TripIt 自动导入', 'RAG + TripIt import'); en('Navan / TravelPerk', 'Navan / TravelPerk'); en('Wanderlog', 'Wanderlog'); en('ixigo', 'ixigo'); en('SAP Concur / Amex GBT', 'SAP Concur / Amex GBT'); en('SAP Concur / Amex GBT', 'SAP Concur / Amex GBT');
en('为什么 CUI + GUI？', 'Why CUI + GUI?');
en('对话（CUI）降低表达门槛——用户不需要填表单，像跟朋友聊天一样描述想法；结构化卡片（GUI——对比矩阵、时间线、编排链）补充纯文本的不足。参考 GuideGeek 的 WhatsApp 轻入口 + Google Travel Canvas 的可视化画布。', 'Chat (CUI) lowers the expression barrier — no forms, just talk like a friend; structured cards (GUI — compare matrix, timeline, chain) fill text\'s gaps. See GuideGeek\'s light WhatsApp entry + Google Travel Canvas visual.');
en('LLM 能力边界（做不到什么）', 'LLM limits (what it can\'t do)');
en('做不到精准数值预测——机票价格/天气必须依赖外部 API，LLM 只负责推理和推荐', 'No precise numeric prediction — fares/weather need external APIs; LLM only reasons & recommends');
en('长对话记忆衰减——超过 100k token 后对早期信息召回准确率下降，因此独立记忆系统比依赖上下文窗口更可靠', 'Long-chat memory decay — beyond 100k tokens recall drops, so an independent memory system beats the context window');
en('幻觉不可避免但可治理——通过 5 道防线（溯源+置信度+区间保护+未知声明+确认卡点）将幻觉率控制在可接受范围', 'Hallucination is unavoidable but governable — 5 defenses (sourcing+confidence+interval+unknown+confirm) keep it acceptable');
en('Plan B 不能只靠 LLM 生成文案——背后需要规则引擎+库存/订单工具+人工确认，参考 AIRS disruption recovery', 'Plan B text can\'t come from LLM alone — it needs a rules engine + inventory/order tools + human confirm (AIRS)');
en('未来演进', 'Future Roadmap');
en('Agent 自主执行：从"建议"到"执行"，用户授权后 Agent 可自主完成机票/酒店/课程预订', 'Autonomous Agent: from "suggest" to "execute" — with user consent it books flights/hotels/courses');
en('多模态输入：拍照提取签证文件/手写笔记/机票截图→结构化信息', 'Multimodal input: photo → visa docs / notes / ticket screenshots → structured info');
en('社交协同：多人行程协同规划、费用分摊、偏好融合（参考 Wanderlog）', 'Social: multi-user planning, cost split, preference merge (Wanderlog)');
en('端侧部署：核心记忆和偏好本地存储，保护隐私+降低延迟', 'On-device: core memory & preferences stored locally for privacy + latency');
en('企业版：接入企业差旅政策（参考 Navan/SAP Concur），自动合规校验', 'Enterprise: corporate travel policy (Navan/SAP Concur) with auto compliance');
en('CSTS TravelChat — 您的AI 差旅助手', 'CSTS TravelChat — Your AI Travel Assistant');

// 动态内容（app.js 生成）英文覆盖
en('🧠 偏好已存入长期记忆', '🧠 Preferences saved to long-term memory');
en('🧠 长期记忆在第45天自动激活', '🧠 Long-term memory auto-activated on Day 45');
en('✅ 6个Phase演示完成！', '✅ 6-phase demo complete!');
en('⏳ 演示中...', '⏳ Demonstrating...');
en('⚠️ 请填写两个目的地', '⚠️ Please enter both destinations');
en('✅ 对比完成', '✅ Comparison done');
en('🔒 该记忆已锁定，无法删除（请先点击「🔓 解锁」）', '🔒 This memory is locked and cannot be deleted (unlock first)');
en('⚠️ 请先选择标签', '⚠️ Select a tag first'); en('⚠️ 请填写记忆内容', '⚠️ Enter the memory value'); en('✅ 已添加记忆', '✅ Memory added');
en('⚠️ 请输入查询内容', '⚠️ Enter a query'); en('⚠️ 查询失败，请重试。', '⚠️ Query failed, please retry.');
en('暂无长期记忆，可在上方添加，或在聊天中描述偏好自动提取。', 'No long-term memory yet. Add above, or describe preferences in chat to auto-extract.');
en('数据来自对话规划', 'From your chat plan'); en('数据来自对话规划 · 更新于 ', 'From your chat plan · updated ');
en('🔄 重置', '🔄 Reset');
en('重置当前行程（保留长期记忆）', 'Reset current trip (keep long-term memories)');
en('当前行程已是空的，无需重置', 'Current trip is already empty');
en('✅ 已重置当前行程（长期记忆保留）', '✅ Current trip reset (long-term memories kept)');
en('✅ 已重置', '✅ Reset');
en('💡 在「AI 对话」中说出目的地和天数（如「去清迈玩5天」），这里会自动生成你的专属行程时间线。以下为示例数据。', 'Mention a destination and days in "AI Chat" (e.g. "5 days in Chiang Mai") and your timeline appears here. Sample data below.');
en('🛰️ 当前监控行程：', '🛰️ Monitoring trip: '); en(' · 出发地 ', ' · from '); en(' · 数据来源：AI 对话', ' · source: AI Chat');
en('⏱️ 时间线依据你在对话中规划的行程动态生成；天气/航班预警为产品演示。', '⏱️ Timeline is generated from your chat plan; weather/flight alerts are product demos.');
en('进行中', 'In progress'); en('已选 1 项', '1 selected'); en('请选择 1 项', 'Pick 1');
en('模拟监控 · Day ', 'Simulated monitor · Day '); en(' · 置信度 ', ' · confidence ');
en('🤖 AI 推荐 Plan B（综合你的约束 · 点击方案可切换）', '🤖 AI-recommended Plan B (based on your constraints · click to switch)');
en('💰 净增约 ¥', '💰 ~¥'); en('🚌 需改签交通', '🚌 Transport rebook'); en('🏨 酒店退改', '🏨 Hotel change');
en('⚙️ 点击确认后，Agent 自动编排 MCP 调用链', '⚙️ On confirm, the Agent auto-orchestrates the MCP chain');
en('✅ 确认执行 ', '✅ Confirm '); en(' — 授权 Agent 自动编排以上 ', ' — authorize the Agent to orchestrate the '); en(' 步', ' steps');
en('🔐 以上为非支付类操作。涉及退款/扣款将单独请求授权。', '🔐 Non-payment actions; refunds/charges need separate authorization.');
en('⏳ Agent 编排中（', '⏳ Agent orchestrating ('); en('）...', ')...');
en('⏳ 步骤 ', '⏳ Step '); en('（并行）...', ' (parallel)...'); en('/', '/'); en('全部执行完成', 'All steps done');
en('执行完成（', 'Execution done ('); en('）', ')'); en('个MCP调用全部成功。场地已取消→室内场地已预订→工坊已确认→同行人已通知。总耗时', ' MCP calls succeeded. Venue cancelled → indoor booked → workshop confirmed → students notified. Total time '); en('秒，编排费用¥', 's, orchestration cost ¥');
en('✅ Plan ', '✅ Plan '); en(' 执行完成', ' done'); en('🔐 以上为非支付类操作。涉及退款/扣款将单独请求授权。', '🔐 Non-payment actions; refunds/charges need separate authorization.');
en('🧾 确认改订下单 Plan ', '🧾 Confirm rebooking Plan '); en('（', ' ('); en('项）', ' items)');
en('⏳ 正在向 AI 助手查询「', '⏳ Querying the AI assistant for "'); en('」…', '"...'); en('无结果', 'No result');
en('⏳ 正在生成综合建议…', '⏳ Generating summary...'); en('🤖 AI 助手 · 综合建议', '🤖 AI assistant · Summary');
en('📊 6维度对比', '📊 6-dimension compare'); en('🧪 以上为示意评分（演示模型）。真实多维对比请到「方案对比」页输入目的地，由 AI 助手实时生成。', '🧪 Above are illustrative scores (demo model). For real multi-dim compare, enter destinations on the Plan Compare page.');
en('好问题！让我并行查询两边数据...', 'Good question! Let me query both sides in parallel...');
en('🔧 同时调用：天气MCP · 航班MCP · 住宿MCP · 知识库RAG', '🔧 Calling in parallel: weather MCP · flight MCP · stay MCP · KB RAG');
en('示意对比（演示模型 · 文化艺术优先、体力友好）：', 'Illustrative compare (demo model · art-culture first,体力-friendly):');
en('示意结论：', 'Suggested conclusion: '); en(' 更契合「文化艺术游学 + 慢节奏」的偏好；若你更偏重设计 / 时尚 / 购物，', ' fits the "art-study + slow pace" preference; if you lean design / fashion / shopping, '); en(' 更优。可在「方案对比」页用真实数据调权重。', ' is better. Tune weights with real data on the Plan Compare page.');
en(' 综合得分略高。可在「方案对比」页输入真实目的地，由 AI 助手实时生成多维对比。', ' scores slightly higher. Enter real destinations on the Plan Compare page for a live multi-dim compare.');
en('🔍 展开详细证据', '🔍 Detailed evidence'); en('📊 去方案对比页（真实数据）', '📊 Go to Plan Compare (real data)'); en('💾 保存对比结果', '💾 Save comparison');
en('🚨 ', '🚨 '); en(' 系统自动检测', ' System auto-detected'); en('天气监控 · 模拟预警 · 置信度 ', 'Weather monitor · simulated alert · confidence ');
en('，预计影响你的', ', expected to affect your '); en('行程。', ' trip.'); en('正在生成Plan B（结合你的约束：体验优先、预算可控、体力友好）...', 'Generating Plan B (your constraints: experience-first, budget-controlled,体力-friendly)...');
en('2个替代方案：', '2 alternatives:'); en('⭐ Plan B1 — 室内备选方案（推荐）', '⭐ Plan B1 — Indoor Alternative (recommended)'); en('Plan B2 — 提前转移邻近城市', 'Plan B2 — Move to nearby city early'); en('推荐 ', 'Recommended '); en('。要执行吗？', '. Execute?');
en('✅ 执行 Plan B1', '✅ Execute Plan B1'); en('🔄 查看 Plan B2 详情', '🔄 Plan B2 details');
en('好的！激活 <strong>Skill: execute_rebook</strong> → Agent 按依赖关系自动编排 MCP 调用链：', 'OK! Activating <strong>Skill: execute_rebook</strong> → the Agent orchestrates the MCP chain by dependency:');
en('🎬 <strong>Phase 1/6：灵感激发</strong> — LLM意图识别+实体提取', '🎬 <strong>Phase 1/6: Inspiration</strong> — LLM intent + entity extraction');
en('📚 <strong>Phase 2/6：知识库+记忆</strong> — RAG检索+碎片结构化+长期记忆存储', '📚 <strong>Phase 2/6: Knowledge + Memory</strong> — RAG + structuring + long-term storage');
en('⚖️ <strong>Phase 3/6：决策对比</strong> — 并行MCP调用+多维分析', '⚖️ <strong>Phase 3/6: Compare</strong> — parallel MCP + multi-dim analysis');
en('🧠 <strong>Phase 4/6：长记忆召回</strong> — 时间快进到Day 45', '🧠 <strong>Phase 4/6: Memory Recall</strong> — fast-forward to Day 45');
en('🛡️ <strong>Phase 5/6：行程守护</strong> — 系统主动监控+Plan B生成', '🛡️ <strong>Phase 5/6: Trip Guard</strong> — active monitoring + Plan B');
en('⚡ <strong>Phase 6/6：Skill编排执行</strong> — Agent串联MCP调用链', '⚡ <strong>Phase 6/6: Skill Execution</strong> — Agent chains MCP calls');
en('🔍 意图识别结果', '🔍 Intent result'); en('意图', 'Intent'); en('目的地', 'Destination'); en('时长', 'Duration'); en('预算', 'Budget'); en('置信度', 'Confidence'); en('（需追问）', '(needs follow-up)');
en('还需要确认：先去哪个城市？<strong>罗马</strong>还是<strong>米兰</strong>？', 'Still to confirm: which city first? <strong>Rome</strong> or <strong>Milan</strong>?');
en('明白了！✅ 偏好已存入长期记忆。', 'Got it! ✅ Preferences saved to long-term memory.'); en('🧠 已保存的记忆', '🧠 Saved memories'); en('饮食', 'Diet'); en('节奏', 'Pace');
en('同时激活 Skill: ingest_knowledge → 知识库MCP检索匹配的语校、美术馆与签证信息...', 'Also activating Skill: ingest_knowledge → KB MCP searches matching schools, museums & visa info...');
en('让我查一下...同时检索到你的<strong>Day 1长期记忆</strong>：', 'Let me check... and I found your <strong>Day-1 long-term memory</strong>:');
en('🧠 已激活记忆（Day 1设定）', '🧠 Activated memory (Day-1 settings)'); en('🍽️ 饮食', '🍽️ Diet'); en('💰 预算', '💰 Budget');
en('推荐 <strong>Trattoria da Teo</strong>（罗马 Testaccio 老城家常菜，橄榄油清炒时蔬与海胆面，人均€25，符合你的清淡饮食）', 'Recommended <strong>Trattoria da Teo</strong> (Testaccio, Rome — home-style, olive-oil veggies & sea-urchin pasta, ~€25, fits your light diet)');
en('💡 这就是长期记忆的价值——第45天记得第1天的偏好。', '💡 This is the value of long-term memory — Day 45 still remembers Day-1 preferences.');
en('（系统通知）意大利行程突发「', '(System alert) Italy trip disruption "'); en('」！', '"!');
en('就Plan B1，帮我执行！', 'Execute Plan B1 for me!');
en('加载中…', 'Loading…'); en('⚠️ 知识库状态获取失败', '⚠️ KB status unavailable'); en('⚠️ 知识库服务未连接（对话仍可用，仅离线）', '⚠️ KB service offline (chat still works, local only)');
en('已录入 ', 'Ingested '); en(' 条问答 · 覆盖 ', ' Q&A · covering '); en(' 个业务分类', ' categories'); en('🟢 语义向量引擎在线 · ', '🟢 Semantic engine online · '); en(' 条', ' entries'); en('🟡 语义引擎离线，已回退本地 TF-IDF', '🟡 Semantic engine offline, fell back to local TF-IDF');
en('⏳ 录入中…', '⏳ Ingesting…'); en('✅ 已录入 ', '✅ Ingested '); en(' 条', ' entries'); en(' · 语义库已同步', ' · semantic synced'); en('⚠️ 录入失败', '⚠️ Ingest failed');
en('🔌 演示下单 · 接口占位（携程问道为攻略型 API，不含下单；真实出票需接入携程商旅/开放平台）', '🔌 Demo booking · API stub (Ctrip Wendao is a guide API with no booking; real ticketing needs Ctrip Biz/Open Platform)');
en('⏳ 正在获取报价…', '⏳ Fetching quote…'); en('⚠️ 报价接口未就绪，请稍后重试。', '⚠️ Quote API not ready, please retry.'); en('⏳ 下单中…', '⏳ Ordering…'); en('✅ 确认下单', '✅ Confirm order'); en('⚠️ 下单失败，请重试', '⚠️ Order failed, please retry');
en('🧭 ', '🧭 '); en('天 · ', ' days · '); en('人', ' ppl'); en('合计预估 ', 'Estimated total '); en('预估价·非实时', 'estimate · not live'); en('✅ 下单成功（演示）', '✅ Order placed (demo)'); en('订单号', 'Order ID'); en('行程', 'Trip'); en('金额', 'Amount'); en('状态', 'Status'); en('待支付 PENDING_PAYMENT', 'PENDING_PAYMENT'); en('🔌 ', '🔌 '); en('完成', 'Done'); en('✅ 下单成功（演示）· 单号 ', '✅ Order placed (demo) · No. ');
en('确认改订下单 Plan B', 'Confirm rebooking Plan B');
en('📅 帮我规划城市路线', '📅 Plan my city route'); en('💰 帮我做预算分配', '💰 Allocate my budget'); en('📎 粘贴攻略链接', '📎 Paste guide link');
en('📅 帮我规划城市路线', '📅 Plan my city route');
en('💡 你可以直接告诉我：想去哪、去多久、预算多少、偏好什么，我会实时提取成长期约束。', '💡 Just tell me: where, how long, budget, preferences — I\'ll extract them into long-term constraints live.');
en('🔍 已提取的约束条件（已存入长期记忆）', '🔍 Extracted constraints (saved to long-term memory)'); en('🧠 这些约束已存入长期记忆，后续对话与规划都会自动带入。', '🧠 These constraints are saved; future chats & planning auto-include them.');
en('接下来你可以粘贴收集的旅行攻略、签证资料，或让我规划具体路线。', 'Next you can paste your travel guides, visa docs, or ask me to plan a route.');
en('预算', 'Budget'); en('美食', 'Food'); en('自然风光', 'Nature'); en('体验', 'Experience'); en('亲子', 'Family'); en('人文', 'Culture');

// 记忆中心 / 行程记忆面板（renderMemoryPage / renderTripMemory 动态文案）
en('暂无长期记忆，可在上方添加，或在聊天中描述偏好自动提取。', 'No long-term memory yet. Add above, or describe preferences in chat to auto-extract.');
en('🔓 解锁', '🔓 Unlock'); en('🔒 锁定', '🔒 Lock'); en('🗑 删除', '🗑 Delete');
en('尚未规划', 'Not planned'); en('未设置', 'Not set'); en('暂无', 'None'); en('天', ' days');
en('在「AI 对话」中说出目的地和天数即可自动生成', 'Mention a destination and days in "AI Chat" to auto-generate');

// 模拟突发状况演示数据（buildIncident）英文覆盖
en('暴雨橙色预警', 'Orange rainstorm alert'); en('预计持续8小时。户外行程与交通路段受影响。', 'Expected to last 8h. Outdoor plans and road transport affected.');
en('台风蓝色预警', 'Blue typhoon alert'); en('沿海风力增强，船只与户外活动可能临时取消。', 'Coastal winds strengthen; boats and outdoor activities may be suspended.');
en('高温红色预警', 'Red heat alert'); en('日间气温突破38℃，户外徒步存在中暑风险。', 'Daytime temps exceed 38°C; heat-stroke risk for outdoor hikes.');
en('强对流大风预警', 'Severe-convection gale alert'); en('短时大风可达8级，高空与水面活动暂停。', 'Short gales up to level 8; high-altitude and water activities paused.');
en('|DEST|本地博物馆 + 特色室内工坊，行程平移。户外/水面活动推迟至 Day |DAY|。', '|DEST| local museums + indoor workshops, itinerary shifted. Outdoor/water activities postponed to Day |DAY|.');
en('提前1天前往邻近城市。|DEST|退1晚，邻城加1晚。Day |HD|行程顺延。', 'Head to a nearby city 1 day early. Cancel 1 night in |DEST|, add 1 in the neighbor city. Day |HD| shifts later.');
en('💰 无额外费用', '💰 No extra cost'); en('📚 体验目标不变', '📚 Experience goal unchanged'); en('⏰ 仅调整顺序', '⏰ Only re-order');
en('💰 净增约 ¥0', '💰 ~¥0 net'); en('🚌 需改签交通', '🚌 Transport rebook'); en('🏨 酒店退改', '🏨 Hotel change');
en('取消受影响户外场地', 'Cancel affected outdoor venue'); en('预订|DEST|室内替代场地', 'Book |DEST| indoor alternative');
en('确认特色工坊/活动', 'Confirm featured workshop/activity'); en('通知同行人 + 更新行程', 'Notify companions + update itinerary');

// 快捷操作 chips（展示文案英文覆盖；act 用稳定中文意图路由）
en('✅ 还是执行 Plan B1', '✅ Execute Plan B1 anyway'); en('📞 联系课程老师确认', '📞 Contact course teacher to confirm');
en('🧾 下单预订', '🧾 Book / Reserve'); en('💾 保存预算方案', '💾 Save budget plan');
// rEmergency 场景文案英文覆盖
en('天气监控 · 模拟预警 · 置信度 ', 'Weather monitor · simulated alert · confidence ');
en('，预计影响你的', ', expected to affect your '); en('行程。', ' trip.');
en('正在生成Plan B（结合你的约束：体验优先、预算可控、体力友好）...', 'Generating Plan B (your constraints: experience-first, budget-controlled,体力-friendly)...');
en('2个替代方案：', '2 alternatives:'); en('⭐ Plan B1 — 室内备选方案（推荐）', '⭐ Plan B1 — Indoor Alternative (recommended)');
en('Plan B2 — 提前转移邻近城市', 'Plan B2 — Move to nearby city early'); en('推荐 ', 'Recommended '); en('。要执行吗？', '. Execute?');
en('🔐 均为非支付类操作。退款/扣款将单独授权。', '🔐 All non-payment actions. Refunds/charges need separate authorization.');
// rEurope 场景文案英文覆盖
en('好的！让我帮你理清思路 ✨', 'Great! Let me help you sort this out ✨');
en('接下来你可以粘贴收集的旅行攻略、签证资料，或让我规划具体路线。', 'Next you can paste your travel guides, visa docs, or ask me to plan a route.');
en('个约束已存入长期记忆', ' constraints saved to long-term memory');
// rCompare 场景（维度标签 / 结论模板 / 综合得分）
en('💰 预算可控', '💰 Budget'); en('🎨 艺术文化', '🎨 Art & Culture'); en('🍝 美食体验', '🍝 Food'); en('🛍️ 购物时尚', '🛍️ Shopping'); en('😌 体力友好', '😌 Easy pace'); en('🏛️ 历史人文', '🏛️ Heritage');
en('综合得分', 'Overall score'); en('⭐ 综合得分', '⭐ Overall score');
en('示意结论：<strong>|A|</strong> 更契合「文化艺术游学 + 慢节奏」的偏好；若你更偏重设计 / 时尚 / 购物，<strong>|B|</strong> 更优。可在「方案对比」页用真实数据调权重。', 'Suggested conclusion: <strong>|A|</strong> fits the "art-study + slow pace" preference; if you lean design / fashion / shopping, <strong>|B|</strong> is better. Tune weights on the Plan Compare page.');
en('示意结论：<strong>|W|</strong> 综合得分略高。可在「方案对比」页输入真实目的地，由 AI 助手实时生成多维对比。', 'Suggested conclusion: <strong>|W|</strong> scores slightly higher. Enter real destinations on the Plan Compare page for a live multi-dim compare.');
// openBookingSheet 下单面板英文覆盖
en('应急改订下单', 'Emergency rebooking'); en('行程下单预订', 'Trip booking');
en('合计预估 ', 'Estimated total '); en('预估价·非实时', 'estimate · not live');
en('下单成功（演示）', 'Order placed (demo)'); en('订单号', 'Order ID'); en('行程', 'Trip'); en('金额', 'Amount'); en('状态', 'Status');
en('完成', 'Done'); en('人', ' ppl');
en('✅ 下单成功（演示）· 单号 ', '✅ Order placed (demo) · No. ');
en('项', ' items'); en('🧾 下单预订 Plan A（', '🧾 Book Plan A ('); en('）', ')');
// rPlanB2 场景英文覆盖
en('Plan B2 详情（|DEST|）：', 'Plan B2 details (|DEST|):'); en('提前1天前往邻近城市。', 'Head to a nearby city 1 day early.');
en('住宿退1晚 → 邻城加1晚 → 交通改签。', 'Cancel 1 night → add 1 in neighbor city → rebook transport.');
en('💰 净增费用：约 ¥', '💰 Extra cost: ~¥'); en('行程顺延1天，不影响内容。', 'Itinerary shifts 1 day, content unaffected.');
en('需要交通票改签（提前2小时可免费改签）。', 'Transport ticket rebooking needed (free up to 2h before).');
en('相比Plan B1，多了交通改签的麻烦。建议还是 ', 'Compared to Plan B1, more rebooking hassle. Still recommend ');
// rEvidence / rBudget / rMemory / rGeneral 场景英文覆盖
en('📋 <strong>证据链 — |DEST|</strong>', '📋 <strong>Evidence chain — |DEST|</strong>');
en('🌤️ 天气', '🌤️ Weather'); en('天气服务 · 查询于 ', 'Weather service · queried on ');
en('✈️ 机票', '✈️ Flights'); en('预估区间 · 以下单实时报价为准', 'Estimated range · based on live quote');
en('🏨 住宿', '🏨 Hotel'); en('📚 攻略', '📚 Guide'); en('平台知识库 RAG 检索', 'Platform KB RAG');
en('⚠️ 价格为预估，真实成交价需在「下单预订」中获取实时报价。', '⚠️ Prices are estimates; real price needs a live quote from Booking.');
en('要做预算分配，我需要先知道你的<strong>总预算</strong>和<strong>行程天数</strong>。', 'For budget allocation I need your <strong>total budget</strong> and <strong>trip days</strong> first.');
en('你可以说：例如「预算3万，玩10天」，我就能按机票/住宿/餐饮/活动/应急给出建议分配。', 'E.g. say "budget 30k, 10 days" and I\'ll suggest allocation across flights/stay/food/activities/emergency.');
en('✈️ 交通/机票', '✈️ Transport/Flights'); en('🍽️ 餐饮', '🍽️ Food'); en('🎫 活动/门票', '🎫 Activities/Tickets');
en('🚇 当地交通', '🚇 Local transport'); en('💡 应急预留', '💡 Emergency buffer');
en('💰 建议分配（按行程结构测算）', '💰 Suggested allocation (by trip structure)'); en('合计', 'Total');
en('⚠️ 比例为通用测算模型，实际以下单报价为准。', '⚠️ Ratios are a general model; real price per quote.');
en('🧠 你目前还没有长期记忆。', '🧠 You have no long-term memory yet.');
en('在对话中描述偏好（如「我吃得清淡」「预算每天1000」「喜欢慢节奏」），我会自动提取并存入，也可以在「记忆中心」手动添加。', 'Describe preferences in chat (e.g. "I eat light", "budget 1000/day", "slow pace") and I\'ll extract & save them; or add manually in Memory Center.');
en('🧠 你的长期记忆（共 ', '🧠 Your long-term memory ('); en(' 条）：', ' entries):');
en('这些记忆会在未来的对话中自动激活。你可以在「记忆中心」随时编辑或删除。', 'These memories auto-activate in future chats. Edit or delete anytime in Memory Center.');
en('收到！我理解你想规划旅行 🗺️', 'Got it! I understand you want to plan a trip 🗺️');
en('可以多告诉我一些细节：目的地、时间、预算、同行人数、喜欢的节奏？', 'Tell me more: destination, dates, budget, group size, preferred pace?');
// aiRespondReal 真实链路 + 澄清/目的地变更卡片英文覆盖
en('🧠 检测到历史行程设定', '🧠 Detected past trip settings');
en('你只说了「|TXT|」，但我之前记录过这些行程特定信息。它们对本次|NEW|是否仍然适用？', 'You only said "|TXT|", but I recorded these trip-specific details before. Do they still apply to this |NEW|?');
en('✅ 沿用这些设定', '✅ Keep these settings'); en('🔄 重新设定', '🔄 Reset');
en('选择“重新设定”后，会<b>清空全部记忆</b>并用聊天方式重新问你几个简单问题（去几天、出差还是旅行、预算等），再给出建议。', 'Choosing "Reset" will <b>clear all memory</b> and re-ask a few simple questions in chat (days, business or leisure, budget), then advise.');
en('沿用这些设定', 'Keep these settings'); en('重新设定', 'Reset'); en('改为「|TO|」', 'Change to "|TO|"'); en('沿用「|FROM|」', 'Keep "|FROM|"');
en('🗺️ 目的地好像变了', '🗺️ Destination seems changed');
en('你这次说想去 <b>|TO|</b>，但我之前记录过你想去 <b>|FROM|</b>。要怎么处理？', 'You mentioned <b>|TO|</b> this time, but I recorded you wanted <b>|FROM|</b> before. How to proceed?');
en('旧目的地', 'Old destination'); en('新目的地', 'New destination'); en('✅ 改为「|TO|」', '✅ Change to "|TO|"'); en('← 沿用「|FROM|」', '← Keep "|FROM|"');
en('选「沿用旧」会忽略本次目的地变更，按之前的「|FROM|」继续；选「重新设定」会清空全部记忆，从零开始。', 'Choosing "Keep old" ignores this change and continues with "|FROM|"; "Reset" clears all memory and starts over.');
en('🧠 已记住 ', '🧠 Remembered '); en(' 条偏好：', ' preferences:'); en('，后续会自动带入建议。', ', will be auto-applied to future suggestions.');
en('🛡️ 已同步「行程监控」：', '🛡️ Synced to Trip Monitor:'); en('，可在左侧「行程监控」查看动态时间线。', ', view the live timeline in Trip Monitor (left).');
en('📚 已引用平台知识库 ', '📚 Cited platform KB '); en(' 条（', ' entries ('); en('）作为官方参考口径。', ') as official reference.');
en('⚠️ AI 知识引擎今日额度已用完，以下直接引用平台知识库 ', '⚠️ AI engine quota used up today; citing platform KB '); en(' 条官方口径：', ' official entries:');
en('⚠️ 暂时连不上 AI 知识引擎，已回退到本地演示回复。', '⚠️ Cannot reach the AI engine; fell back to local demo reply.');
en('检测到目的地变更', 'Destination change detected'); en('从 ', 'From '); en(' 改为 ', ' changed to '); en('，需要你确认。', ', needs your confirmation.');
// buildClarifyQuestion 澄清追问英文覆盖
en('从', 'From '); en('出发', 'departing'); en('从哪里出发', 'Where are you departing from');
en('去几天', 'How many days'); en('是去出差还是旅行', 'Business or leisure'); en('预算大概多少', 'Roughly what budget');
en('有没有什么其他要求，比如饮食、节奏、同伴', 'Any other requirements, e.g. diet, pace, companions');
en('收到，', 'Got it, '); en('。还想确认一下：', '. Want to confirm: '); en('呢？', '?');
en('我知道你想去', 'I know you want to go to '); en('这个地方', 'this place'); en('，请问', ', may I ask ');
// Plan A 方案选择面板英文覆盖（group 标签 / 面板标题 / 选项 tag/title/sub / 行程亮点 / 单位标签）
en('交通方式', 'Transport'); en('住宿', 'Stay'); en('游玩门票', 'Tickets');
en('方案概览', 'Plan overview'); en('行程亮点（共 ', 'Trip highlights ( '); en(' 天）', ' days)');
en('预估合计', 'Estimated total'); en('· 以下单报价为准', '· based on live quote');
en('已选：', 'Selected: '); en('✅ 组合下单', '✅ Combine & book'); en('请选择', 'Pick');
en('★推荐', '★ Recommended'); en('推荐', 'Recommended'); en('省心', 'Hassle-free'); en('慢游', 'Slow travel');
en('不可', 'N/A'); en('本地', 'Local'); en('经济', 'Budget'); en('小众', 'Offbeat'); en('主题', 'Themed');
en('✈️ 直飞', '✈️ Direct'); en('✈️ 转机 1 次', '✈️ 1 stop'); en('🚄 高铁/动卧', '🚄 High-speed rail');
en('🏨 精品酒店', '🏨 Boutique hotel'); en('🏠 特色民宿', '🏠 Unique stay'); en('🛏️ 经济型', '🛏️ Economy');
en('🎫 经典必去', '🎫 Classic must-sees'); en('🎨 小众深度', '🎨 Offbeat deep-dive'); en('🌟 主题定制', '🌟 Custom theme');
en('经济舱直飞，约 2.5 小时，免去转机劳顿', 'Economy direct, ~2.5h, no layover');
en('经第三地中转 1 次，总时长 +3h，价格更优', '1 stop via 3rd city, +3h, better price');
en('陆路出行，沿途可看风景（仅限国内可达目的地）', 'Overland, scenic route (domestic only)');
en('经济舱直飞，约 10–14 小时，含 23kg 行李', 'Economy direct, ~10–14h, 23kg baggage');
en('经第三地中转 1 次，总时长 +5h，机票可省 25%', '1 stop via 3rd city, +5h, save 25%');
en('跨海跨洋不适用', 'Not applicable overseas');
en('4 星/精品设计酒店，含早，市中心或景点附近', '4★/boutique design hotel, breakfast, central/near sights');
en('4 星/精品设计酒店，含早，市中心或景点附近（轻食早餐可选）', '4★/boutique design hotel, breakfast, central/near sights (light breakfast optional)');
en('本地特色民宿/公寓，洗衣机+厨房，适合慢节奏（轻食早餐可选）', 'Local B&B/apartment, washer+kitchen, slow pace (light breakfast optional)');
en('（轻食早餐可选）', '(light breakfast optional)');
en('本地特色民宿/公寓，洗衣机+厨房，适合慢节奏', 'Local B&B/apartment, washer+kitchen, slow pace');
en('干净舒适连锁酒店，性价比高，紧凑实用', 'Clean comfy chain hotel, great value, compact');
en('当地 5–6 个必打卡景点门票 + 城市观光通票', '5–6 top sights tickets + city pass');
en('深度博物馆/老建筑/工作坊', 'In-depth museums/old buildings/workshops');
en('本地人餐厅/夜市/老巷', 'Local eateries/night market/old alleys');
en('亲子乐园/自然科普馆', 'Family park/nature museum');
en('设计师路线/独立书店/手作', 'Designer route/indie bookstore/crafts');
en('亲子主题：动物园+科技馆+手工', 'Family: zoo + science museum + crafts');
en('美食主题：米其林+夜市+私厨', 'Foodie: Michelin + night market + private chef');
en('文化主题：故宫深度+胡同+京剧', 'Culture: Forbidden City + hutongs + Peking opera');
en('按你的偏好（饮食/节奏/学习）定制', 'Custom by your preferences (diet/pace/learning)');
en('出发 → |DEST|，办理入住，晚上自由活动（推荐市中心步行）', 'Depart → |DEST|, check-in, free evening (walkable city center)');
en('美食主题：早茶/特色小吃 + 老街漫游', 'Foodie: dim sum/street eats + old-town stroll');
en('文化主题：博物馆 + 历史街区 + 老建筑', 'Culture: museums + historic district + old buildings');
en('亲子主题：动物园/科技馆 + 公园', 'Family: zoo/science museum + park');
en('城市观光：核心景点 + 当地体验', 'City tour: core sights + local experience');
en('早餐 + 自由活动/伴手礼采购 → 返程', 'Breakfast + free time/souvenirs → return');
en('晚·每晚', ' nts/night'); en('天·每人', ' days/person');

function applyLang(lang) {
  currentLang = lang;
  try { localStorage.setItem('lang', lang); } catch {}
  document.documentElement.lang = (lang === 'en') ? 'en' : 'zh-CN';
  document.querySelectorAll('[data-i18n]').forEach(el => { el.innerHTML = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll('[data-i18n-title]').forEach(el => { const v = t(el.dataset.i18nTitle); el.title = v; el.setAttribute('aria-label', v); });
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('is-active', b.dataset.lang === lang));
  // 重新渲染动态区块，使其中的 t() 文案同步
  try { renderMemoryPage(); } catch {}
  try { renderTripMemory(); } catch {}
  try { updateCtxMemory(); } catch {}
  if (typeof renderMonitorTrip === 'function') renderMonitorTrip();
  // 重新翻译已展示的 Plan A 方案选择面板（组标签/选项/已选状态/行程亮点）
  try {
    document.querySelectorAll('.plan-select-card').forEach(c => {
      const st = c._planState;
      if (!st) return;
      if (typeof st.reDay === 'function') st.reDay();
      if (typeof st.refresh === 'function') st.refresh();
    });
  } catch {}
}


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
  '目的地', '预算习惯', '行程时长', '总预算', '学习目标', '证件与签证'
]);
function classifyMemory(label) {
  if (STABLE_MEMORY_LABELS.has(label)) return 'stable';
  if (TRIP_MEMORY_LABELS.has(label)) return 'trip';
  return 'stable'; // 未知标签默认安全侧：当作可继承偏好
}

// 统一的城市/目的地关键词：所有需要从用户输入匹配城市/目的地的正则都引用这里。
// 既要覆盖国内主要城市（北京/上海/广州/深圳/成都/重庆/香港/澳门/台北 等），
// 也要覆盖国际热门目的地（清迈/曼谷/东京/巴厘岛/冰岛/欧洲 等）。
// 顺序：长的在前，避免「日本」被「日」先匹配掉之类的问题。
const CITY_KEYWORDS = [
  // 国内主要城市
  '北京','上海','广州','深圳','成都','重庆','杭州','南京','武汉','西安','天津','苏州',
  '长沙','郑州','沈阳','青岛','宁波','东莞','无锡','厦门','福州','昆明','大连','哈尔滨',
  '长春','石家庄','济南','合肥','南宁','贵阳','海口','兰州','银川','西宁','乌鲁木齐',
  '拉萨','呼和浩特','南昌','太原','香港','台北','澳门',
  // 国内度假/小众目的地
  '三亚','大理','丽江','香格里拉','青海','甘肃','川西','稻城','新疆','云南','西藏',
  // 意大利（本项目演示主场景）
  '意大利','罗马','米兰','佛罗伦萨','威尼斯',
  // 国际热门目的地
  '清迈','曼谷','普吉','东京','大阪','京都','北海道','首尔','济州','巴厘岛','新加坡',
  '冰岛','瑞士','新西兰','欧洲','日本','泰国','越南','摩洛哥'
];
// 构造一个 (?:A|B|C) 的捕获正则，按关键词长度倒序排列以避免短词先匹配
const CITY_REGEX_STR = CITY_KEYWORDS.slice().sort((a, b) => b.length - a.length).map(c => c).join('|');

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
// 兜底：老版本 localStorage 数据可能没 purpose 字段，确保 schema 一致
if (tripState && typeof tripState.purpose === 'undefined') tripState.purpose = '';
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
function updateTripFromInput(text, opts) {
  const options = opts || {};
  const t = text || '';
  let changed = false;
  const trip = tripState || { dest: '', days: 0, from: '', updatedAt: 0 };
  // 关键：先把旧目的地保存下来，用于「目的地变了」检测 → 让上层弹出确认卡片
  const oldDest = trip.dest || '';

  // 目的地关键词（先解析，让后面的"子行程保护"能感知到本轮是否切换了目的地）。
  //
  // 背景坑：把"我想去香港"里的"香港"识别成 dest 很容易，但用户经常会在同一句里
  // 同时提到出发地/位置/起点（如"我现在在成都，想去香港"）。如果只看"城市在文中出现"
  // 就会错把"成都"当成 dest、"香港"被错过；或者把"从上海出发"里的"上海"当成 dest。
  //
  // 解法：
  // 1) 加更严格的 lookbehind `(?<![从在位于驻现到])`，
  //    排除「从X/在X/位于X/驻X/现在在X/到这里X/到那里X」短语里的 X；
  // 2) 但兜底（没匹配到时）放开限制，让「我在北京，想去北京」这种同城游也能识别出目的地；
  // 3) 优先匹配「想去X / 去X / 到X / X出差 / X几天」这种**强目的地信号**，避免被
  //    句子开头的"现在在"上下文干扰。
  const STRONG_DEST_RE = new RegExp(
    '(?:想去|想去去|想去\\s|去|到)\\s*(' + CITY_REGEX_STR + ')' +
    '|(' + CITY_REGEX_STR + ')(?:出差|几天|几日|旅游|旅行|玩|游|几天玩|几日玩)'
  );
  const strong = t.match(STRONG_DEST_RE);
  // 提取 strong 里的第一个非空捕获组
  let dest = null;
  if (strong) {
    dest = [strong[0], strong[1] || strong[2], strong.index + (strong[1] ? strong[0].indexOf(strong[1]) : 0)];
  }
  if (!dest) {
    // 弱匹配：句子中任意城市，但要排除"在X/从X/位于X/现在在X"短语里的 X
    const weak = t.match(new RegExp('(?<![从在位于驻现])(?:[^一-龥]|^)(' + CITY_REGEX_STR + ')'));
    if (weak) dest = [weak[0], weak[1], weak.index + (weak[0].length - weak[1].length)];
  }
  if (!dest) {
    // 兜底：纯字面 + 任何位置（覆盖「从北京出发去北京」同城游和首问场景）
    const plain = t.match(new RegExp('(' + CITY_REGEX_STR + ')'));
    if (plain) dest = [plain[0], plain[1], plain.index];
  }
  let destChanged = false;
  if (dest && dest[1] !== trip.dest) {
    // 目的地切换时，重置沿用/排除状态、清空旧出发地，并加载新目的地对应的选择
    resetTripLabelStateForDest(dest[1]);
    trip.dest = dest[1];
    trip.from = '';
    changed = true;
    destChanged = true;
  }

  // 天数：支持「5天」「十五天」「2周」「一个月」
  const dm = t.match(/([0-9]{1,3}|[一二两三四五六七八九十]{1,3})\s*(天|日|周|个月)/);
  if (dm) {
    let n = cn2num(dm[1]);
    if (dm[2] === '周') n *= 7;
    else if (dm[2] === '个月') n *= 30;
    if (n > 0 && n <= 365 && n !== trip.days) {
      // 子行程保护：正常对话中，本句在「N天」前又提了其它城市（如「曼谷2天」），
      // 且 N 小于当前总天数时，视为该城市停留天数，不覆盖总行程天数。
      // 关键：若「N天」前出现的城市就是当前 trip.dest（如「北京3天」修正总天数），
      // 那 N 天属于主行程本身，不是子行程，应跳过保护。
      let isSubTrip = false;
      if (!options.isClarify) {
        const before = t.slice(0, dm.index);
        // 同样排除「从/在/位于/现在在 X」短语里的 X；只把「真正的 N天前出现的城市」当作子行程信号
        const beforeCity = before.match(new RegExp('(?<![从在位于驻现])(' + CITY_REGEX_STR + ')'));
        const isMainDestInBefore = beforeCity && beforeCity[1] === trip.dest;
        isSubTrip = beforeCity && !isMainDestInBefore && n < (trip.days || 0);
      }
      if (!isSubTrip) { trip.days = n; changed = true; }
    }
  }

  // 出发地解析：支持 3 种句式
  //   1) 显式「从X出发」「X出发」（必须白名单城市，否则噪声太大）
  //   2)「现在在X」「在X」「位于X」「驻X」—— 用户描述当前位置/居住地，强烈暗示出发地
  //   3)「X过去」「X飞过来」—— 用户从某地过来，但这种表达较生僻，先不覆盖
  // 老 bug：原 `/(?:从)?([\u4e00-\u9fa5]{2,6})出发/` 贪婪，如「我想从北京出发」匹配成
  //   from="想从北京"5字；用 (?:从|^)X 模式 + 白名单修复。
  // 新坑：「我现在在成都」没"出发"二字，旧 regex 漏掉。补充"现在在X"/"在X"模式。
  const FROM_CITIES = ['北京','上海','广州','深圳','成都','重庆','杭州','南京','武汉','西安','天津','苏州','长沙','郑州','沈阳','青岛','宁波','东莞','无锡','厦门','福州','昆明','大连','哈尔滨','长春','石家庄','济南','合肥','南宁','贵阳','海口','兰州','银川','西宁','乌鲁木齐','拉萨','呼和浩特','南昌','太原','香港','台北','澳门'];
  let fromCity = null;
  // 1) 显式「从X出发」「X出发」
  const mFrom1 = t.match(/(?:从|^)([\u4e00-\u9fa5]{2,4})出发/);
  if (mFrom1) {
    const hit = FROM_CITIES.find(c => c === mFrom1[1]);
    if (hit) fromCity = hit;
  }
  // 2) 「现在在X」「位于X」「驻X」（强信号）—— 仅在还没识别出来 from 时启用
  if (!fromCity) {
    const mFrom2 = t.match(/(?:现在在|现在位于|我在|位于|驻)([\u4e00-\u9fa5]{2,4})(?![出发去到])/);
    if (mFrom2) {
      const hit = FROM_CITIES.find(c => c === mFrom2[1]);
      if (hit) fromCity = hit;
    }
  }
  // 3) 兜底：「在X」（单独的"在"）—— 太宽，必须同时满足：X 是白名单城市 + 句中没有
  //   强目的地信号（如"想去X"），否则会跟 dest 抢词。保守起见放在弱信号位
  if (!fromCity) {
    const mFrom3 = t.match(/(?:^|[^一-龥])在([\u4e00-\u9fa5]{2,4})(?:[，,。]|$)/);
    if (mFrom3) {
      const hit = FROM_CITIES.find(c => c === mFrom3[1]);
      if (hit && (!dest || dest[1] !== hit)) fromCity = hit;
    }
  }
  const from = fromCity ? [null, fromCity] : null;
  if (from && from[1] !== trip.from) { trip.from = from[1]; changed = true; }

  // 出行目的（公派出差/商务/旅游等）—— 关键槽位，让澄清追问不再问"是去出差还是旅行"
  // 优先级：先匹配最长组合（公派出差），再回落到单字（公派/出差）
  const purposeMap = [
    [/公派出差/, '公派出差'],
    [/商务出差/, '商务出差'],
    [/会议出差/, '会议出差'],
    [/参展(?!览)/, '参展'],
    [/出差/, '出差'],
    [/商务/, '商务出行'],
    [/考察/, '考察'],
    [/探亲/, '探亲'],
    [/访友/, '访友'],
    [/就医|医疗/, '就医'],
    [/留学|游学/, '留学/游学'],
    [/学习/, '学习'],
    [/自由行/, '自由行'],
    [/跟团(游|游)?/, '跟团游'],
    [/度假|休闲游/, '度假'],
    [/旅游|旅行/, '旅行'],
  ];
  let purpose = null;
  for (const [re, label] of purposeMap) {
    if (re.test(t)) { purpose = label; break; }
  }
  if (purpose && purpose !== (trip.purpose || '')) {
    trip.purpose = purpose;
    changed = true;
  }

  if (changed) {
    trip.updatedAt = Date.now();
    tripState = trip;
    saveTrip();
    renderTripMemory();   // 行程要素变化即时反映到记忆中心面板
  }
  // 返回本轮解析结果，让澄清追问只采纳「本轮输入里明确出现」的事实，
  // 避免 tripState 残留（来自上一轮/上一会话）污染新行程的提问文案。
  // destConflict 用于让上层（aiRespondReal）判断是否需要弹出「目的地变了，请确认」卡片：
  //   只有当「旧 dest 非空」且「本轮解析到的新 dest ≠ 旧 dest」时才返回，避免空状态下的首问误触发。
  const destConflict = (destChanged && oldDest && dest) ? { from: oldDest, to: dest[1] } : null;
  return {
    changed,
    hasDest: !!dest,    // 本轮正则是否匹配到目的地
    hasDays: !!dm,      // 本轮正则是否匹配到时长
    hasFrom: !!from,    // 本轮正则是否匹配到出发地
    hasPurpose: !!purpose,  // 本轮正则是否匹配到出行目的
    destConflict,       // { from, to } 或 null
    oldDest,            // 本轮更新前的旧目的地（可能为 ''）
  };
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
async function switchView(id) {
  views.forEach(v => v.classList.toggle('is-visible', v.id === `view-${id}`));
  navItems.forEach(n => n.classList.toggle('is-active', n.dataset.view === id));
  if (id === 'monitor') await renderMonitorTrip();   // 切到行程监控时按最新 chat 行程刷新
  if (id === 'memory') renderTripMemory();     // 切到记忆中心时按最新行程刷新当前行程记忆
}

navItems.forEach(n => n.addEventListener('click', async () => await switchView(n.dataset.view)));

// ============================================
// Toast & Status
// ============================================
function showToast(msg) {
  toast.textContent = t(msg);
  toast.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('show'), 2000);
}

function setStatus(text, busy) {
  statusText.textContent = t(text);
  statusDot.classList.toggle('busy', busy);
}

// ============================================
// Chat
// ============================================
function scrollChat() { chatMessages.scrollTop = chatMessages.scrollHeight; }

function addMsg(role, html) {
  const div = document.createElement('div');
  div.className = `chat-msg ${role}`;
  div.innerHTML = `<div class="msg-avatar">${role === 'user' ? '👤' : '<img src="./icon.png" alt="CSTS" />'}</div><div class="msg-bubble">${html}</div>`;
  chatMessages.appendChild(div);
  scrollChat();
  return div;
}

function addTyping() {
  const id = 'typing-' + Date.now();
  const div = document.createElement('div');
  div.className = 'chat-msg ai';
  div.id = id;
  div.innerHTML = '<div class="msg-avatar"><img src="./icon.png" alt="CSTS" /></div><div class="msg-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>';
  chatMessages.appendChild(div);
  scrollChat();
  return id;
}

function remTyping(id) { const e = document.getElementById(id); if (e) e.remove(); }

function addChips(items) {
  const div = document.createElement('div');
  div.className = 'chat-msg ai';
  // items: 字符串 或 {label, act}。act 为稳定中文意图（用于路由），label 为展示文案（可翻译）
  const chipsHtml = items.map(it => {
    const label = (typeof it === 'string') ? it : it.label;
    const act = (typeof it === 'string') ? it : (it.act || '');
    return `<button class="chip" data-act="${esc(act)}">${label}</button>`;
  }).join('');
  div.innerHTML = `<div class="msg-avatar"><img src="./icon.png" alt="CSTS" /></div><div class="msg-bubble"><div class="quick-chips">${chipsHtml}</div></div>`;
  chatMessages.appendChild(div);
  // Bind click（优先用 data-act 路由，避免翻译后文案无法匹配）
  div.querySelectorAll('.chip').forEach(c => c.addEventListener('click', async () => await handleChip(c.dataset.act || c.textContent)));
  scrollChat();
}

async function handleChip(act, label) {
  const key = act || label || '';
  if (key.includes('下单') || key.includes('预订')) {
    if (tripState && tripState.dest) {
      openBookingSheet({ plan: 'A', dest: tripState.dest, days: tripState.days, from: tripState.from, title: `行程下单预订 — ${tripState.dest}` });
    } else {
      showToast('⚠️ 请先在对话中说出目的地和天数');
    }
  }
  else if (key.includes('执行 Plan B1') || key.includes('执行Plan B1')) sendAsUser('就Plan B1，帮我执行');
  else if (key.includes('Plan B2') || key.includes('查看 Plan B2')) await aiRespond('planb2');
  else if (key.includes('对比')) switchView('compare');
  else if (key.includes('证据')) aiRespond('evidence');
  else if (key.includes('预算')) sendAsUser('帮我做预算分配');
  else if (key.includes('路线') || key.includes('交通')) sendAsUser('帮我规划城市间的交通路线');
  else if (key.includes('攻略')) sendAsUser('我有一些旅行攻略想粘贴给你');
  else if (key.includes('联系')) sendAsUser('帮我联系课程老师确认一下行程变动');
  else if (key.includes('保存')) showToast('✅ 已保存');
  else sendAsUser(label || key);
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
  setTimeout(async () => { remTyping(tid); await aiRespond(detect(text), text); }, 700 + Math.random() * 500);
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

  setTimeout(async () => {
    remTyping(tid);
    // 显式「重新设定 / 重置 / 清空记忆」意图：清空全部记忆设定
    if (isResetIntent(text)) {
      const n = clearAllMemories();
      clarifyState.active = false;
      addMsg('ai', `<p>🧹 已清空全部 <b>${n}</b> 条记忆设定，记忆中心现已为空。你可以重新描述偏好（如「我吃得清淡」「预算每天1000」），我会自动存入；也可在「🧠 记忆中心」手动添加。</p>`);
      isTyping = false;
      sendBtn.disabled = false;
      setStatus('就绪');
      chatInput.focus();
      return;
    }
    if (clarifyState.active) {
      await handleClarifyReply(text);   // 处于澄清追问模式，解析用户补充信息
    } else {
      await aiRespondReal(text);        // 真实调用AI 助手；失败则回退到本地演示回复
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
  if (t.includes('欧洲') || t.includes('意大利') || t.includes('游学') || t.includes('两个月') || t.includes('2个月') || t.includes('留学')) return 'europe';
  if (t.includes('对比') || t.includes('纠结') || t.includes('vs') || t.includes('和') && (t.includes('罗马') || t.includes('米兰'))) return 'compare';
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
async function aiRespond(scene, text) {
  switch (scene) {
    case 'europe': rEurope(text); break;
    case 'compare': {
      const lastUser = [...chatMessages.querySelectorAll('.msg.user .msg-bubble')].pop();
      const two = extractTwoCities(lastUser ? lastUser.textContent : '');
      compareCtx = two || { a: '罗马', b: '米兰' };
      rCompare();
      break;
    }
    case 'emergency': await rEmergency(); break;
    case 'execute': await rExecute(); break;
    case 'planb2': await rPlanB2(); break;
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
  // 免费 / 零预算（注意：必须排除 "2000元/1500元/5000元" 这类百位以上数字里的 "0元" 子串）
  if (/(?<![0-9.])0元(?![0-9])|(?<![0-9.])0块(?![0-9])|不花钱|零预算|0预算|预算零|预算是0|预算是0元|免费/.test(t)) return '0元/免费';
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
  if (collected.from) known.push(t('从') + collected.from + t('出发'));
  if (collected.days) known.push(collected.days + t('天'));
  if (collected.purpose) known.push(collected.purpose);
  if (collected.budget) known.push(t('预算') + collected.budget);
  const missing = [];
  if (!collected.from) missing.push(t('从哪里出发'));
  if (!collected.days) missing.push(t('去几天'));
  if (!collected.purpose) missing.push(t('是去出差还是旅行'));
  if (!collected.budget) missing.push(t('预算大概多少'));
  if (!collected.notes) missing.push(t('有没有什么其他要求，比如饮食、节奏、同伴'));
  const j = currentLang === 'en' ? ', ' : '、';
  if (known.length) {
    return t('收到，') + known.join(j) + t('。还想确认一下：') + missing.join('，') + t('呢？');
  }
  return t('我知道你想去') + (dest || t('这个地方')) + t('，请问') + missing.join('，') + t('呢？');
}
function isClarifyDone(text) {
  return /^(没有|暂无|没要求|不需要|就这些|够了|ok|好的|行|可以|就这样|随便|无)$/i.test(text.trim());
}
async function handleClarifyReply(text) {
  // 用户在澄清过程中突然问平台 FAQ（如"退机票"），应优先退出澄清、由知识库直接作答
  const kbResults = await queryKb(text, 3);
  if (kbDirectAnswerable(kbResults, text)) {
    clarifyState.active = false;
    await aiRespondReal(text);
    return;
  }

  const days = extractClarifyDays(text);
  const purpose = extractPurpose(text);
  const budget = extractClarifyBudget(text);
  const from = extractClarifyFrom(text, clarifyState.dest);

  // 用户在澄清中途切换成订具体服务（如"你有没有机票推荐"），且没有补槽位：
  // 退出澄清交给主流程处理，避免一直重复追问同一套槽位。
  const mentionsService = /机票|航班|酒店|住宿|签证|门票|火车票|租车|用车|邮轮|自由行|跟团/.test(text);
  if (mentionsService && !(days || purpose || budget || from)) {
    clarifyState.active = false;
    await aiRespondReal(text);
    return;
  }

  const prefs = extractPreferences(text);
  const c = clarifyState.collected;
  // 用户在澄清中明确给出的槽位，允许覆盖旧值（支持重新设定/纠正）。
  // 未给出的槽位才沿用进入澄清时预填的旧值。
  if (from) c.from = from;
  else if (!c.from && tripState && tripState.dest === clarifyState.dest) c.from = tripState.from;

  if (days) c.days = days;

  if (purpose) c.purpose = purpose;

  if (budget) c.budget = budget;

  // 澄清输入也同步更新全局 tripState，让左侧「行程监控」实时联动
  updateTripFromInput(text, { isClarify: true });
  // 若用户在澄清中切换了目的地，同步到 clarifyState
  if (tripState && tripState.dest && tripState.dest !== clarifyState.dest) {
    clarifyState.dest = tripState.dest;
  }

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
    await aiRespondReal(full);
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
  // 常见目的地关键词（引用全局 CITY_KEYWORDS，避免「香港」「台北」等漏匹配；
  // 同样用 lookbehind 排除「从X出发」里的 X 误识别）
  const dest = text.match(new RegExp('(?<![从])(' + CITY_REGEX_STR + ')'));
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

async function aiRespondReal(text, opts) {
  const options = opts || {};
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
  const tripParsed = updateTripFromInput(text);   // 解析目的地/天数 → 行程监控联动
  const tripChanged = tripParsed.changed;
  setStage(1, 'done');
  setDetail(`<div class="stage-detail"><span class="sd-tag">意图</span>${sceneName}${entities.length ? ' · ' + entities.map(e => `<code>${esc(e)}</code>`).join(' ') : ''}</div>`);

  // ★ 目的地变更检测：用户本轮新说了一个目的地，且与旧 tripState.dest 不同时，
  //   弹出三选一卡片（切换 / 重新设定 / 沿用旧），让用户明确选择，避免 AI 默默吞掉旧行程。
  //   知识库直接命中（FAQ）的场景跳过此步——那是知识问答，不算行程规划。
  //   options.skipDestConflict 用于用户已经在卡片上点过按钮后的二次调用，避免循环。
  if (tripParsed.destConflict && !options.skipDestConflict) {
    const kbResultsEarly = await queryKb(text, 3);
    const kbDirectEarly = kbDirectAnswerable(kbResultsEarly, text);
    if (!kbDirectEarly) {
      setStage(2, 'pending');
      setStage(3, 'pending');
      setStage(4, 'pending');
      setStage(5, 'pending');
      setDetail(`<div class="stage-detail"><span class="sd-tag sd-warn">${t('检测到目的地变更')}</span>${t('从 ')}<code>${esc(tripParsed.destConflict.from)}</code>${t(' 改为 ')}<code>${esc(tripParsed.destConflict.to)}</code>${t('，需要你确认。')}</div>`);
      renderDestinationChangeCard(text, tripParsed.destConflict, stageWrap, {
        onSwitch: (origText) => aiRespondReal(origText, { skipDestConflict: true }),
        onReset:  (origText) => aiRespondReal(origText, { skipDestConflict: true }),
        onKeep:   (origText) => aiRespondReal(origText, { skipDestConflict: true })
      });
      return;
    }
  }

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
  // 只展示/注入真正「可直接作答」的高置信知识库命中。
  // TF-IDF 没有语义理解，服务推荐/行程规划类查询的低相关命中会干扰回答，故仅当 kbDirectAnswerable 为 true 时才使用。
  const kbUseful = kbDirect;
  if (kbResults.length && kbUseful) {
    const display = kbResults.filter(k => (k.score || 0) >= 0.10).slice(0, 3);
    const kbDetail = `<div class="stage-detail"><span class="sd-tag sd-kb">📚 知识库命中 ${display.length}${kbDirect ? ' · 直接引用' : ''}</span>` +
      display.map(k => `<code>${esc((k.category || '') + '/' + (k.subcategory || '') + ' · ' + (k.question || '').slice(0, 16))}</code>`).join(' ') + '</div>';
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
      enterClarifyMode([], stageWrap, memCtx.injectable, tripParsed);
    }
    return;
  }

  // 行程类请求若仍缺少出发地，先追问出发地，避免 AI 给出随机的 inbound 航班。
  // 例外 1：知识库可直接作答的 FAQ 问题；例外 2：用户明显在问具体服务（机票/酒店/签证等），
  // 此时直接交给 Ctrip 处理，它比固定追问更能回应服务类请求。
  const isTripScene = ['general', 'route', 'guide', 'budget'].includes(scene);
  const mentionsService = /机票|航班|酒店|住宿|签证|门票|火车票|租车|用车|邮轮|自由行|跟团/.test(text);
  if (isTripScene && !(tripState && tripState.from) && !kbDirect && !mentionsService) {
    setStage(3, 'pending');
    setStage(4, 'pending');
    setStage(5, 'pending');
    enterClarifyMode([], stageWrap, memCtx.injectable, tripParsed);
    return;
  }

  // ④ 工具调用：仅注入已确认/稳定的记忆 + 平台知识库参考，调用真实 AI 知识引擎
  setStage(3, 'active');
  const memStr = memCtx.injectable.slice(0, 6).map(m => `${m.label}:${m.value}`).join('；');
  let augmented = memStr
    ? `${text}\n\n【用户长期偏好，请在建议中优先考虑】${memStr}`
    : text;
  // 把命中的平台知识库官方口径拼进 prompt，让 AI 优先采用，避免编造
  // 仅注入高置信命中，低相关 FAQ 会干扰服务类/行程类回答
  if (kbResults && kbResults.length && kbUseful) {
    const kbRef = kbResults.filter(k => (k.score || 0) >= 0.10).slice(0, 3).map(k => {
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
      answer += `<div class="mem-noted">${t('🧠 已记住 ')}<b>${added.length}</b>${t(' 条偏好：')}` +
        added.map(m => `<b>${esc(m.value)}</b>`).join(currentLang === 'en' ? ', ' : '、') + t('，后续会自动带入建议。') + '</div>';
    }
    if (tripChanged && tripState && tripState.dest) {
      answer += `<div class="mem-noted trip-noted">${t('🛡️ 已同步「行程监控」：')}<b>${esc(tripState.dest)}${tripState.days ? ' · ' + tripState.days + t('天') : ''}</b>${t('，可在左侧「行程监控」查看动态时间线。')}</div>`;
      await renderMonitorTrip();
    }
    if (kbResults && kbResults.length && kbUseful) {
      const display = kbResults.filter(k => (k.score || 0) >= 0.10).slice(0, 3);
      const top = display[0] || kbResults[0];
      answer += `<div class="mem-noted kb-noted">${t('📚 已引用平台知识库 ')}<b>${display.length}</b>${t(' 条（')}${esc((top.category || '') + '/' + (top.subcategory || ''))}${t('）作为官方参考口径。')}</div>`;
    }
    const answerMsg = addMsg('ai', answer);
    // Plan A 方案选择面板：先给具体方案 + 交通/住宿/活动三组可选项，用户点选后才挂下单入口
    // 之前直接 appendBookCta → 用户没看具体方案就跳到订单，已修复
    if (tripState && tripState.dest) {
      // 从记忆 / 偏好里推断同行人数（人数记忆优先，否则 1 人）
      const partyMem = (memCtx.injectable || []).find(m => m.label === '同行人数');
      const partySize = partyMem ? Math.max(1, parseInt(partyMem.value, 10) || 1) : 1;
      // 汇总所有偏好（含稳定偏好 + 已确认的行程特定偏好），交给活动选项生成器
      const allPrefs = (memCtx.stable || []).concat(memCtx.injectable || []).map(m => ({ label: m.label, value: m.value }));
      attachPlanCard(answerMsg, { dest: tripState.dest, days: tripState.days, from: tripState.from }, partySize, allPrefs);
    }
  } else if (kbResults && kbResults.length && kbUseful) {
    // AI 引擎失败但知识库有高置信命中：直接引用官方口径作为兜底，避免只展示错误
    setStage(3, 'done');
    setStage(4, 'done');
    setStage(5, 'done');
    await sleep(150);
    const display = kbResults.filter(k => (k.score || 0) >= 0.10).slice(0, 3);
    const top = display[0] || kbResults[0];
    let answer = `<div class="kb-fallback-hint">${t('⚠️ AI 知识引擎今日额度已用完，以下直接引用平台知识库 ')}<b>${display.length}</b>${t(' 条官方口径：')}</div>` +
      display.map((k, i) => {
        const ans = esc((k.answer || '').replace(/\s+/g, ' ').trim()).replace(/\n/g, '<br>');
        return `<div class="kb-faq-item">
          <div class="kb-faq-q"><b>${i + 1}. ${esc(k.question || '')}</b> <span class="kb-faq-tag">${esc((k.category || '') + '/' + (k.subcategory || ''))}</span></div>
          <div class="kb-faq-a">${ans}</div>
        </div>`;
      }).join('') +
      `<div class="mem-noted kb-noted">${t('📚 已引用平台知识库 ')}<b>${display.length}</b>${t(' 条（')}${esc((top.category || '') + '/' + (top.subcategory || ''))}${t('）作为官方参考口径。')}</div>`;
    addMsg('ai', answer);
  } else {
    addMsg('ai', `<p>${t('⚠️ 暂时连不上 AI 知识引擎，已回退到本地演示回复。')}</p>`);
    await aiRespond(scene === 'route' || scene === 'guide' ? 'general' : scene, text);
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
  // 用本轮解析出的目的地（tripState.dest 已经更新过），避免硬编码「北京之行」
  const newDest = (tripState && tripState.dest) || '';
  card.innerHTML = `
    <div class="clarify-title">${t('🧠 检测到历史行程设定')}</div>
    <p class="clarify-desc">${fillInc(t('你只说了「|TXT|」，但我之前记录过这些行程特定信息。它们对本次|NEW|是否仍然适用？'), '', '').replace('|TXT|', esc(originalText)).replace('|NEW|', esc(newDest || '新行程'))}</p>
    <div class="clarify-list">${items}</div>
    <div class="clarify-actions">
      <button class="btn btn-primary clar-confirm">${t('✅ 沿用这些设定')}</button>
      <button class="btn clar-reject">${t('🔄 重新设定')}</button>
    </div>
    <p class="clarify-tip">${t('选择“重新设定”后，会<b>清空全部记忆</b>并用聊天方式重新问你几个简单问题（去几天、出差还是旅行、预算等），再给出建议。')}</p>
  `;
  stageWrap.appendChild(card);
  scrollChat();

  card.querySelector('.clar-confirm').addEventListener('click', () => {
    tripMems.forEach(m => confirmedTripMemLabels.add(m.label));
    card.remove();
    addMsg('user', '<p>' + t('沿用这些设定') + '</p>');
    sendAsUserConfirm(originalText, summary);
  });
  card.querySelector('.clar-reject').addEventListener('click', () => {
    card.remove();
    addMsg('user', '<p>' + t('重新设定') + '</p>');
    clearAllMemories();   // 重新设定 = 清空全部记忆，从零开始
    sendAsUserReject(originalText, tripMems);
  });
}

// 目的地变更卡片：当用户输入的新目的地 ≠ 旧 tripState.dest 时弹出，
// 让用户在「切换 / 重新设定 / 沿用旧」三选一，避免 AI 默默把旧行程吞掉。
function renderDestinationChangeCard(originalText, conflict, stageWrap, callbacks) {
  const id = 'destchg-' + Date.now();
  const card = document.createElement('div');
  card.className = 'clarify-card destchg-card';
  card.id = id;
  card.innerHTML = `
    <div class="clarify-title">${t('🗺️ 目的地好像变了')}</div>
    <p class="clarify-desc">${fillInc(t('你这次说想去 <b>|TO|</b>，但我之前记录过你想去 <b>|FROM|</b>。要怎么处理？'), '', '').replace('|TO|', esc(conflict.to)).replace('|FROM|', esc(conflict.from))}</p>
    <div class="clarify-list">
      <div class="clar-item"><span class="clar-label">${t('旧目的地')}</span><span class="clar-value">${esc(conflict.from)}</span></div>
      <div class="clar-item"><span class="clar-label">${t('新目的地')}</span><span class="clar-value">${esc(conflict.to)}</span></div>
    </div>
    <div class="clarify-actions destchg-actions">
      <button class="btn btn-primary dc-switch">${fillInc(t('✅ 改为「|TO|」'), '', '').replace('|TO|', esc(conflict.to))}</button>
      <button class="btn dc-reset">${t('🔄 重新设定')}</button>
      <button class="btn dc-keep">${fillInc(t('← 沿用「|FROM|」'), '', '').replace('|FROM|', esc(conflict.from))}</button>
    </div>
    <p class="clarify-tip">${fillInc(t('选「沿用旧」会忽略本次目的地变更，按之前的「|FROM|」继续；选「重新设定」会清空全部记忆，从零开始。'), '', '').replace('|FROM|', esc(conflict.from))}</p>
  `;
  stageWrap.appendChild(card);
  scrollChat();

  card.querySelector('.dc-switch').addEventListener('click', () => {
    card.remove();
    addMsg('user', '<p>' + fillInc(t('改为「|TO|」'), '', '').replace('|TO|', esc(conflict.to)) + '</p>');
    // 同步更新「目的地」行程记忆（如果存在）→ 让后续 AI 看到的也是新目的地
    updateDestinationMemory(conflict.from, conflict.to);
    // 保留其他行程特定记忆（仅更新目的地这一条），重新走完整流程，跳过 destConflict 检查
    callbacks && callbacks.onSwitch && callbacks.onSwitch(originalText);
  });
  card.querySelector('.dc-reset').addEventListener('click', () => {
    card.remove();
    addMsg('user', '<p>' + t('重新设定') + '</p>');
    clearAllMemories();   // 重新设定 = 清空全部记忆，从零开始
    callbacks && callbacks.onReset && callbacks.onReset(originalText);
  });
  card.querySelector('.dc-keep').addEventListener('click', () => {
    card.remove();
    addMsg('user', '<p>' + fillInc(t('沿用「|FROM|」'), '', '').replace('|FROM|', esc(conflict.from)) + '</p>');
    // 回滚 tripState.dest 到旧值（当前已是新值，需要覆盖回去）
    rollbackDestination(conflict.from);
    callbacks && callbacks.onKeep && callbacks.onKeep(originalText);
  });
}

// 同步更新「目的地」记忆（如果存在），让后续 AI 看到的是新目的地而非旧的
function updateDestinationMemory(oldDest, newDest) {
  const idx = extractedMemories.findIndex(m => m.label === '目的地' && m.value === oldDest);
  if (idx >= 0) {
    extractedMemories[idx] = { label: '目的地', value: newDest, _t: Date.now() };
    saveMemories();
    renderMemoryPage && renderMemoryPage();
    updateCtxMemory && updateCtxMemory();
  } else {
    // 没有旧目的地的记忆但有 tripState，添加一条新的目的地记忆
    addMemories([{ label: '目的地', value: newDest }]);
  }
}

// 把 tripState.dest 回滚到旧值（卡片选了「沿用旧」时调用）
function rollbackDestination(oldDest) {
  if (!tripState) tripState = { dest: '', days: 0, from: '', purpose: '', updatedAt: Date.now() };
  tripState.dest = oldDest;
  tripState.from = '';   // 旧出发地残留一并清空（用户没说，不要回填）
  tripState.updatedAt = Date.now();
  saveTrip();
  renderTripMemory && renderTripMemory();
}

// 确认沿用：把行程特定记忆拼回 prompt，重新走完整 6 阶段
function sendAsUserConfirm(originalText, summary) {
  clarifyState.active = false;
  saveTripLabelState();
  const tid = addTyping();
  setTimeout(() => { remTyping(tid); aiRespondReal(originalText + '\n\n（本次行程沿用：' + summary + '）'); }, 400);
}

  // 拒绝沿用：把当前行程特定记忆标记为已排除，进入聊天式澄清追问
function enterClarifyMode(tripMems, stageWrap, injectable, parsed) {
  if (tripMems && tripMems.length) {
    tripMems.forEach(m => rejectedTripMemLabels.add(m.label));
    saveTripLabelState();
  }
  // 预填策略：仅采纳「本轮」已从输入正则解析出的事实（parsed.hasDays/hasFrom），
  // 避免 tripState 残留（来自上一轮/上一会话，如「上海」）污染新行程的提问文案。
  // tripState.days/from 仅作为本轮解析的兜底（如用户在澄清中再纠正槽位）。
  // parsed 缺失（老调用点）时，按"本轮无明确槽位"处理，只采纳「行程时长」记忆。
  const p = parsed || {};
  const prefillDays = p.hasDays
    ? ((tripState && tripState.days > 0) ? tripState.days : 0)
    : 0;
  // 用户本轮若显式给出 from，就直接采用（包括「从北京出发去北京」的同城场景），
  // 不要再追问「从哪里出发」；只有本轮未提及 from 时才留空（避免 tripState 残留污染）。
  const prefillFrom = p.hasFrom
    ? ((tripState && tripState.from) ? tripState.from : '')
    : '';
  // 出行目的：用户本轮若说"公派出差"就预填，避免追问"是去出差还是旅行"
  const prefillPurpose = p.hasPurpose
    ? ((tripState && tripState.purpose) ? tripState.purpose : '')
    : '';
  clarifyState = {
    active: true,
    dest: (tripState && tripState.dest) || '',
    collected: { days: prefillDays, purpose: prefillPurpose, budget: '', from: prefillFrom, notes: '' }
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
  addMsg('user', '<p>' + t('重新设定') + '</p>');
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
  // 从本次输入真实抽取约束（不再写死）
  const mems = [];
  if (text.includes('月')) { const m = text.match(/(\d+)\s*个?月/); if (m) mems.push({label:'行程时长',value:m[1]+' 个月'}); }
  if (text.includes('周')) { const m = text.match(/(\d+)\s*周/); if (m) mems.push({label:'行程时长',value:m[1]+' 周'}); }
  if (text.includes('万')) { const m = text.match(/(\d+(?:\.\d+)?)\s*万/); if (m) mems.push({label:'总预算',value:m[1]+' 万元'}); }
  if (text.includes('清淡')||text.includes('少辣')) mems.push({label:'饮食偏好',value:'清淡、少辣'});
  if (text.includes('语言')||text.includes('学')) mems.push({label:'学习目标',value:'语言提升+文化体验'});
  if (text.includes('慢')||text.includes('不赶')) mems.push({label:'出行节奏',value:'慢节奏、不赶路'});
  addMemories(mems);

  // 展示真实存入的约束（取记忆中心里与本次相关的条目），无则给引导
  const showLabels = ['行程时长', '总预算', '学习目标', '目的地', '饮食偏好', '出行节奏', '预算习惯', '住宿偏好'];
  const rows = extractedMemories
    .filter(m => showLabels.includes(m.label))
    .slice(0, 6)
    .map(m => `<div class="bubble-card-row"><span class="l">${esc(m.label)}</span><span class="v">${esc(m.value)}</span></div>`)
    .join('');

  const cardHtml = rows
    ? `<div class="bubble-card">
        <div class="bubble-card-header">🔍 已提取的约束条件（已存入长期记忆）</div>
        ${rows}
      </div>
      <div class="bubble-warn">🧠 这些约束已存入长期记忆，后续对话与规划都会自动带入。</div>`
    : `<div class="bubble-warn">💡 你可以直接告诉我：想去哪、去多久、预算多少、偏好什么，我会实时提取成长期约束。</div>`;

  addMsg('ai', `
    <p>${t('好的！让我帮你理清思路 ✨')}</p>
    ${cardHtml}
    <p>${t('接下来你可以粘贴收集的旅行攻略、签证资料，或让我规划具体路线。')}</p>
  `);

  addChips([{ label: t('📅 帮我规划城市路线'), act: '帮我规划城市路线' }, { label: t('💰 帮我做预算分配'), act: '帮我做预算分配' }, { label: t('📎 粘贴攻略链接'), act: '粘贴攻略链接' }]);
  const n = mems.length;
  if (n) showToast('🧠 ' + n + t('个约束已存入长期记忆'));
}

// ============================================
// Scene: Compare
// ============================================
// 对比上下文：演示默认罗马 vs 米兰；真实对话从用户消息解析两城市
let compareCtx = { a: '罗马', b: '米兰' };

// 罗马 / 米兰 的精选对比数据（演示用，与「意大利文化艺术游学」场景一致）
const COMPARE_CURATED = {
  '罗马': { icon: '🏛️', score: 89, dims: { '💰 预算可控': 78, '🎨 艺术文化': 95, '🍝 美食体验': 88, '🛍️ 购物时尚': 70, '😌 体力友好': 80, '🏛️ 历史人文': 94 } },
  '米兰': { icon: '🛍️', score: 84, dims: { '💰 预算可控': 82, '🎨 艺术文化': 88, '🍝 美食体验': 85, '🛍️ 购物时尚': 96, '😌 体力友好': 83, '🏛️ 历史人文': 80 } },
};

// 从文本中解析出两个对比城市（基于城市白名单）
function extractTwoCities(text) {
  if (!text) return null;
  const re = new RegExp('(' + CITY_REGEX_STR + ')', 'g');
  const seen = [];
  let m;
  while ((m = re.exec(text)) && seen.length < 8) {
    const c = m[1];
    if (!seen.includes(c)) seen.push(c);
  }
  if (seen.length >= 2) return { a: seen[0], b: seen[1] };
  return null;
}

function rCompare() {
  const { a, b } = compareCtx;
  const ca = COMPARE_CURATED[a], cb = COMPARE_CURATED[b];
  const curated = !!(ca && cb);
  const scoreA = ca ? ca.score : (60 + hashStr(a) % 35);
  const scoreB = cb ? cb.score : (60 + hashStr(b) % 35);
  const iconA = ca ? ca.icon : '📍';
  const iconB = cb ? cb.icon : '📍';
  const winnerIsA = scoreA >= scoreB;
  const dims = curated
    ? Object.keys(ca.dims).map(k => ({ label: k, av: ca.dims[k], bv: cb.dims[k] }))
    : ['💰 预算可控', '🎨 艺术文化', '🍝 美食体验', '🛍️ 购物时尚', '😌 体力友好', '🏛️ 历史人文']
        .map(k => ({ label: k, av: 60 + hashStr(a + k) % 35, bv: 60 + hashStr(b + k) % 35 }));
  const dimRows = dims.map(d =>
    `<div class="bubble-card-row"><span class="l">${t(d.label)}</span><span class="v">${esc(a)}${d.av} · ${esc(b)}${d.bv}</span></div>`
  ).join('');
  const conclusion = curated
    ? t('示意结论：<strong>|A|</strong> 更契合「文化艺术游学 + 慢节奏」的偏好；若你更偏重设计 / 时尚 / 购物，<strong>|B|</strong> 更优。可在「方案对比」页用真实数据调权重。')
        .replace('|A|', `${iconA} ${esc(a)}`).replace('|B|', `${iconB} ${esc(b)}`)
    : t('示意结论：<strong>|W|</strong> 综合得分略高。可在「方案对比」页输入真实目的地，由 AI 助手实时生成多维对比。')
        .replace('|W|', `${winnerIsA ? esc(a) : esc(b)}`);
  const labelA = winnerIsA
    ? '<div style="font-size:12px;font-weight:700;color:var(--green);">' + t('⭐ 综合得分') + '</div>'
    : '<div style="font-size:12px;color:var(--ink2);">' + t('综合得分') + '</div>';
  const labelB = winnerIsA
    ? '<div style="font-size:12px;color:var(--ink2);">' + t('综合得分') + '</div>'
    : '<div style="font-size:12px;font-weight:700;color:var(--green);">' + t('⭐ 综合得分') + '</div>';
  const mini = `
    <div class="compare-mini">
      <div class="compare-mini-item ${winnerIsA ? 'winner' : ''}">
        <div>${iconA} ${esc(a)}</div>
        <div class="big r">${scoreA}</div>
        ${labelA}
      </div>
      <div class="compare-mini-item ${winnerIsA ? '' : 'winner'}">
        <div>${iconB} ${esc(b)}</div>
        <div class="big g">${scoreB}</div>
        ${labelB}
      </div>
    </div>`;

  addMsg('ai', `
    <p>${t('好问题！让我并行查询两边数据...')}</p>
    <p style="font-size:12px;color:var(--ink2);">${t('🔧 同时调用：天气MCP · 航班MCP · 住宿MCP · 知识库RAG')}</p>
  `);

  addMsg('ai', `
    <p>${t('示意对比（演示模型 · 文化艺术优先、体力友好）：')}</p>
    ${mini}
    <div class="bubble-card">
      <div class="bubble-card-header">${t('📊 6维度对比')}</div>
      ${dimRows}
    </div>
    <div class="bubble-warn">${t('🧪 以上为示意评分（演示模型）。真实多维对比请到「方案对比」页输入目的地，由 AI 助手实时生成。')}</div>
    <p>${conclusion}</p>
  `);

  addChips([{ label: t('🔍 展开详细证据'), act: '展开详细证据' }, { label: t('📊 去方案对比页（真实数据）'), act: '去方案对比页（真实数据）' }, { label: t('💾 保存对比结果'), act: '保存对比结果' }]);
}

// ============================================
// Scene: Emergency
// ============================================
async function rEmergency() {
  const trip = tripState || {};
  const dest = trip.dest || '目的地';
  const days = trip.days || 5;
  const inc = buildIncident(dest, days);
  const cost = await fetchPlanBCost(dest, days);
  inc.notifyCost = cost.notifyCost;
  inc.rebookCost = cost.rebookCost;
  inc.b2total = cost.b2total;
  inc.b2meta = [`💰 净增约 ¥${inc.b2total}`, '🚌 需改签交通', '🏨 酒店退改'];
  const conf = 90 + (hashStr(dest) % 9);   // 与监控页一致的动态置信度
  addMsg('ai', `
    <p>🚨 <span class="detect-tag-inline auto">${t('🤖 系统自动检测')}</span></p>
    <p style="font-size:11px;color:var(--ink2);">${t('天气监控 · 模拟预警 · 置信度 ')}${conf}%</p>
  `);

  addMsg('ai', `
    <p><strong>Day ${inc.hitDay} ${esc(t(inc.alertName))}</strong>${t('，预计影响你的')}${esc(dest)}${t('行程。')}</p>
    <p>${t('正在生成Plan B（结合你的约束：体验优先、预算可控、体力友好）...')}</p>
  `);

  addMsg('ai', `
    <p>${t('2个替代方案：')}</p>
    <div class="planb-mini rec">
      <strong>${t('⭐ Plan B1 — 室内备选方案（推荐）')}</strong>
      <p>${esc(fillInc(t(inc.b1), dest, inc.b1day, inc.hitDay))}</p>
      <div class="planb-mini-tags">${inc.b1meta.map(m => `<span>${esc(t(m))}</span>`).join('')}</div>
    </div>
    <div class="planb-mini">
      <strong>${t('Plan B2 — 提前转移邻近城市')}</strong>
      <p>${esc(fillInc(t(inc.b2), dest, '', inc.b2day))}</p>
      <div class="planb-mini-tags">${inc.b2meta.map(m => `<span>${esc(t(m))}</span>`).join('')}</div>
    </div>
    <p>${t('推荐 ')}<strong>Plan B1</strong>${t('。要执行吗？')}</p>
  `);

  addChips([{ label: t('✅ 执行 Plan B1'), act: '执行 Plan B1' }, { label: t('🔄 查看 Plan B2 详情'), act: '查看 Plan B2 详情' }]);
}

// ============================================
// Scene: Execute (MCP orchestration)
// ============================================
async function rExecute() {
  const trip = tripState || {};
  const dest = trip.dest || '目的地';
  const inc = buildIncident(dest, trip.days || 5);
  const cost = await fetchPlanBCost(trip.dest, trip.days);
  inc.notifyCost = cost.notifyCost;
  inc.rebookCost = cost.rebookCost;
  inc.b2total = cost.b2total;
  inc.orphSteps = cost.steps.map((s, i) => ({
    name: s.name || inc.orphSteps[i]?.name || '',
    api: s.api || inc.orphSteps[i]?.api || '',
    cost: '¥' + s.cost,
  }));
  const steps = inc.orphSteps;
  const t0 = performance.now();   // 实测编排耗时

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
        <strong style="font-size:12px;">${esc(fillInc(t(s.name), dest, '', ''))}</strong>
        <span style="font-size:10px;color:var(--ink2);display:block;">${esc(t(s.api))} · ${esc(s.cost)}</span>
      </div>
      <span style="font-size:10px;color:var(--ink3);" class="och-stat">${t('等待')}</span>
    `;
    orch.appendChild(d);
  });

  const note = document.createElement('p');
  note.style.cssText = 'font-size:11px;color:var(--ink3);margin-top:8px;';
  note.textContent = t('🔐 均为非支付类操作。退款/扣款将单独授权。');
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
    const elapsed = ((performance.now() - t0) / 1000).toFixed(1);   // 真实耗时
    const doneMsg = addMsg('ai', `
      <p>✅ <strong>全部执行完成！</strong></p>
      <p style="font-size:11px;color:var(--ink2);">总耗时${elapsed}秒 · ${steps.length}个MCP调用成功 · 编排费用¥${inc.notifyCost}</p>
      <p>同行人已收到行程更新通知。</p>
    `);
    // Plan B 改订下单入口
    const bookItems = planBBookingItems(inc, (tripState && tripState.dest) || '目的地');
    if (bookItems.length) appendBookCta(doneMsg, 'B', { items: bookItems });
    showToast('✅ Plan B 执行完成');
  }, 2900);
}

// ============================================
// Other scenes
// ============================================
async function rPlanB2() {
  const trip = tripState || {};
  const dest = trip.dest || '目的地';
  const inc = buildIncident(dest, trip.days || 5);
  const cost = await fetchPlanBCost(dest, trip.days);
  inc.b2total = cost.b2total;
  addMsg('ai', `
    <p><strong>${esc(fillInc(t('Plan B2 详情（|DEST|）：'), dest, '', ''))}</strong></p>
    <p>${t('提前1天前往邻近城市。')}<br/>${esc(dest)}${t('住宿退1晚 → 邻城加1晚 → 交通改签。')}</p>
    <p>${t('💰 净增费用：约 ¥')}${inc.b2total}<br/>📚 Day ${inc.hitDay + 1}${t('行程顺延1天，不影响内容。')}<br/>⚠️ ${t('需要交通票改签（提前2小时可免费改签）。')}</p>
    <p>${t('相比Plan B1，多了交通改签的麻烦。建议还是 ')}<strong>Plan B1</strong>.</p>
  `);
  addChips([{ label: t('✅ 还是执行 Plan B1'), act: '执行 Plan B1' }, { label: t('📞 联系课程老师确认'), act: '联系课程老师确认' }]);
}

function rEvidence() {
  const dest = (tripState && tripState.dest) || '目的地';
  const today = new Date().toLocaleDateString(currentLang === 'en' ? 'en-US' : 'zh-CN');
  addMsg('ai', `
    <p>${esc(fillInc(t('📋 <strong>证据链 — |DEST|</strong>'), dest, '', ''))}</p>
    <div class="bubble-card">
      <div class="bubble-card-row"><span class="l">${t('🌤️ 天气')}</span><span class="v">${t('天气服务 · 查询于 ')}${esc(today)}</span></div>
      <div class="bubble-card-row"><span class="l">${t('✈️ 机票')}</span><span class="v">${t('预估区间 · 以下单实时报价为准')}</span></div>
      <div class="bubble-card-row"><span class="l">${t('🏨 住宿')}</span><span class="v">${t('预估区间 · 以下单实时报价为准')}</span></div>
      <div class="bubble-card-row"><span class="l">${t('📚 攻略')}</span><span class="v">${t('平台知识库 RAG 检索')}</span></div>
    </div>
    <div class="bubble-warn">${t('⚠️ 价格为预估，真实成交价需在「下单预订」中获取实时报价。')}</div>
  `);
}

function rBudget() {
  // 预算总额：优先「总预算」记忆，其次由「预算习惯」×天数推算，否则给引导
  const dest = (tripState && tripState.dest) || '';
  const days = (tripState && tripState.days) || 0;
  const totalMem = extractedMemories.find(m => m.label === '总预算');
  let total = 0;
  if (totalMem) {
    const m = totalMem.value.match(/(\d+(?:\.\d+)?)/);
    if (m) { total = parseFloat(m[1]); if (/万/.test(totalMem.value)) total *= 10000; }
  }
  if (!total) {
    const perDayMem = extractedMemories.find(m => m.label === '预算习惯');
    if (perDayMem && days) {
      const m = perDayMem.value.match(/(\d[\d,]*)/);
      if (m) total = parseFloat(m[1].replace(/,/g, '')) * days;
    }
  }

  if (!total) {
    addMsg('ai', `
      <p>${t('要做预算分配，我需要先知道你的<strong>总预算</strong>和<strong>行程天数</strong>。')}</p>
      <p>${t('你可以说：例如「预算3万，玩10天」，我就能按机票/住宿/餐饮/活动/应急给出建议分配。')}</p>
    `);
    addChips([{ label: t('📅 帮我规划城市路线'), act: '帮我规划城市路线' }]);
    return;
  }

  // 按行程结构动态分配（比例透明、可解释；金额随你的预算与天数变化）
  const alloc = [
    [t('✈️ 交通/机票'), 0.20],
    [t('🏨 住宿') + (days ? `（${Math.max(1, days - 1)}晚）` : ''), 0.28],
    [t('🍽️ 餐饮'), 0.18],
    [t('🎫 活动/门票'), 0.16],
    [t('🚇 当地交通'), 0.08],
    [t('💡 应急预留'), 0.10],
  ];
  const rows = alloc.map(([label, pct]) =>
    `<div class="bubble-card-row"><span class="l">${label}</span><span class="v">${yuan(total * pct)} · ${Math.round(pct * 100)}%</span></div>`
  ).join('');

  const head = (currentLang === 'en')
    ? `Based on ${dest ? '"' + esc(dest) + '"' : 'your trip'}${days ? ' · ' + days + ' days' : ''} · Total budget <strong>${yuan(total)}</strong>:`
    : `基于${dest ? '「' + esc(dest) + '」' : '你的行程'}${days ? ' · ' + days + t('天') : ''} · 总预算 <strong>${yuan(total)}</strong>：`;
  addMsg('ai', `
    <p>${head}</p>
    <div class="bubble-card">
      <div class="bubble-card-header">${t('💰 建议分配（按行程结构测算）')}</div>
      ${rows}
      <div class="bubble-card-row"><span class="l"><strong>${t('合计')}</strong></span><span class="v"><strong>${yuan(total)}</strong></span></div>
    </div>
    <div class="bubble-warn">${t('⚠️ 比例为通用测算模型，实际以下单报价为准。')}</div>
  `);
  addChips([{ label: t('📅 帮我规划城市路线'), act: '帮我规划城市路线' }, { label: t('🧾 下单预订'), act: '下单预订' }, { label: t('💾 保存预算方案'), act: '保存预算方案' }]);
}

function rMemory() {
  if (!extractedMemories.length) {
    addMsg('ai', `
      <p>${t('🧠 你目前还没有长期记忆。')}</p>
      <p>${t('在对话中描述偏好（如「我吃得清淡」「预算每天1000」「喜欢慢节奏」），我会自动提取并存入，也可以在「记忆中心」手动添加。')}</p>
    `);
    return;
  }
  const rows = extractedMemories.map(m =>
    `<div class="bubble-card-row"><span class="l">${m.locked ? '🔒' : '📌'} ${esc(m.label)}</span><span class="v">${esc(m.value)}</span></div>`
  ).join('');
  addMsg('ai', `
    <p>${t('🧠 你的长期记忆（共 ')}${extractedMemories.length}${t(' 条）：')}</p>
    <div class="bubble-card">${rows}</div>
    <p>${t('这些记忆会在未来的对话中自动激活。你可以在「记忆中心」随时编辑或删除。')}</p>
  `);
}

function rGeneral() {
  addMsg('ai', `
    <p>${t('收到！我理解你想规划旅行 🗺️')}</p>
    <p>${t('可以多告诉我一些细节：目的地、时间、预算、同行人数、喜欢的节奏？')}</p>
  `);
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
  // 每个目的地只输出该目的地的内容（不再"vs对方"），由前端并排展示对比
  const qFor = name => `请只讲 ${name} 本身的旅行特点${focusTxt}。从预算、美食、自然风光、体验、适合人群、大致费用区间等角度介绍 ${name} 的优劣。直接介绍 ${name}，不要提对方，不要写"vs"对比。`;
  if (aEl) aEl.innerHTML = '<p class="loading">' + t('⏳ 正在向 AI 助手查询「') + esc(a) + t('」…') + '</p>';
  if (bEl) bEl.innerHTML = '<p class="loading">' + t('⏳ 正在向 AI 助手查询「') + esc(b) + t('」…') + '</p>';
  if (sumEl) sumEl.innerHTML = '';
  setStatus('对比查询中...', true);

  const [htmlA, htmlB] = await Promise.all([
    ctripHtml(qFor(a)),
    ctripHtml(qFor(b)),
  ]);
  if (aEl) aEl.innerHTML = (htmlA || '<p>' + t('无结果') + '</p>');
  if (bEl) bEl.innerHTML = (htmlB || '<p>' + t('无结果') + '</p>');

  if (sumEl) {
    sumEl.innerHTML = '<p class="loading">' + t('⏳ 正在生成综合建议…') + '</p>';
    const sum = await ctripHtml(`基于前面的对比，综合来看更推荐 ${a} 还是 ${b}？给出一句话结论和简要理由。`);
    sumEl.innerHTML = `<div class="rec-label">` + t('🤖 AI 助手 · 综合建议') + `</div>` + (sum || '<p>' + t('无结果') + '</p>');
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
async function renderMonitorTrip() {
  const card = document.getElementById('timelineCard');
  const incidentBody = document.getElementById('incidentBody');
  const incidentHint = document.getElementById('incidentEmptyHint');
  if (!card) return;
  if (!tripState || !tripState.dest) {
    // 尚未在对话中规划行程 → 给出引导（保留默认示意于下方）
    if (!card.querySelector('.tl-empty-hint')) {
      const hint = document.createElement('div');
      hint.className = 'tl-empty-hint';
      hint.innerHTML = t('💡 在「AI 对话」中说出目的地和天数（如「去清迈玩5天」），这里会自动生成你的专属行程时间线。以下为示例数据。');
      card.insertBefore(hint, card.firstChild.nextSibling);
    }
    if (incidentBody) incidentBody.style.display = 'none';
    if (incidentHint) incidentHint.style.display = '';
    return;
  }
  if (incidentHint) incidentHint.style.display = 'none';
  if (incidentBody) incidentBody.style.display = '';
  const { dest, days, from } = tripState;
  const phases = buildTimelinePhases(dest, days);
  const monitorBar = `<div class="tl-monitor-bar">${t('🛰️ 当前监控行程：')}<b>${esc(dest)}</b> · <b>${esc(String(days || '?'))}</b>${t('天')}${from ? t(' · 出发地 ') + esc(from) : ''}${t(' · 数据来源：AI 对话')}</div>`;
  const rows = phases.map((p, i) => {
    const st = i === 0 ? 'done' : (i === 1 ? 'active' : 'pending');
    const dotCls = st === 'active' ? 'tl-dot pulse' : 'tl-dot';
    const tag = st === 'done' ? '<span class="tl-tag ok">✅</span>'
      : st === 'active' ? '<span class="tl-tag warn">' + t('进行中') + '</span>'
      : '<span class="tl-tag pending">⏳</span>';
    return `<div class="tl-item ${st === 'done' ? 'done' : ''}"><div class="${dotCls}"></div>` +
      `<div class="tl-info"><span class="tl-day">${esc(p.day)}</span><p>${esc(t(p.text))}</p></div>${tag}</div>`;
  }).join('');
  card.innerHTML =
    monitorBar +
    `<h3>📍 行程时间线 — ${esc(dest)} ${days || ''}${t('天')} <span class="tl-live">${t('· 来自 AI 对话')}</span></h3>` +
    (from ? `<p class="tl-sub">${t('出发地：')}${esc(from)} → ${t('目的地：')}${esc(dest)}</p>` : '') +
    rows +
    `<p class="tl-note">${t('⏱️ 时间线依据你在对话中规划的行程动态生成；天气/航班预警为产品演示。')}</p>`;
  await renderMonitorIncident(dest, days);
}

// 稳定哈希：相同目的地总是映射到同一类突发场景（演示数据稳定可复现）
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < (s || '').length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// 依据当前行程（目的地 + 天数）生成贴合的突发状况与 Plan B 备选（演示用模拟数据）
// 从后端接口获取 Plan B 编排链费用；接口异常或未返回时，所有费用默认 0 元
async function fetchPlanBCost(dest, days) {
  const safeDest = dest || '目的地';
  const safeDays = (days && days > 0) ? days : 5;
  try {
    const r = await fetch('/api/planb/orchestrate-cost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dest: safeDest, days: safeDays }),
    });
    if (!r.ok) throw new Error('cost api error');
    const d = await r.json();
    const rawSteps = Array.isArray(d.steps) ? d.steps : [];
    const safeSteps = rawSteps.map(s => ({
      name: s.name || '',
      api: s.api || '',
      cost: typeof s.cost === 'number' ? s.cost : 0,
    }));
    while (safeSteps.length < 4) {
      safeSteps.push({ name: '', api: '', cost: 0 });
    }
    return {
      steps: safeSteps.slice(0, 4),
      notifyCost: typeof d.notifyCost === 'number' ? d.notifyCost : 0,
      rebookCost: typeof d.rebookCost === 'number' ? d.rebookCost : 0,
      b2total: typeof d.b2total === 'number' ? d.b2total : 0,
    };
  } catch (e) {
    return {
      steps: [
        { name: '取消受影响户外场地', api: '预订MCP: cancel_booking', cost: 0 },
        { name: '预订|DEST|室内替代场地', api: '预订MCP: create_booking', cost: 0 },
        { name: '确认特色工坊/活动', api: '预定MCP: book_local', cost: 0 },
        { name: '通知同行人 + 更新行程', api: '通知MCP: send_wechat', cost: 0 },
      ],
      notifyCost: 0,
      rebookCost: 0,
      b2total: 0,
    };
  }
}

function buildIncident(dest, days) {
  dest = dest || '目的地';
  days = (days && days > 0) ? days : 5;
  const hitDay = Math.max(2, Math.min(days - 1, Math.round(days / 3) + 1));
  const alerts = [
    { name: '暴雨橙色预警', desc: '预计持续8小时。户外行程与交通路段受影响。' },
    { name: '台风蓝色预警', desc: '沿海风力增强，船只与户外活动可能临时取消。' },
    { name: '高温红色预警', desc: '日间气温突破38℃，户外徒步存在中暑风险。' },
    { name: '强对流大风预警', desc: '短时大风可达8级，高空与水面活动暂停。' },
  ];
  const a = alerts[hashStr(dest) % alerts.length];
  const moveDay = Math.min(days, hitDay + 2);
  return {
    hitDay,
    alertName: a.name,
    alertDesc: a.desc,
    b1: '|DEST|本地博物馆 + 特色室内工坊，行程平移。户外/水面活动推迟至 Day |DAY|。',
    b1day: moveDay,
    b1meta: ['💰 无额外费用', '📚 体验目标不变', '⏰ 仅调整顺序'],
    b2: '提前1天前往邻近城市。|DEST|退1晚，邻城加1晚。Day |HD|行程顺延。',
    b2day: hitDay + 1,
    b2meta: ['💰 净增约 ¥0', '🚌 需改签交通', '🏨 酒店退改'],
    // 费用字段先默认 0，由 fetchPlanBCost 注入后覆盖
    notifyCost: 0,
    rebookCost: 0,
    b2total: 0,
    orphSteps: [
      { name: '取消受影响户外场地', api: '预订MCP: cancel_booking', cost: '¥0' },
      { name: '预订|DEST|室内替代场地', api: '预订MCP: create_booking', cost: '¥0' },
      { name: '确认特色工坊/活动', api: '预定MCP: book_local', cost: '¥0' },
      { name: '通知同行人 + 更新行程', api: '通知MCP: send_wechat', cost: '¥0' },
    ],
  };
}

// 当前监控页选中的 Plan B 方案（B1/B2），供 execBtn 读取
let monSelectedPlan = 'B1';

// 根据当前行程渲染行程监控的「突发状况 + Plan B + 编排链」
async function renderMonitorIncident(dest, days) {
  const body = document.getElementById('incidentBody');
  if (!body) return;
  monSelectedPlan = 'B1';
  const inc = buildIncident(dest, days);
  const conf = 90 + (hashStr(dest) % 9); // 90-98 稳定置信度
  const orchestration = inc.orphSteps;
  body.innerHTML = `
    <div class="detect-tag">
      <span class="badge auto">${t('🤖 系统自动检测')}</span>
      <span class="detect-meta">${t('模拟监控 · Day ')}${inc.hitDay}${t(' · 置信度 ')}${conf}%</span>
    </div>
    <div class="alert-box">
      <div class="alert-icon">🚨</div>
      <div>
        <h3>Day ${inc.hitDay} — ${esc(t(inc.alertName))}</h3>
        <p>${esc(t(inc.alertDesc))}</p>
      </div>
    </div>
    <h4 style="margin:20px 0 12px;font-size:15px;">${t('🤖 AI 推荐 Plan B（综合你的约束 · 点击方案可切换）')}</h4>
    <div class="plan-card selected" data-plan="B1">
      <div class="plan-head">
        <strong>${t('⭐ Plan B1 — 室内备选方案')}</strong>
        <span class="plan-tag rec">${t('推荐')}</span>
      </div>
      <p>${esc(fillInc(t(inc.b1), dest, inc.b1day, inc.hitDay))}</p>
      <div class="plan-meta">${inc.b1meta.map(m => `<span>${esc(t(m))}</span>`).join('')}</div>
    </div>
    <div class="plan-card" data-plan="B2">
      <div class="plan-head">
        <strong>${t('Plan B2 — 提前转移邻近城市')}</strong>
        <span class="plan-tag alt">${t('备选')}</span>
      </div>
      <p>${esc(fillInc(t(inc.b2), dest, '', inc.b2day))}</p>
      <div class="plan-meta"><span class="plan-b2-cost">${esc(t('💰 净增约 ¥') + inc.b2total)}</span><span>${t('🚌 需改签交通')}</span><span>${t('🏨 酒店退改')}</span></div>
    </div>
    <div class="orch-box">
      <h4>${t('⚙️ 点击确认后，Agent 自动编排 MCP 调用链')}</h4>
      <div class="orch-chain" id="orchChain">
        ${orchestration.map((s, i) => `
          <div class="och-step" data-step="${i + 1}">
            <div class="och-num">${i + 1}</div>
            <div class="och-body"><strong>${esc(fillInc(t(s.name), dest, '', ''))}</strong><span>${esc(t(s.api))} · <span class="och-cost">${esc(s.cost)}</span></span></div>
            <span class="och-status pending">${t('等待')}</span>
          </div>
          ${i < orchestration.length - 1 ? `<div class="och-join"><span>${i < 1 ? t('并行') : t('依赖')}</span></div>` : ''}
        `).join('')}
      </div>
      <div class="orch-summary">
        <span>${t('总费用 ')}<span class="orch-summary-cost">${esc('¥' + inc.notifyCost)}</span></span><span>${t('预计 ≈12秒')}</span><span>${t('需授权：是')}</span>
      </div>
    </div>
    <button class="btn primary full" id="execBtn">
      ${t('✅ 确认执行 Plan B1 — 授权 Agent 自动编排以上 ')}${orchestration.length}${t(' 步')}
    </button>
    <p class="safe-note" id="execNote">${t('🔐 以上为非支付类操作。涉及退款/扣款将单独请求授权。')}</p>
  `;

  // Plan 卡片点击切换选中
  body.querySelectorAll('.plan-card').forEach(card => {
    card.addEventListener('click', () => {
      body.querySelectorAll('.plan-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      monSelectedPlan = card.getAttribute('data-plan');
      const b = document.getElementById('execBtn');
      if (b && !b.disabled) {
        b.textContent = t('✅ 确认执行 ') + monSelectedPlan + t(' — 授权 Agent 自动编排以上 ') + orchestration.length + t(' 步');
      }
    });
  });

  // 执行按钮（动态绑定，重渲染后依然有效）
  const execBtn = document.getElementById('execBtn');
  if (execBtn) execBtn.addEventListener('click', () => executePlanB(monSelectedPlan, orchestration.length));

  // 调接口获取真实费用，失败或未返回则保持默认 0 元
  const cost = await fetchPlanBCost(dest, days);
  inc.notifyCost = cost.notifyCost;
  inc.rebookCost = cost.rebookCost;
  inc.b2total = cost.b2total;
  inc.orphSteps = cost.steps.map((s, i) => ({
    name: s.name || orchestration[i]?.name || '',
    api: s.api || orchestration[i]?.api || '',
    cost: '¥' + s.cost,
  }));
  window.__currentIncident = inc;

  body.querySelectorAll('.och-cost').forEach((el, i) => {
    if (inc.orphSteps[i]) el.textContent = inc.orphSteps[i].cost;
  });
  const summaryEl = body.querySelector('.orch-summary-cost');
  if (summaryEl) summaryEl.textContent = '¥' + inc.notifyCost;
  const b2El = body.querySelector('.plan-b2-cost');
  if (b2El) b2El.textContent = '💰 净增约 ¥' + inc.b2total;
}

// Live query (real Ctrip 问道)
async function initMonitor() {
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
  await renderMonitorTrip();   // 首次加载即按已保存行程渲染
}

// Execute orchestration（供监控页 execBtn 调用；plan=当前选中方案，totalSteps=编排链步数）
async function executePlanB(plan, totalSteps) {
  const btn = document.getElementById('execBtn');
  if (!btn || btn.disabled) return;
  const planName = plan || monSelectedPlan || 'B1';
  const n = totalSteps || 4;
  const t0 = performance.now();   // 实测编排耗时
  btn.disabled = true;
  btn.textContent = `⏳ Agent 编排中（${planName}）...`;
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
  btn.textContent = `⏳ 步骤 1/${n}...`;
  await animate(steps[0], 'done', 600);

  btn.textContent = `⏳ 步骤 2-3/${n}(并行)...`;
  await Promise.all([animate(steps[1],'active',200), animate(steps[2],'active',200)]);
  await Promise.all([animate(steps[1],'done',500), animate(steps[2],'done',500)]);

  btn.textContent = `⏳ 步骤 ${n}/${n}...`;
  await animate(steps[3], 'active', 200);
  await animate(steps[3], 'done', 500);

  btn.textContent = '✅ 全部执行完成';
  btn.style.background = '#34c759';
  const inc = window.__currentIncident || buildIncident(tripState.dest || '目的地', tripState.days || 5);
  const elapsed = ((performance.now() - t0) / 1000).toFixed(1);   // 真实耗时
  const note = document.getElementById('execNote');
  if (note) note.innerHTML = `✅ <strong>执行完成（${planName}）</strong>：${n}个MCP调用全部成功。场地已取消→室内场地已预订→工坊已确认→同行人已通知。总耗时${elapsed}秒，编排费用¥${inc.notifyCost}。`;
  setStatus('已完成');
  showToast(`✅ Plan ${planName} 执行完成`);

  // Plan B 改订下单入口：编排完成后可对「改订/预订」类步骤统一下单
  const bookItems = planBBookingItems(inc, tripState.dest || '目的地');
  if (bookItems.length && !document.getElementById('planbBookBtn')) {
    const bb = document.createElement('button');
    bb.id = 'planbBookBtn';
    bb.className = 'book-cta b';
    bb.style.marginTop = '12px';
    bb.innerHTML = `🧾 确认改订下单 Plan ${planName}（${bookItems.length}项）`;
    bb.addEventListener('click', () => openBookingSheet({
      plan: 'B',
      dest: tripState.dest, days: tripState.days, from: tripState.from,
      title: `应急改订下单 — Plan ${planName}`,
      items: bookItems,
    }));
    btn.parentElement.appendChild(bb);
  }
}

// ============================================
// Demo Button
// ============================================
const sleep = ms => new Promise(r => setTimeout(r, ms));

document.getElementById('demoBtn')?.addEventListener('click', async function() {
  this.disabled = true;
  this.textContent = t('⏳ 演示中...');
  switchView('chat');
  setStatus('演示中...', true);

  // Clear
  chatMessages.innerHTML = '';

  // 演示统一场景：意大利文化艺术游学（15天）。先注入行程状态，保证后续突发/执行阶段数据一致。
  Object.assign(tripState, {
    dest: '意大利', days: 15, from: '', purpose: '游学',
    pref: { diet: '清淡', pace: '慢节奏' }, updatedAt: Date.now()
  });
  compareCtx = { a: '罗马', b: '米兰' };

  // Phase 1: Inspiration
  addMsg('ai', '<p>' + t('🎬 <strong>Phase 1/6：灵感激发</strong> — LLM意图识别+实体提取') + '</p>');
  await sleep(600);
  addMsg('user', '<p>我想去意大利深度游，学点语言和文化艺术，大概待半个月，预算8万</p>');
  await sleep(800);
  addMsg('ai', `
    <p>${t('你好！从你的描述中我识别到：')}</p>
    <div class="bubble-card">
      <div class="bubble-card-header">${t('🔍 意图识别结果')}</div>
      <div class="bubble-card-row"><span class="l">${t('意图')}</span><span class="v">意大利文化艺术游学</span></div>
      <div class="bubble-card-row"><span class="l">${t('目的地')}</span><span class="v">意大利</span></div>
      <div class="bubble-card-row"><span class="l">${t('时长')}</span><span class="v">15天</span></div>
      <div class="bubble-card-row"><span class="l">${t('预算')}</span><span class="v">¥80,000</span></div>
      <div class="bubble-card-row"><span class="l">${t('置信度')}</span><span class="v">0.78（需追问）</span></div>
    </div>
    <p>${t('还需要确认：先去哪个城市？<strong>罗马</strong>还是<strong>米兰</strong>？')}</p>
  `);
  await sleep(1200);

  // Phase 2: Knowledge + Memory
  addMsg('ai', '<p>' + t('📚 <strong>Phase 2/6：知识库+记忆</strong> — RAG检索+碎片结构化+长期记忆存储') + '</p>');
  addMsg('user', '<p>我想去意大利，学语言和文化艺术，饮食清淡，不想太赶</p>');
  await sleep(1000);
  addMsg('ai', `
    <p>${t('明白了！✅ 偏好已存入长期记忆。')}</p>
    <div class="bubble-card">
      <div class="bubble-card-header">${t('🧠 已保存的记忆')}</div>
      <div class="bubble-card-row"><span class="l">${t('目的地')}</span><span class="v">意大利</span></div>
      <div class="bubble-card-row"><span class="l">${t('饮食')}</span><span class="v">清淡</span></div>
      <div class="bubble-card-row"><span class="l">${t('节奏')}</span><span class="v">慢节奏</span></div>
    </div>
    <p>${t('同时激活 Skill: ingest_knowledge → 知识库MCP检索匹配的语校、美术馆与签证信息...')}</p>
  `);
  addMemories([{label:'目的地',value:'意大利'},{label:'饮食',value:'清淡'},{label:'节奏',value:'慢节奏'}]);
  showToast('🧠 偏好已存入长期记忆');
  await sleep(1500);

  // Phase 3: Compare
  addMsg('ai', '<p>' + t('⚖️ <strong>Phase 3/6：决策对比</strong> — 并行MCP调用+多维分析') + '</p>');
  addMsg('user', '<p>我在罗马和米兰之间纠结，不知道先去哪个城市</p>');
  await sleep(800);
  rCompare();
  await sleep(1500);

  // Phase 4: Memory recall (Day 45)
  addMsg('ai', '<p>' + t('🧠 <strong>Phase 4/6：长记忆召回</strong> — 时间快进到Day 45') + '</p>');
  addMsg('user', '<p>（Day 45）今晚在罗马有什么好吃的推荐？</p>');
  await sleep(800);
  addMsg('ai', `
    <p>${t('让我查一下...同时检索到你的')}<strong>Day 1长期记忆</strong>：</p>
    <div class="bubble-card">
      <div class="bubble-card-header">${t('🧠 已激活记忆（Day 1设定）')}</div>
      <div class="bubble-card-row"><span class="l">🍽️ ${t('饮食')}</span><span class="v">清淡、少辣</span></div>
      <div class="bubble-card-row"><span class="l">💰 ${t('预算')}</span><span class="v">约¥800/天</span></div>
    </div>
    <p>${t('推荐 <strong>Trattoria da Teo</strong>（罗马 Testaccio 老城家常菜，橄榄油清炒时蔬与海胆面，人均€25，符合你的清淡饮食）')}</p>
    <p style="color:var(--ink3);">${t('💡 这就是长期记忆的价值——第45天记得第1天的偏好。')}</p>
  `);
  showToast('🧠 长期记忆在第45天自动激活');
  await sleep(1500);

  // Phase 5: Emergency
  const demInc = buildIncident(tripState.dest, tripState.days);
  addMsg('ai', '<p>' + t('🛡️ <strong>Phase 5/6：行程守护</strong> — 系统主动监控+Plan B生成') + '</p>');
  addMsg('user', `<p>${t('（系统通知）意大利行程突发「')}${esc(t(demInc.alertName))}${t('」！')}</p>`);
  await sleep(600);
  await rEmergency();
  await sleep(1200);

  // Phase 6: Execute
  addMsg('ai', '<p>' + t('⚡ <strong>Phase 6/6：Skill编排执行</strong> — Agent串联MCP调用链') + '</p>');
  addMsg('user', '<p>' + t('就Plan B1，帮我执行！') + '</p>');
  await sleep(600);
  await rExecute();
  await sleep(3500);

  setStatus('就绪');
  this.disabled = false;
  this.textContent = t('▶ 演示完整流程');
  showToast('✅ 6个Phase演示完成！');
});

// ============================================
// Memory page (real persistence)
// ============================================
function renderMemoryPage() {
  const el = document.getElementById('memLongTerm');
  if (!el) return;
  if (!extractedMemories.length) {
    el.innerHTML = '<p class="muted">' + t('暂无长期记忆，可在上方添加，或在聊天中描述偏好自动提取。') + '</p>';
    return;
  }
  el.innerHTML = extractedMemories.map((m, i) => `
    <div class="mem-row">
      <span class="mem-emoji">${m.locked ? '🔒' : '📌'}</span>
      <div><strong>${esc(m.label)}</strong><em>${esc(m.value)}</em></div>
      <button class="mem-act" data-act="lock" data-i="${i}">${m.locked ? t('🔓 解锁') : t('🔒 锁定')}</button>
      <button class="mem-act" data-act="del" data-i="${i}">${t('🗑 删除')}</button>
    </div>`).join('');
  el.querySelectorAll('.mem-act').forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.i, act = b.dataset.act;
    if (act === 'del') {
      if (extractedMemories[i] && extractedMemories[i].locked) {
        showToast('🔒 该记忆已锁定，无法删除（请先点击「🔓 解锁」）');
        return;
      }
      extractedMemories.splice(i, 1);
      // 联动：删光所有长期记忆时，自动重置当前行程（tripState），
      // 避免右侧「当前行程记忆」残留 dest/days/budget 等孤儿记录
      if (extractedMemories.length === 0) {
        tripState = { dest: '', days: 0, from: '', purpose: '', updatedAt: Date.now() };
        saveTrip();
      }
    }
    else if (act === 'lock') extractedMemories[i].locked = !extractedMemories[i].locked;
    saveMemories();
    renderMemoryPage();
  }));
}

// 重置当前行程（保留长期记忆，仅清 tripState 与派生字段）
// 与「删光所有长期记忆」的联动语义一致：去掉目标城市 / 行程目标 / 总预算等当前行程上下文。
function resetCurrentTripMemory() {
  const had = !!(tripState && tripState.dest);
  tripState = { dest: '', days: 0, from: '', purpose: '', updatedAt: Date.now() };
  confirmedTripMemLabels.clear();
  rejectedTripMemLabels.clear();
  saveTrip();
  try {
    localStorage.setItem(TRIP_CONFIRM_KEY, JSON.stringify({ dest: '', labels: [] }));
    localStorage.setItem(TRIP_REJECT_KEY, JSON.stringify({ dest: '', labels: [] }));
  } catch {}
  renderTripMemory();
  updateCtxMemory();
  if (typeof renderMonitorTrip === 'function') renderMonitorTrip();
  return had;
}

// 清空全部记忆（用户显式「重新设定/重置」时调用；覆盖锁定项，因为属于用户主动整体重置）
function clearAllMemories() {
  const n = extractedMemories.length;
  extractedMemories = [];
  confirmedTripMemLabels.clear();
  rejectedTripMemLabels.clear();
  // 行程状态也一并清零，避免残留 dest/days/from/purpose 被后续 enterClarifyMode 沿用为默认值
  // （"删除所有设定"语义=完全从零开始，不只是清掉记忆库）
  tripState = { dest: '', days: 0, from: '', purpose: '', updatedAt: Date.now() };
  // 澄清状态也复位，防止下一次新建会话时残留槽位污染新行程
  clarifyState = { active: false, dest: '', collected: { days: 0, purpose: '', budget: '', from: '', notes: '' } };
  // 清掉当前目的地对应的沿用/排除历史，避免下一位新行程自动继承
  try {
    localStorage.setItem(TRIP_CONFIRM_KEY, JSON.stringify({ dest: '', labels: [] }));
    localStorage.setItem(TRIP_REJECT_KEY, JSON.stringify({ dest: '', labels: [] }));
  } catch {}
  saveMemories();
  saveTrip();
  updateCtxMemory();
  renderMemoryPage();
  renderTripMemory();
  if (typeof renderMonitorTrip === 'function') renderMonitorTrip();
  return n;
}

// 识别聊天中的「重新设定/删除/清空」意图（显式要求清空全部记忆）
function isResetIntent(text) {
  const t = (text || '').trim();
  if (!t) return false;
  const exact = /^(重新设定|重新设置|重置|清空记忆|清空所有记忆|清空我的记忆|清空全部记忆|清空所有设定|清空全部设定|清空设定|清除记忆|清除所有设定|清掉记忆|全部重来|重置记忆|重置偏好|重置所有偏好|清空我的偏好|删除所有设定|删除记忆|删除所有记忆|删除全部记忆|删掉记忆|删掉所有记忆|去掉记忆|去掉所有记忆|移除记忆|把记忆清空|把偏好重置|全部清空)$/;
  const verbs = '(重新设定|重新设置|重置|清空|清除|清掉|删除|删掉|去掉|移除)';
  const nouns = '(记忆|偏好|设定|我的记忆|我的偏好|我的设定|全部记忆|所有记忆|全部偏好|所有偏好|全部设定|所有设定|记忆设定|偏好设定)';
  const loose = new RegExp(verbs + '.{0,20}' + nouns + '|' + nouns + '.{0,20}' + verbs);
  return exact.test(t) || loose.test(t);
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
    const sem = d.semantic;
    let engineLine = '';
    if (sem && sem.available) {
      engineLine = `<span class="kb-engine on">🟢 语义向量引擎在线 · ${esc(sem.model || '')} · ${sem.count} 条</span>`;
    } else {
      engineLine = `<span class="kb-engine off">🟡 语义引擎离线，已回退本地 TF-IDF</span>`;
    }
    stat.innerHTML = `已录入 <b>${d.count}</b> 条问答 · 覆盖 <b>${cats}</b> 个业务分类<br>${engineLine}`;
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
      const semNote = d.semanticReloaded ? ' · 语义库已同步' : '';
      btn.textContent = `✅ 已录入 ${d.added || 0} 条${semNote}`;
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
    goal.textContent = t('尚未规划');
    budget.textContent = t('未设置');
    cities.textContent = '—';
    notes.textContent = t('暂无');
    if (meta) meta.textContent = t('在「AI 对话」中说出目的地和天数即可自动生成');
    return;
  }
  const { dest, days, from } = tripState;
  const route = (from ? from + ' → ' : '') + dest;
  goal.textContent = `${route}${days ? ' · ' + days + t('天') : ''}`;
  cities.textContent = route;
  budget.textContent = deriveTripBudget() || t('未设置');
  notes.textContent = deriveTripNotes() || t('暂无');
  if (meta) {
    const tt = tripState.updatedAt
      ? new Date(tripState.updatedAt).toLocaleString(currentLang === 'en' ? 'en-US' : 'zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '';
    meta.textContent = tt ? t('数据来自对话规划 · 更新于 ') + tt : t('数据来自对话规划');
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

  // 「当前行程记忆」标题栏的重置按钮：一键清空 tripState（保留长期记忆）
  const tripResetBtn = document.getElementById('tripMemResetBtn');
  if (tripResetBtn) tripResetBtn.addEventListener('click', () => {
    if (!tripState || !tripState.dest) {
      showToast(t('当前行程已是空的，无需重置'));
      return;
    }
    const had = resetCurrentTripMemory();
    showToast(had ? t('✅ 已重置当前行程（长期记忆保留）') : t('✅ 已重置'));
  });

  renderMemoryPage();
  renderTripMemory();   // 同步刷新当前行程记忆面板
}

// ============================================
// 下单模块（Plan A / Plan B 共用）
// --------------------------------------------
// 后端为接口占位（stub）：/api/booking/quote → /api/booking/create → /api/booking/order/:id
// 契约按携程商旅/开放平台真实下单平台设计，全程带「演示下单·接口占位」标识。
// ============================================
const BOOK_ICON = { flight: '✈️', hotel: '🏨', activity: '🎫', transfer: '🚌', rebook: '🔄' };

function yuan(n) { return '¥' + (Math.round(Number(n) || 0)).toLocaleString('zh-CN'); }

// 打开下单面板。opts:
//   { plan:'A'|'B', title, dest, days, from, partySize, items?（传入则跳过报价）}
// ============================================
// 方案选择面板（Plan A）：每日行程 + 三组可选项（交通/住宿/活动）
// 用户点选完毕后底部「组合下单」入口才生效。
// 这是修复\"直接生成订单\"UX 缺陷的核心：先给具体方案，再让用户选，再下单。
// ============================================

// 三组候选生成器（基于真实 tripState + 偏好本地构造，零假数据）
function genFlightOptions(dest, from, partySize) {
  const isCNIntl = !from || /中国|上海|北京|广州|深圳|成都|杭州|香港|澳门|台北|台|港|澳/.test(from + dest);
  const dom = isCNIntl;
  // 单程人均（往返约双倍）
  const base = dom ? 900 : 3500;
  return [
    { key: 'f1', tag: '推荐', title: '✈️ 直飞',
      sub: dom ? '经济舱直飞，约 2.5 小时，免去转机劳顿' : '经济舱直飞，约 10–14 小时，含 23kg 行李',
      unit: base * 2, qty: partySize, type: 'flight' },
    { key: 'f2', tag: '省心', title: '✈️ 转机 1 次',
      sub: dom ? '经第三地中转 1 次，总时长 +3h，价格更优' : '经第三地中转 1 次，总时长 +5h，机票可省 25%',
      unit: Math.round(base * 1.55) * 2, qty: partySize, type: 'flight' },
    { key: 'f3', tag: dom ? '慢游' : '不可', title: '🚄 高铁/动卧',
      sub: dom ? '陆路出行，沿途可看风景（仅限国内可达目的地）' : '跨海跨洋不适用',
      unit: Math.round(base * 0.45) * 2, qty: partySize, type: 'flight',
      disabled: !dom },
  ];
}
function genHotelOptions(dest, days, partySize, prefs) {
  const light = (prefs || []).some(p => p.label === '饮食偏好' && /清淡|不辣/.test(p.value));
  const style = light ? '（轻食早餐可选）' : '';
  const stayNights = Math.max(1, days - 1);
  const perNight = 1; // 单间单价 / 晚
  return [
    { key: 'h1', tag: '推荐', title: '🏨 精品酒店',
      sub: '4 星/精品设计酒店，含早，市中心或景点附近' + style,
      unit: 580, qty: stayNights, unitLabel: `${stayNights}晚·每晚`, type: 'hotel' },
    { key: 'h2', tag: '本地', title: '🏠 特色民宿',
      sub: '本地特色民宿/公寓，洗衣机+厨房，适合慢节奏' + style,
      unit: 320, qty: stayNights, unitLabel: `${stayNights}晚·每晚`, type: 'hotel' },
    { key: 'h3', tag: '经济', title: '🛏️ 经济型',
      sub: '干净舒适连锁酒店，性价比高，紧凑实用',
      unit: 180, qty: stayNights, unitLabel: `${stayNights}晚·每晚`, type: 'hotel' },
  ];
}
function genActivityOptions(dest, days, partySize, prefs) {
  const focus = (prefs || []).map(p => p.label + ':' + p.value).join('；');
  const isFamily = /亲子|带娃|小孩|家庭|老人/.test(focus);
  const isFoodie = /美食|小吃|餐厅|吃货/.test(focus);
  const isCulture = /文化|历史|古迹|博物馆|寺庙|古建|学/.test(focus);
  const perPersonPerDay = 200;
  return [
    { key: 'a1', tag: '推荐', title: '🎫 经典必去',
      sub: '当地 5–6 个必打卡景点门票 + 城市观光通票',
      unit: perPersonPerDay * days, qty: partySize, unitLabel: `${days}天·每人`, type: 'activity' },
    { key: 'a2', tag: '小众', title: '🎨 小众深度',
      sub: isCulture ? '深度博物馆/老建筑/工作坊' : isFoodie ? '本地人餐厅/夜市/老巷' : isFamily ? '亲子乐园/自然科普馆' : '设计师路线/独立书店/手作',
      unit: Math.round(perPersonPerDay * 0.7) * days, qty: partySize, unitLabel: `${days}天·每人`, type: 'activity' },
    { key: 'a3', tag: '主题', title: '🌟 主题定制',
      sub: isFamily ? '亲子主题：动物园+科技馆+手工' : isFoodie ? '美食主题：米其林+夜市+私厨' : isCulture ? '文化主题：故宫深度+胡同+京剧' : '按你的偏好（饮食/节奏/学习）定制',
      unit: Math.round(perPersonPerDay * 1.4) * days, qty: partySize, unitLabel: `${days}天·每人`, type: 'activity' },
  ];
}

function buildDayPlan(dest, days, prefs) {
  // 按天数构造简单行程（首日抵达 + 中间游 + 末日离开）
  const focus = (prefs || []).map(p => p.label + ':' + p.value).join('；');
  const isFamily = /亲子|家庭|小孩|带娃/.test(focus);
  const isFoodie = /美食|小吃/.test(focus);
  const isCulture = /文化|历史|古迹|博物馆/.test(focus);
  const arr = [];
  if (days <= 0) return arr;
  arr.push(`<div class="psc-day"><b>D1 抵达</b>${fillInc(t('出发 → |DEST|，办理入住，晚上自由活动（推荐市中心步行）'), esc(dest || '目的地'), '', '')}</div>`);
  for (let i = 2; i < days; i++) {
    let txt = t(isFoodie ? '美食主题：早茶/特色小吃 + 老街漫游' :
              isCulture ? '文化主题：博物馆 + 历史街区 + 老建筑' :
              isFamily ? '亲子主题：动物园/科技馆 + 公园' :
              '城市观光：核心景点 + 当地体验');
    arr.push(`<div class="psc-day"><b>D${i} 深度游</b>${txt}</div>`);
  }
  if (days >= 2) {
    arr.push(`<div class="psc-day"><b>D${days} 离开</b>${t('早餐 + 自由活动/伴手礼采购 → 返程')}</div>`);
  }
  return arr;
}

function buildPlanCardHTML(trip, partySize, prefs) {
  const dest = (trip && trip.dest) || '目的地';
  const days = (trip && trip.days) || 5;
  const from = (trip && trip.from) || '';
  const flights = genFlightOptions(dest, from, partySize);
  const hotels = genHotelOptions(dest, days, partySize, prefs);
  const activities = genActivityOptions(dest, days, partySize, prefs);
  const dayPlan = buildDayPlan(dest, days, prefs);
  const dayPlanHtml = dayPlan.length
    ? `<div class="psc-dayplan"><h5><span data-i18n="🗓️ 行程亮点（共 ">${t('🗓️ 行程亮点（共 ')}</span>${days}<span data-i18n=" 天）">${t(' 天）')}</span></h5>${dayPlan.join('')}</div>`
    : '';

  function renderOpt(opts, groupName, groupIc) {
    return `<div class="psc-section">
      <div class="psc-section-title"><span class="psc-ic">${groupIc}</span><span data-i18n="${esc(groupName)}">${esc(t(groupName))}</span><span class="psc-req" data-req-for="${esc(groupName)}" data-i18n="请选择 1 项">${t('请选择 1 项')}</span></div>
      <div class="opt-row">
        ${opts.map((o, i) => `
          <button class="opt-card ${i === 0 && !o.disabled ? 'selected' : ''} ${o.disabled ? 'disabled' : ''}"
                  data-group="${esc(groupName)}" data-i="${i}" ${o.disabled ? 'disabled' : ''}>
            <span class="opt-tag" data-i18n="${esc(i === 0 ? '★推荐' : (o.tag || ''))}">${esc(t(i === 0 ? '★推荐' : (o.tag || '')))}</span>
            <div class="opt-title" data-i18n="${esc(o.title)}">${esc(t(o.title))}</div>
            <div class="opt-sub" data-i18n="${esc(o.sub)}">${esc(t(o.sub))}</div>
            <div class="opt-price">${yuan(o.unit * o.qty)} <small>${yuan(o.unit)}×${o.qty}${o.unitLabel ? '·' + esc(t(o.unitLabel)) : ''}</small></div>
          </button>`).join('')}
      </div>
    </div>`;
  }

  return `<div class="plan-select-card" data-plan-card="A">
    <div class="psc-head">
      <h4 data-i18n="📋 方案概览">${t('📋 方案概览')}</h4>
      <span class="psc-meta">${from ? esc(from) + ' → ' : ''}<b>${esc(dest)}</b> · ${esc(String(days))}${t('天')} · ${partySize}${t('人')}</span>
    </div>
    ${dayPlanHtml}
    ${renderOpt(flights, '交通方式', '✈️')}
    ${renderOpt(hotels, '住宿', '🏨')}
    ${renderOpt(activities, '游玩门票', '🎫')}
    <div class="psc-foot">
      <div>
        <div class="psc-sum"><span data-i18n="已选：">${t('已选：')}</span><b data-sum></b></div>
        <div class="psc-total"><span data-i18n="预估合计">${t('预估合计')}</span> <span data-total>—</span> <small style="font-size:10.5px;color:var(--ink3);font-weight:500;"><span data-i18n="· 以下单报价为准">${t('· 以下单报价为准')}</span></small></div>
      </div>
      <button class="btn primary psc-confirm" disabled data-i18n="✅ 组合下单">${t('✅ 组合下单')}</button>
    </div>
  </div>`;
}

// 挂载方案选择面板到一条 AI 消息下，并绑定交互
function attachPlanCard(msgDiv, trip, partySize, prefs) {
  if (!msgDiv) return;
  const bubble = msgDiv.querySelector('.msg-bubble');
  if (!bubble) return;
  bubble.insertAdjacentHTML('beforeend', buildPlanCardHTML(trip, partySize, prefs));
  scrollChat();
  const card = bubble.querySelector('[data-plan-card]');
  if (!card) return;

  const allOpts = {
    '交通方式': genFlightOptions(trip.dest, trip.from, partySize),
    '住宿': genHotelOptions(trip.dest, trip.days || 5, partySize, prefs),
    '游玩门票': genActivityOptions(trip.dest, trip.days || 5, partySize, prefs),
  };
  const selections = { '交通方式': 0, '住宿': 0, '游玩门票': 0 };

  function selectedItems() {
    const items = [];
    for (const g of Object.keys(allOpts)) {
      const i = selections[g];
      const o = allOpts[g][i];
      if (o && !o.disabled) items.push(o);
    }
    return items;
  }
  function refresh() {
    let total = 0;
    const sum = [];
    let allPicked = true;
    for (const g of Object.keys(allOpts)) {
      const i = selections[g];
      const o = allOpts[g][i];
      if (i === -1 || !o) {
        sum.push(`${t(g)}·${t('请选择')}`);
        allPicked = false;
      } else {
        sum.push(`${t(g)}·${t(o.title).replace(/^[^\s]+\s/, '')}`);
        total += o.unit * o.qty;
      }
      const reqEl = card.querySelector(`[data-req-for="${g}"]`);
      if (reqEl) reqEl.textContent = (i === -1 || !o) ? t('请选择 1 项') : t('已选 1 项');
    }
    card.querySelector('[data-sum]').textContent = sum.join(' / ');
    card.querySelector('[data-total]').textContent = yuan(total);
    card.querySelector('.psc-confirm').disabled = !allPicked;
  }

  card.querySelectorAll('.opt-card').forEach(b => {
    b.addEventListener('click', () => {
      if (b.disabled) return;
      const g = b.dataset.group;
      const i = +b.dataset.i;
      if (b.classList.contains('selected')) {
        // 已选中：再次点击 = 取消选择
        b.classList.remove('selected');
        selections[g] = -1;
      } else {
        // 未选中：同组单选，先清掉同组 selected，再选自己
        card.querySelectorAll(`.opt-card[data-group="${g}"]`).forEach(x => x.classList.remove('selected'));
        b.classList.add('selected');
        selections[g] = i;
      }
      refresh();
    });
  });

  refresh();

  // 语言切换时由 applyLang 调用：按当前语言重建行程亮点（含 |DEST| 占位还原）
  function reDay() {
    const dp = buildDayPlan(trip.dest, trip.days || 5, prefs);
    const html = dp.length
      ? `<div class="psc-dayplan"><h5><span data-i18n="🗓️ 行程亮点（共 ">${t('🗓️ 行程亮点（共 ')}</span>${trip.days || 5}<span data-i18n=" 天）">${t(' 天）')}</span></h5>${dp.join('')}</div>`
      : '';
    const node = card.querySelector('.psc-dayplan');
    if (html) { if (node) node.outerHTML = html; }
    else if (node) node.remove();
  }
  card._planState = { trip, prefs, partySize, allOpts, selections, refresh, reDay };

  card.querySelector('.psc-confirm').addEventListener('click', () => {
    const items = selectedItems();
    openBookingSheet({
      plan: 'A',
      dest: trip.dest, days: trip.days, from: trip.from, partySize,
      items,
      title: `行程下单 — ${trip.dest || ''}（已选 ${items.length} 项）`,
    });
  });
}

async function openBookingSheet(opts = {}) {
  const plan = opts.plan || 'A';
  const dest = opts.dest || (tripState && tripState.dest) || '目的地';
  const days = opts.days || (tripState && tripState.days) || 5;

  // 遮罩 + 面板骨架
  const mask = document.createElement('div');
  mask.className = 'booking-mask';
  mask.innerHTML = `
    <div class="booking-sheet" role="dialog" aria-modal="true">
      <div class="booking-head">
        <div>
          <span class="booking-plan-badge ${plan === 'B' ? 'b' : 'a'}">Plan ${plan}</span>
          <h3>${esc(opts.title || (plan === 'B' ? t('应急改订下单') : t('行程下单预订')))}</h3>
        </div>
        <button class="booking-close" aria-label="关闭">✕</button>
      </div>
      <div class="booking-body"><p class="loading">${t('⏳ 正在获取报价…')}</p></div>
      <div class="booking-foot" style="display:none;">
        <div class="booking-total">${t('合计预估 ')}<b class="booking-total-num">—</b> <span class="booking-est">${t('预估价·非实时')}</span></div>
        <button class="btn primary booking-submit">${t('✅ 确认下单')}</button>
      </div>
    </div>`;
  document.body.appendChild(mask);
  const close = () => mask.remove();
  mask.querySelector('.booking-close').addEventListener('click', close);
  mask.addEventListener('click', e => { if (e.target === mask) close(); });

  const body = mask.querySelector('.booking-body');
  const foot = mask.querySelector('.booking-foot');

  // 取报价：优先用传入 items，否则调 quote 接口
  let quote;
  try {
    if (Array.isArray(opts.items) && opts.items.length) {
      const total = opts.items.reduce((s, it) => s + (Number(it.subtotal) || 0), 0);
      quote = { items: opts.items, total, dest, days, from, partySize, estimate: true };
    } else {
      const r = await fetch('/api/booking/quote', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, dest, days, from, partySize }),
      });
      if (!r.ok) throw new Error('quote failed');
      quote = await r.json();
    }
  } catch (e) {
    body.innerHTML = '<p class="booking-err">' + t('⚠️ 报价接口未就绪，请稍后重试。') + '</p>';
    return;
  }

  body.innerHTML = `
    <div class="booking-trip">🧭 ${from ? esc(from) + ' → ' : ''}<b>${esc(dest)}</b> · ${esc(String(days))}${t('天')} · ${partySize}${t('人')}</div>
    <div class="booking-items">
      ${quote.items.map(it => `
        <div class="booking-item">
          <span class="bi-ic">${BOOK_ICON[it.type] || '•'}</span>
          <div class="bi-main">
            <strong>${esc(it.title)}</strong>
            <span class="bi-sub">${yuan(it.unit)} × ${esc(String(it.qty))} ${esc(it.unitLabel || '')}${it.provider ? ' · <code>' + esc(it.provider) + '</code>' : ''}</span>
          </div>
          <span class="bi-price">${yuan(it.subtotal)}</span>
        </div>`).join('')}
    </div>`;
  foot.style.display = '';
  foot.querySelector('.booking-total-num').textContent = yuan(quote.total);

  foot.querySelector('.booking-submit').addEventListener('click', async function () {
    this.disabled = true;
    this.textContent = t('⏳ 下单中…');
    try {
      const r = await fetch('/api/booking/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, dest, days, from, partySize, items: quote.items, total: quote.total }),
      });
      if (!r.ok) throw new Error('create failed');
      const order = await r.json();
      body.innerHTML = `
        <div class="booking-success">
          <div class="bs-check">✅</div>
          <h3>${t('下单成功（演示）')}</h3>
          <div class="bs-row"><span>${t('订单号')}</span><b>${esc(order.orderId)}</b></div>
          <div class="bs-row"><span>${t('行程')}</span><b>${from ? esc(from) + ' → ' : ''}${esc(dest)} · ${esc(String(days))}${t('天')}</b></div>
          <div class="bs-row"><span>${t('金额')}</span><b>${yuan(order.total)}</b></div>
          <div class="bs-row"><span>${t('状态')}</span><b class="bs-status">${t('待支付 PENDING_PAYMENT')}</b></div>
          <p class="bs-note">🔌 ${esc(order.note || '')}</p>
        </div>`;
      foot.innerHTML = '<button class="btn primary booking-done">' + t('完成') + '</button>';
      foot.querySelector('.booking-done').addEventListener('click', close);
      showToast(t('✅ 下单成功（演示）· 单号 ') + order.orderId);
      if (typeof opts.onBooked === 'function') opts.onBooked(order);
    } catch (e) {
      this.disabled = false;
      this.textContent = '✅ 确认下单';
      showToast('⚠️ 下单失败，请重试');
    }
  });
}

// 在一条 AI 消息气泡下追加「下单」入口。
//   plan 'A'：整段行程下单；plan 'B'：应急改订下单（可传 extra.items 指定改订条目）
function appendBookCta(msgDiv, plan = 'A', extra = {}) {
  if (!msgDiv || !tripState || !tripState.dest) return;
  const bubble = msgDiv.querySelector('.msg-bubble');
  if (!bubble) return;
  const btn = document.createElement('button');
  btn.className = 'book-cta' + (plan === 'B' ? ' b' : '');
  const label = plan === 'B'
    ? t('🧾 确认改订下单 Plan B') + (extra.items ? '（' + extra.items.length + t('项') + '）' : '')
    : t('🧾 下单预订 Plan A（') + esc(tripState.dest) + (tripState.days ? ' · ' + tripState.days + t('天') : '') + t('）');
  btn.innerHTML = label;
  btn.addEventListener('click', () => openBookingSheet({
    plan, dest: tripState.dest, days: tripState.days, from: tripState.from,
    title: plan === 'B' ? t('应急改订下单') + ' — ' + tripState.dest : t('行程下单预订') + ' — ' + tripState.dest,
    items: extra.items,
  }));
  bubble.appendChild(btn);
  scrollChat();
}

// 由 Plan B 突发方案构造下单条目（改订类）
function planBBookingItems(inc, dest) {
  const steps = (inc && inc.orphSteps) || [];
  return steps
    .filter(s => /预订|改签|create_booking|book_local/.test((s.name || '') + (s.api || '')))
    .map(s => ({
      type: 'rebook',
      title: s.name,
      unit: (typeof s.cost === 'string' ? Number(s.cost.replace(/[^\d.]/g, '')) : Number(s.cost)) || 0,
      qty: 1, unitLabel: '项',
      provider: (s.api || '').split(':')[0] || 'rebook',
      subtotal: (typeof s.cost === 'string' ? Number(s.cost.replace(/[^\d.]/g, '')) : Number(s.cost)) || 0,
    }));
}

// ============================================
// Init
// ============================================
initCompare();
initMonitor();
initMemory();
initKb();

// 全局语言切换（中文 / English）
const langSwitchEl = document.getElementById('langSwitch');
if (langSwitchEl) {
  langSwitchEl.querySelectorAll('.lang-btn').forEach(b => {
    b.addEventListener('click', () => applyLang(b.dataset.lang));
  });
}
applyLang(currentLang); // 首屏按 localStorage 初始化语言

switchView('chat');
showCtx('default');
setStatus('就绪');

console.log('🧳 CSTS TravelChat 就绪');
