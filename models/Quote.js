const mongoose = require('mongoose');
const Person = require('./Person');
const Schema = mongoose.Schema;

const QuoteSchema = new Schema({
   number: { type: Number, default: 1 },
   status: { type: String, lowercase: true, default: "draft" },
   // status: { type: String, default: "editing" },
   // status: { type: String, default: "awaiting" },
   // status: { type: String, default: "accepted" },
   // status: { type: String, default: "declined" },
   // status: { type: String, default: "withdrawn" },
   state: { type: String, lowercase: true, default: "current" },
   // state : { type: String, lowercase: true, default: "archived" },
   // state : { type: String, lowercase: true, default: "follow-up" },
   authorCompany: { type: Schema.Types.ObjectId, ref: 'AccountCompany', required: [true, "can't be blank"] },
   author: { type: Schema.Types.ObjectId, ref: 'Account', required: [true, "can't be blank"] },

   toPeopleList: [{ type: Schema.Types.ObjectId, ref: 'Person' }],
   title: { type: String, required: [true, "can't be blank"] },
   settings: {
      validUntil: { type: Date },
      sentAt: { type: Date },
      userFrom: { type: Schema.Types.ObjectId, ref: 'Account', required: [true, "can't be blank"] },
      discount: { type: Number, default: 0 },
      currency: { type: Number, default: 156 },
      taxMode: { type: String, default: "exclusive_including" },
      // taxMode: { type: String, default: "exclusive_excluding" },
      // taxMode: { type: String, default: "inclusive" },
      // taxMode: { type: String, default: "no_tax" },
      pricingDisplayLevel: { type: String, default: "itemQuantityAndTotal" },
      displayItemCode: Boolean
   },
   items: [{
      category: {
         type: String,
         default: "priceItem"
         // default: "textItem"
         // default: "subTotal"
      },
      priceItem: {
         isOptional: { type: Boolean, default: false },
         isOptionSelected: { type: Boolean, default: false },

         isMultipleChoice: { type: Boolean, default: false },
         isChoiceSelected: { type: Boolean, default: false },

         isEditableQuantity: { type: Boolean, default: false },
         isDiscount: { type: Boolean, default: false },
         discount: Number,

         isSubscription: { type: Boolean, default: false },

         per: { type: Number },
         every: { type: String },
         period: { type: Number },

         isCostPriceMargin: { type: Boolean, default: false },
         costPrice: Number,
         margin: Number,

         itemCode: String,
         productHeading: String,
         longDescription: String,
         files: [String],
         salesCategory: { type: Schema.Types.ObjectId, ref: "SalesCategory" },
         salesTax: { type: Schema.Types.ObjectId, ref: "SalesTax" },

         unitPrice: { type: Number },
         quantity: { type: Number },
         itemTotal: { type: Number }
      },
      textItem: {
         textHeading: String,
         longDescription: String,
         files: [String]
      }
   }],
   notes: [
      {
         category: { type: String, default: "textItem" },
         textItem: {
            textHeading: String,
            longDescription: String,
            files: [String]
         }
      }
   ],
   discussions: [
      {
         category: { type: String, default: "comment" },
         // category: { type: String, default: "privateNote" },
         // category: { type: String, default: "questionAndAnswer" },
         comment: {
            content: String,
            author: { type: Schema.Types.ObjectId, ref: "Account" },
            files: [String],
            updatedAt: Date
         },
         privateNote: {
            content: String,
            author: { type: Schema.Types.ObjectId, ref: "Account" },
            toMate: { type: Schema.Types.ObjectId, ref: "Account" },
            files: [String],
            updatedAt: Date
         },
         questionAndAnswer: {
            question: {
               content: String,
               author: { type: Schema.Types.ObjectId, ref: "Person" },
               files: [String],
               updatedAt: Date
            },
            answer: {
               status: String,
               // status: { type: String, default: "" },
               // status: {type: String, default: "answered"},
               // status: {type: String, default: "dismissed"},
               content: String,
               author: { type: Schema.Types.ObjectId, ref: "Account" },
               files: [String],
               updatedAt: Date
            }
         },
      }
   ],
   viewedAt: { type: Date, default: null },
   openTimes: { type: Number, default: 0 },
   editTimes: { type: Number, default: 0 },

   acceptedAt: { type: Date, default: null },
   acceptedBy: { type: Schema.Types.ObjectId, ref: 'Person' },
   acceptedComment: { type: String, default: "" },
   orderReferenceNumber: { type: String, default: "" },

   declinedAt: { type: Date, default: null },
   declinedBy: { type: Schema.Types.ObjectId, ref: 'Person' },
   declinedComment: { type: String, default: "" },

   withdrawnAt: { type: Date, default: null },
}, { timestamps: true });

QuoteSchema.methods.toQuoteJSON = function () {
   let that = this;
   return new Promise((resolve, reject) => {
      that.populate({
         path: 'toPeopleList',
         select: '-createdAt -updatedAt -__v'
      }, (err, quote) => {
         if (err) reject({ error: "error during populating quote contact." });
         resolve({
            _id: quote._id,
            number: quote.number,
            status: quote.status,
            state: quote.state,
            author: quote.author,
            authorCompany: quote.authorCompany,
            toPeopleList: quote.toPeopleList,
            title: quote.title,
            settings: quote.settings,
            items: quote.items,
            notes: quote.notes,
            discussions: quote.discussions,
            viewedAt: quote.viewedAt,
            openTimes: quote.openTimes,
            editTimes: quote.editTimes,
            acceptedAt: quote.acceptedAt,
            acceptedBy: quote.acceptedBy,
            acceptedComment: quote.acceptedComment,
            orderReferenceNumber: quote.orderReferenceNumber,
            declinedAt: quote.declinedAt,
            declinedBy: quote.declinedBy,
            declinedComment: quote.declinedComment
         });
      });
   });
}

// ---------
QuoteSchema.methods.toPeopleListSAssign = function (toPeopleList) {
   let that = this;
   return new Promise(async (resolve, reject) => {
      // Remove quoteId at quotes of person contact which was removed from toPeopleList
      const originPeopleList = [...that.toPeopleList];
      for (let i = 0; i < originPeopleList.length; i++) {
         const personId = originPeopleList[i];
         await Person.findById(personId).then(async person => {
            await person.removeAndSaveQuotes(that._id);
         }).catch((err) => {
            reject("failed to find Person in OriginPeopleList of Quote");
         });
      }

      // Append quoteId into quotes of person contact in toPeopleList (no duplication)
      that.toPeopleList = [];
      for (let i = 0; i < toPeopleList.length; i++) {
         const personId = toPeopleList[i];
         await Person.findById(personId).then(async person => {
            that.toPeopleList.push(person._id);
            await person.pushAndSaveQuotes(that._id);
         }).catch(err => {
            reject("error during pushing toPoeplelist in quote");
         })
      }
      resolve({ status: "success" });
   });
}

const Quote = mongoose.model("Quote", QuoteSchema);
module.exports = Quote;