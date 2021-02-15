const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SalesCategorySchema = new Schema({
   createdBy: { type: Schema.Types.ObjectId, ref: "AccountCompany" },
   status: { type: String, lowercase: true, default: "current" },
   // status: { type: String, lowercase: true, default: "archived" },
   categoryName: String,
   description: String,
   defaultSalesTax: { type: Schema.Types.ObjectId, ref: "SalesTax" }
});

const SalesCategory = mongoose.model("SalesCategory", SalesCategorySchema);
module.exports = SalesCategory;