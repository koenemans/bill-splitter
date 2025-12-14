# Bill Splitter

A lightweight full-stack application for splitting bills among groups. Built with React frontend in a monorepo structure with two deployment options:

- **Cloudflare Workers + D1** (serverless, free tier available)
- **Docker + Redis** (self-hosted, traditional deployment)

## 🚀 Quick Start (Cloudflare Workers)

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

> **Alternative**: For Docker deployment with Redis, see [Quick Start (Docker)](#-docker-deployment).

## 📋 Features

- Create a split with a shareable link
- No account setup required
- **Automatic data expiration** (24 hours)
- Everyone adds their name and expenses
- Automatic calculation when everyone is done
- Euro currency only
- Production-ready deployment configuration
- Anonymized logging
- **Repository pattern** for clean architecture
- **Dual deployment options**: Cloudflare Workers or Docker

## ☁️ Cloudflare Deployment

For serverless deployment using Cloudflare Workers and D1 database, see **[CLOUDFLARE.md](./CLOUDFLARE.md)**.

This option provides:
- Free tier with generous limits (100K requests/day)
- Global edge deployment
- Zero infrastructure management
- SQLite-compatible D1 database

## 🐳 Docker Deployment

For self-hosted deployment using Docker and Redis, see **[DOCKER.md](./DOCKER.md)**.

**Quick start:**

```bash
docker-compose up -d
# Application available at http://localhost:3001
```

This option provides:
- Full control over infrastructure
- Redis-based persistence with automatic TTL
- PM2 process management
- Suitable for private/on-premise deployments

## ⚙️ Configuration

### Environment Variables

Configuration varies by deployment option:

#### Cloudflare Workers (wrangler.toml)

```toml
[vars]
ENVIRONMENT = "production"
MAX_PARTICIPANTS = "50"
MAX_EXPENSES = "500"
MAX_TOTAL_SPLITS = "10000"
SPLIT_EXPIRY_HOURS = "24"
```

#### Docker/Redis (.env)

```bash
REDIS_HOST=localhost          # Redis server host
REDIS_PORT=6379               # Redis server port
REDIS_PASSWORD=               # Redis password (optional)
REDIS_DB=0                    # Redis database number

NODE_ENV=development          # Environment (development/production)
LOG_LEVEL=info               # Logging level (debug/info/warn/error)
PORT=3001                    # Server port

# Limits
MAX_PARTICIPANTS=50          # Maximum participants per split
MAX_EXPENSES=500             # Maximum expenses per split
MAX_TOTAL_SPLITS=1000        # Maximum total active splits

# Data Expiration
SPLIT_EXPIRY_MS=86400000     # Split data TTL in milliseconds (24 hours)
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

**📚 See [CLOUDFLARE.md](./CLOUDFLARE.md) or [DOCKER.md](./DOCKER.md) for deployment instructions.**

## 🏛️ Architecture

### Dual Backend Architecture

The server supports two deployment targets with shared business logic:

| Component | Cloudflare Workers | Docker |
|-----------|-------------------|--------|
| Framework | Hono | Express.js |
| Database | D1 (SQLite) | Redis |
| Entry point | `server/src/index.js` | `server/index.js` |
| Repository | `D1SplitRepository` | `RedisSplitRepository` |

### Repository Pattern

Both implementations follow the repository pattern for clean data access:

```javascript
// Common interface
class SplitRepository {
  async create(split) { /* ... */ }
  async findById(id) { /* ... */ }
  async addParticipant(splitId, participant) { /* ... */ }
  // ... other methods
}

// Implementations
class D1SplitRepository extends SplitRepository { /* Cloudflare D1 */ }
class RedisSplitRepository extends SplitRepository { /* Redis */ }
```

### Data Storage

**Cloudflare D1** (SQLite):
- `splits` - Split metadata
- `participants` - Participants with foreign key to splits
- `expenses` - Expenses with foreign keys to splits and participants

**Redis**:
- `split:{id}` - Split metadata (Hash)
- `split:{id}:participants` - Participants (Set)
- `split:{id}:expenses` - Expenses (Set)
- `active_splits` - Active split IDs (Set)

### Logging

- **Cloudflare Workers**: Console logging (standard for Workers environment)
- **Docker**: Structured logging with Winston, file rotation, and anonymization

## 🧪 Testing

The application includes comprehensive test coverage for both deployment targets:

- **Unit Tests**: Repository pattern, utilities, validation, sanitization
- **Integration Tests**: API endpoints, data flow
- **Mocking**: Uses mocked databases for isolated testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
