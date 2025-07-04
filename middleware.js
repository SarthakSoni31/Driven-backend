const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('./models/user');

const app = {
  userAuthentication: async function (req, res, next) {
    if (req.user && req.user.role && req.user.role.name === 'Admin') {
      return next();
    }
    return res.status(403).send('Forbidden: Admins only');
  },

  allowEditorAndAdmin: async function (req, res, next) {
    const roleName = req.user?.role?.name;
    if (roleName === 'Admin' || roleName === 'Editor') {
      return next();
    }
    return res.status(403).send('Forbidden: You do not have permission');
  },

  allowRoles: function (roles = []) {
    return function (req, res, next) {
      const roleName = req.user?.role?.name;
      if (roles.includes(roleName)) {
        return next();
      }
      return res.status(403).send('Forbidden: Role not allowed');
    };
  }
};

module.exports = app;
