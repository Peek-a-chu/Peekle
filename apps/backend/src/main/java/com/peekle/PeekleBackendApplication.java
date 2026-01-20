package com.peekle;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class PeekleBackendApplication {

	public static void main(String[] args) {
        // Load .env file
        Dotenv dotenv = Dotenv.configure()
            .ignoreIfMissing()
            .load();
        
        // Set environment variables to system properties so Spring can pick them up
        dotenv.entries().forEach(entry -> System.setProperty(entry.getKey(), entry.getValue()));

		SpringApplication.run(PeekleBackendApplication.class, args);
	}

}
