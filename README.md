# Bill Splitter

A lightweight full-stack application for splitting bills among groups. Built with React frontend and Express.js backend in a monorepo structure with Redis for scalable data persistence.

## 🚀 Quick Start

```bash
# Install dependencies
npm run install:all

# Start Redis in Docker
docker-compose up -d redis

# Start backend and frontend (with hot-reload)
npm run dev
```

The app will run on:

- **Frontend**: http://localhost:5173 (Vite dev server)
- **Backend API**: http://localhost:3001 (Node.js with hot-reload)
- **Redis**: localhost:6379 (Docker container)

**Development Setup**: Frontend uses Vite's proxy to forward `/api/*` requests to the backend, eliminating CORS issues.

## 📋 Features

- Create a split with a shareable link
- No account setup required
- **Redis-based persistence** with automatic expiration
- Everyone adds their name and expenses
- Automatic calculation when everyone is done
- Euro currency only
- Production-ready deployment configuration
- Anonymized logging
- **Repository pattern** for clean architecture
- **Automatic cleanup** of expired splits

## 🐳 Docker Deployment

For complete Docker deployment instructions, including production setup, PM2 configuration, monitoring, and cloud deployment guides, see **[DOCKER.md](./DOCKER.md)**.

**Quick start:**

```bash
docker-compose up -d
# Application available at http://localhost:3001
```

## ⚙️ Configuration

### Environment Variables

The server uses the following environment variables:

#### Redis Configuration

```bash
REDIS_HOST=localhost          # Redis server host
REDIS_PORT=6379               # Redis server port
REDIS_PASSWORD=               # Redis password (optional)
REDIS_DB=0                    # Redis database number
```

#### Application Configuration

```bash
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

**🐳 For Docker and cloud deployment instructions, see [DOCKER.md](./DOCKER.md)**

## 🏛️ Architecture

### Repository Pattern

The application uses a clean repository pattern for data access:

```javascript
// Interface for dependency inversion
class SplitRepository {
  async create(split) {
    /* ... */
  }
  async findById(id) {
    /* ... */
  }
  async addParticipant(splitId, participant) {
    /* ... */
  }
  // ... other methods
}

// Redis implementation
class RedisSplitRepository extends SplitRepository {
  // Redis-specific implementation with TTL, pipelines, etc.
}
```

### Data Storage

**Redis Structure:**

- `split:{id}` - Split metadata (Hash)
- `split:{id}:participants` - Participants (Set)
- `split:{id}:expenses` - Expenses (Set)
- `active_splits` - Active split IDs (Set)

**Features:**

- **Automatic TTL**: Splits expire after 24 hours
- **Pipeline Operations**: Atomic batch operations
- **Cleanup**: Automatic removal of expired split IDs
- **Health Monitoring**: Redis health checks

### Logging

The application includes comprehensive logging:

- **Development**: Console logging with colors and simple format
- **Production**: File-based logging with structured JSON format
- **Log files**: `logs/error.log` and `logs/combined.log` (created automatically)
- **Log levels**: DEBUG, INFO, WARN, ERROR (configurable via `LOG_LEVEL` environment variable)
- **Anonymization**: All personal data is anonymized in logs

All API requests, errors, business events, Redis operations, and system metrics are automatically logged.

## 🧪 Testing

The application includes comprehensive test coverage:

- **Unit Tests**: Repository pattern, utilities, API endpoints
- **Integration Tests**: Redis operations, data flow
- **Mock Redis**: Uses `ioredis-mock` for isolated testing
- **Coverage**: 100% coverage for critical components

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
