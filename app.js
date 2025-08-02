const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const passport = require('passport');
const setupPassport = require('./passportConfig');
const cors = require('cors');
const routes = require('./web');

const blogApiRoutes = require('./src/api/blogs');
const categoryApiRoutes = require('./src/api/categories');
const productApiRoutes = require('./src/api/product');
const userApiRoutes = require('./src/api/users');
const feedbackApiRoutes = require('./src/api/feedback');
const roleApiRoutes = require('./src/api/roles');
const cartApiRoutes = require('./src/api/cart');
const otpRoutes = require('./src/api/otp');
const authRoutes = require('./src/api/auth');
const customerAddressRoutes = require('./src/api/customerAddress');
const orderRoutes = require('./src/api/order');

const app = express();

app.use(cors({
  origin: 'http://localhost:3002',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect('mongodb://127.0.0.1:27017/myapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));


app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: true, 
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: 'mongodb://127.0.0.1:27017/myapp',
    ttl: 14 * 24 * 60 * 60,
    autoRemove: 'native' 
  }),
  cookie: {
    httpOnly: true,
    secure: false, 
    sameSite: 'lax', 
    maxAge: 14 * 24 * 60 * 60 * 1000,
    domain: 'localhost' 
  }
}));

app.use((req, res, next) => {
  next();
});

setupPassport();
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/otp', otpRoutes);
app.use('/api/product', productApiRoutes);
app.use('/api/blogs', blogApiRoutes);
app.use('/api/categories', categoryApiRoutes);
app.use('/api/users', userApiRoutes);
app.use('/api/roles', roleApiRoutes);
app.use('/api/feedback', feedbackApiRoutes);
app.use('/api/cart', cartApiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/customerAddress', customerAddressRoutes);
app.use('/api/order', orderRoutes);


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use('/', routes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});