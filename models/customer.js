const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zip: { type: String, required: true },
  country: { type: String, default: 'India' },
  isDefault: { type: Boolean, default: false }
});

const customerSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId },
  email: { type: String, required: true, unique: true },
  phone: String,
  name: String,
  createdAt: { type: Date, default: Date.now },
  addresses: [addressSchema],
  defaultAddress: { type: mongoose.Schema.Types.ObjectId } 
});

customerSchema.pre('save', function (next) {
  if (!this.customerId) {
    this.customerId = this._id;
  }
  next();
});

const Customer = mongoose.model('Customer', customerSchema);
module.exports = Customer;
