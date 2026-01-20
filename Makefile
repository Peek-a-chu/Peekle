COMPOSE_FILE		    := ./docker/docker-compose.yml

all:
	DOCKER_BUILDKIT=1 sudo docker compose -f $(COMPOSE_FILE) up --build -d

clean:
	sudo docker compose -f $(COMPOSE_FILE) down

fclean:
	sudo docker compose -f $(COMPOSE_FILE) down --rmi all --volumes --remove-orphans
	sudo docker system prune --all --volumes --force
re:
	make fclean
	make all

.PHONY: all clean fclean re