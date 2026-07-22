#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
LvxingTuijianChat —— 语义检索微服务 (Haystack 密集向量)

替代 prototype 中本地 TF-IDF 的检索后端。Node(server.js) 通过 HTTP 调用本服务：
  POST /api/semantic/query   {query, topK} -> {results:[{id,category,subcategory,question,answer,score}]}
  GET  /api/semantic/health  -> {ok, count, model, device}
  POST /api/semantic/reindex -> {ok, count}  (重新读取 kb-data.json 建库)

实现：sentence-transformers(BAAI/bge-small-zh-v1.5) 出向量 -> Haystack InMemoryDocumentStore 存储
      -> InMemoryEmbeddingRetriever 做密集向量召回。
（Haystack 3 把 sentence-transformers 集成移到了独立包，沙箱内装不上；故直接用
 sentence_transformers 出向量、Haystack 负责存储与余弦召回，仍是 Haystack 托管的密集检索。）
"""
import json
import os
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import numpy as np
from haystack import Document
from haystack.document_stores.in_memory import InMemoryDocumentStore
from haystack.components.retrievers.in_memory import InMemoryEmbeddingRetriever

PORT = int(os.environ.get("SEMANTIC_PORT", "7001"))
KB_DATA = os.environ.get("KB_DATA") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "kb-data.json")
MODEL_NAME = os.environ.get("SEMANTIC_MODEL", "BAAI/bge-small-zh-v1.5")
# bge 系列检索建议给 query 加指令前缀，可显著提升召回
QUERY_PREFIX = "为这个句子生成表示以用来检索相关文章："

_lock = threading.Lock()
store = None
retriever = None
model = None
_device = "cpu"


def load_model():
    global model, _device
    from sentence_transformers import SentenceTransformer
    print("[semantic] loading model:", MODEL_NAME, flush=True)
    model = SentenceTransformer(MODEL_NAME)
    try:
        import torch
        _device = "cuda" if torch.cuda.is_available() else "cpu"
    except Exception:
        _device = "cpu"
    print("[semantic] model ready on", _device, flush=True)


def build_index():
    global store, retriever
    if not os.path.exists(KB_DATA):
        raise FileNotFoundError("kb-data.json not found: " + KB_DATA)
    with open(KB_DATA, "r", encoding="utf-8") as f:
        data = json.load(f)
    docs = data.get("docs", [])
    if not docs:
        raise ValueError("kb-data.json has no docs")
    print("[semantic] embedding %d docs ..." % len(docs), flush=True)
    texts = [(d.get("text") or d.get("question") or "") for d in docs]
    embs = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
    hdocs = []
    for d, emb in zip(docs, embs):
        meta = {
            "id": d.get("id", ""),
            "category": d.get("category", ""),
            "subcategory": d.get("subcategory", ""),
            "question": d.get("question", ""),
            "answer": d.get("answer", ""),
            "lang": d.get("lang", ""),
        }
        hdocs.append(Document(content=d.get("text", ""), meta=meta, embedding=np.asarray(emb, dtype=np.float32).tolist()))
    store = InMemoryDocumentStore()
    store.write_documents(hdocs)
    retriever = InMemoryEmbeddingRetriever(store, top_k=5)
    print("[semantic] index built, count =", len(hdocs), flush=True)


def do_query(query, top_k=3):
    q = QUERY_PREFIX + (query or "")
    qv = model.encode([q], normalize_embeddings=True, show_progress_bar=False)[0]
    with _lock:
        out = retriever.run(query_embedding=np.asarray(qv, dtype=np.float32).tolist(), top_k=top_k)
    results = []
    for doc in out.get("documents", []):
        m = doc.meta or {}
        results.append({
            "id": m.get("id", ""),
            "category": m.get("category", ""),
            "subcategory": m.get("subcategory", ""),
            "question": m.get("question", ""),
            "answer": m.get("answer", ""),
            "score": round(float(getattr(doc, "score", 0.0) or 0.0), 4),
        })
    return results


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.startswith("/api/semantic/health"):
            with _lock:
                cnt = len(store.filter_documents({})) if store else 0
            self._send(200, {"ok": True, "count": cnt, "model": MODEL_NAME, "device": _device})
        else:
            self._send(404, {"error": "not found"})

    def do_POST(self):
        if self.path.startswith("/api/semantic/query"):
            try:
                ln = int(self.headers.get("Content-Length", "0"))
                payload = json.loads(self.rfile.read(ln) or b"{}")
            except Exception:
                payload = {}
            query = payload.get("query", "")
            top_k = int(payload.get("topK", 3) or 3)
            try:
                results = do_query(query, max(1, min(top_k, 10)))
                self._send(200, {"results": results})
            except Exception as e:
                self._send(500, {"error": str(e)})
        elif self.path.startswith("/api/semantic/reindex"):
            try:
                build_index()
                with _lock:
                    cnt = len(store.filter_documents({}))
                self._send(200, {"ok": True, "count": cnt})
            except Exception as e:
                self._send(500, {"error": str(e)})
        else:
            self._send(404, {"error": "not found"})

    def log_message(self, *args):
        pass


def main():
    load_model()
    build_index()
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print("[semantic] READY on http://127.0.0.1:%d" % PORT, flush=True)
    srv.serve_forever()


if __name__ == "__main__":
    main()
