const express = require('express');
const router = express.Router();
const Order = require('../../models/order');
const Customer = require('../../models/customer');

router.post('/', async (req, res) => {
  try {
    const { customerId, items, shippingAddressId, paymentMethod, totalAmount } = req.body;

    if (!customerId || !items || !shippingAddressId || !paymentMethod || !totalAmount) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const addressExists = customer.addresses.some(addr => addr._id.equals(shippingAddressId));
    if (!addressExists) {
      return res.status(400).json({ success: false, message: 'Invalid shipping address' });
    }

    const newOrder = new Order({
      customerId,
      items,
      shippingAddress: shippingAddressId,
      paymentMethod,
      totalAmount,
      status: 'Pending'
    });

    await newOrder.save();

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order: newOrder
    });

  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/:customerId', async (req, res) => {
  try {
    const orders = await Order.find({ customerId: req.params.customerId })
      .populate('items.productId', 'name image')
      .sort({ orderDate: -1 });

    res.json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


router.get('/:customerId/:orderId', async (req, res) => {
  try {
    const orders = await Order.find({ customerId: req.params.customerId.orderId })
      .populate('items.productId', 'name image')
      .sort({ orderDate: -1 });

    res.json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


router.post('/', async (req, res) => {
  try {
    const { customerId, items, shippingAddressId, paymentMethod, totalAmount } = req.body

    const requiredFields = { customerId, items, shippingAddressId, paymentMethod, totalAmount }
    for (const [field, value] of Object.entries(requiredFields)) {
      if (!value) return res.status(400).json({ 
        success: false, 
        message: `Missing required field: ${field}` 
      })
    }
    const customer = await Customer.findById(customerId)
    if (!customer) {
      return res.status(404).json({ 
        success: false, 
        message: 'Customer not found' 
      })
    }
    const addressExists = customer.addresses.some(addr => 
      addr._id.equals(shippingAddressId)
    )
    if (!addressExists) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid shipping address' 
      })
    }

    const newOrder = new Order({
      customerId,
      items: items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price
      })),
      shippingAddress: shippingAddressId,
      paymentMethod,
      totalAmount,
      status: 'Pending'
    })

    await newOrder.save()

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order: newOrder
    })

  } catch (error) {
    console.error('Order placement error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Server error during order placement',
      error: error.message 
    })
  }
})
module.exports = router;