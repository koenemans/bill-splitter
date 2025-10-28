# Getting Started

This guide will help you set up the Bill Splitter application for development.

## Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0

## Installation

### Quick Setup
```bash
# Install all dependencies (root, server, and client)
npm run install:all

# Install development dependencies (linting, formatting)
./install-dev-deps.sh

# Start development servers (both frontend and backend)
npm run dev
```

The application will run on:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

### Individual Commands

```bash
# Server only
npm run server:dev

# Client only  
npm run client:dev

# Build client for production
npm run client:build

# Run tests
npm test
```

## Development Commands

### Code Quality
```bash
npm run lint         # Run ESLint on all components
npm run lint:fix     # Auto-fix ESLint issues
npm run format       # Format code with Prettier
npm run format:check # Check if code is properly formatted
```

### Testing
```bash
npm test             # Run all tests
npm run test:coverage # Run tests with coverage report
npm run test:watch   # Run tests in watch mode
```

### Building
```bash
npm run build        # Build the client application
npm start            # Start the production server
```

## Usage

1. Create a new split
2. Share the generated link with your group
3. Each person adds their name and expenses
4. Click "Done" when finished adding expenses
5. View the settlement calculation when everyone is done

## Next Steps

- Read the [Development Guide](Development-Guide) for detailed development workflow
- Check out [Testing Documentation](Testing-Documentation) for testing practices
- Review [Coding Standards](Coding-Standards) for code quality guidelines
