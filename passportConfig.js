const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('./models/user');

module.exports = function () {
  passport.use(new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password'
    },
    async (email, password, done) => {
      try {
        const foundUser = await User.findOne({ email });
        if (!foundUser) return done(null, false, { message: 'Invalid Email' });
        if (foundUser.password !== password) return done(null, false, { message: 'Invalid Password' });
        return done(null, foundUser);
      } catch (err) {
        return done(err);
      }
    }
  ));

  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id).populate('role');
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
};