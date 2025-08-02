const mongoose = require('mongoose');
const slugify = require('slugify');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  slug: {
    type: String,
    unique: true
  }
}, { timestamps: true });

categorySchema.pre('save', async function (next) {
  if (this.isModified('name') || this.isNew) {
    const baseSlug = slugify(this.name, { lower: true, strict: true });
    let slug = baseSlug;
    let count = 1;

    while (await mongoose.models.Category.findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${count++}`;
    }
    this.slug = slug;
  }
  next();
});

module.exports = mongoose.model('Category', categorySchema);
