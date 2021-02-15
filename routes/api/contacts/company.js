const router = require("express").Router();
const Company = require("../../../models/Company");
const { isEqualPhones, isEqualAddresses } = require("../../../utils");
const auth = require('../../auth');

// search companies by name
router.post('/name', auth.required, async (req, res, next) => {
   if (req.body.companyName === "") return res.json({ contacts: [] });
   Company.find({ createdBy: req.payload.accountCompany, companyName: { $regex: req.body.companyName, $options: "i" } })
      .then((docs) => {
         console.log(docs);
         return res.json({ contacts: docs });
      })
      .catch(next);
});

// get company contacts by email
router.post('/email', auth.required, async (req, res, next) => {
   if (req.body.email === "") return res.status(422).json({ error: "email is empty string" });
   const docs2 = await Company.find({ createdBy: req.payload.accountCompany, email: { $regex: req.body.email, $options: "i" } });
   const contacts = [...docs2];
   return res.json({ contacts: contacts });
});

// create contact
router.post('/', auth.required, async (req, res, next) => {
   const company = new Company();

   company.createdBy = req.payload.accountCompany;
   company.companyName = req.body.companyName;
   company.email = req.body.email;
   company.phones = req.body.phones;
   company.addresses = req.body.addresses;
   company.activities = [{
      category: "created",
      at: new Date(),
      by: req.payload.id
   }];

   company.save().then(() => {
      return res.json({ contact: company });
   }).catch(next);
});

// get company by id
router.get('/id/:id', auth.required, async (req, res, next) => {
   if (!req.params.id) return res.status(422).json({ error: "company id can't be empty." });
   Company.findById(req.params.id)
      .then((doc) => {
         return res.json({ contact: doc });
      })
      .catch(next);
});

// update contact by id
router.put('/id/:id', auth.required, async (req, res, next) => {
   const company = await Company.findOne({ createdBy: req.payload.accountCompany, _id: req.params.id });
   if (!company) return res.status(404).json({ error: "Not found company." });

   if (typeof req.body.email !== 'undefined') {
      if (company.email !== req.body.email) {
         company.activities.push({
            category: "edited",
            at: new Date(),
            by: req.payload.id,
            editedField: "email",
            editedFrom: company.email
         });
      }
      company.email = req.body.email;
   }
   if (typeof req.body.companyName !== 'undefined') {
      if (company.companyName !== req.body.companyName) {
         company.activities.push({
            category: "edited",
            at: new Date(),
            by: req.payload.id,
            editedField: "name",
            editedFrom: company.companyName
         });
      }
      company.companyName = req.body.companyName;
   }
   if (typeof req.body.phones !== 'undefined') {
      if (!isEqualPhones(company.phones, req.body.phones)) {
         company.activities.push({
            category: "edited",
            at: new Date(),
            by: req.payload.id,
            editedField: "phones"
         });
      }
      company.phones = req.body.phones;
   }
   if (typeof req.body.addresses !== 'undefined') {
      if (!isEqualAddresses(company.addresses, req.body.addresses)) {
         const actLen = company.activities.length;
         if (company.activities[actLen - 1].category === "edited"
            && company.activities[actLen - 1].editedField === "addresses"
         ) {
            company.activities[actLen - 1].at = new Date();
            company.activities[actLen - 1].by = req.payload.id;
         }
         else company.activities.push({
            category: "edited",
            at: new Date(),
            by: req.payload.id,
            editedField: "addresses"
         });
      }
      company.addresses = req.body.addresses;
   }

   return company.save().then(() => {
      return res.json({ contact: company });
   });
});

// get activities by id --------
router.get('/activities/:id', auth.required, async (req, res, next) => {
   Company.findById(req.params.id).populate('activities.by activities.editedPerson').exec((err, company) => {
      if (err) return next(err);
      console.log(" company.activities ----> ", company.activities)
      return res.json({
         activities: company.activities.map(activity => {
            return {
               category: activity.category,
               at: activity.at,
               by: activity.by ?
                  `${activity.by.firstName + " " + activity.by.lastName}` : null,
               editedField: activity.editedField,
               editedFrom: activity.editedFrom,
               editedPerson: activity.editedPerson ?
                  {
                     _id: activity.editedPerson._id,
                     firstName: activity.editedPerson.firstName,
                     lastName: activity.editedPerson.lastName
                  } : null,
               loserOfMergeTitle: activity.loserOfMergeTitle
            };
         })
      });
   });
})

// archive specific contact
router.put('/archive/:id', auth.required, async (req, res, next) => {
   const company = await Company.findById(req.params.id);
   if (!company) return res.status(404).json({ error: "Not found company contact." });
   company.status = 'archived';
   company.activities.push({
      category: "archived",
      at: new Date(),
      by: req.payload.id
   });
   company.save()
      .then(() => {
         return res.json({ contact: company });
      })
      .catch(next);
});

// archive specific contact
router.put('/un-archive/:id', auth.required, async (req, res, next) => {
   const company = await Company.findById(req.params.id);
   if (!company) return res.status(404).json({ error: "Not found company contact." });
   company.status = 'current';
   company.activities.push({
      category: "unarchived",
      at: new Date(),
      by: req.payload.id
   });
   company.save()
      .then(() => {
         return res.json({ contact: company });
      })
      .catch(next);
});

// merge contact
router.post('/merge', auth.required, async (req, res, next) => {
   const { winnerOfMerge, loserOfMerge } = req.body;
   if (!winnerOfMerge || !loserOfMerge) return res.status(422).json({ error: "invalid request." });

   Company.findById(loserOfMerge).then(async loserCompany => {
      const winnerPerson = await Company.findById(winnerOfMerge);
      if (!winnerPerson) return res.status(422).json({ error: "can't find winnerPerson by id" });

      winnerPerson.activities.push({
         category: "merged",
         at: new Date(),
         by: req.payload.id,
         loserOfMergeTitle: loserCompany.companyName
      });
      await winnerPerson.save();
      
      await loserCompany.isMergedBy();
      return res.json({ status: "success" });
   });
});

module.exports = router;