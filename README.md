# Interview OS

Interview OS is a personal job search and interview tracking application built incrementally as a portfolio-quality project.

Current completed milestone: Milestone 3.5, Usability Maintenance.

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

Local commands load the repo-root `.env` with override enabled. That means project values such as `DATABASE_URL` win over any globally exported shell variables for this repo's API, Prisma, and Vite commands.

`pnpm db:seed` is a development reset seed. It deletes and recreates the local CRM and interview records for the seeded local user. Use it to reset demo data, not after you have entered personal production data you want to keep.

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

## Current Scope

Implemented:

- Monorepo foundation.
- Companies.
- Applications.
- Existing process import through initial application stage selection.
- Contacts linked to companies and optionally applications.
- Interview rounds.
- Interview notes.
- Interview analysis storage schema.
- Edit/delete UI for current CRM and interview data.

Not implemented yet:

- Follow-ups.
- Dashboard.
- STAR stories.
- Question bank.
- Mock AI analysis.

## API Routes

```text
GET    /health
GET    /api/v1/meta

GET    /api/v1/companies
POST   /api/v1/companies
GET    /api/v1/companies/:id
PATCH  /api/v1/companies/:id
DELETE /api/v1/companies/:id

GET    /api/v1/applications
POST   /api/v1/applications
GET    /api/v1/applications/:id
PATCH  /api/v1/applications/:id
DELETE /api/v1/applications/:id

GET    /api/v1/contacts
POST   /api/v1/contacts
GET    /api/v1/contacts/:id
PATCH  /api/v1/contacts/:id
DELETE /api/v1/contacts/:id

GET    /api/v1/interviews
POST   /api/v1/interviews
GET    /api/v1/interviews/:id
PATCH  /api/v1/interviews/:id
DELETE /api/v1/interviews/:id

GET    /api/v1/interviews/:id/notes
POST   /api/v1/interviews/:id/notes
PATCH  /api/v1/interview-notes/:noteId
DELETE /api/v1/interview-notes/:noteId
```
