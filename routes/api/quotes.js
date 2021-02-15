const { secret, baseURL, sgKey, sgSMTP } = require("../../config");
const router = require("express").Router();
const ObjectId = require('mongoose').Types.ObjectId;
const Account = require("../../models/Account");
const Person = require("../../models/Person");
const Quote = require("../../models/Quote");
const Company = require("../../models/Company");
const auth = require('../auth');
const jwt = require("jsonwebtoken");
const AccountCompany = require("../../models/AccountCompany");
const AppearanceSetting = require("../../models/Settings/AppearanceSetting");
const { calculateQuoteTotal, isValidPriceItem, isValidTextItem, parseBrInStr } = require("../../utils");
const QuoteDefaultSetting = require("../../models/Settings/QuoteDefaultSetting");
const nodemailer = require("nodemailer");
const sgMail = require('@sendgrid/mail');
const _ = require("lodash");
sgMail.setApiKey(sgKey);

console.log('baseURL___', baseURL);
// create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
   host: 'smtp.sendgrid.net',
   port: 2525,
   secure: false, // true for 465, false for other ports
   auth: {
      user: sgSMTP.user, // sendgrid SMTP user
      pass: sgSMTP.pass // sendgrid SMTP password
   },
});

function transportEmail(from, to, cc, replyTo, subject, html) {
   console.log(" EMAIL TO ========================================> ", to)
   // send mail with defined transport object
   transporter
      .sendMail({
         from: from, // sender address
         to: to, // list of receivers
         cc: cc,
         replyTo: replyTo,
         subject: subject, // Subject line
         text: "", // plain text body
         html: html, // html body
      })
      .then(info => {
         console.log(" ---------------- Message sent: %s --------------------- ", info.messageId);
         // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
      })
      .catch(error => {
         console.error(" ---------------- ERROR DURING SENDING EMAILS FOR NEW QUOTE --------------------- ");
      });
}

// get all quotes by state for table show
router.get('/state/:state', auth.required, async (req, res, next) => {
   const { state } = req.params;
   Quote.find({ authorCompany: req.payload.accountCompany, state: state }).then(async (docs) => {
      const pList = [];
      for (let i = 0; i < docs.length; i++) {
         let contactNameTo = "";
         let userFrom = "";
         if (docs[i].toPeopleList.length > 0) {
            // console.log("111 toPeopleList =>", docs[i].toPeopleList[0]);
            let person = await Person.findById(docs[i].toPeopleList[0]);
            console.log("person =>", person);
            if (person && person.company) {
               let company = await Company.findById(person.company);
               if (company) contactNameTo = company.companyName;
            } else if (person) contactNameTo = person.firstName + person.lastName;
            else contactNameTo = "";
         }
         const account = await Account.findById(docs[i].settings.userFrom);
         if (account) userFrom = account.firstName + " " + account.lastName;

         const entoken = jwt.sign({
            quoteId: docs[i]._id,
            personId: (docs[i].status !== "draft" && docs[i].toPeopleList.length > 0) ? docs[i].toPeopleList[0] : null
         }, secret);
         pList.push({
            _id: docs[i]._id,
            number: docs[i].number,
            status: docs[i].status,
            title: docs[i].title,
            settings: docs[i].settings,
            status: docs[i].status,
            quoteTotal: calculateQuoteTotal(docs[i].items),
            contactNameTo: contactNameTo,
            userFrom: userFrom,
            viewedAt: docs[i].viewedAt,
            createdAt: docs[i].createdAt,
            updatedAt: docs[i].updatedAt,
            entoken: entoken,
         });
      }
      return res.json({ quotes: pList });
   })
});

// get all quotes for table show
router.get('/', auth.required, async (req, res, next) => {
   Quote.find({ authorCompany: req.payload.accountCompany }).then(async (docs) => {
      const pList = [];
      for (let i = 0; i < docs.length; i++) {
         let contactNameTo = "";
         let userFrom = "";
         if (docs[i].toPeopleList.length > 0) {
            // console.log("111 toPeopleList =>", docs[i].toPeopleList[0]);
            let person = await Person.findById(docs[i].toPeopleList[0]);
            console.log("person =>", person);
            if (person && person.company) {
               let company = await Company.findById(person.company);
               if (company) contactNameTo = company.companyName;
            } else if (person) contactNameTo = person.firstName + person.lastName;
            else contactNameTo = "";
         }
         const account = await Account.findById(docs[i].settings.userFrom);
         if (account) userFrom = account.firstName + " " + account.lastName;
         console.log("444 account userFrom =>", userFrom);

         const entoken = jwt.sign({
            quoteId: docs[i]._id,
            personId: (docs[i].status !== "draft" && docs[i].toPeopleList.length > 0) ? docs[i].toPeopleList[0] : null
         }, secret);
         pList.push({
            _id: docs[i]._id,
            title: docs[i].title,
            status: docs[i].status,
            quoteTotal: calculateQuoteTotal(docs[i].items),
            contactNameTo: contactNameTo,
            userFrom: userFrom,
            viewedAt: docs[i].viewedAt,
            createdAt: docs[i].createdAt,
            entoken: entoken
         });
      }
      return res.json({ quotes: pList });
   })
});

// create quote -------------
router.post('/', auth.required, async (req, res, next) => {
   console.log(req.body)
   const {
      status,
      toPeopleList,
      title,
      settings,
      items,
      notes
   } = req.body;

   const quote = new Quote();
   const accountCompany = await AccountCompany.findById(req.payload.accountCompany);
   const quoteDefaultSetting = await QuoteDefaultSetting.findById(accountCompany.quoteDefaultSetting);

   quote.number = quoteDefaultSetting.nextQuoteNumber || 1;
   quoteDefaultSetting.currentQuoteNumber = quote.number;
   quoteDefaultSetting.nextQuoteNumber = quote.number + 1;

   if (status) quote.status = status;
   quote.author = req.payload.id;
   quote.title = title;
   quote.authorCompany = req.payload.accountCompany;
   await quote.toPeopleListSAssign(toPeopleList);

   // quote.settings = settings;
   quote.settings.validUntil = settings.validUntil;
   quote.settings.sentAt = settings.sentAt;
   quote.settings.userFrom = settings.userFrom;
   quote.settings.discount = settings.discount;
   quote.settings.currency = settings.currency ? settings.currency : 156;
   quote.settings.taxMode = settings.taxMode;
   quote.settings.pricingDisplayLevel = settings.pricingDisplayLevel;
   quote.settings.displayItemCode = settings.displayItemCode;

   quote.items = [];
   for (let i = 0; i < items.length; i++) {
      if (items[i].category === "priceItem") {
         if (!isValidPriceItem(items[i].priceItem)) continue;
         quote.items.push(items[i]);
      } else if (items[i].category === "textItem") {
         if (!isValidTextItem(items[i].textItem)) continue;
         quote.items.push(items[i]);
      } else if (items[i].category === "subTotal") {
         quote.items.push({
            category: "subTotal"
         });
      }
   }
   quote.notes = [];
   for (let i = 0; i < notes.length; i++) {
      if (!isValidTextItem(notes[i].textItem)) continue;
      quote.notes.push(notes[i]);
   }

   quote.save().then(async () => {
      await quoteDefaultSetting.save();
      const entoken = jwt.sign({
         quoteId: quote._id
      }, secret);
      return res.json({ quote: await quote.toQuoteJSON(), entoken: entoken });
   }).catch(next);
});

// update quote
router.put('/id/:id', auth.required, async (req, res, next) => {
   const quoteId = req.params.id;
   const { toPeopleList, title, settings, items, notes } = req.body;
   if (!ObjectId.isValid(quoteId)) return res.status(422).json({ error: "Quote id is invalid." });
   Quote.findById(req.params.id).then(async quote => {
      quote.title = title;
      await quote.toPeopleListSAssign(toPeopleList);
      quote.settings = settings;
      quote.items = [];
      for (let i = 0; i < items.length; i++) {
         if (items[i].category === "priceItem") {
            if (!isValidPriceItem(items[i].priceItem)) continue;
            quote.items.push(items[i]);
         } else if (items[i].category === "textItem") {
            if (!isValidTextItem(items[i].textItem)) continue;
            quote.items.push(items[i]);
         } else if (items[i].category === "subTotal") {
            quote.items.push({
               category: "subTotal"
            });
         }
      }
      quote.notes = [];
      for (let i = 0; i < notes.length; i++) {
         if (!isValidTextItem(notes[i].textItem)) continue;
         quote.notes.push(notes[i]);
      }
      quote.save().then(async () => {
         const entoken = jwt.sign({
            quoteId: quote._id
         }, secret);
         return res.json({ quote: await quote.toQuoteJSON(), entoken: entoken });
      }).catch(next);
   }).catch(next);
});

// get quote by id ---------------
router.get('/id/:id', auth.required, async (req, res, next) => {
   const quoteId = req.params.id;
   if (!ObjectId.isValid(quoteId)) return res.status(422).json({ error: "Quote id is invalid." });
   Quote.findById(quoteId).populate('toPeopleList').exec(async (err, doc) => {
      if (err) return next(err);
      return res.json({ quote: await doc.toQuoteJSON() });
   });
});

// update status
router.put('/status/:id', auth.required, async (req, res, next) => {
   const quoteId = req.params.id;
   if (!ObjectId.isValid(quoteId)) return res.status(422).json({ error: "Quote id is invalid." });
   const { status } = req.body;
   Quote.findById(quoteId).then(quote => {
      quote.status = status;
      if (status === "accepted") quote.acceptedAt = new Date();
      if (status === "declined") quote.declinedAt = new Date();
      if (status === "withdrawn") quote.withdrawnAt = new Date();

      quote.save()
         .then(() => {
            const entoken = jwt.sign({
               quoteId: quote._id
            }, secret);
            return res.json({ status: "success", entoken: entoken });
         })
         .catch(next);
   }).catch(next);
});

// archive specific contact
router.put('/archive/:id', auth.required, async (req, res, next) => {
   const quoteId = req.params.id;
   if (!ObjectId.isValid(quoteId)) return res.status(422).json({ error: "Quote id is invalid." });
   Quote.findById(quoteId)
      .then(quote => {
         quote.state = "archived";
         quote.save().then(() => {
            const entoken = jwt.sign({
               quoteId: quote._id
            }, secret);
            return res.json({ status: "success", entoken: entoken })
         }).catch(next);
      }).catch(next);
});

// archive specific contact
router.put('/un-archive/:id', auth.required, async (req, res, next) => {
   const quoteId = req.params.id;
   if (!ObjectId.isValid(quoteId)) return res.status(422).json({ error: "Quote id is invalid." });
   Quote.findById(quoteId)
      .then(quote => {
         quote.state = "current";
         quote.save().then(() => {
            const entoken = jwt.sign({
               quoteId: quote._id
            }, secret);
            return res.json({ status: "success", entoken: entoken })
         }).catch(next);
      }).catch(next);
});

// follow-up specific contact
router.put('/follow-up/:id', auth.required, async (req, res, next) => {
   const quoteId = req.params.id;
   if (!ObjectId.isValid(quoteId)) return res.status(422).json({ error: "Quote id is invalid." });
   Quote.findById(quoteId)
      .then(quote => {
         quote.state = "follow-up";
         quote.save().then(() => {
            const entoken = jwt.sign({
               quoteId: quote._id
            }, secret);
            return res.json({ status: "success", entoken: entoken })
         }).catch(next);
      }).catch(next);
});

// delete quote
router.delete('/id/:id', auth.required, async (req, res, next) => {
   const quoteId = req.params.id;
   if (!ObjectId.isValid(quoteId)) return res.status(422).json({ error: "Quote id is invalid." });
   Quote.findById(quoteId).then(async quote => {
      // Remove toPeopleList & remove from quotes in person contact.
      await quote.toPeopleListSAssign([]);
      await Quote.findByIdAndRemove(quoteId);
      return res.json({ status: "success" });
   }).catch(next);
});

// send quote ----------
router.post('/send', auth.required, async (req, res, next) => {
   const { quoteId, subject, msgHeader, msgFooter } = req.body;
   if (!ObjectId.isValid(quoteId)) return res.status(422).json({ error: "Quote id is invalid." });
   Quote.findById(quoteId).populate('author authorCompany toPeopleList settings.userFrom').then(async quote => {
      // quote author entoken to send copied notfication
      const author_entoken = jwt.sign({
         quoteId: quote._id,
         personId: null
      }, secret);
      // quote author information
      const authorFullName = quote.settings.userFrom.firstName + " " + quote.settings.userFrom.lastName;
      const authorEmail = quote.settings.userFrom.email;

      // quote potential total
      const quoteTotalValue = calculateQuoteTotal(quote.items);

      // The first recipient who is Quote for
      const firstRecipient = _.head(quote.toPeopleList);
      const firstRecipientFullName = firstRecipient.firstName + " " + firstRecipient.lastName;
      let firstRecipientCompanyName = "";
      if (firstRecipient.company) {
         const firstRecipientCompany = await Company.findById(firstRecipient.company);
         if (firstRecipientCompany) firstRecipientCompanyName = firstRecipientCompany.companyName;
         else firstRecipientCompanyName = "";
      }

      // send emails to all recipients
      let html = "";
      for (let i = 0; i < quote.toPeopleList.length; i++) {
         const recipient = quote.toPeopleList[i];
         const recipientFullName = recipient.firstName + " " + recipient.lastName;
         const recipientEmail = recipient.email;

         const entoken = jwt.sign({
            quoteId: quote._id,
            personId: recipient._id
         }, secret);

         const from = `"${authorFullName}" <mail@quotehard.com>`;
         const to = `"${recipientFullName}" <${recipientEmail}>`;
         const replyTo = `"${authorFullName}" <${authorEmail}>`;
         html = `
            <div>
               <div>
                  <div>
                     ${parseBrInStr(msgHeader)}
                     <br>
                     <br>
                     <a href="${baseURL}/q/${entoken}"
                        style="display:inline-block;color:white;background-color:#2176c7;border-radius:4px;border:12px solid #2176c7;text-decoration:none;text-align:center"
                        target="_blank">&nbsp;&nbsp;&nbsp;View Quote&nbsp;&nbsp;&nbsp;</a>
                     <br>
                     <br>
                     ${parseBrInStr(quote.title)}
                     <span style="font-size:12px;color:#999999">
                     <br>
                     ${firstRecipientCompanyName ? firstRecipientCompanyName : firstRecipientFullName} #${quote.number} 
                     </span>
                     <br>
                     <br>
                     <br>
                  </div>
               </div>
               ${parseBrInStr(msgFooter)}
            </div>
         `;
         transportEmail(from, to, null, replyTo, subject, html);
      }

      // send copied notifications
      const notificationHtml = `
      <div>
         ${authorFullName} sent a new quote.
         <br>
         <br>
         ${quote.title}
         <br>
         ${firstRecipientCompanyName}, ${firstRecipientFullName}
         <br>Potential value: <strong>${quoteTotalValue}</strong>
         <br>
         <br>
         <a href="${baseURL}/q/${author_entoken}/author"
            style="display:inline-block;color:white;background-color:#2176c7;border-radius:4px;border:12px solid #2176c7;text-decoration:none;text-align:center"
            target="_blank">
            &nbsp;&nbsp;&nbsp;View Quote&nbsp;&nbsp;&nbsp;
         </a>
         <br>
         <br>
         <br>
         <span style="font-size:11px">
            <span style="display:inline-block;text-align:center;color:white;background-color:black;border:1px solid black">&nbsp;&nbsp;CUSTOMER COPY&nbsp;&nbsp;
            </span>
            <br>
         </span>
         <div style="border-left: 2px solid black;padding-left: 20px;">
            <br>
            ${html}
            </div>
         </div>
      `;
      const notificationSubject = subject + " - COPY";
      const notificationFrom = `"Quotehard" <notifications@quotehard.com>`;
      let notificationTo = "";
      const authorCompany = await AccountCompany.findById(req.payload.accountCompany);
      const { quoteSentNotificationEmails } = authorCompany.emailNotificationSetting;
      for (let i = 0; i < quoteSentNotificationEmails.length; i++) {
         notificationTo += `<${quoteSentNotificationEmails[i]}>`;
         if (i === quoteSentNotificationEmails.length - 1) notificationTo += "";
         else notificationTo += ", ";
      }
      if (notificationTo) transportEmail(notificationFrom, notificationTo, null, null, notificationSubject, notificationHtml);

      // process quote
      quote.author = req.payload.id;
      quote.status = "awaiting";
      quote.settings.sentAt = new Date();
      if (!quote.settings.validUntil) quote.settings.validUntil = new Date(Date.now() + 1000 * 3600 * 24 * 20);
      const entokenForAuthor = jwt.sign({
         quoteId: quote._id,
         personId: null
      }, secret);
      await quote.save();
      return res.json({ message: "email sent successfully.", entoken: entokenForAuthor });
   }).catch(next);
})

// Get appearace setting for public view
router.post('/view-public/appearance', auth.optional, async (req, res, next) => {
   const { entoken } = req.body;
   jwt.verify(entoken, secret, async (err, decoded) => {
      if (err) return res.status(400).json({ error: "Failed to decode encrypted token" });
      const { quoteId, personId } = decoded;
      Quote.findById(quoteId).then(quote => {
         AccountCompany.findById(quote.authorCompany).then(accountCompany => {
            AppearanceSetting.findById(accountCompany.appearanceSetting).then(appearanceSetting => {
               return res.json({
                  appearanceSetting: {
                     logo: accountCompany.logo,
                     companyDisplayName: accountCompany.companyDisplayName,
                     address: accountCompany.address,
                     website: accountCompany.website,
                     phone: accountCompany.phone,
                     colors: appearanceSetting.colors,
                     contactDetailLayout: appearanceSetting.contactDetailLayout,
                     isDisplayFullCustomerDetail: appearanceSetting.isDisplayFullCustomerDetail,
                     layout: appearanceSetting.layout,
                     headingFont: appearanceSetting.headingFont,
                     bodyText: appearanceSetting.bodyText,
                     headingWeight: appearanceSetting.headingWeight,
                     describeTaxAs: appearanceSetting.describeTaxAs,
                     displayCurrencySymbolInTotal: appearanceSetting.displayCurrencySymbolInTotal,
                     displayCurrencyCodeInTotal: appearanceSetting.displayCurrencyCodeInTotal,
                     isEnabledPrintPDF: appearanceSetting.isEnabledPrintPDF,
                     pdfPageSize: appearanceSetting.pdfPageSize,
                  }
               });
            }).catch(next);
         }).catch(next);
      }).catch(next);
   });
})

// Get person to view public quote
router.post('/view-public/person', auth.optional, async (req, res, next) => {
   const { entoken } = req.body;
   jwt.verify(entoken, secret, async (err, decoded) => {
      if (err) return res.status(400).json({ error: "Failed to decode encrypted token" });
      const { quoteId, personId } = decoded;
      Person.findById(personId).then(person => {
         return res.json({ person: person });
      }).catch(next);
   });
})

// Get quote data for public view ----------------
router.post('/view-public/quote', auth.optional, async (req, res, next) => {
   const { entoken } = req.body;
   console.log(" ___________________________________ entoken ___________________________", entoken)
   jwt.verify(entoken, secret, async (err, decoded) => {

      if (err) return res.status(400).json({ error: "Failed to decode encrypted token" });
      console.log(" ___________________________________ decoded ___________________________", decoded)
      const { quoteId, personId } = decoded;
      Quote.findById(quoteId).populate('author toPeopleList settings.userFrom').then(async quote => {
         // find the recipient of this quote
         let recipient = null;
         if (ObjectId.isValid(personId)) recipient = await Person.findById(personId);

         // check if it is valid for the notification
         let isValidForNotification;
         // send <first open email> only if person is not the quote sender or sender's teammember
         if (recipient) {
            if (!req.payload) isValidForNotification = true;
            else if (req.payload.accountCompany == quote.authorCompany) isValidForNotification = false;
            else isValidForNotification = true;
         } else isValidForNotification = false;

         // send notification
         if (isValidForNotification) {
            const recipientFullName = recipient.firstName + " " + recipient.lastName;
            console.log(" QUOTE RECIPIENT FULL NAME --->", recipientFullName);
            const authorAccountCompanys = await AccountCompany.findById(quote.authorCompany);

            if (quote.openTimes === 0 && authorAccountCompanys.emailNotificationSetting.isQuoteViewedNotificationToAuthorEnabled) {
               // Send first view email notfication to quote Author
               const author_entoken = jwt.sign({
                  quoteId: quote._id,
                  personId: null
               }, secret);

               // quote author information
               const authorFullName = quote.settings.userFrom.firstName + " " + quote.settings.userFrom.lastName;
               const authorEmail = quote.settings.userFrom.email;

               // quote recipient information
               let recipientCompanyName = "";
               if (recipient.company) {
                  const recipientCompany = await Company.findById(recipient.company);
                  if (recipientCompany) recipientCompanyName = recipientCompany.companyName;
               }
               const recipientFullName = recipient.firstName + " " + recipient.lastName;
               const recipientEmail = recipient.email;

               const subject = `Quote viewed: ${quote.title}`;
               const from = `"Quotehard" <notifications@quotehard.com>`;
               const to = `"${authorFullName}" <${authorEmail}>`;
               const replyTo = null;
               const html = `
               <div>
                  <span style="font-size:28px">
                     <img goomoji="1f44d" data-goomoji="1f44d" style="margin:0 0.2ex;vertical-align:middle;max-height:24px" alt="👍"
                        src="https://mail.google.com/mail/e/1f44d">
                  </span>
                  <span style="color:#d49714">First time opened</span>
                  <br>
   
                  <strong>${recipientFullName}</strong> just viewed your quote.
                  <br>
                  <br>
                  <a href="${baseURL}/q/${author_entoken}/author"
                     style="display:inline-block;color:white;background-color:#2176c7;border-radius:4px;border:12px solid #2176c7;text-decoration:none;text-align:center"
                     target="_blank">
                     &nbsp;&nbsp;&nbsp;View Quote&nbsp;&nbsp;&nbsp;
                  </a>
                  <br>
                  <br>
                  ${parseBrInStr(quote.title)}
                  <span style="font-size:12px;color:#999999">
                     <br>${recipientCompanyName ? recipientCompanyName : recipientFullName} #${quote.number} 
                  </span>
                  <br>
                  <br>
                  <br>
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                     <tbody>
                        <tr>
                           <td width="100%" style="border-top:1px solid #dddddd">&nbsp;</td>
                        </tr>
                     </tbody>
                  </table>
                  <span style="font-size:12px;color:#999999">
                     Too noisy?&nbsp;
                     <a href="${baseURL}/app/add-ons/notifications" style="color:#2176c7" target="_blank">Change Notifications Settings</a>
                  </span>
                  <br>
                  <br>
               </div>
            `;
               transportEmail(from, to, null, replyTo, subject, html);
            }
            const newDate = new Date();
            if (quote.openTimes === 0) { quote.viewedAt = new Date(); quote.openTimes += 1 }
            else if ((newDate.getTime() - quote.viewedAt.getTime()) > 1000 * 3600 * 24) quote.openTimes += 1;
            quote.viewedAt = new Date();
            await quote.save();
         }
         Quote.populate(quote, {
            path: "author toPeopleList.company items.priceItem.salesTax discussions.comment.author discussions.privateNote.author discussions.privateNote.toMate discussions.questionAndAnswer.question.author discussions.questionAndAnswer.answer.author acceptedBy declinedBy",
            select: "-accountCompany -salt -hash -category -phones -addresses -status -createdAt -updatedAt -__v"
         }, (err, quote) => {
            if (err) return res.status(400).json({ error: "Failed to populate quote for view." });
            return res.json({ quote: quote, person: recipient });
         });
      }).catch(next);
   })
});

// accept quote ----------------
router.post('/accept', auth.optional, async (req, res, next) => {
   const { entoken, acceptedComment, orderReferenceNumber } = req.body;
   jwt.verify(entoken, secret, async (err, decoded) => {
      if (err) return res.status(400).json({ error: "Failed to decode encrypted token" });
      console.log('decoded ---', decoded);
      const { quoteId, personId } = decoded;
      Quote.findById(quoteId).populate('author authorCompany toPeopleList settings.userFrom').then(async (quote) => {
         // quote author entoken to send copied notfication
         const author_entoken = jwt.sign({
            quoteId: quote._id,
            personId: null
         }, secret);

         // quote author information
         const authorFullName = quote.settings.userFrom.firstName + " " + quote.settings.userFrom.lastName;
         const authorEmail = quote.settings.userFrom.email;
         // quote potential total
         const quoteTotalValue = calculateQuoteTotal(quote.items);

         // The first recipient who is Quote for
         const firstRecipient = _.head(quote.toPeopleList);
         const firstRecipientFullName = firstRecipient.firstName + " " + firstRecipient.lastName;
         let firstRecipientCompanyName = "";
         if (firstRecipient.company) {
            const firstRecipientCompany = await Company.findById(firstRecipient.company);
            if (firstRecipientCompany) firstRecipientCompanyName = firstRecipientCompany.companyName;
            else firstRecipientCompanyName = "";
         }

         // get all recipeients First names
         let allRecipientFirstNames = "";
         for (let i = 0; i < quote.toPeopleList.length; i++) {
            allRecipientFirstNames += quote.toPeopleList[i].firstName;
            allRecipientFirstNames += ", ";
         }

         // send emails to all recipients that inform them they have accepted quote
         let html = "";
         for (let i = 0; i < quote.toPeopleList.length; i++) {
            const recipient = quote.toPeopleList[i];
            const recipientFullName = recipient.firstName + " " + recipient.lastName;
            const recipientEmail = recipient.email;
            const recipient_entoken = jwt.sign({
               quoteId: quote._id,
               personId: recipient._id
            }, secret);

            const subject = `Quote accepted: ${quote.title}`;
            const from = `"${authorFullName}" <mail@quotehard.com>`;
            const to = `"${recipientFullName}" <${recipientEmail}>`;
            const replyTo = `"${authorFullName}" <${authorEmail}>`;
            html = `
            <div>
               Hi ${allRecipientFirstNames}
               <br>
               <br>
               Thank you for your acceptance.<br>
               <br>
               Additional comments:
               <br>
               <table cellpadding="0" cellspacing="0" border="0" style="margin-top:6px">
                  <tbody>
                     <tr>
                        <td width="600" style="padding:20px;background:#eee">${acceptedComment}</td>
                     </tr>
                  </tbody>
               </table>
            
               <br>
               Order/reference number
               <br>
               <table cellpadding="0" cellspacing="0" border="0" style="margin-top:6px">
                  <tbody>
                     <tr>
                        <td width="600" style="padding:20px;background:#eee">${orderReferenceNumber}</td>
                     </tr>
                  </tbody>
               </table>
            
               <br>
               <a href="${baseURL}/q/${recipient_entoken}"
                  style="display:inline-block;color:white;background-color:#405068;border-radius:4px;border:12px solid #405068;text-decoration:none;text-align:center"
                  target="_blank">
                  &nbsp;&nbsp;&nbsp;View Accepted Quote&nbsp;&nbsp;&nbsp;</a>
               <br>
               <br>
               ${quote.title}
               <span style="font-size:12px;color:#999999">
                  <br>${firstRecipientCompanyName ? firstRecipientCompanyName : firstRecipientFullName} #${quote.number}
               </span>
               <br>
            </div>
            `;
            transportEmail(from, to, null, replyTo, subject, html);
         }

         // send copied accepted notification to quote author and  quoteAccptedNotificationEmails
         const notificationHtml = `
         <div>
            Congrats ${authorFullName}, your quote has been accepted!
            <br>
            <br>
            ${quote.title}
            <br>
            ${firstRecipientCompanyName}, ${firstRecipientFullName}
            <br>
            Accepted value: <strong>${quoteTotalValue}</strong>
            <br>
            <br>
            <a href="${baseURL}/q/${author_entoken}/author"
               style="display:inline-block;color:white;background-color:#2176c7;border-radius:4px;border:12px solid #2176c7;text-decoration:none;text-align:center"
               target="_blank">
               &nbsp;&nbsp;&nbsp;View Accepted Quote&nbsp;&nbsp;&nbsp;</a>
            <br>
            <br>
            <br>
            <span style="font-size:11px">
               <span style="display:inline-block;text-align:center;color:white;background-color:black;border:1px solid black">&nbsp;&nbsp;CUSTOMER COPY&nbsp;&nbsp;</span>
               <br>
            </span>
            <div style="border-left: 2px solid black;padding-left: 20px;">
               <br>
               ${html}
            </div>
         </div>
         `;
         const notificationSubject = `Quote accepted: ${quote.title} - COPY`;
         const notificationfrom = `"Quotehard" <notifications@quotehard.com>`;
         const notificationTo = `"${authorFullName}" <${authorEmail}>`;
         let notificationCc = "";
         const { quoteAccptedNotificationEmails } = quote.authorCompany.emailNotificationSetting;
         for (let i = 0; i < quoteAccptedNotificationEmails.length; i++) {
            notificationCc += `<${quoteAccptedNotificationEmails[i]}>`;
            if (i === quoteAccptedNotificationEmails.length - 1) notificationCc += "";
            else notificationCc += ", ";
         }
         console.log(" notificationCc Eamils ----------------- >", notificationCc);
         if (notificationCc) transportEmail(notificationfrom, notificationTo, notificationCc, null, notificationSubject, notificationHtml);

         // process quote
         quote.status = "accepted";
         quote.acceptedAt = new Date();
         quote.acceptedBy = personId;
         quote.acceptedComment = acceptedComment;
         quote.orderReferenceNumber = orderReferenceNumber;
         quote.save().then(() => {
            return res.json({ status: "success" });
         }).catch(next);
      }).catch(next);
   });
});

// decline quote
router.post('/decline', auth.optional, async (req, res, next) => {
   const { entoken, declinedComment } = req.body;
   jwt.verify(entoken, secret, async (err, decoded) => {
      console.log('err ---', err);
      console.log('decoded ---', decoded);
      if (err) return res.status(400).json({ error: "Failed to decode encrypted token" });
      const { quoteId, personId } = decoded;

      Quote.findById(quoteId).populate('author toPeopleList settings.userFrom').then(async (quote) => {
         const authorEmail = quote.settings.userFrom.email;
         const authorFullName = quote.settings.userFrom.firstName + " " + quote.settings.userFrom.lastName;

         const person = await Person.findById(personId);
         if (!person) return res.status(404).json({ error: "can't find person who declined." });
         const personFullName = person.firstName + " " + person.lastName;

         const msg = {
            to: `${authorEmail}`, // Change to your recipient
            from: 'mail@quotehard.com', // Change to your verified sender
            subject: `Quote declined: ${quote.title}`,
            text: '...',
            html: `
            <div>
                                          <h3>Hi ${authorFullName}</h3>
                                          <div style="margin-bottom: 15px;">Quote declined by ${personFullName}:</div>
                                          <div style="
                  padding: 20px;
                  background: #eee;
                  margin-bottom: 15px;
               ">${declinedComment}</div>
                                          <a href="${baseURL}/q/${entoken}" style="
                  padding-left: 15px;
                  padding-right: 15px;
                  padding-top: 10px;
                  padding-bottom: 10px;
                  color: black;
                  background-color: cornflowerblue;
                  text-decoration: none;
               ">View Declined Quote</a>
                                       </div>
         `,
         };
         try {
            await sgMail.send(msg);
         } catch (error) {
            console.error(error);
            if (error.response) {
               console.error("error during sendgrid emailing =>", error.response.body);
               return res.status(400).json({ error: "failed to proceed during sendgrid API." });
            }
         }
         console.log('******************* Decline Email was sent *************************');

         quote.status = "declined";
         quote.declinedAt = new Date();
         quote.declinedBy = personId;
         quote.declinedComment = declinedComment;
         quote.save().then(() => {
            return res.json({ status: "success" });
         }).catch(next);
      }).catch(next);
   });
});

// get discussions
router.get('/discussions', auth.optional, async (req, res, next) => {
   const { entoken } = req.body;
   jwt.verify(entoken, secret, async (err, decoded) => {
      if (err) return res.status(400).json({ error: "Failed to decode encrypted token" });
      const { quoteId } = decoded;
      Quote.findById(quoteId).then(async (quote) => {
         return res.json({ discussions: quote.discussions });
      }).catch(next);
   });
});

// add private-note
router.post('/private-note', auth.required, async (req, res, next) => {
   const { content, files, toMateAccountId, entoken } = req.body;
   console.log("toMateAccountId ====>", toMateAccountId);
   const account = await Account.findById(req.payload.id).populate('accountCompany');
   const authorFullName = account.firstName + " " + account.lastName;

   jwt.verify(entoken, secret, async (err, decoded) => {
      if (err) return res.status(400).json({ error: "Failed to decode encrypted token" });
      const { quoteId } = decoded;
      Quote.findById(quoteId).then(async (quote) => {
         // send email to teammate if it exists
         if (toMateAccountId !== "") {
            const mateAccount = await Account.findById(toMateAccountId);
            if (!mateAccount) return res.status(404).json({ error: "can't find teammate account by it's id." });
            const mateEmail = mateAccount.email;
            const mateFullName = mateAccount.firstName + " " + mateAccount.lastName;
            const msg = {
               to: `${mateEmail}`, // Change to your recipient
               from: 'mail@quotehard.com', // Change to your verified sender
               subject: `New question: ${quote.title}`,
               text: '...',
               html: `
               <div>
                  <h3>Hi ${mateFullName}</h3>
                  <div style="margin-bottom: 15px;">${authorFullName} sent you a Private Note.</div>
                  <a href="${baseURL}/q/${entoken}/author-discuss" style="
                     padding-left: 15px;
                     padding-right: 15px;
                     padding-top: 10px;
                     padding-bottom: 10px;
                     color: black;
                     background-color: cornflowerblue;
                     text-decoration: none;
                  ">Reply</a>
                                          <div style="
                     margin-top: 15px;
                     padding: 20px;
                     background: #eee;
                  ">${content}</div>
                                       </div>
               `,
            };
            try {
               await sgMail.send(msg);
            } catch (error) {
               console.error(error);
               if (error.response) {
                  console.error("error during sendgrid emailing =>", error.response.body);
                  return res.status(400).json({ error: "failed to send private note email to team mate." });
               }
            }
            console.log('******************* Private Note Email was sent *************************');
         }

         const newPN = {
            category: "privateNote",
            privateNote: {
               content: content,
               author: req.payload.id,
               files: files,
               toMate: toMateAccountId !== "" ? toMateAccountId : null,
               updatedAt: new Date()
            }
         };
         quote.discussions = [...quote.discussions, newPN];
         await quote.save();
         Quote.populate(quote,
            {
               path: "author toPeopleList discussions.comment.author discussions.privateNote.author discussions.privateNote.toMate discussions.questionAndAnswer.question.author discussions.questionAndAnswer.answer.author acceptedBy declinedBy",
               select: "-accountCompany -salt -hash -category -company -phones -addresses -status -createdAt -updatedAt -__v"
            },
            (err, quote) => {
               if (err) return res.status(400).json({ error: "Failed to populate quote for comment." });
               return res.json({ discussions: quote.discussions });
            });
      }).catch(next);
   });
});

// add comment
router.post('/comment', auth.required, async (req, res, next) => {
   const { content, files, entoken } = req.body;
   const account = await Account.findById(req.payload.id).populate('accountCompany');
   const authorFullName = account.firstName + " " + account.lastName;

   jwt.verify(entoken, secret, async (err, decoded) => {
      if (err) return res.status(400).json({ error: "Failed to decode encrypted token" });
      const { quoteId } = decoded;
      Quote.findById(quoteId).populate("toPeopleList").exec(async (err, quote) => {
         if (err) return next();
         if (quote.toPeopleList.length === 0) return res.status(422).json({ error: "toPeopleList can't be blank." });
         for (let i = 0; i < quote.toPeopleList.length; i++) {
            const personEmail = quote.toPeopleList[i].email;
            const personFullName = quote.toPeopleList[i].firstName + ' ' + quote.toPeopleList[i].lastName;

            const c_entoken = jwt.sign({
               quoteId: quote._id,
               personId: quote.toPeopleList[i]._id
            }, secret);

            const msg = {
               to: `${personEmail}`, // Change to your recipient
               from: 'mail@quotehard.com', // Change to your verified sender
               subject: `A new comment: ${quote.title}`,
               text: '...',
               html: `
               <div>
                                          <h3>Hi, ${personFullName}</h3>
                                          <div style="margin-bottom: 15px;">${authorFullName} has added a comment to your quote:</div>
                                          <a href="${baseURL}/q/${c_entoken}" style="
                     padding-left: 15px;
                     padding-right: 15px;
                     padding-top: 10px;
                     padding-bottom: 10px;
                     color: black;
                     background-color: cornflowerblue;
                     text-decoration: none;
                     ">Reply</a>
                                          <div style="
                     margin-top: 15px;
                     padding: 20px;
                     background: #eee;
                     ">${content}</div>
                                       </div>
               `,
            };

            try {
               await sgMail.send(msg);
            } catch (error) {
               console.error(error);
               if (error.response) {
                  console.error("error during sendgrid emailing =>", error.response.body);
                  return res.status(400).json({ error: "failed to proceed during sendgrid API." });
               }
            }

            console.log('******************* Comment Email was sent *************************');

            const newComment = {
               category: "comment",
               comment: {
                  content: content,
                  author: req.payload.id,
                  files: files,
                  updatedAt: new Date()
               }
            };
            quote.discussions = [...quote.discussions, newComment];
            await quote.save();
            Quote.populate(quote,
               {
                  path: "author toPeopleList discussions.comment.author discussions.privateNote.author discussions.privateNote.toMate discussions.questionAndAnswer.question.author discussions.questionAndAnswer.answer.author acceptedBy declinedBy",
                  select: "-accountCompany -salt -hash -category -company -phones -addresses -status -createdAt -updatedAt -__v"
               },
               (err, quote) => {
                  if (err) return res.status(400).json({ error: "Failed to populate quote for comment." });
                  return res.json({ discussions: quote.discussions });
               });
         }
      })
   });
});

// ask question
router.post('/ask-question', auth.optional, async (req, res, next) => {
   const { entoken, files, content } = req.body;
   jwt.verify(entoken, secret, async (err, decoded) => {
      if (err) return res.status(400).json({ error: "Failed to decode encrypted token" });
      const { quoteId, personId } = decoded;
      console.log(" quote ID ===>", quoteId);
      console.log(" person ID ===>", personId);
      Quote.findById(quoteId).then(async (quote) => {
         const author = await Account.findById(quote.author);
         if (!author) return res.status(404).json({ error: "can't find quote author information." });
         const authorEmail = author.email;
         const authorFullName = author.firstName + " " + author.lastName;

         console.log("person id ===>", personId);
         const person = await Person.findById(personId);
         if (!person) return res.status(404).json({ error: "can't find person who ask question." });

         const personFullName = person.firstName + " " + person.lastName;
         const personEmail = person.email;
         console.log("authorEmail --------------->", authorEmail);
         console.log("authorFullName --------------->", authorFullName);
         console.log("personFullName --------------->", personFullName);

         const msg = {
            to: `${authorEmail}`, // Change to your recipient
            from: 'mail@quotehard.com', // Change to your verified sender
            subject: `New question: ${quote.title}`,
            text: '...',
            html: `
            <div>
                                          <h3>Hi ${authorFullName}</h3>
                                          <div style="margin-bottom: 15px;">${personFullName} asked a question.</div>
                                          <a href="${baseURL}/q/${entoken}/author-discuss" style="
                  padding-left: 15px;
                  padding-right: 15px;
                  padding-top: 10px;
                  padding-bottom: 10px;
                  color: black;
                  background-color: cornflowerblue;
                  text-decoration: none;
               ">Answer Question</a>
                                          <div style="
                  margin-top: 15px;
                  padding: 20px;
                  background: #eee;
               ">${content}</div>
                                       </div>
            `,
         };
         try {
            await sgMail.send(msg);
         } catch (error) {
            console.error(error);
            if (error.response) {
               console.error("error during sendgrid emailing =>", error.response.body);
               return res.status(400).json({ error: "failed to proceed during sendgrid API." });
            }
         }
         console.log('******************* Ask question Email was sent *************************');

         const newQA = {
            category: "questionAndAnswer",
            questionAndAnswer: {
               question: {
                  content: content,
                  files: files,
                  author: personId,
                  updatedAt: new Date()
               },
               answer: {
                  status: "pending",
                  content: null,
                  author: quote.author,
                  updatedAt: null
               }
            }
         };
         quote.discussions = [...quote.discussions, newQA];
         await quote.save();
         Quote.populate(quote,
            {
               path: "author toPeopleList discussions.comment.author discussions.privateNote.author discussions.privateNote.toMate discussions.questionAndAnswer.question.author discussions.questionAndAnswer.answer.author acceptedBy declinedBy",
               select: "-accountCompany -salt -hash -category -company -phones -addresses -status -createdAt -updatedAt -__v"
            },
            (err, quote) => {
               if (err) return res.status(400).json({ error: "Failed to populate quote for question." });
               return res.json({ discussions: quote.discussions });
            });
      }).catch(next);
   });
});

// answer question
router.post('/answer-question', auth.required, async (req, res, next) => {
   const { entoken, content, files, qaId } = req.body;
   jwt.verify(entoken, secret, async (err, decoded) => {
      if (err) return res.status(400).json({ error: "Failed to decode encrypted token" });
      const { quoteId, personId } = decoded;
      console.log(" qa ID ===>", qaId);
      console.log(" quote ID ===>", quoteId);
      console.log(" person ID ===>", personId);
      Quote.findById(quoteId).then(async (quote) => {
         let qaIndex = 0;

         const QA = quote.discussions.find((discussion, index) => {
            console.log("-------- discussion._id --------- >>", discussion._id.toString());
            console.log("-------- qaId --------- >>", qaId);
            if (discussion._id.toString() === qaId) { qaIndex = index; return true; }
            else return false;
         });
         if (!QA) return res.status(404).json({ error: "can't find question entity." });

         const author = await Account.findById(QA.questionAndAnswer.answer.author);
         if (!author) return res.status(404).json({ error: "can't find question author information." });
         const authorEmail = author.email;
         const authorFullName = author.firstName + " " + author.lastName;

         const person = await Person.findById(QA.questionAndAnswer.question.author);
         if (!person) return res.status(404).json({ error: "can't find person who ask question." });
         const personFullName = person.firstName + " " + person.lastName;
         const personEmail = person.email;

         const questionContent = QA.questionAndAnswer.question.content;

         console.log("qaIndex --", qaIndex);
         console.log("question and answer --", QA);
         console.log("authorEmail --------------->", authorEmail);
         console.log("authorFullName --------------->", authorFullName);
         console.log("personFullName --------------->", personFullName);

         const msg = {
            to: `${personEmail}`, // Change to your recipient
            from: 'mail@quotehard.com', // Change to your verified sender
            subject: `A response to your question: ${quote.title}`,
            text: '...',
            html: `
            <div>
                                          <h3>Hi ${personFullName}</h3>
                                          <div style="margin-bottom: 15px;">${authorFullName} answered your question.</div>
                                          <a href="${baseURL}/q/${entoken}" style="
                  padding-left: 15px;
                  padding-right: 15px;
                  padding-top: 10px;
                  padding-bottom: 10px;
                  color: black;
                  background-color: cornflowerblue;
                  text-decoration: none;
               ">Reply</a>
                                          <div style="
                  margin-top: 15px;
                  padding: 20px;
                  background: #eee;
                  border-bottom: 1px solid white;
               ">${questionContent}</div>
                                          <div style="
                  padding: 20px;
                  color: white;
                  background-color: gray;
               ">${content}</div>
                                       </div>
            `,
         };
         try {
            await sgMail.send(msg);
         } catch (error) {
            console.error(error);
            if (error.response) {
               console.error("error during sendgrid emailing =>", error.response.body);
               return res.status(400).json({ error: "failed to proceed during sendgrid API." });
            }
         }

         console.log('******************* Answer Email was sent *************************');
         quote.discussions[qaIndex].questionAndAnswer.answer = {
            status: "answered",
            content: content,
            files: files,
            author: req.payload.id,
            updatedAt: new Date()
         };
         await quote.save();
         Quote.populate(quote,
            {
               path: "author toPeopleList discussions.comment.author discussions.privateNote.author discussions.privateNote.toMate discussions.questionAndAnswer.question.author discussions.questionAndAnswer.answer.author acceptedBy declinedBy",
               select: "-accountCompany -salt -hash -category -company -phones -addresses -status -createdAt -updatedAt -__v"
            },
            (err, quote) => {
               if (err) return res.status(400).json({ error: "Failed to populate quote for question." });
               return res.json({ discussions: quote.discussions });
            });
      }).catch(next);
   });
});

// answer question
router.post('/dismiss', auth.required, async (req, res, next) => {
   const { entoken, qaId } = req.body;
   jwt.verify(entoken, secret, async (err, decoded) => {
      if (err) return res.status(400).json({ error: "Failed to decode encrypted token" });
      const { quoteId, } = decoded;
      console.log(" qa ID ===>", qaId);
      console.log(" quote ID ===>", quoteId);
      Quote.findById(quoteId).then(async (quote) => {
         let qaIndex = 0;

         const QA = quote.discussions.find((discussion, index) => {
            console.log("-------- discussion._id --------- >>", discussion._id.toString());
            console.log("-------- qaId --------- >>", qaId);
            if (discussion._id.toString() === qaId) { qaIndex = index; return true; }
            else return false;
         });
         if (!QA) return res.status(404).json({ error: "can't find question entity." });

         quote.discussions[qaIndex].questionAndAnswer.answer.status = "dismissed"
         await quote.save();
         Quote.populate(quote,
            {
               path: "author toPeopleList discussions.comment.author discussions.privateNote.author discussions.privateNote.toMate discussions.questionAndAnswer.question.author discussions.questionAndAnswer.answer.author acceptedBy declinedBy",
               select: "-accountCompany -salt -hash -category -company -phones -addresses -status -createdAt -updatedAt -__v"
            },
            (err, quote) => {
               if (err) return res.status(400).json({ error: "Failed to populate quote for dismiss." });
               return res.json({ discussions: quote.discussions });
            });
      }).catch(next);
   });
});

module.exports = router;