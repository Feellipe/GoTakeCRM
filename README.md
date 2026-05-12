# WhatsApp CRM Dashboard

A modern CRM dashboard for filmmakers and photographers with glassmorphism design, built with Next.js 16, TypeScript, Tailwind CSS 4, and Prisma.

## Features

- 📊 **Dashboard** - KPIs, charts, and analytics
- 👥 **Client Management** - Full CRUD operations
- 💼 **Deal Pipeline** - Kanban-style pipeline with drag & drop
- 📄 **Proposals** - Create and manage client proposals
- 💰 **Financials** - Track revenue and expenses
- 📅 **Calendar** - Manage bookings and events
- 🌓 **Dark Mode** - Full theme support

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Database**: Prisma ORM (SQLite for dev, PostgreSQL for production)
- **Charts**: Recharts
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- npm, yarn, pnpm, or bun

### Installation

1. **Clone or download the project**

2. **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

4. **Initialize the database**
   ```bash
   npm run db:push
   # or
   bun run db:push
   ```

5. **Run the development server**
   ```bash
   npm run dev
   # or
   bun run dev
   ```

6. **Open [http://localhost:3000](http://localhost:3000)**

## Deployment to Vercel

### Option 1: Using Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

### Option 2: Using Vercel Dashboard

1. Push your code to GitHub
2. Import the project in [Vercel Dashboard](https://vercel.com/new)
3. Configure environment variables
4. Deploy

### Database for Production

SQLite doesn't work on Vercel's serverless platform. Use PostgreSQL:

1. **Create a PostgreSQL database** (Vercel Postgres, Supabase, Railway, Neon, etc.)

2. **Update Prisma schema** - Change the datasource in `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

3. **Set DATABASE_URL in Vercel**:
   - Go to Project Settings > Environment Variables
   - Add `DATABASE_URL` with your PostgreSQL connection string

4. **Run migrations** (local or via Vercel build):
   ```bash
   npx prisma migrate deploy
   ```

### Environment Variables for Vercel

Set these in your Vercel project settings:

```
DATABASE_URL=postgresql://...
```

## Project Structure

```
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Sample data
├── src/
│   ├── app/
│   │   ├── api/           # API routes
│   │   ├── globals.css    # Global styles
│   │   ├── layout.tsx     # Root layout
│   │   └── page.tsx       # Main page
│   ├── components/
│   │   ├── ui/            # shadcn/ui components
│   │   └── *.tsx          # App components
│   └── lib/
│       └── db.ts          # Prisma client
├── package.json
└── tailwind.config.ts
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:push` - Push schema to database
- `npm run db:generate` - Generate Prisma client

## License

MIT
