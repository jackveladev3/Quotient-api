const router = require("express").Router();
const { text } = require("body-parser");
const ObjectId = require('mongoose').Types.ObjectId;
const Template = require("../../../models/Template");
const TextItem = require("../../../models/TextItem");
const { replaceLoserByWinner, concatArrWithoutDuplication } = require("../../../utils");
const auth = require('../../auth');

// get template by status
router.get('/status/:status', auth.required, async (req, res, next) => {
    const { status } = req.params;
    if (!status) return res.status(422).json({ error: "status param can't be blank." });
    TextItem.find({ createdBy: req.payload.accountCompany, status: status }).then(docs => {
        return res.json({ textItems: docs });
    }).catch(next);
});

// create textitem
router.post('/', auth.required, async (req, res, next) => {
    const textItem = new TextItem();
    textItem.tag = "template";
    textItem.status = "current";
    textItem.createdBy = req.payload.accountCompany;
    textItem.textHeading = req.body.textHeading;
    textItem.longDescription = req.body.longDescription;
    textItem.files = req.body.files;

    textItem.activities = [{
        category: "created",
        at: new Date(),
        by: req.payload.id
    }];
    textItem.save().then(() => {
        return res.json({ textItem: textItem });
    }).catch(next);
});

// get textitem by id
router.get('/id/:id', auth.required, async (req, res, next) => {
    TextItem.findById(req.params.id).then((textItem) => {
        TextItem.populate(textItem, {
            path: 'templates',
            select: '-tag -status -createdBy -settings -items -notes -createdAt -updatedAt'
        }, (err, populatedPriceItem) => {
            if (err) return next();
            return res.json({ textItem: populatedPriceItem });
        });
    }).catch(next);
});

// update textitem
router.put('/id/:id', auth.required, async (req, res, next) => {
    const textItem = await TextItem.findById(req.params.id);
    textItem.tag = "template";
    textItem.createdBy = req.payload.accountCompany;
    textItem.textHeading = req.body.textHeading;
    textItem.longDescription = req.body.longDescription;
    textItem.files = req.body.files;

    const actLen = textItem.activities.length;
    if (textItem.activities[actLen - 1].category === "edited") {
        textItem.activities[actLen - 1].at = new Date();
        textItem.activities[actLen - 1].by = req.payload.id;
    }
    else textItem.activities.push({
        category: "edited",
        at: new Date(),
        by: req.payload.id
    });
    textItem.save().then(() => {
        return res.json({ textItem: textItem });
    }).catch(next);
});

// delete template by id
router.delete('/id/:id', auth.required, async (req, res, next) => {
    const textItemId = req.params.id;
    TextItem.findById(textItemId).then(async (textItem) => {
        if (textItem.templates.length) {
            textItem.templates.forEach(async temp => {
                const template = await Template.findById(temp._id);
                if (template) {
                    template.items = template.items.filter(tempIt => {
                        if (tempIt.category === "textItem") {
                            return tempIt.textItem.toString() !== textItemId;
                        }
                        else return true;
                    });
                    template.notes = template.notes.filter(tempIt => {
                        if (tempIt.category === "textItem") {
                            return tempIt.textItem.toString() !== textItemId;
                        }
                        else return true;
                    })
                    await template.save();
                }
            });
            await TextItem.findByIdAndRemove(textItemId);
            return res.json({ status: "success" });
        } else {
            await TextItem.findByIdAndRemove(textItemId);
            return res.json({ status: "success" });
        }
    }).catch(next);
});

// archive specific template
router.put('/archive/:id', auth.required, async (req, res, next) => {
    TextItem.findById(req.params.id).then(doc => {
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
    TextItem.findById(req.params.id).then(doc => {
        doc.status = 'current';
        doc.save()
            .then(() => {
                return res.json({ status: "success" });
            })
            .catch(next);
    }).catch(next);
});

// merge textitem
router.post('/merge', auth.required, async (req, res, next) => {
    const { winnerOfMerge, loserOfMerge } = req.body;

    if (!winnerOfMerge || !loserOfMerge) return res.status(422).json({ error: "text item id merge_loser id can't be blank" });
    TextItem.findById(loserOfMerge).then(async loserItem => {
        const winnerItem = await TextItem.findById(winnerOfMerge);
        if (!winnerItem) return res.status(422).json({ error: "can't find winnerItem by id" });

        if (loserItem.templates.length) {
            loserItem.templates.forEach(async temp => {
                const template = await Template.findById(temp);
                if (template) {
                    template.items = replaceLoserByWinner(template.items, "textItem", loserOfMerge, winnerOfMerge);
                    template.notes = replaceLoserByWinner(template.notes, "textItem", loserOfMerge, winnerOfMerge);
                    await template.save();
                }
            });
            winnerItem.templates = concatArrWithoutDuplication(winnerItem.templates, loserItem.templates);
        }

        winnerItem.activities.push({
            category: "merged",
            at: new Date(),
            by: req.payload.id,
            loserOfMergeTitle: loserItem.textHeading
        });
        await winnerItem.save();
        await TextItem.findByIdAndRemove(loserOfMerge);
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
            textHeading,
            longDescription,
            // updatedAt
        } = csvArrData[i];
        if (_id) {
            // update
            console.log(" ___________ id ___________", _id)
            if (ObjectId.isValid(_id)) {
                // find by itemID, if exisit - update textItem, if not - error
                const textItem = await TextItem.findOne({ createdBy: req.payload.accountCompany, _id: _id });
                if (textItem) {
                    if (isEntirelyMatchedTextItem(textItem, {
                        textHeading,
                        longDescription
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
            console.log(" ___________ error ___________", _id)

            // error because it invalid string or no exisiting one
            errorMessages.push({
                rowIndex: i,
                message: `Could not find existing Text ID of ${_id}. Item ID must match an existing item OR leave it blank.`
            });
            continue;
        } else {
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
                // _id,
                textHeading,
                longDescription,
                // updatedAt,
            } = createAvailableData[i];

            const newTextItem = new TextItem();
            newTextItem.createdBy = req.payload.accountCompany;
            newTextItem.textHeading = textHeading;
            newTextItem.longDescription = longDescription;
            newTextItem.activities = [{
                category: "created",
                at: new Date(),
                by: req.payload.id
            }];

            await newTextItem.save();
        }
    }

    if (updateAvailableData.length) {
        // update
        for (let i = 0; i < updateAvailableData.length; i++) {
            const {
                _id,
                textHeading,
                longDescription,
                // updatedAt,
            } = updateAvailableData[i];
            console.log(" updateAvailableData[i] ====================> ", updateAvailableData[i])

            let textItem;
            if (_id && ObjectId.isValid(_id)) textItem = await TextItem.findOne({ createdBy: req.payload.accountCompany, _id: _id });
            if (!textItem) {
                return res.status(404).json({ error: "can't find textItem instance to update." });
            }
            textItem.itemCode = textHeading;
            textItem.longDescription = longDescription;
            textItem.push({
                category: "updatedViaImport",
                at: new Date(),
                by: req.payload.id,
            });

            await textItem.save();
        }
    }
    return res.json({ status: "success" });
});


function isEntirelyMatchedTextItem(textItem, {
    textHeading,
    longDescription
}) {
    if (
        textItem.textHeading === textHeading
        && textItem.longDescription === longDescription
    ) return true;
    else return false;
}
module.exports = router;