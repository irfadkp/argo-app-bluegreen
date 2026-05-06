const { Product } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

exports.getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20, category, search } = req.query;
    const offset = (page - 1) * limit;

    logger.info('Fetching products', {
      page,
      limit,
      category,
      search,
      ip: req.ip
    });

    const where = {};
    
    if (category) {
      where.category = category;
    }
    
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: products } = await Product.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    logger.debug('Products fetched successfully', {
      count,
      page,
      returnedProducts: products.length
    });

    res.json({
      products,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    logger.error('Get products error', {
      error: error.message,
      stack: error.stack,
      query: req.query
    });
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.debug('Fetching product by ID', { productId: id, ip: req.ip });
    
    const product = await Product.findByPk(id);

    if (!product) {
      logger.warn('Product not found', { productId: id, ip: req.ip });
      return res.status(404).json({ error: 'Product not found' });
    }

    logger.debug('Product fetched successfully', {
      productId: id,
      productName: product.name
    });

    res.json({ product });
  } catch (error) {
    logger.error('Get product error', {
      error: error.message,
      productId: req.params.id
    });
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

exports.getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    logger.info('Fetching products by category', {
      category,
      page,
      limit,
      ip: req.ip
    });

    const { count, rows: products } = await Product.findAndCountAll({
      where: { category },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    logger.debug('Products by category fetched', {
      category,
      count,
      returnedProducts: products.length
    });

    res.json({
      products,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    logger.error('Get products by category error', {
      error: error.message,
      category: req.params.category
    });
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, stock_quantity, image_url, category } = req.body;

    logger.info('Creating new product', {
      name,
      category,
      price,
      stock_quantity,
      userId: req.user?.id,
      ip: req.ip
    });

    const product = await Product.create({
      name,
      description,
      price,
      stock_quantity,
      image_url,
      category
    });

    logger.info('Product created successfully', {
      productId: product.id,
      name: product.name,
      userId: req.user?.id
    });

    res.status(201).json({ product });
  } catch (error) {
    logger.error('Create product error', {
      error: error.message,
      stack: error.stack,
      productData: req.body
    });
    res.status(500).json({ error: 'Failed to create product' });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    logger.info('Updating product', {
      productId: id,
      updates,
      userId: req.user?.id,
      ip: req.ip
    });

    const product = await Product.findByPk(id);
    if (!product) {
      logger.warn('Product not found for update', { productId: id });
      return res.status(404).json({ error: 'Product not found' });
    }

    await product.update(updates);
    
    logger.info('Product updated successfully', {
      productId: id,
      name: product.name,
      userId: req.user?.id
    });

    res.json({ product });
  } catch (error) {
    logger.error('Update product error', {
      error: error.message,
      productId: req.params.id
    });
    res.status(500).json({ error: 'Failed to update product' });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    logger.info('Deleting product', {
      productId: id,
      userId: req.user?.id,
      ip: req.ip
    });

    const product = await Product.findByPk(id);
    if (!product) {
      logger.warn('Product not found for deletion', { productId: id });
      return res.status(404).json({ error: 'Product not found' });
    }

    const productName = product.name;
    await product.destroy();
    
    logger.info('Product deleted successfully', {
      productId: id,
      productName,
      userId: req.user?.id
    });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    logger.error('Delete product error', {
      error: error.message,
      productId: req.params.id
    });
    res.status(500).json({ error: 'Failed to delete product' });
  }
};

exports.getCategories = async (req, res) => {
  try {
    logger.debug('Fetching product categories', { ip: req.ip });

    const categories = await Product.findAll({
      attributes: ['category'],
      group: ['category'],
      where: {
        category: { [Op.ne]: null }
      }
    });

    const categoryList = categories.map(p => p.category).filter(Boolean);
    
    logger.debug('Categories fetched successfully', {
      count: categoryList.length,
      categories: categoryList
    });

    res.json({ categories: categoryList });
  } catch (error) {
    logger.error('Get categories error', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

// Made with Bob
