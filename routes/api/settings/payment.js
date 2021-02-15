const auth = require("../../auth");
const router = require("express").Router();

const { stripeSecretKey, stripePublishableKey, stripeWebhookKey } = require("../../../config");
// Set your secret key. Remember to switch to your live secret key in production!
// See your keys here: https://dashboard.stripe.com/account/apikeys
const Stripe = require('stripe');
const bodyParser = require("body-parser");
const AccountCompany = require("../../../models/AccountCompany");
const stripe = Stripe(stripeSecretKey);

const PRODUCT_ID = "prod_IiGk2tyjRtuppL"
const BASIC = "price_1I6qDRCZtaFPaPpxHxCCPOzb"
const PREMIUM = "price_1I6qDRCZtaFPaPpxChQZzJQ7"

function processSubcription(accountCompany, stripeCustomerId) {
   return new Promise(async (resolve, reject) => {
      if (accountCompany.subscriptionId) {
         try {
            const subscription = await stripe.subscriptions.retrieve(accountCompany.subscriptionId);
            resolve(subscription);
         } catch (error) {
            reject(error);
         }
      } else {
         try {
            const subscription = await stripe.subscriptions.create({
               customer: stripeCustomerId,
               items: [{ price: BASIC }],
               // expand: ['latest_invoice.payment_intent', 'pending_setup_intent'],
            });
            accountCompany.subscriptionId = subscription.id;
            await accountCompany.save();
            resolve(subscription);
         } catch (error) {
            reject(error);
         }
      }
   });
}



// list of all customers
router.get('/customers', auth.required, async (req, res, next) => {
   const customers = await stripe.customers.list({
      limit: 3,
   });
   return res.json({ customers });
})

// list of all subscriptions
router.get('/subscriptions', auth.required, async (req, res, next) => {
   const subscriptions = await stripe.subscriptions.list({
      limit: 3,
   });
   return res.json({ subscriptions });
})


// payment detail (paymentMethod Detail)
router.get('/', auth.required, async (req, res, next) => {
   AccountCompany.findById(req.payload.accountCompany).then(async (accountCompany) => {
      console.log(" subscriptionId ===================> ", accountCompany.subscriptionId)
      if (accountCompany.subscriptionId) {
         const subscription = await stripe.subscriptions.retrieve(accountCompany.subscriptionId);
         const customer = await stripe.customers.retrieve(subscription.customer);
         if (!customer || customer['deleted']) {
            // no customer
            accountCompany.subscriptionId = null;
            await accountCompany.save();
            return res.json({
               subscription: null,
               customer: null,
               paymentMethod: null
            })
         } else {
            let paymentMethod;
            if (customer['invoice_settings']['default_payment_method']) paymentMethod = await stripe.paymentMethods.retrieve(customer['invoice_settings']['default_payment_method']);
            return res.json({
               subscription,
               customer,
               paymentMethod
            })
         }
      } else {
         return res.json({
            subscription: null,
            customer: null,
            paymentMethod: null
         })
      }
   }).catch(next);
});

// Create subscription
router.post('/subscribe', auth.required, async (req, res, next) => {
   const {
      paymentMethodId,
      name
   } = req.body;
   console.log(" paymentMethodId ....... ", paymentMethodId)
   if (!name) return res.status(402).json({ error: { message: "Name on Card can't be blank" } });
   AccountCompany.findById(req.payload.accountCompany).then(async (accountCompany) => {
      let subscription;
      if (accountCompany.subscriptionId) subscription = await stripe.subscriptions.retrieve(accountCompany.subscriptionId);
      console.log(" ______________ subscription  : ", subscription)
      if (subscription) {
         // update flow
         const customer = await stripe.customers.retrieve(subscription['customer']);
         console.log(" __________ customer : ", customer);
         if (!customer || customer['deleted']) {
            // Cancel a subscription
            const deleted = await stripe.subscriptions.del(accountCompany.subscriptionId);

            // create new customer
            const newCustomer = await stripe.customers.create({
               name,
               description: 'Quotehard service subscriber',
            });

            // attach a PaymentMethod to a Customer
            const paymentMethod = await stripe.paymentMethods.attach(
               paymentMethodId,
               { customer: newCustomer['id'] }
            );

            // update customer default payment method
            let updateCustomerDefaultPaymentMethod = await stripe.customers.update(
               newCustomer['id'],
               {
                  invoice_settings: {
                     default_payment_method: paymentMethodId,
                  },
               }
            );

            // create new subscirption
            const newSubscription = await stripe.subscriptions.create({
               customer: customer['id'],
               items: [
                  { price: BASIC },
               ],
            });

            accountCompany.subscriptionId = newSubscription['id'];
            await accountCompany.save();
            return res.json({ subscription: newSubscription });
         } else {
            const newPaymentMethod = await stripe.paymentMethods.attach(
               paymentMethodId,
               { customer: customer['id'] }
            );
            console.log(" newPaymentMethod ---- ", newPaymentMethod)

            // update customer default payment method
            const updateCustomerDefaultPaymentMethod = await stripe.customers.update(
               customer['id'],
               {
                  invoice_settings: {
                     default_payment_method: paymentMethodId,
                  },
               }
            );
            console.log("updateCustomerDefaultPaymentMethod ===> ", updateCustomerDefaultPaymentMethod);
            return res.json({ subscription: subscription });
         }
      } else {
         // create flow
         // create new customer
         const customer = await stripe.customers.create({
            name,
            description: 'Quotehard service subscriber',
         });

         // attach a PaymentMethod to a Customer
         await stripe.paymentMethods.attach(
            paymentMethodId,
            { customer: customer['id'] }
         );

         // update customer default payment method
         let updateCustomerDefaultPaymentMethod = await stripe.customers.update(
            customer['id'],
            {
               invoice_settings: {
                  default_payment_method: paymentMethodId,
               },
            }
         );

         // create new subscirption
         const newSubscription = await stripe.subscriptions.create({
            customer: customer['id'],
            items: [
               { price: BASIC },
            ],
         });
         console.log(" newSubscription __________ ", newSubscription)
         accountCompany.subscriptionId = newSubscription['id'];
         await accountCompany.save();
         return res.json({ subscription: newSubscription });
      }
   }).catch(next);
});

//
router.post('/retry-invoice', async (req, res) => {
   // Set the default payment method on the customer

   try {
      await stripe.paymentMethods.attach(req.body.paymentMethodId, {
         customer: req.body.customerId,
      });
      await stripe.customers.update(req.body.customerId, {
         invoice_settings: {
            default_payment_method: req.body.paymentMethodId,
         },
      });
   } catch (error) {
      // in case card_decline error
      return res
         .status('402')
         .send({ result: { error: { message: error.message } } });
   }

   const invoice = await stripe.invoices.retrieve(req.body.invoiceId, {
      expand: ['payment_intent'],
   });
   res.send(invoice);
});

//
router.post('/retrieve-upcoming-invoice', async (req, res) => {
   const subscription = await stripe.subscriptions.retrieve(
      req.body.subscriptionId
   );

   const invoice = await stripe.invoices.retrieveUpcoming({
      subscription_prorate: true,
      customer: req.body.customerId,
      subscription: req.body.subscriptionId,
      subscription_items: [
         {
            id: subscription.items.data[0].id,
            clear_usage: true,
            deleted: true,
         },
         {
            price: process.env[req.body.newPriceId],
            deleted: false,
         },
      ],
   });
   res.send(invoice);
});

//
router.post('/cancel-subscription', async (req, res) => {
   // Delete the subscription
   const deletedSubscription = await stripe.subscriptions.del(
      req.body.subscriptionId
   );
   res.send(deletedSubscription);
});

//
router.post('/update-subscription', async (req, res) => {
   const subscription = await stripe.subscriptions.retrieve(
      req.body.subscriptionId
   );
   const updatedSubscription = await stripe.subscriptions.update(
      req.body.subscriptionId,
      {
         cancel_at_period_end: false,
         items: [
            {
               id: subscription.items.data[0].id,
               price: process.env[req.body.newPriceId],
            },
         ],
      }
   );

   res.send(updatedSubscription);
});

//
router.post('/retrieve-customer-payment-method', async (req, res) => {
   const paymentMethod = await stripe.paymentMethods.retrieve(
      req.body.paymentMethodId
   );

   res.send(paymentMethod);
});

// Webhook handler for asynchronous events.
router.post('/webhook', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
   // Retrieve the event by verifying the signature using the raw body and secret.
   let event;

   try {
      event = stripe.webhooks.constructEvent(
         req.body,
         req.headers['stripe-signature'],
         stripeWebhookKey
      );
   } catch (err) {
      console.log(err);
      console.log(`⚠️  Webhook signature verification failed.`);
      console.log(
         `⚠️  Check the env file and enter the correct webhook secret.`
      );
      return res.sendStatus(400);
   }
   // Extract the object from the event.
   const dataObject = event.data.object;

   // Handle the event
   // Review important events for Billing webhooks
   // https://stripe.com/docs/billing/webhooks
   // Remove comment to see the various objects sent for this sample
   switch (event.type) {
      case 'invoice.paid':
         // Used to provision services after the trial has ended.
         // The status of the invoice will show up as paid. Store the status in your
         // database to reference when a user accesses your service to avoid hitting rate limits.
         break;
      case 'invoice.payment_failed':
         // If the payment fails or the customer does not have a valid payment method,
         //  an invoice.payment_failed event is sent, the subscription becomes past_due.
         // Use this webhook to notify your user that their payment has
         // failed and to retrieve new card details.
         break;
      case 'invoice.finalized':
         // If you want to manually send out invoices to your customers
         // or store them locally to reference to avoid hitting Stripe rate limits.
         break;
      case 'customer.subscription.deleted':
         if (event.request != null) {
            // handle a subscription cancelled by your request
            // from above.
         } else {
            // handle subscription cancelled automatically based
            // upon your subscription settings.
         }
         break;
      case 'customer.subscription.trial_will_end':
         // Send notification to your user that the trial will end
         break;
      default:
      // Unexpected event type
   }
   res.sendStatus(200);
}
);

module.exports = router;