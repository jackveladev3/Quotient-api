const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SalesTaxSchema = new Schema({
   createdBy: { type: Schema.Types.ObjectId, ref: "AccountCompany" },
   status: { type: String, lowercase: true, default: "current" },
   // status: { type: String, lowercase: true, default: "archived" },
   taxName: { type: String },
   taxRate: { type: Number }
});

const SalesTax = mongoose.model("SalesTax", SalesTaxSchema);
module.exports = SalesTax;