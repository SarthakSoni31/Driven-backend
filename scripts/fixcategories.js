const mongoose = require('mongoose');
const slugify = require('slugify');
const Category = require('../models/categories');

mongoose.connect('mongodb://127.0.0.1:27017/myapp')
  .then(async () => {
    const categories = await Category.find({ slug: { $exists: false } });

    for (let category of categories) {
      let baseSlug = slugify(category.name, { lower: true, strict: true });
      let finalSlug = baseSlug;
      let count = 1;

      while (await Category.findOne({ slug: finalSlug, _id: { $ne: category._id } })) {
        finalSlug = `${baseSlug}-${count++}`;
      }

      category.slug = finalSlug;
      await category.save();
      console.log(`Updated slug for category: ${category.name} → ${finalSlug}`);
    }

    console.log('All category slugs updated');
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('Error:', err);
    mongoose.disconnect();
  });
