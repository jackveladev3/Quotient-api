const router = require("express").Router();
const Template = require("../../../models/Template");
const PriceItem = require("../../../models/PriceItem");
const TextItem = require("../../../models/TextItem");
const auth = require('../../auth');
const DefaultSetting = require("../../../models/DefaultSetting");
const { isValidTextItem, isValidPriceItem } = require("../../../utils");
const { insertArrWithoutDuplication } = require('../../../utils');
router.use('/priceitem', require('./priceItem'));
router.use('/textitem', require('./textItem'));

// get all templates
router.get('/status/:status', auth.required, async (req, res, next) => {
    const { status } = req.params;
    if (!status) return res.status(422).json({ error: "status param can't be blank." });
    Template.find({ createdBy: req.payload.accountCompany, status: status }).then(docs => {
        return res.json({ templates: docs });
    }).catch(next);
})

// create template
router.post('/', auth.required, async (req, res, next) => {
    const { title, settings, items, notes } = req.body;
    const temp = new Template();
    temp.tag = "template";
    temp.createdBy = req.payload.accountCompany;
    temp.title = title;
    temp.settings = settings;
    temp.items = [];
    for (let i = 0; i < items.length; i++) {
        if (items[i].category === "priceItem") {
            let priceItem = null;
            if (isValidPriceItem(items[i].priceItem)) priceItem = new PriceItem();
            else continue;
            priceItem.tag = "template";
            priceItem.status = "current";
            priceItem.templates = [temp._id];
            priceItem.createdBy = req.payload.accountCompany;

            priceItem.isOptional = items[i].priceItem.isOptional;
            priceItem.isOptionSelected = items[i].priceItem.isOptionSelected;
            priceItem.isMultipleChoice = items[i].priceItem.isMultipleChoice;
            priceItem.isChoiceSelected = items[i].priceItem.isChoiceSelected;
            priceItem.isEditableQuantity = items[i].priceItem.isEditableQuantity;
            priceItem.isDiscount = items[i].priceItem.isDiscount;
            priceItem.discount = items[i].priceItem.discount;
            priceItem.isSubscription = items[i].priceItem.isSubscription;
            priceItem.per = items[i].priceItem.per;
            priceItem.every = items[i].priceItem.every;
            priceItem.period = items[i].priceItem.period;
            priceItem.isCostPriceMargin = items[i].priceItem.isCostPriceMargin;
            priceItem.costPrice = items[i].priceItem.costPrice;
            priceItem.margin = items[i].priceItem.margin;

            priceItem.itemCode = items[i].priceItem.itemCode;
            priceItem.productHeading = items[i].priceItem.productHeading;
            priceItem.longDescription = items[i].priceItem.longDescription;
            priceItem.files = items[i].priceItem.files;
            priceItem.salesCategory = items[i].priceItem.salesCategory;
            priceItem.salesTax = items[i].priceItem.salesTax;
            priceItem.unitPrice = items[i].priceItem.unitPrice;
            priceItem.quantity = items[i].priceItem.quantity;
            priceItem.itemTotal = items[i].priceItem.itemTotal;

            await priceItem.save();
            temp.items.push({
                category: "priceItem",
                priceItem: priceItem._id
            });
        } else if (items[i].category === "textItem") {
            let textItem = null;
            if (isValidTextItem(items[i].textItem)) textItem = new TextItem();
            else continue;
            textItem.tag = "template";
            textItem.status = "curretn";
            textItem.templates = [temp._id];
            textItem.createdBy = req.payload.accountCompany;

            textItem.textHeading = items[i].textItem.textHeading;
            textItem.longDescription = items[i].textItem.longDescription;
            textItem.files = items[i].textItem.files;

            await textItem.save();
            temp.items.push({
                category: "textItem",
                textItem: textItem._id
            });
        } else if (items[i].category === "subTotal") {
            temp.items.push({
                category: "subTotal"
            });
        }
    }
    temp.notes = [];
    for (let i = 0; i < notes.length; i++) {
        let textItem = null;
        if (isValidTextItem(notes[i].textItem)) textItem = new TextItem();
        else continue;
        textItem.tag = "template";
        textItem.templates = [temp._id];
        textItem.createdBy = req.payload.accountCompany;
        textItem.textHeading = notes[i].textItem.textHeading;
        textItem.longDescription = notes[i].textItem.longDescription;
        textItem.files = notes[i].textItem.files;

        await textItem.save();
        temp.notes.push({
            category: "textItem",
            textItem: textItem
        });
    }
    temp.save().then(() => {
        Template.findById(temp._id).populate({
            path: 'items.priceItem items.textItem notes.textItem'
        }).exec((err, doc) => {
            if (err) return next;
            return res.json({ template: doc });
        });
    }).catch(next);
});

// get template by id
router.get('/id/:id', auth.required, async (req, res, next) => {
    Template.findById(req.params.id).populate({
        path: 'items.priceItem items.textItem notes.textItem'
    }).exec((err, doc) => {
        if (err) return next;
        return res.json({ template: doc });
    });
});

// update template
router.put('/id/:id', auth.required, async (req, res, next) => {
    const templateID = req.params.id;
    if (!templateID) return res.status(422).json({ error: "can't be blank template id" });
    const { title, settings, items, notes } = req.body;
    const temp = await Template.findById(templateID);
    if (!temp) return res.status(404).json({ error: "can't find template by id" });
    temp.title = title;
    temp.settings = { ...settings };
    temp.items = [];
    for (let i = 0; i < items.length; i++) {
        if (items[i].category === "priceItem") {
            let pItem = null;
            if (!items[i].priceItem._id) {
                if (isValidPriceItem(items[i].priceItem)) pItem = new PriceItem();
                else continue;
            } else {
                pItem = await PriceItem.findById(items[i].priceItem._id);
                if (!pItem) return res.status(404).json({ error: "can't find price Item by id" });
            }
            pItem.tag = "template";
            pItem.templates = insertArrWithoutDuplication(pItem.templates, temp._id);

            pItem.createdBy = req.payload.accountCompany;
            pItem.isOptional = items[i].priceItem.isOptional;
            pItem.isOptionSelected = items[i].priceItem.isOptionSelected;
            pItem.isMultipleChoice = items[i].priceItem.isMultipleChoice;
            pItem.isChoiceSelected = items[i].priceItem.isChoiceSelected;
            pItem.isEditableQuantity = items[i].priceItem.isEditableQuantity;
            pItem.isDiscount = items[i].priceItem.isDiscount;
            pItem.discount = items[i].priceItem.discount;
            pItem.isSubscription = items[i].priceItem.isSubscription;
            pItem.per = items[i].priceItem.per;
            pItem.every = items[i].priceItem.every;
            pItem.period = items[i].priceItem.period;
            pItem.isCostPriceMargin = items[i].priceItem.isCostPriceMargin;
            pItem.costPrice = items[i].priceItem.costPrice;
            pItem.margin = items[i].priceItem.margin;

            pItem.itemCode = items[i].priceItem.itemCode;
            pItem.productHeading = items[i].priceItem.productHeading;
            pItem.longDescription = items[i].priceItem.longDescription;
            pItem.files = items[i].priceItem.files;
            pItem.salesCategory = items[i].priceItem.salesCategory;
            pItem.salesTax = items[i].priceItem.salesTax;
            pItem.unitPrice = items[i].priceItem.unitPrice;
            pItem.quantity = items[i].priceItem.quantity;
            pItem.itemTotal = items[i].priceItem.itemTotal;

            await pItem.save();
            temp.items.splice(i, 0, {
                category: "priceItem",
                priceItem: pItem._id
            });
        } else if (items[i].category === "textItem") {
            let tItem = null;
            if (!items[i].textItem._id) {
                if (isValidTextItem(items[i].textItem)) tItem = new TextItem();
                else continue;
            } else {
                tItem = await TextItem.findById(items[i].textItem._id);
                if (!tItem) return res.status(404).json({ error: "can't find text Item by id" });
            }
            tItem.tag = "template";
            tItem.templates = insertArrWithoutDuplication(tItem.templates, temp._id);
            tItem.createdBy = req.payload.accountCompany;

            tItem.textHeading = items[i].textItem.textHeading;
            tItem.longDescription = items[i].textItem.longDescription;
            tItem.files = items[i].textItem.files;
            await tItem.save();
            temp.items.splice(i, 0, {
                category: "textItem",
                textItem: tItem._id
            });
        } else if (items[i].category === "subTotal") {
            temp.items.splice(i, 0, {
                category: "subTotal"
            });
        }
    }
    temp.notes = [];
    for (let i = 0; i < notes.length; i++) {
        let tItem = null;
        if (!notes[i].textItem._id) {
            if (isValidTextItem(notes[i].textItem)) tItem = new TextItem();
            else continue;
        } else {
            tItem = await TextItem.findById(notes[i].textItem._id);
            if (!tItem) return res.status(404).json({ error: "can't find text Item by id" });
        }
        tItem.tag = "template";
        tItem.templates = insertArrWithoutDuplication(tItem.templates, temp._id);
        tItem.createdBy = req.payload.accountCompany;

        tItem.textHeading = notes[i].textItem.textHeading;
        tItem.longDescription = notes[i].textItem.longDescription;
        tItem.files = notes[i].textItem.files;

        await tItem.save();
        temp.notes.splice(i, 0, {
            category: "textItem",
            textItem: tItem._id
        });
    }
    temp.save().then(() => {
        Template.findById(temp._id).populate({
            path: 'items.priceItem items.textItem notes.textItem'
        }).exec((err, doc) => {
            if (err) return next;
            return res.json({ template: doc });
        });
    }).catch(next);
});

// delete template by id
router.delete('/id/:id', auth.required, async (req, res, next) => {
    const templateId = req.params.id;
    Template.findById(templateId).then(async temp => {
        if (temp.items.length) {
            temp.items.forEach(async item => {
                if (item.category === "priceItem") {
                    const pItem = await PriceItem.findById(item.priceItem);
                    pItem.templates = pItem.templates.filter(tempIt => { return tempIt.toString() !== templateId });
                    await pItem.save();
                } else if (item.category === "textItem") {
                    const tItem = await TextItem.findById(item.textItem);
                    tItem.templates = tItem.templates.filter(tempIt => { return tempIt.toString() !== templateId });
                    await tItem.save();
                }
            });
        }
        if (temp.notes.length) {
            temp.notes.forEach(async note => {
                if (note.category === "textItem") {
                    const tItem = await TextItem.findById(note.textItem);
                    tItem.templates = tItem.templates.filter(tempIt => { return tempIt.toString() !== templateId });
                    await tItem.save();
                }
            })
        }

        await Template.findByIdAndDelete(templateId);
        return res.json({ status: "success" });
    }).catch(next);
});

// archive specific template
router.put('/archive/:id', auth.required, async (req, res, next) => {
    Template.findById(req.params.id).then(doc => {
        doc.status = 'archived';
        doc.save()
            .then(() => {
                return res.json({ status: "success" });
            })
            .catch(next);
    }).catch(next);
});

// archive specific template
router.put('/un-archive/:id', auth.required, async (req, res, next) => {
    Template.findById(req.params.id).then(doc => {
        doc.status = 'current';
        doc.save()
            .then(() => {
                return res.json({ status: "success" });
            })
            .catch(next);
    }).catch(next);
});

// make specific template as default
router.put('/default/:id', auth.required, async (req, res, next) => {
    DefaultSetting.findOne({ createdBy: req.payload.accountCompany }).then(doc => {
        if (!doc) {
            const newDoc = new DefaultSetting();
            newDoc.createdBy = req.payload.accountCompany;
            newDoc.defaultTemplate = req.params.id;
            newDoc.save().then(() => {
                return res.json({ template: newDoc });
            }).catch(next);
        } else {
            doc.defaultTemplate = req.params.id;
            doc.save().then(() => {
                return res.json({ template: doc });
            }).catch(next);
        }
    }).catch(next);
});

// make specific template as default
router.put('/undo-default/:id', auth.required, async (req, res, next) => {
    DefaultSetting.findOne({ createdBy: req.payload.accountCompany, defaultTemplate: req.params.id }).then(doc => {
        if (!doc) return res.status(404).json({ error: "no default template with this id" });
        else {
            doc.defaultTemplate = null;
            doc.save().then(() => {
                return res.json({ template: doc });
            }).catch(next);
        }
    }).catch(next);
});

// check if template was set as default
router.get('/default/:id', auth.required, async (req, res, next) => {
    DefaultSetting.findOne({ createdBy: req.payload.accountCompany, defaultTemplate: req.params.id }).then(doc => {
        if (!doc) return res.json({ isDefault: false });
        return res.json({ isDefault: true });
    }).catch(next);
});

// get my default template id
router.get('/defaultId', auth.optional, (req, res, next) => {
    DefaultSetting.findOne({ createdBy: req.payload.accountCompany }).then(doc => {
        if (!doc) return res.json({ defaultTemplateId: null });
        return res.json({ defaultTemplateId: doc.defaultTemplate });
    }).catch(next);
});


module.exports = router;