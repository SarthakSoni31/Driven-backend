const express = require('express');
const router = express.Router();
const Customer = require('../../models/customer');

router.get('/:customerId', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.customerId);
    
    if (!customer) {
      return res.status(404).json({ 
        success: false,
        message: 'Customer not found',
        addresses: [] 
      });
    }

    res.json({ 
      success: true,
      addresses: customer.addresses || [] 
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      addresses: [] 
    });
  }
});

router.post('/:customerId', async (req, res) => {
  try {
    const { street, city, state, zip, country, isDefault } = req.body;
    const customerId = req.params.customerId;

    if (!street || !city || !state || !zip) {
      return res.status(400).json({ message: 'Missing required address fields' });
    }

    const newAddress = {
      street,
      city,
      state,
      zip,
      country: country || 'India',
      isDefault: isDefault || false
    };

    if (isDefault) {
      await Customer.updateOne(
        { _id: customerId, 'addresses.isDefault': true },
        { $set: { 'addresses.$.isDefault': false } }
      );
    }

    const customer = await Customer.findByIdAndUpdate(
      customerId,
      { $push: { addresses: newAddress } },
      { new: true }
    );

    if (isDefault) {
      const addedAddress = customer.addresses[customer.addresses.length - 1];
      await Customer.findByIdAndUpdate(
        customerId,
        { $set: { defaultAddress: addedAddress._id } }
      );
    }

    res.status(201).json(customer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:customerId/addresses/:addressId', async (req, res) => {
  try {
    const { street, city, state, zip, country, isDefault } = req.body;
    const { customerId, addressId } = req.params;

    if (isDefault) {
      await Customer.updateOne(
        { _id: customerId, 'addresses.isDefault': true },
        { $set: { 'addresses.$.isDefault': false } }
      );
    }

    const update = {};
    if (street) update['addresses.$.street'] = street;
    if (city) update['addresses.$.city'] = city;
    if (state) update['addresses.$.state'] = state;
    if (zip) update['addresses.$.zip'] = zip;
    if (country) update['addresses.$.country'] = country;
    if (isDefault !== undefined) update['addresses.$.isDefault'] = isDefault;

    const customer = await Customer.findOneAndUpdate(
      { _id: customerId, 'addresses._id': addressId },
      { $set: update },
      { new: true }
    );

    if (isDefault) {
      await Customer.findByIdAndUpdate(
        customerId,
        { $set: { defaultAddress: addressId } }
      );
    }

    if (!customer) {
      return res.status(404).json({ message: 'Customer or address not found' });
    }

    res.json(customer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:customerId/addresses/:addressId', async (req, res) => {
  try {
    const { customerId, addressId } = req.params;

    const customer = await Customer.findById(customerId);
    const isDefault = customer.defaultAddress?.equals(addressId);

    const updatedCustomer = await Customer.findByIdAndUpdate(
      customerId,
      { $pull: { addresses: { _id: addressId } } },
      { new: true }
    );

    if (isDefault && updatedCustomer.addresses.length > 0) {
      const newDefault = updatedCustomer.addresses[0]._id;
      await Customer.findByIdAndUpdate(
        customerId,
        { $set: { defaultAddress: newDefault, 'addresses.0.isDefault': true } }
      );
    } else if (isDefault) {
      await Customer.findByIdAndUpdate(
        customerId,
        { $unset: { defaultAddress: '' } }
      );
    }

    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:customerId/addresses/:addressId/set-default', async (req, res) => {
  try {
    const { customerId, addressId } = req.params;

    await Customer.updateOne(
      { _id: customerId, 'addresses.isDefault': true },
      { $set: { 'addresses.$.isDefault': false } }
    );

    const customer = await Customer.findOneAndUpdate(
      { _id: customerId, 'addresses._id': addressId },
      { 
        $set: { 
          'addresses.$.isDefault': true,
          defaultAddress: addressId
        } 
      },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({ message: 'Customer or address not found' });
    }

    res.json(customer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;