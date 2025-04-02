build:
	docker compose -f docker-compose.yml up -d
	@echo "Waiting for container si-dev-app-1 to be running..."
	@until [ "$$(docker inspect -f '{{.State.Running}}' si-dev-app-1 2>/dev/null)" = "true" ]; do \
		echo "Container not yet running. Waiting..."; \
		sleep 1; \
	done
	@echo "Container si-dev-app-1 is running."

	@echo "Running command inside container (with retries)..."
	@retry=0; \
	until docker exec -it si-dev-app-1 python -m backend.app.app --env debug || [ $$retry -ge 3 ]; do \
		echo "Command failed. Retrying in 2 seconds..."; \
		sleep 2; \
		retry=$$((retry+1)); \
	done

kill:
	docker compose -f docker-compose.yml down