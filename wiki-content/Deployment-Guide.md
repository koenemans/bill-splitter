# Deployment Guide

This application is ready for deployment to various platforms.

## Azure Web Apps

### 1. Build and Deploy
```bash
npm run build
```

### 2. Environment Variables
```bash
NODE_ENV=production
PORT=8080  # Azure will set this automatically
ALLOWED_ORIGIN=https://your-app-name.azurewebsites.net
```

### 3. Deployment
Use the included `web.config` for IIS configuration.

### Platform-Specific Notes
- Uses `web.config` for IIS configuration
- Supports Node.js 18+ LTS
- Auto-scaling available

## Docker Deployment

### 1. Build Image
```bash
docker build -t bill-splitter .
```

### 2. Run Container
```bash
docker run -p 3001:3001 -e NODE_ENV=production bill-splitter
```

### Platform-Specific Notes
- Multi-stage build for optimized image size
- Non-root user for security
- Health check included

## Heroku Deployment

### 1. Prepare
```bash
# Heroku will automatically detect Node.js and run npm start
```

### 2. Environment Variables
```bash
heroku config:set NODE_ENV=production
heroku config:set ALLOWED_ORIGIN=https://your-app.herokuapp.com
```

### Platform-Specific Notes
- Uses `package.json` engines field
- Automatic buildpack detection
- Easy scaling and add-ons

## Manual Deployment

### 1. Build
```bash
npm run install:all
npm run build
```

### 2. Deploy
- Copy `server/` directory to your server
- Copy `client/dist/` to `server/public/`
- Set environment variables
- Run `npm start` in server directory

## Environment Configuration

Create appropriate `.env` files based on `.env.example`:

**Production Environment Variables:**
- `NODE_ENV=production`
- `PORT` (set by platform or 3001)
- `ALLOWED_ORIGIN` (your domain)

## Deployment Checklist

- [ ] Environment variables configured
- [ ] HTTPS enabled (required for production)
- [ ] CORS origin set to production domain
- [ ] Health check endpoint available at `/api/health`
- [ ] Static files served correctly
- [ ] Client-side routing working (SPA fallback)

## Health Check

The application includes a health check endpoint at `/api/health` that returns:
```json
{
  "status": "ok",
  "timestamp": "2023-XX-XXTXX:XX:XX.XXXZ"
}
```

## Performance Considerations

- Static files are served with appropriate caching headers
- Client-side routing is handled with SPA fallback
- Bundle size is optimized and monitored
- API responses are kept minimal for faster loading
