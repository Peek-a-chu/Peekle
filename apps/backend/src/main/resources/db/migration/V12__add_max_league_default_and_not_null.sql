-- V12__add_max_league_default_and_not_null.sql
-- 1. 기존에 max_league가 NULL인 유저들의 값을 'STONE'으로 업데이트
UPDATE users SET max_league = 'STONE' WHERE max_league IS NULL;

-- 2. max_league 컬럼을 NOT NULL로 변경하고 기본값 설정 (MariaDB/MySQL)
ALTER TABLE users MODIFY COLUMN max_league VARCHAR(255) NOT NULL DEFAULT 'STONE';
