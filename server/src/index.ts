import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { errorHandler } from './utils/errors';
import { authRouter } from './routes/auth';
import { contractRouter } from './routes/contracts';
import { billingRouter } from './routes/billing';
import { startCronJobs } from './jobs/reminders';

const app = express();

// Middleware
// Note: Stripe webhooks require raw body, so we conditionally apply express.json()
app.use((req, res, next) => {
  if (req.originalUrl === '/api/billing/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});
app.use(cors());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/contracts', contractRouter);
app.use('/api/billing', billingRouter);

// Start background jobs
startCronJobs();

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Global Error Handler
app.use(errorHandler as any);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
