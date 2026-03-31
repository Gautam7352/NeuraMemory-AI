# NeuraMemory-AI Makefile
# Shortcuts for common Docker Compose and development commands

.PHONY: help build up down restart logs ps clean test dev dev-down prod-build prod-up prod-down dev-logs prod-logs shell-server shell-postgres backup

# Default target
.DEFAULT_GOAL := help

# Variables
COMPOSE_FILES := -f docker-compose.yml
DEV_COMPOSE_FILES := -f docker-compose.yml -f docker-compose.dev.yml

##@ General

help: ## Display this help message
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Production Deployment

prod-build: ## Build production images
	docker compose $(COMPOSE_FILES) build

prod-up: ## Start production services (detached)
	docker compose $(COMPOSE_FILES) up -d

prod-down: ## Stop production services
	docker compose $(COMPOSE_FILES) down

prod-restart: prod-down prod-up ## Restart production services

prod-logs: ## View production logs (follow)
	docker compose $(COMPOSE_FILES) logs -f

prod-ps: ## Show production service status
	docker compose $(COMPOSE_FILES) ps

##@ Development

dev: ## Start development environment with hot-reload
	docker compose $(DEV_COMPOSE_FILES) up --build

dev-build: ## Build development images
	docker compose $(DEV_COMPOSE_FILES) build

dev-up: ## Start development services (detached)
	docker compose $(DEV_COMPOSE_FILES) up -d

dev-down: ## Stop development services
	docker compose $(DEV_COMPOSE_FILES) down

dev-restart: dev-down dev-up ## Restart development services

dev-logs: ## View development logs (follow)
	docker compose $(DEV_COMPOSE_FILES) logs -f

dev-logs-server: ## View server logs only
	docker compose $(DEV_COMPOSE_FILES) logs -f server

dev-logs-client: ## View client logs only
	docker compose $(DEV_COMPOSE_FILES) logs -f client

##@ Database Management

db-start: ## Start only PostgreSQL and Qdrant
	docker compose $(COMPOSE_FILES) up -d postgres qdrant

db-stop: ## Stop PostgreSQL and Qdrant
	docker compose $(COMPOSE_FILES) stop postgres qdrant

db-logs: ## View database logs
	docker compose $(COMPOSE_FILES) logs -f postgres qdrant

psql-shell: ## Open PostgreSQL shell
	docker compose $(COMPOSE_FILES) exec postgres psql -U neuramemory

qdrant-health: ## Check Qdrant health
	@curl -s http://localhost:6333/health | jq '.'

##@ Testing & Quality

test: ## Run API tests (requires running server)
	cd server && ./test-routes.sh

test-verbose: ## Run API tests with verbose output
	cd server && VERBOSE=true ./test-routes.sh

lint-server: ## Run ESLint on server code
	docker compose $(DEV_COMPOSE_FILES) exec server npm run lint

format-server: ## Format server code with Prettier
	docker compose $(DEV_COMPOSE_FILES) exec server npm run format

build-server: ## Build TypeScript (check for errors)
	docker compose $(DEV_COMPOSE_FILES) exec server npm run build

##@ Utilities

shell-server: ## Open shell in server container
	docker compose $(COMPOSE_FILES) exec server sh

shell-postgres: ## Open shell in PostgreSQL container
	docker compose $(COMPOSE_FILES) exec postgres sh

shell-qdrant: ## Open shell in Qdrant container
	docker compose $(COMPOSE_FILES) exec qdrant sh

ps: ## Show all running containers
	docker compose $(COMPOSE_FILES) ps

stats: ## Show container resource usage
	docker stats

##@ Cleanup

clean: ## Stop and remove all containers
	docker compose $(COMPOSE_FILES) down

clean-volumes: ## Stop and remove containers + volumes (⚠️  deletes data)
	@echo "⚠️  WARNING: This will delete all data in PostgreSQL and Qdrant!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker compose $(COMPOSE_FILES) down -v; \
	fi

clean-all: ## Remove containers, volumes, and images (⚠️  complete reset)
	@echo "⚠️  WARNING: This will delete everything and rebuild from scratch!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker compose $(COMPOSE_FILES) down -v --rmi all; \
		docker system prune -f; \
	fi

prune: ## Remove unused Docker resources
	docker system prune -f

##@ Backup & Restore

backup-postgres: ## Backup PostgreSQL to backups/ directory
	@mkdir -p backups
	@echo "Creating PostgreSQL backup..."
	@docker compose $(COMPOSE_FILES) exec -T postgres pg_dump -U neuramemory neuramemory > backups/postgres_$$(date +%Y%m%d_%H%M%S).sql
	@echo "✓ Backup complete: backups/postgres_$$(date +%Y%m%d_%H%M%S).sql"

restore-postgres: ## Restore PostgreSQL from latest backup
	@LATEST=$$(ls -t backups/postgres_*.sql 2>/dev/null | head -1); \
	if [ -z "$$LATEST" ]; then \
		echo "❌ No backup files found in backups/"; \
		exit 1; \
	fi; \
	echo "Restoring from $$LATEST..."; \
	docker compose $(COMPOSE_FILES) exec -T postgres psql -U neuramemory neuramemory < $$LATEST; \
	echo "✓ Restore complete"

##@ Quick Actions

up: prod-up ## Alias for prod-up

down: prod-down ## Alias for prod-down

restart: prod-restart ## Alias for prod-restart

logs: prod-logs ## Alias for prod-logs

rebuild: ## Rebuild and restart production services
	docker compose $(COMPOSE_FILES) up -d --build

dev-rebuild: ## Rebuild and restart development services
	docker compose $(DEV_COMPOSE_FILES) up -d --build

##@ Information

info: ## Show project information
	@echo "\n📦 NeuraMemory-AI Docker Environment\n"
	@echo "Services:"
	@docker compose $(COMPOSE_FILES) ps
	@echo "\nVolumes:"
	@docker volume ls | grep neuramemory || echo "No volumes found"
	@echo "\nNetworks:"
	@docker network ls | grep neuramemory || echo "No networks found"
	@echo "\nImages:"
	@docker images | grep neuramemory || echo "No images found"

endpoints: ## Show service endpoints
	@echo "\n🌐 Service Endpoints:\n"
	@echo "  Frontend:     http://localhost:5173"
	@echo "  API:          http://localhost:3000"
	@echo "  API Docs:     http://localhost:3000/api/v1"
	@echo "  PostgreSQL:   postgresql://localhost:5432"
	@echo "  Qdrant:       http://localhost:6333"
	@echo "  Qdrant UI:    http://localhost:6333/dashboard"
	@echo ""

check-env: ## Verify required environment variables
	@echo "Checking environment configuration...\n"
	@if [ ! -f server/.env ]; then \
		echo "❌ server/.env not found"; \
		echo "   Run: cp server/.env.example server/.env"; \
		exit 1; \
	fi
	@echo "✓ server/.env exists"
	@cd server && node -e "require('dotenv').config(); \
		const required = ['DATABASE_URL', 'QDRANT_URL', 'OPENROUTER_API_KEY', 'JWT_SECRET']; \
		let missing = []; \
		required.forEach(key => { if (!process.env[key]) missing.push(key); }); \
		if (missing.length > 0) { \
			console.log('❌ Missing required variables:', missing.join(', ')); \
			process.exit(1); \
		} else { \
			console.log('✓ All required variables present'); \
		}"
