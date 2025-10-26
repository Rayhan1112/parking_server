const express = require('express');
const stripe = require('stripe');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Raw body parser for webhook verification
app.use('/webhook', bodyParser.raw({ type: 'application/json' }));

// JSON parser for other routes
app.use(express.json());

// Parking products configuration
const PARKING_PRODUCTS = {
  '1': { name: '1 Hour Parking', price: 1000, hours: 1 }, // ₹10.00 in paise
  '2': { name: '2 Hour Parking', price: 2000, hours: 2 }, // ₹20.00 in paise
  '5': { name: '5 Hour Parking', price: 4000, hours: 5 }, // ₹40.00 in paise
  '10': { name: '10 Hour Parking', price: 9000, hours: 10 }, // ₹90.00 in paise
  '24': { name: '24 Hour Parking', price: 19900, hours: 24 } // ₹199.00 in paise
};

// Create checkout session
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { productId, vehicleData, successUrl, cancelUrl } = req.body;

    if (!productId || !PARKING_PRODUCTS[productId]) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    if (!vehicleData || !vehicleData.plateNumber || !vehicleData.ownerName) {
      return res.status(400).json({ error: 'Vehicle data is required' });
    }

    const product = PARKING_PRODUCTS[productId];

    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: product.name,
              description: `Prepaid parking for ${product.hours} hour${product.hours > 1 ? 's' : ''}`,
              metadata: {
                plateNumber: vehicleData.plateNumber,
                ownerName: vehicleData.ownerName,
                vehicleModel: vehicleData.vehicleModel,
                hours: product.hours.toString()
              }
            },
            unit_amount: product.price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl || `${process.env.FRONTEND_URL}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.FRONTEND_URL}?payment=cancelled`,
      metadata: {
        plateNumber: vehicleData.plateNumber,
        ownerName: vehicleData.ownerName,
        vehicleModel: vehicleData.vehicleModel,
        hours: product.hours.toString(),
        productId: productId
      }
    });

    res.json({ 
      sessionId: session.id,
      url: session.url,
      productInfo: product
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get product information
app.get('/products', (req, res) => {
  const products = Object.entries(PARKING_PRODUCTS).map(([id, product]) => ({
    id,
    ...product,
    priceFormatted: `₹${(product.price / 100).toFixed(2)}`
  }));
  
  res.json({ products });
});

// Get specific product
app.get('/products/:id', (req, res) => {
  const { id } = req.params;
  const product = PARKING_PRODUCTS[id];
  
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  
  res.json({
    id,
    ...product,
    priceFormatted: `₹${(product.price / 100).toFixed(2)}`
  });
});

// Verify payment session
app.get('/verify-session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await stripeClient.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status === 'paid') {
      res.json({
        success: true,
        session: {
          id: session.id,
          payment_status: session.payment_status,
          amount_total: session.amount_total,
          metadata: session.metadata
        }
      });
    } else {
      res.json({
        success: false,
        payment_status: session.payment_status
      });
    }
  } catch (error) {
    console.error('Error verifying session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stripe webhook handler
app.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripeClient.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('Payment successful for session:', session.id);
      console.log('Vehicle data:', session.metadata);
      
      // Here you can add logic to:
      // 1. Store the payment in your database
      // 2. Send confirmation emails
      // 3. Update parking system
      break;
    
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('Payment intent succeeded:', paymentIntent.id);
      break;
    
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    products: Object.keys(PARKING_PRODUCTS).length
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 TrackMyParking server running on port ${PORT}`);
  console.log(`📊 Available products: ${Object.keys(PARKING_PRODUCTS).length}`);
  console.log(`💳 Stripe integration: ${process.env.STRIPE_SECRET_KEY ? 'Configured' : 'Not configured'}`);
});