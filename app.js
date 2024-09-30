// Import required modules
const express = require('express');
const path = require('path');
const dotenv = require('dotenv').config();
const app = express();
const mongoose = require('mongoose');
const config = require('./config/database');
const bodyParser = require('body-parser');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const nocache = require('nocache');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const Cart = require('./models/cartModel.js'); // Add this line
const Wishlist = require('./models/wishlistModel.js'); // Add this line if you also use Wishlist model

const port = process.env.PORT || 4000;

// Connect to MongoDB database
mongoose
  .connect(config.database, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Database Connected');
  })
  .catch((err) => {
    console.log('Database connection failed: ' + err);
  });

// Rest of your code...
// Set the view engine to EJS
app.set('view engine', 'ejs');

// Use middleware to prevent caching
app.use(nocache());

// Use middleware to parse cookies and set unique secret for cookie
app.use(cookieParser(generateSecret()));

// Use middleware for session management with a unique secret
app.use(
  session({
    secret: generateSecret(),
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: 60 * 60 * 1000, secure: false },
  })
);

// Parse request bodies as JSON
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Middleware for flash messages
app.use(flash());

// Serve static files from 'views' and 'public' directories
app.use('/views', express.static(path.join(__dirname, 'views')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Nodemailer transport configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER, // your SMTP username
    pass: process.env.EMAIL_PASS  // your SMTP password
  }
});

// Check environment variables
console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_PORT:', process.env.SMTP_PORT);
console.log('EMAIL_USER:', process.env.EMAIL_USER);

// Route to render the form
app.get('/send-email', (req, res) => {
  res.render('layouts/user/send-email'); // Updated path to the form view
});

// Route to handle form submission and send email
app.post('/send-email', (req, res) => {
  const { email, subject, message } = req.body;

  let mailOptions = {
    from: process.env.EMAIL_USER, // Replace with your email address
    to: email, // Dynamically use the email from user input
    subject: subject,
    text: message
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
      return res.status(500).send('Error sending email');
    }
    console.log('Message sent: %s', info.messageId);
    res.status(200).send('Email sent successfully');
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'An unexpected error occurred!' });
});

// Define route handlers for various endpoints
const userRouter = require('./routes/user-router'); // Router for user-related routes
const adminRouter = require('./routes/admin-router'); // Router for admin-related routes
const categoryRouter = require('./routes/category-router'); // Router for category-related routes
const couponRouter = require('./routes/coupon-router'); // Router for coupon-related routes 
const productRouter = require('./routes/product-router'); // Router for product-related routes
const profileRouter = require('./routes/profile-router'); // Router for profile-related routes
const userProductRouter = require('./routes/user-product-router'); // Router for user product-related routes
const cartRouter = require('./routes/cart-router'); // Router for cart-related routes
const wishlistRouter = require('./routes/wishlist-router'); // Router for wishlist-related routes
const orderRouter = require('./routes/order-router'); // Router for order-related routes
const orderStatusRouter = require('./routes/order-status-router'); // Router for order status-related routes

app.use('/', userRouter); // User-related routes
app.use('/admin', adminRouter); // Admin-related routes
app.use('/admin/category', categoryRouter); // Category-related routes
app.use('/admin/product', productRouter); // Product-related routes
app.use('/admin/orders', orderStatusRouter); // Order status-related routes
app.use('/admin/coupon', couponRouter); // Coupon-related routes
app.use('/profile', profileRouter); // Profile-related routes
app.use('/products', userProductRouter); // User product-related routes
app.use('/cart', cartRouter); // Cart-related routes
app.use('/wishlist', wishlistRouter); // Wishlist-related routes
app.use('/orders', orderRouter); // Order-related routes

// Handler for admin-specific routes not found
app.get('/admin/*', (req, res) => {
  let admin = req.session.admin; // Check admin session
  res.render('admin/404', { admin }); // Render admin 404 page
});

// Handler for all other routes not found
app.get('*', async (req, res) => {
  let user = req.session.user; // Check user session
  let count = null; // Initialize cart item count
  if (user) {
    const cartItems = await Cart.findOne({ userId: user._id }); // Find user's cart items
    if (cartItems) {
      count = cartItems.cart.length; // Count the number of items in the cart
    }
  }
  let wishcount = null; // Initialize wishlist item count
  if (user) {
    const wishlistItems = await Wishlist.findOne({ userId: user._id }); // Find user's wishlist items
    if (wishlistItems) {
      wishcount = wishlistItems.wishlist.length; // Count the number of items in the wishlist
    }
  }
  res.render('user/404', { user, count, wishcount }); // Render user 404 page with user data and counts
});

// Start the server
app.listen(port, () => {
  console.log(`Listening to the server on http://localhost:${port}`);
});

// Function to generate a unique secret
function generateSecret() {
  return crypto.randomBytes(64).toString('hex');
}


