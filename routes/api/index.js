const router = require('express').Router();
const auth = require('../auth');
router.use('/account', require('./accounts'));
router.use('/account-company', require('./accountCompany'));
router.use('/contacts', require('./contacts'));
router.use('/templates', require('./templates'));
router.use('/quotes', require('./quotes'));
router.use('/settings', require('./settings'));
router.use('/service', require('./service'));

router.use(function (err, req, res, next) {
   if (err.name === 'ValidationError') {
      return res.status(422).json({
         errors: Object.keys(err.errors).reduce(function (errors, key) {
            errors[key] = err.errors[key].message;
            return errors;
         }, {})
      });
   }

   return next(err);
});

// request password reset link
router.post('/request-password', auth.optional, async (req, res, next) => {
   const email = req.body.email;
   Account.findOne({ email: email }).then((account) => {
      if (!account) return res.json({ success: false });
      const { firstName, lastName, email } = account;
      const entoken = jwt.sign({
         accountId: account._id
      }, secret, { expiresIn: 60 * 10 }); // 10 minutes

      const msg = {
         to: `${email}`, // Change to your recipient
         from: 'mail@quotehard.com', // Change to your verified sender
         subject: `Change your Quotehard password`,
         text: '...',
         html: `
         <div>
            <h3>Hi, ${firstName}</h3>
            <p style="padding-bottom: 15px;">
               We received a request to change your Quotient password. For security reasons the link below is valid for up to 10 minutes only.
            </p>
            <a href="${baseURL}/request-password/change/${entoken}" style="
               padding: 15px; 
               color: black; 
               background-color: cornflowerblue; 
               text-decoration: none;
            ">Change Password</a>
            <p style="padding-top: 20px;">Please ignore this email if you don't want to change your password.</p>
         </div>
         `,
      };
      sgMail
         .send(msg)
         .then(() => {
            return res.json({ success: true });
         })
         .catch((error) => {
            console.error("error during sendgrid emailing ===>", error);
            return res.status(400).json({ error: "failed to proceed during sendgrid API." });
         });
   }).catch(next);
});

// check reset password entoken validation
router.post('/validate-entoken', auth.optional, (req, res, next) => {
   const { entoken } = req.body;
   jwt.verify(entoken, secret, async (err, decoded) => {
      if (err) {
         return res.json({ isValid: false, message: err.message });
      }
      return res.json({ isValid: true });
   });
});

// reset password
router.post('/reset-password', auth.optional, (req, res, next) => {
   const { entoken, password } = req.body;
   if (typeof password === 'undefined' || password.length < 6) {
      return res.status(422).json({ message: "Your password needs to be at least 6 characters long." })
   }
   jwt.verify(entoken, secret, async (err, decoded) => {
      if (err) {
         return res.json({ isValid: false, message: err.message });
      }
      const { accountId } = decoded;
      Account.findById(accountId).then(account => {
         account.hash = crypto.pbkdf2Sync(password, account.salt, 10000, 512, 'sha512').toString('hex');
         account.save().then(() => {
            const token = account.generateJWT(true);
            return res.json({ isValid: true, account: account.toAuthJSON(), access_token: token });
         }).catch(next);
      }).catch(next);
   });
});


module.exports = router;