import Stripe from 'stripe';

export function getStripeClient(secretKey?: string) {
  const key = secretKey || process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Stripe secret key not configured');
  return new Stripe(key, { apiVersion: '2025-02-24.acacia' });
}
