# Decisions

## 2026-06-03: Milestone Workflow

Build Interview OS milestone by milestone. Each milestone requires a plan and approval before code is written.

## 2026-06-03: Monorepo

Use a pnpm workspace with `apps/web`, `apps/api`, and `packages/shared`.

## 2026-06-03: API Framework

Use Express for the API foundation. It keeps v1 small and makes API structure explicit.

## 2026-06-03: Database

Use Postgres with Prisma. Milestone 1 includes only a foundation `User` model so Prisma can migrate and seed without introducing business entities early.

## 2026-06-03: Local User Strategy

Seed a single local user for v1 development. Authentication is intentionally deferred.

## 2026-06-03: Deferred AI

Mock AI analysis is deferred until Milestone 7. No AI routes, providers, or schemas are included in Milestone 1.

## 2026-06-03: Core CRM First

Milestone 2 adds only companies, applications, and contacts. Existing process import is modeled as normal application creation with any valid initial stage, which keeps the workflow simple without adding a separate import entity.

## 2026-06-03: Simple CRM API

Use explicit Express route files for the three CRM resources. A generic CRUD abstraction is deferred until repeated behavior becomes painful.

## 2026-06-03: CRM UI Shape

Use specific pages for companies, applications, and contacts. Avoid a generic table/form builder for now so the product code stays easy to read and maintain.

## 2026-06-06: Interview Notes Before AI

Milestone 3 stores interview rounds, raw notes, prep notes, and an optional structured analysis JSON shape. No AI route or provider is added yet; mock analysis remains deferred until Milestone 7.

## 2026-06-06: Interview UI Scope

Use a single `/interviews` page for interview rounds and notes. Avoid calendar views and dashboard summaries until those milestones are explicitly approved.

## 2026-06-06: Edit And Delete UX

Milestone 3.5 reuses existing create forms for editing instead of adding modal infrastructure. Delete actions require inline confirmation and continue to use hard deletes for v1 local data.

## 2026-06-06: Seed Safety

The seed script is no longer part of setup or normal update workflows. It is guarded behind the explicit `db:seed:reset` command because it deletes existing local data.

## 2026-06-09: Follow-Up Status

Milestone 4 models completion with a nullable `completedAt` timestamp instead of a separate status enum. This keeps open/completed filtering simple and preserves when the action was completed.

## 2026-06-09: Follow-Up Links

Follow-ups can link to an application, contact, interview, or any combination of those records. No reminders, notifications, or calendar integration are included in this milestone.

## 2026-06-09: Dashboard Activity Foundation

Milestone 5 adds an `ActivityEvent` table for recent activity and future process-over-time analytics. Activity is recorded by current write routes only; there are no notifications, external integrations, or background jobs.

## 2026-06-09: Simple Dashboard Visualizations

Dashboard summaries use server-side aggregate queries and lightweight CSS bars. A charting library is deferred until the product needs richer date-series reporting.
