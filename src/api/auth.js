const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Auth API is working' });
});

router.get('/check', (req, res) => {
  if (req.isAuthenticated()) {
    return res.json({ 
      authenticated: true, 
      user: req.user 
    });
  }
  res.json({ authenticated: false });
});

module.exports = router;