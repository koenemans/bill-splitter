# Bill Splitter Test Suite

This directory contains comprehensive tests for the Bill Splitter application.

## Test Coverage

### Backend API Tests (`server.test.js`)

Tests all API endpoints with various scenarios:

#### Split Management
- **POST /api/splits** - Create new split
- **GET /api/splits/:id** - Retrieve split details
- **GET /api/splits/:id** (404) - Handle non-existent splits

#### Participant Management
- **POST /api/splits/:id/participants** - Add participant
  - Valid participant addition
  - Empty name validation
  - Name length validation (max 100 chars)
  - XSS sanitization
  - Non-existent split handling
- **PATCH /api/splits/:id/participants/:participantId/done** - Mark participant as done
- **PATCH /api/splits/:id/participants/:participantId/reset** - Reset participant status

#### Expense Management
- **POST /api/splits/:id/expenses** - Add expense
  - Valid expense addition
  - Missing fields validation
  - Invalid amount validation (negative, zero, too large)
  - Description validation
  - Non-existent participant handling
  - XSS sanitization
- **DELETE /api/splits/:id/expenses/:expenseId** - Delete expense

#### Settlement Calculation
- **GET /api/splits/:id/settlement** - Calculate settlement
  - Not ready state (when participants aren't done)
  - Complex split calculation (3 people, unequal amounts)
  - Equal split calculation (no transactions needed)
  - Proper balance calculations
  - Transaction optimization

### Frontend Component Tests

#### Home Component (`Home.test.jsx`)
- Renders home page with title and button
- Displays all instruction steps
- Creates split and navigates on button click
- Shows loading state while creating split
- Handles API errors gracefully
- Handles network errors

#### Split Component (`Split.test.jsx`)
- Renders loading state initially
- Handles split not found (404)
- Renders split page with share link
- Copies link to clipboard
- Shows join form for new users
- Adds participants
- Displays expense form after joining
- Adds expenses
- Displays participants list with status
- Marks participants as done
- Displays settlement when all participants are done
- Restores participant from localStorage

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Generate coverage report
```bash
npm run test:coverage
```

## Test Structure

- **Backend tests** use Supertest to test API endpoints without starting a server
- **Frontend tests** use React Testing Library for component testing
- **Mocking** is used for:
  - `fetch` API calls
  - `localStorage`
  - `navigator.clipboard`
  - React Router's `useNavigate`

## Coverage Goals

The test suite aims to cover:
- ✅ All API endpoints
- ✅ All validation rules
- ✅ Security features (XSS sanitization, rate limiting setup)
- ✅ Error handling
- ✅ Settlement calculation algorithm
- ✅ User interactions
- ✅ Component rendering
- ✅ State management
- ✅ LocalStorage persistence

## Notes

- Tests use Jest with ES modules support
- Frontend tests require `jsdom` environment
- Backend tests use in-memory storage (Map) for isolation
- Each test suite is independent and can run in parallel
