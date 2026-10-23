import { Router } from 'express';
import Stripe from 'stripe';
import { prisma } from '../db';
import { protect } from '../middleware/auth';
import { AppError } from '../utils/errors';

export const billingRouter = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-06-20',
});

// Apply auth middleware for standard routes
billingRouter.use('/checkout-session', protect as any);
billingRouter.use('/portal-session', protect as any);

// POST create checkout session for upgrade
billingRouter.post('/checkout-session', async (req: any, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return next(new AppError('User not found', 404));

    let stripeCustomerId = user.stripeCustomerId;

    // MOCK BILLING FOR TESTING
    if (process.env.STRIPE_SECRET_KEY === 'sk_test_dummy_key') {
      await prisma.user.update({
        where: { id: user.id },
        data: { plan: 'PRO' },
      });
      return res.status(200).json({ status: 'success', data: { url: `${(process.env.FRONTEND_URL || '').trim()}/mock-checkout` } });
    }

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      stripeCustomerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID, // $15/month price ID
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL}/settings?success=true`,
      cancel_url: `${process.env.FRONTEND_URL}/settings?canceled=true`,
    });

    res.status(200).json({ status: 'success', data: { url: session.url } });
  } catch (err) {
    next(err);
  }
});

// POST create customer portal session
billingRouter.post('/portal-session', async (req: any, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    
    // MOCK BILLING FOR TESTING
    if (process.env.STRIPE_SECRET_KEY === 'sk_test_dummy_key') {
      return res.status(200).json({ status: 'success', data: { url: `${(process.env.FRONTEND_URL || '').trim()}/mock-checkout` } });
    }

    if (!user || !user.stripeCustomerId) {
      return next(new AppError('No billing account found', 404));
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/settings`,
    });

    res.status(200).json({ status: 'success', data: { url: session.url } });
  } catch (err) {
    next(err);
  }
});

// POST webhook endpoint (no auth middleware, requires raw body)
billingRouter.post('/webhook', async (req: any, res, next) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Note: requires express.raw({ type: 'application/json' }) in index.ts for this route
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET as string);
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      
      const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { plan: subscription.status === 'active' ? 'PAID' : 'FREE' },
        });
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      
      const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { plan: 'FREE' },
        });
      }
    }
    res.status(200).json({ received: true });
  } catch (err) {
    next(err);
  }
});
