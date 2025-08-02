const express = require('express');
const router = express.Router();
const Product = require('../../models/product');

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;  

    const totalProducts = await Product.countDocuments();

    const products = await Product.find().lean()
      .sort({ createdAt: -1 })
      .select("name slug price image images sizes")
         
    res.json({products:products});


  } catch (err) {
    console.error('Error fetching products:', err.message);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug })
      .populate('categories', 'name slug');

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
 
    res.json({
     product
    });

  } catch (err) {
    console.error('Error fetching product:', err.message);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

module.exports = router;
