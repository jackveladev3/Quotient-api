const router = require("express").Router();
const Company = require("../../../models/Company");
const Person = require("../../../models/Person");
const Quote = require("../../../models/Quote");
const { isEqualAddresses, isEqualPhones, concatArrWithoutDuplication, replaceLoserByWinner } = require("../../../utils");
const auth = require('../../auth');

// get person contacts by company id
router.get('/companyid/:id', auth.required, async (req, res, next) => {
   const docs = await Person.find({ createdBy: req.payload.accountCompany, company: req.params.id });
   return res.json({ contacts: docs });
});

// get person contacts by email ---------
router.get('/search/:search', auth.required, async (req, res, next) => {
   const { search } = req.params;
   const regexp = new RegExp("^" + search);
   Person.find({
      createdBy: req.payload.accountCompany,
      $or: [
         { email: regexp },
         { firstName: regexp }
      ]
   })
      .populate('company')
      .exec((err, contacts) => {
         if (err) return next(err);
         return res.json({
            contacts: contacts.map((person) => {
               const payload = {
                  _id: person._id,
                  firstName: person.firstName,
                  lastName: person.lastName,
                  companyName: person.company ? person.company.companyName : null,
                  email: person.email
               }
               return payload;
            })
         });
      });
});

// create contact --------
router.post('/', auth.required, async (req, res, next) => {
   const person = new Person();
   person.createdBy = req.payload.accountCompany;
   person.firstName = req.body.firstName;
   person.lastName = req.body.lastName;
   person.email = req.body.email;
   if (req.body.companyId) {
      const company = await Company.findById(req.body.companyId);
      if (!company) return res.status(404).json({ error: "not found company contact by id." });
      company.activities.push({
         category: "personAdded",
         at: new Date(),
         by: req.payload.id,
         editedField: "person",
         editedPerson: person._id
      });
      person.company = req.body.companyId;
   } else if (req.body.companyName) {
      const newCompany = new Company();

      newCompany.createdBy = req.payload.accountCompany;
      newCompany.companyName = req.body.companyName;
      newCompany.activities = [{
         category: "created",
         at: new Date(),
         by: req.payload.id
      }];

      await newCompany.save();
      person.company = newCompany;
   }
   person.phones = req.body.phones;
   person.addresses = req.body.addresses;
   person.activities = [{
      category: "created",
      at: new Date(),
      by: req.payload.id
   }];

   person.save().then(async () => {
      return res.json({ contact: await person.toContactJSON() });
   }).catch(next);
});

// update contact by id -----------------------
router.put('/id/:id', auth.required, async (req, res, next) => {
   console.log(" UUUUUUUUUUUUUUUUUUUUUUU ", req.body)
   const { firstName, lastName, email, companyId, companyName, phones, addresses } = req.body;
   Person.findById(req.params.id).then(async person => {
      if (person.firstName !== req.body.firstName || person.lastName !== req.body.lastName) person.activities.push({
         category: "edited",
         at: new Date(),
         by: req.payload.id,
         editedField: "name",
         editedFrom: person.firstName + " " + person.lastName
      });
      person.firstName = req.body.firstName;
      person.lastName = req.body.lastName;

      if (person.email !== req.body.email) person.activities.push({
         category: "edited",
         at: new Date(),
         by: req.payload.id,
         editedField: "email",
         editedFrom: person.email
      });
      person.email = req.body.email;

      if (req.body.companyId || req.body.companyName) {
         // find previous company or create new person
         let company;
         if (req.body.companyId) {
            company = await Company.findById(req.body.companyId);
            if (!company) return res.status(404).json({ error: "not found company contact by id." });
         } else if (req.body.companyName) {
            company = new Company();
            company.createdBy = req.payload.accountCompany;
            company.companyName = req.body.companyName;
            company.activities = [{
               category: "created",
               at: new Date(),
               by: req.payload.id
            }];
         }

         // replace previous company with new one
         if (person.company && person.company.toString() !== req.body.companyId) {
            const oldCompany = await Company.findById(person.company);
            if (!oldCompany) return res.status(404).json({ error: "not found company contact by id." });
            person.activities.push({
               category: "companyChanged",
               at: new Date(),
               by: req.payload.id,
               editedField: "company",
               editedCompany: person.company
            });

            oldCompany.activities.push({
               category: "personRemoved",
               at: new Date(),
               by: req.payload.id,
               editedField: "person",
               editedPerson: person._id
            });
            company.activities.push({
               category: "personAdded",
               at: new Date(),
               by: req.payload.id,
               editedField: "person",
               editedPerson: person._id
            });
         }

         // add company to person
         if (!person.company) {
            person.activities.push({
               category: "companyAdded",
               at: new Date(),
               by: req.payload.id,
               editedField: "company",
               editedCompany: req.body.companyId ? req.body.companyId : null
            });

            company.activities.push({
               category: "personAdded",
               at: new Date(),
               by: req.payload.id,
               editedField: "person",
               editedPerson: person._id
            });
         }
         
         await company.save();
         person.company = company._id;
      } else if (person.company) {
         // remove company from person
         // find previous company and create "personRemoved" activity
         const oldCompany = await Company.findById(person.company);
         if (!oldCompany) return res.status(404).json({ error: "not found company contact by id." });
         oldCompany.activities.push({
            category: "personRemoved",
            at: new Date(),
            by: req.payload.id,
            editedField: "person",
            editedPerson: person._id
         });
         await oldCompany.save();

         // create "companyRemoved" activity for person
         person.activities.push({
            category: "companyRemoved",
            at: new Date(),
            by: req.payload.id,
            editedField: "company",
            editedCompany: person.company
         });
         person.company = null;
      }

      // add phones
      if (req.body.phones) {
         if (!isEqualPhones(person.phones, req.body.phones)) {
            person.activities.push({
               category: "edited",
               at: new Date(),
               by: req.payload.id,
               editedField: "phones"
            });
         }
         person.phones = req.body.phones;
      }
      // add addresses
      if (req.body.addresses) {
         if (!isEqualAddresses(person.addresses, req.body.addresses)) {
            const actLen = person.activities.length;
            if (person.activities[actLen - 1].category === "edited"
               && person.activities[actLen - 1].editedField === "addresses"
            ) {
               person.activities[actLen - 1].at = new Date();
               person.activities[actLen - 1].by = req.payload.id;
            }
            else person.activities.push({
               category: "edited",
               at: new Date(),
               by: req.payload.id,
               editedField: "addresses"
            });
         }
         person.addresses = req.body.addresses;
      }
      await person.save();
      Person.populate(person, { path: 'company' }, (err, populatedPerson) => {
         if (err) return res.status(422).json({ error: "populating error." })
         return res.json({ contact: populatedPerson });
      })
   }).catch(next);
});

// get activities by id --------
router.get('/activities/:id', auth.required, async (req, res, next) => {
   Person.findById(req.params.id).populate('activities.by activities.editedCompany').exec((err, person) => {
      if (err) return next(err);
      return res.json({
         activities: person.activities.map(activity => {
            return {
               category: activity.category,
               at: activity.at,
               by: activity.by ?
                  `${activity.by.firstName + " " + activity.by.lastName}` : null,
               editedField: activity.editedField,
               editedFrom: activity.editedFrom,
               editedCompany: activity.editedCompany ?
                  {
                     _id: activity.editedCompany._id,
                     companyName: activity.editedCompany.companyName
                  } : null,
               loserOfMergeTitle: activity.loserOfMergeTitle
            };
         })
      });
   });
})

// archive specific contact
router.put('/archive/:id', auth.required, async (req, res, next) => {
   const person = await Person.findById(req.params.id);
   if (!person) return res.status(404).json({ error: "Not found person contact." });
   person.status = 'archived';
   person.activities.push({
      category: "archived",
      at: new Date(),
      by: req.payload.id
   });
   person.save()
      .then(() => {
         return res.json({ contact: person });
      })
      .catch(next);
});

// archive specific contact
router.put('/un-archive/:id', auth.required, async (req, res, next) => {
   const person = await Person.findById(req.params.id);
   if (!person) return res.status(404).json({ error: "Not found person contact." });
   person.status = 'current';
   person.activities.push({
      category: "unarchived",
      at: new Date(),
      by: req.payload.id
   });
   person.save()
      .then(() => {
         return res.json({ contact: person });
      })
      .catch(next);
});

// merge contact
router.post('/merge', auth.required, async (req, res, next) => {
   const { winnerOfMerge, loserOfMerge } = req.body;
   if (!winnerOfMerge || !loserOfMerge) return res.status(422).json({ error: "invalid request." });

   try {
      const loserPerson = await Person.findById(loserOfMerge);
      const winnerPerson = await Person.findById(winnerOfMerge);
      if (loserPerson.quotes.length) {
         loserPerson.quotes.forEach(async qId => {
            const quote = await Quote.findById(qId);
            // if (!quote) return res.status(404).json({ error: "not found quote by id of person's quoteId list." });
            if (quote) {
               quote.toPeopleList = replaceLoserByWinner(quote.toPeopleList, "person", loserOfMerge, winnerOfMerge);
               await quote.save();
            }
         });
         winnerPerson.quotes = concatArrWithoutDuplication(winnerPerson.toPeopleList, loserPerson.toPeopleList);
      }
      winnerPerson.activities.push({
         category: "merged",
         at: new Date(),
         by: req.payload.id,
         loserOfMergeTitle: loserPerson.firstName + " " + loserPerson.lastName
      });
      await winnerPerson.save();

      loserPerson.status = "merged";
      loserPerson.company = null;
      await loserPerson.save();
      return res.json({ status: "success" });
   } catch (err) { next(err); }
});

module.exports = router;
