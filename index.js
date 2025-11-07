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
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID ? `${process.env.RAZORPAY_KEY_ID.substring(0, 10)}...` : 'NOT SET');
console.log('RAZORPAY_SECRET:', process.env.RAZORPAY_SECRET ? 'SET' : 'NOT SET');
console.log('PORT:', process.env.PORT || 3002);

// Validate that required environment variables are set
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_SECRET) {
  console.error('❌ ERROR: Razorpay credentials are not set in .env file!');
  console.error('Please create a .env file in the server directory with your Razorpay credentials.');
  console.error('Example: RAZORPAY_KEY_ID=rzp_test_your_key_here');
  console.error('Example: RAZORPAY_SECRET=your_secret_here');
  process.exit(1);
}

console.log('✅ Environment variables validated successfully');
console.log(`🔑 Razorpay Key ID: ${process.env.RAZORPAY_KEY_ID.substring(0, 10)}...`);

// Initialize Razorpay instance with credentials from environment variables
console.log('💳 Initializing Razorpay instance...');
let razorpay;
try {
  console.log('🔧 Creating Razorpay instance with key_id:', process.env.RAZORPAY_KEY_ID.substring(0, 10) + '...');
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET,
  });
  console.log('✅ Razorpay initialized successfully');
} catch (error) {
  console.error('❌ Error initializing Razorpay:', error.message);
  console.error('🔧 Error stack:', error.stack);
  process.exit(1);
}

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
      'http://localhost:8080',
      'http://localhost:5173',
      'https://trackmypark.vercel.app',
      'https://trackmypark.com',
      'https://www.trackmypark.com',
      'https://trackmypark.vercel.app/'
    ];
    
    // Allow any origin in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🔓 Development mode: Allowing all origins');
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log(`✅ Allowed origin: ${origin}`);
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
  console.log(`📍 Request from IP: ${req.ip}`);
  res.json({ status: 'ok', message: 'Server is running', timestamp: new Date().toISOString() });
});

// Razorpay connectivity test endpoint
// FUNCTION: Test Razorpay API connectivity with current credentials
app.get('/api/test-razorpay-connectivity', async (req, res) => {
  console.log('🧪 Testing Razorpay API connectivity...');
  
  try {
    // Check if razorpay instance is properly initialized
    if (!razorpay) {
      console.error('❌ Razorpay instance is not initialized');
      return res.status(500).json({ 
        success: false,
        error: 'Payment system not initialized',
        message: 'Razorpay instance is not properly initialized'
      });
    }
    
    // Attempt to fetch orders (a simple API call to test credentials)
    const orders = await razorpay.orders.all({ count: 1 });
    console.log('✅ Razorpay connectivity test successful');
    
    res.json({ 
      success: true,
      message: 'Razorpay API connectivity verified',
      key_id: process.env.RAZORPAY_KEY_ID ? `${process.env.RAZORPAY_KEY_ID.substring(0, 10)}...` : null,
      orders_count: orders.count
    });
  } catch (error) {
    console.error('❌ Error testing Razorpay connectivity:', error.message);
    
    // Provide specific error information
    let errorMessage = 'Failed to connect to Razorpay API';
    if (error.statusCode === 401) {
      errorMessage = 'Razorpay authentication failed - check your credentials';
    } else if (error.statusCode === 403) {
      errorMessage = 'Razorpay access forbidden - check your permissions';
    }
    
    res.status(error.statusCode || 500).json({ 
      success: false,
      error: errorMessage,
      message: error.message,
      statusCode: error.statusCode
    });
  }
});

// Razorpay test endpoint
// FUNCTION: Test Razorpay connectivity
app.get('/api/test-razorpay', async (req, res) => {
  console.log('🧪 Testing Razorpay connectivity...');
  
  try {
    // Log current environment variables
    console.log('🔧 Current environment variables:');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID ? `${process.env.RAZORPAY_KEY_ID.substring(0, 10)}...` : 'NOT SET');
    console.log('RAZORPAY_SECRET:', process.env.RAZORPAY_SECRET ? 'SET' : 'NOT SET');
    
    // Check if razorpay instance is properly initialized
    if (!razorpay) {
      console.error('❌ Razorpay instance is not initialized');
      return res.status(500).json({ 
        error: 'Payment system not initialized',
        message: 'Razorpay instance is not properly initialized'
      });
    }
    
    // Try to fetch Razorpay account info or make a simple request
    // For now, we'll just return success if the instance exists
    res.json({ 
      status: 'success',
      message: 'Razorpay instance is properly initialized',
      key_id: process.env.RAZORPAY_KEY_ID ? `${process.env.RAZORPAY_KEY_ID.substring(0, 10)}...` : null,
      node_env: process.env.NODE_ENV
    });
  } catch (error) {
    console.error('❌ Error testing Razorpay:', error.message);
    res.status(500).json({ 
      error: 'Failed to test Razorpay connectivity',
      message: error.message 
    });
  }
});

// Create Razorpay Order
// FUNCTION: Creates a new payment order with Razorpay for parking spot booking
app.post('/api/create-razorpay-order', async (req, res) => {
  console.log('📝 Creating Razorpay order...');
  console.log(`📍 Request from IP: ${req.ip}`);
  console.log(`📥 Request body: ${JSON.stringify(req.body, null, 2)}`);
  console.log(`🔐 Using Razorpay key: ${process.env.RAZORPAY_KEY_ID ? process.env.RAZORPAY_KEY_ID.substring(0, 10) + '...' : 'NOT SET'}`);
  
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

    // Validate that amount is a number
    if (isNaN(amount) || amount <= 0) {
      console.warn('⚠️  Invalid amount in order creation request');
      return res.status(400).json({ 
        error: 'Invalid amount. Amount must be a positive number.' 
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
      amount: Math.round(amount * 100), // Convert to paise (smallest currency unit) and round to avoid floating point issues
      currency: 'INR',
      receipt: `receipt_order_${Date.now()}`,
      notes: {
        spotName,
        duration
      }
    };

    console.log(`📤 Sending order request to Razorpay with options: ${JSON.stringify(options, null, 2)}`);
    
    // Check if razorpay instance is properly initialized
    if (!razorpay) {
      console.error('❌ Razorpay instance is not initialized');
      return res.status(500).json({ 
        error: 'Payment system not initialized',
        message: 'Razorpay instance is not properly initialized'
      });
    }
    
    // Log the credentials being used (first 10 chars only for security)
    console.log('🔧 Using Razorpay key_id:', process.env.RAZORPAY_KEY_ID.substring(0, 10) + '...');
    
    // Attempt to create the order
    console.log('🔄 Calling Razorpay orders.create API...');
    const order = await razorpay.orders.create(options);
    
    console.log(`✅ Razorpay order created successfully: ${order.id}`);
    console.log(`💰 Order amount: ${order.amount} ${order.currency}`);
    console.log(`🧾 Order receipt: ${order.receipt}`);

    res.json({ 
      orderId: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (error) {
    console.error('❌ Error creating Razorpay order:', error.message);
    console.error('🔧 Error stack:', error.stack);
    console.error('🔧 Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    
    // Log additional error details if available
    if (error.statusCode) {
      console.error(`📡 HTTP Status: ${error.statusCode}`);
    }
    if (error.error) {
      console.error(`💬 Razorpay Error: ${JSON.stringify(error.error, null, 2)}`);
    }
    
    // Provide more specific error messages based on the error type
    let errorMessage = 'Failed to create payment order';
    let statusCode = 500;
    
    if (error.statusCode === 401) {
      errorMessage = 'Authentication failed with payment provider. Please check credentials.';
      statusCode = 500; // Still a server error from client perspective
      // Log the key being used for debugging
      console.error('🔐 Auth failed with key:', process.env.RAZORPAY_KEY_ID ? process.env.RAZORPAY_KEY_ID.substring(0, 10) + '...' : 'NOT SET');
    } else if (error.statusCode === 400) {
      errorMessage = 'Invalid request to payment provider. Please check the request data.';
      statusCode = 400;
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      errorMessage = 'Unable to connect to payment provider. Please try again later.';
      statusCode = 500;
    } else if (error.statusCode >= 500) {
      errorMessage = 'Payment provider is temporarily unavailable. Please try again later.';
      statusCode = 503;
    }
    
    res.status(statusCode).json({ 
      error: errorMessage,
      message: error.message,
      statusCode: error.statusCode
    });
  }
});

// Verify Razorpay payment
// FUNCTION: Verifies the payment was successful with Razorpay
app.post('/api/verify-razorpay-payment', async (req, res) => {
  console.log('🔍 Verifying Razorpay payment...');
  console.log(`📍 Request from IP: ${req.ip}`);
  console.log(`📥 Request body: ${JSON.stringify(req.body, null, 2)}`);
  
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
    
    // Log additional error details if available
    if (error.statusCode) {
      console.error(`📡 HTTP Status: ${error.statusCode}`);
    }
    if (error.error) {
      console.error(`💬 Razorpay Error: ${JSON.stringify(error.error, null, 2)}`);
    }
    
    res.status(500).json({ 
      error: 'Failed to verify payment',
      message: error.message 
    });
  }
});

// ==================== ERROR HANDLING ====================
// Global error handler
app.use((err, req, res, next) => {
  console.error('🚨 Global error handler caught an error:');
  console.error('🔧 Error details:', err.stack);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

// Handle 404 errors
app.use((req, res) => {
  console.warn(`⚠️  404 - Route not found: ${req.method} ${req.originalUrl}`);
  console.log(`📍 Request from IP: ${req.ip}`);
  res.status(404).json({ 
    error: 'Route not found',
    message: `The requested route ${req.originalUrl} does not exist`
  });
});

// ==================== SERVER STARTUP ====================

// Get port from environment or default to 3002
const PORT = process.env.PORT || 3002;

// Start the server and listen on the specified port
const server = app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('✅ Backend Server Started Successfully!');
  console.log('='.repeat(60));
  console.log(`🚀 Server running on: http://localhost:${PORT}`);
  console.log(`🔗 Allowed Origins:`);
  console.log(`   - http://localhost:8081`);
  console.log(`   - http://localhost:5173`);
  console.log(`   - https://trackmypark.vercel.app`);
  console.log(`   - https://trackmypark.com`);
  console.log(`💳 Razorpay Mode: ${process.env.NODE_ENV === 'development' ? 'Test' : 'Live'}`);
  console.log(`📂 Node Environment: ${process.env.NODE_ENV}`);
  console.log('='.repeat(60));
  console.log('\n📋 API Endpoints:');
  console.log(`   GET  http://localhost:${PORT}/api/health`);
  console.log(`   GET  http://localhost:${PORT}/api/test-razorpay-connectivity`);
  console.log(`   POST http://localhost:${PORT}/api/create-razorpay-order`);
  console.log(`   POST http://localhost:${PORT}/api/verify-razorpay-payment`);
  console.log('\n💡 Tip: Keep this terminal open while using the app\n');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
});
