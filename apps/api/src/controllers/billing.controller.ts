import { Request, Response } from 'express';
import User from '../models/User';
import {
  cancelRazorpaySubscription,
  createRazorpaySubscription,
  fetchRazorpaySubscription,
  type RazorpayPlanCode,
  type RazorpaySubscription,
  verifyRazorpayWebhookSignature,
} from '../utils/razorpay';
import { sanitizeUserApiKeys } from '../utils/api-key-store';

type BillingUser = any;

function applySubscriptionToUser(user: BillingUser, subscription: RazorpaySubscription, planCode?: RazorpayPlanCode) {
  const nextPlanCode = planCode || user.billing?.planCode;
  const status = subscription.status;
  const isPro = status === 'active' || status === 'authenticated';

  user.plan = isPro ? 'pro' : 'free';
  user.usage.generationsLimit = isPro ? -1 : 2;
  user.usage.tokensLimit = isPro ? 250000 : 5000;
  user.billing = {
    ...(user.billing || {}),
    provider: 'razorpay',
    planCode: nextPlanCode,
    subscriptionId: subscription.id,
    subscriptionStatus: status,
    customerId: subscription.customer_id || undefined,
    currentStartAt: subscription.current_start ? new Date(subscription.current_start * 1000) : undefined,
    currentEndAt: subscription.current_end ? new Date(subscription.current_end * 1000) : undefined,
    cancelAtCycleEnd: Boolean(user.billing?.cancelAtCycleEnd),
  };
}

function sanitizeBillingUser(user: BillingUser) {
  return sanitizeUserApiKeys(user);
}

export const createCheckout = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const planCode = req.body?.planCode as RazorpayPlanCode;

    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (planCode !== 'pro-monthly' && planCode !== 'pro-annual') {
      res.status(400).json({ error: 'Unsupported plan selected' });
      return;
    }

    const subscription = await createRazorpaySubscription({
      planCode,
      userId: String(user._id),
      email: user.email,
    });

    user.billing = {
      ...(user.billing || {}),
      provider: 'razorpay',
      planCode,
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      customerId: subscription.customer_id || undefined,
      currentStartAt: subscription.current_start ? new Date(subscription.current_start * 1000) : undefined,
      currentEndAt: subscription.current_end ? new Date(subscription.current_end * 1000) : undefined,
      cancelAtCycleEnd: false,
    };
    await user.save();

    res.status(200).json({
      checkoutUrl: subscription.short_url,
      subscriptionId: subscription.id,
      user: sanitizeBillingUser(user),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create subscription checkout' });
  }
};

export const getBillingStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (user.billing?.subscriptionId) {
      const subscription = await fetchRazorpaySubscription(user.billing.subscriptionId);
      applySubscriptionToUser(user, subscription);
      await user.save();
    }

    res.status(200).json({
      user: sanitizeBillingUser(user),
      billing: user.billing || null,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch billing status' });
  }
};

export const cancelBilling = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user?.billing?.subscriptionId) {
      res.status(400).json({ error: 'No active Razorpay subscription found' });
      return;
    }

    const cancelAtCycleEnd = Boolean(req.body?.cancelAtCycleEnd ?? true);
    const subscription = await cancelRazorpaySubscription(user.billing.subscriptionId, cancelAtCycleEnd);
    applySubscriptionToUser(user, subscription);
    user.billing.cancelAtCycleEnd = cancelAtCycleEnd;
    if (!cancelAtCycleEnd && subscription.status === 'cancelled') {
      user.plan = 'free';
      user.usage.generationsLimit = 2;
      user.usage.tokensLimit = 5000;
    }
    await user.save();

    res.status(200).json({
      user: sanitizeBillingUser(user),
      billing: user.billing,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to cancel subscription' });
  }
};

export const handleBillingWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = String(req.headers['x-razorpay-signature'] || '');
    const rawBody = String((req as any).rawBody || '');
    if (!signature || !rawBody) {
      res.status(400).json({ error: 'Missing webhook signature or raw body' });
      return;
    }

    if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
      res.status(400).json({ error: 'Invalid webhook signature' });
      return;
    }

    const eventId = String(req.headers['x-razorpay-event-id'] || '');
    const event = req.body?.event as string | undefined;
    const subscription = req.body?.payload?.subscription?.entity as RazorpaySubscription | undefined;
    if (!event || !subscription?.id) {
      res.status(200).json({ ok: true });
      return;
    }

    const user = await User.findOne({ 'billing.subscriptionId': subscription.id });
    if (!user) {
      res.status(200).json({ ok: true });
      return;
    }

    if (eventId && user.billing?.lastWebhookEventId === eventId) {
      res.status(200).json({ ok: true, duplicate: true });
      return;
    }

    applySubscriptionToUser(user, subscription);
    user.billing = {
      ...(user.billing || {}),
      lastWebhookEventId: eventId || user.billing?.lastWebhookEventId,
    };

    if (subscription.status === 'cancelled' || subscription.status === 'completed' || subscription.status === 'expired' || subscription.status === 'halted') {
      user.plan = 'free';
      user.usage.generationsLimit = 2;
      user.usage.tokensLimit = 5000;
    }

    await user.save();
    res.status(200).json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to process billing webhook' });
  }
};
