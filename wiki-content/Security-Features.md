# Security Features

This application includes comprehensive security measures to protect against common web vulnerabilities.

## Input Validation

### Name Validation
- **Max length**: 100 characters
- **XSS protection**: Sanitized against cross-site scripting
- **Type checking**: Validated for correct data types

### Description Validation
- **Max length**: 200 characters
- **XSS protection**: Sanitized against cross-site scripting
- **Type checking**: Validated for correct data types

### Amount Validation
- **Positive values only**: Must be greater than 0
- **Maximum limit**: €1,000,000
- **No NaN values**: Strict numeric validation
- **Type checking**: All inputs validated for correct data types

## Rate Limiting

### API Rate Limiting
- **Limit**: 100 requests per 15 minutes per IP address
- **Protection**: Prevents abuse and DoS attacks
- **Scope**: Applied to all API endpoints

### Client Polling
- **Interval**: Client polls every 5 seconds
- **Purpose**: Reduces server load while maintaining real-time updates

## Resource Limits

### Participant Limits
- **Maximum participants**: 50 per split
- **Purpose**: Prevents memory exhaustion

### Expense Limits
- **Maximum expenses**: 500 per split
- **Purpose**: Prevents performance degradation

### Request Size Limits
- **Body size**: Limited to 10KB
- **Purpose**: Prevents large payload attacks

## Security Headers

### Helmet.js Integration
- **Content Security Policy (CSP)**: Prevents XSS attacks
- **X-XSS-Protection**: Browser XSS filtering
- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME sniffing
- **Referrer-Policy**: Controls referrer information

### CORS Configuration
- **Restricted origins**: Only configured origins allowed
- **Methods**: Limited to required HTTP methods
- **Headers**: Controlled header access

### HTTPS Enforcement
- **Production redirect**: Automatic HTTPS redirect in production
- **Secure cookies**: Cookies marked as secure in production

## Data Management

### Auto-Expiration
- **Cleanup interval**: Splits automatically deleted after 24 hours
- **Memory management**: Prevents memory leaks
- **Privacy protection**: Ensures data doesn't persist indefinitely

### XSS Protection
- **Library**: Uses the `xss` library for sanitization
- **Scope**: All user inputs are sanitized
- **Whitelist approach**: Only safe HTML tags and attributes allowed

### Secure ID Generation
- **Split IDs**: 12-character nanoid for uniqueness and security
- **Participant/Expense IDs**: 10-character nanoid
- **Unpredictable**: Cryptographically secure random generation

## Error Handling

### Generic Error Messages
- **No internal details**: Error messages don't expose system internals
- **User-friendly**: Clear, actionable error messages for users
- **Security**: Prevents information disclosure

### Server-Side Logging
- **Detailed logging**: Full error details logged server-side only
- **Monitoring**: Enables proper debugging without exposing details
- **Audit trail**: Maintains security event logs

### Graceful Degradation
- **Fallback behavior**: Application continues to function with reduced features
- **User experience**: Clear feedback when features are unavailable
- **Stability**: Prevents complete application failure

## API Security

### Endpoint Protection
- All endpoints validate input parameters
- Error responses are standardized and safe
- No sensitive information in error messages

### Data Sanitization
- Input sanitization on all user-provided data
- Output encoding to prevent injection attacks
- Validation of all data types and formats

## Best Practices Implemented

- **Principle of least privilege**: Minimal permissions and access
- **Defense in depth**: Multiple layers of security controls
- **Input validation**: All inputs validated and sanitized
- **Output encoding**: All outputs properly encoded
- **Error handling**: Secure error handling and logging
- **Resource limits**: Prevents resource exhaustion attacks
