
const mongoose = require('mongoose');
const slugify = require('slugify');
const Blog = require('../models/blogs');

mongoose.connect('mongodb://127.0.0.1:27017/myapp')
  .then(async () => {
    const blogs = await Blog.find({ slug: { $exists: false } });

    for (let blog of blogs) {
      let baseSlug = slugify(blog.title, { lower: true, strict: true });
      let finalSlug = baseSlug;
      let count = 1;

      while (await Blog.findOne({ slug: finalSlug, _id: { $ne: blog._id } })) {
        finalSlug = `${baseSlug}-${count++}`;
      }

      blog.slug = finalSlug;
      await blog.save();
      console.log(`Updated slug for: ${blog.title}`);
    }

    console.log(' All slugs updated');
    mongoose.disconnect();
  })
  .catch(err => {
    console.error(' Error:', err);
    mongoose.disconnect();
  });
