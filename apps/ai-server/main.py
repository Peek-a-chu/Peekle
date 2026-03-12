from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import os
import re
from openai import OpenAI
from contextlib import asynccontextmanager
from embedding_service import search_similar_problems, get_collection_count

GEMINI_CHAT_MODEL = os.getenv("GEMINI_CHAT_MODEL", "gemini-2.5-flash")

# Gemini API 클라이언트 설정 (OpenAI 호환 엔드포인트)
ai_client = OpenAI(
    api_key=os.getenv("GEMINI_API_KEY"),
    base_url=os.getenv("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai/"),
)

# --- pgvector 초기화 체크 및 자동 로딩 ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    """서버 시작 시 pgvector 데이터가 비어있으면 problems.csv 자동 로드"""
    try:
        count = get_collection_count()
        print(f"[INIT] pgvector 컬렉션에 {count}개의 문제가 저장되어 있습니다.")
        
        if count == 0:
            print("[INIT] pgvector 데이터가 비어있습니다.")
        else:
            print(f"[INIT] 기존 데이터 {count}건 존재 (누락 데이터 확인 중...)")
            
        # 3. 백그라운드 스레드에서 이어하기 인덱싱 실행 (서버 시작 차단 방지)
        import threading
        from indexing import run_auto_indexing
        
        indexing_thread = threading.Thread(target=run_auto_indexing, daemon=True)
        indexing_thread.start()
        print("[INIT] 백그라운드 인덱싱 작업이 시작되었습니다.")
        print("[INIT] pgvector 초기화 완료!")
    except Exception as e:
        print(f"[ERROR] pgvector 초기화 중 오류 발생: {e}")
        print("[WARN] 추천 기능이 제대로 작동하지 않을 수 있습니다.")
    
    yield  # 서버 실행
    
    # 종료 시 정리 작업 (필요시)
    print("[SHUTDOWN] AI 서버 종료")

app = FastAPI(lifespan=lifespan)


# --- 데이터 모델 정의 ---
class TagStat(BaseModel):
    tagName: Optional[str] = ""
    accuracyRate: Optional[float] = 0.0
    attemptCount: Optional[int] = 0

class UserActivity(BaseModel):
    solvedProblemTitles: Optional[List[str]] = []
    failedProblemTitles: Optional[List[str]] = []
    tagStats: Optional[List[TagStat]] = []
    currentTier: Optional[str] = "STONE"

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # 미들웨어 없이도 에러 발생 시 로그를 통해 확인 가능
    print(f"\n[422 ERROR] Body Validation Failed!")
    print(f"Error detail: {exc}")
    return JSONResponse(
        status_code=422,
        content={"detail": str(exc), "msg": "Check field names and types."}
    )

# --- 헬퍼 함수: 러시아어 등 필터링 ---
def is_bad_language(text):
    if re.search('[\u0400-\u04FF]', text):
        return True
    if re.search('[\u0100-\u024F]', text):
        return True
    if re.search('[\u4E00-\u9FFF]', text):
        return True
    return False

@app.post("/recommend/intelligent")
async def get_intelligent_recommendation(request: Request):
    try:
        # 1. 원본 데이터 로깅 (422 에러 원인 추적용)
        body_bytes = await request.body()
        body_str = body_bytes.decode('utf-8') if body_bytes else "EMPTY"
        print(f"\n[DEBUG] Raw Body received: '{body_str}'")

        if not body_bytes:
            print("[ERROR] Body is empty (None/Empty string)")
            return {"recommendations": [], "error": "Empty body from client"}

        # 2. JSON 파싱 및 모델 변환
        try:
            data = await request.json()
            activity = UserActivity(**data)
        except Exception as parse_err:
            print(f"[ERROR] JSON/Pydantic mapping failed: {parse_err}")
            # 데이터 형식이 살짝 틀려도 진행 가능하도록 최선을 다해 파싱 (Optional 필드 활용)
            activity = UserActivity() 

        # 필드 값 자체가 null(None)로 명시되어 올 경우를 위해 안전장치 추가
        current_tier = activity.currentTier or "STONE"
        tag_stats = activity.tagStats or []
        solved_titles = activity.solvedProblemTitles or []
        failed_titles = activity.failedProblemTitles or []

        print(f"[DEBUG] {current_tier} 티어 유저 추천 요청 수신 (정상 파싱됨)")
        
        # 유저 데이터 분석 (TagStat 모델 필드명인 tagName, accuracyRate 사용)
        strong_tags = [s.tagName for s in tag_stats if (s.accuracyRate or 0) >= 0.7 and s.tagName]
        weak_tags = [s.tagName for s in tag_stats if (s.accuracyRate or 0) < 0.7 and s.tagName]
        total_solved = len(solved_titles)
        
        is_new_user = total_solved == 0 and not tag_stats
        print(f"[DEBUG] 신규 유저 여부: {is_new_user}")
        
        # ---------------------------------------------------------
        # 1단계: AI에게 전략 수립 요청 (형식 변경: 키워드 | 전략)
        # ---------------------------------------------------------
        if is_new_user:
            strategy_prompt = f"""
당신은 알고리즘 코치입니다. 이 유저는 우리 서비스를 처음 사용하는 신규 유저입니다.
유저 정보: 현재 티어 {activity.currentTier}, 풀이 기록 없음.

이 유저가 코딩테스트 실력을 본인의 티어에 맞게 성장시킬 수 있도록, pgvector 벡터 DB에서 검색할 인기 알고리즘 유형 키워드 3개를 정해주세요.

🚨 [중요] 응답 형식:
"키워드 | 의도" 형태로 콤마(,)로 구분해 주세요.
- 키워드 항목은 "알고리즘유형 난이도" 형식 (예: 구현 Bronze)
- 의도는 아주 짧게(명사형 추천)

예시:
구현 Bronze | 기초 구현력 점검, 수학 Bronze | 논리적 사고 배양, 문자열 Bronze | 문자열 처리 기초
"""
        else:
            strategy_prompt = f"""
당신은 데이터 기반 알고리즘 코치입니다. 
아래 유저 데이터를 종합적으로 분석하여, 현재 시점에서 가장 성장에 필요한 문제 유형 3개를 선정해주세요.

📊 유저 데이터:
- 현재 티어: {activity.currentTier}
- 최근 성공: {activity.solvedProblemTitles[:10]}
- 최근 실패: {activity.failedProblemTitles[:10]}
- 강점 유형: {strong_tags if strong_tags else "분석 중"}
- 취약 유형: {weak_tags if weak_tags else "분석 중"}

🎯 판단 가이드 (우선순위를 유동적으로 결정하세요):
1. [취약점] 실패했거나 정답률 낮은 유형 -> "보완 필요"
2. [도전] 강점 유형의 상위 난이도 -> "실력 상승 도전"
3. [복습] 오랫동안 안 푼 유형 -> "감 유지"

🚨 [중요] 응답 형식:
"키워드 | 의도" 형태로 콤마(,)로 구분해 주세요.
- 키워드: 반드시 "알고리즘유형 난이도" (예: 그리디 Silver) 형식.
- 의도: '취약점 보완', '티어 상승', '기초 다지기' 처럼 짧고 명확하게.

예시:
그리디 Silver | 취약점 보완,
구현 Gold | 실력 상승 도전,
그래프 Silver | 푼 지 오래된 유형 복습
"""

        response = ai_client.chat.completions.create(
            model=GEMINI_CHAT_MODEL,
            messages=[{"role": "user", "content": strategy_prompt}]
        )
        
        # 응답 파싱: "키워드 | 전략" 쌍으로 분리
        raw_items = [item.strip() for item in response.choices[0].message.content.split(",")]
        parsed_strategies = []
        
        for item in raw_items:
            if "|" in item:
                kw, reason = item.split("|", 1)
                parsed_strategies.append({"keyword": kw.strip(), "strategy_note": reason.strip()})
            else:
                parsed_strategies.append({"keyword": item.strip(), "strategy_note": "성장을 위한 맞춤 문제입니다."})

        print(f"[DEBUG] 파싱된 전략: {parsed_strategies}")

        # ---------------------------------------------------------
        # 2단계: pgvector 검색 (전략 정보를 유지하며 검색)
        # ---------------------------------------------------------
        final_recommendations = []
        seen_problems = set()
        
        for item in parsed_strategies[:3]: # 최대 3개
            kw = item["keyword"]
            strategy_note = item["strategy_note"]
            

            search_results = search_similar_problems(kw, n_results=7)
            
            if search_results['documents'] and search_results['documents'][0]:
                found = False
                for idx in range(len(search_results['documents'][0])):
                    p_info = search_results['documents'][0][idx]
                    p_meta = search_results['metadatas'][0][idx] if search_results['metadatas'][0] else {}
                    
                    if p_info not in seen_problems and not is_bad_language(p_info):
                        final_recommendations.append({
                            "keyword": kw,
                            "problem_info": p_info,
                            "strategy_note": strategy_note, 
                            "metadata": p_meta
                        })
                        seen_problems.add(p_info)
                        found = True
                        break
                
                # 검색 결과가 하나도 없거나 필터링된 경우
                if not found:
                    print(f"[WARN] '{kw}' 키워드에 적합한 문제를 찾지 못함")

        # ---------------------------------------------------------
        # 3단계: 추천 사유 생성 (문제 정보 + 1단계 전략 메모 전달)
        # ---------------------------------------------------------
        

        context_lines = []
        for i, rec in enumerate(final_recommendations):
            context_lines.append(f"{i+1}. 문제: {rec['problem_info']} (추천 의도: {rec['strategy_note']})")
        
        context_text = "\n".join(context_lines)

        if is_new_user:
            reason_prompt = f"""
당신은 친절한 알고리즘 멘토입니다. 
신규 유저에게 아래 문제들을 추천합니다. 괄호 안의 '추천 의도'를 참고하여, 유저에게 건네는 따뜻한 한 마디를 작성해주세요.

추천 목록:
{context_text}

🚨 [작성 규칙]
1. 각 문제에 대한 코멘트를 줄바꿈(Enter)으로 구분하여 총 {len(final_recommendations)}줄을 작성하세요.
2. 문제 제목이나 번호는 적지 말고, 문장만 적으세요.
3. 첫 번째 줄에만 "환영합니다!" 같은 인사를 자연스럽게 섞어주세요.

응답 예시:
환영합니다! 이 문제는 추천 의도처럼 기초 입출력을 배우기에 아주 적합합니다.
조건문이 처음엔 낯설겠지만, 이 문제를 통해 논리적인 사고를 길러보세요.
반복문을 마스터하면 코딩의 신세계가 열립니다. 화이팅!
"""
        else:
            reason_prompt = f"""
당신은 친근한 알고리즘 선배입니다. 유저(현재 티어:{activity.currentTier})에게 왜 이문제를 풀어야 하는지 딱 한문장으로 
핵심만 말해주세요.
괄호 안에 적힌 **'추천 의도'**가 문장에 잘 녹아들어야 합니다.

[추천 목록 및 의도]
{context_text}

🚨 [말투 가이드 - 중요]
1. 분석 보고서처럼 쓰지 마세요. ("~함", "~임", "데이터 분석 결과" 금지)
2. **"~네요", "~해봅시다(해보아요)", "~겁니다"** 같은 **자연스러운 권유형**을 쓰세요.
3. 구체적인 문제 이름이나 숫자를 나열하지 말고, **느낌과 목적**만 전달하세요.

✅ [따라해야 할 모범 답안]
- (취약점 보완일 때): "최근 어려워하셨던 DP 유형이네요. 이 문제로 기초 점화식 세우기를 연습해봅시다."
- (티어 상승일 때): "현재 티어보다 조금 높지만, 이 구현 문제를 풀면 실력이 확실히 늘 겁니다."
- (감 유지일 때): "최근 그래프 문제를 안 푸셨네요. 감을 잃지 않게 가볍게 풀어보는 게 좋겠어요."
- (기초 다지기일 때): "아직 그리디가 낯설 수 있어요. 가장 정석적인 문제로 연습해봅시다."

🚨 [작성 규칙]
1. 위 예시와 비슷한 톤으로 {len(final_recommendations)}개의 문장을 작성하세요.
2. 문장 앞에 숫자, 기호없이 바로 서술하세요. 문제 제목, 번호, 서론을 절대 적지 마세요. 바로 본론(이유)만 적으세요.


"""

        # AI에게 멘트 생성 요청
        reason_response = ai_client.chat.completions.create(
            model=GEMINI_CHAT_MODEL,
            messages=[{"role": "user", "content": reason_prompt}]
        )
        
        reasons = [r.strip() for r in reason_response.choices[0].message.content.strip().split("\n") if r.strip()]

        # ---------------------------------------------------------
        # 4단계: 결과 조립 및 반환
        # ---------------------------------------------------------
        results = []
        for i, rec in enumerate(final_recommendations):
            # 혹시나 AI가 줄 수를 못 맞췄을 경우를 대비한 안전장치
            user_reason = reasons[i] if i < len(reasons) else f"{rec['strategy_note']} 도전해보세요!"
            
            p_meta = rec.get('metadata', {})
            
            results.append({
                "problemId": str(p_meta.get('id', '')),
                "title": p_meta.get('title', ''),
                "tier": p_meta.get('tier', ''),
                "tags": p_meta.get('tags', ''),
                "reason": user_reason,
                "keyword": rec['keyword']
            })

        print("[DEBUG] 추천 로직 완료")
        return {"recommendations": results}

    except Exception as e:
        print(f"[ERROR] 추천 로직 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
