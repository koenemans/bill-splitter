# API Documentation

This document describes the REST API endpoints for the Bill Splitter application.

## Base URL
- **Development**: `http://localhost:3001/api`
- **Production**: `https://your-domain.com/api`

## Authentication
No authentication is required. The API uses split IDs and participant IDs for access control.

## Rate Limiting
- **Limit**: 100 requests per 15 minutes per IP address
- **Headers**: Rate limit information is included in response headers

## Endpoints

### Health Check

#### GET /health
Check if the API is running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2023-XX-XXTXX:XX:XX.XXXZ"
}
```

### Splits

#### POST /splits
Create a new split.

**Request Body:**
```json
{
  "name": "Weekend Trip"
}
```

**Response:**
```json
{
  "id": "abc123def456",
  "name": "Weekend Trip",
  "participants": [],
  "expenses": [],
  "createdAt": "2023-XX-XXTXX:XX:XX.XXXZ"
}
```

#### GET /splits/:id
Get split details.

**Parameters:**
- `id` (string): Split ID

**Response:**
```json
{
  "id": "abc123def456",
  "name": "Weekend Trip",
  "participants": [
    {
      "id": "part123456",
      "name": "John Doe",
      "done": false
    }
  ],
  "expenses": [
    {
      "id": "exp1234567",
      "participantId": "part123456",
      "description": "Hotel",
      "amount": 150.00
    }
  ],
  "createdAt": "2023-XX-XXTXX:XX:XX.XXXZ"
}
```

### Participants

#### POST /splits/:id/participants
Add a participant to a split.

**Parameters:**
- `id` (string): Split ID

**Request Body:**
```json
{
  "name": "John Doe"
}
```

**Response:**
```json
{
  "id": "part123456",
  "name": "John Doe",
  "done": false
}
```

#### PATCH /splits/:id/participants/:participantId/done
Mark a participant as done adding expenses.

**Parameters:**
- `id` (string): Split ID
- `participantId` (string): Participant ID

**Response:**
```json
{
  "success": true
}
```

#### PATCH /splits/:id/participants/:participantId/reset
Reset a participant's done status.

**Parameters:**
- `id` (string): Split ID
- `participantId` (string): Participant ID

**Response:**
```json
{
  "success": true
}
```

### Expenses

#### POST /splits/:id/expenses
Add an expense to a split.

**Parameters:**
- `id` (string): Split ID

**Request Body:**
```json
{
  "participantId": "part123456",
  "description": "Hotel",
  "amount": 150.00
}
```

**Response:**
```json
{
  "id": "exp1234567",
  "participantId": "part123456",
  "description": "Hotel",
  "amount": 150.00
}
```

#### DELETE /splits/:id/expenses/:expenseId
Delete an expense from a split.

**Parameters:**
- `id` (string): Split ID
- `expenseId` (string): Expense ID

**Response:**
```json
{
  "success": true
}
```

### Settlement

#### GET /splits/:id/settlement
Calculate the settlement for a split.

**Parameters:**
- `id` (string): Split ID

**Response:**
```json
{
  "balances": [
    {
      "participantId": "part123456",
      "name": "John Doe",
      "balance": -25.00
    },
    {
      "participantId": "part789012",
      "name": "Jane Smith",
      "balance": 25.00
    }
  ],
  "transactions": [
    {
      "from": "part123456",
      "fromName": "John Doe",
      "to": "part789012",
      "toName": "Jane Smith",
      "amount": 25.00
    }
  ]
}
```

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message description"
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `404` - Not Found
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

## Input Validation

### Name Fields
- **Maximum length**: 100 characters
- **Required**: Cannot be empty
- **Sanitized**: XSS protection applied

### Description Fields
- **Maximum length**: 200 characters
- **Required**: Cannot be empty
- **Sanitized**: XSS protection applied

### Amount Fields
- **Type**: Number
- **Minimum**: Greater than 0
- **Maximum**: 1,000,000
- **Precision**: Up to 2 decimal places

## Resource Limits
- **Maximum participants**: 50 per split
- **Maximum expenses**: 500 per split
- **Request body size**: 10KB maximum

## Data Retention
- Splits are automatically deleted after 24 hours
- No persistent storage is used (in-memory only)
