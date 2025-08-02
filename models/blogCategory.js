const mongoose = require('mongoose');

const blogCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, unique: true }
});

module.exports = mongoose.model('BlogCategory', blogCategorySchema);