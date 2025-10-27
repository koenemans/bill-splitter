# Bill Splitter

A lightweight application for splitting bills among groups.

## Features
- Create a split with a shareable link
- No account setup required
- In-memory storage (no database)
- Everyone adds their name and expenses
- Automatic calculation when everyone is done
- Euro currency only

## Setup

```bash
npm install
npm run dev
```

The app will run on:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

### Environment Configuration (Optional)

For production deployments, create a `.env` file:

```bash
NODE_ENV=production
ALLOWED_ORIGIN=https://yourdomain.com
PORT=3001
```

See `.env.example` for all available configuration options.

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

For production deployment:

1. Set `NODE_ENV=production`
2. Configure `ALLOWED_ORIGIN` to your frontend domain
3. Use HTTPS (the app will auto-redirect)
4. Consider using a reverse proxy (nginx) for additional security
5. Monitor server logs for security events
6. Regularly update dependencies for security patches
