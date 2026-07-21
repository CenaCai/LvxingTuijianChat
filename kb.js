// ============================================
//  旅行平台知识库 RAG 引擎（本地 TF-IDF 向量检索）
//  - 无需外部模型/网络：中文按「字 unigram + bigram」切分，英文按词；
//  - 构建 tf-idf 向量，检索用余弦相似度；
//  - 数据持久化到 kb-data.json（同目录）。
//  设计上 embed() 与 query() 解耦，后续可替换为真实 embedding 模型。
// ============================================
const fs = require('fs');
const path = require('path');

const KB_DATA_FILE = path.join(__dirname, 'kb-data.json');

let docs = [];        // { id, category, subcategory, lang, question, answer, text, keywords }
let tfVecs = [];      // 与 docs 平行：tf 向量 { token: tf }
let idf = {};         // token -> idf
let docVectors = [];  // 与 docs 平行：tfidf 向量 { token: weight }

// ---------- 分词 ----------
function tokenize(text) {
  const tokens = [];
  const s = (text || '').replace(/\s+/g, ' ');
  // 中文连续段：拆 unigram + bigram
  const cnSegs = s.match(/[一-鿿]+/g) || [];
  for (const seg of cnSegs) {
    for (let i = 0; i < seg.length; i++) {
      tokens.push(seg[i]);
      if (i + 1 < seg.length) tokens.push(seg[i] + seg[i + 1]);
    }
  }
  // 英文/数字词
  const latin = (s.toLowerCase().match(/[a-z0-9]+/g) || []);
  for (const w of latin) if (w.length > 1) tokens.push(w);
  return tokens;
}

function tf(tokens) {
  const m = {};
  for (const t of tokens) m[t] = (m[t] || 0) + 1;
  const len = tokens.length || 1;
  for (const k in m) m[k] = m[k] / len;
  return m;
}

function reindex() {
  const df = {};
  for (const v of tfVecs) for (const tok in v) df[tok] = (df[tok] || 0) + 1;
  const N = tfVecs.length || 1;
  idf = {};
  for (const tok in df) idf[tok] = Math.log((N + 1) / (df[tok] + 1)) + 1;
  docVectors = tfVecs.map((v, i) => {
    const dv = {};
    for (const tok in v) dv[tok] = v[tok] * idf[tok];
    return { id: docs[i].id, vec: dv };
  });
}

function embed(text) {
  const t = tf(tokenize(text));
  const v = {};
  for (const tok in t) v[tok] = t[tok] * (idf[tok] || 1);
  return v;
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (const k in a) { na += a[k] * a[k]; if (b[k] !== undefined) dot += a[k] * b[k]; }
  for (const k in b) nb += b[k] * b[k];
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// ---------- 解析 Markdown QA ----------
const Q_HEAD = /^#{2,3}\s*Q\d+\.?\s*(.*)$/i;

function cleanTitle(s) {
  return (s || '').replace(/\s*\([^)]*\)\s*/g, '').replace(/\*/g, '').trim();
}

// 把一个 .md 文件（已读入 content）按 QA 切分后加入 docs
// meta: { category, subcategory, lang }
function parseMdFile(absPath, meta) {
  let content;
  try { content = fs.readFileSync(absPath, 'utf8'); } catch { return 0; }
  content = content.replace(/\[← 返回\]\([^)]*\)/g, '');
  const lines = content.split(/\r?\n/);

  let sectionCat = '';
  let sectionSub = '';
  let buf = null;     // 当前 QA 缓冲
  let count = 0;

  const flush = () => {
    if (!buf) return;
    const q = cleanTitle(buf.question);
    const a = buf.answer.trim();
    if (!q) { buf = null; return; }
    const text = `【${meta.category} / ${meta.subcategory}】\n问：${q}\n答：${a}`;
    const id = `${meta.category}::${meta.subcategory}::${docs.length}`;
    const doc = {
      id, category: meta.category, subcategory: meta.subcategory, lang: meta.lang || 'zh',
      question: q, answer: a, text, keywords: extractKeywords(text),
    };
    docs.push(doc);
    tfVecs.push(tf(tokenize(text)));
    count++;
    buf = null;
  };

  for (const line of lines) {
    const qm = line.match(Q_HEAD);
    if (qm) { flush(); buf = { question: qm[1], answer: '' }; continue; }
    if (/^#\s+/.test(line)) { flush(); sectionCat = cleanTitle(line.replace(/^#\s+/, '')); continue; }
    if (/^##\s+/.test(line)) {
      const t = cleanTitle(line.replace(/^##\s+/, ''));
      if (!/^Q\d/i.test(t)) { flush(); sectionSub = t; }
      continue;
    }
    if (buf) buf.answer += line + '\n';
  }
  flush();
  return count;
}

function extractKeywords(text) {
  const tokens = tokenize(text);
  const cnt = {};
  for (const t of tokens) if (t.length >= 2 && /[一-鿿]/.test(t)) cnt[t] = (cnt[t] || 0) + 1;
  return Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]).slice(0, 6);
}

// 递归收集 .md 文件（跳过 README.md）
function walkMd(dir, out) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.name === 'README.md' || e.name === '.DS_Store') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkMd(p, out);
    else if (e.isFile() && /\.md$/i.test(e.name)) out.push(p);
  }
}

// 根据相对路径推断 category / subcategory / lang
function metaFor(absBase, absFile) {
  const rel = path.relative(absBase, absFile).split(path.sep);
  const fileStem = rel[rel.length - 1].replace(/\.md$/i, '');
  let category, subcategory, lang = 'zh';
  if (rel.length >= 3) { category = rel[0]; subcategory = rel[1]; }
  else if (rel.length === 2) { category = rel[0]; subcategory = fileStem; }
  else { category = '综合帮助'; subcategory = fileStem; }
  if (/_en$|_对照$|english/i.test(category)) lang = 'en';
  return { category, subcategory, lang };
}

// ---------- 对外 API ----------
function ingestDir(dir) {
  const files = [];
  walkMd(dir, files);
  let added = 0;
  for (const f of files) {
    const meta = metaFor(dir, f);
    added += parseMdFile(f, meta);
  }
  reindex();
  save();
  return { added, files: files.length, total: docs.length };
}

function clear() { docs = []; tfVecs = []; idf = {}; docVectors = []; }

function query(text, topK = 5) {
  if (!docVectors.length) return [];
  const qv = embed(text);
  const scored = docVectors.map(d => ({ doc: docs.find(x => x.id === d.id), score: cosine(qv, d.vec) }));
  scored.sort((a, b) => b.score - a.score);
  return scored.filter(x => x.score > 0.01)
    .slice(0, topK)
    .map(x => ({ ...x.doc, score: +x.score.toFixed(4) }));
}

function stats() {
  const cats = {};
  for (const d of docs) cats[d.category] = (cats[d.category] || 0) + 1;
  return { count: docs.length, categories: cats };
}

function save() {
  try { fs.writeFileSync(KB_DATA_FILE, JSON.stringify({ docs, tfVecs })); } catch (e) { console.error('kb save failed', e); }
}
function load() {
  try {
    const data = JSON.parse(fs.readFileSync(KB_DATA_FILE, 'utf8'));
    docs = data.docs || [];
    tfVecs = data.tfVecs || [];
    reindex();
    return docs.length;
  } catch { return 0; }
}

module.exports = { ingestDir, clear, query, stats, load, save, reindex, _internal: { docs: () => docs } };
