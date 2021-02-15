const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const SalesTax = require('./SalesTax');
const SalesCategory = require('./SalesCategory');
const QuoteDefaultSetting = require('./Settings/QuoteDefaultSetting');
const AppearanceSetting = require('./Settings/AppearanceSetting');


const AccountCompanySchema = new Schema({
   status: { type: String, default: "active" },
   // status: { type: String, default: "deactivated" },

   // teamMembers: [{ type: Schema.Types.ObjectId, ref: "Account" }],
   owner: { type: Schema.Types.ObjectId, required: [true, "can't be blank"], ref: 'Account' },

   companyName: { type: String, required: [true, "can't be blank"] },
   location: { type: Number, required: [true, "can't be blank"], default: 232 },
   timeZone: { type: Number, required: [true, "can't be blank"], default: 60000 },
   dateFormat: { type: Number, required: [true, "can't be blank"], default: 0 },

   subscriptionId: { type: String, default: null },

   appearanceSetting: { type: Schema.Types.ObjectId, required: [true, "can't be blank"], ref: "AppearanceSetting" },
   quoteDefaultSetting: { type: Schema.Types.ObjectId, required: [true, "can't be blank"], ref: "QuoteDefaultSetting" },
   customerEmailSetting: { type: Schema.Types.ObjectId, required: [true, "can't be blank"], ref: "CustomerEmailSetting" },

   defaultSalesTax: { type: Schema.Types.ObjectId, required: [true, "can't be blank"], ref: "SalesTax" },
   defaultSalesCategory: { type: Schema.Types.ObjectId, required: [true, "can't be blank"], ref: "SalesCategory" },

   // email notification setting
   emailNotificationSetting: {
      isQuoteViewedNotificationToAuthorEnabled: { type: Boolean, default: true },
      quoteSentNotificationEmails: [{ type: String }],
      quoteAccptedNotificationEmails: [{ type: String }],
   },

   expireAt: Date
}, { timestamps: true });

AccountCompanySchema.methods.createDefaultSalesTaxes = async function () {
   const zero = new SalesTax();
   zero.createdBy = this._id;
   zero.taxName = "No tax";
   zero.taxRate = 0;
   await zero.save();
   const ten = new SalesTax();
   ten.createdBy = this._id;
   ten.taxName = "10% tax";
   ten.taxRate = 10;
   await ten.save();
   this.defaultSalesTax = ten;
};

AccountCompanySchema.methods.createDefaultSalesCategory = async function () {
   const defaultOne = new SalesCategory();
   defaultOne.createdBy = this._id;
   defaultOne.categoryName = "Sales";
   defaultOne.description = "General sales";
   defaultOne.defaultSalesTax = null;
   await defaultOne.save();
   this.defaultSalesCategory = defaultOne;
};

const AccountCompany = mongoose.model('AccountCompany', AccountCompanySchema);
module.exports = AccountCompany;