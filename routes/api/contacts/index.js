const router = require("express").Router();
const Person = require("../../../models/Person");
const Company = require("../../../models/Company");
const Quote = require("../../../models/Quote");
const auth = require('../../auth');
const { concatArrWithoutDuplication, replaceLoserByWinner } = require("../../../utils");
router.use('/person', require('./person'));
router.use('/company', require('./company'));

// search contacts --------
router.get('/search/:search', auth.required, async (req, res, next) => {
   const { search } = req.params;
   const regexp = new RegExp("^" + search);
   try {
      const personContacts = await Person.find({
         createdBy: req.payload.accountCompany,
         $or: [
            { firstName: regexp },
            { email: regexp }
         ]
      }).populate("company");
      const companyContacts = await Company.find({
         createdBy: req.payload.accountCompany,
         $or: [
            { companyName: regexp },
            { email: regexp }
         ]
      });
      const contacts = [
         ...personContacts.map(person => {
            return {
               _id: person._id,
               status: person.status,
               category: "person",
               firstName: person.firstName,
               lastName: person.lastName,
               companyName: person.company ? person.company.companyName : null
            };
         }),
         ...companyContacts.map(company => {
            return {
               _id: company._id,
               status: company.status,
               category: "company",
               companyName: company.companyName
            }
         })
      ];
      return res.json({ contacts: contacts });
   } catch (err) { next(err); }
});

// get all contacts ---------
router.get('/', auth.required, async (req, res, next) => {
   try {
      const personContacts = await Person.find({ createdBy: req.payload.accountCompany }).populate("company");
      const companyContacts = await Company.find({ createdBy: req.payload.accountCompany });
      const contacts = [
         ...personContacts.map(person => {
            return {
               _id: person._id,
               status: person.status,
               category: "person",
               firstName: person.firstName,
               lastName: person.lastName,
               companyName: person.company ? person.company.companyName : null,
               updatedAt: person.updatedAt
            };
         }),
         ...companyContacts.map(company => {
            return {
               _id: company._id,
               status: company.status,
               category: "company",
               companyName: company.companyName,
               updatedAt: company.updatedAt
            }
         })
      ];
      return res.json({ contacts: contacts });
   } catch (err) { next(err); }
});

// get contacts by status---------
router.get('/status/:status', auth.required, async (req, res, next) => {
   const { status } = req.params;
   try {
      const personContacts = await Person.find({ createdBy: req.payload.accountCompany, status: status }).populate("company");
      const companyContacts = await Company.find({ createdBy: req.payload.accountCompany, status: status });
      const contacts = [
         ...personContacts.map(person => {
            return {
               _id: person._id,
               status: person.status,
               category: "person",
               firstName: person.firstName,
               lastName: person.lastName,
               companyName: person.company ? person.company.companyName : null,
               email: person.email,
               phones: person.phones,
               addresses: person.addresses,
               updatedAt: person.updatedAt
            };
         }),
         ...companyContacts.map(company => {
            return {
               _id: company._id,
               status: company.status,
               category: "company",
               companyName: company.companyName,
               email: company.email,
               phones: company.phones,
               addresses: company.addresses,
               updatedAt: company.updatedAt
            }
         })
      ];
      return res.json({ contacts: contacts });
   } catch (err) { next(err); }
});

// get contact by id ----------
router.get('/id/:contactId', auth.required, async (req, res, next) => {
   const { contactId } = req.params;
   const person = await Person.findOne({ createdBy: req.payload.accountCompany, _id: contactId });
   if (person) return res.json({ contact: await person.toContactJSON() });
   const company = await Company.findOne({ createdBy: req.payload.accountCompany, _id: contactId });
   if (company) return res.json({ contact: await company.toContactJSON() });
   return res.status(404).json({ error: "Not found" });
});

// import conact from csv ------------
router.post('/import/check', auth.required, async (req, res, next) => {
   const { csvArrData } = req.body;
   if (csvArrData.length > 1000) return res.status(422).json({ error: "A maximum of 1,000 contacts can be imported at a time." });
   let skipNum = 0;
   let errorMessages = [];
   let createAvailableRows = [];
   for (let i = 0; i < csvArrData.length; i++) {
      const { firstName, lastName, companyName, email, phone, street, city, state, postCode, country } = csvArrData[i];
      if (firstName) {
         const samePerson = await Person.findOne({ createdBy: req.payload.accountCompany, firstName, lastName });
         if (samePerson) {
            skipNum++;
            continue;
         }
         if (!email) {
            errorMessages.push({
               rowIndex: i,
               message: "Email is a required field. If your customer doesn’t use email, you may enter your own email address for now."
            });
            continue;
         }
         // create new Person contact
         createAvailableRows.push(i);
         continue;
      } else {
         if (lastName) {
            // skip this because firstName is required
            errorMessages.push({
               rowIndex: i,
               message: "First Name is required."
            });
            continue;
         } else {
            // Company
            if (companyName) {
               const company = await Company.findOne({ createdBy: req.payload.accountCompany, companyName: companyName });
               if (company) {
                  // skip this because Company contact is already exist.
                  skipNum++;
                  continue;
               } else {
                  // create new Company contact
                  createAvailableRows.push(i);
                  continue;
               }
            } else {
               // skip this because firstName is required
               errorMessages.push({
                  rowIndex: i,
                  message: "First Name is required."
               });
               continue;
            }
         }
      }
   }
   return res.json({
      skipNum,
      createAvailableRows,
      errorMessages,
   });
});

// import create from csv ------------
router.post('/import/create', auth.required, async (req, res, next) => {
   const { csvArrData } = req.body;
   console.log(" req.body ==>", req.body)
   console.log(" csvArrData ==>", csvArrData)
   if (!csvArrData) return res.status(422).json({ error: "Csv data for importing was not found." });
   else if (!Array.isArray(csvArrData)) return res.status(422).json({ error: "Csv data for importing is invalid." });
   else if (csvArrData.length > 1000) return res.status(422).json({ error: "A maximum of 1,000 contacts can be imported at a time." });
   
   for (let i = 0; i < csvArrData.length; i++) {
      const { firstName, lastName, companyName, email, phone, street, city, state, postCode, country } = csvArrData[i];

      if (firstName) {
         // create new Person contact
         const person = new Person();
         person.createdBy = req.payload.accountCompany;
         person.firstName = firstName;
         person.lastName = lastName;
         person.email = email;
         person.phones = [{
            category: "primaryPhone",
            content: phone
         }];
         person.addresses = [{
            category: "primaryAddress",
            street: street,
            city: city,
            stateOrRegion: state,
            postCode: postCode,
            country: country
         }];
         person.activities = [{
            category: "created",
            at: new Date(),
            by: req.payload.id
         }];
         // Company
         if (companyName) {
            const company = await Company.findOne({ createdBy: req.payload.accountCompany, companyName: companyName });
            if (company) {
               // attach Person to Company
               company.activities.push({
                  category: "personAdded",
                  at: new Date(),
                  by: req.payload.id,
                  editedField: "person",
                  editedPerson: person._id
               });
               person.company = company._id;
               await company.save();
            } else {
               // create Company and then attach Person to Company
               const newCompany = new Company();
               newCompany.createdBy = req.payload.accountCompany;
               newCompany.companyName = companyName;
               newCompany.activities = [{
                  category: "created",
                  at: new Date(),
                  by: req.payload.id
               }];
               newCompany.activities.push({
                  category: "personAdded",
                  at: new Date(),
                  by: req.payload.id,
                  editedField: "person",
                  editedPerson: person._id
               });
               await newCompany.save();
               person.company = newCompany;
            }
         }
         await person.save();
      } else {
         // create new Company contact
         const newCompany = new Company();
         newCompany.createdBy = req.payload.accountCompany;
         newCompany.companyName = companyName;
         newCompany.activities = [{
            category: "created",
            at: new Date(),
            by: req.payload.id
         }];
         await newCompany.save();
      }
   }
   return res.json({ status: "success" });
});

module.exports = router;