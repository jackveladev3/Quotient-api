const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const QuoteDefaultSettingSchema = new Schema({
   currency: { type: Number, required: [true, "can't be blank"], default: 156 },
   expirationQuoteAfter: { type: Number, default: 90 },
   currentQuoteNumber: { type: Number, default: 0 },
   nextQuoteNumber: { type: Number, default: 1 },
   taxMode: { type: String, default: "exclusive_including" },
   pricingDisplayLevel: { type: String, default: "itemQuantityAndTotal" },
   displayItemCode: { type: Boolean, default: true },
   showCostPriceMarginAlways: { type: Boolean, default: false },
   defaultMargin: { type: Number, default: 20 },
});


const QuoteDefaultSetting = mongoose.model('QuoteDefaultSetting', QuoteDefaultSettingSchema);
module.exports = QuoteDefaultSetting;