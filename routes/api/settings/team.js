const auth = require("../../auth");
const router = require("express").Router();
const jwt = require("jsonwebtoken");
const { secret, baseURL, sgKey } = require("../../../config");
const AccountCompany = require("../../../models/AccountCompany");
const Account = require("../../../models/Account");
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(sgKey);

router.post('/invite', auth.required, async (req, res, next) => {
   const { firstName, lastName, email, role } = req.body;
   AccountCompany.findById(req.payload.accountCompany).then(async accountCompany => {
      if (!accountCompany) return res.status(404).json({ error: "not found accountCompany." });
      let account = null;
      const existAcc = await Account.findOne({ email: email });
      if (!existAcc) {
         console.error("____________________ There is no account _______________");
         const newAcc = new Account();
         newAcc.status = 'pending';
         newAcc.firstName = firstName;
         newAcc.lastName = lastName;
         newAcc.email = email;
         newAcc.accountCompany = req.payload.accountCompany;
         newAcc.role = role;
         newAcc.invitedBy = req.payload.accountCompany;
         newAcc.invitationStatus = 'pending';
         newAcc.invitedAt = new Date();
         newAcc.expireAt = new Date(Date.now() + 1000 * 3600 * 24 * 10);
         await newAcc.save();
         account = newAcc;
      } else {
         existAcc.invitedBy = req.payload.accountCompany;
         existAcc.invitationStatus = 'pending';
         existAcc.invitedAt = new Date();
         existAcc.expireAt = new Date(Date.now() + 1000 * 3600 * 24 * 10);
         await existAcc.save();
         account = existAcc;
      }
      const invitationEntoken = jwt.sign({
         _id: account._id,
         accountCompany: req.payload.accountCompany,
         role
      }, secret, { expiresIn: "10 days" }); // 10 days
      const msg = {
         to: `${email}`, // Change to your recipient
         from: 'mail@quotehard.com', // Change to your verified sender
         subject: `Invite to Quotient for ${accountCompany.companyName}`,
         text: '...',
         html: `
                  <div>
                     <h3>Hi, ${firstName}</h3>
                     <div style="margin-bottom: 15px;">You have been invited to create and view quotes for ${accountCompany.companyName}. </div>
                     <a href="${baseURL}/sign-in/invite/i/${invitationEntoken}" style="
                        padding-left: 15px;
                        padding-right: 15px;
                        padding-top: 10px;
                        padding-bottom: 10px;
                        color: black;
                        background-color: cornflowerblue;
                        text-decoration: none;
                     ">Accept Invite</a>
                  </div>
               `,
      };
      sgMail
         .send(msg)
         .then(async () => {
            return res.json({ status: "success" });
         })
         .catch((error) => {
            console.error("error during sendgrid emailing =>", error);
            return res.status(400).json({ error: "failed to proceed during sendgrid API." });
         });
   }).catch(next);
});

router.post('/validate-invitation', auth.optional, async (req, res, next) => {
   const { invitationEntoken } = req.body;
   jwt.verify(invitationEntoken, secret, async (err, decoded) => {
      if (err) return res.status(400).json({ error: "Failed to decode encrypted token" });
      const { _id, accountCompany, role } = decoded;
      Account.findById(_id).then(account => {
         const { _id, firstName, lastName, email, status, invitationStatus, accountCompany, invitedBy } = account;
         return res.json({ account: account });
      }).catch(next);
   });
});

router.get('/real-members', auth.required, async (req, res, next) => {
   Account.find({ status: 'approved', accountCompany: req.payload.accountCompany })
      .then(accounts => {
         return res.json({ members: accounts });
      }).catch(next);
});

router.get('/all-members', auth.required, async (req, res, next) => {
   const accounts = await Account.find({ accountCompany: req.payload.accountCompany });
   return res.json({ members: accounts });
});

router.get('/view/:id', auth.required, async (req, res, next) => {
   const { id } = req.params;
   try {
      const account = await Account.findById(id).populate('accountCompany');
      const { firstName, lastName, email, role, accountCompany } = account;
      const dt = { firstName, lastName, email, role, companyName: accountCompany.companyName };
      return res.json({ account: dt });
   } catch (err) { next(err); };
});

router.post('/delete-invite/:id', auth.required, async (req, res, next) => {
   const { id } = req.params;
   Account.findByIdAndDelete(id).then(() => {
      return res.json({ status: "success" });
   }).catch(next);
});

module.exports = router;