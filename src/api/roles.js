const express = require('express');
const router = express.Router();
const Role = require('../../models/role');

router.get('/', async (req, res) => {
  try {
    const roles = await Role.find().sort({ name: 1 });

    const result = roles.map(role => ({
      _id: role._id,
      name: role.name,
      permissions: role.permissions
    }));

    res.json(result);
  } catch (err) {
    console.error('Error fetching roles:', err.message);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

module.exports = router;
