const mongoose = require('mongoose');
const slugify = require('slugify');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, unique: true },
  price: { type: Number, required: true },
  description: { type: String }, 
  image:  String,
  images: [{ type: String }],
  sizes: [{ type: String }],
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  status: { type: String, default: 'Live' },
}, { timestamps: true });

productSchema.pre('save', function (next) {
  if (this.isModified('name') || this.isNew) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
