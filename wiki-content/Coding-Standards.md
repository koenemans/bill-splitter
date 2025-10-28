# Coding Standards

This document outlines the coding standards and best practices for the Bill Splitter application.

## Express.js Standards

### Middleware Organization
- Use proper middleware order: body parsers, custom middleware, routes, error handlers
- Organize routes using Express Router for modular code structure
- Create a centralized error handler middleware as the last middleware

### Async/Await Usage
- Use async/await with proper error handling and try/catch blocks
- Avoid callback hell by preferring promises and async/await
- Handle all promise rejections appropriately

### Configuration Management
- Use environment variables for configuration with a config module
- Never hardcode sensitive information in source code
- Provide sensible defaults for development environment

### Input Validation
- Implement request validation using libraries like express-validator
- Validate all input parameters, query strings, and request bodies
- Sanitize user inputs to prevent XSS and injection attacks

### Authentication & Authorization
- Use middleware for authentication and authorization
- Implement proper session management
- Follow security best practices for user authentication

### HTTP Standards
- Use appropriate HTTP status codes in responses
- Follow RESTful API design principles
- Provide consistent error response formats

## React Standards

### Component Architecture
- Use functional components with hooks instead of class components
- Prefer composition over inheritance
- Keep components small and focused on a single responsibility

### Custom Hooks
- Use custom hooks for reusable logic
- Extract complex state logic into custom hooks
- Share stateful logic between components using custom hooks

### State Management
- Use the Context API for state management when needed
- Keep state as local as possible
- Use useReducer for complex state logic

### Performance Optimization
- Use React.memo for performance optimization when necessary
- Implement proper list rendering with keys
- Use fragments to avoid unnecessary DOM elements

### Code Quality
- Use proper prop validation with PropTypes
- Follow consistent naming conventions
- Write self-documenting code with clear variable names

## General Standards

### Code Formatting
- Use Prettier with consistent configuration
- Single quotes, semicolons, 2-space indentation
- Automatic formatting on save (recommended)

### Linting Rules
- **Client**: React-specific rules with hooks validation
- **Server**: Node.js best practices and security rules
- **Both**: No console statements in production code

### Testing Requirements
- Minimum 70% code coverage
- Write unit tests for all business logic
- Use integration tests for API endpoints
- Mock external dependencies in tests

### Documentation
- Write clear, concise comments for complex logic
- Document API endpoints with proper specifications
- Keep README and documentation up to date

### Version Control
- Use meaningful commit messages
- Create feature branches for new development
- Use pull requests for code review

### Security Practices
- Validate and sanitize all user inputs
- Use parameterized queries to prevent SQL injection
- Implement proper error handling without exposing sensitive information
- Follow OWASP security guidelines

### Bundle Size Management
- JavaScript: 500KB (gzipped)
- CSS: 50KB (gzipped)
- Total: 600KB (gzipped)
- Use dynamic imports for code splitting when needed

## File Organization

### Directory Structure
```
src/
├── components/          # Reusable UI components
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── __tests__/          # Test files
└── styles/             # CSS and styling files
```

### Naming Conventions
- **Components**: PascalCase (e.g., `UserProfile.jsx`)
- **Hooks**: camelCase starting with 'use' (e.g., `useApi.js`)
- **Utilities**: camelCase (e.g., `formatCurrency.js`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_ENDPOINTS`)

### Import Organization
- External libraries first
- Internal modules second
- Relative imports last
- Group imports by type and separate with blank lines
