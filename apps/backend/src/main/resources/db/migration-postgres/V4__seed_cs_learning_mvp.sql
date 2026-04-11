-- CS Learning MVP seed data
-- Scope:
-- 1) Domains: 9
-- 2) Tracks: 1 per domain (total 9)
-- 3) Stages: 10 per track (total 90)

-- 1) Domains
INSERT INTO cs_domains (id, name)
VALUES
    (1, '요구사항·분석·화면설계'),
    (2, '데이터 입출력·SQL 기초'),
    (3, '통합·인터페이스 구현'),
    (4, '프로그래밍 기본'),
    (5, 'C 언어'),
    (6, '자바'),
    (7, '파이썬'),
    (8, '서버·보안·테스트'),
    (9, '운영체제·네트워크·인프라·패키징')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name;

-- 2) Tracks (track_no=1 per domain)
INSERT INTO cs_domain_tracks (domain_id, track_no, name)
VALUES
    (1, 1, '요구사항 확인'),
    (2, 1, '데이터 입출력·SQL'),
    (3, 1, '통합·인터페이스'),
    (4, 1, '프로그래밍 기본'),
    (5, 1, 'C 언어'),
    (6, 1, '자바'),
    (7, 1, '파이썬'),
    (8, 1, '서버·보안·테스트'),
    (9, 1, '운영체제·네트워크·인프라·패키징')
ON CONFLICT (domain_id, track_no) DO UPDATE
SET name = EXCLUDED.name;

-- 3) Stages (1~10 per track)
INSERT INTO cs_stages (track_id, stage_no)
SELECT t.id, s.stage_no
FROM cs_domain_tracks t
CROSS JOIN generate_series(1, 10) AS s(stage_no)
WHERE t.track_no = 1
  AND t.domain_id BETWEEN 1 AND 9
ON CONFLICT (track_id, stage_no) DO NOTHING;

