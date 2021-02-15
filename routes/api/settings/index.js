const router = require("express").Router();
const AccountCompany = require("../../../models/AccountCompany");
const SalesTax = require("../../../models/SalesTax");
const AppearanceSetting = require("../../../models/Settings/AppearanceSetting");
const QuoteDefaultSetting = require("../../../models/Settings/QuoteDefaultSetting");
const auth = require("../../auth");
router.use('/team', require("./team"));
router.use('/sales-category', require("./salesCategory"));
router.use('/sales-tax', require("./salesTax"));
router.use('/appearance', require("./appearance"));
router.use('/customer-email', require("./customerEmail"));
router.use('/quote-default', require("./quoteDefault"));
router.use('/payment', require("./payment"));
router.use('/notifications', require("./notifications"));

// Setting quick-start
router.post('/quick-start', auth.required, async (req, res, next) => {
   const { accountCompany, quoteDefaultSetting, appearanceSetting, defaultSalesTaxRate } = req.body;
   const {
      timeZone,
   } = accountCompany;
   const {
      currency,
      taxMode,
   } = quoteDefaultSetting;
   const {
      logo,
      describeTaxAs,
      companyDisplayName,
      address,
      website,
      phone
   } = appearanceSetting
   console.log(" ================================================ req.body  ", req.body)
   AccountCompany.findById(req.payload.accountCompany).then(async accountCompanyDoc => {
      accountCompanyDoc.timeZone = timeZone;
      await accountCompanyDoc.save();
      console.log(" accountCompany.quoteDefaultSetting . ", accountCompanyDoc.quoteDefaultSetting)
      QuoteDefaultSetting.findById(accountCompanyDoc.quoteDefaultSetting).then(async quoteDefaultSettingDoc => {
         quoteDefaultSettingDoc.currency = currency;
         quoteDefaultSettingDoc.taxMode = taxMode;
         await quoteDefaultSettingDoc.save();
         AppearanceSetting.findById(accountCompanyDoc.appearanceSetting).then(async appearanceSettingDoc => {
            appearanceSettingDoc.logo = logo;
            appearanceSettingDoc.describeTaxAs = describeTaxAs;
            appearanceSettingDoc.companyDisplayName = companyDisplayName;
            appearanceSettingDoc.address = address;
            appearanceSettingDoc.website = website;
            appearanceSettingDoc.phone = phone;
            await appearanceSettingDoc.save();
            SalesTax.findById(accountCompanyDoc.defaultSalesTax).then(async salesTaxDoc => {
               salesTaxDoc.taxRate = defaultSalesTaxRate;
               await salesTaxDoc.save();
               return res.json({ status: "success" });
            }).catch(next);
         }).catch(next);
      }).catch(next);
   }).catch(next);
});

module.exports = router;