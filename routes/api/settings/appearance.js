const auth = require("../../auth");
const router = require("express").Router();
const AccountCompany = require("../../../models/AccountCompany");
const AppearanceSetting = require("../../../models/Settings/AppearanceSetting");

// get appearanceSetting
router.get('/', auth.required, async (req, res, next) => {
   AccountCompany.findById(req.payload.accountCompany).then(accountCompany => {
      AppearanceSetting.findById(accountCompany.appearanceSetting)
         .then(appearanceSetting => {
            return res.json({
               appearanceSetting: {
                  logo: appearanceSetting.logo,
                  companyDisplayName: appearanceSetting.companyDisplayName,
                  address: appearanceSetting.address,
                  website: appearanceSetting.website,
                  phone: appearanceSetting.phone,
                  colors: appearanceSetting.colors,
                  contactDetailLayout: appearanceSetting.contactDetailLayout,
                  isDisplayFullCustomerDetail: appearanceSetting.isDisplayFullCustomerDetail,
                  layout: appearanceSetting.layout,
                  headingFont: appearanceSetting.headingFont,
                  bodyText: appearanceSetting.bodyText,
                  headingWeight: appearanceSetting.headingWeight,
                  describeTaxAs: appearanceSetting.describeTaxAs,
                  displayCurrencySymbolInTotal: appearanceSetting.displayCurrencySymbolInTotal,
                  displayCurrencyCodeInTotal: appearanceSetting.displayCurrencyCodeInTotal,
                  isEnabledPrintPDF: appearanceSetting.isEnabledPrintPDF,
                  pdfPageSize: appearanceSetting.pdfPageSize,
               }
            });
         }).catch(next);
   }).catch(next);
});

// get appearanceSetting
router.put('/', auth.required, async (req, res, next) => {
   const { setting } = req.body;
   AccountCompany.findById(req.payload.accountCompany).then(async accountCompany => {
      await accountCompany.save();
      AppearanceSetting.findById(accountCompany.appearanceSetting).then(async appearanceSetting => {
         appearanceSetting.logo = setting.logo;
         appearanceSetting.companyDisplayName = setting.companyDisplayName;
         appearanceSetting.address = setting.address;
         appearanceSetting.website = setting.website;
         appearanceSetting.phone = setting.phone;
         appearanceSetting.colors = { ...setting.colors };
         appearanceSetting.contactDetailLayout = setting.contactDetailLayout;
         appearanceSetting.isDisplayFullCustomerDetail = setting.isDisplayFullCustomerDetail;
         appearanceSetting.layout = setting.layout;
         appearanceSetting.headingFont = setting.headingFont;
         appearanceSetting.bodyText = setting.bodyText;
         appearanceSetting.headingWeight = setting.headingWeight;
         appearanceSetting.describeTaxAs = setting.describeTaxAs;
         appearanceSetting.displayCurrencySymbolInTotal = setting.displayCurrencySymbolInTotal;
         appearanceSetting.displayCurrencyCodeInTotal = setting.displayCurrencyCodeInTotal;
         appearanceSetting.isEnabledPrintPDF = setting.isEnabledPrintPDF;
         appearanceSetting.pdfPageSize = setting.pdfPageSize;
         await appearanceSetting.save();
         return res.json({
            appearanceSetting: {
               logo: appearanceSetting.logo,
               companyDisplayName: appearanceSetting.companyDisplayName,
               address: appearanceSetting.address,
               website: appearanceSetting.website,
               phone: appearanceSetting.phone,
               colors: appearanceSetting.colors,
               contactDetailLayout: appearanceSetting.contactDetailLayout,
               isDisplayFullCustomerDetail: appearanceSetting.isDisplayFullCustomerDetail,
               layout: appearanceSetting.layout,
               headingFont: appearanceSetting.headingFont,
               bodyText: appearanceSetting.bodyText,
               headingWeight: appearanceSetting.headingWeight,
               describeTaxAs: appearanceSetting.describeTaxAs,
               displayCurrencySymbolInTotal: appearanceSetting.displayCurrencySymbolInTotal,
               displayCurrencyCodeInTotal: appearanceSetting.displayCurrencyCodeInTotal,
               isEnabledPrintPDF: appearanceSetting.isEnabledPrintPDF,
               pdfPageSize: appearanceSetting.pdfPageSize
            }
         });
      }).catch(next);
   }).catch(next);
});

module.exports = router;