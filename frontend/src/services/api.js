import { API_BASE_URL } from '../config/api';
import axios from 'axios';
import logger from '../utils/logger';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

logger.info('API client initialized', { baseURL: API_BASE_URL });

// Request interceptor to add auth token and log requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log API request
    logger.logApiRequest(
      config.method?.toUpperCase(),
      config.url,
      config.data
    );
    
    return config;
  },
  (error) => {
    logger.error('API request interceptor error', {
      error: error.message
    });
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and log responses
api.interceptors.response.use(
  (response) => {
    // Log successful response
    logger.logApiResponse(
      response.config.method?.toUpperCase(),
      response.config.url,
      response.status,
      response.data
    );
    
    return response;
  },
  (error) => {
    // Log API error
    logger.logApiError(
      error.config?.method?.toUpperCase(),
      error.config?.url,
      error
    );
    
    if (error.response?.status === 401) {
      logger.warn('Unauthorized access - redirecting to login', {
        url: error.config?.url
      });
      
      // Clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export default api;

// Made with Bob
