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
