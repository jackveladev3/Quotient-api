const auth = require("../../auth");
const router = require("express").Router();
const AccountCompany = require("../../../models/AccountCompany");
const CustomerEmailSetting = require("../../../models/Settings/CustomerEmailSetting");

// get full email
router.get('/', auth.required, async (req, res, next) => {
   AccountCompany.findById(req.payload.accountCompany).then(accountCompany => {
      CustomerEmailSetting.findById(accountCompany.customerEmailSetting).then(customerEmailSetting => {
         const {
            newQuote,
            acceptedQuote,
            firstFollowup,
            secondFollowup,
            askForReview
         } = customerEmailSetting;
         return res.json({
            newQuote,
            acceptedQuote,
            firstFollowup,
            secondFollowup,
            askForReview
         });
      }).catch(next);
   }).catch(next);
});

// get new quote eamil
router.get('/new-quote', auth.required, async (req, res, next) => {
   AccountCompany.findById(req.payload.accountCompany).then(accountCompany => {
      CustomerEmailSetting.findById(accountCompany.customerEmailSetting).then(customerEmailSetting => {
         const { subject, msgHeader, msgFooter } = customerEmailSetting.newQuote;
         return res.json({ subject, msgHeader, msgFooter });
      }).catch(next);
   }).catch(next);
});

// create newquote eamil
router.post('/new-quote', auth.required, async (req, res, next) => {
   const { subject, msgHeader, msgFooter } = req.body;
   AccountCompany.findById(req.payload.accountCompany).then(accountCompany => {
      CustomerEmailSetting.findById(accountCompany.customerEmailSetting).then(async customerEmailSetting => {
         customerEmailSetting.newQuote.subject = subject;
         customerEmailSetting.newQuote.msgHeader = msgHeader;
         customerEmailSetting.newQuote.msgFooter = msgFooter;
         await customerEmailSetting.save();
         return res.json({ subject, msgHeader, msgFooter });
      }).catch(next);
   }).catch(next);
});

// get accepted quote eamil
router.get('/accepted-quote', auth.required, async (req, res, next) => {
   AccountCompany.findById(req.payload.accountCompany).then(accountCompany => {
      CustomerEmailSetting.findById(accountCompany.customerEmailSetting).then(customerEmailSetting => {
         const { subject, msgHeader, msgFooter } = customerEmailSetting.acceptedQuote;
         return res.json({ subject, msgHeader, msgFooter });
      }).catch(next);
   }).catch(next);
});

// create accepted quote eamil
router.post('/accepted-quote', auth.required, async (req, res, next) => {
   const { subject, msgHeader, msgFooter } = req.body;
   AccountCompany.findById(req.payload.accountCompany).then(accountCompany => {
      CustomerEmailSetting.findById(accountCompany.customerEmailSetting).then(async customerEmailSetting => {
         customerEmailSetting.acceptedQuote.subject = subject;
         customerEmailSetting.acceptedQuote.msgHeader = msgHeader;
         customerEmailSetting.acceptedQuote.msgFooter = msgFooter;
         await customerEmailSetting.save();
         return res.json({ subject, msgHeader, msgFooter });
      }).catch(next);
   }).catch(next);
});

// get first followup quote eamil
router.get('/first-follow-up', auth.required, async (req, res, next) => {
   AccountCompany.findById(req.payload.accountCompany).then(accountCompany => {
      CustomerEmailSetting.findById(accountCompany.customerEmailSetting).then(customerEmailSetting => {
         const { subject, msgHeader, msgFooter } = customerEmailSetting.firstFollowup;
         return res.json({ subject, msgHeader, msgFooter });
      }).catch(next);
   }).catch(next);
});

// create first followup quote eamil
router.post('/first-follow-up', auth.required, async (req, res, next) => {
   const { subject, msgHeader, msgFooter } = req.body;
   AccountCompany.findById(req.payload.accountCompany).then(accountCompany => {
      CustomerEmailSetting.findById(accountCompany.customerEmailSetting).then(async customerEmailSetting => {
         customerEmailSetting.firstFollowup.subject = subject;
         customerEmailSetting.firstFollowup.msgHeader = msgHeader;
         customerEmailSetting.firstFollowup.msgFooter = msgFooter;
         await customerEmailSetting.save();
         return res.json({ subject, msgHeader, msgFooter });
      }).catch(next);
   }).catch(next);
});

// get second Followup quote eamil
router.get('/second-follow-up', auth.required, async (req, res, next) => {
   AccountCompany.findById(req.payload.accountCompany).then(accountCompany => {
      CustomerEmailSetting.findById(accountCompany.customerEmailSetting).then(customerEmailSetting => {
         const { subject, msgHeader, msgFooter } = customerEmailSetting.secondFollowup;
         return res.json({ subject, msgHeader, msgFooter });
      }).catch(next);
   }).catch(next);
});

// create second Followup quote eamil
router.post('/second-follow-up', auth.required, async (req, res, next) => {
   const { subject, msgHeader, msgFooter } = req.body;
   AccountCompany.findById(req.payload.accountCompany).then(accountCompany => {
      CustomerEmailSetting.findById(accountCompany.customerEmailSetting).then(async customerEmailSetting => {
         customerEmailSetting.secondFollowup.subject = subject;
         customerEmailSetting.secondFollowup.msgHeader = msgHeader;
         customerEmailSetting.secondFollowup.msgFooter = msgFooter;
         await customerEmailSetting.save();
         return res.json({ subject, msgHeader, msgFooter });
      }).catch(next);
   }).catch(next);
});

// get askForReview quote eamil
router.get('/ask-for-review', auth.required, async (req, res, next) => {
   AccountCompany.findById(req.payload.accountCompany).then(accountCompany => {
      CustomerEmailSetting.findById(accountCompany.customerEmailSetting).then(customerEmailSetting => {
         const { subject, msgHeader, msgFooter } = customerEmailSetting.askForReview;
         return res.json({ subject, msgHeader, msgFooter });
      }).catch(next);
   }).catch(next);
});

// create askForReview quote eamil
router.post('/ask-for-review', auth.required, async (req, res, next) => {
   const { subject, msgHeader, msgFooter } = req.body;
   AccountCompany.findById(req.payload.accountCompany).then(accountCompany => {
      CustomerEmailSetting.findById(accountCompany.customerEmailSetting).then(async customerEmailSetting => {
         customerEmailSetting.askForReview.subject = subject;
         customerEmailSetting.askForReview.msgHeader = msgHeader;
         customerEmailSetting.askForReview.msgFooter = msgFooter;
         await customerEmailSetting.save();
         return res.json({ subject, msgHeader, msgFooter });
      }).catch(next);
   }).catch(next);
});

module.exports = router;