# PocketTracker Feature Progress

Last updated: 2026-03-01

## Status Against Earlier Plan

| Plan Area | Current Status | Notes |
|---|---|---|
| Transaction CRUD | ✅ Implemented | Create/list/get/update/delete endpoints are present |
| Pagination meta on transactions | ✅ Implemented | Includes page/limit/totalPages/totalCount |
| Insights-driven direction | 🟡 Partially aligned | Direction defined, but insights endpoints not implemented yet |
| Budget as non-MVP | 🟡 Decision made, implementation still exists | Budget module is active in API and can be retained as optional |
| Indexed transaction queries | ❌ Pending | No explicit indexes yet for `user_id` + `date` |
| Aggregation endpoints (monthly/category) | ❌ Pending | Core requirement for insights-first MVP |
| Auth via Supabase Auth | ❌ Pending | Backend currently trusts query `userId` |
| Frontend code in workspace | ✅ Implemented | React 19 + Vite client scaffolded and structured |

## Implemented (Keep)

- Core Express API server and health endpoint
- Users, categories, transactions, budgets CRUD routes
- Pagination + sorting in list APIs (users, transactions, budgets)
- Category default protections (cannot update/delete default categories)
- Seeder bootstrap for initial data
- Logging, CORS, static hosting, error middleware
- Client app now maintained in workspace (`client/`) with:
	- React 19 + TypeScript + Vite
	- React Router
	- React Query
	- Axios API client layer
	- Feature-oriented transaction module structure

## Pending for Current MVP Direction

### Backend (High Priority)

- [ ] Add auth integration and ownership enforcement from authenticated identity
- [ ] Add explicit DB indexes for transaction analytics access patterns (`user_id`, `date`, category)
- [ ] Add summary endpoints for dashboard:
	- [ ] monthly spend vs previous month
	- [ ] category breakdown + top category
	- [ ] trend endpoint (month-over-month category growth)
- [ ] Add standardized response contract (`data` + `meta` + consistent error shape)

### Insights Layer (High Priority)

- [ ] Implement SQL aggregation services for:
	- [ ] monthly totals
	- [ ] category percentage split
	- [ ] day-of-week spending distribution
	- [ ] spending spike detection
- [ ] Add API endpoints for computed insights (no separate insights table yet)

### Frontend (High Priority)

- [ ] Connect dashboard page to new insights endpoints
- [ ] Add transactions create/edit forms and validation
- [ ] Replace temporary default user mechanism with authenticated user context
- [ ] Add loading/error/empty UI states for all data views

### Quality / Reliability

- [ ] Add automated test suite (`npm test` currently placeholder)
- [ ] Remove `@ts-ignore` request property patterns using typed request augmentation
- [ ] Add API contract documentation

## De-scoped / Optional (Post-MVP)

- Optional lightweight budgeting workflows
- Recurring transaction detection and subscription patterns
- Notifications and savings goals
- AI-generated recommendation layer

