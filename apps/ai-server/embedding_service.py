import os
import threading
import math
from pathlib import Path
from contextlib import contextmanager

import psycopg2
from dotenv import load_dotenv
from openai import OpenAI
from psycopg2.extras import execute_values

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "gemini-embedding-001")
EMBEDDING_DIM = int(os.getenv("EMBEDDING_DIM", "1536"))

PGVECTOR_HOST = os.getenv("PGVECTOR_HOST", os.getenv("POSTGRES_HOST", "localhost"))
PGVECTOR_PORT = int(os.getenv("PGVECTOR_PORT", os.getenv("POSTGRES_PORT", "5432")))
PGVECTOR_DB = os.getenv("PGVECTOR_DB", os.getenv("POSTGRES_DB", "peekle"))
PGVECTOR_USER = os.getenv("PGVECTOR_USER", os.getenv("POSTGRES_USER", "peekle"))
PGVECTOR_PASSWORD = os.getenv("PGVECTOR_PASSWORD", os.getenv("POSTGRES_PASSWORD", "peekle-password"))

openai_client = OpenAI(
    api_key=os.getenv("EMBEDDING_API_KEY") or os.getenv("GEMINI_API_KEY"),
    base_url=os.getenv("EMBEDDING_BASE_URL")
    or os.getenv("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai/"),
)

_schema_lock = threading.Lock()
_schema_ready = False


@contextmanager
def _get_connection():
    conn = psycopg2.connect(
        host=PGVECTOR_HOST,
        port=PGVECTOR_PORT,
        dbname=PGVECTOR_DB,
        user=PGVECTOR_USER,
        password=PGVECTOR_PASSWORD,
        connect_timeout=5,
    )
    try:
        yield conn
    finally:
        conn.close()


def _vector_literal(values):
    return "[" + ",".join(f"{float(v):.8f}" for v in values) + "]"


def _normalize(values):
    norm = math.sqrt(sum(v * v for v in values))
    if norm == 0:
        return values
    return [v / norm for v in values]


def _embed_texts(texts):
    if not texts:
        return []
    response = openai_client.embeddings.create(model=EMBEDDING_MODEL, input=texts)
    embeddings = []
    for item in response.data:
        values = list(item.embedding)
        if len(values) < EMBEDDING_DIM:
            raise ValueError(
                f"Embedding dimension mismatch: model returned {len(values)}, "
                f"but EMBEDDING_DIM={EMBEDDING_DIM}"
            )

        # Gemini embeddings support Matryoshka-style truncation.
        if len(values) > EMBEDDING_DIM:
            values = values[:EMBEDDING_DIM]

        # Keep cosine behavior stable, especially for truncated vectors.
        embeddings.append(_normalize(values))

    return embeddings


def _ensure_schema():
    global _schema_ready
    if _schema_ready:
        return

    with _schema_lock:
        if _schema_ready:
            return

        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
                cur.execute(
                    f"""
                    CREATE TABLE IF NOT EXISTS ai_problem_embeddings (
                        problem_id TEXT PRIMARY KEY,
                        document TEXT NOT NULL,
                        title TEXT,
                        tier TEXT,
                        tags TEXT,
                        source TEXT,
                        embedding vector({EMBEDDING_DIM}) NOT NULL,
                        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                    );
                    """
                )
                if EMBEDDING_DIM <= 2000:
                    cur.execute(
                        """
                        CREATE INDEX IF NOT EXISTS idx_ai_problem_embeddings_embedding
                        ON ai_problem_embeddings
                        USING ivfflat (embedding vector_cosine_ops)
                        WITH (lists = 100);
                        """
                    )
                else:
                    print(
                        f"[WARN] Skipping ivfflat index: EMBEDDING_DIM={EMBEDDING_DIM} "
                        "exceeds pgvector ivfflat vector limit (2000)."
                    )
            conn.commit()

        _schema_ready = True


def get_collection_count():
    """현재 저장된 벡터 문서 수 반환"""
    try:
        _ensure_schema()
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM ai_problem_embeddings;")
                row = cur.fetchone()
                return int(row[0]) if row else 0
    except Exception as e:
        print(f"[WARN] 벡터 문서 수 조회 실패: {e}")
        return 0


def clear_collection():
    """기존 벡터 문서를 모두 삭제"""
    _ensure_schema()
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("TRUNCATE TABLE ai_problem_embeddings;")
        conn.commit()
    print("기존 pgvector 벡터 문서를 삭제했습니다.")


def index_problems(problems):
    """문제를 pgvector에 저장"""
    if not problems:
        return

    _ensure_schema()

    ids = [str(p.get("id", "")) for p in problems]
    documents = [
        str(p.get("document_content", f"{p.get('title', '')} {p.get('tier', '')}")).strip()
        for p in problems
    ]
    titles = [str(p.get("title", "")) for p in problems]
    tiers = [str(p.get("tier", "unknown")) for p in problems]
    tags = [str(p.get("tags", "")) for p in problems]
    sources = [str(p.get("source", "unknown")) for p in problems]

    embeddings = _embed_texts(documents)
    rows = [
        (ids[i], documents[i], titles[i], tiers[i], tags[i], sources[i], _vector_literal(embeddings[i]))
        for i in range(len(ids))
    ]

    with _get_connection() as conn:
        with conn.cursor() as cur:
            execute_values(
                cur,
                """
                INSERT INTO ai_problem_embeddings
                    (problem_id, document, title, tier, tags, source, embedding)
                VALUES %s
                ON CONFLICT (problem_id) DO UPDATE
                SET
                    document = EXCLUDED.document,
                    title = EXCLUDED.title,
                    tier = EXCLUDED.tier,
                    tags = EXCLUDED.tags,
                    source = EXCLUDED.source,
                    embedding = EXCLUDED.embedding,
                    updated_at = CURRENT_TIMESTAMP;
                """,
                rows,
                template="(%s, %s, %s, %s, %s, %s, %s::vector)",
            )
        conn.commit()


def search_similar_problems(query_text, n_results=5):
    """유사 문제 검색"""
    _ensure_schema()
    query_embedding = _embed_texts([query_text])[0]
    query_vector = _vector_literal(query_embedding)

    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    problem_id,
                    document,
                    title,
                    tier,
                    tags,
                    source,
                    embedding <=> %s::vector AS distance
                FROM ai_problem_embeddings
                ORDER BY embedding <=> %s::vector
                LIMIT %s;
                """,
                (query_vector, query_vector, n_results),
            )
            rows = cur.fetchall()

    documents = [row[1] for row in rows]
    metadatas = [
        {
            "id": row[0],
            "title": row[2] or "",
            "tier": row[3] or "",
            "tags": row[4] or "",
            "source": row[5] or "",
        }
        for row in rows
    ]

    return {
        "ids": [[row[0] for row in rows]],
        "documents": [documents],
        "metadatas": [metadatas],
        "distances": [[float(row[6]) for row in rows]],
    }


def score_candidate_similarities(query_text, candidate_ids):
    """
    후보 problem_id 집합에 대해 query_text 임베딩 유사도(코사인 기반)를 계산한다.
    return: {problem_id: similarity}
    """
    if not query_text or not candidate_ids:
        return {}

    try:
        _ensure_schema()
        query_embedding = _embed_texts([query_text])[0]
        query_vector = _vector_literal(query_embedding)
        str_ids = [str(pid).strip() for pid in candidate_ids if str(pid).strip()]
        if not str_ids:
            return {}

        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        problem_id,
                        (1 - (embedding <=> %s::vector)) AS similarity
                    FROM ai_problem_embeddings
                    WHERE problem_id = ANY(%s);
                    """,
                    (query_vector, str_ids),
                )
                rows = cur.fetchall()

        result = {}
        for row in rows:
            pid = str(row[0])
            sim = float(row[1]) if row[1] is not None else 0.0
            if sim != sim:  # NaN guard
                sim = 0.0
            result[pid] = sim
        return result
    except Exception as e:
        print(f"[WARN] 후보 임베딩 점수 계산 실패: {e}")
        return {}


def check_existing_ids(ids):
    """주어진 ID 리스트 중 이미 DB에 존재하는 ID만 반환"""
    if not ids:
        return set()

    try:
        _ensure_schema()
        str_ids = [str(i) for i in ids]
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT problem_id
                    FROM ai_problem_embeddings
                    WHERE problem_id = ANY(%s);
                    """,
                    (str_ids,),
                )
                rows = cur.fetchall()
        return {row[0] for row in rows}
    except Exception as e:
        print(f"[WARN] ID 조회 중 오류: {e}")
        return set()
