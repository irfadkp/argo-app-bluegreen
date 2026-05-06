const { Order, OrderItem, CartItem, Product, User } = require('../models');
const sequelize = require('../config/database');
const logger = require('../utils/logger');

exports.getOrders = async (req, res) => {
  try {
    logger.debug('Fetching user orders', {
      userId: req.user.id,
      email: req.user.email
    });

    const orders = await Order.findAll({
      where: { user_id: req.user.id },
      include: [{
        model: OrderItem,
        as: 'items',
        include: [{
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'image_url']
        }]
      }],
      order: [['created_at', 'DESC']]
    });

    logger.debug('Orders fetched successfully', {
      userId: req.user.id,
      orderCount: orders.length
    });

    res.json({ orders });
  } catch (error) {
    logger.error('Get orders error', {
      error: error.message,
      userId: req.user.id
    });
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    logger.debug('Fetching order by ID', {
      orderId: id,
      userId: req.user.id
    });

    const order = await Order.findOne({
      where: {
        id,
        user_id: req.user.id
      },
      include: [{
        model: OrderItem,
        as: 'items',
        include: [{
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'image_url', 'price']
        }]
      }]
    });

    if (!order) {
      logger.warn('Order not found', {
        orderId: id,
        userId: req.user.id
      });
      return res.status(404).json({ error: 'Order not found' });
    }

    logger.debug('Order fetched successfully', {
      orderId: id,
      userId: req.user.id,
      itemCount: order.items?.length
    });

    res.json({ order });
  } catch (error) {
    logger.error('Get order error', {
      error: error.message,
      orderId: req.params.id,
      userId: req.user.id
    });
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};

exports.createOrder = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { shipping_address } = req.body;

    logger.info('Creating new order', {
      userId: req.user.id,
      email: req.user.email,
      shippingAddress: shipping_address,
      ip: req.ip
    });

    // Get cart items
    const cartItems = await CartItem.findAll({
      where: { user_id: req.user.id },
      include: [{
        model: Product,
        as: 'product'
      }],
      transaction
    });

    logger.debug('Cart items retrieved for order', {
      userId: req.user.id,
      cartItemCount: cartItems.length
    });

    if (cartItems.length === 0) {
      await transaction.rollback();
      logger.warn('Order creation failed - cart is empty', {
        userId: req.user.id
      });
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Check stock and calculate total
    let totalAmount = 0;
    for (const item of cartItems) {
      if (item.product.stock_quantity < item.quantity) {
        await transaction.rollback();
        logger.warn('Order creation failed - insufficient stock', {
          userId: req.user.id,
          productId: item.product_id,
          productName: item.product.name,
          requestedQuantity: item.quantity,
          availableStock: item.product.stock_quantity
        });
        return res.status(400).json({
          error: `Insufficient stock for ${item.product.name}`
        });
      }
      totalAmount += parseFloat(item.product.price) * item.quantity;
    }

    logger.debug('Stock validated and total calculated', {
      userId: req.user.id,
      totalAmount,
      itemCount: cartItems.length
    });

    // Create order
    const order = await Order.create({
      user_id: req.user.id,
      total_amount: totalAmount,
      shipping_address,
      status: 'pending'
    }, { transaction });

    logger.info('Order created', {
      orderId: order.id,
      userId: req.user.id,
      totalAmount,
      status: 'pending'
    });

    // Create order items and update stock
    for (const item of cartItems) {
      await OrderItem.create({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price_at_purchase: item.product.price
      }, { transaction });

      logger.debug('Order item created', {
        orderId: order.id,
        productId: item.product_id,
        quantity: item.quantity
      });

      // Update product stock
      await item.product.update({
        stock_quantity: item.product.stock_quantity - item.quantity
      }, { transaction });

      logger.debug('Product stock updated', {
        productId: item.product_id,
        oldStock: item.product.stock_quantity,
        newStock: item.product.stock_quantity - item.quantity
      });
    }

    // Clear cart
    const deletedCartItems = await CartItem.destroy({
      where: { user_id: req.user.id },
      transaction
    });

    logger.debug('Cart cleared after order creation', {
      userId: req.user.id,
      deletedItems: deletedCartItems
    });

    await transaction.commit();
    
    logger.info('Order transaction committed successfully', {
      orderId: order.id,
      userId: req.user.id
    });

    // Fetch complete order with items
    const completeOrder = await Order.findByPk(order.id, {
      include: [{
        model: OrderItem,
        as: 'items',
        include: [{
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'image_url']
        }]
      }]
    });

    logger.info('Order created successfully', {
      orderId: order.id,
      userId: req.user.id,
      totalAmount: order.total_amount,
      itemCount: completeOrder.items.length
    });

    res.status(201).json({ order: completeOrder });
  } catch (error) {
    await transaction.rollback();
    logger.error('Create order error', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id
    });
    res.status(500).json({ error: 'Failed to create order' });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    logger.info('Updating order status', {
      orderId: id,
      newStatus: status,
      userId: req.user?.id,
      ip: req.ip
    });

    const order = await Order.findByPk(id);
    if (!order) {
      logger.warn('Update order status failed - order not found', {
        orderId: id
      });
      return res.status(404).json({ error: 'Order not found' });
    }

    const oldStatus = order.status;
    order.status = status;
    await order.save();

    logger.info('Order status updated successfully', {
      orderId: id,
      oldStatus,
      newStatus: status,
      userId: req.user?.id
    });

    res.json({ order });
  } catch (error) {
    logger.error('Update order status error', {
      error: error.message,
      orderId: req.params.id
    });
    res.status(500).json({ error: 'Failed to update order status' });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    logger.info('Fetching all orders (admin)', {
      page,
      limit,
      status,
      userId: req.user?.id,
      ip: req.ip
    });

    const where = {};
    if (status) {
      where.status = status;
    }

    const { count, rows: orders } = await Order.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'first_name', 'last_name']
        },
        {
          model: OrderItem,
          as: 'items',
          include: [{
            model: Product,
            as: 'product',
            attributes: ['id', 'name']
          }]
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    logger.debug('All orders fetched successfully', {
      count,
      page,
      returnedOrders: orders.length
    });

    res.json({
      orders,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    logger.error('Get all orders error', {
      error: error.message,
      stack: error.stack,
      query: req.query
    });
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

// Made with Bob
