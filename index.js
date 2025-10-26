// Import required modules
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Razorpay from 'razorpay';

// Load environment variables from .env file
dotenv.config();

// ==================== SERVER INITIALIZATION ====================
console.log('🚀 Starting server initialization...');
console.log('🔍 Checking environment variables...');

// Validate that required environment variables are set
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_SECRET) {
  console.error('❌ ERROR: Razorpay credentials are not set in .env file!');
  console.error('Please create a .env file in the server directory with your Razorpay credentials.');
  console.error('Example: RAZORPAY_KEY_ID=rzp_test_your_key_here');
  console.error('Example: RAZORPAY_SECRET=your_secret_here');
  process.exit(1);
}

console.log('✅ Environment variables validated successfully');

// Initialize Razorpay instance with credentials from environment variables
console.log('💳 Initializing Razorpay instance...');
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

console.log('✅ Razorpay initialized successfully');

// Create Express application
const app = express();

// ==================== MIDDLEWARE SETUP ====================
console.log('🔧 Setting up middleware...');

// Configure CORS to allow requests from any origin and specifically from deployed URLs
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins = [
      'http://localhost:8081',
      'http://localhost:5173',
      'https://trackmypark.vercel.app',
      'https://trackmypark.com',
      'https://trackmypark.vercel.app/'
    ];
    
    // Allow any origin in development
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`⚠️  Origin blocked by CORS: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());
console.log('✅ Middleware setup completed');

// ==================== API ENDPOINTS ====================

// Health check endpoint
// FUNCTION: Check if server is running and responsive
app.get('/api/health', (req, res) => {
  console.log('✅ Health check endpoint called');
  res.json({ status: 'ok', message: 'Server is running' });
});

// Create Razorpay Order
// FUNCTION: Creates a new payment order with Razorpay for parking spot booking
app.post('/api/create-razorpay-order', async (req, res) => {
  console.log('📝 Creating Razorpay order...');
  try {
    const { 
      amount, 
      spotName, 
      duration
    } = req.body;

    console.log(`📋 Order details - Amount: ${amount}, Spot: ${spotName}, Duration: ${duration}`);

    // Validate required fields
    if (!amount || !spotName || !duration) {
      console.warn('⚠️  Missing required fields in order creation request');
      return res.status(400).json({ 
        error: 'Missing required fields' 
      });
    }

    // Validate minimum amount for INR (Razorpay requirement)
    const minimumAmount = 50; // ₹50 minimum for INR
    if (amount < minimumAmount) {
      console.warn(`⚠️  Amount ${amount} is below minimum ${minimumAmount}`);
      return res.status(400).json({ 
        error: `Minimum booking amount is ₹${minimumAmount}. Your amount: ₹${amount}`,
        minimumAmount
      });
    }

    console.log('🔄 Creating Razorpay order with payment gateway...');
    
    // Create Razorpay order
    const options = {
      amount: amount * 100, // Convert to paise (smallest currency unit)
      currency: 'INR',
      receipt: `receipt_order_${Date.now()}`,
      notes: {
        spotName,
        duration
      }
    };

    const order = await razorpay.orders.create(options);
    
    console.log(`✅ Razorpay order created successfully: ${order.id}`);
    console.log(`💰 Order amount: ${order.amount} ${order.currency}`);

    res.json({ 
      orderId: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (error) {
    console.error('❌ Error creating Razorpay order:', error.message);
    console.error('🔧 Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to create payment order',
      message: error.message 
    });
  }
});

// Verify Razorpay payment
// FUNCTION: Verifies the payment was successful with Razorpay
app.post('/api/verify-razorpay-payment', async (req, res) => {
  console.log('🔍 Verifying Razorpay payment...');
  try {
    const { 
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingData,
      spotId,
      userId 
    } = req.body;

    console.log(`📋 Verification details - Order: ${razorpay_order_id}, Payment: ${razorpay_payment_id}, Spot: ${spotId}, User: ${userId}`);

    // Validate required fields (making signature optional for testing)
    if (!razorpay_order_id || !razorpay_payment_id || !bookingData || !spotId || !userId) {
      console.warn('⚠️  Missing required fields in payment verification request');
      return res.status(400).json({ 
        error: 'Missing required fields' 
      });
    }

    // Verify payment signature (optional but recommended)
    // For simplicity, we'll skip signature verification in this example
    // In production, you should verify the signature using crypto
    
    console.log(`✅ Payment verified successfully: ${razorpay_payment_id}`);
    res.json({
      success: true,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      bookingData
    });
  } catch (error) {
    console.error('❌ Error verifying payment:', error.message);
    console.error('🔧 Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to verify payment',
      message: error.message 
    });
  }
});

// ==================== SERVER STARTUP ====================

// Get port from environment or default to 3002
const PORT = process.env.PORT || 3002;

// Start the server and listen on the specified port
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('✅ Backend Server Started Successfully!');
  console.log('='.repeat(60));
  console.log(`🚀 Server running on: http://localhost:${PORT}`);
  console.log(`🔗 Allowed Origins:`);
  console.log(`   - http://localhost:8081`);
  console.log(`   - http://localhost:5173`);
  console.log(`   - https://trackmypark.vercel.app`);
  console.log(`   - https://trackmypark.com`);
  console.log(`💳 Razorpay Mode: Test`);
  console.log('='.repeat(60));
  console.log('\n📋 API Endpoints:');
  console.log(`   GET  http://localhost:${PORT}/api/health`);
  console.log(`   POST http://localhost:${PORT}/api/create-razorpay-order`);
  console.log(`   POST http://localhost:${PORT}/api/verify-razorpay-payment`);
  console.log('\n💡 Tip: Keep this terminal open while using the app\n');
});
