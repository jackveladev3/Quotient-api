const auth = require("../../auth");
const router = require("express").Router();
const AccountCompany = require("../../../models/AccountCompany");

function filterInvalidEmailsArray(emailArr) {
   let invalidEmails = [];
   if (Array.isArray(emailArr)) {
      for (let i = 0; i < emailArr.length; i++) {
         if (!emailIsValid(emailArr[i])) invalidEmails.push(emailArr[i]);
      }
   }
   return invalidEmails;
}

function emailIsValid(email) {
   return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// create notification setting ------------
router.post('/', auth.required, async (req, res, next) => {
   const { isViewedNotificationEnabled, quoteSentNotificationEmails, quoteAccptedNotificationEmails } = req.body;
   const invalidEmails = [...filterInvalidEmailsArray(quoteSentNotificationEmails), ...filterInvalidEmailsArray(quoteAccptedNotificationEmails)];
   if (invalidEmails.length > 0) return res.json({ success: false, invalidEmails: invalidEmails });
   AccountCompany.findById(req.payload.accountCompany).then(async accountCompany => {
      accountCompany.emailNotificationSetting = {
         isQuoteViewedNotificationToAuthorEnabled: isViewedNotificationEnabled,
         quoteSentNotificationEmails: quoteSentNotificationEmails,
         quoteAccptedNotificationEmails: quoteAccptedNotificationEmails
      }
      accountCompany.save().then(() => {
         return res.json({ success: true });
      }).catch(next);
   }).catch(next);
});

// get notification setting -------------
router.get('/', auth.required, async (req, res, next) => {
   AccountCompany.findById(req.payload.accountCompany).then(async accountCompany => {
      const {
         isQuoteViewedNotificationToAuthorEnabled,
         quoteSentNotificationEmails,
         quoteAccptedNotificationEmails
      } = accountCompany.emailNotificationSetting;
      return res.json({
         isQuoteViewedNotificationToAuthorEnabled,
         quoteSentNotificationEmails,
         quoteAccptedNotificationEmails
      });
   }).catch(next);
});

module.exports = router;