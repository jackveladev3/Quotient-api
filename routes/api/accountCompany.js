const router = require("express").Router();
const AccountCompany = require("../../models/AccountCompany");
const auth = require('../auth');
const { stripeSecretKey } = require("../../config");
const Stripe = require('stripe');
const stripe = Stripe(stripeSecretKey);

// update account company -------------------
router.put('/', auth.required, async (req, res, next) => {
   const { companyName, companyDisplayName, owner, location, timeZone, dateFormat } = req.body;
   AccountCompany.findById(req.payload.accountCompany).then(accountCompany => {
      if (!companyName) return res.status(422).json({ error: "Account name can't be blank" });
      if (!owner) return res.status(422).json({ error: "Owner can't be blank" });
      if (!location) return res.status(422).json({ error: "Location can't be blank" });
      if (!timeZone) return res.status(422).json({ error: "Timezone can't be blank" });
      if (dateFormat !== 0 && !dateFormat) return res.status(422).json({ error: "DateFormat can't be blank" });
      accountCompany.companyName = companyName;
      accountCompany.companyDisplayName = companyDisplayName;
      accountCompany.owner = owner;
      accountCompany.location = location;
      accountCompany.timeZone = timeZone;
      accountCompany.dateFormat = dateFormat;
      accountCompany.save().then(() => {
         return res.json({ accountCompany });
      }).catch(next);
   }).catch(next);
})

// deactivated account company
router.put('/deactivate', auth.required, async (req, res, next) => {
   AccountCompany.findById(req.payload.accountCompany).then(async accountCompany => {
      accountCompany.status = "deactivated";
      if (accountCompany.subscriptionId) await stripe.subscriptions.del(accountCompany.subscriptionId);
      accountCompany.subscriptionId = null;
      accountCompany.save().then(() => {
         return res.json({ status: "success" });
      }).catch(next);
   }).catch(next);
});

// reactivated account company
router.put('/reactivate', auth.required, async (req, res, next) => {
   AccountCompany.findById(req.payload.accountCompany).then(accountCompany => {
      accountCompany.status = "active";
      accountCompany.save().then(() => {
         return res.json({ status: "success" });
      }).catch(next);
   }).catch(next);
});

// reactivated account company
router.put('/delete', auth.required, async (req, res, next) => {
   AccountCompany.findById(req.payload.accountCompany).then(accountCompany => {
      accountCompany.status = "deactivated";
      accountCompany.save().then(() => {
         return res.json({ status: "success" });
      }).catch(next);
   }).catch(next);
});

module.exports = router;