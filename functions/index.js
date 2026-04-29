const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });
const Stripe = require("stripe");

admin.initializeApp();

exports.createStripePaymentIntent = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    try {
      const { amount, currency = "usd" } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      // Use live key in production, test key otherwise
      const stripeSecretKey =
        process.env.STRIPE_SECRET_KEY_LIVE || functions.config().stripe?.secret;

      if (!stripeSecretKey) {
        console.error("Stripe secret key not configured");
        return res.status(500).json({ error: "Payment service not configured" });
      }

      const stripe = new Stripe(stripeSecretKey);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount),
        currency,
        automatic_payment_methods: { enabled: true },
      });

      return res.status(200).json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
      console.error("Stripe error:", error);
      return res.status(500).json({ error: "Failed to create payment intent" });
    }
  });
});
