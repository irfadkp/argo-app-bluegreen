// Frontend Logger Utility
// Provides structured logging for the frontend application

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

class Logger {
  constructor() {
    // Set log level based on environment
    this.logLevel = import.meta.env.MODE === 'production' 
      ? LOG_LEVELS.WARN 
      : LOG_LEVELS.DEBUG;
    
    this.appName = 'ecommerce-frontend';
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    return {
      timestamp,
      level,
      service: this.appName,
      message,
      ...meta,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
  }

  shouldLog(level) {
    return LOG_LEVELS[level] >= this.logLevel;
  }

  debug(message, meta = {}) {
    if (!this.shouldLog('DEBUG')) return;
    
    const logData = this.formatMessage('DEBUG', message, meta);
    console.debug(`[DEBUG] ${message}`, logData);
  }

  info(message, meta = {}) {
    if (!this.shouldLog('INFO')) return;
    
    const logData = this.formatMessage('INFO', message, meta);
    console.info(`[INFO] ${message}`, logData);
  }

  warn(message, meta = {}) {
    if (!this.shouldLog('WARN')) return;
    
    const logData = this.formatMessage('WARN', message, meta);
    console.warn(`[WARN] ${message}`, logData);
  }

  error(message, meta = {}) {
    if (!this.shouldLog('ERROR')) return;
    
    const logData = this.formatMessage('ERROR', message, meta);
    console.error(`[ERROR] ${message}`, logData);
    
    // In production, you could send errors to a logging service
    if (import.meta.env.MODE === 'production') {
      // Example: Send to error tracking service
      // this.sendToErrorService(logData);
    }
  }

  // Log API requests
  logApiRequest(method, url, data = null) {
    this.debug('API Request', {
      method,
      url,
      data: data ? JSON.stringify(data) : null
    });
  }

  // Log API responses
  logApiResponse(method, url, status, data = null) {
    const level = status >= 400 ? 'error' : 'debug';
    this[level]('API Response', {
      method,
      url,
      status,
      data: data ? JSON.stringify(data) : null
    });
  }

  // Log API errors
  logApiError(method, url, error) {
    this.error('API Error', {
      method,
      url,
      error: error.message,
      stack: error.stack,
      response: error.response ? {
        status: error.response.status,
        data: JSON.stringify(error.response.data)
      } : null
    });
  }

  // Log user actions
  logUserAction(action, details = {}) {
    this.info('User Action', {
      action,
      ...details
    });
  }

  // Log navigation
  logNavigation(from, to) {
    this.debug('Navigation', {
      from,
      to
    });
  }

  // Log component lifecycle
  logComponentMount(componentName) {
    this.debug('Component Mounted', { component: componentName });
  }

  logComponentUnmount(componentName) {
    this.debug('Component Unmounted', { component: componentName });
  }

  // Performance logging
  logPerformance(metric, value, unit = 'ms') {
    this.info('Performance Metric', {
      metric,
      value,
      unit
    });
  }
}

// Create singleton instance
const logger = new Logger();

export default logger;

// Made with Bob