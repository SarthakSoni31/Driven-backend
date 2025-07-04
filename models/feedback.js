const { default: mongoose } = require("mongoose")

const feedbackSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    },
    email: {
    type: String,
    required: true,
    },
    phone: {
    type: String,
    required: true,
    },
    formtype: {
    type: String,
    required: true,
    },
    consent: {
    type: Boolean,
    default: false,
    },
    createdAt: {
    type: Date,
    default: Date.now,
    },
    content: {
    type: String,
    }
});

const Feedback = mongoose.model('Feedback', feedbackSchema);
module.exports = Feedback;