# Interview OS

Interview OS is a personal operating system for managing job searches, recruiting processes, interview preparation, interview feedback, and follow-up activities.

It gives one place to track active opportunities, people involved in each process, interview rounds, notes, and the next actions required to keep a search moving.

## Problem

Job searches create scattered operational data: applications live in spreadsheets, contact notes live in email threads, interview prep lives in documents, and follow-ups depend on memory. Interview OS centralizes that work so each opportunity has context, history, and a clear next action.

## Product Overview

Interview OS currently supports:

- Company records.
- Job applications and existing processes already in progress.
- Contacts linked to companies and applications.
- Interview rounds linked to applications.
- Interview notes and structured analysis storage.
- Follow-ups linked to applications, contacts, and interviews.
- Dashboard summary for active applications, upcoming interviews, open follow-ups, recent activity, and pipeline health.
- AI-assisted text import for turning pasted recruiting text into reviewable draft records.
- Edit/delete workflows for current records.
- Seeded local data for development reset workflows.

Planned capabilities include:

- Process analytics over time.
- STAR stories.
- Interview question bank.
- Mock interview analysis.

## Architecture

```text
apps/web      React, TypeScript, Vite, Tailwind
apps/api      Node.js, TypeScript, Express, Prisma
packages/shared  Shared schemas, enums, and types
database      Postgres
```

The API and web app share validation contracts through `packages/shared`. Prisma manages the Postgres schema and migrations. Local commands load the repo-root `.env` with override enabled so project values such as `DATABASE_URL` win over inherited shell variables.

## Setup

Prerequisites:

- Node.js 22+
- pnpm 9+
- Docker

Install and initialize:

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:generate
pnpm db:migrate
```

Seeding is not part of normal setup or update workflows because the seed is destructive. If you intentionally want to replace local data with the built-in starter records, run:

```bash
pnpm db:seed:reset
```

`pnpm db:seed:reset` deletes and recreates local CRM, interview, follow-up, and activity records for the seeded local user. Do not run it after entering personal data you want to keep.


## AI Import Setup

Text import works without external AI credentials when `AI_PROVIDER=mock`. The mock provider is deterministic and suitable for local use.

Optional provider settings:

```bash
LOCAL_USER_NAME=Qaalib
AI_USER_ALIASES=Qaalib,Qaalib Farah
AI_PROVIDER=mock # mock | openai | deepseek | ollama | disabled
OPENAI_API_KEY=
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-v4-flash
OLLAMA_BASE_URL=
OLLAMA_MODEL=
```

If a configured provider is missing required settings, Interview OS disables analysis and shows setup guidance. Existing application features continue to work.

The import prompt uses `LOCAL_USER_NAME` and `AI_USER_ALIASES` to avoid creating recruiter/contact records for you when pasted text references your name.

## Usage

Start the API:

```bash
pnpm dev:api
```

Start the web app:

```bash
pnpm dev:web
```

Open:

```text
http://localhost:5173
```

The API runs on:

```text
http://localhost:4000
```

## Verification

```bash
pnpm test
pnpm lint
pnpm build
```

## API Surface

```text
GET    /health
GET    /api/v1/meta
GET    /api/v1/dashboard
GET    /api/v1/activity
GET    /api/v1/ai/status
POST   /api/v1/imports/analyze
GET    /api/v1/imports/:id
PATCH  /api/v1/imports/:id/proposals
POST   /api/v1/imports/:id/commit

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

GET    /api/v1/follow-ups
POST   /api/v1/follow-ups
GET    /api/v1/follow-ups/:id
PATCH  /api/v1/follow-ups/:id
PATCH  /api/v1/follow-ups/:id/complete
PATCH  /api/v1/follow-ups/:id/reopen
DELETE /api/v1/follow-ups/:id
```
