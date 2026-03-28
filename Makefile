.PHONY: server web dev stop test create-project

# --- Configuration ---
SERVER_PORT ?= 9527
WEB_PORT ?= 3014
DATABASE_URL ?= sqlite+aiosqlite:///$(CURDIR)/server/codeguard.db

# --- Development ---

server: ## Start the API server (SQLite, port 9527)
	@echo "[CodeGuard] Starting server on http://localhost:$(SERVER_PORT) ..."
	cd server && DATABASE_URL="$(DATABASE_URL)" \
		uvicorn app.main:create_app --factory --host 127.0.0.1 --port $(SERVER_PORT) --reload

web: ## Start the web UI dev server (port 3014)
	@echo "[CodeGuard] Starting web UI on http://localhost:$(WEB_PORT) ..."
	cd web && npx vite --port $(WEB_PORT) --strictPort --config vite.config.ts

dev: ## Start both server and web in background
	@echo "[CodeGuard] Starting server + web ..."
	@cd server && DATABASE_URL="$(DATABASE_URL)" \
		uvicorn app.main:create_app --factory --host 127.0.0.1 --port $(SERVER_PORT) --reload &
	@sleep 2
	@cd web && npx vite --port $(WEB_PORT) --strictPort --config vite.config.ts &
	@sleep 2
	@echo ""
	@echo "  Server API:  http://localhost:$(SERVER_PORT)"
	@echo "  Web UI:      http://localhost:$(WEB_PORT)"
	@echo ""
	@echo "  Run 'make stop' to stop all services."

stop: ## Stop all running services
	@-pkill -f "uvicorn app.main:create_app" 2>/dev/null
	@-pkill -f "vite --port" 2>/dev/null
	@echo "[CodeGuard] All services stopped."

# --- Testing ---

test: ## Run all tests (server + web)
	cd server && python -m pytest tests/ -v
	cd web && npx vitest run

test-server: ## Run server tests only
	cd server && python -m pytest tests/ -v

test-web: ## Run web tests only
	cd web && npx vitest run

# --- Utilities ---

create-project: ## Create a project (usage: make create-project NAME=my-project)
	@curl -s -X POST http://localhost:$(SERVER_PORT)/api/v1/projects \
		-H "Content-Type: application/json" \
		-d '{"name": "$(NAME)"}' | python3 -m json.tool

# --- Docker ---

up: ## Start all services with Docker Compose
	docker compose up -d

down: ## Stop Docker Compose services
	docker compose down

# --- Help ---

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
