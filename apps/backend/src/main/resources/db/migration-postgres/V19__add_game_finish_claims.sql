CREATE TABLE IF NOT EXISTS game_finish_claims (
    room_id BIGINT NOT NULL,
    claim_token VARCHAR(120) NOT NULL,
    trigger_name VARCHAR(40) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    completed_at TIMESTAMP(6),
    PRIMARY KEY (room_id),
    CONSTRAINT chk_game_finish_claims_status
        CHECK (status IN ('PROCESSING', 'COMPLETED'))
);

CREATE INDEX IF NOT EXISTS idx_game_finish_claims_status
    ON game_finish_claims (status, updated_at);
