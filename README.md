# PocketTracker
This is the PocketTracker project, a simple expense tracking application with a focus on transaction reliability and automatic insights. The backend is built with Express and Sequelize, while the frontend is a React application.

Features include:
- CRUD operations for users, categories, transactions, and budgets
- Paginated transaction listing with sorting
- Dashboard insights (planned for future implementation)
- Authentication and ownership enforcement (planned for future implementation)
- React frontend with Vite, React Router, and TanStack Query

### Deployment Link
https://pockettracker-server.onrender.com/api/

### Project Tracking
- Feature progress: [docs/FEATURE_PROGRESS.md](docs/FEATURE_PROGRESS.md)
- Roadmap and remaining work: [docs/ROADMAP.md](docs/ROADMAP.md)

### Build & Run

#### Production build (client assets into server/public)
- From `server/` run: `npm run build:prod`
- This will:
	- build server TypeScript into `server/dist` (separate folder)
	- build client into `client/dist`
	- copy `client/dist` contents into `server/public` as static files
- To run compiled server: `npm run start:prod`

#### Development (separate client/server)
- Server: run `Start Server` launch config or `cd server && npm run dev:server`
- Client: run `Start Client` launch config or `cd server && npm run dev:client`
- Full stack in VS Code: run `Start Full Stack` compound launch config
- Full stack via npm: run `cd server && npm run dev:full`
