from contextlib import asynccontextmanager
import json
import os
from pathlib import Path
import re
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from openai import OpenAI
from pydantic import BaseModel

from embedding_service import get_collection_count, score_candidate_similarities

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

GEMINI_CHAT_MODEL = os.getenv("GEMINI_CHAT_MODEL", "gemini-2.5-flash")
TARGET_RECOMMENDATION_COUNT = 3
CANDIDATE_LIMIT = 20
COLD_START_MIN_SIGNAL = 5
VALID_INTENTS = {"WEAKNESS_REPAIR", "STABLE_FIT", "STRETCH", "REVIEW"}
EMBEDDING_BLEND_WEIGHT = float(os.getenv("EMBEDDING_BLEND_WEIGHT", "5.0"))

ai_client = OpenAI(
    api_key=os.getenv("GEMINI_API_KEY"),
    base_url=os.getenv("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai/"),
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        count = get_collection_count()
        print(f"[INIT] pgvector 컬렉션 문서 수: {count}")
    except Exception as e:
        print(f"[WARN] 초기 상태 확인 실패: {e}")
    yield
    print("[SHUTDOWN] AI 서버 종료")


app = FastAPI(lifespan=lifespan)


class TagStat(BaseModel):
    tagName: Optional[str] = ""
    accuracyRate: Optional[float] = 0.0
    attemptCount: Optional[int] = 0


class CandidateProblem(BaseModel):
    problemId: Optional[str] = ""
    title: Optional[str] = ""
    tier: Optional[str] = ""
    level: Optional[int] = 0
    tags: Optional[List[str]] = []
    difficultyGap: Optional[int] = 0
    weakTagMatchCount: Optional[int] = 0
    strongTagMatchCount: Optional[int] = 0
    staleTagMatchCount: Optional[int] = 0
    recentlyRecommended: Optional[bool] = False
    candidateScore: Optional[float] = 0.0
    selectionIntentHint: Optional[str] = "STABLE_FIT"
    popularityScore: Optional[float] = 0.0
    noveltyScore: Optional[float] = 0.0


class UserActivity(BaseModel):
    solvedProblemTitles: Optional[List[str]] = []
    failedProblemTitles: Optional[List[str]] = []
    tagStats: Optional[List[TagStat]] = []
    currentTier: Optional[str] = "STONE"
    recLevelX10: Optional[int] = 10
    tone: Optional[str] = "시작용/적응용"
    strongTags: Optional[List[str]] = []
    weakTags: Optional[List[str]] = []
    staleTags: Optional[List[str]] = []
    candidateProblems: Optional[List[CandidateProblem]] = []


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": str(exc), "msg": "Check field names and types."},
    )


def is_bad_language(text: str) -> bool:
    if not text:
        return False
    if re.search("[\u0400-\u04FF]", text):
        return True
    if re.search("[\u0100-\u024F]", text):
        return True
    if re.search("[\u4E00-\u9FFF]", text):
        return True
    return False


def normalize_intent(intent: Optional[str], fallback: Optional[str]) -> str:
    value = (intent or "").strip().upper()
    if value not in VALID_INTENTS:
        value = (fallback or "").strip().upper()
    if value not in VALID_INTENTS:
        value = "STABLE_FIT"
    return value


def fallback_reason(intent: str) -> str:
    normalized = normalize_intent(intent, "STABLE_FIT")
    if normalized == "WEAKNESS_REPAIR":
        return "최근 약한 유형을 보완하는 데 적절한 문제예요."
    if normalized == "STRETCH":
        return "익숙한 유형을 한 단계 높은 난이도로 확장해 보기 좋은 문제예요."
    if normalized == "REVIEW":
        return "한동안 손이 닿지 않았던 유형 감각을 다시 살리기 좋은 문제예요."
    return "현재 추천 난이도에 맞춰 안정적으로 풀기 좋은 문제예요."


def normalize_candidates(candidates: List[CandidateProblem]) -> List[dict]:
    normalized = []
    seen = set()

    for c in candidates or []:
        pid = str(c.problemId or "").strip()
        if not pid or pid in seen:
            continue

        title = str(c.title or "").strip()
        tier = str(c.tier or "").strip()
        if not title or not tier or is_bad_language(title):
            continue

        tags = []
        for tag in c.tags or []:
            value = str(tag or "").strip()
            if value:
                tags.append(value)

        normalized.append(
            {
                "problemId": pid,
                "title": title,
                "tier": tier,
                "level": int(c.level or 0),
                "tags": tags,
                "difficultyGap": int(c.difficultyGap or 0),
                "weakTagMatchCount": int(c.weakTagMatchCount or 0),
                "strongTagMatchCount": int(c.strongTagMatchCount or 0),
                "staleTagMatchCount": int(c.staleTagMatchCount or 0),
                "recentlyRecommended": bool(c.recentlyRecommended),
                "candidateScore": float(c.candidateScore or 0.0),
                "selectionIntentHint": normalize_intent(c.selectionIntentHint, "STABLE_FIT"),
                "popularityScore": float(c.popularityScore or 0.0),
                "noveltyScore": float(c.noveltyScore or 0.0),
            }
        )
        seen.add(pid)

        if len(normalized) >= CANDIDATE_LIMIT:
            break

    return normalized


def build_embedding_query_text(
    activity: UserActivity,
    strong_tags: List[str],
    weak_tags: List[str],
    stale_tags: List[str],
    is_cold_start: bool,
) -> str:
    parts = [
        f"currentTier: {activity.currentTier}",
        f"tone: {activity.tone}",
        f"coldStart: {is_cold_start}",
    ]

    if weak_tags:
        parts.append("weak tags: " + ", ".join(weak_tags[:8]))
    if strong_tags:
        parts.append("strong tags: " + ", ".join(strong_tags[:8]))
    if stale_tags:
        parts.append("stale tags: " + ", ".join(stale_tags[:8]))

    solved = [title for title in (activity.solvedProblemTitles or []) if title][:6]
    failed = [title for title in (activity.failedProblemTitles or []) if title][:6]
    if solved:
        parts.append("recent solved: " + ", ".join(solved))
    if failed:
        parts.append("recent failed: " + ", ".join(failed))

    return " | ".join(parts)


def rerank_candidates_with_embedding(
    activity: UserActivity,
    candidates: List[dict],
    strong_tags: List[str],
    weak_tags: List[str],
    stale_tags: List[str],
    is_cold_start: bool,
) -> List[dict]:
    if not candidates:
        return []

    query_text = build_embedding_query_text(activity, strong_tags, weak_tags, stale_tags, is_cold_start)
    candidate_ids = [c["problemId"] for c in candidates]
    similarity_map = score_candidate_similarities(query_text, candidate_ids)
    if not similarity_map:
        return sorted(candidates, key=lambda c: c.get("candidateScore", 0.0), reverse=True)

    sims = [similarity_map[pid] for pid in candidate_ids if pid in similarity_map]
    if not sims:
        return sorted(candidates, key=lambda c: c.get("candidateScore", 0.0), reverse=True)

    sim_min = min(sims)
    sim_max = max(sims)
    sim_range = sim_max - sim_min

    reranked = []
    for c in candidates:
        pid = c["problemId"]
        raw_sim = similarity_map.get(pid)
        if raw_sim is None:
            norm_sim = 0.0
            raw_sim = 0.0
        elif sim_range > 1e-9:
            norm_sim = (raw_sim - sim_min) / sim_range
        else:
            norm_sim = 0.5

        base_score = float(c.get("candidateScore", 0.0))
        hybrid_score = base_score + (norm_sim * EMBEDDING_BLEND_WEIGHT)

        copied = dict(c)
        copied["embeddingSimilarity"] = raw_sim
        copied["hybridScore"] = hybrid_score
        reranked.append(copied)

    return sorted(
        reranked,
        key=lambda c: (c.get("hybridScore", 0.0), c.get("candidateScore", 0.0)),
        reverse=True,
    )


def extract_json_object(text: str) -> Optional[dict]:
    if not text:
        return None

    stripped = text.strip()
    try:
        return json.loads(stripped)
    except Exception:
        pass

    match = re.search(r"\{[\s\S]*\}", stripped)
    if not match:
        return None

    try:
        return json.loads(match.group(0))
    except Exception:
        return None


def build_prompt(activity: UserActivity, candidates: List[dict], strong_tags: List[str], weak_tags: List[str], stale_tags: List[str]) -> str:
    lines = []
    for c in candidates:
        tags = ",".join(c["tags"]) if c["tags"] else ""
        hybrid = c.get("hybridScore", c.get("candidateScore", 0.0))
        emb = c.get("embeddingSimilarity", 0.0)
        lines.append(
            "- problemId={problemId} | title={title} | tier={tier} | tags=[{tags}] | gap={gap} | weak={weak} | strong={strong} | stale={stale} | intent={intent} | score={score:.2f} | hybrid={hybrid:.2f} | emb={emb:.4f}".format(
                problemId=c["problemId"],
                title=c["title"],
                tier=c["tier"],
                tags=tags,
                gap=c["difficultyGap"],
                weak=c["weakTagMatchCount"],
                strong=c["strongTagMatchCount"],
                stale=c["staleTagMatchCount"],
                intent=c["selectionIntentHint"],
                score=c["candidateScore"],
                hybrid=hybrid,
                emb=emb,
            )
        )
    candidate_block = "\n".join(lines)

    return f"""
당신은 알고리즘 추천 어시스턴트입니다.
아래 후보 문제 목록 안에서만 추천해야 합니다. 후보 밖 문제는 절대 선택하지 마세요.

유저 정보:
- currentTier: {activity.currentTier}
- recLevelX10: {activity.recLevelX10}
- 추천 톤: {activity.tone}
- 강점 태그: {strong_tags if strong_tags else []}
- 약점 태그: {weak_tags if weak_tags else []}
- 오래 안 푼 태그: {stale_tags if stale_tags else []}
- 최근 성공(상위 10개): {(activity.solvedProblemTitles or [])[:10]}
- 최근 실패(상위 10개): {(activity.failedProblemTitles or [])[:10]}

후보 문제 목록({len(candidates)}개):
{candidate_block}

선정 원칙:
1. 반드시 후보 목록의 problemId만 사용
2. problemId는 중복 금지
3. 정확히 {TARGET_RECOMMENDATION_COUNT}개 추천
4. reason은 한국어 한 문장, 과장 없는 권유형
5. 3개는 가능한 한 다음 균형을 따를 것:
   - 최소 1개: 약점 보완형 (WEAKNESS_REPAIR)
   - 최대 1개: 상향 도전형 (STRETCH)
   - 나머지: STABLE_FIT 또는 REVIEW
6. 같은 핵심 태그의 문제만 3개 고르지 말 것
7. selectionIntentHint, difficultyGap, weakTagMatchCount를 적극 반영할 것
8. hybrid 점수(emb 유사도 반영)를 참고하되, 태그/의도 균형 규칙을 우선할 것

응답 형식(JSON만 출력, 마크다운 금지):
{{
  "recommendations": [
    {{"problemId": "문제번호", "reason": "추천 이유", "intent": "WEAKNESS_REPAIR"}},
    {{"problemId": "문제번호", "reason": "추천 이유", "intent": "STABLE_FIT"}},
    {{"problemId": "문제번호", "reason": "추천 이유", "intent": "STRETCH"}}
  ]
}}
"""


@app.post("/recommend/intelligent")
async def get_intelligent_recommendation(request: Request):
    try:
        try:
            data = await request.json()
            activity = UserActivity(**data)
        except Exception:
            activity = UserActivity()

        tag_stats = activity.tagStats or []
        solved_titles = activity.solvedProblemTitles or []
        failed_titles = activity.failedProblemTitles or []

        strong_tags = [tag for tag in (activity.strongTags or []) if tag]
        weak_tags = [tag for tag in (activity.weakTags or []) if tag]
        stale_tags = [tag for tag in (activity.staleTags or []) if tag]

        if not strong_tags:
            strong_tags = [
                stat.tagName
                for stat in tag_stats
                if stat.tagName and (stat.attemptCount or 0) >= 3 and (stat.accuracyRate or 0.0) >= 0.7
            ]
        if not weak_tags:
            weak_tags = [
                stat.tagName
                for stat in tag_stats
                if stat.tagName and (stat.attemptCount or 0) >= 3 and (stat.accuracyRate or 0.0) < 0.4
            ]

        attempt_signal = len(solved_titles) + len(failed_titles) + sum((stat.attemptCount or 0) for stat in tag_stats)
        is_cold_start = attempt_signal < COLD_START_MIN_SIGNAL
        if not activity.tone:
            activity.tone = "시작용/적응용" if is_cold_start else "성장/보완"

        candidates = normalize_candidates(activity.candidateProblems or [])
        if not candidates:
            return {"recommendations": []}
        candidates = rerank_candidates_with_embedding(
            activity,
            candidates,
            strong_tags,
            weak_tags,
            stale_tags,
            is_cold_start,
        )

        prompt = build_prompt(activity, candidates, strong_tags, weak_tags, stale_tags)
        response = ai_client.chat.completions.create(
            model=GEMINI_CHAT_MODEL,
            messages=[{"role": "user", "content": prompt}],
        )

        raw_content = (response.choices[0].message.content or "").strip()
        parsed = extract_json_object(raw_content) or {}
        raw_recs = parsed.get("recommendations", []) if isinstance(parsed, dict) else []

        candidate_map = {c["problemId"]: c for c in candidates}
        ranked_candidates = sorted(
            candidates,
            key=lambda x: (x.get("hybridScore", 0.0), x.get("candidateScore", 0.0)),
            reverse=True,
        )

        selected = []
        seen = set()
        stretch_count = 0

        for item in raw_recs:
            if len(selected) >= TARGET_RECOMMENDATION_COUNT:
                break
            if not isinstance(item, dict):
                continue
            pid = str(item.get("problemId", "")).strip()
            if not pid or pid in seen or pid not in candidate_map:
                continue

            candidate = candidate_map[pid]
            intent = normalize_intent(item.get("intent"), candidate.get("selectionIntentHint"))
            if intent == "STRETCH" and stretch_count >= 1:
                continue
            reason = str(item.get("reason", "")).strip() or fallback_reason(intent)
            selected.append({"problemId": pid, "reason": reason, "intent": intent})
            seen.add(pid)
            if intent == "STRETCH":
                stretch_count += 1

        for candidate in ranked_candidates:
            if len(selected) >= TARGET_RECOMMENDATION_COUNT:
                break
            pid = candidate["problemId"]
            if pid in seen:
                continue
            intent = normalize_intent(None, candidate.get("selectionIntentHint"))
            if intent == "STRETCH" and stretch_count >= 1:
                continue
            selected.append({"problemId": pid, "reason": fallback_reason(intent), "intent": intent})
            seen.add(pid)
            if intent == "STRETCH":
                stretch_count += 1

        if len(selected) < TARGET_RECOMMENDATION_COUNT:
            for candidate in ranked_candidates:
                if len(selected) >= TARGET_RECOMMENDATION_COUNT:
                    break
                pid = candidate["problemId"]
                if pid in seen:
                    continue
                intent = normalize_intent(None, candidate.get("selectionIntentHint"))
                selected.append({"problemId": pid, "reason": fallback_reason(intent), "intent": intent})
                seen.add(pid)

        has_weakness = any(rec["intent"] == "WEAKNESS_REPAIR" for rec in selected)
        if not has_weakness:
            weakness_candidate = next(
                (
                    c
                    for c in ranked_candidates
                    if c["problemId"] not in seen and c.get("selectionIntentHint") == "WEAKNESS_REPAIR"
                ),
                None,
            )
            if weakness_candidate is not None:
                replacement = {
                    "problemId": weakness_candidate["problemId"],
                    "reason": fallback_reason("WEAKNESS_REPAIR"),
                    "intent": "WEAKNESS_REPAIR",
                }
                if len(selected) < TARGET_RECOMMENDATION_COUNT:
                    selected.append(replacement)
                else:
                    replace_idx = next((i for i, rec in reversed(list(enumerate(selected))) if rec["intent"] != "WEAKNESS_REPAIR"), -1)
                    if replace_idx >= 0:
                        selected[replace_idx] = replacement

        results = []
        for rec in selected[:TARGET_RECOMMENDATION_COUNT]:
            meta = candidate_map.get(rec["problemId"])
            if meta is None:
                continue
            results.append(
                {
                    "problemId": meta["problemId"],
                    "title": meta["title"],
                    "tier": meta["tier"],
                    "tags": "|".join(meta["tags"]),
                    "reason": rec["reason"],
                    "keyword": "candidate-filter",
                    "intent": rec["intent"],
                }
            )

        return {"recommendations": results}

    except Exception as e:
        print(f"[ERROR] 추천 로직 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
