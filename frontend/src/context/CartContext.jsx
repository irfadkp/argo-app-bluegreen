import { createContext, useContext, useEffect, useState } from 'react';

import { API_ENDPOINTS } from '../config/api';
import api from '../services/api';
import logger from '../utils/logger';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({ items: [], total: 0, count: 0 });
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    logger.debug('CartProvider mounted');
    
    if (isAuthenticated) {
      logger.debug('User authenticated, fetching cart');
      fetchCart();
    } else {
      logger.debug('User not authenticated, clearing cart');
      setCart({ items: [], total: 0, count: 0 });
    }
  }, [isAuthenticated]);

  const fetchCart = async () => {
    try {
      setLoading(true);
      logger.debug('Fetching cart data');
      
      const response = await api.get(API_ENDPOINTS.CART);
      setCart(response.data);
      
      logger.info('Cart fetched successfully', {
        itemCount: response.data.count,
        total: response.data.total
      });
    } catch (error) {
      logger.error('Fetch cart error', {
        error: error.message,
        response: error.response?.data
      });
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (productId, quantity = 1) => {
    try {
      logger.info('Adding item to cart', { productId, quantity });
      
      await api.post(API_ENDPOINTS.CART_ITEMS, {
        product_id: productId,
        quantity
      });
      
      await fetchCart();
      
      logger.info('Item added to cart successfully', { productId, quantity });
      logger.logUserAction('add_to_cart', { productId, quantity });
      
      return { success: true };
    } catch (error) {
      logger.error('Add to cart failed', {
        productId,
        quantity,
        error: error.message,
        response: error.response?.data
      });
      
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to add to cart'
      };
    }
  };

  const updateCartItem = async (itemId, quantity) => {
    try {
      logger.info('Updating cart item', { itemId, quantity });
      
      await api.put(API_ENDPOINTS.CART_ITEM(itemId), { quantity });
      await fetchCart();
      
      logger.info('Cart item updated successfully', { itemId, quantity });
      logger.logUserAction('update_cart_item', { itemId, quantity });
      
      return { success: true };
    } catch (error) {
      logger.error('Update cart item failed', {
        itemId,
        quantity,
        error: error.message,
        response: error.response?.data
      });
      
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update cart'
      };
    }
  };

  const removeFromCart = async (itemId) => {
    try {
      logger.info('Removing item from cart', { itemId });
      
      await api.delete(API_ENDPOINTS.CART_ITEM(itemId));
      await fetchCart();
      
      logger.info('Item removed from cart successfully', { itemId });
      logger.logUserAction('remove_from_cart', { itemId });
      
      return { success: true };
    } catch (error) {
      logger.error('Remove from cart failed', {
        itemId,
        error: error.message,
        response: error.response?.data
      });
      
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to remove from cart'
      };
    }
  };

  const clearCart = async () => {
    try {
      logger.info('Clearing cart');
      
      await api.delete(API_ENDPOINTS.CART);
      setCart({ items: [], total: 0, count: 0 });
      
      logger.info('Cart cleared successfully');
      logger.logUserAction('clear_cart');
      
      return { success: true };
    } catch (error) {
      logger.error('Clear cart failed', {
        error: error.message,
        response: error.response?.data
      });
      
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to clear cart'
      };
    }
  };

  const value = {
    cart,
    loading,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    refreshCart: fetchCart
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

// Made with Bob
