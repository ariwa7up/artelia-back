const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const config = require('./config');
const routes = require('./routes');
const { apiLimiter } = require('./middleware/rateLimit');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const paymentController = require('./controllers/paymentWebhookController');
const payoutWebhookController = require('./controllers/payoutWebhookController');

const app = express();

app.use(helmet());
//app.use(cors({ origin: config.frontendUrl, credentials: true }));
// 1. CORS MUST BE FIRST to handle preflight OPTIONS requests properly
const allowedOrigins = [
    'http://localhost:5500',
    'http://localhost:5501',
    'http://localhost:3000',
    'http://127.0.0.1:5500',
    'http://127.0.0.1:5501',
    'http://127.0.0.1:5502',
    'https://rejoicefuturebanking.vercel.app',
    'rejoicefuturebanking.vercel.app',
    'https://your-frontend.netlify.app',
    'null' // Required for local file:// testing sometimes
];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, or Postman)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy does not allow access from this origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(morgan(config.env === 'development' ? 'dev' : 'combined'));
app.use(cookieParser());

// Webhook routes need the RAW body for signature verification, so they
// are mounted BEFORE express.json() and given their own raw parser.
app.post('/api/webhooks/payments', express.raw({ type: '*/*' }), paymentController.handleWebhook);
app.post('/api/webhooks/payouts', express.raw({ type: '*/*' }), payoutWebhookController.handleWebhook);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api', apiLimiter, routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
