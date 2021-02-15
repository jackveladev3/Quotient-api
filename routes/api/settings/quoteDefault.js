const auth = require("../../auth");
const router = require("express").Router();
const AccountCompany = require("../../../models/AccountCompany");
const AppearanceSetting = require("../../../models/Settings/AppearanceSetting");
const QuoteDefaultSetting = require("../../../models/Settings/QuoteDefaultSetting");

// get quoteDefaultSetting
router.get('/', auth.required, async (req, res, next) => {
   const { accountCompany } = req.payload;
   AccountCompany.findById(accountCompany).then(accountCompany => {
      QuoteDefaultSetting.findById(accountCompany.quoteDefaultSetting)
         .then(quoteDefaultSetting => {
            return res.json({ quoteDefaultSetting });
         }).catch(next);
   }).catch(next);
})

// update quoteDefaultSetting
router.put('/', auth.required, async (req, res, next) => {
   const { setting } = req.body;
   if (!setting._id) return res.status(422).json({ error: "quoteDefaultSetting id can't be blank." });

   QuoteDefaultSetting.findById(setting._id).then(quoteDefaultSetting => {
      quoteDefaultSetting.expirationQuoteAfter = setting.expirationQuoteAfter;
      quoteDefaultSetting.nextQuoteNumber = setting.nextQuoteNumber;
      quoteDefaultSetting.currency = setting.currency;
      quoteDefaultSetting.taxMode = setting.taxMode;
      quoteDefaultSetting.pricingDisplayLevel = setting.pricingDisplayLevel;
      quoteDefaultSetting.displayItemCode = setting.displayItemCode;
      quoteDefaultSetting.showCostPriceMarginAlways = setting.showCostPriceMarginAlways;
      quoteDefaultSetting.defaultMargin = setting.defaultMargin;

      quoteDefaultSetting.save().then(() => {
         return res.json({ quoteDefaultSetting });
      }).catch(next);
   }).catch(next);
});
module.exports = router;