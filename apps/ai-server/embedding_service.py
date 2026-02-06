import os
import chromadb
from openai import OpenAI
from dotenv import load_dotenv
from chromadb.utils import embedding_functions

load_dotenv()

# 1. 임베딩 함수 설정
openai_ef = embedding_functions.OpenAIEmbeddingFunction(
    api_key=os.getenv("GMS_API_KEY"),
    api_base=os.getenv("EMBEDDING_BASE_URL"),
    model_name="text-embedding-3-small"
)

# 2. ChromaDB HTTP 클라이언트 (서버 모드)
CHROMA_HOST = os.getenv("CHROMA_HOST", "localhost")
CHROMA_PORT = os.getenv("CHROMA_PORT", "8001")

chroma_client = chromadb.HttpClient(
    host=CHROMA_HOST,
    port=int(CHROMA_PORT)
)

def get_collection():
    """컬렉션 객체를 동적으로 가져옴 (연결 끊김 방지)"""
    return chroma_client.get_or_create_collection(
        name="problems",
        embedding_function=openai_ef
    )

def get_collection_count():
    """현재 컬렉션에 저장된 문서 수 반환"""
    try:
        return get_collection().count()
    except Exception as e:
        print(f"[WARN] 컬렉션 카운트 조회 실패: {e}")
        return 0

def clear_collection():
    """기존 컬렉션을 완전히 삭제하고 초기화"""
    try:
        chroma_client.delete_collection(name="problems")
        print("기존 ChromaDB 컬렉션을 삭제했습니다.")
    except Exception as e:
        print(f"컬렉션 삭제 중 오류(이미 없을 수 있음): {e}")
    
    # 다시 생성 (get_collection 호출 시 자동 생성됨)
    get_collection()
    print("새로운 컬렉션('problems')을 생성했습니다.")

def index_problems(problems):
    """문제를 ChromaDB에 저장"""
    ids = [str(p['id']) for p in problems]
    
    documents = [
        str(p.get('document_content', f"{p.get('title', '')} {p.get('tier', '')}")).strip() 
        for p in problems
    ] 
    
    metadatas = [
        {
            "id": str(p.get('id', '')),
            "title": str(p.get('title', '')),
            "tier": str(p.get('tier', 'unknown')), 
            "tags": str(p.get('tags', '')),
            "source": str(p.get('source', 'unknown'))
        } 
        for p in problems
    ]
    
    get_collection().upsert(
        ids=ids,
        documents=documents,
        metadatas=metadatas
    )

def search_similar_problems(query_text, n_results=5):
    """유사 문제 검색"""
    results = get_collection().query(
        query_texts=[query_text],
        n_results=n_results
    )
    return results

def check_existing_ids(ids):
    """주어진 ID 리스트 중 이미 DB에 존재하는 ID만 반환"""
    try:
        # get() 메서드로 ID 존재 여부 확인 (메타데이터만 가볍게 조회)
        existing = get_collection().get(ids=ids, include=[])
        return set(existing['ids'])
    except Exception as e:
        print(f"[WARN] ID 조회 중 오류: {e}")
        return set()