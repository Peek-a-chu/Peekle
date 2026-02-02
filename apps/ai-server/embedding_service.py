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
collection = chroma_client.get_or_create_collection(
    name="problems",
    embedding_function=openai_ef
)

def index_problems(problems):
    """문제를 ChromaDB에 저장"""
    ids = [str(p['id']) for p in problems]
    
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
    
    collection.add(
        ids=ids,
        documents=documents,
        metadatas=metadatas
    )

def search_similar_problems(query_text, n_results=5):
    """유사 문제 검색"""
    results = collection.query(
        query_texts=[query_text],
        n_results=n_results
    )
    return results