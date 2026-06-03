# Interview OS

Interview OS is a personal job search and interview tracking application built incrementally as a portfolio-quality project.

Current approved milestone: Milestone 1, Project Foundation.

## Stack

- Web: React, TypeScript, Vite, Tailwind
- API: Node.js, TypeScript, Express
- Database: Postgres
- ORM: Prisma
- Package manager: pnpm workspaces

## Prerequisites

- Node.js 22+
- pnpm 9+
- Docker

## Setup

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

## Development

```bash
pnpm dev:api
pnpm dev:web
```

The API runs on `http://localhost:4000`.

The web app runs on `http://localhost:5173`.

## Verification

```bash
pnpm test
pnpm build
pnpm lint
```

## Milestone 1 Scope

Milestone 1 includes only foundation work: monorepo structure, app scaffolds, Docker Compose, Postgres, Prisma setup, shared package, seed data strategy, and README setup instructions.

Business features begin in Milestone 2 after approval.
