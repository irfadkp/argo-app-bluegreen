// Instana MUST be required first for proper instrumentation
require('./instana');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { sequelize } = require('./models');
const config = require('./config/app');
const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');

const app = express();

logger.info('Initializing Express application', {
  nodeEnv: config.nodeEnv,
  port: config.port
});

// Security middleware
app.use(helmet());
logger.debug('Helmet security middleware enabled');

// CORS configuration
app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));
logger.info('CORS configured', { origin: config.corsOrigin });

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);
logger.info('Rate limiting enabled', {
  windowMs: config.rateLimit.windowMs,
  maxRequests: config.rateLimit.max
});

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
logger.debug('Body parsing middleware enabled');

// Logging middleware - use Winston stream
app.use(morgan('combined', { stream: logger.stream }));
logger.debug('HTTP request logging enabled');

// Health check endpoints
app.get('/health/live', (req, res) => {
  logger.debug('Liveness check requested');
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/health/ready', async (req, res) => {
  try {
    await sequelize.authenticate();
    logger.debug('Readiness check passed - database connected');
    res.status(200).json({
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Readiness check failed - database disconnected', { error: error.message });
    res.status(503).json({
      status: 'not ready',
      database: 'disconnected',
      error: error.message
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
logger.info('API routes registered', {
  routes: ['/api/auth', '/api/products', '/api/cart', '/api/orders']
});

// Root endpoint
app.get('/', (req, res) => {
  logger.debug('Root endpoint accessed');
  res.json({
    message: 'E-commerce API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      cart: '/api/cart',
      orders: '/api/orders'
    }
  });
});

// 404 handler
app.use((req, res) => {
  logger.warn('Route not found', {
    method: req.method,
    path: req.path,
    ip: req.ip
  });
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    ip: req.ip
  });
  
  const status = err.status || 500;
  const message = config.nodeEnv === 'production'
    ? 'Internal server error'
    : err.message;
  
  res.status(status).json({
    error: message,
    ...(config.nodeEnv === 'development' && { stack: err.stack })
  });
});

// Database connection and server start
const startServer = async () => {
  try {
    logger.info('Starting server initialization...');
    
    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully', {
      dialect: sequelize.options.dialect,
      host: sequelize.options.host,
      database: sequelize.options.database
    });

    // Sync database (in production, use migrations instead)
    if (config.nodeEnv === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('Database synchronized in development mode');
    }

    // Start server
    app.listen(config.port, () => {
      logger.info(`Server running successfully`, {
        port: config.port,
        environment: config.nodeEnv,
        healthCheck: `http://localhost:${config.port}/health/live`
      });
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: initiating graceful shutdown');
  try {
    await sequelize.close();
    logger.info('Database connections closed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error: error.message });
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: initiating graceful shutdown');
  try {
    await sequelize.close();
    logger.info('Database connections closed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error: error.message });
    process.exit(1);
  }
});

startServer();

module.exports = app;

// Made with Bob
