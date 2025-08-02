const mongoose = require('mongoose');
const slugify = require('slugify');
const Product = require('../models/product'); 

mongoose.connect('mongodb://127.0.0.1:27017/myapp')
  .then(async () => {
    const products = await Product.find({ slug: { $exists: false } });

    for (let product of products) {
      let baseSlug = slugify(product.name, { lower: true, strict: true });
      let finalSlug = baseSlug;
      let count = 1;

      while (await Product.findOne({ slug: finalSlug, _id: { $ne: product._id } })) {
        finalSlug = `${baseSlug}-${count++}`;
      }

      product.slug = finalSlug;
      await product.save();
      console.log(`Updated slug for product: ${product.name} → ${finalSlug}`);
    }

    console.log(' All product slugs updated');
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('Error:', err);
    mongoose.disconnect();
  });
