COMPOSE_FILE		    := ./docker/docker-compose.yml
COTURN_COMPOSE_FILE	    := ./docker/coturn/docker-compose.yml
OPENVIDU_COMPOSE_FILE	:= ./docker/openvidu/docker-compose.yml

all:
	DOCKER_BUILDKIT=1 sudo docker compose -f $(COMPOSE_FILE) up --build -d

# Coturn commands
coturn-up:
	DOCKER_BUILDKIT=1 sudo docker compose -f $(COTURN_COMPOSE_FILE) up -d

coturn-down:
	sudo docker compose -f $(COTURN_COMPOSE_FILE) down

coturn-logs:
	sudo docker compose -f $(COTURN_COMPOSE_FILE) logs -f

# OpenVidu commands
openvidu-up:
	DOCKER_BUILDKIT=1 sudo docker compose -f $(OPENVIDU_COMPOSE_FILE) up -d

openvidu-down:
	sudo docker compose -f $(OPENVIDU_COMPOSE_FILE) down

openvidu-logs:
	sudo docker compose -f $(OPENVIDU_COMPOSE_FILE) logs -f

# WebRTC Infrastructure (Coturn + OpenVidu)
webrtc-up: coturn-up openvidu-up

webrtc-down: openvidu-down coturn-down

clean:
	sudo docker compose -f $(COMPOSE_FILE) down
	sudo docker compose -f $(COTURN_COMPOSE_FILE) down
	sudo docker compose -f $(OPENVIDU_COMPOSE_FILE) down

fclean:
	sudo docker compose -f $(COMPOSE_FILE) down --rmi all --volumes --remove-orphans
	sudo docker compose -f $(COTURN_COMPOSE_FILE) down --rmi all --volumes --remove-orphans
	sudo docker compose -f $(OPENVIDU_COMPOSE_FILE) down --rmi all --volumes --remove-orphans
	sudo docker system prune --all --volumes --force
re:
	make fclean
	make all

.PHONY: all clean fclean re coturn-up coturn-down coturn-logs openvidu-up openvidu-down openvidu-logs webrtc-up webrtc-down