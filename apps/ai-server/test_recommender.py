"""
AI 추천 시스템 테스트 스크립트
- ChromaDB 검색 테스트
- main.py의 /recommend/intelligent 엔드포인트와 동일한 로직 테스트
"""
import requests
import json

def test_chromadb_search():
    """ChromaDB 유사 문제 검색 테스트"""
    from embedding_service import search_similar_problems
    
    queries = ["최단 경로", "동적 프로그래밍", "그래프 탐색"]
    
    print("=" * 50)
    print("🔍 ChromaDB 검색 테스트")
    print("=" * 50)
    
    for query in queries:
        print(f"\n📌 검색어: '{query}'")
        results = search_similar_problems(query, n_results=3)
        
        if results['documents'] and results['documents'][0]:
            for i, (doc, meta) in enumerate(zip(results['documents'][0], results['metadatas'][0])):
                print(f"  {i+1}. {doc}")
                print(f"     └ 티어: {meta.get('tier', 'N/A')}, 출처: {meta.get('source', 'N/A')}")
        else:
            print("  ⚠️ 검색 결과 없음")

def test_api_endpoint():
    """FastAPI 엔드포인트 테스트 (서버 실행 필요)"""
    url = "http://localhost:8000/recommend/intelligent"
    
    payload = {
        "solvedProblemTitles": ["A+B", "정렬", "피보나치"],
        "failedProblemTitles": ["DFS와 BFS"],
        "tagStats": [
            {"tagName": "DP", "accuracyRate": 0.5, "attemptCount": 10},
            {"tagName": "그래프", "accuracyRate": 0.8, "attemptCount": 5}
        ],
        "currentTier": "GOLD"
    }
    
    print("\n" + "=" * 50)
    print("🚀 API 엔드포인트 테스트")
    print("=" * 50)
    print(f"URL: {url}")
    print(f"Payload: {json.dumps(payload, ensure_ascii=False, indent=2)}")
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        if response.status_code == 200:
            data = response.json()
            print("\n✅ 응답 성공!")
            for i, rec in enumerate(data.get('recommendations', [])):
                print(f"  {i+1}. 문제: {rec.get('problem', 'N/A')}")
                print(f"     └ 사유: {rec.get('reason', 'N/A')}")
        else:
            print(f"\n❌ 오류: {response.status_code}")
            print(response.text)
    except requests.exceptions.ConnectionError:
        print("\n⚠️ 서버에 연결할 수 없습니다. 먼저 서버를 실행하세요:")
        print("   uvicorn main:app --reload")
    except Exception as e:
        print(f"\n❌ 예외 발생: {e}")

if __name__ == "__main__":
    print("\n🧪 AI 추천 시스템 테스트\n")
    
    # 1. ChromaDB 검색 테스트
    test_chromadb_search()
    
    # 2. API 엔드포인트 테스트 (서버 실행 필요)
    test_api_endpoint()