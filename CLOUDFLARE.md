# Cloudflare Deployment Guide

This guide explains how to deploy the Bill Splitter application to Cloudflare's free tier infrastructure.

## Architecture Overview

| Component | Cloudflare Service | Free Tier Limits |
|-----------|-------------------|------------------|
| **Frontend** | Cloudflare Pages | Unlimited sites, 500 builds/month |
| **Backend** | Cloudflare Workers | 100K requests/day |
| **Database** | Cloudflare D1 | 5M reads/day, 100K writes/day |

## Prerequisites

1. [Cloudflare account](https://dash.cloudflare.com/sign-up) (free)
2. [Node.js](https://nodejs.org/) v18+
3. [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

```bash
npm install -g wrangler
wrangler login
```

## Server Deployment (Cloudflare Workers + D1)

### 1. Create the D1 Database

```bash
cd server
npm run db:create
```

This outputs a database ID. Copy it and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "bill-splitter-db"
database_id = "your-actual-database-id-here"
```

### 2. Run Database Migrations

```bash
# For production
npm run db:migrate

# For local development
npm run db:migrate:local
```

### 3. Deploy the Worker

```bash
npm run deploy
```

Note the deployed URL (e.g., `https://bill-splitter-api.<your-subdomain>.workers.dev`).

### 4. Local Development

```bash
npm run dev
```

This starts a local Worker environment on `http://localhost:3001`.

## Client Deployment (Cloudflare Pages)

### 1. Configure Environment Variable

Create a `.env.production` file in the `client` directory:

```bash
VITE_API_BASE_URL=https://bill-splitter-api.<your-subdomain>.workers.dev
```

### 2. Build the Client

```bash
cd client
npm run build
```

### 3. Deploy to Cloudflare Pages

**Option A: Via Wrangler CLI**

```bash
npx wrangler pages deploy dist --project-name=bill-splitter
```

**Option B: Via Cloudflare Dashboard**

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → Pages
2. Click "Create a project" → "Connect to Git"
3. Select your repository
4. Configure build settings:
   - **Framework preset**: Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `client`
5. Add environment variable:
   - `VITE_API_BASE_URL` = your Workers URL

## Environment Variables

### Server (wrangler.toml)

| Variable | Description | Default |
|----------|-------------|---------|
| `ENVIRONMENT` | Environment mode | `production` |
| `MAX_PARTICIPANTS` | Max participants per split | `50` |
| `MAX_EXPENSES` | Max expenses per split | `500` |
| `MAX_TOTAL_SPLITS` | Global max active splits | `10000` |
| `SPLIT_EXPIRY_HOURS` | Hours until split expires | `24` |

### Client (.env.production)

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Full URL to your Workers API |

## Free Tier Considerations

### Limits to Monitor

- **Workers**: 100K requests/day (resets at midnight UTC)
- **D1 Reads**: 5M/day
- **D1 Writes**: 100K/day
- **D1 Storage**: 5GB

### Estimated Usage Per Split Session

| Operation | D1 Reads | D1 Writes |
|-----------|----------|-----------|
| Create split | 1 | 1 |
| Add participant | 2 | 1 |
| Add expense | 3 | 1 |
| View split | 3 | 0 |
| Calculate settlement | 3 | 0 |

A typical 5-person split with 10 expenses uses ~30 reads and ~16 writes.

**Free tier supports approximately:**
- ~6,000 split sessions/day (based on writes)
- ~166,000 split views/day (based on reads)

## Troubleshooting

### CORS Issues

If you see CORS errors, verify the client is calling the correct API URL and the Worker's CORS middleware is properly configured.

### Database Connection Issues

```bash
# Check D1 database status
wrangler d1 info bill-splitter-db

# List all tables
wrangler d1 execute bill-splitter-db --command="SELECT name FROM sqlite_master WHERE type='table'"
```

### View Worker Logs

```bash
wrangler tail
```

## Upgrading from Free Tier

If you exceed free tier limits, consider:

1. **Workers Paid** ($5/month): 10M requests/month
2. **D1 Paid**: Higher limits, better performance

## Local Development Workflow

1. Start the server (with local D1):
   ```bash
   cd server
   npm run dev
   ```

2. Start the client (with Vite proxy):
   ```bash
   cd client
   npm run dev
   ```

The client's Vite dev server proxies `/api` requests to `localhost:3001`.
