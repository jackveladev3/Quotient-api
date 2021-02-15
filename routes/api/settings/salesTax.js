const auth = require("../../auth");
const router = require("express").Router();
const AccountCompany = require("../../../models/AccountCompany");
const SalesTax = require("../../../models/SalesTax");

// get sales-tax list (with status)
router.get('/status/:status', auth.required, async (req, res, next) => {
   const { status } = req.params;
   SalesTax.find({ createdBy: req.payload.accountCompany, status: status }).then(taxes => {
      return res.json({ taxes });
   }).catch(next);
});

// get default sales-tax
router.get('/default', auth.required, async (req, res, next) => {
   AccountCompany.findById(req.payload.accountCompany).then(accountCompany => {
      const defaultSalesTax = accountCompany.defaultSalesTax;
      return res.json({ defaultSalesTax });
   }).catch(next);
});


// make sales-tax default
router.put('/default', auth.required, async (req, res, next) => {
   const { salesTaxId } = req.body;
   SalesTax.findById(salesTaxId).then(salesTax => {
      AccountCompany.findById(req.payload.accountCompany).then(accountCompany => {
         accountCompany.defaultSalesTax = salesTax._id;
         accountCompany.save().then(() => {
            return res.json({ defaultSalesTax: salesTax._id });
         }).catch(next);
      }).catch(next);
   }).catch(next);
});

// archive sales-tax
router.get('/archive/:id', auth.required, async (req, res, next) => {
   AccountCompany.findById(req.payload.accountCompany).then(accountCompany => {
      const { defaultSalesTax } = accountCompany;
      console.log('req.params.id', req.params.id)
      SalesTax.findById(req.params.id).then(salesTax => {
         console.log('salesTax ______________', salesTax)
         if (defaultSalesTax === salesTax._id) return res.status(422).json({ error: "can't archive default salesTax." });
         salesTax.status = "archived";
         salesTax.save().then(() => {
            return res.json({ salesTax });
         }).catch(next);
      }).catch(next);
   }).catch(next);
})

// un-archive sales-tax
router.get('/un-archive/:id', auth.required, async (req, res, next) => {
   SalesTax.findById(req.params.id).then(salesTax => {
      salesTax.status = "current";
      salesTax.save().then(() => {
         return res.json({ salesTax });
      }).catch(next);
   }).catch(next);
})

// get sales-tax by id
router.get('/:id', auth.required, async (req, res, next) => {
   SalesTax.findById(req.params.id).then(salesTax => {
      return res.json({ salesTax });
   }).catch(next);
});

// create sales-tax
router.post('/create-new', auth.required, async (req, res, next) => {
   const { taxName, taxRate } = req.body;
   const salesTax = new SalesTax();
   salesTax.createdBy = req.payload.accountCompany;
   salesTax.taxName = taxName;
   salesTax.taxRate = taxRate;
   salesTax.save().then(() => {
      return res.json({ status: "success" });
   }).catch(next);
});


// update sales-tax
router.put('/:id', auth.required, async (req, res, next) => {
   SalesTax.findById(req.params.id).then(async salesTax => {
      const { taxName, taxRate } = req.body;
      salesTax.taxName = taxName;
      salesTax.taxRate = taxRate;
      await salesTax.save()
      return res.json({ status: "success" });
   }).catch(next);
});


module.exports = router;