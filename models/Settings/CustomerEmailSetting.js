const mongoose = require('mongoose');
const Schema = mongoose.Schema;
;
const CustomerEmailSettingSchema = new Schema({
   newQuote: {
      subject: { type: String, default: "New quote: [Quote-title]" },
      msgHeader: { type: String, default: "Hi [Customer-given-names],\n\n[Your-name] of [Your-company-name] has prepared the following quote for you:" },
      msgFooter: { type: String, default: "" }
   },
   acceptedQuote: {
      subject: { type: String, default: "Quote accepted: [Quote-title]" },
      msgHeader: { type: String, default: "Hi [Customer-given-names],\n\nThank you for your acceptance.\n\nAdditional comments:\n[Customer-comment]\n\nOrder/reference number\n[Customer-order-number]" },
      msgFooter: { type: String, default: "" }
   },
   firstFollowup: {
      subject: { type: String, default: "Following up: [Quote-title]" },
      msgHeader: { type: String, default: "Hi [Customer-given-names],\n\nI’m happy to answer any questions you might have about the quote I prepared for you. You can ask these direct in the quote by following the link below or feel free to call me.\n\nIf you’re ready to proceed, simply click ‘Accept’ at the bottom of the quote." },
      msgFooter: { type: String, default: "" }
   },
   secondFollowup: {
      subject: { type: String, default: "Following up: [Quote-title]" },
      msgHeader: { type: String, default: "Hi [Customer-given-names],\n\nThis is just a quick reminder about the quote I prepared for you recently.  If you have any questions I’d be happy to help. You can ask me anything direct in the quote by clicking the link below. Or feel free to call me.\n\nIf you’re ready to proceed, simply click the ‘Accept’ button at the bottom of the quote and I’ll get the ball rolling. I look forward to hearing from you." },
      msgFooter: { type: String, default: "" }
   },
   askForReview: {
      subject: { type: String, default: "Tell us what you think about [Your-company-name]" },
      msgHeader: { type: String, default: "Hi [Customer-given-names],\n\nWould you mind sharing your recent experience with us?\nI’d be really grateful for your feedback or a review." },
      msgFooter: { type: String, default: "Thanks again for your business." }
   }
});

const CustomerEmailSetting = mongoose.model('CustomerEmailSetting', CustomerEmailSettingSchema);
module.exports = CustomerEmailSetting;