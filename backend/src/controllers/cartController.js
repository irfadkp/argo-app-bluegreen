const { CartItem, Product } = require('../models');
const logger = require('../utils/logger');

exports.getCart = async (req, res) => {
  try {
    logger.debug('Fetching cart', {
      userId: req.user.id,
      email: req.user.email
    });

    const cartItems = await CartItem.findAll({
      where: { user_id: req.user.id },
      include: [{
        model: Product,
        as: 'product',
        attributes: ['id', 'name', 'price', 'image_url', 'stock_quantity']
      }],
      order: [['created_at', 'DESC']]
    });

    // Calculate total
    const total = cartItems.reduce((sum, item) => {
      return sum + (parseFloat(item.product.price) * item.quantity);
    }, 0);

    logger.debug('Cart fetched successfully', {
      userId: req.user.id,
      itemCount: cartItems.length,
      total: total.toFixed(2)
    });

    res.json({
      items: cartItems,
      total: total.toFixed(2),
      count: cartItems.length
    });
  } catch (error) {
    logger.error('Get cart error', {
      error: error.message,
      userId: req.user.id
    });
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
};

exports.addToCart = async (req, res) => {
  try {
    const { product_id, quantity } = req.body;

    logger.info('Adding item to cart', {
      userId: req.user.id,
      productId: product_id,
      quantity,
      ip: req.ip
    });

    // Check if product exists and has enough stock
    const product = await Product.findByPk(product_id);
    if (!product) {
      logger.warn('Add to cart failed - product not found', {
        productId: product_id,
        userId: req.user.id
      });
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.stock_quantity < quantity) {
      logger.warn('Add to cart failed - insufficient stock', {
        productId: product_id,
        requestedQuantity: quantity,
        availableStock: product.stock_quantity,
        userId: req.user.id
      });
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    // Check if item already in cart
    let cartItem = await CartItem.findOne({
      where: {
        user_id: req.user.id,
        product_id
      }
    });

    if (cartItem) {
      // Update quantity
      const newQuantity = cartItem.quantity + quantity;
      if (product.stock_quantity < newQuantity) {
        logger.warn('Add to cart failed - insufficient stock for update', {
          productId: product_id,
          currentQuantity: cartItem.quantity,
          requestedQuantity: quantity,
          newQuantity,
          availableStock: product.stock_quantity,
          userId: req.user.id
        });
        return res.status(400).json({ error: 'Insufficient stock' });
      }
      cartItem.quantity = newQuantity;
      await cartItem.save();
      
      logger.info('Cart item quantity updated', {
        cartItemId: cartItem.id,
        productId: product_id,
        newQuantity,
        userId: req.user.id
      });
    } else {
      // Create new cart item
      cartItem = await CartItem.create({
        user_id: req.user.id,
        product_id,
        quantity
      });
      
      logger.info('New item added to cart', {
        cartItemId: cartItem.id,
        productId: product_id,
        quantity,
        userId: req.user.id
      });
    }

    // Fetch with product details
    const cartItemWithProduct = await CartItem.findByPk(cartItem.id, {
      include: [{
        model: Product,
        as: 'product',
        attributes: ['id', 'name', 'price', 'image_url', 'stock_quantity']
      }]
    });

    res.status(201).json({ item: cartItemWithProduct });
  } catch (error) {
    logger.error('Add to cart error', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id,
      productId: req.body.product_id
    });
    res.status(500).json({ error: 'Failed to add item to cart' });
  }
};

exports.updateCartItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    logger.info('Updating cart item', {
      cartItemId: id,
      newQuantity: quantity,
      userId: req.user.id,
      ip: req.ip
    });

    const cartItem = await CartItem.findOne({
      where: {
        id,
        user_id: req.user.id
      },
      include: [{
        model: Product,
        as: 'product'
      }]
    });

    if (!cartItem) {
      logger.warn('Update cart item failed - item not found', {
        cartItemId: id,
        userId: req.user.id
      });
      return res.status(404).json({ error: 'Cart item not found' });
    }

    // Check stock
    if (cartItem.product.stock_quantity < quantity) {
      logger.warn('Update cart item failed - insufficient stock', {
        cartItemId: id,
        productId: cartItem.product_id,
        requestedQuantity: quantity,
        availableStock: cartItem.product.stock_quantity,
        userId: req.user.id
      });
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    const oldQuantity = cartItem.quantity;
    cartItem.quantity = quantity;
    await cartItem.save();

    logger.info('Cart item updated successfully', {
      cartItemId: id,
      productId: cartItem.product_id,
      oldQuantity,
      newQuantity: quantity,
      userId: req.user.id
    });

    res.json({ item: cartItem });
  } catch (error) {
    logger.error('Update cart item error', {
      error: error.message,
      cartItemId: req.params.id,
      userId: req.user.id
    });
    res.status(500).json({ error: 'Failed to update cart item' });
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    const { id } = req.params;

    logger.info('Removing item from cart', {
      cartItemId: id,
      userId: req.user.id,
      ip: req.ip
    });

    const cartItem = await CartItem.findOne({
      where: {
        id,
        user_id: req.user.id
      }
    });

    if (!cartItem) {
      logger.warn('Remove from cart failed - item not found', {
        cartItemId: id,
        userId: req.user.id
      });
      return res.status(404).json({ error: 'Cart item not found' });
    }

    const productId = cartItem.product_id;
    await cartItem.destroy();
    
    logger.info('Item removed from cart successfully', {
      cartItemId: id,
      productId,
      userId: req.user.id
    });

    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    logger.error('Remove from cart error', {
      error: error.message,
      cartItemId: req.params.id,
      userId: req.user.id
    });
    res.status(500).json({ error: 'Failed to remove item from cart' });
  }
};

exports.clearCart = async (req, res) => {
  try {
    logger.info('Clearing cart', {
      userId: req.user.id,
      ip: req.ip
    });

    const deletedCount = await CartItem.destroy({
      where: { user_id: req.user.id }
    });

    logger.info('Cart cleared successfully', {
      userId: req.user.id,
      itemsRemoved: deletedCount
    });

    res.json({ message: 'Cart cleared successfully' });
  } catch (error) {
    logger.error('Clear cart error', {
      error: error.message,
      userId: req.user.id
    });
    res.status(500).json({ error: 'Failed to clear cart' });
  }
};

// Made with Bob
