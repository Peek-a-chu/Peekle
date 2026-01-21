package com.peekle.global.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.util.TestPropertyValues;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import javax.sql.DataSource;
import java.sql.ResultSet;
import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
        "spring.flyway.enabled=true", // Flyway 활성화
        "spring.jpa.hibernate.ddl-auto=validate" // Flyway 검증 모드
})
@Testcontainers // Testcontainers 활성화
class FlywayMigrationTest {

    // MySQL 8.0 컨테이너 실행
    @Container
    static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("peekledb");

    // 컨테이너 접속 정보를 Spring Boot 프로퍼티에 동적 주입
    @DynamicPropertySource
    static void registerMysqlProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", mysql::getJdbcUrl);
        registry.add("spring.datasource.username", mysql::getUsername);
        registry.add("spring.datasource.password", mysql::getPassword);
        registry.add("spring.datasource.driver-class-name", mysql::getDriverClassName);
    }

    @Autowired
    private DataSource dataSource;

    @Test
    @DisplayName("실제 MySQL 환경에서 Flyway 마이그레이션이 정상적으로 수행되어야 한다")
    void flywayMigrationTest() throws Exception {
        // given
        // Context 로딩 시 @DynamicPropertySource로 주입된 MySQL에 Flyway 마이그레이션 수행됨

        // then
        // 1. 테이블 존재 여부 확인
        Set<String> tables = new HashSet<>();
        try (ResultSet rs = dataSource.getConnection().getMetaData()
                .getTables(null, null, "%", new String[]{"TABLE"})) {
            while (rs.next()) {
                tables.add(rs.getString("TABLE_NAME").toLowerCase());
            }
        }

        // V1__init.sql에 정의된 테이블들이 존재하는지 검증
        assertThat(tables).contains("user", "problem", "submission_log");
        
        // flyway_schema_history 테이블도 존재해야 함
        assertThat(tables).contains("flyway_schema_history");
    }
}
