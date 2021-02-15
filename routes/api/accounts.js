const router = require("express").Router();
const jwt = require("jsonwebtoken");
const passport = require("passport");
const crypto = require('crypto');
const sgMail = require('@sendgrid/mail');
const { secret, baseURL, sgKey } = require("../../config");
const Account = require('../../models/Account');
const AccountCompany = require("../../models/AccountCompany");
const auth = require('../auth');
const AppearanceSetting = require("../../models/Settings/AppearanceSetting");
const QuoteDefaultSetting = require("../../models/Settings/QuoteDefaultSetting");
const CustomerEmailSetting = require("../../models/Settings/CustomerEmailSetting");
sgMail.setApiKey(sgKey);

// Create new account -------------
router.post('/', async (req, res, next) => {
   const account = new Account();
   const { firstName, lastName, email, password, companyName, location } = req.body;

   account.firstName = firstName;
   account.lastName = lastName;
   account.email = email;
   account.role = true;
   account.setPassword(password);

   const accountCompany = new AccountCompany();
   accountCompany.owner = account;
   accountCompany.companyName = companyName;
   accountCompany.location = location;

   const appearanceSetting = new AppearanceSetting();
   const quoteDefaultSetting = new QuoteDefaultSetting();
   const customerEmailSetting = new CustomerEmailSetting();
   appearanceSetting.companyDisplayName = companyName;
   await appearanceSetting.save();
   await quoteDefaultSetting.save();
   await customerEmailSetting.save();
   accountCompany.appearanceSetting = appearanceSetting;
   accountCompany.quoteDefaultSetting = quoteDefaultSetting;
   accountCompany.customerEmailSetting = customerEmailSetting;

   // Set default before setting quick-start

   await accountCompany.createDefaultSalesTaxes();
   await accountCompany.createDefaultSalesCategory();
   accountCompany.save().then(() => {
      account.accountCompany = accountCompany._id;
      account.save().then(() => {
         const token = account.generateJWT(true);
         return res.json({
            accountCompany: accountCompany,
            account: account.toAuthJSON(),
            access_token: token
         });
      }).catch(next);
   }).catch(next);
});

// Update acccount
router.put('/', auth.required, function (req, res, next) {
   Account.findById(req.payload.id).then(function (account) {
      if (!account) { return res.sendStatus(401); }

      // only update fields that were actually passed...

      if (typeof req.body.firstName !== 'undefined') {
         account.firstName = req.body.firstName;
      }
      if (typeof req.body.lastName !== 'undefined') {
         account.lastName = req.body.lastName;
      }
      if (typeof req.body.email !== 'undefined') {
         account.email = req.body.email;
      }
      if (typeof req.body.image !== 'undefined') {
         account.image = req.body.image;
      }
      if (typeof req.body.password !== 'undefined') {
         account.setPassword(req.body.password);
      }
      return account.save().then(() => {
         return res.json({ account: account.toAuthJSON() });
      });
   }).catch(next);
});

// Delete account
router.delete('/', auth.required, (req, res, next) => {
   Account.findById(req.payload.id).then((account) => {
      if (!account) return res.sendStatus(401);
      account.deleteOne(() => {
         return res.json({ message: "Account was closed successfully." });
      });
   }).catch(next);
});

// Get me from token
router.get('/', auth.required, function (req, res, next) {
   Account.findById(req.payload.id).then((account) => {
      console.log(" PPPPPPPPPPPPPPP ", account)
      if (!account) return res.sendStatus(401);
      AccountCompany.findById(req.payload.accountCompany)
         .then(accountCompany => {
            return res.json({
               account: account.toAuthJSON(),
               accountCompany: accountCompany
            });
         }).catch(next);
   }).catch(next);
});

// Login account
router.post('/login', (req, res, next) => {
   if (!req.body.email) {
      return res.status(422).json({ errors: { email: "can't be blank" } });
   }
   if (!req.body.password) {
      return res.status(422).json({ errors: { password: "can't be blank" } });
   }
   const { isRemember } = req.body;
   passport.authenticate('local', { session: false }, (err, account, info) => {
      if (err) return next(err);
      if (account) {
         const token = account.generateJWT(isRemember);
         AccountCompany.findById(account.accountCompany).then(accountCompany => {
            return res.json({
               accountCompany: accountCompany,
               account: account.toAuthJSON(),
               access_token: token
            });
         }).catch(next);
      } else return res.status(422).json(info);
   })(req, res, next);
});

// Logout
router.get('/logout', auth.optional, function (req, res) {
   req.logout();
   return res.json({
      status: 'success'
   });
});

// Create invited account
router.post('/invited', auth.optional, async (req, res, next) => {
   const { _id, firstName, lastName, email, password } = req.body;
   Account.findById(_id).then(account => {
      account.status = "approved";
      account.firstName = firstName;
      account.lastName = lastName;
      account.email = email;
      account.setPassword(password);

      account.invitationStatus = "accepted";

      account.save().then(() => {
         const token = account.generateJWT(true);
         return res.json({ account: account.toAuthJSON(), access_token: token });
      }).catch(next);
   }).catch(next);
});

module.exports = router;
