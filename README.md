# Study Tracker

Study Tracker is a local MVP for parents to record, visualize, and motivate learning progress.

It is not an LMS. It tracks the rhythm:

```txt
Learn -> Practice -> Revise -> Master
```

## Stack

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL via Docker Compose on host port `5433`
- Zod validation
- Server Actions
- Recharts
- Lucide icons
- Vitest

## Setup

1. Copy the environment file.

```bash
cp .env.example .env
```

2. Start PostgreSQL.

```bash
docker-compose up -d
```

3. Create the database schema and seed data.

```bash
npm run db:migrate
npm run db:seed
```

4. Start the app.

```bash
npm run dev
```

Open http://localhost:3000.

Log in at `/login` using the seeded parent credentials from `.env`.

For Neon, put the pooled connection string in `DATABASE_URL` and the direct connection string in `DIRECT_URL`.

## One-command setup

After copying `.env.example` to `.env`, this command installs dependencies, starts Postgres, runs the first migration, and seeds the database:

```bash
npm run setup
```

## Test and quality commands

```bash
npm run test
npm run lint
npm run build
```

## Seed data

The seed creates two children:

- Tisha
- Aarav

Each child receives the default subjects:

- Marathi
- Hindi
- English
- Mathematics
- Science
- Social Science

Tisha also receives a sample Mathematics chapter and topics so the dashboard has realistic starter data.

## Product notes

- Authentication is enabled with a single parent account.
- Authorization is parent-only, and every protected page and mutation checks the signed-in parent before reading or writing data.
- Deleting a child cascades to subjects, chapters, topics, goals, and all sessions.
- The delete flow requires typing the child name as a confirmation warning.
- Topic confidence is optional.
- Study session duration is editable even though start and end times are also recorded.
- Outcome goals support topic-level and chapter-level targets.

## Hosting

Recommended production setup:

1. Push the repo to GitHub.
2. Create a hosted PostgreSQL database on Neon, Supabase, Render, or similar.
3. Set these environment variables in your host:

```bash
DATABASE_URL=...
DIRECT_URL=...
AUTH_SECRET=...
ADMIN_EMAIL=parent@studytracker.local
ADMIN_PASSWORD=...
ADMIN_NAME=Parent
```

4. Run migrations against the hosted database:

```bash
npm run db:migrate
```

5. Seed the parent account and starter data once:

```bash
npm run db:seed
```

6. Deploy the app to Vercel or another Node-friendly host.
7. If the host needs explicit build/start commands, use:

```bash
npm run build
npm run start
```

For local Docker-based hosting, the app uses PostgreSQL on host port `5433`.

## Local vs production envs

- Keep local settings in `.env`.
- Keep shared defaults in `.env.example`.
- Set production secrets in your hosting provider's environment variables, not in the repo.
- Use the same variable names in both places so Prisma and Next.js read them consistently.
- If you use Neon, `DATABASE_URL` should usually be the pooled URL and `DIRECT_URL` should be the direct URL.

## Architecture

```txt
src/app
src/features
  children
  subjects
  chapters
  topics
  study-sessions
  practice-sessions
  revision-sessions
  goals
  dashboard
  calendar
  reports
src/components
src/lib
prisma
```

Server Actions live inside feature folders. Shared analytics and validation logic live in `src/lib`.
