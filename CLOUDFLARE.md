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

**Via CLI:**
```bash
wrangler tail
```

**Via Cloudflare Dashboard:**
1. Go to Workers & Pages → your worker → Logs
2. Use filters to search by log level, request ID, or message content

## Logging

The application uses structured JSON logging that integrates with Cloudflare's logging system.

### Log Format

All logs are output as JSON and automatically captured by Cloudflare:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Request completed",
  "requestId": "abc123-cf-ray",
  "method": "GET",
  "path": "/splits/abc123",
  "status": 200,
  "durationMs": 45,
  "cf": {
    "colo": "AMS",
    "country": "NL",
    "city": "Amsterdam"
  }
}
```

### Log Levels

| Level | Usage |
|-------|-------|
| `debug` | Detailed debugging information |
| `info` | General operational events (requests, responses) |
| `warn` | Client errors (4xx responses) |
| `error` | Server errors (5xx responses, exceptions) |

### What Gets Logged

- **Request received**: URL, method, user agent, client IP
- **Request completed**: Status code, response time
- **Errors**: Full stack traces with error context

### Using the Logger in Code

```javascript
import { getLogger } from './middleware/requestLogger.js';

// In a route handler
router.get('/example', async (c) => {
  const log = getLogger(c);
  
  log.info('Processing request', { customField: 'value' });
  log.warn('Something unusual', { details: '...' });
  log.error('Something failed', { error: err });
  
  return c.json({ ok: true });
});
```

### Viewing Logs

**Real-time (CLI):**
```bash
wrangler tail --format=json
```

**Historical (Dashboard):**
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to Workers & Pages → bill-splitter-api → Logs
3. Filter by log level, time range, or search log content

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
