const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AppearanceSettingSchema = new Schema({
   logo: { type: String, default: null },

   colors: {
      buttonsAndLinks: { type: String, default: "#2176C7" },
      highlights: { type: String, default: "#E9F1F9" },
      background: { type: String, default: "#f9f9f9" }
   },
   contactDetailLayout: { type: Number, default: 0 },
   isDisplayFullCustomerDetail: { type: Boolean, default: false },
   layout: { type: Number, default: 0 },

   headingFont: { type: Number, default: 0 },
   bodyText: { type: Number, default: 0 },
   headingWeight: { type: Number, default: 0 },

   describeTaxAs: { type: Number, default: 4 },
   displayCurrencySymbolInTotal: { type: Boolean, default: true },
   displayCurrencyCodeInTotal: { type: Boolean, default: false },

   isEnabledPrintPDF: { type: Boolean, default: false },
   pdfPageSize: { type: Number, default: 1 },

   companyDisplayName: { type: String, required: [true, "can't be blank"] },
   address: { type: String, default: "" },
   website: { type: String, default: "" },
   phone: { type: String, default: "" },
});

const AppearanceSetting = mongoose.model('AppearanceSetting', AppearanceSettingSchema);
module.exports = AppearanceSetting;