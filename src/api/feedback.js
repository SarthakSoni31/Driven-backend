const express = require('express');
const router = express.Router();
const Feedback = require('../../models/feedback');

router.get('/', async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 });

    const formatted = feedbacks.map(entry => ({
      name: entry.name,
      email: entry.email,
      phone: entry.phone,
      formtype: entry.formtype,
      content: entry.content,
      consent: entry.consent,
      createdAt: entry.createdAt
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching feedbacks:', err.message);
    res.status(500).json({ error: 'Failed to fetch feedbacks' });
  }
});

module.exports = router;
