# Bill Splitter

A lightweight full-stack application for splitting bills among groups. Built with React frontend and Express.js backend in a monorepo structure with Redis for scalable data persistence.

## 🚀 Quick Start

```bash
# Install all dependencies
npm run install:all

# Start development servers (includes Redis)
npm run dev
```

The app will run on:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Redis**: localhost:6379 (started automatically with Docker Compose)

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
└── package.json          # Monorepo orchestrator
```

## 🛠 Development Commands

### Root Commands (Monorepo)

```bash
# Development
npm run dev              # Start both client and server (includes Redis)
npm run client:dev       # Start only the client
npm run server:dev       # Start only the server

# Building & Production
npm run build            # Build client for production
npm start                # Start server in production
npm run server:start     # Start server in production
npm run client:build     # Build only the client

# Testing
npm test                 # Run all tests (server + client)
npm run test:coverage    # Run tests with coverage report

# Code Quality
npm run lint             # Run linting on both projects
npm run lint:fix         # Fix linting issues automatically
npm run format           # Format code with Prettier
npm run format:check     # Check code formatting

# Setup
npm run install:all      # Install dependencies for all projects
```

### Server Commands

```bash
cd server

# Development
npm run dev              # Start server in development mode
npm start                # Start server in production

# Testing
npm test                 # Run server tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage

# Code Quality
npm run lint             # Lint server code
npm run lint:fix         # Fix linting issues
npm run format           # Format server code
npm run format:check     # Check server code formatting
```

### Client Commands

```bash
cd client

# Development
npm run dev              # Start Vite dev server
npm run build            # Build for production
npm run preview          # Preview production build

# Testing
npm test                 # Run client tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage

# Code Quality
npm run lint             # Lint client code
npm run lint:fix         # Fix linting issues
npm run format           # Format client code
npm run format:check     # Check client code formatting
```

## 🐳 Docker Deployment

### Development with Docker Compose (Recommended)

```bash
# Start the application with Redis
docker-compose up

# Stop the services
docker-compose down
```

This includes:

- **Bill Splitter API** on port 3001
- **Redis** on port 6379
- Automatic networking between services
- Environment configuration

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
