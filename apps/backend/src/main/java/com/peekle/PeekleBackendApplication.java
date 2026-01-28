package com.peekle;

import io.github.cdimascio.dotenv.Dotenv;

import java.nio.file.Paths;
import java.nio.file.Files;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.nio.file.Files;
import java.nio.file.Paths;

@EnableAsync
@EnableScheduling
@EnableJpaAuditing
@SpringBootApplication
public class PeekleBackendApplication {

    public static void main(String[] args) {
        // 1. 환경변수 또는 시스템 프로퍼티에서 우선 탐색, 없으면 기본 경로들 확인
        String customDir = System.getProperty("dotenv.dir", System.getenv("DOTENV_DIR"));
        // IPv4 강제 사용 (IPv6 NAT64 연결 문제 해결)
        System.setProperty("java.net.preferIPv4Stack", "true");

        // Load .env file (Try current directory first, then assumes running from root
        // -> apps/backend)
        String[] searchPaths = { "./apps/backend", "\\\\wsl.localhost\\Ubuntu\\home\\ssafy\\peekle\\apps\\backend" };
        boolean loaded = false;

        if (customDir != null) {
            loadDotenv(customDir);
        } else {
            // 기본 탐색 순서: 현재 디렉토리(Docker/IDE 실행용) -> 모노레포 하위 디렉토리
            if (!loadDotenv("./apps/backend")) {
                loadDotenv(".");
            }
        }

        SpringApplication.run(PeekleBackendApplication.class, args);
    }

    /**
     * 지정된 디렉토리에서 .env 파일을 로드하여 시스템 프로퍼티로 설정합니다.
     * @return 로드 성공 여부
     */
    private static boolean loadDotenv(String directory) {
        try {
            // .env 파일 존재 여부 명시적 확인
            if (!Files.exists(Paths.get(directory, ".env"))) {
                return false;
            }

            Dotenv dotenv = Dotenv.configure()
                    .directory(directory)
                    .ignoreIfMissing()
                    .load();

            if (dotenv != null && !dotenv.entries().isEmpty()) {
                dotenv.entries().forEach(entry -> System.setProperty(entry.getKey(), entry.getValue()));
                return true;
            }
        } catch (Exception e) {
            // 로딩 실패 시 다음 경로 탐색을 위해 false 반환
        }
        return false;
    }

}