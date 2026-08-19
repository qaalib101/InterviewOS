# Interview OS

Interview OS is a local, single-user job-search operating system and CRM for managing recruiting processes, interview workflows, contacts, follow-ups, and activity history.

It is designed for one person running the app locally. The current implementation has no authentication layer, hosted multi-user deployment, team features, external sync, scraping, notifications, or browser extension.

## Product Overview

Implemented capabilities:

- Companies, applications, contacts, interviews, interview notes, and follow-ups.
- Edit and delete workflows for the core CRM records.
- Follow-up completion and reopening.
- Activity history for write events.
- Dashboard summaries for active applications, upcoming interviews, open follow-ups, recent activity, pipeline stage counts, follow-up priority counts, and interview outcome counts.
- AI-assisted pasted-text import for recruiting content.
- Seeded local data for destructive development reset workflows.

Partially implemented capabilities:

- Interview notes, with schema support for structured interview analysis.
- Import session traceability, including stored raw text, provider name, analysis JSON, status, errors, and commit timestamp.

Planned capabilities:

- Process analytics over time.
- STAR stories.
- Interview question bank.
- Mock interview analysis.

## AI Import

The text import workflow is human-in-the-loop:

1. Paste unstructured recruiting text such as a recruiter email, LinkedIn message, job description, interview notes, or follow-up text.
2. Select an import source type and, optionally, existing application or interview context.
3. The configured AI provider analyzes the text and returns structured proposals.
4. The API normalizes proposals and applies local matching/deduplication against existing records.
5. The user reviews proposals, edits proposed fields, and includes or excludes each proposal.
6. The user explicitly commits the included proposals.
7. Approved changes are written in a single database transaction.

AI-generated proposals do not directly modify durable application data. Proposals are stored as drafts, reviewed by the user, and committed only after explicit approval.

Supported proposal entity types are company, application, contact, interview, interview note, and follow-up. Providers are `mock`, `openai`, `deepseek`, `ollama`, and `disabled`. The mock provider is deterministic and works without external credentials. If an external or local provider is unavailable or misconfigured, AI import analysis is disabled while normal CRM functionality remains usable.

## Architecture

```text
apps/web          React, TypeScript, Vite, Tailwind, TanStack Query
apps/api          Express, TypeScript, Prisma, Postgres
packages/shared  Shared Zod schemas, enums, and TypeScript types
database          Local Postgres via Docker Compose
```

The API and web app share validation contracts through `packages/shared`. Prisma manages the Postgres schema and migrations. AI import is synchronous request/response; there are no background jobs.

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

Seeding is not part of normal setup or update workflows because it is destructive. To replace local data with built-in starter records:

```bash
pnpm db:seed:reset
```

`pnpm db:seed:reset` deletes and recreates local CRM, interview, follow-up, activity, and import-session records for the local user. Do not run it after entering personal data you want to keep.

## Configuration

Default local settings are shown in `.env.example`:

```bash
DATABASE_URL="postgresql://interview_os:interview_os@localhost:5432/interview_os?schema=public"
PORT=4000
WEB_ORIGIN="http://localhost:5173"
VITE_API_URL="http://localhost:4000"
AI_PROVIDER="mock"
OPENAI_API_KEY=""
DEEPSEEK_API_KEY=""
DEEPSEEK_MODEL="deepseek-v4-flash"
OLLAMA_BASE_URL=""
OLLAMA_MODEL=""
LOCAL_USER_NAME="Qaalib"
AI_USER_ALIASES="Qaalib,Qaalib Farah"
```

`LOCAL_USER_NAME` and `AI_USER_ALIASES` help the import prompt distinguish the local user from recruiters, contacts, interviewers, and companies mentioned in pasted text.

## Usage

Start the API:

```bash
pnpm dev:api
```

Start the web app:

```bash
pnpm dev:web
```

Open the web app at:

```text
http://localhost:5173
```

The API runs at:

```text
http://localhost:4000
```

## Verification

```bash
pnpm lint
pnpm test
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
