package com.peekle.domain.submission.service;

import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;

@Slf4j
@Component
public class SubmissionValidator {

    private static final String BOJ_STATUS_URL = "https://www.acmicpc.net/status?problem_id=%s&user_id=%s"; // 모든 결과 조회
    private static final String BOJ_GLOBAL_STATUS_URL = "https://www.acmicpc.net/status";
    private static final int LENGTH_TOLERANCE = 10; // 허용 오차 (Bytes)
    private static final int VALIDATION_MAX_RETRY = 5;
    private static final long VALIDATION_RETRY_DELAY_MS = 700L;
    private static final int DEBUG_GLOBAL_SCAN_PAGES = 12;

    public void validateSubmission(String problemId, String userId, String submitId, String code) {
        String url = String.format(BOJ_STATUS_URL, problemId, userId);
        String normalizedSubmitId = submitId == null ? "" : submitId.trim();
        if (normalizedSubmitId.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "제출 ID가 비어 있어 검증할 수 없습니다.");
        }

        try {
            Element targetRow = null;
            List<String> lastParsedRows = new ArrayList<>();
            int lastRowCount = 0;
            for (int attempt = 1; attempt <= VALIDATION_MAX_RETRY; attempt++) {
                Document doc = Jsoup.connect(url)
                        .userAgent(
                                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                        .timeout(5000)
                        .get();

                Elements rows = doc.select("table#status-table tbody tr");
                lastRowCount = rows.size();
                lastParsedRows = summarizeRows(rows);
                for (Element row : rows) {
                    Element firstCol = row.select("td").first();
                    if (firstCol == null) {
                        continue;
                    }
                    String rowSubmitId = firstCol.text() == null ? "" : firstCol.text().trim();
                    if (rowSubmitId.equals(normalizedSubmitId)) {
                        targetRow = row;
                        break;
                    }
                }

                if (targetRow != null) {
                    break;
                }

                if (attempt < VALIDATION_MAX_RETRY) {
                    try {
                        Thread.sleep(VALIDATION_RETRY_DELAY_MS);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new BusinessException(ErrorCode.BAEKJOON_CONNECTION_ERROR, "검증 재시도 중 인터럽트가 발생했습니다.");
                    }
                }
            }

            if (targetRow == null) {
                System.out.println("❌ Validation Failed: 제출 기록 없음 (Problem: " + problemId + ", User: " + userId + ")");
                log.warn(
                        "Validation miss: submitId={} problemId={} userId={} url={} rowCount={} sampledRows={}",
                        normalizedSubmitId, problemId, userId, url, lastRowCount, lastParsedRows);

                Optional<SubmissionSnapshot> globalMatch = findInGlobalStatus(normalizedSubmitId);
                if (globalMatch.isPresent()) {
                    SubmissionSnapshot snapshot = globalMatch.get();
                    log.warn(
                            "Validation miss detail: submitId={} expectedUser={} actualUser={} expectedProblem={} actualProblem={} actualResult={} pageUrl={}",
                            normalizedSubmitId, userId, snapshot.userId, problemId, snapshot.problemId, snapshot.result,
                            snapshot.pageUrl);
                    String mismatchDetail = buildMismatchMessage(problemId, userId, snapshot);
                    throw new BusinessException(ErrorCode.BAEKJOON_SUBMISSION_NOT_FOUND,
                            mismatchDetail + " (ID: " + normalizedSubmitId + ")");
                }

                throw new BusinessException(ErrorCode.BAEKJOON_SUBMISSION_NOT_FOUND,
                        "백준 채점 현황에서 해당 제출 기록을 찾을 수 없습니다. (ID: " + normalizedSubmitId + ")");
            }

            // 결과(Result) 검증: "맞았습니다!!" 또는 "100점" 등 성공 여부 확인
            Element resultElement = targetRow.select("td").get(3);
            String resultText = resultElement.text();

            // 성공으로 간주할 텍스트들 (필요시 더 추가: "100 점", "AC" 등)
            boolean isSuccess = resultText.contains("맞았습니다") || resultText.contains("100점");

            if (!isSuccess) {
                System.out.println("❌ Validation Failed: 성공하지 못한 제출입니다. (Result: " + resultText + ")");
                throw new BusinessException(ErrorCode.INVALID_SUBMISSION_STATUS, "성공한 제출이 아닙니다. 상태: " + resultText);
            }

            // ... (코드 길이 검증 로직)

            Element lengthElement = targetRow.select("td").get(7);
            String lengthText = lengthElement.text().replace(" B", "").trim();

            int bojLength;
            try {
                bojLength = Integer.parseInt(lengthText);
            } catch (NumberFormatException e) {
                log.warn("코드 길이 파싱 실패: {}", lengthText);
                return;
            }

            int submittedLength = 0;
            if (code != null) {
                submittedLength = code.getBytes(StandardCharsets.UTF_8).length;
            } else {
                log.warn("제출된 코드가 null입니다. 길이 검증을 건너뛰거나 실패 처리합니다. (ID: {})", normalizedSubmitId);
                // 코드가 없으면 길이 비교 불가.
                // 하지만 500 에러보다는 "검증 실패" 예외를 던지는 게 나음.
                // 일단은 길이 0으로 처리해서 diff가 발생하게 둠 (bojLength가 0이 아니면 실패할 것임)
            }

            int diff = Math.abs(bojLength - submittedLength);

            System.out.println("🔍 Validation Check: BOJ(" + bojLength + "B) vs Request(" + submittedLength
                    + "B) -> Diff: " + diff + "B");

            if (diff > LENGTH_TOLERANCE) {
                System.out.println("❌ Validation Failed: 코드 길이 불일치! (허용오차: " + LENGTH_TOLERANCE + "B)");
                // 코드가 null인 경우 메시지를 다르게
                if (code == null) {
                    throw new BusinessException(ErrorCode.CODE_LENGTH_MISMATCH,
                            "소스 코드를 가져오지 못해 검증에 실패했습니다. (확장 프로그램을 확인해주세요)");
                }
                throw new BusinessException(ErrorCode.CODE_LENGTH_MISMATCH,
                        "코드 길이 불일치! (제출: " + submittedLength + "B, 실제: " + bojLength + "B)");
            }

            System.out.println("✅ Validation Passed! (User: " + userId + ", Problem: " + problemId + ")");
            log.info("Submission Validated! ID: {}, Diff: {}B", normalizedSubmitId, diff);

        } catch (IOException e) {
            log.error("BOJ Validation Failed (Network Error)", e);
            // 네트워크 에러 시에는 막아야 할까 통과시켜야 할까?
            // "일시적 오류"라고 알려주고 재시도 유도하는 게 안전함
            throw new BusinessException(ErrorCode.BAEKJOON_CONNECTION_ERROR);
        }
    }

    private List<String> summarizeRows(Elements rows) {
        List<String> samples = new ArrayList<>();
        int limit = Math.min(10, rows.size());
        for (int i = 0; i < limit; i++) {
            Element row = rows.get(i);
            Elements cols = row.select("td");
            if (cols.isEmpty()) {
                continue;
            }

            String sid = colText(cols, 0);
            String result = colText(cols, 3);
            String user = colText(cols, 1);
            String prob = colText(cols, 2);
            samples.add(String.format("id=%s,user=%s,problem=%s,result=%s", sid, user, prob, result));
        }
        return samples;
    }

    private String colText(Elements cols, int idx) {
        if (idx < 0 || idx >= cols.size()) {
            return "";
        }
        String text = cols.get(idx).text();
        return text == null ? "" : text.trim();
    }

    private Optional<SubmissionSnapshot> findInGlobalStatus(String submitId) {
        String top = null;

        for (int page = 0; page < DEBUG_GLOBAL_SCAN_PAGES; page++) {
            String pageUrl = top == null ? BOJ_GLOBAL_STATUS_URL : BOJ_GLOBAL_STATUS_URL + "?top=" + top;

            try {
                Document doc = Jsoup.connect(pageUrl)
                        .userAgent(
                                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                        .timeout(5000)
                        .get();

                Elements rows = doc.select("table#status-table tbody tr");
                if (rows.isEmpty()) {
                    return Optional.empty();
                }

                for (Element row : rows) {
                    Elements cols = row.select("td");
                    if (cols.isEmpty()) {
                        continue;
                    }

                    String rowSubmitId = colText(cols, 0);
                    if (!submitId.equals(rowSubmitId)) {
                        continue;
                    }

                    SubmissionSnapshot snapshot = new SubmissionSnapshot(
                            rowSubmitId,
                            colText(cols, 1),
                            colText(cols, 2),
                            colText(cols, 3),
                            pageUrl);
                    return Optional.of(snapshot);
                }

                String lastSubmitId = colText(rows.get(rows.size() - 1).select("td"), 0);
                if (lastSubmitId.isBlank() || lastSubmitId.equals(top)) {
                    return Optional.empty();
                }
                top = lastSubmitId;

            } catch (IOException e) {
                log.debug("Global status debug scan failed: pageUrl={}", pageUrl, e);
                return Optional.empty();
            }
        }

        return Optional.empty();
    }

    private String buildMismatchMessage(String expectedProblemId, String expectedUserId, SubmissionSnapshot snapshot) {
        boolean userMismatch = !expectedUserId.equals(snapshot.userId);
        boolean problemMismatch = !expectedProblemId.equals(snapshot.problemId);

        if (userMismatch && problemMismatch) {
            return String.format(
                    "실제 제출 유저와 문제 번호가 다릅니다. expected(user=%s,problem=%s), actual(user=%s,problem=%s,result=%s)",
                    expectedUserId, expectedProblemId, snapshot.userId, snapshot.problemId, snapshot.result);
        }

        if (userMismatch) {
            return String.format(
                    "실제 제출 유저가 다릅니다. expected(user=%s), actual(user=%s,problem=%s,result=%s)",
                    expectedUserId, snapshot.userId, snapshot.problemId, snapshot.result);
        }

        if (problemMismatch) {
            return String.format(
                    "실제 제출 문제 번호가 다릅니다. expected(problem=%s), actual(user=%s,problem=%s,result=%s)",
                    expectedProblemId, snapshot.userId, snapshot.problemId, snapshot.result);
        }

        return String.format(
                "제출 ID는 존재하지만 조회 조건과 다릅니다. expected(user=%s,problem=%s), actual(user=%s,problem=%s,result=%s)",
                expectedUserId, expectedProblemId, snapshot.userId, snapshot.problemId, snapshot.result);
    }

    private static class SubmissionSnapshot {
        private final String submitId;
        private final String userId;
        private final String problemId;
        private final String result;
        private final String pageUrl;

        private SubmissionSnapshot(String submitId, String userId, String problemId, String result, String pageUrl) {
            this.submitId = submitId;
            this.userId = userId;
            this.problemId = problemId;
            this.result = result;
            this.pageUrl = pageUrl;
        }
    }
}
