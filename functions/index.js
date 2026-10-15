const functions = require("firebase-functions/v2");
const admin = require("firebase-admin");
const Stripe = require("stripe");
const { Client, Environment, OrdersController } = require("@paypal/paypal-server-sdk");

admin.initializeApp();

// Initialize Stripe with secret key from environment
const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(secretKey);
};

// Initialize PayPal client - automatically switches between sandbox and production
const getPayPalClient = () => {
  const paypalModeRaw = (process.env.PAYPAL_MODE || "").trim();
  const isLive = paypalModeRaw === "live";

  console.log(`[PayPal Backend] ================================`);
  console.log(`[PayPal Backend] PAYPAL_MODE raw value: "${paypalModeRaw}"`);
  console.log(`[PayPal Backend] isLive resolved to: ${isLive}`);
  console.log(`[PayPal Backend] Will use environment: ${isLive ? "Environment.Production" : "Environment.Sandbox"}`);

  // Use appropriate credentials based on mode (trim to remove any whitespace/newlines from secrets)
  const clientIdRaw = isLive
    ? process.env.PAYPAL_CLIENT_ID_LIVE
    : process.env.PAYPAL_CLIENT_ID;
  const clientSecretRaw = isLive
    ? process.env.PAYPAL_CLIENT_SECRET_LIVE
    : process.env.PAYPAL_CLIENT_SECRET;

  const clientId = (clientIdRaw || "").trim();
  const clientSecret = (clientSecretRaw || "").trim();

  console.log(`[PayPal Backend] Client ID (first 20 chars): ${clientId ? clientId.substring(0, 20) + "..." : "MISSING"}`);
  console.log(`[PayPal Backend] Client Secret exists: ${clientSecret ? "YES" : "NO"}`);
  console.log(`[PayPal Backend] ================================`);

  if (!clientId || !clientSecret) {
    console.error(`[PayPal Backend] ERROR: Missing credentials!`);
    console.error(`[PayPal Backend] PAYPAL_CLIENT_ID_LIVE exists: ${!!process.env.PAYPAL_CLIENT_ID_LIVE}`);
    console.error(`[PayPal Backend] PAYPAL_CLIENT_SECRET_LIVE exists: ${!!process.env.PAYPAL_CLIENT_SECRET_LIVE}`);
    console.error(`[PayPal Backend] PAYPAL_CLIENT_ID exists: ${!!process.env.PAYPAL_CLIENT_ID}`);
    console.error(`[PayPal Backend] PAYPAL_CLIENT_SECRET exists: ${!!process.env.PAYPAL_CLIENT_SECRET}`);
    throw new Error(`PayPal ${isLive ? "live" : "sandbox"} credentials are not configured`);
  }

  const environment = isLive ? Environment.Production : Environment.Sandbox;
  console.log(`[PayPal Backend] Creating client with environment:`, environment);

  return new Client({
    clientCredentialsAuthCredentials: {
      oAuthClientId: clientId,
      oAuthClientSecret: clientSecret,
    },
    environment: environment,
  });
};

// Create Stripe Checkout Session
exports.createStripeCheckout = functions.https.onCall(
  {
    cors: true,
    secrets: ["STRIPE_SECRET_KEY"],
  },
  async (request) => {
    const { items, shippingAddress, successUrl, cancelUrl } = request.data;

    if (!items || items.length === 0) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Cart items are required"
      );
    }

    try {
      const stripeClient = getStripe();

      // Create line items for Stripe
      const lineItems = items.map((item) => {
        const lineItem = {
          price_data: {
            currency: "usd",
            product_data: {
              name: item.name,
            },
            unit_amount: Math.round(item.price * 100), // Convert to cents
          },
          quantity: item.quantity,
        };
        // Only add description if it exists and is not empty
        if (item.description) {
          lineItem.price_data.product_data.description = item.description;
        }
        return lineItem;
      });

      // Create Stripe checkout session
      const session = await stripeClient.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
        shipping_address_collection: {
          allowed_countries: ["US"],
        },
        metadata: {
          shippingAddress: JSON.stringify(shippingAddress || {}),
        },
      });

      return { sessionId: session.id, url: session.url };
    } catch (error) {
      console.error("Stripe checkout error:", error);
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to create checkout session"
      );
    }
  }
);

// Verify Stripe payment was successful
exports.verifyStripePayment = functions.https.onCall(
  {
    cors: true,
    secrets: ["STRIPE_SECRET_KEY"],
  },
  async (request) => {
    const { sessionId } = request.data;

    if (!sessionId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Session ID is required"
      );
    }

    try {
      const stripeClient = getStripe();
      const session = await stripeClient.checkout.sessions.retrieve(sessionId);

      return {
        success: session.payment_status === "paid",
        paymentStatus: session.payment_status,
        customerEmail: session.customer_details?.email,
        amountTotal: session.amount_total / 100,
      };
    } catch (error) {
      console.error("Verify payment error:", error);
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to verify payment"
      );
    }
  }
);

// Create PayPal Order
exports.createPayPalOrder = functions.https.onCall(
  {
    cors: true,
    secrets: ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "PAYPAL_CLIENT_ID_LIVE", "PAYPAL_CLIENT_SECRET_LIVE", "PAYPAL_MODE"],
  },
  async (request) => {
    const { items, total } = request.data;

    if (!items || items.length === 0) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Cart items are required"
      );
    }

    try {
      const client = getPayPalClient();
      const ordersController = new OrdersController(client);

      const orderRequest = {
        body: {
          intent: "CAPTURE",
          purchaseUnits: [
            {
              amount: {
                currencyCode: "USD",
                value: total.toFixed(2),
                breakdown: {
                  itemTotal: {
                    currencyCode: "USD",
                    value: total.toFixed(2),
                  },
                },
              },
              items: items.map((item) => ({
                name: item.name,
                quantity: String(item.quantity),
                unitAmount: {
                  currencyCode: "USD",
                  value: item.price.toFixed(2),
                },
              })),
            },
          ],
        },
        prefer: "return=representation",
      };

      const { result: order } = await ordersController.createOrder(orderRequest);

      console.log(`[PayPal Backend] Order created successfully!`);
      console.log(`[PayPal Backend] Order ID: ${order.id}`);
      console.log(`[PayPal Backend] Order Status: ${order.status}`);
      console.log(`[PayPal Backend] Order Intent: ${order.intent}`);
      return { orderId: order.id };
    } catch (error) {
      console.error("PayPal order creation error:", error);
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to create PayPal order"
      );
    }
  }
);

// Capture PayPal Order (after user approves)
exports.capturePayPalOrder = functions.https.onCall(
  {
    cors: true,
    secrets: ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "PAYPAL_CLIENT_ID_LIVE", "PAYPAL_CLIENT_SECRET_LIVE", "PAYPAL_MODE"],
  },
  async (request) => {
    const { orderId } = request.data;

    if (!orderId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Order ID is required"
      );
    }

    try {
      const client = getPayPalClient();
      const ordersController = new OrdersController(client);

      const { result: capturedOrder } = await ordersController.captureOrder({
        id: orderId,
        prefer: "return=representation",
      });

      return {
        status: capturedOrder.status,
        orderId: capturedOrder.id,
        payerEmail: capturedOrder.payer?.emailAddress,
      };
    } catch (error) {
      console.error("PayPal capture error:", error);
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to capture PayPal order"
      );
    }
  }
);
