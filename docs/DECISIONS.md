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

Use specific pages for companies, applications, and contacts. Avoid a generic table/form builder for now so the portfolio code stays easy to read.

## 2026-06-06: Interview Notes Before AI

Milestone 3 stores interview rounds, raw notes, prep notes, and an optional structured analysis JSON shape. No AI route or provider is added yet; mock analysis remains deferred until Milestone 7.

## 2026-06-06: Interview UI Scope

Use a single `/interviews` page for interview rounds and notes. Avoid calendar views and dashboard summaries until those milestones are explicitly approved.
