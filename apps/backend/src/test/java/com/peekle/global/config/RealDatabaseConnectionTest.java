package com.peekle.global.config;

import io.github.cdimascio.dotenv.Dotenv;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.test.context.ActiveProfiles;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.SQLException;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("dev")
class RealDatabaseConnectionTest {

    @Autowired
    private DataSource dataSource;

    @Autowired
    private org.springframework.core.env.Environment environment;

    @BeforeAll
    static void loadEnv() {
        try {
            // Load .env from project root or apps/backend location
            Dotenv dotenv = Dotenv.configure()
                    .ignoreIfMissing()
                    .directory("./") // Look in current directory (apps/backend in gradle test context)
                    .load();

            dotenv.entries().forEach(entry -> {
                System.setProperty(entry.getKey(), entry.getValue());
                System.out.println("Set property: " + entry.getKey() + " = " + entry.getValue());
            });
            
            System.out.println("Loaded .env variables for test context. Count: " + dotenv.entries().size());
        } catch (Exception e) {
            System.out.println("Warning: Could not load .env file. Real DB tests might fail if variables are missing.");
        }
    }

    @Test
    @DisplayName("Verify connection to external MySQL database")
    void testConnection() throws SQLException {
        try (Connection connection = dataSource.getConnection()) {
            assertThat(connection).isNotNull();
            assertThat(connection.isValid(1)).isTrue();

            DatabaseMetaData metaData = connection.getMetaData();
            
            // Ensure we are NOT using H2
            assertThat(metaData.getDatabaseProductName()).isNotEqualTo("H2");
            assertThat(metaData.getDatabaseProductName()).containsIgnoringCase("MySQL");
        }
    }
}
