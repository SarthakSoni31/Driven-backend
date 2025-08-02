const express = require('express');
const router = express.Router();
const User = require('../../models/user');

router.get('/', async (req, res) => {
  try {
    const users = await User.find()
      .populate('role', 'name') 
      .sort({ createdAt: -1 });

    const result = users.map(user => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role?.name || 'No Role',
      createdAt: user.createdAt
    }));

    res.json(result);
  } catch (err) {
    console.error('Error fetching users:', err.message);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

module.exports = router;
