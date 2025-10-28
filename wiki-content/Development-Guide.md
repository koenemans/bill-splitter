# Development Guide

## 🔧 Code Quality Standards

### ESLint Rules
- **Client**: React-specific rules with hooks validation
- **Server**: Node.js best practices and security rules
- **Both**: No console statements in production code

### Code Formatting
- Prettier with consistent configuration
- Single quotes, semicolons, 2-space indentation
- Automatic formatting on save (recommended)

### Testing Standards
- Minimum 70% code coverage
- Jest with jsdom for client, node for server
- Coverage reports in multiple formats (HTML, LCOV, Cobertura)

### Bundle Size Limits
- JavaScript: 500KB (gzipped)
- CSS: 50KB (gzipped)
- Total: 600KB (gzipped)

## 🚦 CI/CD Pipeline

The GitHub Actions workflow runs on every PR and includes:

1. **Setup**: Install and cache dependencies
2. **Security Audit**: Check for vulnerabilities in all components
3. **Linting**: ESLint and Prettier checks
4. **Testing**: Run tests on Node.js 18 and 20
5. **Building**: Build application and check bundle size
6. **Status Check**: Comprehensive status reporting

### Workflow Jobs
- `setup` - Dependency installation and caching
- `security-audit` - Security vulnerability scanning
- `lint` - Code quality and formatting checks
- `test` - Unit and integration tests
- `build` - Application building and size analysis
- `pr-checks-complete` - Final status aggregation

## 🛠 Development Workflow

### Before Committing
```bash
# Format and fix code
npm run format
npm run lint:fix

# Run tests
npm test

# Check everything is working
npm run build
```

### Creating a PR
1. Ensure all code quality checks pass locally
2. Create PR against `main` branch
3. Wait for CI/CD pipeline to complete
4. Address any failing checks
5. Request review once all checks pass

## 📊 Monitoring

### Coverage Reports
- Generated in `coverage/` directories
- Available as CI artifacts
- HTML reports for detailed analysis

### Bundle Analysis
- Size limits enforced in CI
- Warnings for bundles > 10MB
- Detailed size breakdown in build logs

### Security
- npm audit on all components
- Dependency vulnerability scanning
- Console statement detection

## 🔍 Troubleshooting

### Common Issues

**ESLint Errors**
```bash
npm run lint:fix  # Auto-fix most issues
```

**Formatting Issues**
```bash
npm run format    # Auto-format all files
```

**Test Failures**
```bash
npm run test:watch  # Run tests in watch mode for debugging
```

**Bundle Size Warnings**
- Check for large dependencies
- Use dynamic imports for code splitting
- Analyze bundle with build tools

### Getting Help
- Check CI logs for detailed error messages
- Run commands locally to reproduce issues
- Ensure all dependencies are installed correctly

## 📁 Detailed Project Structure

```
bill-splitter/
├── client/                 # React frontend
│   ├── src/
│   ├── .eslintrc.js       # Client-specific ESLint config
│   ├── jest.config.js     # Client Jest configuration
│   └── package.json
├── server/                 # Express backend
│   ├── .eslintrc.js       # Server-specific ESLint config
│   ├── jest.config.js     # Server Jest configuration
│   └── package.json
├── .github/workflows/      # CI/CD workflows
├── .prettierrc            # Prettier configuration
├── .size-limit.json       # Bundle size limits
└── package.json           # Root package.json
```
