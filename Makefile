COMPOSE_FILE		    := ./docker/docker-compose.yml
DEV_COMPOSE_FILE	    := ./docker/docker-compose.dev.yml
PROD_COMPOSE_FILE	    := ./docker/docker-compose.prod.yml
COTURN_COMPOSE_FILE	    := ./docker/coturn/docker-compose.yml
LIVEKIT_COMPOSE_FILE	:= ./docker/livekit/docker-compose.yaml

# ===========================================
# Development Commands (Localhost)
# ===========================================

all:
	DOCKER_BUILDKIT=1 docker compose -f $(DEV_COMPOSE_FILE) up --build -d

dev-up:
	DOCKER_BUILDKIT=1 docker compose -f $(DEV_COMPOSE_FILE) up --build -d

dev-down:
	docker compose -f $(DEV_COMPOSE_FILE) down

dev-logs:
	docker compose -f $(DEV_COMPOSE_FILE) logs -f

dev-ps:
	docker compose -f $(DEV_COMPOSE_FILE) ps

# ===========================================
# Redis Commands (Standalone)
# ===========================================

redis-up:
	DOCKER_BUILDKIT=1 docker compose -f $(COMPOSE_FILE) up --build -d

redis-down:
	docker compose -f $(COMPOSE_FILE) down

# ===========================================
# Production Commands
# ===========================================

prod-up:
	DOCKER_BUILDKIT=1 docker compose -f $(PROD_COMPOSE_FILE) up --build -d

prod-down:
	docker compose -f $(PROD_COMPOSE_FILE) down

prod-logs:
	docker compose -f $(PROD_COMPOSE_FILE) logs -f

prod-restart:
	docker compose -f $(PROD_COMPOSE_FILE) restart

prod-build:
	DOCKER_BUILDKIT=1 docker compose -f $(PROD_COMPOSE_FILE) build --no-cache

prod-ps:
	docker compose -f $(PROD_COMPOSE_FILE) ps

# ===========================================
# Coturn Commands
# ===========================================

# Coturn commands
coturn-up:
	DOCKER_BUILDKIT=1 docker compose -f $(COTURN_COMPOSE_FILE) up -d

coturn-down:
	docker compose -f $(COTURN_COMPOSE_FILE) down

coturn-logs:
	docker compose -f $(COTURN_COMPOSE_FILE) logs -f

# Livekit commands
livekit-up:
	DOCKER_BUILDKIT=1 docker compose -f $(LIVEKIT_COMPOSE_FILE) up -d

livekit-down:
	docker compose -f $(LIVEKIT_COMPOSE_FILE) down

livekit-logs:
	docker compose -f $(LIVEKIT_COMPOSE_FILE) logs -f

# WebRTC Infrastructure (Coturn + LiveKit)
webrtc-up: coturn-up livekit-up

webrtc-down: livekit-down coturn-down

# ===========================================
# Cleanup Commands
# ===========================================

clean:
	docker compose -f $(DEV_COMPOSE_FILE) down
	docker compose -f $(COMPOSE_FILE) down
	docker compose -f $(COTURN_COMPOSE_FILE) down
	docker compose -f $(LIVEKIT_COMPOSE_FILE) down
	-docker rm -f peekle-chroma-dev peekle-ai-server-dev

clean-prod:
	docker compose -f $(PROD_COMPOSE_FILE) down

clean-all:
	docker compose -f $(DEV_COMPOSE_FILE) down
	docker compose -f $(COMPOSE_FILE) down
	docker compose -f $(PROD_COMPOSE_FILE) down
	docker compose -f $(COTURN_COMPOSE_FILE) down
	docker compose -f $(LIVEKIT_COMPOSE_FILE) down

fclean:
	docker compose -f $(DEV_COMPOSE_FILE) down --rmi all --volumes --remove-orphans
	docker compose -f $(COMPOSE_FILE) down --rmi all --volumes --remove-orphans
	docker compose -f $(PROD_COMPOSE_FILE) down --rmi all --volumes --remove-orphans
	docker compose -f $(COTURN_COMPOSE_FILE) down --rmi all --volumes --remove-orphans
	docker compose -f $(LIVEKIT_COMPOSE_FILE) down --rmi all --volumes --remove-orphans
	docker system prune --all --volumes --force

re:
	make fclean
	make all

re-prod:
	make clean-prod
	make prod-up

# ===========================================
# Help
# ===========================================

help:
	@echo "Peekle Docker Commands"
	@echo ""
	@echo "Development (Localhost):"
	@echo "  make all / dev-up   - Start development containers (Nginx, FE, BE, Redis, LiveKit)"
	@echo "  make dev-down       - Stop development containers"
	@echo "  make dev-logs       - View development logs"
	@echo "  make dev-ps         - Show development container status"
	@echo ""
	@echo "Redis Standalone:"
	@echo "  make redis-up       - Start only Redis and Redis Commander"
	@echo "  make redis-down     - Stop Redis standalone"
	@echo ""
	@echo "Production (i14a408.p.ssafy.io):"
	@echo "  make prod-up        - Start production containers"
	@echo "  make prod-down      - Stop production containers"
	@echo "  make prod-logs      - View production logs"
	@echo "  make prod-restart   - Restart production containers"
	@echo "  make prod-ps        - Show production container status"
	@echo ""
	@echo "WebRTC Infrastructure (Coturn + LiveKit):"
	@echo "  make webrtc-up      - Start Coturn and LiveKit"
	@echo "  make webrtc-down    - Stop Coturn and LiveKit"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean          - Stop all dev containers"
	@echo "  make clean-prod     - Stop all prod containers"
	@echo "  make clean-all      - Stop all containers"
	@echo "  make fclean         - Remove all containers, images, volumes"
	@echo "  make re             - Rebuild dev environment"
	@echo "  make re-prod        - Rebuild prod environment"

.PHONY: all dev-up dev-down dev-logs dev-ps \
        redis-up redis-down \
        prod-up prod-down prod-logs prod-restart prod-build prod-ps \
        coturn-up coturn-down coturn-logs \
        livekit-up livekit-down livekit-logs \
        webrtc-up webrtc-down \
        clean clean-prod clean-all fclean re re-prod help