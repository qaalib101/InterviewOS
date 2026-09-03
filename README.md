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
- Import session persistence: raw text, provider, analysis JSON, status, errors, and commit timestamp.

Partially implemented capabilities:

- Structured interview analysis: the schema supports it, but automatic interview analysis is not implemented.
- Import sessions can be retrieved through the API; the web app has no session-history browser or workflow for reopening saved drafts.

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

Supported proposal entity types are company, application, contact, interview, interview note, and follow-up. Providers are `mock`, `openai`, `deepseek`, `ollama`, and `disabled`. The mock provider uses local text heuristics and works without external credentials; some fallback names depend on the current date. Missing required provider configuration disables analysis. A configured provider can still fail at request time, in which case the import session is marked failed. Normal CRM functionality remains usable. Provider status reports configuration readiness, not a live connectivity check.

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
- pnpm 9.15.0 (the version pinned in `package.json`)
- Docker

Run commands from the repository root. Docker Compose starts PostgreSQL only; the API and web app run separately. PostgreSQL uses host port `5432`, so stop other services using that port or adjust the Compose mapping and `DATABASE_URL` together.

For a new checkout, install and initialize:

```bash
pnpm install --frozen-lockfile
cp .env.example .env
docker compose up -d
pnpm db:generate
pnpm db:migrate
```

Keep an existing `.env` when updating an installation. Wait for PostgreSQL to accept connections before running migrations.

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

Choose `AI_PROVIDER` from the following values:

| Provider | Required configuration | Behavior |
| --- | --- | --- |
| `mock` | None | Local heuristic proposals for development |
| `openai` | `OPENAI_API_KEY` | Remote analysis; model is currently selected in `openAiProvider.ts` |
| `deepseek` | `DEEPSEEK_API_KEY` | Remote analysis; model is configurable with `DEEPSEEK_MODEL` |
| `ollama` | `OLLAMA_BASE_URL`, `OLLAMA_MODEL` | Analysis through an independently running Ollama instance |
| `disabled` | None | CRM remains available; import analysis is unavailable |

Remote providers receive the pasted text and resolved context. Import sessions retain the raw text and analysis in PostgreSQL. Keep local environment files and personal database exports out of version control.

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

`pnpm lint` runs TypeScript checks; there is no separate ESLint configuration. API and shared-schema tests use Vitest. HTTP tests use Supertest with mocked database calls and require local socket access. The web package currently has no tests and uses `--passWithNoTests`; the suite does not verify real database rollback or concurrency.

The compiled API start path is not yet a reliable deployment workflow: `@interview-os/shared` exports TypeScript source and does not emit a JavaScript package. Plain Node 22.17.1 cannot load that entry point. Use the development commands above until the package build/export boundary is fixed.

## Reading the Code

- [`packages/shared/src/imports.ts`](packages/shared/src/imports.ts): import contracts and proposal types.
- [`apps/api/src/modules/imports.routes.ts`](apps/api/src/modules/imports.routes.ts): analyze, review-save, and commit orchestration.
- [`imports.normalize.ts`](apps/api/src/modules/imports.normalize.ts), [`imports.matching.ts`](apps/api/src/modules/imports.matching.ts), and [`imports.enhance.ts`](apps/api/src/modules/imports.enhance.ts): normalization, existing-record matching, and context enrichment.
- [`imports.commit.ts`](apps/api/src/modules/imports.commit.ts): transaction and proposal-reference resolution.
- [`ImportNewPage.tsx`](apps/web/src/pages/ImportNewPage.tsx): the review and commit UI.
- [`docs/DECISIONS.md`](docs/DECISIONS.md): architectural decisions and scope tradeoffs.

## Current Limitations

- This is a local, unauthenticated app, not a hosted multi-user service. Keep it on a trusted local machine.
- AI analysis runs within the HTTP request, without a background queue or application-level provider timeout.
- Import commits are transactional, but the session status check is outside the transaction; concurrent commit requests are not guaranteed to be idempotent.
- Proposal envelopes are validated, but entity fields remain loosely typed. Matching and normalization use heuristics that require review.
- Proposed fields are edited as JSON. Invalid edits show a warning while the last valid proposal remains in state; correct the JSON before committing. Recheck the editor after reanalysis.

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
