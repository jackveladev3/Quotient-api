const mongoose = require('mongoose');
const { reject } = require('underscore');
const Company = require('./Company');
const Schema = mongoose.Schema;

const PersonSchema = new Schema({
   quotes: [{ type: Schema.Types.ObjectId, required: [true, "can't be null"], ref: 'Quote' }],

   category: { type: String, default: "person" },
   status: { type: String, default: "current" },
   // status: { type: String, default: "archived" },
   // status: { type: String, default: "merged" },
   createdBy: { type: Schema.Types.ObjectId, required: [true, "can't be blank"], ref: 'AccountCompany' },

   firstName: { type: String, required: [true, "can't be blank"] },
   lastName: String,
   company: { type: Schema.Types.ObjectId, ref: 'Company' },
   email: { type: String, required: [true, "can't be blank"], match: [/\S+@\S+\.\S+/, 'is invalid'] },
   phones: [{
      category: { type: String },
      content: { type: String }
   }],
   addresses: [{
      category: { type: String },
      street: { type: String },
      city: { type: String },
      stateOrRegion: { type: String },
      postCode: { type: String },
      country: { type: String }
   }],

   activities: [
      {
         category: String,
         // category: "created"
         // category: "edited"
         // category: "merged"
         // category: "archived"
         // category: "unarchived"
         // category: "companyAdded"
         // category: "companyChanged"
         // category: "companyRemoved"
         at: Date,
         by: { type: Schema.Types.ObjectId, ref: 'Account' },

         editedField: String,
         editedFrom: String,
         editedCompany: { type: Schema.Types.ObjectId, ref: 'Company' },
         loserOfMergeTitle: String,
      }
   ]
}, { timestamps: true });

PersonSchema.methods.toContactJSON = function () {
   let that = this;
   return new Promise((resolve, reject) => {
      that.populate({
         path: 'company',
         select: '-createdAt -updatedAt -__v'
      }, (err, person) => {
         if (err) reject({ error: "error during populate person contact." });
         resolve({
            _id: person._id,
            category: person.category,
            status: person.status,
            firstName: person.firstName,
            lastName: person.lastName,
            company: person.company ? {
               _id: person.company._id,
               companyName: person.company.companyName
            } : null,
            email: person.email,
            phones: person.phones,
            addresses: person.addresses,
            activities: person.activities
         });
      });
   });
}
// ---------
PersonSchema.methods.removeAndSaveQuotes = function (quoteId) {
   const that = this;
   return new Promise((resolve, reject) => {
      // remove quoteId from Person's quotes
      that.quotes = that.quotes.filter(qId => qId.toString() !== that._id.toString());
      that.save().then(() => {
         resolve({ status: "success" });
      }).catch(err => {
         reject({ error: "failed to update quotes of Person" });
      })
   });
}
// ------------
PersonSchema.methods.pushAndSaveQuotes = function (quoteId) {
   const that = this;
   return new Promise((resolve, reject) => {
      // push quoteId into Person's quotes
      that.quotes.push(quoteId);
      that.save().then(() => {
         resolve({ status: "success" });
      }).catch(err => {
         reject({ error: "failed to update quotes of Person" });
      })
   });
}

const Person = mongoose.model("Person", PersonSchema);
module.exports = Person;