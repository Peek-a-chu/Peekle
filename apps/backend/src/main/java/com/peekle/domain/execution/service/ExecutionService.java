package com.peekle.domain.execution.service;

import com.peekle.domain.execution.dto.request.ExecutionRequest;
import com.peekle.domain.execution.dto.response.ExecutionResponse;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.zip.Deflater;
import java.util.zip.DeflaterOutputStream;
import java.util.zip.GZIPInputStream;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExecutionService {

    private static final String TIO_RUN_URL = "https://tio.run/cgi-bin/run/api/";

    public ExecutionResponse execute(ExecutionRequest request) {
        try {
            byte[] payload = buildPayload(request);
            byte[] compressedPayload = compressDeflateRaw(payload);

            HttpClient client = HttpClient.newHttpClient();
            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(TIO_RUN_URL))
                    .POST(HttpRequest.BodyPublishers.ofByteArray(compressedPayload))
                    .build();

            HttpResponse<InputStream> response = client.send(httpRequest, HttpResponse.BodyHandlers.ofInputStream());

            if (response.statusCode() != 200) {
                log.error("TIO run api failed with status {}", response.statusCode());
                throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
            }

            try (GZIPInputStream gzipInputStream = new GZIPInputStream(response.body())) {
                byte[] uncompressed = gzipInputStream.readAllBytes();
                String resultStr = new String(uncompressed, StandardCharsets.UTF_8);
                return parseTioResponse(resultStr);
            }
        } catch (Exception e) {
            log.error("Execution failed", e);
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    private byte[] buildPayload(ExecutionRequest request) throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        // Language
        String lang = request.getLanguage();
        // Convert language names to match TIO standard identifiers
        if ("python".equals(lang) || "python3".equals(lang))
            lang = "python3";
        else if ("java".equals(lang))
            lang = "java-openjdk";
        else if ("cpp".equals(lang))
            lang = "cpp-gcc";

        baos.write(("Vlang\0" + "1\0" + lang + "\0").getBytes(StandardCharsets.UTF_8));

        // Code
        String code = request.getCode() == null ? "" : request.getCode();
        byte[] codeBytes = code.getBytes(StandardCharsets.UTF_8);
        baos.write(("F.code.tio\0" + codeBytes.length + "\0").getBytes(StandardCharsets.UTF_8));
        baos.write(codeBytes);

        // Input
        String input = request.getInput() == null ? "" : request.getInput();
        byte[] inputBytes = input.getBytes(StandardCharsets.UTF_8);
        baos.write(("F.input.tio\0" + inputBytes.length + "\0").getBytes(StandardCharsets.UTF_8));
        baos.write(inputBytes);

        // Args (empty)
        baos.write(("Vargs\0" + "0\0").getBytes(StandardCharsets.UTF_8));

        // R command
        baos.write("R".getBytes(StandardCharsets.UTF_8));

        return baos.toByteArray();
    }

    private byte[] compressDeflateRaw(byte[] data) throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        // nowrap = true for raw deflate
        Deflater deflater = new Deflater(Deflater.BEST_COMPRESSION, true);
        try (DeflaterOutputStream dos = new DeflaterOutputStream(baos, deflater)) {
            dos.write(data);
        }
        return baos.toByteArray();
    }

    private ExecutionResponse parseTioResponse(String rawResponse) {
        if (rawResponse == null || rawResponse.length() < 16) {
            return ExecutionResponse.builder()
                    .stdout("")
                    .stderr(rawResponse)
                    .exitCode(-1)
                    .executionTime(0L)
                    .build();
        }

        String token = rawResponse.substring(0, 16);
        String[] parts = rawResponse.substring(16).split(token);

        String stdout = parts.length > 0 ? parts[0] : "";
        String stderrAndStats = parts.length > 1 ? parts[1] : "";

        // Extract error lines (everything before "Real time: ")
        // Wait, TIO returns stderr before stats.
        String[] lines = stderrAndStats.split("\n");
        StringBuilder stderrBuilder = new StringBuilder();
        Integer exitCode = 0;
        Long executionTimeSeconds = 0L;

        for (String line : lines) {
            if (line.startsWith("Real time: ")) {
                try {
                    String secStr = line.replace("Real time: ", "").replace(" s", "").trim();
                    executionTimeSeconds = (long) (Double.parseDouble(secStr) * 1000);
                } catch (Exception ignored) {
                }
            } else if (line.startsWith("Exit code: ")) {
                try {
                    exitCode = Integer.parseInt(line.replace("Exit code: ", "").trim());
                } catch (Exception ignored) {
                }
            } else if (!line.trim().isEmpty() && !line.startsWith("User time: ") && !line.startsWith("Sys. time: ")
                    && !line.startsWith("CPU share: ") && !line.startsWith("Exit code: ")) {
                stderrBuilder.append(line).append("\n");
            }
        }

        return ExecutionResponse.builder()
                .stdout(stdout)
                .stderr(stderrBuilder.toString().trim())
                .exitCode(exitCode)
                .executionTime(executionTimeSeconds)
                .build();
    }
}
