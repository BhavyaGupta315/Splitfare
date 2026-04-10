# SplitFare

Split expenses with friends and groups — simple, fast, and fair.

## Features

- Google Sign-In authentication
- Create groups and add members
- Track shared expenses with equal splits
- Automatic balance calculation and debt simplification
- Web and mobile apps sharing the same backend

## Tech Stack

- **Frontend:** Next.js (web), Expo/React Native (mobile)
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL, Prisma ORM
- **Auth:** Google OAuth 2.0, JWT sessions
- **Monorepo:** pnpm workspaces, Turborepo

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+
- A Google Cloud project with OAuth 2.0 credentials

### Installation

```bash
pnpm install
cp .env.example .env
```

### Database Setup

```bash
pnpm db:generate
pnpm db:migrate
```

### Development

```bash
# Start the backend
pnpm --filter @splitfare/backend dev

# Run tests
pnpm test
```

## Project Structure

```
splitfare/
├── apps/
│   ├── backend/       # REST API (Express)
│   ├── web/           # Web client (Next.js)
│   └── mobile/        # Mobile client (Expo)
├── packages/
│   ├── db/            # Database schema & client
│   ├── types/         # Shared TypeScript types
│   ├── utils/         # Business logic
│   └── validation/    # Input validation schemas
```

## API

"In development phase"

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/google` | Sign in with Google |
| `POST` | `/auth/logout` | Sign out |
| `POST` | `/groups` | Create a group |
| `GET` | `/groups/:id` | Get group details |
| `POST` | `/groups/:id/members` | Add a member |
| `POST` | `/expenses` | Add an expense |
| `GET` | `/groups/:id/expenses` | List expenses |
| `GET` | `/groups/:id/balances` | View balances |
