const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const passport = require('passport');
const setupPassport = require('./passportConfig');
const routes = require('./web');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json()); 

mongoose.connect('mongodb://127.0.0.1:27017/myapp')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'your-secret',  
  resave: false,
  saveUninitialized: false
}));

setupPassport(); 
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use('/', routes);

app.listen(3001, () => {
  console.log('Server running at http://localhost:3001');
});