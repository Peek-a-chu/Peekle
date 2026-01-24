package com.peekle.domain.submission.service;

import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;

@Slf4j
@Component
public class SubmissionValidator {

    private static final String BOJ_STATUS_URL = "https://www.acmicpc.net/status?problem_id=%s&user_id=%s"; // 모든 결과 조회
    private static final int LENGTH_TOLERANCE = 10; // 허용 오차 (Bytes)

    public void validateSubmission(String problemId, String userId, String submitId, String code) {
        String url = String.format(BOJ_STATUS_URL, problemId, userId);
        
        try {
            Document doc = Jsoup.connect(url)
                    .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                    .get();

            Element targetRow = null;
            Elements rows = doc.select("table#status-table tbody tr");
            
            for (Element row : rows) {
                String rowSubmitId = row.select("td").first().text();
                if (rowSubmitId.equals(submitId)) {
                    targetRow = row;
                    break;
                }
            }
            
            if (targetRow == null) {
                System.out.println("❌ Validation Failed: 제출 기록 없음 (Problem: " + problemId + ", User: " + userId + ")");
                throw new BusinessException(ErrorCode.BAEKJOON_SUBMISSION_NOT_FOUND, "백준 채점 현황에서 해당 제출 기록을 찾을 수 없습니다. (ID: " + submitId + ")");
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
            
            int submittedLength = code.getBytes(StandardCharsets.UTF_8).length;
            int diff = Math.abs(bojLength - submittedLength);
            
            System.out.println("🔍 Validation Check: BOJ(" + bojLength + "B) vs Request(" + submittedLength + "B) -> Diff: " + diff + "B");

            if (diff > LENGTH_TOLERANCE) {
                System.out.println("❌ Validation Failed: 코드 길이 불일치! (허용오차: " + LENGTH_TOLERANCE + "B)");
                throw new BusinessException(ErrorCode.CODE_LENGTH_MISMATCH, "코드 길이 불일치! (제출: " + submittedLength + "B, 실제: " + bojLength + "B)");
            }
            
            System.out.println("✅ Validation Passed! (User: " + userId + ", Problem: " + problemId + ")");
            log.info("Submission Validated! ID: {}, Diff: {}B", submitId, diff);

        } catch (IOException e) {
            log.error("BOJ Validation Failed (Network Error)", e);
            // 네트워크 에러 시에는 막아야 할까 통과시켜야 할까?
            // "일시적 오류"라고 알려주고 재시도 유도하는 게 안전함
            throw new BusinessException(ErrorCode.BAEKJOON_CONNECTION_ERROR);
        }
    }
}
