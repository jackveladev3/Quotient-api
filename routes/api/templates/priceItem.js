const router = require("express").Router();
const { forEach } = require("methods");
const ObjectId = require('mongoose').Types.ObjectId;
const PriceItem = require("../../../models/PriceItem");
const SalesCategory = require("../../../models/SalesCategory");
const SalesTax = require("../../../models/SalesTax");
const Template = require("../../../models/Template");
const { replaceLoserByWinner, concatArrWithoutDuplication, calculateQuoteTotal } = require("../../../utils");
const auth = require('../../auth');

// get template by status ------
router.get('/status/:status', auth.required, async (req, res, next) => {
    const { status } = req.params;
    if (!status) return res.status(422).json({ error: "status param can't be blank." });
    PriceItem.find({ createdBy: req.payload.accountCompany, status: status }).then(docs => {
        return res.json({ priceItems: docs });
    }).catch(next);
});

// get price templates with item code
router.get('/item-code/:itemCode', auth.required, async (req, res, next) => {
    const itemCode = req.params.itemCode;
    PriceItem.find({ createdBy: req.payload.accountCompany, itemCode: { $regex: itemCode, $options: "i" } }).then((docs) => {
        if (!docs) return res.sendStatus(401);
        return res.json({ priceItems: docs });
    }).catch(next);
});

// create price template -----
router.post('/', auth.required, async (req, res, next) => {
    const priceItem = new PriceItem();
    priceItem.tag = "template";
    priceItem.status = "current";
    priceItem.createdBy = req.payload.accountCompany;

    priceItem.isOptional = req.body.isOptional;
    priceItem.isOptionSelected = req.body.isOptionSelected;
    priceItem.isMultipleChoice = req.body.isMultipleChoice;
    priceItem.isChoiceSelected = req.body.isMultipleChoice;
    priceItem.isEditableQuantity = req.body.isEditableQuantity;
    priceItem.isDiscount = req.body.isDiscount;
    priceItem.discount = req.body.discount;
    priceItem.isSubscription = req.body.isSubscription;
    priceItem.per = req.body.per;
    priceItem.every = req.body.every;
    priceItem.period = req.body.period;
    priceItem.isCostPriceMargin = req.body.isCostPriceMargin;
    priceItem.costPrice = req.body.costPrice;
    priceItem.margin = req.body.margin;

    priceItem.itemCode = req.body.itemCode || "";
    priceItem.productHeading = req.body.productHeading;
    priceItem.longDescription = req.body.longDescription;
    priceItem.files = req.body.files;
    priceItem.salesCategory = req.body.salesCategory;
    priceItem.salesTax = req.body.salesTax;
    priceItem.unitPrice = req.body.unitPrice;
    priceItem.quantity = req.body.quantity;
    priceItem.itemTotal = req.body.itemTotal;

    priceItem.activities = [{
        category: "created",
        at: new Date(),
        by: req.payload.id
    }];
    priceItem.save()
        .then(() => {
            return res.json({ priceItem: priceItem });
        })
        .catch(next);
});

// get priceitem by id
router.get('/id/:id', auth.required, async (req, res, next) => {
    PriceItem.findById(req.params.id).then((priceItem) => {
        PriceItem.populate(priceItem, {
            path: 'templates',
            select: '-tag -status -createdBy -settings -items -notes -createdAt -updatedAt'
        }, (err, populatedPriceItem) => {
            if (err) return next();
            return res.json({ priceItem: populatedPriceItem });
        });
    }).catch(next);
});

// update price template
router.put('/id/:id', auth.required, async (req, res, next) => {
    const priceItem = await PriceItem.findById(req.params.id);
    priceItem.tag = "template";
    priceItem.createdBy = req.payload.accountCompany;

    priceItem.isOptional = req.body.isOptional;
    priceItem.isOptionSelected = req.body.isOptionSelected;
    priceItem.isMultipleChoice = req.body.isMultipleChoice;
    priceItem.isChoiceSelected = req.body.isMultipleChoice;
    priceItem.isEditableQuantity = req.body.isEditableQuantity;
    priceItem.isDiscount = req.body.isDiscount;
    priceItem.discount = req.body.discount;
    priceItem.isSubscription = req.body.isSubscription;
    priceItem.per = req.body.per;
    priceItem.every = req.body.every;
    priceItem.period = req.body.period;
    priceItem.isCostPriceMargin = req.body.isCostPriceMargin;
    priceItem.costPrice = req.body.costPrice;
    priceItem.margin = req.body.margin;

    priceItem.itemCode = req.body.itemCode || "";
    priceItem.productHeading = req.body.productHeading;
    priceItem.longDescription = req.body.longDescription;
    priceItem.files = req.body.files;
    priceItem.salesCategory = req.body.salesCategory;
    priceItem.salesTax = req.body.salesTax;
    priceItem.unitPrice = req.body.unitPrice;
    priceItem.quantity = req.body.quantity;
    priceItem.itemTotal = req.body.itemTotal;

    const actLen = priceItem.activities.length;
    if (priceItem.activities[actLen - 1].category === "edited") {
        priceItem.activities[actLen - 1].at = new Date();
        priceItem.activities[actLen - 1].by = req.payload.id;
    }
    else priceItem.activities.push({
        category: "edited",
        at: new Date(),
        by: req.payload.id
    });
    priceItem.save()
        .then(() => {
            return res.json({ priceItem: priceItem });
        })
        .catch(next);
});

// delete template by id
router.delete('/id/:id', auth.required, async (req, res, next) => {
    const priceItemId = req.params.id;
    console.log("priceItemId =======", priceItemId)
    PriceItem.findById(priceItemId).then(async (priceItem) => {
        if (priceItem.templates.length) {
            priceItem.templates.forEach(async temp => {
                const template = await Template.findById(temp._id);
                if (template) {
                    const newItems = template.items.filter(item => {
                        if (item.category === "priceItem") {
                            return item.priceItem != priceItemId;
                        }
                        else return true;
                    })
                    template.items = newItems;
                    await template.save();
                }
                await PriceItem.findByIdAndRemove(priceItemId);
                return res.json({ status: "success" });
            });
        } else {
            await PriceItem.findByIdAndRemove(priceItemId);
            return res.json({ status: "success" });
        }
    }).catch(next);
});

// archive specific template
router.put('/archive/:id', auth.required, async (req, res, next) => {
    PriceItem.findById(req.params.id).then(doc => {
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
    PriceItem.findById(req.params.id).then(doc => {
        doc.status = 'current';
        doc.save()
            .then(() => {
                return res.json({ status: "success" });
            })
            .catch(next);
    }).catch(next);
});

// merge priceitem
router.post('/merge', auth.required, async (req, res, next) => {
    const { winnerOfMerge, loserOfMerge } = req.body;

    if (!winnerOfMerge || !loserOfMerge) return res.status(422).json({ error: "text item id merge_loser id can't be blank" });
    PriceItem.findById(loserOfMerge).then(async loserItem => {
        const winnerItem = await PriceItem.findById(winnerOfMerge);
        if (!winnerItem) return res.status(422).json({ error: "can't find winnerItem by id" });

        if (loserItem.templates.length) {
            loserItem.templates.forEach(async temp => {
                const template = await Template.findById(temp);
                // if (!template) return res.status(404).json({ error: "note found template by id of item's templateId list" })
                if (template) {
                    template.items = replaceLoserByWinner(template.items, "priceItem", loserOfMerge, winnerOfMerge);
                    await template.save();
                }
            });
            winnerItem.templates = concatArrWithoutDuplication(winnerItem.templates, loserItem.templates);
        }
        winnerItem.activities.push({
            category: "merged",
            at: new Date(),
            by: req.payload.id,
            loserOfMergeTitle: loserItem.productHeading
        });
        await winnerItem.save();
        await PriceItem.findByIdAndRemove(loserOfMerge);
        return res.json({ status: "success" });
    }).catch(next);
});

// import check from csv ------------
router.post('/import/check', auth.required, async (req, res, next) => {
    const { csvArrData } = req.body;
    if (csvArrData.length > 1000) return res.status(422).json({ error: "A maximum of 1,000 contacts can be imported at a time." });
    let skipNum = 0;
    let createAvailableRows = [];
    let updateAvailableRows = [];
    let errorMessages = [];
    for (let i = 0; i < csvArrData.length; i++) {
        console.log("csvArrData[i] ==> ", csvArrData[i])
        const {
            _id,
            itemCode,
            productHeading,
            longDescription,
            costPrice,
            unitPrice,
            quantity,
            discount,
            itemTotal,
            salesCategoryName,
            salesTaxName,
            subscription,
            editableQuantity,
            optional
        } = csvArrData[i];
        const { isSubscription, every, per, period } = transSubscription(subscription)
        const { isEditableQuantity } = transEditableQuantity(editableQuantity)
        const { isOptional, isOptionSelected, isMultipleChoice, isChoiceSelected } = transOptional(optional)
        console.log("transSubscription : ", transSubscription(subscription))
        console.log("transOptional : ", transOptional(optional))
        let salesTax, salesCategory;
        if (salesTaxName) {
            salesTax = await SalesTax.findOne({ createdBy: req.payload.accountCompany, taxName: salesTaxName });
            if (!salesTax) {
                errorMessages.push({
                    rowIndex: i,
                    message: `Could not find matching Tax: ${salesTaxName}.`
                });
                continue;
            }
        }
        if (salesCategoryName) {
            salesCategory = await SalesCategory.findOne({ createdBy: req.payload.accountCompany, categoryName: salesCategoryName });
            if (!salesCategory) {
                errorMessages.push({
                    rowIndex: i,
                    message: `Could not find matching Sales Category: ${salesCategoryName}.`
                });
                continue;
            }
        }

        if (_id) {
            if (ObjectId.isValid(_id)) {
                // find by itemID, if exisit - update priceItem, if not - error
                const priceItem = await PriceItem.findOne({ createdBy: req.payload.accountCompany, _id: _id });
                if (priceItem) {
                    if (isEntirelyMatchedPriceItem(priceItem, {
                        itemCode,
                        productHeading,
                        longDescription,
                        costPrice,
                        unitPrice,
                        quantity,
                        discount,
                        itemTotal,
                        salesCategoryName,
                        salesTaxName,
                        isSubscription, every, per, period,
                        isEditableQuantity,
                        isOptional, isOptionSelected, isMultipleChoice, isChoiceSelected,
                        salesCategory,
                        salesTax
                    })) {
                        // same one so skip this
                        skipNum++;
                        continue;
                    }
                    // update available
                    updateAvailableRows.push(i);
                    continue;
                }
            }
            // error because it invalid string or no exisiting one
            errorMessages.push({
                rowIndex: i,
                message: `Could not find existing Item ID of ${_id}. Item ID must match an existing item OR leave it blank.`
            });
            continue;
        } else {
            if (itemCode) {
                // find by itemCode, if exist - update priceItem, if not - create new priceItem
                const priceItem = await PriceItem.findOne({ createdBy: req.payload.accountCompany, itemCode: itemCode });
                if (priceItem) {
                    // update available
                    updateAvailableRows.push(i);
                    continue;
                } else {
                    // create availble
                    createAvailableRows.push(i);
                    continue;
                }
            }
            // cretate available
            createAvailableRows.push(i);
            continue;
        }
    }
    return res.json({
        skipNum,
        createAvailableRows,
        updateAvailableRows,
        errorMessages,
    });
});

// import create -------------
router.post('/import/create', auth.required, async (req, res, next) => {
    const { createAvailableData, updateAvailableData } = req.body;
    if (!createAvailableData) return res.status(422).json({ error: "Csv data for importing was not found." });
    else if (!Array.isArray(createAvailableData)) return res.status(422).json({ error: "Csv data for importing is invalid." });
    else if (createAvailableData.length > 1000) return res.status(422).json({ error: "A maximum of 1,000 contacts can be imported at a time." });

    if (!updateAvailableData) return res.status(422).json({ error: "Csv data for importing was not found." });
    else if (!Array.isArray(updateAvailableData)) return res.status(422).json({ error: "Csv data for importing is invalid." });
    else if (updateAvailableData.length > 1000) return res.status(422).json({ error: "A maximum of 1,000 contacts can be imported at a time." });

    if (createAvailableData.length) {
        // create
        for (let i = 0; i < createAvailableData.length; i++) {
            console.log(" createAvailableData[i] ====================> ", createAvailableData[i])
            const {
                _id,
                itemCode,
                productHeading,
                longDescription,
                costPrice,
                unitPrice,
                quantity,
                discount,
                itemTotal,
                salesCategoryName,
                salesTaxName,
                subscription,
                editableQuantity,
                optional
            } = createAvailableData[i];
            const { isSubscription, every, per, period } = transSubscription(subscription)
            const { isEditableQuantity } = transEditableQuantity(editableQuantity)
            const { isOptional, isOptionSelected, isMultipleChoice, isChoiceSelected } = transOptional(optional)
            let salesTax, salesCategory;
            if (salesTaxName) salesTax = await SalesTax.findOne({ createdBy: req.payload.accountCompany, taxName: salesTaxName });
            if (salesCategoryName) salesCategory = await SalesCategory.findOne({ createdBy: req.payload.accountCompany, categoryName: salesCategoryName });
            if (!salesCategory || !salesCategoryName) continue;

            const newPriceItem = new PriceItem();
            newPriceItem.createdBy = req.payload.accountCompany;
            newPriceItem.itemCode = itemCode;
            newPriceItem.productHeading = productHeading;
            newPriceItem.longDescription = longDescription;
            newPriceItem.costPrice = costPrice ? (isNaN(costPrice) ? 0 : parseFloat(costPrice)) : 0;
            newPriceItem.quantity = quantity ? (isNaN(quantity) ? 0 : parseFloat(quantity)) : 0;
            newPriceItem.discount = discount ? (isNaN(discount) ? 0 : parseFloat(discount)) : 0;
            if (!isNaN(unitPrice)) {
                // yes unitPrice
                newPriceItem.unitPrice = unitPrice ? parseFloat(unitPrice) : 0;
                if (!isNaN(quantity)) newPriceItem.quantity = quantity ? parseFloat(quantity) : 0;
                else newPriceItem.quantity = 1;
                newPriceItem.itemTotal = calculuateItemTotal(newPriceItem.unitPrice, newPriceItem.quantity, newPriceItem.discount);
            } else if (!isNaN(itemTotal)) {
                // no unitPrice, yes itemTotal
                newPriceItem.itemTotal = itemTotal ? parseFloat(itemTotal) : 0;
                if (!isNaN(quantity)) {
                    if (parseFloat(quantity) === 0) newPriceItem.quantity = 1;
                    else newPriceItem.quantity = quantity ? parseFloat(quantity) : 0;
                } else newPriceItem.quantity = 1;
                newPriceItem.unitPrice = deriveUnitPrice(newPriceItem.itemTotal, newPriceItem.quantity, newPriceItem.discount);;
            } else {
                // no unitPrice, no itemTotal
                newPriceItem.unitPrice = 0;
                newPriceItem.quantity = 0;
                newPriceItem.itemTotal = 0;
            }
            newPriceItem.salesTax = salesTax._id;
            newPriceItem.salesCategory = salesCategory._id;

            newPriceItem.isSubscription = isSubscription;
            newPriceItem.every = every;
            newPriceItem.per = per;
            newPriceItem.period = period;
            newPriceItem.isEditableQuantity = isEditableQuantity;
            newPriceItem.isOptional = isOptional;
            newPriceItem.isOptionSelected = isOptionSelected;
            newPriceItem.isMultipleChoice = isMultipleChoice;
            newPriceItem.isChoiceSelected = isChoiceSelected;
            newPriceItem.activities = [{
                category: "created",
                at: new Date(),
                by: req.payload.id,
            }];

            await newPriceItem.save();
        }
    }

    if (updateAvailableData.length) {
        // update
        for (let i = 0; i < updateAvailableData.length; i++) {
            const {
                _id,
                itemCode,
                productHeading,
                longDescription,
                costPrice,
                unitPrice,
                quantity,
                discount,
                itemTotal,
                salesCategoryName,
                salesTaxName,
                subscription,
                editableQuantity,
                optional
            } = updateAvailableData[i];
            console.log(" updateAvailableData[i] ====================> ", updateAvailableData[i])

            let priceItem;
            if (_id && ObjectId.isValid(_id)) priceItem = await PriceItem.findOne({ createdBy: req.payload.accountCompany, _id: _id });
            else if (itemCode) priceItem = await PriceItem.findOne({ createdBy: req.payload.accountCompany, itemCode: itemCode });
            if (!priceItem) {
                return res.status(404).json({ error: "can't find priceItem instance to update." });
            }

            const { isSubscription, every, per, period } = transSubscription(subscription)
            const { isEditableQuantity } = transEditableQuantity(editableQuantity)
            const { isOptional, isOptionSelected, isMultipleChoice, isChoiceSelected } = transOptional(optional)
            let salesTax, salesCategory;
            if (salesTaxName) salesTax = await SalesTax.findOne({ createdBy: req.payload.accountCompany, taxName: salesTaxName });
            if (salesCategoryName) salesCategory = await SalesCategory.findOne({ createdBy: req.payload.accountCompany, categoryName: salesCategoryName });
            if (!salesCategory || !salesCategoryName) continue;

            priceItem.itemCode = itemCode;
            priceItem.productHeading = productHeading;
            priceItem.longDescription = longDescription;
            priceItem.costPrice = costPrice ? (isNaN(costPrice) ? 0 : parseFloat(costPrice)) : 0;
            priceItem.quantity = quantity ? (isNaN(quantity) ? 0 : parseFloat(quantity)) : 0;
            priceItem.discount = discount ? (isNaN(discount) ? 0 : parseFloat(discount)) : 0;
            if (!isNaN(unitPrice)) {
                // yes unitPrice
                priceItem.unitPrice = unitPrice ? parseFloat(unitPrice) : 0;
                if (!isNaN(quantity)) priceItem.quantity = quantity ? parseFloat(quantity) : 0;
                else priceItem.quantity = 1;
                priceItem.itemTotal = calculuateItemTotal(priceItem.unitPrice, priceItem.quantity, priceItem.discount);
            } else if (!isNaN(itemTotal)) {
                // no unitPrice, yes itemTotal
                priceItem.itemTotal = itemTotal ? parseFloat(itemTotal) : 0;
                if (!isNaN(quantity)) {
                    if (parseFloat(quantity) === 0) priceItem.quantity = 1;
                    else priceItem.quantity = quantity ? parseFloat(quantity) : 0;
                } else priceItem.quantity = 1;
                priceItem.unitPrice = deriveUnitPrice(priceItem.itemTotal, priceItem.quantity, priceItem.discount);;
            } else {
                // no unitPrice, no itemTotal
                priceItem.unitPrice = 0;
                priceItem.quantity = 0;
                priceItem.itemTotal = 0;
            }
            priceItem.salesTax = salesTax._id;
            priceItem.salesCategory = salesCategory._id;

            priceItem.isSubscription = isSubscription;
            priceItem.every = every;
            priceItem.per = per;
            priceItem.period = period;
            priceItem.isEditableQuantity = isEditableQuantity;
            priceItem.isOptional = isOptional;
            priceItem.isOptionSelected = isOptionSelected;
            priceItem.isMultipleChoice = isMultipleChoice;
            priceItem.isChoiceSelected = isChoiceSelected;
            priceItem.activities.push({
                category: "updatedViaImport",
                at: new Date(),
                by: req.payload.id,
            });

            await priceItem.save();
        }
    }
    return res.json({ status: "success" });
});



function deriveUnitPrice(itemTotal, quantity, discount) {
    if (discount === 100) return 0;
    else return itemTotal / quantity * 100 / (100 - discount);
}
function calculuateItemTotal(unitPrice, quantity, discount) {
    return unitPrice * quantity * (100 - discount) / 100;
}

function isEntirelyMatchedPriceItem(priceItem, {
    itemCode,
    productHeading,
    longDescription,
    costPrice,
    unitPrice,
    quantity,
    discount,
    itemTotal,
    salesCategoryName,
    salesTaxName,
    isSubscription, every, per, period,
    isEditableQuantity,
    isOptional, isOptionSelected, isMultipleChoice, isChoiceSelected,
    salesCategory,
    salesTax
}) {
    if (
        priceItem.itemCode === itemCode
        && priceItem.productHeading === productHeading
        && priceItem.longDescription === longDescription
        && priceItem.costPrice === costPrice
        && (priceItem.unitPrice ? priceItem.unitPrice === unitPrice : priceItem.itemTotal === itemTotal)
        && priceItem.quantity === quantity
        && priceItem.discount === discount
        && (salesCategoryName ? priceItem.salesCategory === salesCategory._id : !priceItem.salesCategory)
        && (salesTaxName ? priceItem.salesTax === salesTax._id : !priceItem.salesTax)
        && (isSubscription ? (
            priceItem.isSubscription === true
            && priceItem.every === every
            && priceItem.per === per
            && priceItem.period === period
        ) : priceItem.isSubscription === false)
        && priceItem.isEditableQuantity === isEditableQuantity
        && (isOptional ? (
            priceItem.isOptional === true
            && priceItem.isOptionSelected === isOptionSelected
        ) : priceItem.isOptional === false)
        && (isMultipleChoice ? (
            priceItem.isMultipleChoice === true
            && priceItem.isChoiceSelected === isChoiceSelected
        ) : priceItem.isMultipleChoice === false)
    ) return true;
    else return false;
}
function transSubscription(subscription) {
    let isSubscription = false, every = "", per = 0, period = 0;
    const lowerStr = subscription.toLowerCase();
    const words = lowerStr.split(", ");
    console.log(" subscription str : ", subscription)
    console.log(" subscription words : ", words)
    switch (words[0]) {
        case "week":
            isSubscription = true;
            every = "week";
            if (words[1] && Number.isInteger(parseInt(words[1]))) per = parseInt(words[1]);
            if (words[2] && Number.isInteger(parseInt(words[2]))) period = parseInt(words[2]);
            return { isSubscription, every, per, period };
        case "month":
            isSubscription = true;
            every = "month";
            if (words[1] && Number.isInteger(parseInt(words[1]))) per = parseInt(words[1]);
            if (words[2] && Number.isInteger(parseInt(words[2]))) period = parseInt(words[2]);
            return { isSubscription, every, per, period };
        case "year":
            isSubscription = true;
            every = "year";
            if (words[1] && Number.isInteger(parseInt(words[1]))) per = parseInt(words[1]);
            if (words[2] && Number.isInteger(parseInt(words[2]))) period = parseInt(words[2]);
            return { isSubscription, every, per, period };
        default:
            return { isSubscription: false, every: "", per: 0, period: 0 };
    }
}
function transEditableQuantity(editableQuantity) {
    const lowerStr = editableQuantity.toLowerCase();
    return { isEditableQuantity: lowerStr.includes("editable") };
}
function transOptional(optional) {
    let isOptional = false, isOptionSelected = false, isMultipleChoice = false, isChoiceSelected = false;
    const lowerStr = optional.toLowerCase();
    const words = lowerStr.split(", ");
    console.log(" optional string : ", optional)
    console.log(" optional words : ", words)
    switch (words[0]) {
        case "optional":
            isOptional = true;
            if (words[1] && words[1].includes("selected")) isOptionSelected = true;
            return { isOptional, isOptionSelected, isMultipleChoice, isChoiceSelected };
        case "multiple choice":
            isMultipleChoice = true;
            if (words[1] && words[1].includes("selected")) isChoiceSelected = true;
            return { isOptional, isOptionSelected, isMultipleChoice, isChoiceSelected };
        default:
            return { isOptional: false, isOptionSelected: false, isMultipleChoice: false, isChoiceSelected: false };
    }
}
module.exports = router;