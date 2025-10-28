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

## 📚 Documentation

**All detailed documentation has been moved to the [GitHub Wiki](../../wiki).**

### Quick Links
- **[Getting Started](../../wiki/Getting-Started)** - Installation and setup
- **[Development Guide](../../wiki/Development-Guide)** - Development workflow and standards
- **[Testing Documentation](../../wiki/Testing-Documentation)** - Test suite and coverage
- **[Deployment Guide](../../wiki/Deployment-Guide)** - Production deployment
- **[Security Features](../../wiki/Security-Features)** - Security measures and best practices
- **[API Documentation](../../wiki/API-Documentation)** - REST API endpoints
- **[Coding Standards](../../wiki/Coding-Standards)** - Code quality guidelines

## 🏗 Project Structure

```
bill-splitter/
├── client/                 # React frontend
├── server/                 # Express.js backend
├── Dockerfile             # Docker container configuration
├── deploy.json           # Deployment configuration
├── web.config            # Azure Windows App Service (optional)
└── package.json          # Monorepo orchestrator
```

## 🛠 Development Commands

```bash
npm run dev          # Start both client and server
npm run client:dev   # Start only the client
npm run server:dev   # Start only the server
npm run build        # Build for production
npm test             # Run tests
npm run lint         # Run linting
npm run format       # Format code
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
      - "3001:3001"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

### Azure App Service Deployment

For Azure App Service on Linux:
- Use the Dockerfile for container deployment
- Set startup command to: `npm start`
- The `web.config` file is not needed for Linux App Service

## 🤝 Contributing

Please refer to our [Development Guide](../../wiki/Development-Guide) and [Coding Standards](../../wiki/Coding-Standards) in the wiki for detailed information on contributing to this project.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
