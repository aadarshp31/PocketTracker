# PocketTracker Feature Progress

Last updated: 2026-03-01

## Progress Summary

- **Core backend API**: Implemented
- **Entity CRUD (Users, Categories, Transactions, Budgets)**: Implemented
- **Pagination/Sorting for list endpoints**: Implemented (Users, Transactions, Budgets)
- **Database seed bootstrap**: Implemented
- **Frontend source in repository**: Not present (only built static assets in `server/public`)
- **Authentication/Authorization layer**: Not implemented
- **Automated tests**: Not implemented (`npm test` is placeholder)

## Feature Status (Trackable)

| Area | Feature | Status | Notes |
|---|---|---|---|
| API | Health endpoint (`GET /api/`) | ✅ Done | Returns `api is live` |
| API | Users endpoints (`/api/users`) | ✅ Done | CRUD implemented |
| API | Categories endpoints (`/api/categories`) | ✅ Done | CRUD implemented |
| API | Transactions endpoints (`/api/transactions`) | ✅ Done | CRUD implemented |
| API | Budgets endpoints (`/api/budgets`) | ✅ Done | CRUD implemented |
| Data access | User ownership scoping via `userId` query | ✅ Done | Used for category/transaction/budget access |
| Data access | Category defaults visibility | ✅ Done | Default + user categories returned |
| Business rules | Restrict edits/deletes on default categories | ✅ Done | Guarded in service layer |
| List behavior | Pagination + metadata | ✅ Done | Users, Transactions, Budgets |
| List behavior | Sorting controls (`sort` + `order`) | ✅ Done | Users, Transactions, Budgets |
| Bootstrapping | Auto seeding on startup | ✅ Done | Seeds users/categories/transactions/budgets if empty |
| Platform | CORS + request logging + error middleware | ✅ Done | Morgan + custom middleware |
| Platform | Static file hosting | ✅ Done | Serves `server/public` |
| Security | AuthN/AuthZ (token/session) | ❌ Pending | Ownership currently depends on `userId` query parameter |
| Quality | Automated test suite | ❌ Pending | No real tests currently configured |
| Quality | Request typing cleanup | ❌ Pending | `@ts-ignore` used for request-extended properties |
| Frontend | Maintainable frontend source in repo | ❌ Pending | Source files are not visible in current workspace |

## Current Known Constraints

- API access control is application-level and depends on incoming `userId` query values.
- Some response behavior uses `204` for empty reads.
- Several controllers store derived entities on `req` with `@ts-ignore` instead of typed Express request augmentation.

## How to Update This File

When a feature changes:

1. Update the matching row in **Feature Status (Trackable)**.
2. Change the **Progress Summary** bullet if overall status changed.
3. Bump the `Last updated` date.
