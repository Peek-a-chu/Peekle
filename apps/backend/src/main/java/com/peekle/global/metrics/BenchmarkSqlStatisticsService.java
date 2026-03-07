package com.peekle.global.metrics;

import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

@Service
@Profile("benchmark")
public class BenchmarkSqlStatisticsService {

    private final Statistics statistics;

    public BenchmarkSqlStatisticsService(EntityManagerFactory entityManagerFactory) {
        SessionFactory sessionFactory = entityManagerFactory.unwrap(SessionFactory.class);
        this.statistics = sessionFactory.getStatistics();
        this.statistics.setStatisticsEnabled(true);
    }

    public long getPrepareStatementCount() {
        return statistics.getPrepareStatementCount();
    }
}
