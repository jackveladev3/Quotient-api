const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PriceItemSchema = new Schema({
   tag: { type: String, default: null },
   status: { type: String, lowercase: true, default: "current" },
   // status: { type: String, lowercase: true, default: "archived" },
   templates: [{ type: Schema.Types.ObjectId, ref: 'Template' }],

   createdBy: { type: Schema.Types.ObjectId, required: [true, "can't be blank"], ref: 'AccountCompany' },
   isOptional: { type: Boolean, default: false },
   isOptionSelected: { type: Boolean, default: false },
   isMultipleChoice: { type: Boolean, default: false },
   isChoiceSelected: { type: Boolean, default: false },
   isEditableQuantity: { type: Boolean, default: false },
   isDiscount: { type: Boolean, default: false },
   discount: Number,

   isSubscription: { type: Boolean, default: false },
   per: { type: Number, default: 1 },
   every: { type: String, default: 'week' },
   period: { type: Number, default: null },

   isCostPriceMargin: { type: Boolean, default: false },
   costPrice: Number,
   margin: Number,

   itemCode: String,
   productHeading: String,
   longDescription: String,
   files: [String],
   salesCategory: { type: Schema.Types.ObjectId, ref: "SalesCategory" },
   salesTax: { type: Schema.Types.ObjectId, ref: "SalesTax" },

   unitPrice: Number,
   quantity: Number,
   itemTotal: Number,

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

const PriceItem = mongoose.model('PriceItem', PriceItemSchema);
module.exports = PriceItem;
