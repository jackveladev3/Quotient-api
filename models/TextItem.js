const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TextItemSchema = new Schema({
   tag: String,
   status: { type: String, lowercase: true, default: "current" },
   // status: { type: String, lowercase: true, default: "archived" },
   templates: [{ type: Schema.Types.ObjectId, ref: 'Template' }],

   createdBy: { type: Schema.Types.ObjectId, required: [true, "can't be blank"], ref: 'AccountCompany' },
   textHeading: String,
   longDescription: String,
   files: [String],

   activities: [
      {
         category: String,
         // category: "created"
         // category: "edited"
         // category: "merged"
         // category: "updatedViaImport"
         at: Date,
         by: { type: Schema.Types.ObjectId, ref: 'Account' },
         loserOfMergeTitle: String
      }
   ]
}, { timestamps: true });

const TextItem = mongoose.model('TextItem', TextItemSchema);
module.exports = TextItem;