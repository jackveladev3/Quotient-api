const auth = require("../../auth");
const router = require("express").Router();
const AccountCompany = require("../../../models/AccountCompany");
const SalesCategory = require("../../../models/SalesCategory");

// get sales-category list (with status)
router.get('/status/:status', auth.required, async (req, res, next) => {
   const { status } = req.params;
   SalesCategory.find({ createdBy: req.payload.accountCompany, status: status }).then(categories => {
      return res.json({ categories });
   }).catch(next);
});

// get default sales-category
router.get('/default', auth.required, async (req, res, next) => {
   AccountCompany.findById(req.payload.accountCompany).then(accountCompany => {
      const defaultSalesCategory = accountCompany.defaultSalesCategory;
      return res.json({ defaultSalesCategory });
   }).catch(next);
});

// make sales-category default
router.put('/default', auth.required, async (req, res, next) => {
   const { salesCategoryId } = req.body;
   SalesCategory.findById(salesCategoryId).then(salesCategory => {
      AccountCompany.findById(req.payload.accountCompany).then(accountCompany => {
         accountCompany.defaultSalesCategory = salesCategory._id;
         accountCompany.save().then(() => {
            return res.json({ defaultSalesCategory: salesCategory._id });
         }).catch(next);
      }).catch(next);
   }).catch(next);
});

// archive sales-category
router.get('/archive/:id', auth.required, async (req, res, next) => {
   AccountCompany.findById(req.payload.accountCompany).then(accountCompany => {
      const { defaultSalesCategory } = accountCompany;
      console.log('req.params.id', req.params.id)
      SalesCategory.findById(req.params.id).then(salesCategory => {
         if (defaultSalesCategory === salesCategory._id) return res.status(422).json({ error: "can't archive default sales Category." });
         salesCategory.status = "archived";
         salesCategory.save().then(() => {
            return res.json({ salesCategory });
         }).catch(next);
      }).catch(next);
   }).catch(next);
});

// un-archive sales-category
router.get('/un-archive/:id', auth.required, async (req, res, next) => {
   SalesCategory.findById(req.params.id).then(salesCategory => {
      salesCategory.status = "current";
      salesCategory.save().then(() => {
         return res.json({ salesCategory });
      }).catch(next);
   }).catch(next);
});

// get sales-category by id
router.get('/:id', auth.required, async (req, res, next) => {
   SalesCategory.findById(req.params.id).then(salesCategory => {
      return res.json({ salesCategory });
   }).catch(next);
});




// create sales-category
router.post('/create-new', auth.required, async (req, res, next) => {
   const { categoryName, description, defaultSalesTax } = req.body;
   const salesCategory = new SalesCategory();
   salesCategory.createdBy = req.payload.accountCompany;
   salesCategory.categoryName = categoryName;
   salesCategory.description = description;
   if (defaultSalesTax && defaultSalesTax != 0) salesCategory.defaultSalesTax = defaultSalesTax;
   else salesCategory.defaultSalesCategory = null;
   salesCategory.save().then(() => {
      return res.json({ status: "success" });
   }).catch(next);
});

// update sales-category
router.put('/:id', auth.required, async (req, res, next) => {
   SalesCategory.findById(req.params.id).then(async salesCategory => {
      const { categoryName, description, defaultSalesTax } = req.body;
      console.log("  req.body  _______ ", req.body);
      salesCategory.categoryName = categoryName;
      salesCategory.description = description;
      if (defaultSalesTax && defaultSalesTax != 0) salesCategory.defaultSalesTax = defaultSalesTax;
      await salesCategory.save()
      return res.json({ status: "success" });
   }).catch(next);
});


module.exports = router;