const jwt = require('jsonwebtoken');
const { User } = require('../models');
const config = require('../config/app');
const logger = require('../utils/logger');

const generateToken = (userId) => {
  logger.debug('Generating JWT token', { userId });
  return jwt.sign({ id: userId }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });
};

exports.register = async (req, res) => {
  try {
    const { email, password, first_name, last_name } = req.body;
    
    logger.info('User registration attempt', {
      email,
      first_name,
      last_name,
      ip: req.ip
    });

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      logger.warn('Registration failed - email already exists', { email, ip: req.ip });
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create user
    const user = await User.create({
      email,
      password_hash: password,
      first_name,
      last_name
    });

    logger.info('User registered successfully', {
      userId: user.id,
      email: user.email,
      ip: req.ip
    });

    // Generate token
    const token = generateToken(user.id);

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        is_admin: user.is_admin
      },
      token
    });
  } catch (error) {
    logger.error('Registration error', {
      error: error.message,
      stack: error.stack,
      ip: req.ip
    });
    res.status(500).json({ error: 'Registration failed' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    logger.info('User login attempt', { email, ip: req.ip });

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      logger.warn('Login failed - user not found', { email, ip: req.ip });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await user.checkPassword(password);
    if (!isValidPassword) {
      logger.warn('Login failed - invalid password', {
        userId: user.id,
        email,
        ip: req.ip
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    logger.info('User logged in successfully', {
      userId: user.id,
      email: user.email,
      ip: req.ip
    });

    // Generate token
    const token = generateToken(user.id);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        is_admin: user.is_admin
      },
      token
    });
  } catch (error) {
    logger.error('Login error', {
      error: error.message,
      stack: error.stack,
      ip: req.ip
    });
    res.status(500).json({ error: 'Login failed' });
  }
};

exports.getMe = async (req, res) => {
  try {
    logger.debug('Get user info request', {
      userId: req.user.id,
      email: req.user.email
    });
    
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        first_name: req.user.first_name,
        last_name: req.user.last_name,
        is_admin: req.user.is_admin
      }
    });
  } catch (error) {
    logger.error('Get user info error', {
      error: error.message,
      userId: req.user?.id
    });
    res.status(500).json({ error: 'Failed to get user info' });
  }
};

exports.logout = async (req, res) => {
  try {
    logger.info('User logout', {
      userId: req.user?.id,
      email: req.user?.email,
      ip: req.ip
    });
    
    // In a stateless JWT setup, logout is handled client-side
    // by removing the token. Here we just send a success response.
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error', {
      error: error.message,
      userId: req.user?.id
    });
    res.status(500).json({ error: 'Logout failed' });
  }
};

// Made with Bob
