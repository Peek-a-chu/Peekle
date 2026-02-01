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

# 2. ChromaDB 클라이언트 및 컬렉션 설정
chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection(
    name="problems",
    embedding_function=openai_ef
)

def index_problems(problems):
    """문제를 ChromaDB에 저장 (자동 임베딩 방식)"""
    ids = [str(p['id']) for p in problems]
    
    # indexing.py에서 넘겨준 태그 포함 텍스트 사용
    documents = [
        str(p.get('document_content', f"{p.get('title', '')} {p.get('tier', '')}")).strip() 
        for p in problems
    ] 
    
    metadatas = [
        {
            "tier": str(p.get('tier', 'unknown')), 
            "source": str(p.get('source', 'unknown'))
        } 
        for p in problems
    ]
    
    # embeddings 인자를 따로 주지 않으면 openai_ef가 자동으로 생성
    collection.add(
        ids=ids,
        documents=documents,
        metadatas=metadatas
    )

def search_similar_problems(query_text, n_results=5):
    """유사 문제 검색 (자동 임베딩 방식)"""
    # query_texts만 주면 openai_ef가 자동으로 쿼리를 임베딩
    results = collection.query(
        query_texts=[query_text],
        n_results=n_results
    )
    return results