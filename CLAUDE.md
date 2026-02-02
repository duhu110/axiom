# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AXIOM** is a multi-agent AI platform built with LangChain/LangGraph. It's a full-stack monorepo with a FastAPI backend and Next.js frontend, designed for real-time AI agent interactions using Server-Sent Events (SSE).

## Architecture

### Directory Structure
```
axiom/
├── server/          # FastAPI backend (Python 3.11+)
├── web/             # Next.js 16 frontend (React 19, TypeScript)
├── storage/         # Docker services (PostgreSQL, Redis, MinIO)
└── docs/            # Project documentation
```

### Backend Architecture (server/)
- **FastAPI** with Scalar documentation at `/docs`
- **Three PostgreSQL databases**: `axiom_app` (main), `axiom_kb` (knowledge base), `axiom_agent` (agent state)
- **pgvector extension** for vector embeddings (RAG)
- **LangGraph** for multi-agent orchestration with PostgreSQL checkpoint
- **Redis** for Celery task queue and caching
- **MinIO** (rustfs) for file storage
- **SMS authentication** with mock provider support

Key modules:
- `src/agent/` - AI agent services using LangGraph
- `src/auth/` - JWT authentication with SMS verification
- `src/knowledgebase/` - Document RAG with async Celery workers
- `src/rustfs/` - MinIO client for file operations

### Frontend Architecture (web/)
- **Next.js 16 App Router** with React 19
- **Bun** package manager (not npm)
- **Zustand** for state management
- **Shadcn/ui** + **Radix UI** components
- **AI SDK** (`@ai-sdk/react`) for AI integration
- **Tailwind CSS v4**

Route structure:
- `app/(protected)/` - Authenticated pages
- `app/(public)/` - Public pages
- `app/api/` - API routes
- `features/` - Feature-based modules

## Development Commands

### Backend (Python with UV)
```bash
cd server

# Install dependencies (UV manages .venv automatically)
uv sync

# Development server
uv run uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload

# Run tests (pytest with async support)
uv run pytest

# Run specific test module
uv run pytest tests/test_auth.py

# Database migrations
uv run alembic upgrade head

# Create new migration
uv run alembic revision --autogenerate -m "description"

# Celery worker (for async knowledge base tasks)
celery -A knowledgebase.worker.celery_app worker -l info

# Flower (Celery monitoring)
celery -A knowledgebase.worker.celery_app flower
```

### Frontend (Bun)
```bash
cd web

# Install dependencies
bun install

# Development server
bun run dev

# Production build
bun run build

# Start production server
bun run start

# Lint
bun run lint
```

### Storage Services (Docker)
```bash
cd storage

# Start all services (PostgreSQL, Redis, MinIO)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Important Conventions

### Backend
1. **Configuration**: All settings are in `server/src/config.py` - no environment variables used
2. **API Responses**: Use `response.py` helpers (`success()`, `failure()`) for all POST endpoints
3. **Error Handling**: Raise `AppError` from `exceptions.py` for application errors
4. **Documentation**: Every endpoint requires complete Scalar docs with request/response schemas
5. **Logging**: Use `logging_service.py` for important operations
6. **Testing**: Organize tests by module in `tests/` directory
7. **Virtual Environment**: Located at `server/.venv` (managed by UV)

### Frontend
1. **Package Manager**: Always use `bun` not `npm`
2. **State Management**: Zustand stores in `stores/`
3. **Components**: Feature-based organization in `features/` directory
4. **Styling**: Tailwind CSS v4 with shadcn/ui components

### Database
- **Three separate databases** for different concerns
- **Alembic** for all schema changes
- **Migration files** in `server/alembic/versions/`

## Key Technologies

**Backend**: FastAPI, LangChain, LangGraph, PostgreSQL+pgvector, Redis, Celery, MinIO, Alembic, Pytest
**Frontend**: Next.js 16, React 19, TypeScript, Bun, Tailwind CSS v4, Shadcn/ui, Zustand, AI SDK

## External Services

Default credentials (from `storage/docker-compose.yml`):
- **PostgreSQL**: `postgres:postgres@localhost:5432`
- **Redis**: `localhost:6379`
- **MinIO**: `axiom:axiom123@localhost:9000` (console at `:9001`)

## Documentation Reference

Detailed architecture docs are available in `docs/`:
- `docs/server/` - Backend design (SSE, agents)
- `docs/web/` - Frontend design (auth, components)
- `docs/storage/` - Database and storage design
