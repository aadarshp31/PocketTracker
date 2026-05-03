# PocketTracker Roadmap

Last updated: 2026-03-01

## MVP Goal

Deliver a simple expense tracker that prioritizes transaction reliability and automatic insights over manual budgeting.

## Completed Baseline

- [x] Transaction CRUD APIs
- [x] Paginated transaction listing
- [x] Core entities (users/categories/transactions/budgets)
- [x] React client scaffold in workspace (`client/`, React 19 + TypeScript + Vite)

## Phase 1 — Security + Data Integrity

### 1) Authentication and ownership
- [ ] Integrate auth and resolve user identity server-side
- [ ] Remove dependency on query `userId` for authorization
- [ ] Enforce cross-user isolation in all protected endpoints

**Done when**
- [ ] Every protected route requires authenticated identity
- [ ] Access is restricted to the owner’s records only

### 2) Query/index readiness for analytics
- [ ] Add indexes for transaction analytics workload:
	- [ ] `transactions(user_id, date)`
	- [ ] `transactions(user_id, category_id, date)`

**Done when**
- [ ] Transaction list and aggregate queries remain fast at scale

## Phase 2 — Insights APIs (Core Differentiator)

### 3) Dashboard summary endpoints
- [ ] Current month vs previous month spending
- [ ] Highest spending category
- [ ] Category percentage breakdown

### 4) Behavioral + predictive endpoints
- [ ] Day-of-week spending pattern
- [ ] Spending spike detection
- [ ] End-of-month projection

**Done when**
- [ ] Dashboard can render all core insights from API responses only

## Phase 3 — Frontend Productization

### 5) Transactions UX
- [ ] Create/edit/delete transaction forms with validation
- [ ] Paginated table with filters and sorting
- [ ] Error/loading/empty states for all views

### 6) Insights dashboard UX
- [ ] KPI summary cards
- [ ] Category split visualization
- [ ] Trend indicators and anomaly highlight

**Done when**
- [ ] User can track monthly spending and view actionable insights in one flow

## Phase 4 — Quality + Operability

### 7) Testing and contracts
- [ ] Add backend tests for transactions + insights
- [ ] Add client tests for critical screens
- [ ] Standardize API success/error response shape

### 8) Documentation and CI
- [ ] API docs (OpenAPI/Swagger) for MVP endpoints
- [ ] CI for lint + build + test

**Done when**
- [ ] `build`, `lint`, and `test` pass in CI on every change

## Post-MVP (Optional)

- Lightweight budgeting tools
- Recurring/subscription detection
- Notifications and savings goals
- AI recommendations
