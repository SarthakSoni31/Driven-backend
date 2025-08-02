const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const Otp = require('../../models/otp');
const Customer = require('../../models/customer');

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

router.post('/send-otp', async (req, res) => {
  const { email } = req.body.data;

  if (!email) return res.status(400).json({ message: 'Email is required' });
  const otp = generateOtp();

  try {
    await Otp.deleteMany({ email });
    await Otp.create({ email, otp });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'sarthaksoni311005@gmail.com',
        pass: 'vredexykqwoktqsx',
      },
    });

    await transporter.sendMail({
      from: 'Driven App <sarthaksoni311005@gmail.com>',
      to: email,
      subject: 'Your Driven OTP Code',
      text: `Your OTP is: ${otp}. Don't share it with anyone.`,
    });

    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    console.error('Error sending OTP:', err);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});

router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) return res.status(400).json({ message: 'Email and OTP required' });

  try {
    const record = await Otp.findOne({ email }).sort({ createdAt: -1 });

    if (!record) {
      return res.status(404).json({ success: false, message: 'OTP not found' });
    }

    if (record.otp === otp) {
      record.isVerified = true;
      await record.save();
      
      let customer = await Customer.findOneAndUpdate(
        { email },
        { email, name: email.split('@')[0] },
        { upsert: true, new: true }
      );

      return res.json({ 
        success: true, 
        message: 'OTP verified successfully',
        customer: {
          _id: customer._id,
          email: customer.email,
          name: customer.name
        }
      });
    } else {
      return res.status(401).json({ success: false, message: 'Invalid OTP' });
    }
  } catch (err) {
    console.error('Error verifying OTP:', err);
    res.status(500).json({ message: 'OTP verification failed' });
  }
});

module.exports = router;
