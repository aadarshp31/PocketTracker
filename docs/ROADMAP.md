# PocketTracker Roadmap

Last updated: 2026-03-01

## Goal

Track remaining work in small, shippable phases with clear completion criteria.

## Phase 1 — Security & API Hardening

### 1. Add authentication and ownership enforcement
- [ ] Introduce auth flow (JWT or session-based)
- [ ] Replace `userId` query trust with identity from auth context
- [ ] Enforce ownership checks in all protected resources

**Done when**
- [ ] Protected endpoints reject unauthenticated requests
- [ ] A user cannot access/modify another user's categories, transactions, or budgets

### 2. Replace request `@ts-ignore` patterns
- [ ] Add typed request augmentation for `req.user`, `req.category`, `req.transaction`, `req.budget`
- [ ] Remove controller-level `@ts-ignore` usage for these fields

**Done when**
- [ ] TypeScript build passes without those `@ts-ignore` entries

## Phase 2 — Quality & Reliability

### 3. Add automated tests
- [ ] Set up test framework for API/services
- [ ] Cover CRUD happy-path and key failures
- [ ] Add regression tests for category default restrictions

**Done when**
- [ ] `npm test` runs real tests
- [ ] Critical routes have passing coverage for create/read/update/delete behavior

### 4. Improve API error contracts
- [ ] Standardize error body shape
- [ ] Differentiate validation errors vs not-found vs server errors

**Done when**
- [ ] Errors are predictable and documented per endpoint class

## Phase 3 — Product Surface

### 5. Frontend source management
- [ ] Add/restore maintainable frontend source in repository (if intentionally separate, document location)
- [ ] Keep build pipeline and deployment path documented

**Done when**
- [ ] Frontend can be built from source by a new contributor

### 6. Reporting and insights (optional enhancement)
- [ ] Monthly spending summary endpoint
- [ ] Category-wise budget utilization endpoint

**Done when**
- [ ] Dashboard-level summary endpoints are available and documented

## Backlog (Lower Priority)

- [ ] Input validation schemas for all write endpoints
- [ ] Rate limiting and abuse protection
- [ ] API docs export (OpenAPI/Swagger)
- [ ] CI checks (build + test)

## Update Protocol

For each completed item:

1. Mark checkbox as done.
2. Add completion date in the section.
3. If scope changed, add one bullet describing the change.
