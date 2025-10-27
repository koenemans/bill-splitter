# Bill Splitter

A lightweight full-stack application for splitting bills among groups. Built with React frontend and Express.js backend in a monorepo structure.

## Features
- Create a split with a shareable link
- No account setup required
- In-memory storage (no database)
- Everyone adds their name and expenses
- Automatic calculation when everyone is done
- Euro currency only
- Production-ready deployment configuration

## Project Structure

```
bill-splitter/
├── client/                 # React frontend
│   ├── src/
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── server/                 # Express.js backend
│   ├── index.js
│   └── package.json
├── Dockerfile             # Container configuration
├── web.config            # Azure Web Apps configuration
├── deploy.json           # Deployment metadata
└── package.json          # Monorepo orchestrator
```

## Development Setup

### Prerequisites
- Node.js >= 18.0.0
- npm >= 8.0.0

### Installation
```bash
# Install all dependencies (root, server, and client)
npm run install:all

# Start development servers (both frontend and backend)
npm run dev
```

The app will run on:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

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

## Usage

1. Create a new split
2. Share the generated link with your group
3. Each person adds their name and expenses
4. Click "Done" when finished adding expenses
5. View the settlement calculation when everyone is done

## Security Features

This application includes comprehensive security measures:

### Input Validation
- **Name validation**: Max 100 characters, sanitized against XSS
- **Description validation**: Max 200 characters, sanitized against XSS
- **Amount validation**: Must be positive, max €1,000,000, no NaN values
- **Type checking**: All inputs are validated for correct data types

### Rate Limiting
- **API rate limit**: 100 requests per 15 minutes per IP address
- **Polling interval**: Client polls every 5 seconds (reduced server load)

### Resource Limits
- **Max participants**: 50 per split
- **Max expenses**: 500 per split
- **Request body size**: Limited to 10KB

### Security Headers
- **Helmet.js**: Comprehensive security headers (CSP, XSS protection, etc.)
- **CORS**: Restricted to configured origins only
- **HTTPS**: Automatic redirect in production

### Data Management
- **Auto-expiration**: Splits automatically deleted after 24 hours
- **XSS protection**: All user inputs sanitized using the `xss` library
- **Secure IDs**: 12-character nanoid for split IDs, 10-character for participants/expenses

### Error Handling
- **Generic error messages**: No internal details exposed to users
- **Server-side logging**: Detailed errors logged server-side only
- **Graceful degradation**: User-friendly error messages on failures

## Production Deployment

This application is ready for deployment to various platforms:

### Azure Web Apps

1. **Build and Deploy:**
   ```bash
   npm run build
   ```

2. **Environment Variables:**
   ```bash
   NODE_ENV=production
   PORT=8080  # Azure will set this automatically
   ALLOWED_ORIGIN=https://your-app-name.azurewebsites.net
   ```

3. **Deployment:** Use the included `web.config` for IIS configuration.

### Docker Deployment

1. **Build Image:**
   ```bash
   docker build -t bill-splitter .
   ```

2. **Run Container:**
   ```bash
   docker run -p 3001:3001 -e NODE_ENV=production bill-splitter
   ```

### Heroku Deployment

1. **Prepare:**
   ```bash
   # Heroku will automatically detect Node.js and run npm start
   ```

2. **Environment Variables:**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set ALLOWED_ORIGIN=https://your-app.herokuapp.com
   ```

### Manual Deployment

1. **Build:**
   ```bash
   npm run install:all
   npm run build
   ```

2. **Deploy:**
   - Copy `server/` directory to your server
   - Copy `client/dist/` to `server/public/`
   - Set environment variables
   - Run `npm start` in server directory

### Environment Configuration

Create appropriate `.env` files based on `.env.example`:

**Production Environment Variables:**
- `NODE_ENV=production`
- `PORT` (set by platform or 3001)
- `ALLOWED_ORIGIN` (your domain)

### Deployment Checklist

- [ ] Environment variables configured
- [ ] HTTPS enabled (required for production)
- [ ] CORS origin set to production domain
- [ ] Health check endpoint available at `/api/health`
- [ ] Static files served correctly
- [ ] Client-side routing working (SPA fallback)

### Platform-Specific Notes

**Azure Web Apps:**
- Uses `web.config` for IIS configuration
- Supports Node.js 18+ LTS
- Auto-scaling available

**Docker:**
- Multi-stage build for optimized image size
- Non-root user for security
- Health check included

**Heroku:**
- Uses `package.json` engines field
- Automatic buildpack detection
- Easy scaling and add-ons
