const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    _id:String,
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Customer', 
    required: true 
  },
  items: [
    {
      productId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Product',
        required: true 
      },
      quantity: { 
        type: Number, 
        default: 1,
        min: 1
      },
      size: {
        type: String,
        required: false
      }
    },
  ],
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
});

const Cart = mongoose.model('Cart', cartSchema);
module.exports = Cart;