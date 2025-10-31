# Bill Splitter

A lightweight full-stack application for splitting bills among groups. Built with React frontend and Express.js backend in a monorepo structure.

## 🚀 Quick Start

```bash
# Install all dependencies
npm run install:all

# Start development servers
npm run dev
```

The app will run on:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

## 📋 Features

- Create a split with a shareable link
- No account setup required
- In-memory storage (no database)
- Everyone adds their name and expenses
- Automatic calculation when everyone is done
- Euro currency only
- Production-ready deployment configuration
- Anonymized logging

## 🏗 Project Structure

```
bill-splitter/
├── client/               # React frontend
├── server/               # Express.js backend
├── Dockerfile            # Docker container configuration
├── deploy.json           # Deployment configuration
├── web.config            # Windows App Service (optional)
└── package.json          # Monorepo orchestrator
```

## 🛠 Development Commands

### Root Commands (Monorepo)

```bash
# Development
npm run dev              # Start both client and server
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

### Quick Docker Setup

```bash
# Build the Docker image
docker build -t bill-splitter .

# Run the container
docker run -p 3001:3001 bill-splitter
```

The application will be available at http://localhost:3001

### Docker Compose (Optional)

```yaml
version: '3.8'
services:
  bill-splitter:
    build: .
    ports:
      - '3001:3001'
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

### Cloud Deployment

The application is designed to work with any cloud provider that supports Docker containers:

- **Docker**: Use the included Dockerfile for container deployment
- **Startup command**: `npm start` (uses native Node.js process)
- **Environment variables**: Configure as needed for your cloud provider

**Process Management**: The application uses native Node.js processes. Most cloud platforms provide automatic restarts and process management.

### Logging

The application includes comprehensive logging:

- **Development**: Console logging with colors and simple format
- **Production**: File-based logging with structured JSON format
- **Log files**: `logs/error.log` and `logs/combined.log` (created automatically)
- **Log levels**: DEBUG, INFO, WARN, ERROR (configurable via `LOG_LEVEL` environment variable)

All API requests, errors, business events, and system metrics are automatically logged.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
