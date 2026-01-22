package com.peekle;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@EnableJpaAuditing
@SpringBootApplication
public class PeekleBackendApplication {

	public static void main(String[] args) {
        // Load .env file (Try current directory first, then assumes running from root -> apps/backend)
        String[] searchPaths = {"./apps/backend", "\\\\wsl.localhost\\Ubuntu\\home\\ssafy\\peekle\\apps\\backend"};
        boolean loaded = false;

        for (String path : searchPaths) {
            try {
                Dotenv dotenv = Dotenv.configure()
                        .directory(path)
                        .ignoreIfMissing()
                        .load();

                if (!dotenv.entries().isEmpty()) {
                    dotenv.entries().forEach(entry -> System.setProperty(entry.getKey(), entry.getValue()));
                    loaded = true;
                    break;
                }
            } catch (Exception e) {
                // Continue to next path
            }
        }

        if (!loaded) {
            System.err.println("CRITICAL ERROR: .env file not found in any search path. Database connection will likely fail.");
        }

		SpringApplication.run(PeekleBackendApplication.class, args);
	}

}
