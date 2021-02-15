const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TemplateSchema = new Schema({
   tag: String,
   status: { type: String, lowercase: true, default: "current" },
   // status: { type: String, lowercase: true, default: "archived" },
   createdBy: { type: Schema.Types.ObjectId, required: [true, "can't be blank"], ref: 'Account' },
   title: { type: String, required: [true, "can't be blank"] },
   settings: {
      discount: { type: Number },
      currency: String,
      taxMode: String,
      pricingDisplayLevel: { type: String, default: "itemQuantityAndTotal" },
      displayItemCode: Boolean
   },
   items: [{
      category: {
         type: String,
         default: "priceItem"
         // default: "textItem"
         // default: "subTotal"
      },
      priceItem: { type: Schema.Types.ObjectId, ref: 'PriceItem' },
      textItem: { type: Schema.Types.ObjectId, ref: 'TextItem' },
   }],
   notes: [{
      category: { type: String, default: "textItem" },
      textItem: { type: Schema.Types.ObjectId, ref: 'TextItem' },
   }]
}, { timestamps: true });


const Template = mongoose.model("Template", TemplateSchema);
module.exports = Template;