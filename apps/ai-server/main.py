from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
import os
from openai import OpenAI
from embedding_service import search_similar_problems

app = FastAPI()

# GPT-4o-mini API 클라이언트
ai_client = OpenAI(
    api_key=os.getenv("GMS_API_KEY"),
    base_url=os.getenv("GPT_BASE_URL")
)

# 태그 통계 모델
class TagStat(BaseModel):
    tagName: str
    accuracyRate: float
    attemptCount: int

# 백엔드로부터 받을 유저 데이터 형식
class UserActivity(BaseModel):
    solvedProblemTitles: List[str]
    failedProblemTitles: List[str]
    tagStats: List[TagStat]
    currentTier: str

@app.post("/recommend/intelligent")
async def get_intelligent_recommendation(activity: UserActivity):
    try:
        # 유저 데이터 분석
        strong_tags = [s.tagName for s in activity.tagStats if s.accuracyRate >= 0.7]
        weak_tags = [s.tagName for s in activity.tagStats if s.accuracyRate < 0.7]
        total_solved = len(activity.solvedProblemTitles)
        
        # 신규 유저 체크
        is_new_user = total_solved == 0 and not activity.tagStats
        
        # 1단계: AI에게 전략 수립 요청
        if is_new_user:
            strategy_prompt = f"""
당신은 알고리즘 코치입니다. 이 유저는 우리 서비스를 처음 사용하는 신규 유저입니다.

유저 정보:
- 현재 티어: {activity.currentTier}
- 풀이 기록: 없음

신규 유저에게 알맞은 입문 문제 3개를 추천하기 위한 검색 키워드를 정해주세요.
첫 경험이 중요하니 너무 어렵지 않으면서도 성취감을 줄 수 있는 문제들로요.

응답 형식 (콤마로 구분된 3개 키워드만):
예: 입문 구현, 기초 수학, 쉬운 문자열
"""
        else:
            strategy_prompt = f"""
당신은 알고리즘 코치입니다. 아래 유저의 학습 데이터를 분석하고, 오늘 이 유저가 풀면 가장 성장에 도움이 될 문제 3가지를 추천해주세요.

📊 유저 분석 데이터:
- 현재 티어: {activity.currentTier}
- 최근 성공한 문제들: {activity.solvedProblemTitles if activity.solvedProblemTitles else "없음"}
- 최근 실패한 문제들: {activity.failedProblemTitles if activity.failedProblemTitles else "없음"}
- 강점 유형 (정답률 70% 이상): {strong_tags if strong_tags else "아직 파악되지 않음"}
- 취약 유형 (정답률 70% 미만): {weak_tags if weak_tags else "아직 파악되지 않음"}
- 태그별 상세: {[(s.tagName, f"{s.accuracyRate*100:.0f}%", f"{s.attemptCount}회") for s in activity.tagStats] if activity.tagStats else "없음"}

🎯 추천 전략 가이드:
1. 취약점 보완: 실패했거나 정답률이 낮은 유형 중 기초 문제
2. 강점 심화: 잘하는 유형에서 한 단계 높은 난이도로 도전
3. 새로운 영역: 아직 시도하지 않은 유형으로 시야 확장

위 데이터를 종합적으로 분석해서, ChromaDB에서 검색할 키워드 3개를 정해주세요.
각 키워드는 "알고리즘유형 난이도" 형식으로 작성해주세요.

응답 형식 (콤마로 구분된 3개 키워드만):
예: DP Silver, 그래프 Gold, BFS Bronze
"""

        response = ai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": strategy_prompt}]
        )
        keywords = [kw.strip() for kw in response.choices[0].message.content.split(",")]

        # 2단계: ChromaDB에서 문제 검색
        final_recommendations = []
        for kw in keywords[:3]:
            search_results = search_similar_problems(kw, n_results=1)
            if search_results['documents'] and search_results['documents'][0]:
                final_recommendations.append({
                    "keyword": kw,
                    "problem_info": search_results['documents'][0][0],
                    "metadata": search_results['metadatas'][0][0] if search_results['metadatas'][0] else {}
                })

        if not final_recommendations:
            return {"recommendations": []}

        # 3단계: 인간미 있는 추천 사유 생성
        reason_prompt = f"""
당신은 따뜻하면서도 전문적인 알고리즘 코치입니다.
아래 3개 문제를 이 유저에게 추천하는 이유를 각각 한 문장씩 작성해주세요.

유저 정보:
- 티어: {activity.currentTier}
- 최근 성공: {activity.solvedProblemTitles[:3] if activity.solvedProblemTitles else "없음"}
- 최근 실패: {activity.failedProblemTitles[:3] if activity.failedProblemTitles else "없음"}
- 강점: {strong_tags if strong_tags else "아직 파악 중"}
- 취약점: {weak_tags if weak_tags else "아직 파악 중"}

추천 문제들:
{[f"{i+1}. {r['problem_info']}" for i, r in enumerate(final_recommendations)]}

작성 가이드:
- 유저의 상황에 맞춰 공감하는 어조로
- 왜 이 문제가 성장에 도움이 되는지 구체적으로
- 격려와 동기부여가 담긴 문장으로

응답 형식 (각 문제당 한 줄씩, 번호 없이):
예:
DP에서 자꾸 막히셨죠? 이 문제로 기초를 탄탄히 다져보세요!
그래프 실력이 눈에 띄게 늘고 있어요. 한 단계 더 도전해볼까요?
새로운 유형도 두려워 말고 도전! 의외로 재미있을 거예요.
"""

        reason_response = ai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": reason_prompt}]
        )
        reasons = [r.strip() for r in reason_response.choices[0].message.content.strip().split("\n") if r.strip()]

        # 4단계: 결과 조립
        results = []
        for i, rec in enumerate(final_recommendations):
            results.append({
                "problem": rec['problem_info'],
                "reason": reasons[i] if i < len(reasons) else "당신의 성장을 위해 AI가 엄선한 문제입니다!"
            })

        return {"recommendations": results}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))