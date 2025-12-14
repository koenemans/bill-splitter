# Bill Splitter

A lightweight full-stack application for splitting bills among groups. Built with React frontend and Cloudflare Workers backend in a monorepo structure.

## Quick Start

```bash
# Install dependencies
npm run install:all

# Start development server (Cloudflare Workers + D1)
npm run dev
```

The app will run on:

- **Frontend**: http://localhost:5173 (Vite dev server)
- **Backend API**: http://localhost:3001 (Wrangler local dev)

**Development Setup**: Frontend uses Vite's proxy to forward `/api/*` requests to the backend, eliminating CORS issues.

## Features

- Create a split with a shareable link
- No account setup required
- **Automatic data expiration** (24 hours)
- Everyone adds their name and expenses
- Automatic calculation when everyone is done
- Euro currency only
- Production-ready deployment configuration
- **Repository pattern** for clean architecture

## Deployment

For deployment using Cloudflare Workers and D1 database, see **[CLOUDFLARE.md](./CLOUDFLARE.md)**.

This provides:
- Free tier with generous limits (100K requests/day)
- Global edge deployment
- Zero infrastructure management
- SQLite-compatible D1 database

## Configuration

### Environment Variables

#### Server (wrangler.toml)

```toml
[vars]
ENVIRONMENT = "production"
MAX_PARTICIPANTS = "50"
MAX_EXPENSES = "500"
MAX_TOTAL_SPLITS = "10000"
SPLIT_EXPIRY_HOURS = "24"
```

#### Client Configuration (Vite Proxy)

The client uses Vite's proxy configuration for development:

```javascript
// client/vite.config.js
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

**Environment Variables (Client):**

```bash
# For production deployment only
VITE_API_BASE_URL=https://your-api-domain.com/api
```

**Note**: No environment variables needed for local development - the proxy handles all API routing automatically.

See [CLOUDFLARE.md](./CLOUDFLARE.md) for deployment instructions.

## Architecture

### Technology Stack

| Component | Technology |
|-----------|-----------|
| Frontend | React + Vite |
| Backend | Hono (Cloudflare Workers) |
| Database | D1 (SQLite) |
| Entry point | `server/src/index.js` |
| Repository | `D1SplitRepository` |

### Data Storage

**Cloudflare D1** (SQLite):
- `splits` - Split metadata
- `participants` - Participants with foreign key to splits
- `expenses` - Expenses with foreign keys to splits and participants

## Testing

The application includes comprehensive test coverage:

- **Unit Tests**: Repository pattern, utilities, validation, sanitization
- **Integration Tests**: API endpoints, data flow
- **Mocking**: Uses mocked D1 database for isolated testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

## License

This project is open source and available under the [MIT License](LICENSE).
