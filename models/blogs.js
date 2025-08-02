const mongoose = require('mongoose');
const slugify = require('slugify');

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    minlength: [5, 'Title must be at least 5 characters long'],
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    minlength: [20, 'Content must be at least 20 characters long'],
  },
  image: {
    type: String, 
    default: '',  
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  slug: {
    type: String,
    unique: true,
  },
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BlogCategory',
  }],
}, { timestamps: true });

blogSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

module.exports = mongoose.model('Blog', blogSchema);
