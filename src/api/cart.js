const express = require('express');
const router = express.Router();
const Cart = require('../../models/cart');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

router.get('/', async (req, res) => {
  try {
    const { user } = req.query;

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const cart = await Cart.findOne({ user })
      .populate({
        path: 'items.productId',
        select: 'name price image slug'
      });

    if (!cart) {
      return res.json({
        success: true,
        cartItems: [],
        message: 'Cart is empty'
      });
    }

    res.json({
      success: true,
      cartItems: cart.items.map(item => ({
        _id: item._id,
        product: item.productId ? {
          _id: item.productId._id,
          name: item.productId.name,
          price: item.productId.price,
          image: item.productId.image,
          slug: item.productId.slug
        } : null,
        quantity: item.quantity,
        size: item.size
      }))
    });
  } catch (err) {
    console.error('Error fetching cart:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cart'
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const { productId, quantity = 1, size, user } = req.body;
    if (!productId || !user) {
      return res.status(400).json({
        success: false,
        error: 'Product ID and user ID are required'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product ID format'
      });
    }


    let cart = await Cart.findOne({ user }).populate('items.productId');

    if (!cart) {
      cart = await Cart.create({
        _id: uuidv4(),
        user,
        items: [{ productId: productId, quantity, size }]
      });
    } else {
      const existingItem = cart.items.find(item => {
        if (!item.productId) return false;
        
        return item.productId.equals(productId) && 
               item.size === size;
      });

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        cart.items.push({ productId: productId, quantity, size });
      }
      
      await cart.save();
    }

    const updatedCart = await Cart.findOne({ user })
      .populate({
        path: 'items.productId',
        select: 'name price image slug'
      });

    res.json({
      success: true,
      cart: updatedCart,
      cartItems: updatedCart.items.map(item => ({
        _id: item._id,
        product: item.productId ? {
          _id: item.productId._id,
          name: item.productId.name,
          price: item.productId.price,
          image: item.productId.image,
          slug: item.productId.slug
        } : null,
        quantity: item.quantity,
        size: item.size
      }))
    });

  } catch (err) {
    console.error('Error adding to cart:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to update cart',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

router.put('/:itemId', async (req, res) => {
  try {
    const { quantity, user } = req.body;
    const { itemId } = req.params;

    // Validate input
    if (!user || !itemId || quantity === undefined) {
      return res.status(400).json({
        success: false,
        error: 'User ID, item ID and quantity are required'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid item ID format'
      });
    }

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        error: 'Quantity must be at least 1'
      });
    }

    const cart = await Cart.findOne({ user })
      .populate('items.productId');

    if (!cart) {
      return res.status(404).json({
        success: false,
        error: 'Cart not found'
      });
    }

    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found in cart'
      });
    }

    item.quantity = quantity;
    await cart.save();

    res.json({
      success: true,
      message: 'Quantity updated',
      cartItem: {
        _id: item._id,
        product: item.productId ? {
          _id: item.productId._id,
          name: item.productId.name,
          price: item.productId.price,
          image: item.productId.image,
          slug: item.productId.slug
        } : null,
        quantity: item.quantity,
        size: item.size
      }
    });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to update quantity'
    });
  }
});

// Remove item from cart
router.delete('/:itemId', async (req, res) => {
  try {
    const { user } = req.query;
    const { itemId } = req.params;

    // Validate input
    if (!user || !itemId) {
      return res.status(400).json({
        success: false,
        error: 'User ID and item ID are required'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid item ID format'
      });
    }

    const cart = await Cart.findOne({ user });
    if (!cart) {
      return res.status(404).json({
        success: false,
        error: 'Cart not found'
      });
    }

    const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Item not found in cart'
      });
    }

    cart.items.splice(itemIndex, 1);
    await cart.save();

    res.json({
      success: true,
      message: 'Item removed successfully',
      remainingItems: cart.items.length
    });
  } catch (err) {
    console.error('Error deleting cart item:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to remove item'
    });
  }
});

module.exports = router;