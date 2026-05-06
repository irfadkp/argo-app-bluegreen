# Logging Implementation Guide

## Overview

This document describes the comprehensive logging implementation added to both the backend and frontend services of the e-commerce application.

## Backend Logging (Node.js/Express)

### Logger Utility

**Location:** `backend/src/utils/logger.js`

The backend uses **Winston** as the logging library, providing structured logging with multiple transports and log levels.

#### Features:
- **Log Levels:** DEBUG, INFO, WARN, ERROR
- **Multiple Transports:**
  - Console output (formatted for development/production)
  - File logging (`logs/combined.log`, `logs/error.log`)
  - Exception and rejection handlers
- **Structured Logging:** JSON format with metadata
- **Log Rotation:** 5MB max file size, 5 files retained
- **Environment-aware:** Different log levels for dev/production

#### Configuration:
```javascript
// Development: DEBUG level, colorized console output
// Production: INFO level, JSON format
```

### Implementation Areas

#### 1. Server Initialization (`backend/src/server.js`)
- Application startup logging
- Middleware initialization tracking
- Database connection status
- Health check endpoint logging
- Graceful shutdown logging
- Error handling with context

#### 2. Authentication Middleware (`backend/src/middleware/auth.js`)
- Authentication attempts (success/failure)
- Token validation errors
- Admin access control logging
- User identification in logs

#### 3. Controllers

**Auth Controller (`backend/src/controllers/authController.js`):**
- User registration attempts and outcomes
- Login attempts (success/failure)
- Logout events
- Token generation
- User session management

**Product Controller (`backend/src/controllers/productController.js`):**
- Product queries with filters
- Product CRUD operations
- Category management
- Stock validation
- Admin actions tracking

**Cart Controller (`backend/src/controllers/cartController.js`):**
- Cart operations (add, update, remove, clear)
- Stock validation during cart operations
- Quantity changes tracking
- User cart activity

**Order Controller (`backend/src/controllers/orderController.js`):**
- Order creation with transaction tracking
- Stock updates during order processing
- Order status changes
- Payment processing (when implemented)
- Order retrieval and filtering

### Log Format

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "info",
  "service": "ecommerce-backend",
  "message": "User logged in successfully",
  "userId": 123,
  "email": "user@example.com",
  "ip": "192.168.1.1"
}
```

### Installation

Add Winston to your backend:
```bash
cd backend
npm install winston
```

### Log Files Location

```
backend/
├── logs/
│   ├── combined.log      # All logs
│   ├── error.log         # Error logs only
│   ├── exceptions.log    # Uncaught exceptions
│   └── rejections.log    # Unhandled promise rejections
```

**Note:** The `logs/` directory is created automatically. Add it to `.gitignore`.

## Frontend Logging (React)

### Logger Utility

**Location:** `frontend/src/utils/logger.js`

The frontend uses a custom logger class that provides structured logging for browser environments.

#### Features:
- **Log Levels:** DEBUG, INFO, WARN, ERROR
- **Environment-aware:** Different levels for dev/production
- **Structured Output:** Consistent format with metadata
- **Specialized Methods:**
  - `logApiRequest()` - API request logging
  - `logApiResponse()` - API response logging
  - `logApiError()` - API error logging
  - `logUserAction()` - User interaction tracking
  - `logNavigation()` - Route change tracking
  - `logPerformance()` - Performance metrics
  - `logComponentMount/Unmount()` - Component lifecycle

#### Configuration:
```javascript
// Development: DEBUG level (all logs)
// Production: WARN level (warnings and errors only)
```

### Implementation Areas

#### 1. API Service (`frontend/src/services/api.js`)
- Request interceptor logging
- Response interceptor logging
- Error tracking with full context
- Authentication failures
- API endpoint tracking

#### 2. Auth Context (`frontend/src/context/AuthContext.jsx`)
- User login/logout events
- Registration attempts
- Session restoration
- Token management
- User action tracking

#### 3. Cart Context (`frontend/src/context/CartContext.jsx`)
- Cart operations (add, update, remove, clear)
- Cart fetching
- User shopping behavior
- Error handling

#### 4. App Component (`frontend/src/App.jsx`)
- Application initialization
- Route change tracking
- Performance metrics (page load time)
- Navigation logging

### Log Format

```javascript
{
  timestamp: "2024-01-15T10:30:45.123Z",
  level: "INFO",
  service: "ecommerce-frontend",
  message: "User logged in successfully",
  userId: 123,
  email: "user@example.com",
  userAgent: "Mozilla/5.0...",
  url: "https://example.com/login"
}
```

### Browser Console Output

Development mode shows colorized, formatted logs:
```
[INFO] User logged in successfully { userId: 123, email: "user@example.com" }
```

## Best Practices

### What to Log

✅ **DO Log:**
- Authentication events (login, logout, registration)
- Authorization failures
- API requests/responses (with sanitized data)
- Database operations
- Business logic events (orders, payments)
- Errors with full context
- Performance metrics
- User actions (for analytics)

❌ **DON'T Log:**
- Passwords or sensitive credentials
- Full credit card numbers
- Personal identification numbers
- API keys or secrets
- Full user session tokens

### Log Levels Guide

- **DEBUG:** Detailed information for debugging (dev only)
- **INFO:** General informational messages (user actions, successful operations)
- **WARN:** Warning messages (deprecated features, recoverable errors)
- **ERROR:** Error messages (failures, exceptions)

### Security Considerations

1. **Sanitize Sensitive Data:** Never log passwords, tokens, or PII
2. **Use Structured Logging:** Makes parsing and analysis easier
3. **Implement Log Rotation:** Prevent disk space issues
4. **Secure Log Files:** Restrict access to log files in production
5. **Monitor Logs:** Set up alerts for critical errors

## Monitoring and Analysis

### Backend Logs

View logs in real-time:
```bash
# All logs
tail -f backend/logs/combined.log

# Errors only
tail -f backend/logs/error.log

# Filter by level
grep "ERROR" backend/logs/combined.log
```

### Frontend Logs

Open browser DevTools Console to view logs. In production, consider:
- Sending errors to a service like Sentry or LogRocket
- Using browser's Performance API for metrics
- Implementing custom error boundaries

## Integration with Monitoring Tools

### Recommended Tools

**Backend:**
- **Instana** (already integrated) - APM and tracing
- **ELK Stack** - Log aggregation and analysis
- **Datadog** - Full-stack monitoring
- **Grafana + Loki** - Log visualization

**Frontend:**
- **Sentry** - Error tracking
- **LogRocket** - Session replay
- **Google Analytics** - User behavior
- **New Relic Browser** - Performance monitoring

### Example: Sending Frontend Errors to External Service

Modify `frontend/src/utils/logger.js`:

```javascript
error(message, meta = {}) {
  // ... existing code ...
  
  if (import.meta.env.MODE === 'production') {
    // Send to error tracking service
    if (window.Sentry) {
      Sentry.captureException(new Error(message), {
        extra: meta
      });
    }
  }
}
```

## Testing Logs

### Backend

```bash
# Start server
npm run dev

# Trigger various operations and check logs
curl http://localhost:3000/api/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

### Frontend

```javascript
// In browser console
import logger from './utils/logger';
logger.info('Test log', { test: true });
```

## Maintenance

### Log Rotation

Backend logs automatically rotate when they reach 5MB. To manually clean old logs:

```bash
cd backend/logs
rm *.log.1 *.log.2 *.log.3 *.log.4 *.log.5
```

### Performance Impact

- **Backend:** Winston is highly optimized; minimal impact
- **Frontend:** Console logging has negligible impact in production (WARN level only)

## Troubleshooting

### Backend Logs Not Appearing

1. Check if `logs/` directory exists
2. Verify file permissions
3. Check log level configuration
4. Ensure Winston is installed: `npm list winston`

### Frontend Logs Not Showing

1. Check browser console settings
2. Verify log level (production shows WARN+ only)
3. Check for console.log filtering in DevTools

## Future Enhancements

- [ ] Implement log streaming to external services
- [ ] Add request ID tracking across services
- [ ] Implement distributed tracing
- [ ] Add custom metrics and dashboards
- [ ] Implement log sampling for high-traffic scenarios
- [ ] Add user session tracking across requests
- [ ] Implement audit logging for compliance

## Summary

This comprehensive logging implementation provides:
- **Visibility:** Track all important events and errors
- **Debugging:** Detailed context for troubleshooting
- **Monitoring:** Real-time insights into application health
- **Analytics:** User behavior and performance metrics
- **Security:** Audit trail for compliance and security

The logging system is production-ready and can be easily integrated with enterprise monitoring solutions.

---

**Last Updated:** 2024-01-15
**Version:** 1.0.0