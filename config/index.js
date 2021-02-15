require('dotenv').config();
module.exports = {
   secret: process.env.NODE_ENV === 'production' ? process.env.SECRET : 'secret',
   baseURL: process.env.NODE_ENV === 'production' ? "https://app.quotehard.com" : "http://localhost:3000",
   sgKey: process.env.SENDGRID_API_KEY,
   stripeSecretKey: process.env.STRIPE_SECRET_KEY,
   stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
   stripeWebhookKey: process.env.STRIPE_WEBHOOK_SECRET,
   sgSMTP: {
      user: 'apikey',
      pass: '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'
   },
};
