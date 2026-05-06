const jwt = require('jsonwebtoken');
const { User } = require('../models');
const config = require('../config/app');
const logger = require('../utils/logger');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      logger.warn('Authentication failed - no token provided', {
        method: req.method,
        path: req.path,
        ip: req.ip
      });
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await User.findByPk(decoded.id);

    if (!user) {
      logger.warn('Authentication failed - user not found', {
        userId: decoded.id,
        method: req.method,
        path: req.path,
        ip: req.ip
      });
      return res.status(401).json({ error: 'User not found' });
    }

    logger.debug('User authenticated successfully', {
      userId: user.id,
      email: user.email,
      method: req.method,
      path: req.path
    });

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    logger.error('Authentication error', {
      error: error.message,
      method: req.method,
      path: req.path,
      ip: req.ip
    });
    res.status(401).json({ error: 'Invalid token' });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {});
    
    if (!req.user.is_admin) {
      logger.warn('Admin access denied - user is not admin', {
        userId: req.user.id,
        email: req.user.email,
        method: req.method,
        path: req.path,
        ip: req.ip
      });
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    logger.debug('Admin authenticated successfully', {
      userId: req.user.id,
      email: req.user.email,
      method: req.method,
      path: req.path
    });
    
    next();
  } catch (error) {
    logger.error('Admin authentication error', {
      error: error.message,
      method: req.method,
      path: req.path,
      ip: req.ip
    });
    res.status(401).json({ error: 'Authentication failed' });
  }
};

module.exports = { auth, adminAuth };

// Made with Bob
