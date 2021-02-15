const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const mongoose = require('mongoose');
const Account = require('../models/Account');

passport.use(new LocalStrategy({
   usernameField: 'email',
   passwordField: 'password'
}, function (email, password, done) {
   Account.findOne({ email: email, status: 'approved' }).then((account) => {
      if (!account || !account.validPassword(password)) {
         return done(null, false, { errors: { 'email or password': 'is invalid' } });
      }
      return done(null, account);
   }).catch(done);
}));

