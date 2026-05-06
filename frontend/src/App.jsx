import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { Navigate, Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import CartPage from './pages/CartPage';
import { CartProvider } from './context/CartContext';
import CheckoutPage from './pages/CheckoutPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import Navbar from './components/Navbar';
import OrdersPage from './pages/OrdersPage';
import ProductDetailPage from './pages/ProductDetailPage';
import ProtectedRoute from './components/ProtectedRoute';
import RegisterPage from './pages/RegisterPage';
import logger from './utils/logger';
import { useEffect } from 'react';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

// Component to track route changes
function RouteTracker() {
  const location = useLocation();
  
  useEffect(() => {
    logger.logNavigation(document.referrer, location.pathname);
    logger.debug('Route changed', {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash
    });
  }, [location]);
  
  return null;
}

function App() {
  useEffect(() => {
    logger.info('Application initialized', {
      environment: import.meta.env.MODE,
      version: '1.0.0'
    });
    
    // Log performance metrics
    if (window.performance) {
      const perfData = window.performance.timing;
      const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
      logger.logPerformance('page_load', pageLoadTime);
    }
    
    return () => {
      logger.debug('Application unmounting');
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <CartProvider>
          <Router>
            <RouteTracker />
            <Navbar />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/products/:id" element={<ProductDetailPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              
              <Route
                path="/cart"
                element={
                  <ProtectedRoute>
                    <CartPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/checkout"
                element={
                  <ProtectedRoute>
                    <CheckoutPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders"
                element={
                  <ProtectedRoute>
                    <OrdersPage />
                  </ProtectedRoute>
                }
              />
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

// Made with Bob
