const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CompanySchema = new Schema({
   category: { type: String, default: "company" },
   status: { type: String, default: "current" },
   // status: { type: String, default: "archived" },
   // status: { type: String, default: "merged" },
   createdBy: { type: Schema.Types.ObjectId, required: [true, "can't be blank"], ref: 'AccountCompany' },
   companyName: String,
   email: { type: String, match: [/\S+@\S+\.\S+/, 'is invalid'] },
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
         // category: "personAdded"
         // category: "personRemoved"
         at: Date,
         by: { type: Schema.Types.ObjectId, ref: 'Account' },

         editedField: String,
         editedFrom: String,
         editedPerson: { type: Schema.Types.ObjectId, ref: 'Person' },
         loserOfMergeTitle: String
      }
   ]
}, { timestamps: true });

CompanySchema.methods.toContactJSON = function () {
   let that = this;
   return new Promise((resolve, reject) => {
      that.populate({
         path: 'activities.by activities.editedPerson',
         select: '-createdAt -updatedAt -__v'
      }, (err, company) => {
         if (err) reject({ error: "error during populating company contact." });
         resolve({
            _id: company._id,
            category: company.category,
            status: company.status,
            companyName: company.companyName,
            email: company.email,
            phones: company.phones,
            addresses: company.addresses
         });
      });
   });
}

const Company = mongoose.model("Company", CompanySchema);
module.exports = Company;