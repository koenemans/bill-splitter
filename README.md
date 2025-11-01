# Bill Splitter

A lightweight full-stack application for splitting bills among groups. Built with React frontend and Express.js backend in a monorepo structure with Redis for scalable data persistence.

## 🚀 Quick Start

```bash
# Install dependencies
npm run install:all

# Start backend API and Redis with Docker
docker-compose up -d

# Start frontend separately
cd client && npm run dev
```

The app will run on:

- **Frontend**: http://localhost:5173 (Vite dev server)
- **Backend API**: http://localhost:3001 (Docker container)
- **Redis**: localhost:6379 (Docker container)

**Development Setup**: Frontend uses Vite's proxy to forward `/api/*` requests to the Docker backend, eliminating CORS issues.

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

## 🏗 Project Structure

```
bill-splitter/
├── client/               # React frontend
├── server/               # Express.js backend
│   ├── repositories/     # Data access layer
│   │   ├── SplitRepository.js     # Repository interface
│   │   └── RedisSplitRepository.js # Redis implementation
│   └── utils/            # Utilities (logger, anonymizer)
├── docker-compose.yml    # Redis + application setup
├── Dockerfile            # Docker container configuration
├── deploy.json           # Deployment configuration
├── web.config            # Windows App Service (optional)
├── client/vite.config.js # Vite configuration with API proxy
└── package.json          # Monorepo orchestrator
```

## 🛠 Development Setup

### Development Workflow

The application uses Vite's proxy to connect the frontend to the Docker backend:

**How it works:**
- Frontend runs on `http://localhost:5173` (Vite dev server)
- Backend runs on `http://localhost:3001` (Docker container)
- Vite proxy forwards `/api/*` requests to the Docker backend
- No CORS issues - browser only sees same-origin requests

**API requests:**
```javascript
// These are automatically proxied by Vite
fetch('/api/splits')           // → http://localhost:3001/api/splits
fetch('/api/splits/123')       // → http://localhost:3001/api/splits/123
```

### Commands

```bash
# Setup
npm run install:all      # Install all dependencies

# Development (Docker + Vite)
docker-compose up -d     # Start backend API and Redis
cd client && npm run dev # Start frontend with Vite proxy

# Stop Docker services
docker-compose down

# Testing
npm test                 # Run all tests
npm run test:coverage    # Run tests with coverage

# Code Quality
npm run lint             # Run linting
npm run format           # Format code
```

## 🐳 Docker Setup

Start the backend services with Docker Compose:

```bash
# Start backend API and Redis
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

**Services:**
- **Bill Splitter API**: http://localhost:3001
- **Redis**: localhost:6379
- **Health check**: http://localhost:3001/api/health

The frontend connects to the Docker backend through Vite's proxy configuration.

### Production Docker Setup

```bash
# Build the Docker image
docker build -t bill-splitter .

# Run the container (requires external Redis)
docker run -p 3001:3001 \
  -e REDIS_HOST=your-redis-host \
  -e REDIS_PORT=6379 \
  -e REDIS_PASSWORD=your-redis-password \
  bill-splitter
```

### Docker Compose Production

```yaml
version: '3.8'
services:
  bill-splitter:
    build: .
    ports:
      - '3001:3001'
    environment:
      - NODE_ENV=production
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  redis_data:
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
        changeOrigin: true
      }
    }
  }
})
```

**Environment Variables (Client):**
```bash
# For production deployment only
VITE_API_BASE_URL=https://your-api-domain.com/api
```

**Note**: No environment variables needed for local development - the proxy handles all API routing automatically.

### Cloud Deployment

The application is designed to work with any cloud provider that supports Docker containers:

- **Docker**: Use the included Dockerfile for container deployment
- **Redis**: Requires external Redis service (AWS ElastiCache, Azure Redis, etc.)
- **Startup command**: `npm start` (uses native Node.js process)
- **Environment variables**: Configure Redis connection for your cloud provider

**Process Management**: The application uses native Node.js processes. Most cloud platforms provide automatic restarts and process management.

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
